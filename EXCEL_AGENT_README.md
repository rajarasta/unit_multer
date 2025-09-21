# Excel AI Agent - Agentic Workflow System

## 🤖 Overview

The Excel AI Agent is a comprehensive system that interprets natural language commands and converts them into safe, auditable spreadsheet operations. It combines LLM intelligence with deterministic Python execution for reliable Excel automation.

## 🏗️ Architecture

### Components

1. **ExcelAgentTab (React)** - UI interface for natural language input and real-time feedback
2. **LLM Planner (Node.js)** - Converts natural language to structured JSON actions using hosted LLM (openai-oss-20b @ 192.168.30.11:1234)
3. **Python Executor (FastAPI)** - Safely executes actions on Excel workbooks with openpyxl
4. **SSE Streaming** - Real-time status updates and "Narrator" events

### Data Flow

```
User Input → LLM Planner → JSON Actions → Python Executor → Excel Changes → UI Updates
     ↓                                                              ↑
  UI Preview ←─────────────── SSE Stream ←────────── Status Events ──┘
```

## 🚀 Quick Start

### 1. Start the Excel Agent Backend

```bash
# Install Python dependencies and start FastAPI server
python start-excel-agent.py
```

This will:
- Install required Python packages (FastAPI, openpyxl, uvicorn, etc.)
- Start the Excel Agent API on port 3001
- Enable auto-reload for development

### 2. Start the Frontend

```bash
# Regular development server (includes proxy to Excel Agent)
npm run dev-with-api
```

### 3. Access the Excel Agent

1. Open PlaceholderTab in the application
2. Click the **Bot icon** (purple button above Excel button) in the sidebar
3. Upload an Excel file (.xlsx, .xls, .csv)
4. Enter natural language commands

## 📝 Natural Language Examples

### Cell Operations
- "Make cell A1 bold"
- "Change B2 to 'Hello World'"
- "Set font size in C3 to 16"
- "Make column A background color blue"

### Row/Column Operations
- "Insert a new row after row 5"
- "Delete rows 10 to 15"
- "Make row 1 height 30 pixels"
- "Make column B wider" (sets reasonable default width)

### Formatting
- "Make the header row bold and center aligned"
- "Color cells A1:C3 light yellow"
- "Set text color in D4 to red"

### Ranges
- "Merge cells A1:B2"
- "Unmerge cells C1:D3"

## 🔧 API Endpoints

### Core Endpoints

- `POST /api/excel/session` - Create new session
- `POST /api/excel/open` - Upload and load Excel file
- `GET /api/excel/sheets` - List sheets in workbook
- `GET /api/excel/range` - Get cell values and styles
- `POST /api/excel/ops` - Execute actions on workbook
- `POST /api/excel/export` - Export workbook as Excel/CSV
- `GET /api/excel/stream/{sessionId}` - SSE event stream

### LLM Integration

- `POST /api/llm/excel-planner` - Convert natural language to actions

## 📊 Action Schema

All operations are validated against a strict schema:

```javascript
{
  type: "updateCell" | "formatCell" | "insertRow" | "deleteRow" | "setRowHeight" | "setColumnWidth" | "mergeCells" | "unmergeCells",
  sheet: "Sheet1",              // Target sheet name
  target: "A1",                 // A1 notation for cell/row/column
  value?: "Hello",              // For updateCell
  style?: {                     // For formatCell
    backgroundColor: "#FFFF00",
    textColor: "#000000",
    bold: true,
    italic: false,
    fontSize: 14,
    horizontalAlign: "center",
    verticalAlign: "middle"
  },
  range?: "A1:B5",             // For merge operations
  index?: 5,                   // For insert operations
  count?: 2,                   // Number of rows/columns
  height?: 25,                 // Row height in pixels
  width?: 120                  // Column width in pixels
}
```

## 🔒 Security Features

### File Safety
- Files stored in sandboxed `uploads/excel/` directory
- Session-based isolation (each session gets unique files)
- Automatic cleanup of expired sessions (2-hour TTL)
- File type validation (.xlsx, .xls, .csv only)

### Operation Safety
- Dry-run mode available for all operations
- Action validation before execution
- Range boundary checking
- Transaction IDs for audit trails
- Error containment (failed actions don't affect others)

### Input Validation
- Strict Pydantic models for all API inputs
- A1 notation validation with regex patterns
- Schema validation for LLM-generated actions
- Fallback handling for LLM failures

## 📈 Monitoring & Debugging

### Logging
- Structured JSON logs for all operations
- Session tracking with unique IDs
- Action execution tracing
- Performance metrics (execution time, success rates)

### Real-time Feedback
- SSE events for operation progress
- "Narrator" style status updates
- Error reporting with context
- Confidence scores from LLM planning

### Development Tools
- FastAPI auto-generated docs at `http://localhost:3001/docs`
- Interactive API testing interface
- WebSocket debugging for SSE streams
- Session inspection endpoints

## 🧪 Testing

### Unit Tests (Planned)
```bash
# Action validators
pytest tests/test_actions.py

# A1 notation parsing
pytest tests/test_a1_parser.py

# Style mapping
pytest tests/test_styles.py
```

### Load Testing (Planned)
```bash
# Large workbook handling
pytest tests/test_performance.py

# Concurrent sessions
pytest tests/test_concurrent.py
```

### Golden Tests (Planned)
- Apply fixed action sets to sample workbooks
- Compare exported XLSX files for consistency
- Validate diff correctness

## 🔄 Development Workflow

### Adding New Action Types

1. **Define Pydantic Model** in `excel_executor.py`:
```python
class SetFormulaAction(BaseAction):
    type: str = "setFormula"
    formula: str
```

2. **Add to Action Union**:
```python
Action = Union[..., SetFormulaAction]
```

3. **Implement Execution Logic**:
```python
elif action.type == "setFormula":
    cell.value = action.formula
```

4. **Update LLM Schema** in `excel-planner.js`
5. **Add Example Prompts** to documentation

### Debugging LLM Issues

1. Check raw LLM responses in console logs
2. Validate JSON parsing in `parseAndValidateResponse()`
3. Test fallback actions for common patterns
4. Adjust temperature and schema constraints

### Performance Optimization

1. **Range Operations**: Batch cell updates for large ranges
2. **Lazy Loading**: Load only visible sheet data
3. **Caching**: Cache parsed workbook metadata
4. **Streaming**: Stream large file operations

## 🚧 Roadmap

### Phase 1 (Completed)
- ✅ Core action execution (updateCell, formatCell, insertRow, etc.)
- ✅ LLM planning with Gemini API
- ✅ SSE streaming for real-time updates
- ✅ Basic security and validation

### Phase 2 (Planned)
- 🔄 Formula support with evaluation
- 🔄 Data validation and conditional formatting
- 🔄 Performance optimization for large files
- 🔄 Undo/redo functionality

### Phase 3 (Future)
- 📋 Advanced chart generation
- 📋 Pivot table operations
- 📋 Cross-workbook operations
- 📋 Collaborative editing

## 🐛 Troubleshooting

### Common Issues

**"Session not found" errors**
- Sessions expire after 2 hours of inactivity
- Refresh the page to create a new session

**LLM parsing failures**
- Verify hosted LLM is accessible at http://192.168.30.11:1234
- Check model name 'openai-oss-20b' is correct
- Review prompt complexity (simpler commands work better)
- Check fallback action patterns (Gemini API as backup)

**File upload errors**
- Verify file format (.xlsx, .xls, .csv)
- Check file size limits
- Ensure proper MIME types

**SSE connection issues**
- Verify proxy configuration in `vite.config.js`
- Check network connectivity to localhost:3001
- Look for CORS errors in browser console

### Getting Help

1. Check FastAPI docs: `http://localhost:3001/docs`
2. Review console logs for detailed error messages
3. Test individual API endpoints with curl/Postman
4. Check session status and cleanup expired sessions

## 📄 License

This Excel AI Agent system is part of the aluminum-store-ui project and follows the same licensing terms.