# Croatian Voice Document Processing System

## Overview

Complete end-to-end Croatian voice processing system with OpenAI integration:
- **Voice Input**: Croatian speech recognition (Web Speech API + OpenAI Realtime API)
- **Document Management**: IndexedDB + server sync for known documents
- **Smart Processing**: OpenAI GPT-4o with Structured Outputs for document analysis
- **Voice Confirmation**: Croatian confirmation flows ("jasan zvuk")

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure OpenAI API Key
Create `.env.local` file:
```env
OPENAI_API_KEY=sk-your-api-key-here
VITE_OPENAI_API_KEY=sk-your-api-key-here
```

### 3. Start Development Servers
```bash
# Start both voice server and Vite dev server
npm run dev-voice

# Or start separately
npm run voice-server  # Voice backend (port 3000)
npm run dev          # Frontend (port 5186)
```

### 4. Access Application
- Frontend: http://localhost:5186
- Voice Backend: http://localhost:3000
- Navigate to **Voice HR V2** tab in the application

## Architecture

### Frontend Components

#### `VoiceHR` - Croatian Voice Interface
- Dual-mode support: Web Speech API / OpenAI Realtime API
- Croatian language optimized (`hr-HR`)
- Audio level visualization
- Voice activity detection

#### `VoiceHRV2` - Main Application Interface
- Known documents management
- Voice command processing
- Confirmation workflows
- Real-time status tracking
- Processing results display

#### `useKnownDocsV2` - Document Management Hook
- IndexedDB local storage
- Server synchronization
- File System Access API integration
- Document search and filtering

### Backend Services

#### Voice Server (`voice-server.js`)
Complete backend supporting:

**API Endpoints:**
- `GET /api/docs` - List known documents
- `POST /api/docs` - Add new document
- `DELETE /api/docs/:id` - Remove document
- `POST /api/upload` - File upload
- `POST /api/agent/voice-token` - OpenAI Realtime session token
- `POST /api/agent/smart-document` - Document processing
- `POST /api/agent/orchestrate` - AI command orchestration

**Features:**
- OpenAI Responses API integration
- Custom tool functions (list_known_docs, send_document, request_file_picker)
- File parsing (PDF/XLSX mock implementation)
- Croatian language processing

## Croatian Voice Commands

### Basic Commands

| Command | Description | Examples |
|---------|-------------|----------|
| **Slanje** | Send document for processing | "pošalji ponudu 001", "obradi testnik.pdf" |
| **Odabir** | Select document for preview | "odaberi račun 123", "nađi specifikaciju" |
| **Potvrda** | Confirm action | "jasan zvuk", "potvrdi", "da" |
| **Otkazivanje** | Cancel action | "poništi", "stop", "ne" |
| **Pomoć** | Show help | "pomoć", "što mogu" |

### Advanced Patterns

- **Newest document**: "pošalji najnoviji dokument"
- **Pattern matching**: "odaberi ponuda 001" (finds "Ponuda_001.pdf")
- **Number extraction**: Automatically extracts document numbers

### Voice Settings

Configurable options:
- **Auto-confirm**: Skip confirmation for high-confidence commands
- **Confidence threshold**: Minimum recognition confidence (50-100%)
- **TTS enabled**: Enable voice responses
- **Language**: Croatian (hr-HR)

## Document Processing Flow

1. **Voice Command** → Croatian NLU processes intent and entities
2. **Document Selection** → Fuzzy matching finds target document
3. **Confirmation** → "jasan zvuk" confirms action (unless auto-confirm enabled)
4. **Processing** → OpenAI GPT-4o extracts structured data
5. **Results** → Display extracted information + voice response

## OpenAI Integration

### Models Used

- **Realtime API**: `gpt-realtime-preview` for low-latency voice
- **Document Processing**: `gpt-4o` or `gpt-4o-mini` for extraction
- **Orchestration**: `gpt-4o-mini` for command processing

### Structured Outputs Schema

Example for invoice/offer extraction:
```json
{
  "doc_name": "string",
  "total_amount": "string",
  "currency": "string",
  "positions": [{
    "item": "string",
    "qty": "number",
    "unit": "string", 
    "price": "string",
    "line_total": "string"
  }]
}
```

## Development Guide

### Adding New Voice Commands

1. Update `CROATIAN_VOICE_COMMANDS` in `VoiceHR.jsx`:
```javascript
const CROATIAN_VOICE_COMMANDS = {
  newIntent: ['nova naredba', 'alternativa'],
  // ...
};
```

2. Add handler in `VoiceHRV2.jsx`:
```javascript
const handleNewCommand = useCallback(async (entities, command) => {
  // Implementation
}, []);
```

3. Update command router:
```javascript
case 'newIntent':
  await handleNewCommand(entities, command);
  break;
```

### Adding Document Processing

1. Extend `processUploadedFile` in `voice-server.js`
2. Add new parsing logic for file types
3. Update structured output schema if needed
4. Test with sample documents

### Voice Server Extension

Add new API endpoints:
```javascript
app.post('/api/custom-endpoint', async (req, res) => {
  // Implementation
  res.json(result);
});
```

## Troubleshooting

### Common Issues

1. **OpenAI API Not Working**
   - Check API key in `.env.local`
   - Verify sufficient credits
   - Check model availability

2. **Voice Recognition Fails**
   - Ensure microphone permissions
   - Check browser support (Chrome/Edge recommended)
   - Try switching to Web Speech API mode

3. **File Picker Not Working**
   - Requires HTTPS in production
   - Check File System Access API support
   - Try manual upload alternative

4. **IndexedDB Issues**
   - Clear browser data
   - Check browser storage permissions
   - Verify IndexedDB support

### Debug Mode

Enable debug logging by checking browser console:
- Voice commands and confidence levels
- Document matching results
- API request/response details
- Processing status updates

## Production Deployment

### Required Environment Variables
```env
OPENAI_API_KEY=sk-your-key
PORT=3000
NODE_ENV=production
```

### Build Process
```bash
npm run build
npm run voice-server
```

### Security Considerations
- Never expose OpenAI API key in frontend
- Implement rate limiting for API endpoints
- Add authentication for production use
- Use HTTPS for file picker functionality

## API Reference

### Voice Token Endpoint
```
POST /api/agent/voice-token
Content-Type: application/json

Response: {
  "client_secret": { "value": "ek_..." },
  "model": "gpt-realtime-preview",
  // ... session details
}
```

### Smart Document Processing
```
POST /api/agent/smart-document
Content-Type: multipart/form-data OR application/json

Body (multipart):
- file: Document file
- query: Processing query (optional)

Body (JSON):
{
  "docId": "document-uuid",
  "url": "https://...",
  "uploadId": "upload-uuid", 
  "query": "ukupna cijena i pozicije"
}

Response: {
  "success": true,
  "docName": "filename.pdf",
  "answer": {
    "total_amount": "12.540,00",
    "currency": "EUR",
    "positions": [...],
    // ... structured data
  }
}
```

## Cost Considerations

### OpenAI Pricing (as of 2024)
- **Realtime API**: ~$6-24/hour of audio (varies by model)
- **GPT-4o**: $0.0025/1k input tokens, $0.01/1k output tokens
- **GPT-4o-mini**: $0.00015/1k input tokens, $0.0006/1k output tokens

### Optimization Tips
- Use GPT-4o-mini for simple extraction tasks
- Cache processing results when possible
- Implement confidence-based model selection
- Use structured outputs to reduce token usage

## License

[Your License Here]