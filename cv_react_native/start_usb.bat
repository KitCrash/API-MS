@echo off
title Computer Vision App - USB Mode
set "PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%"
echo Checking connected USB devices...
adb devices
echo Forwarding Metro port 8081 over USB...
adb reverse tcp:8081 tcp:8081
cd /d "%~dp0"
echo Starting Expo in USB/Localhost mode...
call npx expo start --localhost
pause
