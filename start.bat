@echo off
cd /d "%~dp0"
echo Building 日本旅遊筆記...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Build 失敗，請修正錯誤後重試
    pause
    exit /b
)
echo.
echo Build 完成！啟動伺服器...
echo 請開啟 http://localhost:3001
echo 關閉這個視窗就會停止。
echo.
npm start
pause