@echo off
cd /d "%~dp0"
echo 啟動開發模式（Vite + API 伺服器）...
echo 瀏覽器會自動開啟 http://localhost:5173
echo 若沒自動開啟，請手動複製該網址到瀏覽器。
echo 關閉這個視窗就會停止。
echo.
npm run dev
pause