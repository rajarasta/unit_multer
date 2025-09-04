# Croatian Voice Document Processing System

## 🎤 Overview

This system provides a comprehensive Croatian voice interface for document processing using OpenAI's Realtime API and GPT-4o-mini. It features real-time voice recognition, document management, PDF text extraction, and animated process visualization.

## 🏗️ Architecture

### Core Components

#### 1. Backend Server (`voice-server.cjs`)
- **Port:** 3000
- **Framework:** Express.js with CommonJS modules
- **Features:**
  - OpenAI Realtime API integration
  - PDF text extraction using `pdf-parse`
  - Document registry with auto-discovery
  - Multi-format file upload support
  - Croatian document fuzzy matching

#### 2. Frontend Components
- **`VoiceHRV2.jsx`** - Main voice interface with animated process stages
- **`VoiceHR.jsx`** - Web Speech API voice recognition component
- **`useKnownDocsV2.js`** - Document management hook with IndexedDB sync

#### 3. Document Management
- **`DocumentRegistry.js`** - Auto-discovery from `src/backend/Računi/`
- **`useKnownDocsV2.js`** - Client-side IndexedDB + server synchronization
- **Supported formats:** PDF, DOC, DOCX, XLS, XLSX, TXT, JPG, JPEG, PNG

## 🎯 Key Features

### Voice Commands (Croatian)
- **"pošalji [document]"** - Send document for processing
- **"odaberi [document]"** - Select document without processing
- **"jasan zvuk"** - Confirm pending action
- **"otkaži"** - Cancel current action
- **"pomoć"** - Get help information

### Document Matching
- Fuzzy search without file extensions ("testni" matches "testni.pdf")
- Croatian-specific name variations
- Priority scoring system
- Word-by-word matching

### Animated Process Stages
Dynamic cards showing:
- 🔍 **Document Search** - Finding requested documents
- ⏳ **Awaiting Confirmation** - Waiting for "jasan zvuk"
- 🤖 **AI Processing** - OpenAI analysis with real-time updates
- ✅ **Completion** - Results with timing information

## 📁 File Structure

```
src/
├── components/tabs/
│   ├── VoiceHRV2.jsx           # Main voice interface component
│   └── voice/
│       └── VoiceHR.jsx         # Web Speech API wrapper
├── hooks/
│   └── useKnownDocsV2.js       # Document management hook
├── services/
│   └── DocumentRegistry.js     # Server-side document discovery
└── backend/Računi/             # Auto-scanned document folder

voice-server.cjs                # Express backend server
```

## 🛠️ Setup & Configuration

### Environment Variables
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Installation
```bash
npm install
```

### Running the System
```bash
# Start backend server
node voice-server.cjs

# Start frontend (separate terminal)
npm run dev
```

### Vite Proxy Configuration
```javascript
// vite.config.js
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000", // Voice server port
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

## 🔄 API Endpoints

### Document Management
- `GET /api/docs` - List all known documents
- `POST /api/docs` - Add new document
- `DELETE /api/docs/:id` - Remove document

### File Processing
- `POST /api/upload` - Upload file for processing
- `POST /api/agent/smart-document` - Process document with OpenAI

### Voice Integration
- `POST /api/agent/voice-token` - Get Realtime API session token
- `POST /api/agent/orchestrate` - AI orchestration endpoint

## 🎨 UI Components

### Process Stage Cards
```javascript
// Dynamic stage management
const [processStages, setProcessStages] = useState([]);

// Stage structure
{
  id: "stage-timestamp-random",
  name: "Pretraživanje dokumenta",
  description: "Tražim dokument: testni",
  icon: "🔍",
  status: "active" | "completed" | "failed",
  params: { query: "testni", useNewest: false },
  result: { documentName: "testni.pdf" },
  timestamp: Date,
  completedAt: Date
}
```

### Stage Management Functions
- `addStage(stage)` - Create new process stage
- `updateStage(id, updates)` - Update existing stage
- `completeStage(id, result)` - Mark stage as completed
- `failStage(id, error)` - Mark stage as failed
- `clearStages()` - Remove all stages

### Voice Settings
```javascript
const [voiceSettings, setVoiceSettings] = useState({
  autoConfirm: false,          // Skip confirmation for high-confidence commands
  confidenceThreshold: 0.7,    // Minimum confidence for command execution
  language: 'hr-HR',           // Croatian language setting
  enableTTS: true              // Text-to-speech responses
});
```

## 🔍 Document Processing Flow

### 1. Voice Command Recognition
```javascript
// Web Speech API with Croatian language
recognition.lang = 'hr-HR';
recognition.continuous = true;
recognition.interimResults = true;
```

### 2. Croatian NLU Processing
```javascript
// Intent extraction patterns
const INTENT_PATTERNS = {
  send: /pošalji|pošaljite|slanje|send/i,
  select: /odaberi|odaberite|izaberi|select/i,
  confirm: /jasan|jasno|potvrdi|confirm|da|yes/i,
  cancel: /otkaži|otkazano|cancel|ne|no/i
};
```

### 3. Document Matching
```javascript
function fuzzyFindDoc(query, docs) {
  // Remove file extensions for better matching
  const nameWithoutExt = name.replace(/\.[^.]+$/, '');
  const needleWithoutExt = needle.replace(/\s*(pdf|doc|docx|xlsx|txt)?\s*$/i, '');
  
  // Scoring system: exact match (10pts), starts with (5pts), contains words (4pts)
  // Croatian-specific patterns and number matching
}
```

### 4. OpenAI Processing
```javascript
// PDF text extraction
const pdf = require('pdf-parse');
const pdfData = await pdf(pdfBuffer);
const extractedText = pdfData.text;

// Structured extraction with GPT-4o-mini
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'Croatian document analysis prompt...' },
    { role: 'user', content: extractedText }
  ],
  response_format: { type: 'json_object' }
});
```

## 📊 Process Stage Visualization

### Stage Card Animation
```javascript
// Staggered entrance animation
<motion.div
  initial={{ opacity: 0, scale: 0.8, x: 20 }}
  animate={{ 
    opacity: 1, 
    scale: 1, 
    x: 0,
    transition: { delay: index * 0.1 }
  }}
  exit={{ opacity: 0, scale: 0.8, x: -20 }}
/>
```

### Status Indicators
- **Active:** Spinning loading icon with blue theme
- **Completed:** Green checkmark with success theme
- **Failed:** Red warning icon with error theme

### Information Display
- **Parameters:** All input parameters for the stage
- **Results:** Structured output data when completed
- **Timing:** Start time and duration for performance monitoring
- **Error Details:** Full error information for debugging

## 🔧 Development & Extension

### Adding New Voice Commands
```javascript
// 1. Add intent pattern
const INTENT_PATTERNS = {
  newCommand: /nova|naredba|pattern/i
};

// 2. Add handler function
const handleNewCommand = useCallback(async (entities, command) => {
  // Clear stages and add new process tracking
  clearStages();
  const stageId = addStage({
    name: 'Nova funkcija',
    description: 'Processing new command...',
    icon: '🆕',
    params: { ...entities }
  });
  
  // Implementation logic
  // Complete or fail stage based on result
}, [clearStages, addStage]);

// 3. Add to command router
switch (intent) {
  case 'newCommand':
    await handleNewCommand(entities, command);
    break;
}
```

### Extending Document Types
```javascript
// In DocumentRegistry.js
const SUPPORTED_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt',
  '.jpg', '.jpeg', '.png', '.csv', '.xml'  // Add new types
];

// Add processing logic in voice-server.cjs
async function processDocument(fileInfo) {
  switch (path.extname(fileInfo.filename).toLowerCase()) {
    case '.csv':
      // CSV processing logic
      break;
    case '.xml':
      // XML processing logic
      break;
  }
}
```

### Custom Stage Types
```javascript
// Add new stage configurations
const STAGE_CONFIGS = {
  validation: {
    icon: '✓',
    colors: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900' }
  },
  export: {
    icon: '📤',
    colors: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-900' }
  }
};
```

## 🚀 Deployment Considerations

### Performance Optimization
- IndexedDB for offline document caching
- Lazy loading of document content
- Debounced voice recognition
- Efficient stage management with minimal re-renders

### Error Handling
- Comprehensive error boundaries
- Graceful fallbacks for voice recognition failures
- Server connection retry logic
- User-friendly error messages in Croatian

### Security
- API key protection through environment variables
- Input validation for all voice commands
- File type restrictions for uploads
- Sanitized document content processing

## 📋 Known Issues & Solutions

### Common Problems

1. **Voice Server Crashes with Route Error**
   ```bash
   PathError [TypeError]: Missing parameter name at index 1: *
   ```
   **Solution:** Check for malformed Express routes with wildcard patterns

2. **Empty Document List**
   ```javascript
   // Ensure proper ref usage in callbacks
   const docsRef = useRef(docs);
   useEffect(() => { docsRef.current = docs; }, [docs]);
   ```

3. **PDF Extraction Returns Empty Content**
   ```javascript
   // Verify MIME type detection and pdf-parse integration
   const mimeType = await FileType.fromBuffer(pdfBuffer);
   if (mimeType?.mime === 'application/pdf') {
     const pdfData = await pdf(pdfBuffer);
   }
   ```

### Development Tips

- Always test with real PDF files containing Croatian text
- Use the browser's developer tools to monitor IndexedDB storage
- Check the voice server logs for OpenAI API responses
- Test voice commands with different Croatian accents and pronunciations

## 🔮 Future Extensions

### Planned Features
- Multi-language support (English, German)
- Advanced document comparison and analysis
- Voice-controlled data export (Excel, CSV)
- Real-time collaboration features
- Advanced AI model integration (GPT-4, Claude)

### Integration Possibilities
- ERP system connections
- Cloud storage providers (Google Drive, OneDrive)
- Email automation for document sharing
- Mobile app with voice interface
- Desktop application with system-wide voice commands

---

## 🤝 Contributing

This voice system serves as a foundation for future extensions. When extending:

1. **Maintain Croatian language support** - All user-facing text should have Croatian translations
2. **Follow the stage management pattern** - New processes should use the animated stage system
3. **Preserve document compatibility** - Ensure new features work with existing document types
4. **Test thoroughly** - Voice interfaces require extensive testing across different environments
5. **Document changes** - Update this README with any architectural changes

The system is designed to be modular and extensible while maintaining a consistent user experience focused on Croatian voice interaction and document processing efficiency.