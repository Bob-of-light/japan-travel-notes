# 線上寫入 API 設定（Vercel）

讓你**直接在手機上編輯網站**，不用開電腦。改完約 1 分鐘內線上就更新。

## 運作原理

```
手機瀏覽器
  ↓ POST /api/data（帶你的密碼）
Vercel Serverless Function（存放 GitHub token，不公開）
  ↓ GitHub API 寫入 public/data/spots.json
GitHub 觸發 Actions → 自動部署到 GitHub Pages
```

資料與照片**仍然放在你的 GitHub 倉庫**，Vercel 只是幫你代為呼叫 GitHub。

## 需要設定的環境變數（4 個）

在 Vercel 專案的 Settings → Environment Variables 設定：

| 名稱 | 內容 | 備註 |
| --- | --- | --- |
| `GITHUB_TOKEN` | GitHub Personal Access Token | 權限只要單一倉庫的 **Contents: Read and write** |
| `GITHUB_REPO` | `Bob-of-light/japan-travel-notes` | 照抄 |
| `WRITE_PIN` | 你自己決定的一組數字 | 這是你在網頁上輸入的密碼 |
| `ALLOWED_ORIGIN` | `https://bob-of-light.github.io` | 只允許這個網址呼叫 |

### 產生 GitHub Token 的步驟

1. 到 <https://github.com/settings/tokens/new>
2. **Fine-grained token** → Generate new token
3. Token name 填 `ryoko-notes-writer`
4. Expiration 選 **No expiration** ⚠️ **這步最重要，見下方說明**
5. Resource owner 選 **Bob-of-light**
6. Repository access → Only select repositories → 選 `japan-travel-notes`
7. Permissions → Repository permissions → **Contents: Read and write**
8. Generate token → **馬上複製**，離開頁面就看不到了
9. 貼到 Vercel 的 `GITHUB_TOKEN`

> 這支 token 只對這一個倉庫有寫入權限。就算外洩，別人也只能改這個旅遊筆記倉庫。

### ⚠️ 為什麼 Expiration 一定要選 No expiration

**GitHub 精細權杖如果沒有特別設定，到期日預設只有 30 天。**
到期之後網頁上的編輯會突然壞掉，而且錯誤訊息不會直接說「token 過期」，
容易搞不清楚原因。

`No expiration` 只有**個人專案**可以選（你的情況符合）。
如果你選了「No expiration」以外的選項，記得設一個「Custom」很久以後的日期。

安全性評估：這支 token 只綁定單一旅遊筆記倉庫的寫入權限，
就算外洩，最壞的結果也只是別人能改這個公開的筆記網站，
不會影響你 GitHub 帳號裡的其他東西。

## 設定步驟

### 1. 建立 Vercel 專案

1. 到 <https://vercel.com/signup> 用 **GitHub 帳號登入**（選 `Bob-of-light`）
2. 按 **Add New → Project**
3. 匯入 `japan-travel-notes` 倉庫
4. Framework Preset 選 **Other**
5. 按 Deploy

> `vercel.json` 已經把 `buildCommand` 設為 `null`，Vercel 不會建置前端，
> 只會部署 `api/` 底下的四個函式。網頁本身由 GitHub Pages 負責。
>
> 就算 Vercel 顯示「沒有輸出目錄」之類的提示，也不影響 API 使用。

### 2. 設定環境變數

專案 → Settings → Environment Variables → 新增上面 4 個

### 3. 取得 API 網址並填回 GitHub

Vercel 會給你一個網址，長像：
```
https://japan-travel-notes.vercel.app
```

到 GitHub 倉庫：
**Settings → Secrets and variables → Actions → Variables** → 新增：

```
名稱：VITE_WRITE_API_URL
值：  https://japan-travel-notes.vercel.app
```

### 4. 重新部署

跑一次 `upload.bat`，或到 Actions 頁面手動 Re-run。

## 驗收

開啟線上網站，頁首應該出現一個 **🔒 編輯** 按鈕：

1. 按下去 → 輸入你設定的 `WRITE_PIN`
2. 左邊出現 **＋ 新增景點**
3. 新增一個測試景點 → 儲存
4. 等 1 分鐘，重新整理網站，確認景點出現了

## 會不會壞掉 / 需要保養嗎

資料本身**永遠在你的 GitHub 倉庫**，有完整 commit 紀錄可以回退。
需要留意的只有「線上編輯」這個功能本身：

| 風險 | 影響 | 怎麼處理 |
| --- | --- | --- |
| Token 到期 | 編輯功能失效，但資料不影響 | Expiration 設 **No expiration** 就不會發生 |
| Vercel 閒置政策 | 專案可能被移除 | 偶爾用一次就算有活動，不會被當閒置 |
| Vercel 改變免費方案條款 | 可能需要付費或搬家 | 隨時能搬到別家 |

**如果 Vercel 真的不能用**，隨時可以退回本機模式：

```
dev.bat  →  在電腦上加景點  →  upload.bat
```

程式碼和資料都在 GitHub，**資料不會有任何損失**。

## 常見問題

**改了但沒變化**
- 看一下 <https://github.com/Bob-of-light/japan-travel-notes/actions> 有沒有在部署
- 確認 `VITE_WRITE_API_URL` 設的是 Vercel 網址，**不要**加結尾斜線
- 改完有時要強制重新整理（Ctrl+F5）

**顯示「伺服器尚未完成設定」**
- Vercel 的 4 個環境變數有沒有設錯名字（大小寫有差）
- 設完要重新部署才會生效

**顯示「密碼錯誤」**
- `WRITE_PIN` 是你設定的值，不是 GitHub 密碼

**401 / 403 從 GitHub 回來**
- `GITHUB_TOKEN` 過期了，重新產生一支
- 或權限沒勾 Contents: Read and write

## 安全說明

- Token 只存在 Vercel 的加密環境變數裡，**不會**進入前端程式碼
- 寫入路徑有限制（只能寫 `spots.json` 與 `images/*/*.jpg`）
- `resolve` 函式只接受 Google 網域，避免被當成跳板
- 每次寫入會產生 GitHub commit，資料異動都有紀錄可以回退
- `WRITE_PIN` 存在瀏覽器 localStorage，換裝置要重新輸入

## 想放棄線上編輯

把 GitHub 的 `VITE_WRITE_API_URL` 這個變數刪掉，再重新部署就會回到唯讀模式。
Vercel 專案也可以直接刪掉，GitHub Pages 的網站不受影響。