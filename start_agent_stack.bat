@echo off
echo Starting PDF Agent Processing Stack...
echo.

REM Configure environment variables
set TEXT_LLM_URL=http://127.0.0.1:8000
set VISION_LLM_URL=http://127.0.0.1:8001
set MODEL_LABEL=local-gguf
set MAX_PAGES_DEF=3

echo Environment configured:
echo TEXT_LLM_URL=%TEXT_LLM_URL%
echo VISION_LLM_URL=%VISION_LLM_URL%
echo.
echo NOTE: Using pypdfium2 for PDF processing (no Poppler required!)
echo.

echo [STEP 1] Installing agent dependencies...
python -m pip install -r agent_requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [STEP 2] Starting TEXT LLM Server (port 8000)...
echo NOTE: Update model path below to your actual model location
echo Example: D:\models\Qwen2.5-7B-Instruct-Q4_K_M.gguf

start "TEXT_LLM" cmd /k "python -m llama_cpp.server --model D:\models\Qwen2.5-7B-Instruct-Q4_K_M.gguf --api-server --host 0.0.0.0 --port 8000 --n_ctx 4096 --n_gpu_layers -1"

echo Waiting for TEXT LLM to initialize...
timeout /t 10

echo.
echo [STEP 3] Starting VISION LLM Server (port 8001)...  
echo NOTE: Update model and mmproj paths below to your actual locations
echo Example: D:\models\llava-v1.5-7b.Q4_K.gguf and D:\models\mmproj-f16.gguf

start "VISION_LLM" cmd /k "python -m llama_cpp.server --model D:\models\llava-v1.5-7b.Q4_K.gguf --mmproj D:\models\mmproj-f16.gguf --api-server --host 0.0.0.0 --port 8001 --n_ctx 4096 --n_gpu_layers -1"

echo Waiting for VISION LLM to initialize...
timeout /t 15

echo.
echo [STEP 4] Starting PDF Agent Orchestrator (port 7001)...
start "AGENT_SERVER" cmd /k "python agent_server.py"

echo.
echo ======================================
echo PDF Agent Stack Starting Complete!
echo ======================================
echo.
echo Services:
echo - TEXT LLM:     http://127.0.0.1:8000
echo - VISION LLM:   http://127.0.0.1:8001  
echo - AGENT API:    http://127.0.0.1:7001
echo.
echo API Endpoint: POST http://127.0.0.1:7001/agent/analyze-file
echo.
echo Press any key to continue or Ctrl+C to exit...
pause