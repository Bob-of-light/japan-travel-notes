<#
.SYNOPSIS
    把 _incoming 裡的照片壓縮後存進 public/images，並更新 spots.json。

.DESCRIPTION
    每個子資料夾名稱 = 景點 id（見 public/data/spots.json 的 "id" 欄位）。
    腳本會：
      1. 縮圖到最大邊 1600px
      2. 轉存為 JPEG（品質 82）→ 順便去掉手機照片的 EXIF / GPS 資訊
      3. 依序命名為 1.jpg、2.jpg… 存到 public/images/<景點 id>/
      4. 更新 public/data/spots.json 的 images 欄位（保留原本的說明文字）

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\prepare-images.ps1
#>

[CmdletBinding()]
param(
    [int]$MaxSize = 1600,
    [int]$Quality = 82,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $PSScriptRoot
$IncomingDir = Join-Path $Root '_incoming'
$ImagesDir = Join-Path $Root 'public\images'
$DataFile = Join-Path $Root 'public\data\spots.json'

$Extensions = @('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif')

if (-not (Test-Path -LiteralPath $IncomingDir)) {
    Write-Host "找不到 _incoming 資料夾，沒有東西要處理。" -ForegroundColor Yellow
    exit 0
}

function Get-RelativeSize([double]$bytes) {
    if ($bytes -ge 1MB) { return '{0:N1} MB' -f ($bytes / 1MB) }
    if ($bytes -ge 1KB) { return '{0:N0} KB' -f ($bytes / 1KB) }
    return "$bytes B"
}

function Save-ResizedJpeg([System.Drawing.Image]$img, [string]$outPath, [int]$maxSize, [int]$quality) {
    $scale = [Math]::Min(1.0, $maxSize / [Math]::Max($img.Width, $img.Height))
    $w = [int][Math]::Max(1, [Math]::Round($img.Width * $scale))
    $h = [int][Math]::Max(1, [Math]::Round($img.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap($w, $h)
    $bitmap.SetResolution(96, 96)

    $g = [System.Drawing.Graphics]::FromImage($bitmap)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $w, $h)
    $g.Dispose()

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' }
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
        [System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

    $bitmap.Save($outPath, $codec, $params)
    $bitmap.Dispose()
}

# 讀取資料
$data = Get-Content -LiteralPath $DataFile -Raw -Encoding UTF8 | ConvertFrom-Json
$spotIndex = @{}
foreach ($s in $data.spots) { $spotIndex[$s.id] = $s }

$folders = Get-ChildItem -LiteralPath $IncomingDir -Directory | Sort-Object Name
if ($folders.Count -eq 0) {
    Write-Host "_incoming 裡沒有子資料夾，沒有東西要處理。" -ForegroundColor Yellow
    exit 0
}

Write-Host ''
Write-Host '  處理圖片' -ForegroundColor Cyan
Write-Host '  --------'

$totalIn = 0L
$totalOut = 0L
$changed = $false

foreach ($folder in $folders) {
    $spotId = $folder.Name

    if (-not $spotIndex.ContainsKey($spotId)) {
        Write-Host "  [略過] $spotId ：spots.json 裡找不到這個 id 的景點" -ForegroundColor Red
        continue
    }

    $files = Get-ChildItem -LiteralPath $folder.FullName -File |
        Where-Object { $Extensions -contains $_.Extension.ToLower() } |
        Sort-Object Name

    if ($files.Count -eq 0) {
        Write-Host "  [略過] $spotId ：沒有支援的圖片檔" -ForegroundColor Yellow
        continue
    }

    $outDir = Join-Path $ImagesDir $spotId
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
        # 清掉舊的編號圖片，避免殘留
        Get-ChildItem -LiteralPath $outDir -Filter '*.jpg' -ErrorAction SilentlyContinue |
            Where-Object { $_.BaseName -match '^\d+$' } |
            Remove-Item -Force -ErrorAction SilentlyContinue
    }

    Write-Host "  $spotId  （$($files.Count) 張）" -ForegroundColor White

    $entries = @()
    $i = 0
    foreach ($file in $files) {
        $i++
        $outName = "$i.jpg"
        $outPath = Join-Path $outDir $outName
        $inBytes = $file.Length
        $totalIn += $inBytes

        try {
            $img = [System.Drawing.Image]::FromFile($file.FullName)
            try {
                $origW = $img.Width; $origH = $img.Height
                if (-not $DryRun) {
                    Save-ResizedJpeg $img $outPath $MaxSize $Quality
                }
            } finally {
                $img.Dispose()
            }
        } catch {
            Write-Host "      [失敗] $($file.Name) ：$($_.Exception.Message)" -ForegroundColor Red
            continue
        }

        $outBytes = if ($DryRun) { 0L } else { (Get-Item -LiteralPath $outPath).Length }
        $totalOut += $outBytes
        $entry = [pscustomobject]@{ src = "images/$spotId/$outName"; caption = '' }

        Write-Host ("      {0,-16} {1,5}x{2,-5} {3,9} → {4,9}" -f `
            $file.Name, $origW, $origH, (Get-RelativeSize $inBytes), (Get-RelativeSize $outBytes)) `
            -ForegroundColor DarkGray

        $entries += $entry
    }

    if ($entries.Count -eq 0) { continue }

    # 保留原本已填好的說明文字
    $existing = @()
    if ($null -ne $spotIndex[$spotId].images) {
        $existing = @($spotIndex[$spotId].images)
    }
    for ($k = 0; $k -lt $entries.Count; $k++) {
        if ($k -lt $existing.Count -and $existing[$k].caption) {
            $entries[$k].caption = $existing[$k].caption
        }
    }

    $spotIndex[$spotId] | Add-Member -NotePropertyName images -NotePropertyValue $entries -Force
    $changed = $true
}

if (-not $changed) {
    Write-Host ''
    Write-Host '  沒有更新任何景點。' -ForegroundColor Yellow
    exit 0
}

if ($DryRun) {
    Write-Host ''
    Write-Host '  [預覽模式] 沒有實際寫入檔案。' -ForegroundColor Cyan
    exit 0
}

$data.updatedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
$json = $data | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($DataFile, $json + "`n", (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Write-Host ("  總計 {0} → {1}" -f (Get-RelativeSize $totalIn), (Get-RelativeSize $totalOut)) -ForegroundColor Cyan
if ($totalIn -gt 0) {
    Write-Host ("  縮小 {0:N0}%" -f ((1 - $totalOut / $totalIn) * 100)) -ForegroundColor Cyan
}
Write-Host '  spots.json 已更新，重新整理網頁即可看到。' -ForegroundColor Green
Write-Host ''