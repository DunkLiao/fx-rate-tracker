@echo off
setlocal

cd /d "%~dp0"

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Please install Node.js LTS first.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting FX Rate Tracker...
start "FX Rate Tracker Server" /D "%~dp0" cmd /k npm run dev

timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

endlocal
