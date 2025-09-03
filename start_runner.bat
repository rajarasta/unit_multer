@echo off
echo 🏃 Starting LLM Runner API...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "runner.js" (
    echo ❌ ERROR: runner.js not found in current directory
    echo Please run this script from the aluminum-store-ui directory
    pause
    exit /b 1
)

REM Create package.json if it doesn't exist
if not exist "package.json" (
    echo 📦 Creating package.json for Runner API...
    echo {^
  "name": "llm-runner-api",^
  "version": "1.0.0",^
  "main": "runner.js",^
  "dependencies": {^
    "express": "^4.18.2",^
    "cors": "^2.8.5"^
  }^
} > package.json
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing Runner API dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Failed to install dependencies
        echo.
        echo Try installing manually:
        echo npm install express cors
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
)

echo.
echo ✅ Starting Runner API on port 3002...
echo 📡 Endpoints available:
echo    POST /api/runner/launch - Start process
echo    POST /api/runner/stop/:id - Stop process  
echo    POST /api/runner/start-bat - Start .bat file
echo    GET  /api/runner/stream/:id - SSE log stream
echo    GET  /api/runner/health - Health check
echo.
echo 🌐 Access from LLM Server Manager tab in the React app
echo 🛑 Press Ctrl+C to stop the Runner API
echo.

REM Start the Runner API
node runner.js