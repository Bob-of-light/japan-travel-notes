# 日本旅遊筆記（RYOKO）

把散落的日本旅遊情報整理成一個可搜尋、可編輯的網頁。
左側是索引（可切換「依目的／依地點」兩種看法），右側是選取景點的詳細介紹。

## 怎麼開始

| 檔案 | 用途 |
| --- | --- |
| `dev.bat` | **開發模式**：邊改邊看，開 http://localhost:5173，改完自動重新整理 |
| `build.bat` | 打包成 `dist/`，只負責建置 |
| `start.bat` | 建置 + 啟動伺服器，開 http://localhost:3001 |

日常開發請用 `dev.bat`。要給別人看或放在電腦上跑時用 `start.bat`。

第一次使用請先執行一次：

```
npm install
```

> 只用到 Node.js 內建模組，沒有安裝任何額外程式。

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
頁面會顯示「唯讀模式」並停用編輯按鈕，資料改由直接編輯
`public/data/spots.json` 再重新部署。

## 部署（之後再做）

驗收 OK 後要上傳 GitHub Pages 時，需要補三個東西，屆時再說：

1. `vite.config.ts` 加 `base: '/<repo 名稱>/'`
2. 新增 `.github/workflows/deploy.yml`
3. 新增 `package-for-upload.bat`