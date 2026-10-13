@echo off
cd /d "%~dp0"
echo 啟動開發模式（Vite + API 伺服器）...
echo 請開啟 http://localhost:5173
echo 關閉這個視窗就會停止。
echo.
npm run dev
pause