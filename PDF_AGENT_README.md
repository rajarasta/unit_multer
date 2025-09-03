# 🤖 PDF Agent Processing System

Autonomous PDF processing agent with tool-calling LLM orchestration for Croatian invoice analysis.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │  Agent Server   │    │  Local LLMs     │
│  (React App)    │◄──►│  (FastAPI)      │◄──►│  TEXT + VISION  │
│  Port: 3000     │    │  Port: 7001     │    │  Ports: 8000+1  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install -r agent_requirements.txt
```

**Note:** Uses `pypdfium2` for PDF rendering - no Poppler binaries needed! Works out-of-the-box on Windows.

### 2. Download LLM Models
```bash
# TEXT Model (example)
# Download: Qwen2.5-7B-Instruct-Q4_K_M.gguf to D:\models\

# VISION Model (example)  
# Download: llava-v1.5-7b.Q4_K.gguf + mmproj-f16.gguf to D:\models\
```

### 3. Start Complete Stack
```bash
start_agent_stack.bat
```
This automatically starts:
- TEXT LLM server on port 8000
- VISION LLM server on port 8001  
- PDF Agent orchestrator on port 7001

### 4. Use in React App
Select "PDF Agent (autonomni - preporučeno)" in Invoice Processing settings.

## 📡 API Endpoints

### Main Processing Endpoint
```http
POST http://127.0.0.1:7001/agent/analyze-file
Content-Type: multipart/form-data

file: [PDF or image file]
max_pages: 3
```

**Response:**
```json
{
  "documentType": "invoice",
  "documentNumber": "INV-2025-001",
  "date": "2025-09-01",
  "supplier": {
    "name": "ABC Aluminium d.o.o.",
    "address": "Zagrebačka 123, Zagreb",
    "oib": "12345678901"
  },
  "items": [
    {
      "description": "Aluminijski profil 40x40",
      "quantity": 10,
      "unit": "m",
      "unitPrice": 25.50,
      "totalPrice": 255.00
    }
  ],
  "totals": {
    "totalAmount": 255.00
  }
}
```

## 🛠️ Agent Tool Functions

The agent automatically chooses the best processing path:

| Tool | Purpose | When Used |
|------|---------|-----------|
| `probe_pdf` | Check PDF structure | All PDFs |
| `extract_pdf_text` | Get text content | Text-based PDFs |  
| `rasterize_pdf_pages` | Convert to images | Scanned/complex PDFs |
| `text_analyze` | LLM text processing | Clean text extraction |
| `vision_analyze_images` | VLM image processing | Visual documents |
| `normalize_and_validate` | Data validation | All results |

## ⚙️ Configuration

### Environment Variables
```bash
TEXT_LLM_URL=http://127.0.0.1:8000
VISION_LLM_URL=http://127.0.0.1:8001  
MODEL_LABEL=local-gguf
MAX_PAGES_DEF=3
```

### Frontend Settings
- **Agent URL:** `http://127.0.0.1:7001`
- **Fallback to LM Studio:** Enabled (recommended)
- **Max Pages:** 3 (optimal for invoices)

## 🧪 Testing

### Test with Sample File
```bash
python test_agent.py path/to/invoice.pdf
```

### Manual API Test
```bash
curl -X POST "http://127.0.0.1:7001/agent/analyze-file" \
     -F "file=@invoice.pdf" \
     -F "max_pages=3"
```

## 🔧 Troubleshooting

### Common Issues

**Agent Server Not Reachable**
```bash
# Check if agent is running
curl http://127.0.0.1:7001/docs

# Restart agent stack
start_agent_stack.bat
```

**LLM Models Not Loading**
- Check model paths in `start_agent_stack.bat`
- Ensure adequate VRAM/RAM for models
- Verify llama-cpp-python installation

**PDF Processing Issues**
- pypdfium2 handles most PDF formats without external dependencies
- For corrupted PDFs, agent will fallback to text extraction
- No Poppler installation required (unlike pdf2image)

**Processing Failures**
- Check agent_server.py console output
- Verify PDF is not corrupted
- Try with smaller/simpler document

### Port Conflicts
If ports are occupied:
```bash
# Change ports in environment variables
set TEXT_LLM_URL=http://127.0.0.1:8002
set VISION_LLM_URL=http://127.0.0.1:8003
```

## 📊 Performance Optimization

### Memory Usage
- **TEXT Model:** ~4-6GB VRAM
- **VISION Model:** ~6-8GB VRAM  
- **Agent Server:** ~500MB RAM

### Processing Speed
- **Simple Text PDFs:** 5-15 seconds
- **Complex Scanned PDFs:** 30-60 seconds
- **Large Documents (5+ pages):** 60-120 seconds

### Best Practices
1. Use `max_pages=3` for invoices (covers 95% of cases)
2. Process one document at a time to avoid memory issues
3. Keep agent stack running for faster responses
4. Use fallback to LM Studio for reliability

## 🔐 Security Notes

- All processing happens locally - no data leaves your machine
- Agent server runs without authentication (localhost only)
- PDF content is temporarily stored in memory during processing
- No file caching or persistence on server side

## 📈 Future Enhancements

- [ ] Batch processing support
- [ ] Model auto-switching based on document complexity
- [ ] Performance metrics and monitoring
- [ ] Multi-language support beyond Croatian
- [ ] Integration with document management systems

## 🆘 Support

For issues or questions:
1. Check agent_server.py console logs
2. Verify all services are running (ports 7001, 8000, 8001)
3. Test with sample documents first
4. Check system resources (VRAM/RAM usage)

---

**Last Updated:** September 1, 2025  
**Version:** 1.0.0