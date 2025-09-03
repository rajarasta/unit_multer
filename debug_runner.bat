@echo off
echo 🔍 Runner API Debug Script
echo.

echo [1] Checking Node.js installation...
node --version
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Install from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found

echo.
echo [2] Checking files...
if exist "runner.js" (
    echo ✅ runner.js found
) else (
    echo ❌ runner.js missing!
    pause
    exit /b 1
)

echo.
echo [3] Checking syntax...
node -c runner.js
if %errorlevel% neq 0 (
    echo ❌ Syntax error in runner.js!
    pause
    exit /b 1
)
echo ✅ runner.js syntax OK

echo.
echo [4] Checking if port 3002 is free...
netstat -an | findstr :3002
if %errorlevel% equ 0 (
    echo ⚠️  Port 3002 is in use!
    echo You may need to kill the process or use a different port
) else (
    echo ✅ Port 3002 is available
)

echo.
echo [5] Trying to start Runner API (with error output)...
echo If it crashes, you'll see the error below:
echo.
node runner.js