@echo off
echo [HF] Starting Transformers-based PDF Agent (Gemma 3 4B-IT)
echo --------------------------------------------------------
echo.

REM Configure environment for HF backend
set LLM_BACKEND=hf
set AGENT_POLICY=rule_based
set HF_MODEL_ID=Qwen/Qwen2-VL-7B-Instruct
REM Options: bfloat16 | float16 | float32
set HF_DTYPE=float16
REM Set 1 to enable 4-bit (requires bitsandbytes)
set HF_LOAD_IN_4BIT=0
set MAX_PAGES_DEF=3

echo Backend: %LLM_BACKEND%  Policy: %AGENT_POLICY%
echo Model: %HF_MODEL_ID%  DType: %HF_DTYPE%  4bit: %HF_LOAD_IN_4BIT%
echo.

echo [1] Installing/Updating Python dependencies...
python -m pip install -r agent_requirements.txt
if %errorlevel% neq 0 (
  echo ERROR: Failed to install dependencies.
  pause
  exit /b 1
)

echo.
echo [2] Launching FastAPI agent on port 7001...
start "HF_AGENT" cmd /k "python -m uvicorn agent_server:app --host 0.0.0.0 --port 7001"

echo.
echo Ready. Agent API: http://127.0.0.1:7001
echo Health:          http://127.0.0.1:7001/agent/health
echo Endpoint:        POST /agent/analyze-file
echo.
echo Press any key to close this starter...
pause >nul
