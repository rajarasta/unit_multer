@echo off
echo 🧪 CUDA LLM Server Test Script
echo ===============================
echo.

echo [1] Testing CUDA LLM server connection...
curl -X POST http://127.0.0.1:8001/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer local-key" ^
  -d "{\"model\":\"gpt-oss-20b\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello, test message\"}],\"temperature\":0.1,\"max_tokens\":50}"

if %errorlevel% equ 0 (
    echo.
    echo ✅ CUDA LLM server je dostupan i radi!
    echo 📡 Endpoint: http://127.0.0.1:8001/v1/chat/completions
    echo 🎯 Model: gpt-oss-20b
    echo 🔐 API Key: local-key
) else (
    echo.
    echo ❌ CUDA LLM server nije dostupan
    echo.
    echo 🔧 Troubleshooting:
    echo   1. Pokreni start_cuda_llm.bat prvo
    echo   2. Sačekaj da se model učita (može potrajati)
    echo   3. Provjeri da li je model path u start_cuda_llm.bat ispravan
    echo   4. Provjeri da li je port 8001 slobodan
    echo.
    echo 💡 Model loading može potrajati 2-5 minuta na RTX 4060
)

echo.
pause