# Tool Calling & Orchestrator System

Deterministic tool orchestration system for aluminum fabrication management with OpenAI-compatible interface.

## Quick Start

### Browser Testing
```javascript
// Import in your React component or browser console
import { runAllTests } from './test/example.js';
await runAllTests();
```

### Node.js Usage  
```javascript
import { processUserMessage } from './chat/run-chat.js';

const result = await processUserMessage(
  "Izvuci tablicu iz Excel filea i analiziraj DWG komponente",
  {
    model: "gpt-3.5-turbo",
    client: {
      baseURL: "http://localhost:8000/v1", // Your LLM endpoint
      apiKey: "unused"
    }
  }
);
```

## Architecture

### Core Components

1. **ExecutionEnvelope** (`shared/types.js`): Typed payload from UI
2. **Tool Registry** (`tools/index.js`): Central catalog with JSON schemas
3. **Chat Orchestrator** (`chat/run-chat.js`): OpenAI-compatible execution
4. **HTTP Interface** (`server/http.js`): REST API for UI integration

### Available Tools

- **ocr_pdf**: Extract text from PDF documents using OCR
- **extract_table**: Extract tables from Excel files as JSON
- **vlm_describe**: Generate image descriptions using Vision Language Models
- **dwg_parser**: Parse DWG files and extract component metadata
- **summarize_docs**: Summarize multiple documents into reports

### Deterministic Planning

Signature-based routing for common workflows:

```javascript
signature(["table", "dwg"], "compare") // → "dwg+table|compare"
```

Plan table maps signatures to tool execution steps:
- `document|extract` → OCR processing
- `table|extract` → Excel extraction  
- `table+dwg|compare` → Extract both + LLM comparison

## Integration with Existing App

### Add to your existing server (file-writer.cjs or server.js):

```javascript
import { setupOrchestratorRoutes } from './src/orchestrator/server/http.js';

// Add to your Express app
setupOrchestratorRoutes(app);
```

### Frontend integration:

```javascript
// In your React components
const response = await fetch('/api/orchestrator/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "Analiziraj ovaj Excel file" }
    ],
    options: {
      model: "gpt-3.5-turbo",
      maxTokens: 512
    }
  })
});

const result = await response.json();
```

## Configuration

### Environment Variables
```bash
ORCHESTRATOR_BASE_URL=http://localhost:8000/v1  # Your LLM endpoint
ORCHESTRATOR_API_KEY=unused                     # API key if needed
```

### Supported LLM Endpoints
- OpenAI API
- Local LM Studio (localhost:1234)
- OpenWebUI (localhost:8080/v1)
- vLLM servers
- llama.cpp servers

## API Endpoints

- `POST /api/orchestrator/chat` - Main chat interface
- `POST /api/orchestrator/plan` - Deterministic planning
- `GET /api/orchestrator/tools` - List available tools
- `GET /api/orchestrator/status` - Health check

## Event Tracing

All tool executions emit trace events:

```javascript
{
  "v": "trace/1",
  "run_id": "req_123",
  "event": "step.finished", 
  "step": {
    "id": "step_ocr",
    "kind": "call_tool",
    "status": "ok",
    "duration_ms": 2100
  },
  "preview": {
    "slot": "$doc_text",
    "text": "Extracted text preview..."
  }
}
```

## Development

### Project Structure
```
src/orchestrator/
├── shared/types.js         # Core types and validation
├── util/ajv.js            # Validation utilities
├── tools/
│   ├── index.js           # Tool registry
│   ├── ocr_pdf.js         # OCR tool implementation
│   ├── extract_table.js   # Excel extraction
│   ├── vlm_describe.js    # Image analysis
│   ├── dwg_parser.js      # DWG parsing
│   └── summarize_docs.js  # Document summarization
├── chat/run-chat.js       # Main orchestrator
├── server/http.js         # HTTP interface
└── test/example.js        # Test utilities
```

### Adding New Tools

1. Create tool file in `tools/` directory
2. Implement schema, validate, and execute functions
3. Register in `tools/index.js`
4. Add to plan table in `server/http.js`

Example:
```javascript
export const my_tool = {
  name: "my_tool",
  description: "Description of what this tool does",
  schema: { /* JSON schema */ },
  validate: (args) => { /* validation logic */ },
  execute: async (args, ctx) => { /* implementation */ }
};
```

## Production Readiness

### Security
- Whitelist file paths in tool implementations
- Validate all inputs with AJV schemas
- Implement timeouts and circuit breakers
- Add access control for sensitive operations

### Observability  
- All tool calls logged with run_id
- Event tracing for debugging
- Performance metrics collection
- Error handling and recovery

### Scaling
- Tool execution in separate workers/containers
- Caching for idempotent operations
- Rate limiting per user/endpoint
- Result storage for large outputs

## Future Enhancements

1. **Narrator Agent**: Real-time progress updates with typewriter effect
2. **SSE Streaming**: Live event streaming to UI
3. **Workflow Engine**: Replace deterministic planning with learned models
4. **Cross-validation**: Multiple tool agreement scoring
5. **Advanced Caching**: Content-based deduplication