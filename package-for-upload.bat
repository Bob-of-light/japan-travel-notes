@echo off
cd /d "%~dp0"

echo ============================================
echo   上傳到 GitHub Pages - 打包說明
echo ============================================
echo.
echo  [1. 先確認程式是最新的]
echo.
echo      這個動作不需要打包。請先執行 build.bat，
echo      確定沒有錯誤再進行上傳。
echo.
echo  [2. 到 GitHub 開啟上傳頁面]
echo.
echo      https://github.com/bob-of-light/japan-travel-notes/upload/main
echo.
echo  [3. 在檔案總管中，於本資料夾按住 Ctrl 選取以下 20 個項目]
echo.
echo      資料夾（5 個）：
echo        .github\
echo        public\
echo        scripts\
echo        server\
echo        src\
echo.
echo      檔案（15 個）：
echo        .gitattributes   .gitignore   README.md
echo        build.bat        dev.bat      start.bat
echo        index.html       package.json  package-lock.json
echo        postcss.config.js  tailwind.config.js
echo        tsconfig.json    tsconfig.node.json
echo        vite.config.ts
echo.
echo  [4. 不要選以下項目]
echo.
echo        node_modules\
echo        dist\
echo        _incoming\
echo        tsconfig.tsbuildinfo
echo.
echo        dist 不用選，因為 GitHub Actions 會自己重新建置。
echo        _incoming 是暫存照片用的，不需要上傳。
echo.
echo  [5. 把選好的 20 個項目拖到 GitHub 上傳頁面]
echo.
echo      必須直接拖資料夾與檔案，不能拖 zip。
echo      GitHub 不會自動解壓縮 zip 檔。
echo.
echo  [6. 上傳完成後，務必確認這三個地方有東西]
echo.
echo      .github\workflows\deploy.yml   少了就不會自動部署
echo      public\data\spots.json         少了就沒有景點
echo      public\images 底下的 .jpg       少了照片會破圖
echo.
echo  [7. 捲到頁面最下方按 Commit changes]
echo.
echo  [8. 等 1~2 分鐘，開啟以下網址確認]
echo.
echo      https://bob-of-light.github.io/japan-travel-notes/
echo.
echo  如果一直沒有部署，去 Settings 頁面的 Pages 項目，
echo  把 Source 選擇 GitHub Actions。
echo.
echo  --------------------------------------------
echo  提醒：上傳後網頁上的編輯會變成唯讀（正常現象）。
echo  之後要新增景點，請在本機用 dev.bat 新增，
echo  然後重新執行這個說明再上傳一次。
echo  --------------------------------------------
echo.
pause