@echo off
echo 🚀 CUDA-Optimized LLM Server Launcher
echo =======================================
echo.

echo [1] Checking CUDA installation...
nvcc --version 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ CUDA toolkit not detected, but GPU acceleration may still work
    echo   GPU drivers should be sufficient for inference
) else (
    echo ✅ CUDA toolkit found
)
echo.

echo [2] Installing/upgrading llama-cpp-python with CUDA support...
python -m pip uninstall llama-cpp-python -y
python -m pip install --upgrade "llama-cpp-python[cuda]"
if %errorlevel% neq 0 (
    echo ❌ Failed to install CUDA version, trying CPU version...
    python -m pip install --upgrade llama-cpp-python
)
echo.

echo [3] Checking model file...
set MODEL_PATH=E:\Modeli\gpt-oss-20b-MXFP4.gguf
if exist "%MODEL_PATH%" (
    echo ✅ Model file found: %MODEL_PATH%
) else (
    echo ❌ Model file not found: %MODEL_PATH%
    echo Please update MODEL_PATH in this script or place your model file there
    pause
    exit /b 1
)
echo.

echo [4] Starting CUDA-optimized llama.cpp server...
echo Configuration:
echo   - Model: gpt-oss-20b (alias)
echo   - Context: 16384 tokens  
echo   - GPU: All layers (-1)
echo   - Flash Attention: Enabled
echo   - API Key: local-key
echo   - Port: 8001
echo.

python -m llama_cpp.server ^
  --model "%MODEL_PATH%" ^
  --model_alias "gpt-oss-20b" ^
  --host 127.0.0.1 ^
  --port 8001 ^
  --api_key "local-key" ^
  --n_ctx 16384 ^
  --n_gpu_layers -1 ^
  --flash_attn 1 ^
  --n_threads 8 ^
  --n_threads_batch 8

echo.
echo Server stopped. Press any key to exit...
pause >nul