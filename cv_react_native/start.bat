@echo off
title Computer Vision App - Expo Server
set "PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools;%PATH%"
adb reverse tcp:8081 tcp:8081 >nul 2>&1
cd /d "%~dp0"
echo ============================================================
echo   🚀 Starting Computer Vision React Native App
echo   Open Expo Go on your phone and scan the QR code!
echo ============================================================
call npx expo start
pause
