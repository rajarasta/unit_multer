# 🔧 CUDA Structured Text + LLM Troubleshooting Guide

## ❗ Greška: JSON Parsing + Connection Refused

Ako vidite greške poput:
```
💡 Structured text analysis failed: SyntaxError: Expected ',' or ']' after array element in JSON
POST http://10.39.35.136:1234/v1/chat/completions net::ERR_CONNECTION_REFUSED
```

## 🎯 Uzrok Problema

**Glavni uzrok:** CUDA LLM server nije pokrenut ili app koristi pogrešan endpoint.

**Sekundaran uzrok:** LLM vraća malformed JSON response.

## 🔧 Korak-po-korak Rešavanje

### 1. ✅ Proverite Odabir Analysis Mode

U Invoice Processing tab-u, proverite da li ste odabrali:
```
"Strukturirani tekst + CUDA LLM (optimiziran)"
```

**NAPOMENA:** Ako koristite bilo koji drugi mode (Spatial, Vision, itd.), biće korišten stari endpoint `http://10.39.35.136:1234`.

### 2. 🚀 Pokrenite CUDA LLM Server

```bash
# U Command Prompt:
cd "E:\UI REFACTOR\aluminum-store-ui"
start_cuda_llm.bat
```

**Sačekajte 2-5 minuta** da se model učita u memoriju. RTX 4060 može potrajati.

### 3. 🧪 Testirajte Server

```bash
test_cuda_server.bat
```

Trebalo bi videti:
```
✅ CUDA LLM server je dostupan i radi!
📡 Endpoint: http://127.0.0.1:8000/v1/chat/completions
🎯 Model: gpt-oss-20b
🔐 API Key: local-key
```

### 4. ⚙️ Konfiguracija u UI

U Invoice Processing → Analysis Mode → **STRUCTURED_TEXT**:

- **Server URL:** `http://127.0.0.1:8000/v1/chat/completions`
- **Model Alias:** `gpt-oss-20b`  
- **API Key:** `local-key`

### 5. 📄 Test sa Sample Document

Upload `test_sample.txt` i proverite da li radi.

## 🔍 Detaljno Debugging

### A. Proverite Server Status

```bash
netstat -an | findstr :8000
```

Treba da vidite: `TCP 127.0.0.1:8000 ... LISTENING`

### B. Manual CURL Test

```bash
curl -X POST http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer local-key" \
  -d "{\"model\":\"gpt-oss-20b\",\"messages\":[{\"role\":\"user\",\"content\":\"Test\"}],\"temperature\":0.1}"
```

### C. Proverite Model Path

U `start_cuda_llm.bat`, proverite:
```batch
set MODEL_PATH=E:\Modeli\gpt-oss-20b-MXFP4.gguf
```

**Promenite path** da odgovara vašem modelu!

## 🚨 Česti Problemi

| Problem | Uzrok | Rešenje |
|---------|-------|---------|
| `ERR_CONNECTION_REFUSED` | Server nije pokrenut | Pokrenite `start_cuda_llm.bat` |
| `Model not found` | Pogrešan model path | Ažurirajte MODEL_PATH u .bat file-u |
| `JSON parse error` | LLM vraća malformed JSON | Smanite temperature ili promenite prompt |
| `401 Unauthorized` | Pogrešan API key | Proverite da API key = "local-key" |
| `Port already in use` | Port 8000 zauzet | Ubijte proces ili promenite port |

## 🎯 Optimizacije

### CUDA Performance

```batch
# U start_cuda_llm.bat:
--n_gpu_layers -1          # Svi layeri na GPU
--n_ctx 16384             # 16K context window  
--flash_attn 1            # Flash attention
--n_threads 8             # CPU threads za RTX 4060
```

### JSON Response Quality

- **Temperature:** 0.1-0.2 (niže = strukturiranije)
- **Max Tokens:** 1200 (dovoljno za JSON response)
- **Response Format:** `{"type": "json_object"}` (forsiraj JSON)

## ✅ Verifikacija Uspešne Konfiguracije

Kada sve radi, trebalo bi videti u konzoli:

```javascript
🔍 CUDA LLM server (http://127.0.0.1:8000/v1/chat/completions) accessible
⚡ OCR/parsing + CUDA-optimiziran LLM: completed successfully
🎯 Model: gpt-oss-20b, Context: 16384, Extraction: 247 elements
```

## 📞 Podrška

Ako problemi i dalje postoje:

1. **Proverite Windows Event Viewer** za sistemske greške
2. **Monitor Task Manager** za memoriju/GPU usage podczas loading
3. **Proverite firewall** da li blokira port 8000
4. **Restartujte sistem** ako je potrebno

---

💡 **TIP:** CUDA LLM setup traje 10-15 minuta prvi put, ali je nakon toga blazingly fast!