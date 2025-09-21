# 🧪 Orchestrator Testing Guide

## SUPER QUICK TEST - 30 sekundi ⚡

```bash
npm run dev
```

U browser console:
```javascript
await import('./src/orchestrator/quick-test.js').then(m => m.quickTest())
```

Očekivano: `🎉 All tests passed! Orchestrator is ready to use.`

---

## Quick Start - 3 načina testiranja

### 1. 🚀 **Najbrži način - Browser testiranje**

```bash
npm run dev
```

Idi u app → **"Orchestrator Test"** tab → klikni **"Run Basic Tests"**

**Što testira:**
- ✅ Import orchestrator sistema
- ✅ Tool registry (5 alata)
- ✅ Signature generation 
- ✅ ExecutionEnvelope validation
- ✅ Pojedinačno izvršavanje svih 5 alata
- ✅ OpenAI tools format

**Rezultat:** Vidjet ćeš 8/8 tests passed ako sve radi

---

### 2. 🎯 **Browser Console testiranje**

U "Orchestrator Test" tab klikni **"Run All Tests (Console)"** ili u browser konzoli:

```javascript
// Automatski dostupno u browseru
await window.orchestratorTests.runAllTests();
```

**Što testira:**
- Sve iz osnovnih testova
- Detaljnu validaciju svih komponenti
- Mock tool execution s vremenskim mjerenjima
- Kompletnu trace event generaciju

---

### 3. 🔥 **Pravo testiranje s LLM serverom**

Idi u **"Orchestrator Demo"** tab:

**Setup:**
1. Pokreni lokalni LLM server (LM Studio, OpenWebUI, ili vLLM)
2. U demo-u promijeni Base URL na tvoj server
3. Testiraj s pravim LLM-om

**Quick examples:**
- "Izvuci tablicu iz Excel filea"
- "Analiziraj sliku prozora" 
- "Parsiraj DWG i usporedi s Excel tabelom"

---

## 📋 Detaljno testiranje po koracima

### Korak 1: Basic Validation
```bash
npm run dev
# Idi na Orchestrator Test tab
# Click "Run Basic Tests"
# Očekivano: 8/8 passed
```

### Korak 2: Console Output
```javascript
// U browser console
await window.orchestratorTests.testToolExecution();
// Očekivano: "OCR result: 200+ characters extracted"
//            "Table result: 4 rows, 6 columns"
```

### Korak 3: Tool Registry Inspection
```javascript
// Provjeri dostupne alate
window.Orchestrator.getAvailableTools();
// Očekivano: ["ocr_pdf", "extract_table", "vlm_describe", "dwg_parser", "summarize_docs"]
```

### Korak 4: Signature Testing
```javascript
// Test signature generation
const { signature } = await import('./src/orchestrator');
signature([{type: "table"}, {type: "dwg"}], "compare");
// Očekivano: "dwg+table|compare"
```

---

## 🌐 Server Integration Testing

### Option A: Dodaj u postojeći server

U `file-writer.cjs` ili `server.js`:

```javascript
// Import orchestrator routes
const { setupOrchestratorRoutes } = require('./src/orchestrator/server/http.js');

// Add to existing Express app
setupOrchestratorRoutes(app);
```

Zatim testiraj:
```bash
curl -X POST http://localhost:3001/api/orchestrator/tools
curl -X POST http://localhost:3001/api/orchestrator/status
```

### Option B: Standalone server

```bash
node -e "
import('./src/orchestrator/server/http.js')
  .then(m => m.createOrchestratorServer(8787))
"
```

Test endpoints:
- `GET http://localhost:8787/api/orchestrator/status`
- `GET http://localhost:8787/api/orchestrator/tools`

---

## 🎯 Test Scenarios

### Scenario 1: OCR Processing
```javascript
const client = window.Orchestrator.createOrchestratorClient();
await client.processMessage("Izvuci tekst iz PDF dokumenta");
// Očekivano: Tool call → ocr_pdf
```

### Scenario 2: Table Extraction  
```javascript
await client.processMessage("Analiziraj Excel tablicu sheet1");
// Očekivano: Tool call → extract_table
```

### Scenario 3: Multi-tool Workflow
```javascript
await client.processMessage("Usporedi Excel s DWG komponentama");
// Očekivano: Tool calls → extract_table + dwg_parser + LLM comparison
```

---

## 🛠️ Troubleshooting

### Problem: "Import failed"
**Rješenje:** Provjeri da li su svi fajlovi u `src/orchestrator/` direktoriju

### Problem: "Tool validation failed"
**Rješenje:** Provjeri browser console za detaljne error poruke

### Problem: "LLM endpoint not responding"
**Rješenja:**
1. Provjeri da li je server pokrenut na correct portu
2. Update Base URL u Orchestrator Demo konfiguraciji
3. Provjeri CORS settings

### Problem: "Missing dependencies"
```bash
npm install  # Re-install dependencies
rm -rf node_modules/.vite  # Clear Vite cache
```

---

## 📊 Expected Test Results

### ✅ Successful Run Output:
```
🧪 Testing signature generation:
  Signature: dwg+table|compare
  Valid envelope: true
  ✅ All signature tests passed

🧪 Testing tool registry:
  Available tools: ocr_pdf, extract_table, vlm_describe, dwg_parser, summarize_docs
  OpenAI format tools: 5

🧪 Testing individual tool execution:
  OCR result: 200 characters extracted
  Table result: 4 rows, 6 columns
  Context variables: $doc_text, $table_data
  Events generated: 4

✅ All tests completed!
```

### ❌ Failed Run - Common Issues:
- **Import errors**: File paths ili missing exports
- **Validation errors**: Schema configuration problemi
- **Runtime errors**: Missing dependencies ili network issues

---

## 🚀 Next Steps After Testing

1. **Basic tests pass** → Test s realnim LLM serverom
2. **LLM integration works** → Add custom tools za tvoje potrebe  
3. **Ready for production** → Integrate s postojećim backend servisima
4. **Advanced usage** → Add Narrator agent i SSE streaming

---

## 📞 Quick Commands

```bash
# Start development
npm run dev

# Test in browser console
await window.orchestratorTests.runAllTests()

# Check available tools
window.Orchestrator.getAvailableTools()

# Test single message
window.Orchestrator.processUserMessage("test message")
```

Happy testing! 🎉