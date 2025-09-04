# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
React 19 + Vite + Tailwind CSS aluminum fabrication management dashboard with modular tab-based architecture and comprehensive AI integrations.

**Commands:** `npm run dev` | `npm run build` | `npm run lint` | `npm run preview` | `npm run file-writer` | `npm run server`

## Architecture Overview

### Core Application Structure
- **Entry Point:** `src/main.jsx` → `src/App.jsx` (main router with lazy-loaded tabs)
- **Layout System:** `src/components/layout/MainLayout.jsx` (sidebar + content wrapper)
- **State Management:** `src/store/useProjectStore.js` (Zustand) + `src/store/useUserStore.js` (auth)
- **Tab Architecture:** All modules in `src/components/tabs/` with React.lazy() loading
- **Backend Services:** Two-tier system - `file-writer.cjs` (port 3001) + `server.js` (port 3002)

### Tech Stack
- **Frontend:** React 19, Vite 7.1.2, Tailwind CSS 3.4.14
- **State:** Zustand 5.0.8, Context providers for complex state
- **Animations:** Framer Motion 12.23.12 with AnimatePresence
- **AI Integration:** 
  - `@google/genai` 1.16.0 (primary - Gemini)
  - OpenAI SDK 5.19.1 (Whisper + GPT)
- **Document Processing:** PDF.js 5.4.54, Tesseract.js 6.0.1, fast-xml-parser 5.2.5
- **File Handling:** xlsx 0.18.5, multer 2.0.2, formidable 3.5.4

### Key Architecture Patterns

#### Tab-Based Modular System
```javascript
// All tabs lazy-loaded in App.jsx
const InvoiceProcessing = lazy(() => import('./components/tabs/InvoiceProcessing'));
// Router switch in renderContent() maps activeTab to components
// Each tab wrapped in TabErrorBoundary for isolation
```

#### Multi-Backend Architecture
1. **file-writer.cjs (port 3001):** File persistence + OpenAI integration
2. **server.js (port 3002):** Document registry + advanced AI routing
3. **Vite proxy:** `/api` routes to localhost:3001

#### AI Integration Layers
- **Google Gemini:** `src/services/CloudLLMService.js` (Croatian document processing)
- **OpenAI:** `server.js` + `file-writer.cjs` (Whisper + GPT-4o-mini)
- **LM Studio:** `src/services/aiIntegrationService.js` (local LLM with 20+ parameters)
- **OpenWebUI:** RAG system integration via `aiIntegrationService.js`

## Code Style & Critical Conventions

### TypeScript → JavaScript Migration (CRITICAL)
**This codebase is JavaScript-only.** TypeScript syntax in `.jsx` files causes build failures:

```javascript
// ❌ FATAL ERRORS - Remove immediately:
const [tasks, setTasks] = useState<Task[]>([]);
const position = mouseEvent.target as HTMLElement;
interface Task { id: string; name: string; }
} as const;

// ✅ CORRECT JavaScript:
const [tasks, setTasks] = useState([]);
const position = mouseEvent.target;
// Comment: Task = { id, name }
};
```

### Component Conventions
- **Functional components only** with hooks
- **PascalCase components:** `InvoiceProcessor2`
- **camelCase utilities:** `parseLogikalXml`
- **NO COMMENTS** unless explicitly requested
- **Lazy loading mandatory** for all tab components
- **Error boundaries:** TabErrorBoundary wraps each tab

### Event System Architecture
```javascript
// Cross-tab communication via window events
window.addEventListener('switchToTab', handleTabSwitch);
window.addEventListener('media-ai:switch-to-chat', handleMediaAISwitchToChat);
window.addEventListener('media-ai:post-to-chat', handlePostToChat);
```

## Development Workflow

### Command Usage
```bash
npm run dev              # Vite dev server (port 5186)
npm run build            # Production build
npm run lint             # ESLint check
npm run preview          # Preview production build

# Backend Services
npm run file-writer      # File persistence + OpenAI (port 3001)
npm run server          # Document registry + AI routing (port 3002)
npm run dev-full        # All services concurrently
```

### Error Detection Patterns
```bash
npm run dev
# Pattern A: "Missing semicolon" → Remove 'as const'
# Pattern B: "Unexpected token" → Remove interface/type
# Pattern C: "ReferenceError: Type is not defined" → Remove type annotations
```

### Large File Handling
```bash
# Strategic reading for 4000+ line files
Read file.jsx offset:1000 limit:200

# Pattern searching
Grep "useState<" --type js glob:"**/*.jsx"
Grep "as const" --type js glob:"**/PlannerGantt/*.jsx"

# Always run build after changes
npm run dev # Must succeed before proceeding
```

## Critical Bug Patterns & Solutions

### localStorage Quota Management
**Problem:** QuotaExceededError when storing large AGBIM data
**Solution:** Lightweight caching with size monitoring
```javascript
// AgbimDataService.js pattern
const lightData = {
  version: data.version,
  projectCount: data.projects?.length || 0,
  recentChats: data.projects?.map(p => ({
    recentMessages: (p.chat || []).slice(-10) // Only last 10
  }))
};
```

### Hover System Implementation
**Multi-level hover with precise UX control:**
```javascript
const [hoveredTask, setHoveredTask] = useState(null);
const [hoverLevel, setHoverLevel] = useState(0); // 0=none, 1=small, 2=large
const hoverLeaveTimerRef = useRef(null);

// 200ms delay = psychologically optimal
hoverLeaveTimerRef.current = setTimeout(() => {
  setHoveredTask(null);
}, 200);
```

### useEffect Anti-Patterns
```javascript
// ❌ DANGEROUS - Infinite loops:
useEffect(() => {
  setHoverLevel(hoverLevel + 1); // Triggers self!
}, [hoverLevel]);

// ✅ CORRECT:
useEffect(() => {
  if (condition && hoverLevel < 2) {
    setHoverLevel(2);
  }
}, [condition]); // Don't depend on state you're updating
```

### Framer Motion Patterns
```javascript
// Standard horizontal expansion
<motion.div
  initial={{ opacity: 0, width: 0 }}
  animate={{ opacity: 1, width: 320 }}
  exit={{ opacity: 0, width: 0 }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
>

// CRITICAL: Unique keys for AnimatePresence
<AnimatePresence>
  {items.map(item => (
    <motion.div key={item.id} {...animations}>
      {item.content}
    </motion.div>
  ))}
</AnimatePresence>
```

## AI Integration Architecture

### Google Gemini (Primary)
```javascript
// NEW SDK: @google/genai v1.16.0
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: apiKey }); // Object initialization

// Schema format changed
// OLD: Type.STRING (enum) → NEW: "STRING" (string)
const schema = { type: "STRING" };
```

**Setup Requirements:**
1. `npm install @google/genai@^1.16.0`
2. Add `VITE_GOOGLE_AI_API_KEY` to `.env`
3. Remove old `@google/generative-ai` imports
4. Update all schemas: `Type.STRING` → `"STRING"`

**Croatian Document Processing:**
- Service: `src/services/CloudLLMService.js`
- Optimized for HR accounting documents
- 3-stage JSON parsing with fallback recovery
- Multi-modal support: PDF, JPEG, PNG with base64 processing

### OpenAI Integration (Secondary)
**Dual Server Architecture:**
- `file-writer.cjs`: Draft/Confirm workflow with Whisper transcription
- `server.js`: Advanced document registry + smart routing

**Key Endpoints:**
```javascript
POST /api/llm/draft      # Initial voice command processing
POST /api/llm/confirm    # Finalization with execution plan
POST /api/transcribe     # Whisper audio → text
POST /api/agent/smart-document  # Two-stage doc processing
```

### Document Registry System
**Auto-discovery from `src/backend/Računi/`:**
```javascript
const documentRegistry = new DocumentRegistry();
// Scans: pdf, jpg, jpeg, png, doc, docx, xls, xlsx, txt
// Generates search terms + metadata
// LLM-powered document matching
```

### Legacy AI Systems
- **OpenWebUI** (localhost:8080): RAG document processing
- **LM Studio** (10.39.35.136:1234): Local LLM with manual model selection
- **Service:** `src/services/aiIntegrationService.js`
- **4 Modes:** Vision, Spatial, OpenWebUI, Direct LLM

## Major Application Modules

### Invoice Processing System
**Three implementations:** InvoiceProcessing, InvoiceProcessor2, InvoiceProcessorV2Simple
- **Google Gemini AI:** Croatian prompt optimization
- **Two-view system:** Upload → Analysis transition
- **Multi-format export:** Excel, JSON, CSV
- **Inline editing:** EditableField components
- **Debug panels:** JSON viewer with toggles

### Floor Management (`/floorplan`)
- **Drag & Drop:** Interactive position placement
- **Multi-floor support:** Razina management
- **Installation tracking:** spremno → završeno states
- **Real-time updates:** Cross-component synchronization

### Gantt Planning (`/gantt`, `/employogram`)
- **PlannerGantt + PlannerGanttV2:** Dual implementations
- **3-level hierarchy:** Position → Piece → Subprocess
- **Interactive charts:** Drag & drop scheduling
- **Resource management:** Assignee tracking

### Chat & Communication (`/chat`)
- **AGBIM integration:** Field simulator messages
- **Layout:** Text left, attachments right
- **Goriona urgency system:** 8-level Croatian idiom scale
- **Real-time sync:** Cross-tab event communication

### User Management (`/users`)
- **Role-based access:** Admin, Manager, Worker
- **Authentication:** useUserStore with localStorage persistence
- **Profile settings:** Modal-based user preferences

## File Organization
```
src/
├── App.jsx                    # Main router with lazy loading
├── components/
│   ├── layout/
│   │   ├── MainLayout.jsx     # Sidebar + content wrapper
│   │   └── Sidebar.jsx        # Navigation component
│   ├── tabs/                  # All application modules
│   │   ├── InvoiceProcessing/ # Google AI document processing
│   │   ├── FloorManagement/   # Interactive floor plans
│   │   ├── PlannerGantt/      # Gantt chart implementations
│   │   ├── Chat/              # AGBIM communication hub
│   │   ├── LLMServerManager/  # AI server management
│   │   └── ...                # Other specialized modules
│   ├── auth/                  # Authentication components
│   ├── ErrorBoundary.jsx      # Global error handling
│   └── TabErrorBoundary.jsx   # Tab-specific error isolation
├── services/
│   ├── CloudLLMService.js     # Google Gemini integration
│   ├── ProjectDataService.js  # Project CRUD operations
│   ├── AgbimDataService.js    # AGBIM field data + localStorage management
│   ├── aiIntegrationService.js # Multi-AI system integration
│   └── ...
├── store/
│   ├── useProjectStore.js     # Main Zustand store
│   └── useUserStore.js        # Authentication store
├── constants/
│   └── navigation.js          # Sidebar navigation configuration
└── utils/
    ├── parseLogikalXml.js     # XML parsing utilities
    └── agentHelpers.js        # AI helper functions
```

## Development Environment Setup

### Prerequisites
- **Node.js** ≥ 18.0.0 (React 19 requirement)
- **npm** or **yarn**
- **Environment variables:**
```env
VITE_GOOGLE_AI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
VITE_LM_STUDIO_URL=http://10.39.35.136:1234
VITE_OPENWEBUI_URL=http://localhost:8080
```

### Common Issues & Solutions

#### Server Crashes
1. Check Node.js version ≥18
2. `rm -rf node_modules .vite package-lock.json && npm install`
3. Kill processes: `taskkill /f /im node.exe` (Windows)
4. Port conflicts: `npm run dev --port 3001`

#### HMR Issues
1. Check file path casing (Windows sensitivity)
2. Verify export/import syntax consistency
3. Restart dev server if state corrupted
4. Check for circular dependencies in imports

#### Memory Management
```javascript
// Cleanup patterns
useEffect(() => {
  return () => clearHoverTimer(); // Always cleanup timers
}, [clearHoverTimer]);

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  console.warn('Performance issue:', data);
}
```

## Context Window Management
1. Use `Read file.jsx offset:X limit:Y` for files >4000 lines
2. `Grep` for patterns instead of full file reads
3. `MultiEdit` for bulk operations
4. Line-targeted editing with IDE line numbers

## Emergency Recovery
**Code Corruption:**
1. `git revert` to last working commit
2. Apply changes incrementally
3. Use IDE local history
4. Keep `npm run dev` running for early error detection

**Always verify builds succeed before committing changes.**

This guide prioritizes fixing build failures, implementing stable systems, and maintaining clean, performant code with comprehensive AI integration capabilities.