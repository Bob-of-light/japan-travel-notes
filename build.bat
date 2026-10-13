@echo off
cd /d "%~dp0"
echo Building 日本旅遊筆記...
call npm run build
if %errorlevel% neq 0 (
    echo Build 失敗，請修正錯誤後重試
    pause
    exit /b
)
echo.
echo Build 完成！接下來執行 start.bat 即可啟動。
pause