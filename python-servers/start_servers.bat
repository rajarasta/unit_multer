@echo off
REM Windows batch script to start Python LLM servers
REM Run this script to start both text and vision LLM servers + PDF analyzer

echo 🚀 Starting Python LLM Server Stack...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please install Python 3.8+ and add to PATH
    pause
    exit /b 1
)

REM Create directories if they don't exist
if not exist "logs" mkdir logs
if not exist "models" mkdir models

echo 📋 Configuration:
echo    Text LLM: http://127.0.0.1:8000
echo    Vision LLM: http://127.0.0.1:8001  
echo    PDF Analyzer: http://127.0.0.1:7000
echo.

REM Set model paths (CHANGE THESE TO YOUR ACTUAL MODEL PATHS)
set TEXT_MODEL_PATH=D:\models\Qwen2.5-7B-Instruct-Q4_K_M.gguf
set VISION_MODEL_PATH=D:\models\llava-v1.5-7b.Q4_K.gguf
set VISION_MMPROJ_PATH=D:\models\mmproj-model-f16.gguf

echo 📁 Model paths:
echo    Text: %TEXT_MODEL_PATH%
echo    Vision: %VISION_MODEL_PATH%
echo    Vision proj: %VISION_MMPROJ_PATH%
echo.

REM Check if model files exist
if not exist "%TEXT_MODEL_PATH%" (
    echo ⚠️  WARNING: Text model not found at %TEXT_MODEL_PATH%
    echo    Update TEXT_MODEL_PATH in this script or download model
    echo.
)

if not exist "%VISION_MODEL_PATH%" (
    echo ⚠️  WARNING: Vision model not found at %VISION_MODEL_PATH%
    echo    Update VISION_MODEL_PATH in this script or download model
    echo.
)

echo 🟡 Starting servers in background...
echo    Press Ctrl+C in any window to stop all servers
echo    Check logs\ folder for detailed output
echo.

REM Start Text LLM Server (Port 8000)
echo 🔤 Starting Text LLM Server...
start "Text LLM Server" cmd /k "python -m llama_cpp.server --model "%TEXT_MODEL_PATH%" --host 0.0.0.0 --port 8000 --n_ctx 4096 --n_gpu_layers -1 --verbose 2>&1 | tee logs\text_llm.log"

REM Wait a bit before starting next server
timeout /t 3 /nobreak >nul

REM Start Vision LLM Server (Port 8001) - only if vision model exists
if exist "%VISION_MODEL_PATH%" (
    echo 👁️  Starting Vision LLM Server...
    if exist "%VISION_MMPROJ_PATH%" (
        start "Vision LLM Server" cmd /k "python -m llama_cpp.server --model "%VISION_MODEL_PATH%" --mmproj "%VISION_MMPROJ_PATH%" --host 0.0.0.0 --port 8001 --n_ctx 4096 --n_gpu_layers -1 --verbose 2>&1 | tee logs\vision_llm.log"
    ) else (
        echo ⚠️  Vision projection model not found, starting without mmproj...
        start "Vision LLM Server" cmd /k "python -m llama_cpp.server --model "%VISION_MODEL_PATH%" --host 0.0.0.0 --port 8001 --n_ctx 4096 --n_gpu_layers -1 --verbose 2>&1 | tee logs\vision_llm.log"
    )
) else (
    echo ⚠️  Skipping Vision LLM Server (model not found)
)

REM Wait a bit before starting PDF analyzer
timeout /t 3 /nobreak >nul

REM Start PDF Analyzer Server (Port 7000)
echo 📄 Starting PDF Analyzer Server...
start "PDF Analyzer" cmd /k "python pdf_analyzer.py 2>&1 | tee logs\pdf_analyzer.log"

echo.
echo ✅ All servers started!
echo.
echo 🌐 Service URLs:
echo    Text LLM: http://127.0.0.1:8000/docs
echo    Vision LLM: http://127.0.0.1:8001/docs  
echo    PDF Analyzer: http://127.0.0.1:7000/docs
echo.
echo 🔧 Next steps:
echo    1. Open your React app (http://localhost:5174)
echo    2. Go to LLM Server Manager tab
echo    3. Connect to Python LLM Server (Text) on port 8000
echo    4. Test connection and create session
echo    5. Use PDF Analyzer for document processing
echo.
echo 📊 Monitoring:
echo    - Check console windows for real-time logs
echo    - View log files in logs\ directory
echo    - Use /health endpoints to check status
echo.

pause