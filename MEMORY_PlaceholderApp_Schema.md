# PlaceholderTab Application - Complete Architecture Schema

## 🏗️ Core Architecture Overview

### Main Components Hierarchy
```
PlaceholderTab.jsx (Main Orchestrator - 315 lines after refactoring)
├── Unit.jsx (Individual Units - 1285 lines, partially refactored)
│   ├── ContentRenderer.jsx (Content Type Router)
│   │   ├── EmptyView.jsx
│   │   ├── TextView.jsx
│   │   ├── PdfView.jsx
│   │   ├── ImageView.jsx
│   │   ├── TableView.jsx
│   │   └── ExcelUnitView.jsx (310 lines after major refactoring)
│   │       └── ExcelUnitView/ (Extracted components)
│   │           ├── hooks/
│   │           │   ├── useExcelExport.js
│   │           │   ├── usePDFExport.js
│   │           │   ├── useNormalization.js
│   │           │   └── useAIDescriptions.js
│   │           └── components/
│   │               ├── TableView.jsx
│   │               ├── StatsView.jsx
│   │               └── ExportControls.jsx
│   └── Unit Hooks/
│       ├── useUnitContent.js
│       ├── usePdf.js
│       ├── useReasoning.js
│       ├── useDnd.js
│       ├── useUnitConnection.js (extracted)
│       └── useSpeechRecognition.js (extracted)
├── PlaceholderTab Hooks/ (Extracted)
│   ├── useUnitStates.js
│   ├── useIconStates.js
│   └── useMultiInputChat.js
├── ReasoningOverlay.jsx
├── AgentOverlay.jsx
├── InlineAgentProcessor.jsx
└── SettingsModal.jsx
```

## 🎯 PlaceholderTab Core Responsibilities

### State Management Architecture
```javascript
// Core Unit States (via useUnitStates hook)
unitStates: {
  1: { type: 'empty|text|image|pdf|table|excel', content: File|String|null },
  2: { type: 'empty|text|image|pdf|table|excel', content: File|String|null },
  3: { type: 'empty|text|image|pdf|table|excel', content: File|String|null },
  4: { type: 'empty|text|image|pdf|table|excel', content: File|String|null }
}

// Multi-Phase Icon States (via useIconStates hook)
iconStates: {
  [unitId]: 'unprocessed|focused|processing|completed|error'
}
clickCounts: {
  [unitId]: number // Double-click detection
}
focusedUnitId: string|null

// Fusion Icon States (for connected units)
fusionIconStates: {
  [fusionId]: 'focused|processing|completed|error'
}
fusionClickCounts: {
  [fusionId]: number
}

// Multi-Input Chat (via useMultiInputChat hook)
multiInputChat: {
  input1: string,
  input2: string,
  input3: string,
  response: string,
  isSending: boolean,
  model: string,
  baseUrl: string
}
```

### Connection Management (useConnectionStore - Zustand)
```javascript
connectionGroups: {
  [groupId]: {
    units: [unitId1, unitId2, ...],
    color: '#hexcolor',
    timestamp: Date,
    type: 'manual|auto'
  }
}
unitToGroup: {
  [unitId]: groupId
}
```

## 🔧 Unit Component Architecture

### Unit Props Interface
```javascript
Unit({
  id: number,
  onContentChange: (unitId, type, content) => void,
  isInConnectedContainer: boolean = false,
  containerPosition: object|null = null,
  specializedMode: string|null = null
})
```

### Unit State Management
```javascript
// Core Unit State
unitType: 'empty|text|image|pdf|table|excel|file|xml|dwg'
content: File|String|null
fileUrl: string|null
imageAnnotations: { circles: [] }

// Connection State (via useUnitConnection hook)
isDraggingConnection: boolean
dragStartPosition: {x, y, unitX, unitY}|null
isConnectedUnit: boolean
connectedToUnit: unitId|null
connectionColor: string|null

// Content Processing
processingStatus: {
  upload: STATUS_TYPES.UPLOAD.*,
  processing: STATUS_TYPES.PROCESSING.*,
  connection: STATUS_TYPES.CONNECTION.*,
  hasProcessedContent: boolean
}

// Dynamic Glow System
unitGlowState: 'idle|activated|processing|thinking|completed|error'
dynamicButtonStates: object
activeOperation: string|null
```

## 📋 Content Type System

### ContentRenderer Routing
```javascript
ContentRenderer({
  unitType: string,
  views: {
    empty: { /* EmptyView props */ },
    text: { /* TextView props */ },
    pdf: { /* PdfView props */ },
    image: { /* ImageView props */ },
    table: { /* TableView props */ },
    excel: { /* ExcelUnitView props */ }
  }
})
```

### Content Type Detection (useUnitContent)
```javascript
detectInputType(input) {
  // File detection
  if (file.type?.startsWith?.('image/')) return 'image|svg'
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type?.includes?.('sheet') || .xlsx/.csv) return 'table'
  if (file.name?.endsWith?.('.xml')) return 'xml'
  if (file.name?.endsWith?.('.dwg|.dxf')) return 'dwg'
  if (file.type?.includes?.('text|word')) return 'textfile|document'

  // String detection
  if (input.includes('\t') || input.includes(',')) return 'table'
  if (input.includes('<') && input.includes('>')) return 'xml'
  return 'text'
}
```

## 🤖 AI Integration System

### Multi-Agent Architecture
```javascript
// Agent Types
1. HF Agent (Hugging Face) - multimodal analysis
2. Gemini API - Croatian document processing
3. OpenAI - Whisper + GPT-4o-mini
4. LM Studio - Local LLM inference
5. OpenWebUI - RAG document processing

// AI Processing Hooks
useAIDescriptions: {
  handleDescriptionClick,
  handleDescriptionAgentClick,
  getDescriptionSuggestions,
  handleSuggestionSelect
}

useNormalization: {
  onNormalize,
  handleNormalizedResponse,
  isNormalizing,
  normalizedData,
  updatedRows
}
```

### Agent Processing Pipeline
```javascript
// InlineAgentProcessor workflow
1. thinking -> 2. processing -> 3. completed|error

thoughtSequences: {
  analysis: ["Analiziram opis...", "Identificiram ključne pojmove", "Generiram poboljšanja..."],
  processing: ["Obrađujem AI odgovor", "Parsiram prijedloge", "Primjenjujem rezultat"]
}

// Chain of Thought (CoT) support
cotThoughts: string[] // Development mode reasoning steps
```

## 📊 Excel Processing System (Heavily Refactored)

### ExcelUnitView Architecture
```javascript
// Main Component (310 lines)
ExcelUnitView({
  content: File
})

// Extracted Hooks
useExcelExport: { handlePrint, handleExportExcel }
usePDFExport: { handleExportPDF }
useNormalization: { onNormalize, isNormalizing, normalizedData, updatedRows }
useAIDescriptions: { handleDescriptionClick, handleDescriptionAgentClick }

// Extracted Components
TableView: Complex table rendering with BoQ structure
StatsView: File statistics and metadata
ExportControls: Export buttons (Excel, PDF, Print, Download)
```

### Excel Data Flow
```javascript
// Parsing Pipeline
File -> excelParserService.parseExcelFile() -> parsedData: {
  fileName: string,
  fileSize: number,
  sheetNames: string[],
  defaultSheet: string,
  sheets: {
    [sheetName]: {
      rowCount: number,
      colCount: number,
      formattedData: {
        headers: [{name, type}],
        rows: [{cells: [{value}]}]
      }
    }
  }
}

// Normalization Pipeline
parsedData -> /api/normalize-excel -> normalizedData -> updatedRows -> UI highlighting
```

## 🔄 Event System Architecture

### Cross-Component Communication
```javascript
// Unit Events
'unit-processed' -> { unitId, unitType, content, hasProcessedContent }
'unit-reset' -> { unitId }
'unit-connected' -> { sourceUnitId, targetUnitId, connectionColor }
'unit-disconnected' -> { unitId }

// Reasoning Events
'reasoning-started' -> { unitId }
'reasoning-completed' -> { unitId, success }
'reasoning-error' -> { unitId }

// Excel Events
'excel-row-selected' -> { rowIndex, originalRowData, headers, sourceSheet }
'excel-row-updated' -> { rowIndex, updatedRowData, updatedValues }

// Agent Events
'agent-suggestion-selected' -> { suggestion, originalInput }

// Focus Events
'focus-unit' -> { unitId }
'unit-text-focus-request' -> { unitType }

// Connection Events
'unit-connection-drag-start' -> { sourceUnitId, sourceData }
'unit-connection-drag-end'
'units-create-connected-container' -> { sourceUnitId, targetUnitId, connectionColor, positions }

// Fusion Events
'fusion-processing-start' -> { fusionId }
'fusion-processing-complete' -> { fusionId, success }
'fusion-processing-error' -> { fusionId }
'fusion-reset' -> { fusionId }
```

## 🎨 UI/UX System

### Dynamic Icon Generation
```javascript
getDynamicUnitIcons() {
  // Individual unit icons (always present when content exists)
  // Fusion icons (for connected groups)
  // Multi-phase states: unprocessed -> focused -> processing -> completed/error
  // Double-click behavior: 1st click = focus, 2nd click = process
}

// Icon States
iconStates[unitId]: 'unprocessed|focused|processing|completed|error'
fusionIconStates[fusionId]: 'focused|processing|completed|error'
```

### Specialized Modes
```javascript
specializedModes: [
  {
    id: 'excel',
    icon: Table,
    label: 'Excel Uređivanje Ponuda BoQ',
    description: 'Bill of Quantities Excel Editor'
  }
  // Future modes: image, search, etc.
]
```

### Connection Visual System
```javascript
// Connection Colors (cycling palette)
CONNECTION_COLORS: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', ...]

// Connection UI States
isConnectedUnit: boolean
connectionColor: string // Shared between connected units
isDraggingConnection: boolean // Visual drag feedback
```

## 🔧 Hook Dependencies Map

### PlaceholderTab Hooks
```javascript
useUnitStates() -> { unitStates, handleContentChange, getUnitsActivityState, extractTextFromUnit }
useIconStates() -> { iconStates, clickCounts, updateIconState, fusionIconStates, ... }
useMultiInputChat(extractTextFromUnit, unitStates) -> { multiOpen, input1-3, sendCombinedMessage, ... }
```

### Unit Hooks
```javascript
useUnitConnection(id, unitType, content, fileUrl) -> { isDraggingConnection, isConnectedUnit, handleConnectionDragStart, ... }
useSpeechRecognition(setTextInputValue) -> { isListening, speechSupported, toggleListening }
useUnitContent(morphUnit) -> { textInputValue, detectInputType, handleFileChange, ... }
useDnd(morphUnit) -> { isDragOver, handleDrop, handleDragOver, ... }
usePdf() -> { pdfNumPages, pdfPageNumber, onDocumentLoadSuccess }
useReasoning() -> { reasoning states and handlers }
```

### Excel Hooks
```javascript
useExcelExport(parsedData, activeSheet, maxRows, updatedRows, normalizedData, setError)
usePDFExport(parsedData, activeSheet, maxRows, updatedRows, normalizedData, setError)
useNormalization(parsedData, activeSheet, setError)
useAIDescriptions() -> { handleDescriptionClick, handleDescriptionAgentClick, ... }
```

## 📁 File Structure Summary
```
src/components/tabs/
├── PlaceholderTab.jsx (315 lines - main orchestrator)
├── PlaceholderTab/hooks/ (extracted hooks)
├── Unit.jsx (1285 lines - needs further refactoring)
├── unit/
│   ├── hooks/ (unit-specific hooks)
│   ├── content/ (content renderers)
│   │   └── ExcelUnitView/ (heavily refactored Excel system)
│   └── image-editor/ (image editing components)
├── InlineAgentProcessor.jsx (AI processing component)
├── ReasoningOverlay.jsx
├── AgentOverlay.jsx
└── SettingsModal.jsx
```

## 🎯 Current Refactoring Status

✅ **Completed:**
- PlaceholderTab: 1503 → 315 lines (79% reduction)
- ExcelUnitView: 1499 → 310 lines (79% reduction)
- Extracted 8 custom hooks
- Extracted 6 UI components
- Modular architecture established

🔄 **Next Targets:**
- Unit.jsx (1285 lines) - needs further breakdown
- Extract more UI components from Unit
- Create specialized content processors
- Implement more AI agents integration

This schema represents the current state after major refactoring efforts, with significant improvements in code organization, maintainability, and modularity.