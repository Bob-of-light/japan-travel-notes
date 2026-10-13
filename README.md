# 日本旅遊筆記（RYOKO）

把散落的日本旅遊情報整理成一個可搜尋、可編輯的網頁。
左側是索引（可切換「依目的／依地點」兩種看法），右側是選取景點的詳細介紹。

## 怎麼開始

| 檔案 | 用途 |
| --- | --- |
| `dev.bat` | **開發模式**：邊改邊看，開 http://localhost:5173，改完自動重新整理 |
| `upload.bat` | **一鍵上傳**：建置檢查 + git 提交 + 推送，之後等 1-2 分鐘自動部署 |
| `build.bat` | 只負責建置，不上傳 |
| `start.bat` | 建置 + 啟動本機伺服器，開 http://localhost:3001 |

日常開發請用 `dev.bat`，要更新線上網站就跑 `upload.bat`。

> 因為要部署到 GitHub Pages，路徑帶 `/japan-travel-notes/` 前綴。
> `dev.bat` 與 `start.bat` 的伺服器都會自動處理這個前綴，
> `http://localhost:5173/` 和 `http://localhost:5173/japan-travel-notes/` 都能開。

第一次使用請先執行一次：

```
npm install
```

> 只用到 Node.js 內建模組，沒有安裝任何額外程式。

## 在網頁上新增景點

左側索引最上面的 **＋ 新增景點**。只有四個必填欄位：

| 欄位 | 說明 |
| --- | --- |
| 名稱 | 你打 |
| 地點 | 下拉選既有地名，或直接打新的 |
| 分類 | 點一下選，至少一個 |
| 介紹 | 你打，之後旅遊時看 |

其他欄位都是選填，會自動幫你搞定：

**Google Maps 連結（選填但強烈建議）**
在手機上用 Google Maps 分享 →「複製連結」，貼進欄位。系統會自動：

1. 抓出座標（`maps.app.goo.gl` 短網址會自動跟隨轉址）
2. 反查日文地址填入地址欄位（可自由修改，自動填入的會標示提醒）
3. 從網址帶出店名與日文名

不貼連結也能存，地圖會用「名稱＋地名」讓 Google 自己搜尋（實測可行，
但同名店可能找錯）。地址來源是 OpenStreetMap 的 Nominatim 免費服務，
**只有在地圖上被標記過的地方查得到**，查不到就留空手動打。

**不顯示地圖**：勾選後該景點完全不出現地圖（用於已歇業、暫時找不到位置等）。

**交通**：不用填。設定頁首的出發地後，每個景點會自動產生從出發地前往的
Google 乘車規劃與 Yahoo!乘換連結。想寫詳細路線（搭哪條線、幾分鐘）再選填。

**照片**：直接選檔上傳，瀏覽器端會先縮圖（最大邊 1600px、JPEG 品質 82）
再去除手機照片的 EXIF／GPS 才上傳，一個景點最多 6 張。

## 出發地

頁首的 **📍 按鈕**。設定之後，每個景點的「交通方式」會多出一張卡片：

```
從  上野站  到  駿河屋 秋葉原ゲーム館
[Google 路線]  [Yahoo! 乘換（即時到站）]
```

出發地存在 `spots.json` 的 `settings.origin`，所以電腦和手機看到的是同一個。
輸入框有 datalist 會帶出資料中出現過的車站名。

## 資料放在哪

**所有景點內容都在 `public/data/spots.json`，這是唯一的事實來源。**

- 在網頁上按「修改」→ 儲存，後端會直接寫回這個檔案，舊內容自動備份成
  `public/data/spots.backup.json`
- 手動編輯也可以，改完存檔後在網頁上重新整理即可
- 建議每次新增或修改景點前，先在 VS Code 做一次 commit 當備份

## 景點資料格式

```jsonc
{
  "version": 1,
  "categories": ["收電玩", "買模型", "吃好料", "賞美景", "壓馬路", "去探秘", "訪聖地"],
  "spots": [
    {
      "id": "super-potato",              // 唯一識別碼，建立後不要改
      "name": "SUPER POTATO 秋葉原店",
      "nameJa": "スーパーポテト 秋葉原店",
      "area": "秋葉原",                   // 地名，決定「依地點」模式的位置
      "categories": ["收電玩"],           // 可多選，決定「依目的」模式的位置
      "address": "〒101-0021 東京都千代田区外神田1-11-2 北林ビル3・4・5階",
      "mapQuery": "スーパーポテト 秋葉原店",  // 留空則用 nameJa／name
      "phone": "03-5289-9933",
      "website": "https://www.superpotato.com/shop/akihabara/",
      "hours": "平日 11:00-20:00／土日祝 10:00-20:00",
      "closed": "無休",
      "description": "第一段。\n\n第二段（中間空一行就會分段顯示）。",
      "images": [
        { "src": "images/super-potato/1.jpg", "caption": "一樓的卡帶牆" },
        { "src": "images/super-potato/2.jpg", "caption": "" }
      ],
      "transport": [
        {
          "mode": "JR",                  // JR／地下鉄／巴士／遊覽船…
          "line": "山手線・京浜東北線",
          "direction": "各停",
          "fromStation": "上野站",
          "toStation": "秋葉原站",
          "rideMin": 4,
          "walkMin": 4,
          "note": "昭和通り口出站，步行約一分鐘"
        }
      ],
      "updatedAt": "2026-10-13"
    }
  ]
}
```

注意事項：

- `categories` 裡出現的新名稱會自動加進分類清單，也可以直接加在頂層 `categories`
- 分類下沒有任何景點時，索引會自動隱藏，不會顯示空項目
- 一個景點可以同時屬於多個分類（例如一家店既是「吃好料」也是「壓馬路」），
  兩種索引模式下都會出現
- 交通可以登錄任意多組路線，每組都會自動產生查詢連結

## 照片

照片放在 `public/images/<景點 id>/`，資料檔只需要記相對路徑。

**新增照片的流程**

1. 把照片放進 `_incoming/<景點 id>/`（檔名不用改，資料夾名要等於景點的 `id`）
2. 執行：

   ```
   powershell -ExecutionPolicy Bypass -File scripts\prepare-images.ps1
   ```

3. 腳本會自動完成：縮圖到最大邊 1600px、轉成 JPEG 品質 82、**去掉手機照片的
   EXIF／GPS 資訊**、依序命名為 `1.jpg` `2.jpg`…，並更新 `spots.json`

手機原圖一張 2-5MB，壓縮後約 250-400KB。40 張照片壓縮後大約 10-16MB，
對 GitHub 倉庫來說是很小的量。`_incoming/` 已加進 `.gitignore`，
原始照片不會進版本庫，只有 `public/images/` 裡的成品會。

**在網頁上微調**

編輯視窗裡可以改照片說明、移除照片。圖片本身要新增或刪除檔案，
請走上面的腳本流程。

**部署提醒**

上傳 GitHub Pages 時，`public\images\` 必須一起勾選，否則手機上會看到破圖。

## 交通連結從哪來

網頁本身不呼叫任何付費 API（不需要註冊金鑰）：

- **Google 路線**：開啟 Google 地圖的大眾運輸路線規劃，含即時建議
- **Yahoo! 乘換**：開啟 Yahoo!乘換案内，可查即時到站、時刻表、延誤資訊

地圖則使用 Google Maps 的嵌入地圖（`maps.google.com/maps?...&output=embed`），同樣不需要金鑰。

> 如果之後想讓「即時到站」直接顯示在網頁內（不用點擊跳出），
> 就需要申請 Google Maps Platform 的 Routes API 金鑰，
> 到時再告訴我即可加上去。

## 手機瀏覽

- 1024px 以下，左側索引會變成抽屜，點左上角的 ☰ 開關
- 詳情改為單欄滿版，地圖高度縮小
- 編輯視窗在手機上變成全螢幕

## 主題（明／暗）

右上角的太陽／月亮切換。第一次開啟會跟隨系統的深淺色設定，
之後會記住你的選擇（存在瀏覽器的 localStorage）。

## 唯讀模式

若網站是部署在 GitHub Pages 這類純靜態環境，沒有後端可以存檔，
頁面會顯示「唯讀模式」並停用編輯與新增按鈕。

## 部署到 GitHub Pages

網址：<https://bob-of-light.github.io/japan-travel-notes/>

`vite.config.ts` 的 `base` 與 `server/server.mjs` 的 `BASE` 必須一致，
改倉庫名稱時兩個地方都要跟著改。

**更新線上網站：執行 `upload.bat` 就好了**

它會依序做四件事：建置檢查 → `git add` → 提示你輸入更新說明並 commit →
`git push`。推送後 GitHub Actions 會自動重新部署，等 1～2 分鐘就好。

```
[1/4] 檢查建置...
[2/4] 整理變更內容...
      請描述這次更新（直接按 Enter 用今天的時間）：
[3/4] 儲存變更： ...
[4/4] 上傳到 GitHub...
```

> 第一次執行時，因為本機與 GitHub 的歷史不同，會用強制覆蓋的方式對齊一次；
> 之後都是一般的 push。`.git\push-done` 這個標記檔記錄了對齊是否已完成。

**上傳後想看進度**

<https://github.com/Bob-of-light/japan-travel-notes/actions>

**線上版本是唯讀的**

GitHub Pages 是純靜態網站，沒有後端可以存檔，所以線上版本的
「新增景點」和「修改」按鈕會停用（頁首有提示）。

因此新增與修改都要在本機完成：

```
dev.bat  →  在網頁上新增／修改景點  →  存檔
upload.bat  →  等 1～2 分鐘
```

**GitHub 帳號**

本機的 git 憑證原本是 `bobyubobyu`，但這個倉庫屬於 `Bob-of-light`。
因此 remote 網址寫成：

```
https://Bob-of-light@github.com/Bob-of-light/japan-travel-notes.git
```

這樣只讓這個倉庫使用 `Bob-of-light` 的憑證，不影響你在這台電腦上的
其他專案。若換電腦或清除憑證，第一次 push 時瀏覽器會跳出登入視窗。