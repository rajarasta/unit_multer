# Python Headless LLM Servers

Kompletno Python rješenje za lokalne LLM servere bez potrebe za LM Studio ili OpenWebUI.

## 🚀 Quick Start

### 1. Instaliraj Dependencies

```bash
# Navigate to python-servers directory
cd python-servers

# Install Python packages
pip install -r requirements.txt

# Install Poppler for PDF processing (Windows)
# Download from: https://github.com/oschwartz10612/poppler-windows/releases
# Extract to C:\poppler and add C:\poppler\Library\bin to PATH
```

### 2. Download Models

Preuzmi GGUF modele u `models/` folder:

**Text Model (7B, Q4_K_M, ~4GB):**
```bash
# Qwen2.5-7B-Instruct (preporučeno)
wget https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/blob/main/qwen2.5-7b-instruct-q4_k_m.gguf

# Alternative: Mistral-Nemo
wget https://huggingface.co/bartowski/Mistral-Nemo-Instruct-2407-GGUF/blob/main/Mistral-Nemo-Instruct-2407-Q4_K_M.gguf
```

**Vision Model (7B, Q4_K_M, ~4GB) - za slike/PDF skenove:**
```bash
# LLaVA 1.5-7B
wget https://huggingface.co/cjpais/llava-v1.5-7b-gguf/blob/main/llava-v1.5-7b.Q4_K.gguf
wget https://huggingface.co/cjpais/llava-v1.5-7b-gguf/blob/main/mmproj-model-f16.gguf
```

### 3. Konfiguriraj Putanje

Uredi `start_servers.bat` i postavi putanje do modela:

```batch
set TEXT_MODEL_PATH=D:\models\Qwen2.5-7B-Instruct-Q4_K_M.gguf
set VISION_MODEL_PATH=D:\models\llava-v1.5-7b.Q4_K.gguf
set VISION_MMPROJ_PATH=D:\models\mmproj-model-f16.gguf
```

### 4. Pokreni Servere

```bash
# Windows
start_servers.bat

# Manual (alternative)
# Terminal 1: Text LLM
python -m llama_cpp.server --model "D:\models\qwen2.5-7b-instruct-q4_k_m.gguf" --host 0.0.0.0 --port 8000 --n_ctx 4096 --n_gpu_layers -1

# Terminal 2: Vision LLM
python -m llama_cpp.server --model "D:\models\llava-v1.5-7b.Q4_K.gguf" --mmproj "D:\models\mmproj-model-f16.gguf" --host 0.0.0.0 --port 8001 --n_ctx 4096 --n_gpu_layers -1

# Terminal 3: PDF Analyzer
python pdf_analyzer.py
```

## 🌐 Server Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Text LLM** | http://127.0.0.1:8000 | Chat, document analysis |
| **Vision LLM** | http://127.0.0.1:8001 | Image analysis, scanned docs |
| **PDF Analyzer** | http://127.0.0.1:7000 | PDF → Image conversion |

## 🔧 UI Integration

1. Otvori React aplikaciju (http://localhost:5174)
2. Idi u **LLM Server Manager** tab
3. Dodaj "Python LLM" server:
   - **Type:** Python LLM
   - **Host:** 127.0.0.1
   - **Port:** 8000
   - **Model:** qwen2.5-7b-instruct
4. Klikni **Pokreni** (Connect)
5. Testiraj **"Kreiraj sesiju"**

## 📄 Document Processing

### Text Documents (.txt, .md, readable PDFs)
- Auto-routing kroz Text LLM server (port 8000)
- Brža obrada, manja potrošnja VRAM-a

### Images & Scanned PDFs (.jpg, .png, image-based PDFs)
- Vision LLM server (port 8001) ili PDF Analyzer (port 7000)
- Automatska konverzija PDF → slike
- Multimodal analiza

### Usage Pattern
```javascript
// In React components
import { sendChatMessage, analyzeDocument } from '../llmBridge';

// Chat
const result = await sendChatMessage("Explain aluminum properties", {
  session: { activeSession },
  updateSessionStats: updateSession
});

// Document analysis
const analysis = await analyzeDocument(pdfFile, "Extract invoice data as JSON", {
  session: { activeSession }
});
```

## ⚙️ Configuration

### Model Parameters
Adjust in React UI (LLM Session Manager):
- **Temperature:** 0.1 (precise) → 1.2 (creative)
- **Max Tokens:** 1024-4096 
- **Top P:** 0.9-0.98
- **Top K:** 40-80

### Memory Usage (8GB VRAM)
- **Q4_K_M models:** ~4GB VRAM each
- **Run both simultaneously:** OK with GPU layers adjustment
- **Fallback to CPU:** Use `--n_gpu_layers 0`

### Performance Tuning
```bash
# More GPU layers (faster, more VRAM)
--n_gpu_layers -1

# Less GPU layers (slower, less VRAM)
--n_gpu_layers 20

# CPU only (slowest, no VRAM)
--n_gpu_layers 0

# Larger context (more memory)
--n_ctx 8192

# Parallel requests
--n_parallel 2
```

## 🐛 Troubleshooting

### Common Issues

**1. "Model not found"**
- Check model file paths in `start_servers.bat`
- Ensure GGUF files are completely downloaded

**2. "Poppler not found" (PDF Analyzer)**
- Download Poppler for Windows
- Add to PATH: `C:\poppler\Library\bin`
- Restart command prompt

**3. "CUDA not available"**
- Install CUDA 11.8+
- Reinstall llama-cpp-python: `pip install llama-cpp-python[cuda] --force-reinstall`
- Check: `nvidia-smi`

**4. "Connection refused" in React**
- Verify servers are running: check console windows
- Test endpoints: http://127.0.0.1:8000/v1/models
- Check Windows Firewall permissions

**5. "Out of memory"**
- Reduce `--n_gpu_layers`
- Use smaller model (Q2_K instead of Q4_K_M)
- Close other applications

### Health Checks
```bash
# Test Text LLM
curl http://127.0.0.1:8000/v1/models

# Test Vision LLM  
curl http://127.0.0.1:8001/v1/models

# Test PDF Analyzer
curl http://127.0.0.1:7000/health
```

## 🔄 Development Workflow

1. **Start servers** → `start_servers.bat`
2. **Connect in UI** → LLM Server Manager tab
3. **Test connectivity** → Session test panel
4. **Develop/debug** → Check console logs
5. **Stop servers** → Ctrl+C in console windows

## 🚀 Production Deployment

### Systemd Service (Linux)
```bash
# Create service files for each server
sudo systemctl enable python-llm-text
sudo systemctl enable python-llm-vision
sudo systemctl enable pdf-analyzer
```

### Docker Compose
```yaml
version: '3.8'
services:
  text-llm:
    image: python:3.11-slim
    ports: ["8000:8000"]
    volumes: ["./models:/models"]
    command: python -m llama_cpp.server --model /models/text.gguf --port 8000
```

### Monitoring
- **Logs:** `logs/` directory
- **Metrics:** Add Prometheus endpoints
- **Health:** `/health` endpoints
- **Load balancing:** Multiple instances behind nginx

---

## 🎯 Benefits vs LM Studio/OpenWebUI

✅ **Full control over models and parameters**  
✅ **No GUI dependencies**  
✅ **Scriptable and automatable**  
✅ **Lower resource usage**  
✅ **Direct HTTP API integration**  
✅ **Custom PDF processing pipeline**  
✅ **Production-ready deployment**

🔹 **Trade-off:** Manual model management vs click-and-go UI