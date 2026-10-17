@echo off
REM Local Media Downloader - server launcher.
REM Run by the "Local Media Downloader" scheduled task at logon (hidden),
REM so the app is back on the LAN (port 8000) after every reboot.
REM Single-instance guard: a second trigger exits quietly if already serving.
cd /d "%~dp0"
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [%date% %time%] Already serving on :8000, exiting. >> server.log
  exit /b 0
)
echo [%date% %time%] Starting Local Media Downloader... >> server.log
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 >> server.log 2>&1
