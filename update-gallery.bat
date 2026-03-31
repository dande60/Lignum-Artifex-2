@echo off
setlocal

cd /d "%~dp0"

echo Running gallery sync...
powershell -ExecutionPolicy Bypass -File "scripts\sync-portfolio.ps1"

if errorlevel 1 (
  echo.
  echo Gallery sync failed.
  echo Review the result summary above or on your Desktop in gallery-sync-result.txt.
  pause
  exit /b %errorlevel%
)

echo.
echo Gallery sync completed.
echo Review the result summary above or on your Desktop in gallery-sync-result.txt.
pause
