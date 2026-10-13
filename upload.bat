@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================
echo    一鍵上傳更新到 GitHub
echo ============================================
echo.

echo  [1/4] 檢查建置...
call npm run build
if %errorlevel% neq 0 goto :failBuild
echo      建置沒有錯誤。

echo.
echo  [2/4] 整理變更內容...
git add -A
set "HASCHANGE="
git diff --cached --quiet
if errorlevel 1 set "HASCHANGE=1"

if not defined HASCHANGE goto :push
echo      有檔案變更。

echo.
set /p "MSG=請描述這次更新（直接按 Enter 用今天的時間）："
if "%MSG%"=="" set "MSG=更新 %date% %time%"
echo.
echo  [3/4] 儲存變更： %MSG%
git commit -m "%MSG%"
if %errorlevel% neq 0 goto :failCommit
goto :push

:push
echo.
echo  [4/4] 上傳到 GitHub...
set "FORCE="
if not exist "%~dp0.git\push-done" set "FORCE=--force"
git push %FORCE% origin master:main
if %errorlevel% neq 0 goto :failPush
if not exist "%~dp0.git\push-done" echo.> "%~dp0.git\push-done"

echo.
echo ============================================
echo    上傳完成！等 1~2 分鐘就會自動部署。
echo.
echo    看網站  https://bob-of-light.github.io/japan-travel-notes/
echo    看進度  https://github.com/Bob-of-light/japan-travel-notes/actions
echo ============================================
goto :end

:failBuild
echo.
echo    建置失敗，請先修正錯誤後再上傳。
goto :end

:failCommit
echo.
echo    儲存變更失敗。
goto :end

:failPush
echo.
echo    上傳失敗。常見原因：
echo.
echo      1. 第一次執行：瀏覽器會跳出視窗請你登入，
echo         請確認用 Bob-of-light 帳號登入並授權，
echo         授權完再執行一次這個檔案。
echo.
echo      2. 如果跳出的是別的帳號，請到
echo         Settings - Developer settings - Personal access tokens
echo         或改用 git push 手動登入。
goto :end

:end
echo.
pause
endlocal