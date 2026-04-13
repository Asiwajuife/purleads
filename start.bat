@echo off

REM Re-launch inside cmd /k so the window never auto-closes
if "%1"=="" (
    cmd /k "%~f0" run
    exit /b
)

setlocal

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo Stopping any existing Node processes on ports 3000 and 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " 2^>nul') do taskkill /f /pid %%a >nul 2>&1

echo Clearing Next.js cache...
if exist "%ROOT%\apps\web\.next" (
    rmdir /s /q "%ROOT%\apps\web\.next"
    echo   .next cleared.
)

echo Building API...
cmd /c "cd /d %ROOT%\apps\api && %ROOT%\node_modules\.bin\nest.cmd build"
if errorlevel 1 (
    echo.
    echo ERROR: API build failed. See errors above.
    pause
    exit /b 1
)

echo.
echo Starting all services...

REM API — /d sets the working directory so apps/api/.env is loaded
start "Purleads API" /d "%ROOT%\apps\api" cmd /k "node dist\main.js"

timeout /t 3 /nobreak >nul

REM Worker
start "Purleads Worker" /d "%ROOT%" cmd /k "node_modules\.bin\ts-node.cmd --transpile-only apps\worker\src\worker.ts"

REM Web — next.cmd is hoisted to root node_modules by npm workspaces
start "Purleads Web" /d "%ROOT%\apps\web" cmd /k "%ROOT%\node_modules\.bin\next.cmd dev -p 3000"

echo.
echo Services starting in 3 separate windows:
echo   API    -^> http://localhost:3001
echo   Web    -^> http://localhost:3000
echo.
echo Wait ~15 seconds for all to load, then open: http://localhost:3000
echo.
pause
