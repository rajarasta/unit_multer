# 🖥️ LLM Server Manager - Complete Live Management System

Advanced LLM server management with live process launching, prompt control, and real-time logging for the Aluminum Store UI.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Runner API     │    │  LLM Processes  │
│  LLM Manager    │◄──►│  Express :3002  │◄──►│  llama_cpp.server│
│  Tab UI         │    │  SSE Streaming  │    │  .bat scripts   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start Guide

### 1. Start Runner API
```bash
# Method 1: Use provided script
start_runner.bat

# Method 2: Manual start
npm install express cors
node runner.js
```
Runner API će biti dostupan na `http://127.0.0.1:3002`

### 2. Open LLM Server Manager Tab
- U React aplikaciji, idite na "LLM Server Manager" tab
- Launcher panel će biti vidljiv na vrhu stranice

### 3. Launch LLM Server
1. **Configure Model Path**: Unesite putanju do vašeg GGUF modela
2. **Set Parameters**: Konfigurišite port, context, GPU layers
3. **Click Launch**: Server će se pokrenuti preko Runner API-ja
4. **Watch Live Logs**: Real-time output u log konzoli
5. **Auto-Connect**: Server se automatski dodaje u listu servera

## 📋 Feature Overview

### 🎛️ Launcher Panel
**Purpose**: Direct llama_cpp.server kontrola sa varijabilnim parametrima

**Key Features**:
- **Model Path**: Browse/unesi putanju do GGUF modela
- **Vision Mode**: Automatski dodaj `--mmproj` za multimodal models
- **GPU Configuration**: `n_gpu_layers`, `threads`, context size
- **Network Settings**: Host, port konfiguracija
- **Extra Arguments**: Custom llama_cpp parameters
- **One-liner Preview**: Vidi exact command koji će se pokrenuti
- **Launch/Stop Controls**: Real-time process management

**Example Configuration**:
```
Model Path: E:\models\Qwen2.5-7B-Instruct-Q4_K_M.gguf
Host: 0.0.0.0
Port: 8000
Context: 4096
n_gpu_layers: -1 (use all GPU)
Vision Mode: ☐ (unchecked for text models)
Extra Args: --parallel 4 --batch-size 256
```

### 💬 Prompts & Presets Panel
**Purpose**: System prompt management i template definisanje

**Components**:
- **System Prompt**: Osnovni system prompt za model
- **Developer Prompt**: Dodatne developer instrukcije
- **User Template**: Template za korisničke zahtjeve
- **Preset Management**: Spremi/učitaj prompt konfiguracije
- **Session Integration**: Direktno primijeni na aktivnu sesiju

**Default System Prompt**:
```
You are a helpful assistant specialized in aluminum construction and engineering.
```

### 🔧 .BAT & Live Log Panel
**Purpose**: Batch file execution i real-time log monitoring

**Features**:
- **BAT Path Input**: Putanja do .bat fajla (default: start_agent_stack.bat)
- **Run BAT Button**: Pokreni .bat fajl kroz Runner API
- **Live Log Console**: Real-time SSE stream output
- **Log Management**: Clear logs, scroll history
- **Multi-source Logging**: LLM processes, .bat scripts, system messages

### 📊 Enhanced Server Management
**Integration with existing session system**:
- **Auto Server Addition**: Launched servers automatski dodani u listu
- **Real-time Status**: Live connection status monitoring
- **Session Creation**: One-click session kreiranje za launched servere
- **Ping Testing**: Connection validation
- **Parameter Sync**: Model parameters sync sa launcher settings

## 🔌 Runner API Reference

### Core Endpoints

#### Launch Process
```http
POST /api/runner/launch
Content-Type: application/json

{
  "id": "llama_8000",
  "cmd": "python",
  "args": ["-m", "llama_cpp.server", "--model", "path/to/model.gguf", ...],
  "cwd": "/optional/working/directory",
  "shell": false
}

Response: { "ok": true, "pid": 12345 }
```

#### Stop Process
```http
POST /api/runner/stop/llama_8000

Response: { "ok": true }
```

#### Start BAT File
```http
POST /api/runner/start-bat
Content-Type: application/json

{
  "id": "agent_stack",
  "path": "E:\\UI REFACTOR\\start_agent_stack.bat",
  "args": [],
  "cwd": null
}

Response: { "ok": true, "pid": 12346 }
```

#### Live Log Stream (SSE)
```http
GET /api/runner/stream/llama_8000

Response: text/event-stream
data: {"line": "[10:30:15] Model loaded successfully"}
data: {"line": "[10:30:16] Server listening on port 8000"}
```

#### Health Check
```http
GET /api/runner/health

Response: { 
  "ok": true, 
  "timestamp": "2025-09-01T10:30:00Z",
  "runningProcesses": 2 
}
```

## 🎯 Usage Workflows

### Workflow 1: Launch Text Model
1. **Configure Launcher**:
   - Model Path: `E:\models\text-model.gguf`
   - Port: `8000`
   - Vision Mode: OFF
   
2. **Launch**: Click "Launch" button
3. **Monitor**: Watch live logs za model loading
4. **Connect**: Server automatski dodan, click "Connect"
5. **Create Session**: Generate session za ovaj endpoint
6. **Test**: Send test message through session

### Workflow 2: Launch Vision Model
1. **Configure for Vision**:
   - Model Path: `E:\models\llava-model.gguf`
   - mmproj Path: `E:\models\mmproj.gguf`
   - Vision Mode: ON
   - Port: `8001`
   
2. **Launch**: Vision-specific parameters automatically added
3. **Verify**: Check logs za multimodal initialization
4. **Test**: Use image analysis features

### Workflow 3: Multi-Model Agent Stack
1. **Launch Text Model** (port 8000)
2. **Launch Vision Model** (port 8001)
3. **Run Agent BAT**: 
   - Set BAT Path: `start_agent_stack.bat`
   - Click "Run .bat"
   - Monitor agent initialization logs
4. **Use Agent**: PDF agent automatically chooses text/vision models

### Workflow 4: Custom Prompt Templates
1. **Create System Prompt**:
   ```
   You are an expert in aluminum construction. Always respond with:
   1. Safety considerations
   2. Material specifications  
   3. Cost estimates
   4. Installation steps
   ```

2. **Save Preset**: Click "Spremi" to localStorage
3. **Apply to Session**: Click "Primijeni na sesiju"
4. **Test**: Send construction query and verify format

## 🛠️ Advanced Configuration

### llama_cpp.server Parameter Guide

| Parameter | Purpose | Example | Notes |
|-----------|---------|---------|--------|
| `--model` | Model file path | `model.gguf` | Required |
| `--host` | Bind address | `0.0.0.0` | Use `0.0.0.0` for network access |
| `--port` | Server port | `8000` | Ensure no conflicts |
| `--n_ctx` | Context window | `4096` | Higher = more memory |
| `--n_gpu_layers` | GPU offload | `-1` | `-1` = use all GPU |
| `--threads` | CPU threads | `8` | `0` = auto-detect |
| `--mmproj` | Vision projector | `mmproj.gguf` | Required for vision models |
| `--parallel` | Parallel requests | `4` | Higher = more concurrent users |
| `--batch-size` | Processing batch | `256` | Optimize for your hardware |

### Memory & Performance Tuning

**High-End System (32GB+ RAM, RTX 4090)**:
```
Context: 8192
n_gpu_layers: -1
threads: 0
Extra Args: --parallel 8 --batch-size 512 --numa
```

**Mid-Range System (16GB RAM, RTX 3080)**:
```
Context: 4096  
n_gpu_layers: 35
threads: 8
Extra Args: --parallel 4 --batch-size 256
```

**Low-End System (8GB RAM, GTX 1660)**:
```
Context: 2048
n_gpu_layers: 20
threads: 6  
Extra Args: --parallel 2 --batch-size 128
```

### Custom Prompt Templates

**JSON Response Template**:
```
Always respond in valid JSON format:
{
  "analysis": "your analysis here",
  "recommendations": ["rec1", "rec2"],
  "confidence": 0.95
}
```

**Aluminum Expert Template**:
```
You are AluminumGPT, specialized in:
- Aluminum alloy properties (6061, 6063, 7075)
- Fabrication techniques (welding, cutting, forming)
- Structural calculations and load analysis
- Building codes and safety standards
```

## 🔍 Troubleshooting

### Runner API Issues

**API Not Responding**:
```bash
# Check if Runner API is running
curl http://127.0.0.1:3002/api/runner/health

# If not running, start it
start_runner.bat
```

**Port Conflicts**:
```bash
# Check what's using port 3002
netstat -ano | findstr :3002

# Kill conflicting process
taskkill /PID [PID_NUMBER] /F
```

**SSE Connection Issues**:
- Check browser console za connection errors
- Verify CORS settings u Runner API
- Try refreshing the page

### Model Launch Issues

**Model Not Found**:
- Verify model path exists and is readable
- Check file permissions
- Ensure path doesn't contain spaces (use quotes)

**GPU Memory Errors**:
```
CUDA out of memory
```
- Reduce `n_gpu_layers`
- Lower `n_ctx` (context size)
- Close other GPU applications

**Permission Denied**:
```
Error: spawn EACCES
```
- Run as Administrator if needed
- Check antivirus software blocking
- Verify Python is in PATH

### Session Integration Issues

**Server Not Auto-Added**:
- Check if launch completed successfully
- Verify endpoint URL formation
- Manual add server with correct endpoint

**Connection Test Failing**:
- Wait for model to fully load (check logs)
- Verify port accessibility
- Check firewall settings

## 📈 Performance Monitoring

### Key Metrics to Monitor

**Runner API Metrics**:
- Active processes count
- Memory usage per process
- SSE connection count
- Log throughput

**Model Performance**:
- Tokens per second
- Memory utilization
- GPU utilization
- Request queue depth

**Session Health**:
- Response latency
- Error rate
- Concurrent sessions
- Token consumption

### Log Analysis

**Success Indicators**:
```
[10:30:15] Model loaded successfully
[10:30:16] Server listening on port 8000
[10:30:17] Ready to accept connections
```

**Warning Signs**:
```
[10:30:20] WARNING: GPU memory usage high (90%)
[10:30:25] WARNING: Request queue depth: 10
[10:30:30] WARNING: Slow tokenization detected
```

**Error Patterns**:
```
[10:30:35] ERROR: CUDA out of memory
[10:30:40] ERROR: Model file corrupted
[10:30:45] ERROR: Network connection failed
```

## 🚀 Advanced Use Cases

### Multi-Tenant Development
- Launch models on different ports per developer
- Use unique session IDs for isolation
- Monitor resource usage per tenant

### A/B Model Testing
- Launch different models simultaneously
- Compare response quality
- Switch between models for testing

### Production Deployment
- Use systemd services instead of .bat files
- Implement proper logging rotation
- Add health check monitoring
- Configure load balancing

### Custom Model Pipelines
- Chain multiple model calls
- Implement fallback strategies
- Add caching layers
- Monitor performance metrics

## 📚 Integration Points

### With Invoice Processing
- Select launched model for document analysis
- Use custom prompts for structured extraction
- Monitor processing times and accuracy

### With Project Management
- Specialized prompts for aluminum construction
- Model selection based on task complexity
- Integration with project workflows

### With External APIs
- Proxy through launched models
- Custom authentication handling
- Response transformation and validation

---

## 🎯 Summary

The enhanced LLM Server Manager provides:

✅ **Complete Process Control** - Launch, stop, monitor LLM servers
✅ **Real-time Logging** - Live SSE streams with process output  
✅ **Flexible Configuration** - All llama_cpp.server parameters
✅ **Prompt Management** - System prompts, templates, presets
✅ **Session Integration** - Seamless connection to existing session system
✅ **BAT File Execution** - Run complex startup scripts from UI
✅ **Performance Monitoring** - Resource usage and health checks

This creates a production-ready LLM management environment perfect for development, testing, and deployment of local language models in the Aluminum Store application.

**Last Updated**: September 1, 2025  
**Version**: 2.0.0