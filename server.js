import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import XLSX from "xlsx";
import { v4 as uuidv4 } from 'uuid';

// Focus Session Store for sequential interpretation
class FocusSessionStore {
  constructor(ttlMs = 30*60*1000) { this.sessions = new Map(); this.ttlMs = ttlMs; }
  _now() { return new Date().toISOString(); }
  create(initialCtx) {
    const id = `focus_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    const s = {
      id,
      createdAt: this._now(),
      lastActivityAt: this._now(),
      context: { ...initialCtx },
      history: [],
      pendingGhosts: []
    };
    this.sessions.set(id, s); return s;
  }
  get(id) { return this.sessions.get(id) || null; }
  touch(id) { const s = this.get(id); if (s) s.lastActivityAt = this._now(); }
  addSegment(id, rec) { const s = this.get(id); if (!s) return; s.history.push(rec); this.touch(id); }
  addGhost(id, g) { const s = this.get(id); if (!s) return; s.pendingGhosts.push(g); this.touch(id); }
  replaceLastGhost(id, newG) { const s = this.get(id); if (!s) return; const last = s.pendingGhosts.at(-1); if (last) last.status='replaced'; s.pendingGhosts.push(newG); this.touch(id); }
  pending(id) { const s = this.get(id); return s ? s.pendingGhosts.filter(g=>g.status==='preview') : []; }
  applyAll(id) { const s = this.get(id); if (!s) return []; const toApply = this.pending(id); toApply.forEach(g=>g.status='applied'); this.touch(id); return toApply; }
}

const FocusStore = new FocusSessionStore();

// Excel Agent Session Store
class ExcelSessionStore {
  constructor() {
    this.sessions = new Map();
  }

  createSession() {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      created: new Date().toISOString(),
      workbook: null,
      workbookPath: null,
      sheets: [],
      events: [],
      lastActivity: new Date().toISOString()
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
    }
    return session;
  }

  addEvent(sessionId, event) {
    const session = this.getSession(sessionId);
    if (session) {
      session.events.push({
        ...event,
        timestamp: new Date().toISOString()
      });
    }
  }

  cleanup() {
    // Clean up sessions older than 2 hours
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.lastActivity) < cutoff) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

const ExcelStore = new ExcelSessionStore();

// Document Registry implementation (inline)
class DocumentRegistry {
  constructor(documentsPath = 'src/backend/Računi') {
    this.documentsPath = documentsPath;
    this.documents = [];
    this.lastScan = null;
    this.scanDocuments();
  }

  scanDocuments() {
    try {
      const fullPath = path.resolve(this.documentsPath);
      const files = fs.readdirSync(fullPath);
      
      this.documents = files
        .filter(file => file.match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx|txt)$/i))
        .map((filename, index) => ({
          id: `doc_${index + 1}`,
          filename: filename,
          path: path.join(fullPath, filename),
          size: fs.statSync(path.join(fullPath, filename)).size,
          type: this.getDocumentType(filename),
          searchTerms: this.generateSearchTerms(filename)
        }));

      this.lastScan = new Date();
      console.log(`📚 Document Registry: Scanned ${this.documents.length} documents`);
      
    } catch (error) {
      console.error('❌ Document Registry scan error:', error);
      this.documents = [];
    }
  }

  getDocumentType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
      pdf: 'document', jpg: 'image', jpeg: 'image', png: 'image',
      doc: 'document', docx: 'document', xls: 'spreadsheet', 
      xlsx: 'spreadsheet', txt: 'text'
    };
    return typeMap[ext] || 'unknown';
  }

  generateSearchTerms(filename) {
    const base = filename.replace(/\.[^/.]+$/, '');
    const terms = base
      .split(/[\s\-_\(\)\[\]\.]+/)
      .filter(term => term.length > 2)
      .map(term => term.toLowerCase());
    terms.unshift(base.toLowerCase());
    return [...new Set(terms)];
  }

  getLLMDocumentContext() {
    return {
      totalDocuments: this.documents.length,
      documentList: this.documents.map(doc => ({
        id: doc.id,
        name: doc.filename,
        type: doc.type
      })),
      lastScanned: this.lastScan?.toISOString()
    };
  }

  getDocumentById(id) {
    return this.documents.find(doc => doc.id === id) || null;
  }

  getDocumentForProcessing(id) {
    const doc = this.getDocumentById(id);
    if (!doc) return null;
    
    try {
      return {
        ...doc,
        content: fs.readFileSync(doc.path),
        available: fs.existsSync(doc.path)
      };
    } catch (error) {
      console.error(`❌ Error reading document ${id}:`, error);
      return null;
    }
  }

  getDocumentList() {
    return this.documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      type: doc.type,
      size: `${(doc.size / 1024).toFixed(1)}KB`
    }));
  }

  refresh() {
    this.scanDocuments();
    return this.documents.length;
  }

  getStats() {
    const stats = { total: this.documents.length, types: {}, totalSize: 0 };
    this.documents.forEach(doc => {
      stats.types[doc.type] = (stats.types[doc.type] || 0) + 1;
      stats.totalSize += doc.size;
    });
    stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    return stats;
  }

  findByName(name) {
    return this.documents.find(doc => 
      doc.filename === name || 
      doc.filename.toLowerCase() === name.toLowerCase()
    ) || null;
  }
}

// Create registry instance
const documentRegistry = new DocumentRegistry();

dotenv.config();

const app = express();

// Configure multer for file uploads - save to src/backend
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'E:\\UI REFACTOR\\aluminum-store-ui\\src\\backend';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + original name to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({ storage });

console.log("🔑 OpenAI API Key present:", !!process.env.OPENAI_API_KEY);
console.log("🔑 API Key length:", process.env.OPENAI_API_KEY?.length || 0);
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

/* ========== ROUTING FUNKCIJA (auto-detektira tip inputa) ========== */
async function routeLLMRequest(input) {
  try {
    // Ako je audio
    if (input.file && input.file.mimetype.startsWith("audio")) {
      console.log("🎤 Routing to Whisper:", input.file.originalname);
      const tempPath = `./tmp_${Date.now()}.webm`;
      fs.writeFileSync(tempPath, input.file.buffer);
      
      const resp = await client.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: "whisper-1",
      });
      
      fs.unlinkSync(tempPath);
      return { type: "transcript", text: resp.text, timestamp: new Date().toISOString() };
    }

    // Ako je slika
    if (input.file && input.file.mimetype.startsWith("image")) {
      console.log("🖼️ Routing to Vision:", input.file.originalname);
      const base64 = input.file.buffer.toString('base64');
      
      const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: input.prompt || "Analiziraj sliku i izvuci sve relevantne podatke" },
            { 
              type: "image_url", 
              image_url: { url: `data:${input.file.mimetype};base64,${base64}` }
            }
          ]
        }],
        temperature: 0.1
      });
      
      return { 
        type: "image_analysis", 
        text: resp.choices[0].message.content,
        timestamp: new Date().toISOString()
      };
    }

    // Ako je tekst
    console.log("💭 Routing to GPT:", input.prompt?.substring(0, 50));
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "Pretvori korisnikov zahtjev u JSON format za upravljanje projektima. Vrati čisti JSON objekt."
      }, {
        role: "user",
        content: input.prompt
      }],
      temperature: 0.1
    });
    
    return { 
      type: "text", 
      json: JSON.parse(resp.choices[0].message.content),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error("❌ Routing error:", error);
    return { 
      type: "error", 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/* ========== TRANSCRIBE (audio → text) ========== */
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nema audio file-a u requestu" });
    }

    console.log("🎤 Received audio:", req.file.originalname, req.file.size, "bytes");

    // Spremi privremeni file
    const tempPath = `./tmp_${Date.now()}.webm`;
    fs.writeFileSync(tempPath, req.file.buffer);

    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1", // stabilan model za webm snimke
    });

    fs.unlinkSync(tempPath); // očisti nakon transkripcije

    console.log("✅ Transcription successful:", response.text);
    res.json({ text: response.text });
  } catch (err) {
    console.error("❌ Transcribe error:", err.response?.data || err.message);
    console.error("❌ Full error:", err);
    console.error("❌ Stack trace:", err.stack);
    res.status(500).json({ error: err.message, fallback_text: "Fallback transcript" });
  }
});

/* ========== GVA VOICE INTENT (tool-calling to UI actions) ========== */
// === VOICE INTENT PROCESSING ENDPOINT (MEGA SPEC) ===

// === STRICT TOOL DEFINITIONS (MEGA SPEC Section 3) ===
const TOOLS = [
  {
    type: "function",
    function: {
      name: "emit_action",
      description: "Emit a single, atomic, backend-ready action.",
      parameters: {
        type: "object",
        properties: {
          type: { 
            type: "string", 
            enum: ["shift","set_status","move_start","move_end","set_range","set_duration","shift_all","distribute_chain","normative_extend"] 
          },

          // A) eksplicitni izbor po aliasima
          targets: {
            type: "array",
            description: "List of normalized alias/badge codes (e.g., ['KIA7','334']).",
            items: { type: "string", pattern: "^[A-ZČĆĐŠŽ0-9]+$" }, 
            minItems: 1
          },

          // B) grupni 'scope' izbor (NOVO)
          scope: {
            type: "object",
            description: "Filtered selection without enumerating targets.",
            properties: {
              filter: {
                type: "object",
                properties: {
                  planned_start: { type: "string", format: "date" },
                  planned_end:   { type: "string", format: "date" },
                  status_in:     { type: "array", items: { type: "string", enum: ["Planirano","U TIJEKU","Blokirano","Završeno"] } },
                  owner_in:      { type: "array", items: { type: "string" } },
                  project_in:    { type: "array", items: { type: "string" } }
                },
                additionalProperties: false
              },
              limit: { type: "integer", minimum: 1 },
              sort:  { type: "string", enum: ["start_asc","start_desc"], default: "start_asc" }
            },
            required: ["filter"],
            additionalProperties: false
          },

          params: {
            type: "object",
            description: "Action-specific parameters.",
            properties: {
              days: { type: "integer", description: "Number of days for shift operations" },
              status: { type: "string", description: "Status value for set_status operations" },
              date: { type: "string", format: "date", description: "Date for move_start/move_end operations" },
              start: { type: "string", format: "date", description: "Start date for set_range operations" },
              end: { type: "string", format: "date", description: "End date for set_range operations" },
              duration_days: { type: "integer", description: "Duration in days for set_duration operations" },
              day_of_month: { type: "integer", minimum: 1, maximum: 31, description: "Day of month for 'kraj N' expressions" },
              gap_days: { type: "integer", default: 0, description: "Gap days for distribute_chain operations" },
              order_by: { type: "string", enum: ["planned_start","priority","owner"], default: "planned_start", description: "Sort order for distribute_chain" },
              unfinished: { type: "boolean", description: "Filter for unfinished items" }
            },
            additionalProperties: false
          }
        },

        required: ["type","params"],
        additionalProperties: false
      },
    },
  },
  {
    type: "function",
    function: {
      name: "ask_clarify",
      description: "Ask a single, precise question when exactly one slot is missing.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" },
          missing_slots: { type: "array", items: { type: "string" } },
        },
        required: ["question", "missing_slots"],
        additionalProperties: false
      },
    },
  },
];

// === SYSTEM PROMPT (MEGA SPEC Section 4.1) ===
const SYSTEM_PROMPT = `
Ti si "Voice → Actions Orchestrator" za Employogram/GVAv2.
Zadatak: Pretvori hrvatske transkripte u točno jednu atomsku akciju koristeći dostupne alate.
U svakom odgovoru napravi točno jedno:
1) Pozovi tool \`emit_action\` ako su svi slotovi jasni.
2) Inače pozovi tool \`ask_clarify\` s jednim kratkim pitanjem.
Nikad ne odgovaraj narativnim tekstom. Bez paralelnih tool-poziva. Poštuj sheme alata.

Normalizacije (HR):
- Aliasi/badgevi: makni razmake/točke/crtice, velika slova. "Kia 7"→KIA7; "POZICIJA 9"→POZICIJA9.
- Ako je transkript "KIA 7.3.3.4", interpretiraj kao ["KIA7","334"].
- Brojevi riječima: "tri"→3.
- Smjer (za pomak): naprijed/plus ⇒ +; nazad/unazad/minus ⇒ −. Ako izostane, pretpostavi +.
- Datumi: koristi YYYY-MM-DD. Ako je dan.mjesec. bez godine, uzmi iz konteksta \`DefaultYear\`.
  * Glasovne varijante: "16 i 8"/"šesnesti osmog"/"šeasnaesti osmog" = "16.08." = "2025-08-16"
  * "20 i 7"/"dvadeset sedmog" = "20.07." = "2025-07-20"
  * Koristi datesIndex iz konteksta da pronađeš postojeće datume početka
- Status whitelist (za set_status): Planirano, U TIJEKU, Blokirano, Završeno. Sinonimi: "blokirane"→Blokirano; "u procesu"→U TIJEKU; "gotovo"→Završeno.

NOVE FRAZE → SCOPE/FILTER:
- "sve što počinje <datum>" ⇒ \`scope.filter.planned_start = <YYYY-MM-DD>\`.
- "promijeni početak ... na <datum>" ⇒ \`type=move_start\`, \`params.date=<YYYY-MM-DD>\`.
- "pomakni ... za <N> dan(a)" ⇒ \`type=shift\`, \`params.days=±N\`.
- Ako je zadana i lista aliasa, koristi \`targets\`. Ako je zadana grupna fraza (npr. "sve što počinje ..."), koristi \`scope\` umjesto \`targets\`.

PRIMJERI:
• "pomakni sve što počinje 16.08. za šest dana napred"
• "pomakni sve što počinje šesnesti osmog za šest dana napred"  
• "pomakni sve što počinje šeasnaesti osmog za šest dana napred"
• "pomakni sve što počinje 16 i 8 za šest dana napred"
→ Sve varijante = "2025-08-16", provjeri datesIndex.plannedStart["2025-08-16"] - postoji!
→ \`{"type":"shift","scope":{"filter":{"planned_start":"2025-08-16"}},"params":{"days":6}}\`

Slotovi:
- Za \`shift\`: treba {scope ili targets} + days.
- Za \`move_start\`: treba {scope ili targets} + date.
Ako nedostaje točno jedan slot, pitaj \`ask_clarify\`. Ako treba birati između \`shift\` ili \`move_start\`, pitaj: "Pomak u danima ili točan novi datum početka?"

Odabir datuma:
- Podrazumijevan je \`planned_start\` (ne diraj \`actual\` vrijednosti).

— KOREKCIJE I REFERENCE —
• Ako segment sadrži „ne", „neću", „odustani", „zapravo", „umjesto toga": zamijeni prethodnu akciju (last_action) novom vrijednošću i vrati SAMO konačnu akciju. Ako negacija ne daje novu vrijednost → ask_clarify s jednim kratkim pitanjem.
• „ovo/ono/te/za te tri" referira na last_selection (isti targets ili scope).
• „koje nisu završene" mapiraj na scope.filter.status_in = ["Planirano","U TIJEKU","Blokirano"].
• „jedna nakon druge" emitiraj type=distribute_chain nad istim targets|scope.
• Ako u istom segmentu postoje i targets i grupni scope → targets imaju prioritet.
• „kraj <DAN>" = move_end sa params.day_of_month = <int>; koristi active_month iz konteksta (ako nije postavljen, uzmi iz nowISO); godinu = DefaultYear.
• Slotovi: ako fali točno jedan obavezni slot → ask_clarify (1 kratko pitanje). Inače ne odgovaraj narativno, nego striktno alatima.
`;

app.post('/api/gva/voice-intent', async (req, res) => {
  console.log('🎤 [VOICE-INTENT] === REQUEST START ===');
  console.log('🎤 [VOICE-INTENT] Full payload:', JSON.stringify(req.body, null, 2));
  
  const { transcript, context } = req.body;
  console.log('🎤 [VOICE-INTENT] Extracted transcript:', transcript);
  console.log('🎤 [VOICE-INTENT] Extracted context:', context);

  if (!transcript) {
    console.log('❌ [VOICE-INTENT] Missing transcript');
    return res.status(400).json({ error: "Transcript missing" });
  }

  if (!context) {
    console.log('❌ [VOICE-INTENT] Missing context');
    return res.status(400).json({ error: "Context missing" });
  }

  // Prepare context for prompt
  const availableAliases = Object.keys(context.aliasToLine || {}).join(', ');
  const plannedStartDates = Object.keys(context.datesIndex?.plannedStart || {});
  const datesInfo = plannedStartDates.length > 0 ? 
    `Datumi početka: ${plannedStartDates.map(d => `${d} (${context.datesIndex.plannedStart[d].length} stavki)`).join(', ')}` : 
    'Nema dostupnih datuma početka';
  
  const userMessage = `Kontekst: DefaultYear=${context.defaultYear}; NowISO=${context.nowISO}; ${datesInfo}; Dostupni aliasi: [${availableAliases}]\n\nTranskript: "${transcript}"`;
  
  console.log('🎤 [VOICE-INTENT] Available aliases:', availableAliases);
  console.log('🎤 [VOICE-INTENT] User message for OpenAI:', userMessage);
  console.log('🚀 [VOICE-INTENT] Calling OpenAI API...');
  
  try {
    
    // --- REAL LLM CALL (OpenAI Example) ---
    const completion = await client.chat.completions.create({
      model: "gpt-4o", // Recommended for reliable function calling
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0,
    });

    console.log('✅ [VOICE-INTENT] OpenAI API response received');
    const responseMessage = completion.choices[0].message;
    console.log('🎤 [VOICE-INTENT] Response message:', JSON.stringify(responseMessage, null, 2));
    
    const toolCalls = responseMessage.tool_calls;
    console.log('🔧 [VOICE-INTENT] Tool calls:', toolCalls ? toolCalls.length : 0, 'found');

    if (!toolCalls || toolCalls.length === 0) {
      console.log('❌ [VOICE-INTENT] No tool calls - returning clarify');
      return res.json({ type: 'clarify', question: "Nisam razumio naredbu. Možete li ponoviti specifičnije?" });
    }

    const toolCall = toolCalls[0];
    const functionName = toolCall.function.name;
    console.log('🔧 [VOICE-INTENT] Function name:', functionName);
    console.log('🔧 [VOICE-INTENT] Function arguments (raw):', toolCall.function.arguments);
    
    let functionArgs;
    try {
        functionArgs = JSON.parse(toolCall.function.arguments);
        console.log('🔧 [VOICE-INTENT] Function arguments (parsed):', JSON.stringify(functionArgs, null, 2));
    } catch (e) {
        console.error("❌ [VOICE-INTENT] AI returned invalid JSON:", toolCall.function.arguments);
        return res.status(500).json({ type: 'error', message: 'AI internal error (Invalid JSON)' });
    }

    if (functionName === 'ask_clarify') {
      console.log('❓ [VOICE-INTENT] Returning clarify response');
      return res.json({
        type: 'clarify',
        question: functionArgs.question,
        missing_slots: functionArgs.missing_slots,
      });
    }

    if (functionName === 'emit_action') {
      console.log('⚡ [VOICE-INTENT] Emitting action:', functionArgs.type);
      // Generate ID and timestamp on server (MEGA SPEC Section 9)
      const clientActionId = uuidv4();
      const requestedAt = new Date().toISOString();

      const action = {
        type: functionArgs.type,
        targets: functionArgs.targets,
        scope: functionArgs.scope,
        params: functionArgs.params,
        client_action_id: clientActionId,
        requested_at: requestedAt,
      };

      console.log('⚡ [VOICE-INTENT] Final action:', JSON.stringify(action, null, 2));
      console.log('✅ [VOICE-INTENT] Sending actions response to frontend');

      // Return format that frontend (index.jsx) expects
      return res.json({
        type: 'actions',
        actions: [action],
      });
    }

    /*
    // --- MOCK RESPONSE (for testing integration without real LLM call) ---
    console.log("[MOCK API] Received transcript:", transcript);
    const t = transcript.toLowerCase();
    let mockAction = null;

    if ((t.includes('kia 7') || t.includes('kia7')) && (t.includes('pomakni') || t.includes('naprijed'))) {
        mockAction = { type: "shift", targets: ["KIA7"], params: { days: 3 }};
    } else if ((t.includes('kia 7') || t.includes('334')) && t.includes('blokiran')) {
        // Example batch action
        mockAction = { type: "set_status", targets: ["KIA7", "334"], params: { status: "Blokirano" }};
    }
    
    if (mockAction) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        return res.json({
            type: 'actions',
            actions: [{
                ...mockAction,
                client_action_id: uuidv4(),
                requested_at: new Date().toISOString()
            }]
        });
    }
    return res.status(404).json({ type: 'none', message: 'Naredba nije prepoznata.' });
    */

  } catch (error) {
    console.error("❌ [VOICE-INTENT] ERROR:", error.message);
    console.error("❌ [VOICE-INTENT] Full error:", error);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
  
  console.log('🎤 [VOICE-INTENT] === REQUEST END ===');
});

/* ========== FOCUS SESSION ROUTES (Sequential Interpretation) ========== */

// Create new focus session
app.post('/api/gva/focus/session', (req, res) => {
  const initialContext = req.body?.initialContext || {};
  const ctx = {
    DefaultYear: new Date().getFullYear(),
    nowISO: new Date().toISOString(),
    active_month: null,
    status_sets: { unfinished: ["Planirano","U TIJEKU","Blokirano"] },
    ...initialContext
  };
  const s = FocusStore.create(ctx);
  console.log(`🎯 Focus session created: ${s.id}`);
  res.json({ sessionId: s.id, context: s.context });
});

// Process single segment sequentially
app.post('/api/gva/focus/segment', async (req, res) => {
  try {
    const { sessionId, text } = req.body;
    const s = FocusStore.get(sessionId);
    if (!s) return res.status(404).json({ error: 'Unknown session' });

    console.log(`🎯 [${sessionId.slice(-6)}] Processing: "${text}"`);

    // Call existing voice-intent with session context
    const { DefaultYear, nowISO, last_selection, last_action, active_month, status_sets } = s.context;
    const viBody = { 
      transcript: text, 
      context: { 
        DefaultYear, nowISO, last_selection, last_action, active_month, status_sets,
        // Pass through any existing context
        aliasToLine: s.context.aliasToLine || {},
        activeLineId: s.context.activeLineId,
        pozicije: s.context.pozicije || []
      }
    };

    // Internal call to voice-intent endpoint
    const voiceIntentResponse = await processVoiceIntent(viBody);

    // Map result to SegmentRecord
    const segmentId = `seg_${Date.now()}`;
    let seg = { id: segmentId, text, result: { kind:'no_op' }, status:'skipped' };

    if (voiceIntentResponse?.type === 'actions' && voiceIntentResponse?.actions?.length > 0) {
      const action = voiceIntentResponse.actions[0]; // Take first action for now
      
      // Update context
      s.context.last_action = action;
      s.context.last_selection = { targets: action.targets, scope: action.scope };
      
      // Set active_month heuristic
      if (action?.params?.day_of_month && !s.context.active_month) {
        s.context.active_month = (new Date(s.context.nowISO).getMonth() + 1);
      }

      seg.result = { kind:'emit_action', action };
      seg.status = 'previewed';

      // Create ghosts - one per target to allow individual confirmation
      const targets = action.targets || [];
      const ghostsCreated = [];
      
      // Detect corrections (neću, zapravo, etc.)
      if (/\b(neću|ne,|zapravo|umjesto toga|odustani)\b/i.test(text) && s.pendingGhosts.length > 0) {
        // For corrections, create single ghost that replaces the last one
        const ghost = { 
          id: `ghost_${Date.now()}`, 
          action, 
          impact: { lines: [] }, 
          status: 'preview' 
        };
        ghost.replacesGhostId = s.pendingGhosts.at(-1).id;
        FocusStore.replaceLastGhost(sessionId, ghost);
        seg.replaces = s.history.at(-1)?.id;
        ghostsCreated.push(ghost);
        console.log(`🎯 [${sessionId.slice(-6)}] Correction detected, replacing last ghost`);
      } else if (targets.length > 1) {
        // Multi-target action: create individual ghosts for granular confirmation
        targets.forEach((target, index) => {
          const individualAction = {
            ...action,
            targets: [target] // Single target per ghost
          };
          const ghost = { 
            id: `ghost_${Date.now()}_${index}`, 
            action: individualAction, 
            impact: { lines: [target] }, 
            status: 'preview' 
          };
          FocusStore.addGhost(sessionId, ghost);
          ghostsCreated.push(ghost);
          console.log(`🎯 [${sessionId.slice(-6)}] New ghost created: ${ghost.id} for target ${target}`);
        });
      } else {
        // Single target: create one ghost as before
        const ghost = { 
          id: `ghost_${Date.now()}`, 
          action, 
          impact: { lines: targets }, 
          status: 'preview' 
        };
        FocusStore.addGhost(sessionId, ghost);
        ghostsCreated.push(ghost);
        console.log(`🎯 [${sessionId.slice(-6)}] New ghost created: ${ghost.id}`);
      }

    } else if (voiceIntentResponse?.type === 'clarify') {
      seg.result = { kind:'ask_clarify', question: voiceIntentResponse.question };
      seg.status = 'skipped';
      console.log(`🎯 [${sessionId.slice(-6)}] Clarification needed: ${voiceIntentResponse.question}`);
    }

    FocusStore.addSegment(sessionId, seg);

    res.json({ 
      segment: seg, 
      pendingGhosts: FocusStore.pending(sessionId),
      sessionContext: s.context
    });

  } catch (error) {
    console.error('❌ Focus segment error:', error);
    res.status(500).json({ error: 'Focus segment processing failed' });
  }
});

// Confirm all pending ghosts
app.post('/api/gva/focus/confirm', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const s = FocusStore.get(sessionId);
    if (!s) return res.status(404).json({ error:'Unknown session' });

    const toApply = FocusStore.applyAll(sessionId);
    console.log(`🎯 [${sessionId.slice(-6)}] Confirming ${toApply.length} ghost actions`);

    // TODO: Apply actions to actual gantt data
    // For now just log what would be applied
    for (const g of toApply) {
      console.log(`🎯 [${sessionId.slice(-6)}] Would apply:`, g.action);
    }

    res.json({ applied: toApply.map(g => ({ id: g.id, action: g.action })) });

  } catch (error) {
    console.error('❌ Focus confirm error:', error);
    res.status(500).json({ error: 'Focus confirm failed' });
  }
});

// Helper function to process voice intent (extracted from existing route)
async function processVoiceIntent(body) {
  const { transcript, context = {} } = body;
  
  if (!transcript) {
    return { type: 'error', message: 'Missing transcript' };
  }

  try {
    // Construct user message same as main voice-intent endpoint
    const userMessage = `Transkript: "${transcript}"\n\nKontekst:\n${JSON.stringify(context, null, 2)}`;

    // Call OpenAI with same settings as main endpoint
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0,
      max_tokens: 1500
    });

    const message = completion.choices[0]?.message;
    if (!message?.tool_calls?.[0]) {
      return { type: 'error', message: 'No tool call in response' };
    }

    const toolCall = message.tool_calls[0];
    const toolName = toolCall.function?.name;
    const toolArgs = JSON.parse(toolCall.function?.arguments || '{}');

    if (toolName === 'emit_action') {
      // Handle batch_operations type
      if (toolArgs.type === 'batch_operations') {
        return {
          type: 'actions',
          actions: toolArgs.operations || []
        };
      } else {
        return {
          type: 'actions', 
          actions: [toolArgs]
        };
      }
    } else if (toolName === 'ask_clarify') {
      return {
        type: 'clarify',
        question: toolArgs.question,
        missing_slots: toolArgs.missing_slots
      };
    }

    return { type: 'error', message: `Unknown tool: ${toolName}` };

  } catch (error) {
    console.error('❌ processVoiceIntent error:', error);
    return { type: 'error', message: error.message };
  }
}

/* ========== LLM DRAFT (prvi jasni zvuk) ========== */
app.post("/api/llm/draft", async (req, res) => {
  try {
    const { prompt, command, language = 'hr' } = req.body;
    const query = prompt || command;
    if (!query) {
      return res.status(400).json({ error: "Nema prompt u body" });
    }

    console.log("📤 Draft request:", query);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: language === 'hr' 
          ? "Ti si hrvatski asistent za općenite upite. Odgovaraj na hrvatskom jeziku, kratko i jasno."
          : "You are a helpful assistant. Answer questions clearly and concisely."
      }, {
        role: "user", 
        content: query
      }],
      temperature: 0.1
    });

    const content = response.choices[0].message.content;
    
    console.log("✅ Draft response:", content);
    res.json({ 
      response: content,
      content: content,
      query: query,
      language: language,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Draft error:", err.response?.data || err.message);
    console.error("❌ Full error:", err);
    console.error("❌ Stack trace:", err.stack);
    res.status(500).json({
      error: err.message,
      fallback: {
        action: "unknown",
        status: "draft",
        fields: { description: req.body.command },
        flags: { confirmed: false, needs_manual_input: [], refresh_ui: true },
      },
    });
  }
});

/* ========== LLM CONFIRM (drugi jasni zvuk) ========== */
app.post("/api/llm/confirm", async (req, res) => {
  try {
    const { command, fields } = req.body;
    if (!command) {
      return res.status(400).json({ error: "Nema command u body" });
    }

    console.log("📤 Confirm request:", command, fields);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "Finaliziraj akciju na temelju glasovne naredbe i dodaj 'confirmed': true. Vrati čisti JSON objekt."
      }, {
        role: "user",
        content: `Original: "${command}"\nPolja: ${JSON.stringify(fields, null, 2)}`
      }],
      temperature: 0.1
    });

    let raw = response.choices[0].message.content;
    
    // Ukloni ```json markdown blokove
    raw = raw.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '');
    raw = raw.trim();
    
    let json;
    try {
      json = JSON.parse(raw);
    } catch (parseError) {
      console.warn("⚠️ Confirm JSON parse failed, using fallback. Raw response:", raw.substring(0, 200));
      json = {
        action: fields?.action || "unknown",
        fields: fields || { description: req.body.command }
      };
    }
    json.status = "final";
    json.flags = json.flags || {};
    json.flags.confirmed = true;
    json.flags.needs_manual_input = [];

    console.log("✅ Confirm response:", json);
    res.json(json);
  } catch (err) {
    console.error("❌ Confirm error:", err.response?.data || err.message);
    console.error("❌ Full error:", err);
    console.error("❌ Stack trace:", err.stack);
    res.status(500).json({
      error: err.message,
      fallback: {
        action: fields?.action || "unknown",
        status: "final",
        fields,
        flags: { confirmed: true, needs_manual_input: [], refresh_ui: false },
      },
    });
  }
});

/* ========== MULTI-TASK ENDPOINT (paralelni zahtjevi) ========== */
app.post("/api/agent/multi", upload.array("files"), async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks) {
      return res.status(400).json({ error: "Nema tasks u body" });
    }

    const taskList = JSON.parse(tasks);
    console.log(`🚀 Processing ${taskList.length} tasks in parallel`);

    // Pripremi inpute s datotekama
    const inputs = taskList.map((task, i) => {
      const input = { ...task };
      if (req.files && req.files[i]) {
        input.file = req.files[i];
      }
      return input;
    });

    // Lansiraj sve odjednom
    const results = await Promise.allSettled(
      inputs.map((input, i) => {
        console.log(`📤 Task ${i}: ${input.file ? input.file.mimetype : 'text'}`);
        return routeLLMRequest(input);
      })
    );

    // Format rezultata
    const formattedResults = results.map((result, i) => ({
      taskIndex: i,
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null
    }));

    console.log(`✅ Multi-task completed: ${results.filter(r => r.status === 'fulfilled').length}/${results.length} successful`);
    res.json({ results: formattedResults });
    
  } catch (err) {
    console.error("❌ Multi-task error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ========== STREAMING ENDPOINT (Server-Sent Events) ========== */
app.get("/api/agent/stream", (req, res) => {
  const { tasks } = req.query;
  if (!tasks) {
    return res.status(400).json({ error: "Nema tasks parametar" });
  }

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control"
  });

  const taskList = JSON.parse(tasks);
  console.log(`🌊 Starting stream for ${taskList.length} tasks`);

  // Pošalji početni event
  res.write(`event: start\ndata: ${JSON.stringify({ total: taskList.length })}\n\n`);

  // Procesiraj svaki task
  taskList.forEach(async (task, i) => {
    try {
      console.log(`📤 Streaming task ${i}`);
      const result = await routeLLMRequest(task);
      
      res.write(`event: result\ndata: ${JSON.stringify({ 
        taskIndex: i, 
        result,
        progress: Math.round(((i + 1) / taskList.length) * 100)
      })}\n\n`);
      
    } catch (err) {
      console.error(`❌ Stream task ${i} error:`, err);
      res.write(`event: error\ndata: ${JSON.stringify({ 
        taskIndex: i, 
        error: err.message 
      })}\n\n`);
    }

    // Zatvoriti stream ako je zadnji task
    if (i === taskList.length - 1) {
      setTimeout(() => {
        res.write(`event: complete\ndata: ${JSON.stringify({ finished: true })}\n\n`);
        res.end();
      }, 100);
    }
  });

  // Cleanup na disconnect
  req.on('close', () => {
    console.log('🔌 Stream client disconnected');
  });
});

/* ========== MULTIMODAL ENDPOINT (audio + files) ========== */
app.post("/api/agent/multimodal", upload.fields([
  { name: 'file', maxCount: 1 }, // Audio file
  { name: 'attachment_0', maxCount: 1 },
  { name: 'attachment_1', maxCount: 1 },
  { name: 'attachment_2', maxCount: 1 },
  { name: 'attachment_3', maxCount: 1 },
  { name: 'attachment_4', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log("🧩 Multimodal request received");
    console.log("📁 Files:", Object.keys(req.files || {}));
    console.log("📊 Body:", req.body);

    const audioFile = req.files?.file?.[0];
    const fileCount = parseInt(req.body.fileCount) || 0;
    
    let results = {
      transcript: null,
      fileAnalyses: [],
      combinedAnalysis: null,
      actionItems: [],
      timestamp: new Date().toISOString()
    };

    // 1. Process audio file (Whisper transcription)
    if (audioFile) {
      console.log("🎤 Processing audio file:", audioFile.originalname);
      const audioResult = await routeLLMRequest({ file: audioFile });
      results.transcript = audioResult;
    }

    // 2. Process additional files
    for (let i = 0; i < fileCount; i++) {
      const attachmentFile = req.files[`attachment_${i}`]?.[0];
      if (attachmentFile) {
        console.log(`📄 Processing file ${i}:`, attachmentFile.originalname);
        const fileResult = await routeLLMRequest({ 
          file: attachmentFile, 
          prompt: "Analiziraj ovaj dokument i izvuci ključne podatke"
        });
        results.fileAnalyses.push({
          filename: attachmentFile.originalname,
          analysis: fileResult
        });
      }
    }

    // 3. Combined analysis (transcript + files)
    if (results.transcript && results.fileAnalyses.length > 0) {
      console.log("🔗 Creating combined analysis");
      
      const combinedPrompt = `
Analiziraj sljedeće podatke i stvori akcijski plan:

GLASOVNA NAREDBA: "${results.transcript.text || results.transcript.json || 'N/A'}"

ANALIZIRANE DATOTEKE:
${results.fileAnalyses.map((fa, i) => 
  `${i + 1}. ${fa.filename}: ${JSON.stringify(fa.analysis).substring(0, 500)}...`
).join('\n')}

Na temelju glasovne naredbe i sadržaja datoteka, stvori detaljni plan akcije u JSON formatu.
`;

      const combinedResult = await routeLLMRequest({ prompt: combinedPrompt });
      results.combinedAnalysis = combinedResult;
      
      // Extract action items
      if (combinedResult.json?.actions) {
        results.actionItems = combinedResult.json.actions;
      }
    }

    console.log("✅ Multimodal processing complete:", {
      hasTranscript: !!results.transcript,
      fileCount: results.fileAnalyses.length,
      hasCombinedAnalysis: !!results.combinedAnalysis,
      actionCount: results.actionItems.length
    });

    res.json(results);
    
  } catch (err) {
    console.error("❌ Multimodal error:", err);
    res.status(500).json({ 
      error: err.message,
      fallback: {
        transcript: { text: "Greška pri obradi" },
        fileAnalyses: [],
        combinedAnalysis: null,
        actionItems: []
      }
    });
  }
});

/* ========== SMART ROUTING ENDPOINT ========== */
app.post("/api/agent/route", upload.single("file"), async (req, res) => {
  try {
    const input = {
      prompt: req.body.prompt,
      file: req.file
    };

    console.log("🧠 Smart routing request:", {
      hasFile: !!req.file,
      fileType: req.file?.mimetype,
      promptLength: req.body.prompt?.length || 0
    });

    const result = await routeLLMRequest(input);
    res.json(result);
    
  } catch (err) {
    console.error("❌ Route error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ========== SMART DOCUMENT PROCESSING (two-stage) ========== */
app.post("/api/agent/smart-document", upload.single("file"), async (req, res) => {
  try {
    console.log("🧠 Smart document processing request");
    
    const audioFile = req.files?.file?.[0] || req.file;
    if (!audioFile) {
      return res.status(400).json({ error: "Nema audio file-a" });
    }

    // Get document registry context
    const documentContext = documentRegistry.getLLMDocumentContext();
    console.log(`📚 Available documents: ${documentContext.totalDocuments}`);

    // Stage 1: Transcribe audio and match document
    console.log("🎤 Stage 1: Transcription + Document Matching");
    
    // Transcribe audio
    const tempPath = `./tmp_${Date.now()}.webm`;
    fs.writeFileSync(tempPath, audioFile.buffer);
    
    const transcription = await client.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: "whisper-1",
    });
    
    fs.unlinkSync(tempPath);
    console.log("✅ Transcript:", transcription.text);

    // Match document using LLM
    const matchingPrompt = `
Analiziraj glasovnu naredbu i pronađi odgovarajući dokument:

GLASOVNA NAREDBA: "${transcription.text}"

DOSTUPNI DOKUMENTI:
${documentContext.documentList.map(doc => `- ${doc.id}: ${doc.name} (${doc.type})`).join('\n')}

Zadatak:
1. Identificiraj koji dokument korisnik traži
2. Identificiraj što želi napraviti s tim dokumentom
3. Vrati JSON objekt s rezultatom

Primjer odgovora:
{
  "matchedDocument": {
    "id": "doc_3",
    "filename": "testni.pdf",
    "confidence": 0.95
  },
  "command": {
    "action": "analyze",
    "query": "kolika je ukupna ponuda"
  },
  "reasoning": "Korisnik traži dokument 'testni.pdf' i želi znati ukupnu vrijednost ponude"
}

Ako dokument nije pronađen, vrati "matchedDocument": null.
`;

    const matchResponse = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "Ti si specijalist za pronalaženje dokumenata. Vrati čisti JSON objekt."
      }, {
        role: "user",
        content: matchingPrompt
      }],
      temperature: 0.1
    });

    // Parse matching result
    let matchResult;
    try {
      const rawMatch = matchResponse.choices[0].message.content;
      const cleanMatch = rawMatch.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
      matchResult = JSON.parse(cleanMatch);
    } catch (parseError) {
      console.error("❌ Match result parse error:", parseError);
      return res.status(500).json({ error: "Greška pri parsiranju rezultata matchiranja" });
    }

    console.log("🎯 Document match result:", matchResult);

    if (!matchResult.matchedDocument) {
      return res.json({
        stage: "matching_complete",
        transcript: transcription.text,
        matchResult,
        error: "Dokument nije pronađen",
        availableDocuments: documentContext.documentList
      });
    }

    // Stage 2: Process matched document
    console.log("📄 Stage 2: Document Processing");
    
    const document = documentRegistry.getDocumentForProcessing(matchResult.matchedDocument.id);
    if (!document) {
      return res.status(404).json({ error: "Dokument nije dostupan za obradu" });
    }

    // Process document based on command
    const analysisPrompt = `
Analiziraj priloženi dokument i odgovori na sljedeći upit:

ORIGINAL NAREDBA: "${transcription.text}"
SPECIFIČNI UPIT: "${matchResult.command.query}"
DOKUMENT: ${document.filename}

Zadaci:
1. Analiziraj sadržaj dokumenta
2. Odgovori precizno na postavljeni upit
3. Izvuci relevantne podatke
4. Vrati rezultat u JSON formatu

Odgovori strukturirano s ključnim podacima.
`;

    // Process document based on type
    let analysisResponse;
    
    if (document.type === 'image') {
      // Image processing with GPT-4o Vision
      console.log(`🖼️ Processing image: ${document.filename}`);
      const base64Image = document.content.toString('base64');
      const mimeType = document.filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      
      analysisResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "Ti si specijalist za analizu slika i dokumenata. Analiziraj sliku detaljno i vrati strukturirane podatke u JSON formatu."
        }, {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { 
              type: "image_url", 
              image_url: { url: `data:${mimeType};base64,${base64Image}` }
            }
          ]
        }],
        temperature: 0.1
      });
    } else if (document.type === 'document') {
      // PDF/Document processing with Vision model
      console.log(`📄 Processing document: ${document.filename}`);
      
      if (document.filename.toLowerCase().endsWith('.pdf')) {
        // For PDFs, send as image to GPT-4o Vision (PDFs can be processed as images)
        const base64Pdf = document.content.toString('base64');
        
        analysisResponse = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: "Ti si specijalist za analizu PDF dokumenata. Analiziraj PDF detaljno i vrati strukturirane podatke u JSON formatu."
          }, {
            role: "user",
            content: [
              { type: "text", text: analysisPrompt },
              { 
                type: "image_url", 
                image_url: { url: `data:application/pdf;base64,${base64Pdf}` }
              }
            ]
          }],
          temperature: 0.1
        });
      } else {
        // Other document types - enhanced text analysis
        analysisResponse = await client.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "system", 
            content: "Ti si specijalist za analizu dokumenata. Na temelju opisa dokumenta i pitanja, daj najbolji mogući odgovor strukturiran u JSON formatu."
          }, {
            role: "user",
            content: analysisPrompt + `\n\nDokument informacije:\n- Naziv: ${document.filename}\n- Tip: ${document.type}\n- Veličina: ${(document.size/1024).toFixed(1)}KB\n- Lokacija: ${document.path}\n\nNapomena: Ovo je ${document.type} datoteka. Analiziraj na temelju naziva i konteksta upita što je najvjerojatniji sadržaj i odgovori na upit.`
          }],
          temperature: 0.1
        });
      }
    } else {
      // Other file types - basic analysis
      console.log(`📋 Processing file: ${document.filename} (${document.type})`);
      
      analysisResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: "Ti si specijalist za analizu datoteka. Analiziraj na temelju dostupnih informacija i vrati strukturirane podatke u JSON formatu."
        }, {
          role: "user",
          content: analysisPrompt + `\n\nDatoteka: ${document.filename} (${document.type}, ${(document.size/1024).toFixed(1)}KB)`
        }],
        temperature: 0.1
      });
    }

    // Parse analysis result
    let analysisResult;
    try {
      const rawAnalysis = analysisResponse.choices[0].message.content;
      const cleanAnalysis = rawAnalysis.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
      analysisResult = JSON.parse(cleanAnalysis);
    } catch (parseError) {
      console.warn("⚠️ Analysis parse failed, using raw text");
      analysisResult = {
        rawResponse: analysisResponse.choices[0].message.content,
        extracted: false
      };
    }

    // Final response
    const finalResult = {
      stage: "complete",
      transcript: transcription.text,
      matchResult,
      document: {
        id: document.id,
        filename: document.filename,
        type: document.type,
        size: document.size
      },
      analysis: analysisResult,
      processing: {
        stage1: "Document matched successfully",
        stage2: "Document analyzed successfully",
        totalTime: Date.now() - Date.now() // TODO: Proper timing
      },
      timestamp: new Date().toISOString()
    };

    console.log("✅ Smart document processing complete");
    res.json(finalResult);

  } catch (err) {
    console.error("❌ Smart document processing error:", err);
    res.status(500).json({ 
      error: err.message,
      stage: "failed",
      availableDocuments: documentRegistry.getDocumentList()
    });
  }
});

/* ========== DOCUMENT REGISTRY ENDPOINTS ========== */
app.get("/api/documents", (req, res) => {
  try {
    const documents = documentRegistry.getDocumentList();
    const stats = documentRegistry.getStats();
    
    res.json({
      documents,
      stats,
      lastScanned: documentRegistry.lastScan
    });
  } catch (err) {
    console.error("❌ Documents list error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/documents/refresh", (req, res) => {
  try {
    const count = documentRegistry.refresh();
    res.json({ 
      message: "Document registry refreshed",
      documentCount: count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Document refresh error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint za Online LLM obradu dokumenata
app.post("/api/process-document", async (req, res) => {
  try {
    const { documentId, documentName, query, language = 'hr' } = req.body;
    
    if (!documentName || !query) {
      return res.status(400).json({ 
        error: true, 
        message: 'Nedostaju potrebni podaci: documentName i query' 
      });
    }

    console.log(`🧠 Processing document: ${documentName} with query: ${query}`);

    // Probaj pronaći dokument u registru
    let document = documentRegistry.findByName(documentName);
    
    if (!document) {
      // Ako nema u registru, obnovi registar i pokušaj ponovo
      documentRegistry.refresh();
      document = documentRegistry.findByName(documentName);
      
      if (!document) {
        return res.status(404).json({
          error: true,
          message: `Dokument '${documentName}' nije pronađen u registru dokumenata`
        });
      }
    }

    // Procesiraj dokument na osnovu tipa
    let documentContent = '';
    let mimeType = '';

    if (document.type === 'image') {
      // Za slike koristimo base64 encoding
      const imageBuffer = fs.readFileSync(document.path);
      const base64Image = imageBuffer.toString('base64');
      const ext = document.filename.split('.').pop().toLowerCase();
      mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const analysisPrompt = language === 'hr' 
        ? `Analiziraj sliku dokumenta na hrvatskom jeziku i odgovori na pitanje: "${query}"`
        : `Analyze this document image and answer the question: "${query}"`;

      const analysisResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            { 
              type: "image_url", 
              image_url: { 
                url: `data:${mimeType};base64,${base64Image}` 
              }
            }
          ]
        }],
        max_tokens: 1000
      });

      documentContent = analysisResponse.choices[0]?.message?.content || 'Nema odgovora';
      
    } else if (document.type === 'document' && document.filename.toLowerCase().endsWith('.pdf')) {
      // Za PDF dokumente
      try {
        const pdfBuffer = fs.readFileSync(document.path);
        const base64Pdf = pdfBuffer.toString('base64');
        
        const analysisPrompt = language === 'hr'
          ? `Analiziraj PDF dokument na hrvatskom jeziku i odgovori na pitanje: "${query}". PDF je kodiran u base64.`
          : `Analyze this PDF document and answer the question: "${query}". PDF is base64 encoded.`;

        const analysisResponse = await client.chat.completions.create({
          model: "gpt-4o-mini", 
          messages: [{
            role: "user",
            content: analysisPrompt + "\n\nBase64 PDF content: " + base64Pdf.substring(0, 4000) // Ograniči na prvi dio
          }],
          max_tokens: 1000
        });

        documentContent = analysisResponse.choices[0]?.message?.content || 'Nema odgovora';
        
      } catch (pdfError) {
        console.error('PDF processing error:', pdfError);
        documentContent = 'Greška pri obradi PDF dokumenta';
      }
      
    } else if (document.type === 'text' || document.filename.toLowerCase().endsWith('.txt')) {
      // Za tekstualne datoteke
      documentContent = fs.readFileSync(document.path, 'utf-8');
      
      const analysisPrompt = language === 'hr'
        ? `Na osnovu sljedećeg sadržaja dokumenta, odgovori na pitanje na hrvatskom jeziku: "${query}"\n\nSadržaj:\n${documentContent}`
        : `Based on the following document content, answer the question: "${query}"\n\nContent:\n${documentContent}`;

      const analysisResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: analysisPrompt }],
        max_tokens: 1000
      });

      documentContent = analysisResponse.choices[0]?.message?.content || 'Nema odgovora';
      
    } else {
      // Za ostale tipove dokumenata
      const analysisPrompt = language === 'hr'
        ? `Dokument '${documentName}' (tip: ${document.type}) je pronađen, ali trenutno nije moguće analizirati ovaj tip datoteke. Pitanje: "${query}"`
        : `Document '${documentName}' (type: ${document.type}) was found, but this file type cannot be analyzed currently. Question: "${query}"`;

      const analysisResponse = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: analysisPrompt }],
        max_tokens: 500
      });

      documentContent = analysisResponse.choices[0]?.message?.content || 'Tip datoteke nije podržan za analizu';
    }

    // Generiraj confidence score na osnovu duljine odgovora i postojanja ključnih riječi
    let confidence = 75; // Bazna pouzdanost
    if (documentContent.length > 100) confidence += 10;
    if (documentContent.includes(query.split(' ')[0])) confidence += 10;
    if (documentContent.toLowerCase().includes('greška') || documentContent.toLowerCase().includes('error')) confidence -= 20;
    confidence = Math.max(0, Math.min(100, confidence));

    const result = {
      success: true,
      documentName: document.filename,
      documentType: document.type,
      query: query,
      response: documentContent,
      confidence: confidence,
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - Date.now() // Placeholder
    };

    console.log(`✅ Document processed successfully: ${document.filename}`);
    res.json(result);

  } catch (error) {
    console.error("❌ Document processing error:", error);
    res.status(500).json({
      error: true,
      message: 'Greška pri obradi dokumenta: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/* ========== GANTT VOICE AGENT API ROUTES ========== */

// Gantt Voice Agent - glavna ruta za voice-to-gantt konverziju
app.post("/api/agent/gantt-voice", upload.single("audio"), async (req, res) => {
  try {
    const { transcript, draftContext, projectId } = req.body;
    let audioFile = req.file;
    
    console.log(`🎤 Gantt Voice Agent request:`, {
      hasAudio: !!audioFile,
      hasTranscript: !!transcript,
      projectId,
      draftContextKeys: draftContext ? Object.keys(JSON.parse(draftContext || '{}')) : []
    });

    let userInput = transcript;
    
    // Ako imamo audio file, prvo ga provo kroz Whisper
    if (audioFile && !transcript) {
      console.log(`🎧 Transcribing audio file: ${audioFile.originalname}`);
      
      const transcribeResponse = await client.audio.transcriptions.create({
        file: fs.createReadStream(audioFile.path),
        model: "whisper-1",
        language: "hr",
        response_format: "json"
      });
      
      userInput = transcribeResponse.text;
      console.log(`📝 Transcript: "${userInput}"`);
      
      // Cleanup temp file
      fs.unlinkSync(audioFile.path);
    }

    if (!userInput) {
      return res.status(400).json({
        error: true,
        message: 'Nema audio datoteke niti transcript teksta'
      });
    }

    // Parse draft context
    const draft = draftContext ? JSON.parse(draftContext) : null;
    
    // Generiraj system prompt za Gantt Agent
    const systemPrompt = `Ti si Agent za Gantt (Montaža) u React/Vite sučelju. Radiš isključivo nad draft prikazom Ganttograma za jedan projekt i proces Montaža.

## Cilj
Generirati i iterativno ispravljati draft raspored montaže po pozicijama, uz per-linijsko potvrđivanje i tek nakon toga commit u backend.

## Jezik i komunikacija
- Komuniciraš na hrvatskom (HR)
- Glasovne upute su HR, odgovori su HR  
- Kratki i operativni odgovori
- Vrijeme: Europe/Zagreb, radni dani pon–pet 08:00–16:00

## JSON Response Format
Uvijek vrati JSON objekt tipa "gantt_agent_response" sa poljima:
- tts: kratki govorni odgovor (max 50 riječi)
- reasoning_summary: sažetak plana (max 100 riječi)  
- next_prompt: pitanje za korisnika
- intent: tip operacije (schedule_all, set_line_dates, confirm_line, etc.)
- commit_mode: false (dok sve nije potvrđeno)
- ui_patches: array operacija za UI
- backend_ops: operacije za backend (samo kod commit)
- validation: {ok: boolean, issues: string[]}

## Podržane intencije
- schedule_all: generiraj cijeli draft raspored
- set_date_range: postavi raspon datuma  
- set_line_dates: postavi termine za jednu liniju
- shift_line: pomakni liniju u vremenu
- set_duration: promijeni trajanje
- set_teams: postavi broj ekipa
- confirm_line: potvrdi liniju
- reject_line: odbaci liniju  
- commit_draft: finalni commit
- cancel: prekini
- help: pomoć

## Trenutno stanje draft-a:
${draft ? JSON.stringify(draft, null, 2) : 'Nema aktivnog draft-a'}`;

    // Poziv GPT-4o-mini za Gantt Agent response
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Korisničko pitanje: "${userInput}"` }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    let agentResponse;
    try {
      agentResponse = JSON.parse(completion.choices[0].message.content);
      
      // Validacija response format-a
      if (!agentResponse.type) agentResponse.type = "gantt_agent_response";
      if (!agentResponse.tts) agentResponse.tts = "Razumijem vaš zahtjev.";
      if (!agentResponse.validation) agentResponse.validation = { ok: true, issues: [] };
      
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      // Fallback response
      agentResponse = {
        type: "gantt_agent_response",
        tts: "Izvinjavam se, došlo je do greške u obradi.",
        reasoning_summary: "Parsing error occurred",
        next_prompt: "Možete li ponoviti zahtjev?",
        intent: "error",
        commit_mode: false,
        ui_patches: [],
        backend_ops: [],
        validation: { ok: false, issues: ["Response parsing failed"] }
      };
    }

    const result = {
      success: true,
      transcript: userInput,
      agent_response: agentResponse,
      processing_time: Date.now() - Date.now(),
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Gantt Voice Agent response generated:`, {
      intent: agentResponse.intent,
      patches: agentResponse.ui_patches?.length || 0,
      tts_length: agentResponse.tts?.length || 0
    });

    res.json(result);

  } catch (error) {
    console.error("❌ Gantt Voice Agent error:", error);
    res.status(500).json({
      error: true,
      message: 'Greška u Gantt Voice Agent: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Gantt Intent Recognition - brzo prepoznavanje namjere bez punog LLM poziva
app.post("/api/llm/gantt-intent", async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }

    console.log(`🧠 Gantt intent recognition: "${text}"`);

    const intentPrompt = `Analiziraj sljedeći hrvatski tekst i vrati SAMO JSON objekt s prepoznatom namjerom za Gantt upravljanje:

Tekst: "${text}"

Moguce intencije:
- schedule_all: "rasporedi sve", "generiraj raspored", "napravi gantt"
- set_dates: "pomakni na", "počni od", "završi do" 
- confirm: "potvrđujem", "u redu", "slažem se"
- cancel: "odustani", "prekini", "zatvori"
- help: "pomoć", "kako", "što mogu"

Vrati JSON:
{
  "intent": "intent_name",
  "confidence": 0.85,
  "entities": {"dates": [], "positions": [], "teams": 0}
}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [{ role: "user", content: intentPrompt }],
      max_tokens: 200,
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const intentResponse = JSON.parse(completion.choices[0].message.content);
    
    res.json({
      success: true,
      ...intentResponse,
      processing_time: Date.now() - Date.now()
    });

  } catch (error) {
    console.error("❌ Gantt intent error:", error);
    res.status(500).json({
      error: true,
      message: 'Intent recognition error: ' + error.message
    });
  }
});

// Gantt Draft Operations - CRUD operacije nad draft-om
app.post("/api/gantt/draft", async (req, res) => {
  try {
    const { operation, draftId, data } = req.body;
    
    console.log(`📋 Gantt Draft operation: ${operation}`, { draftId, dataKeys: Object.keys(data || {}) });
    
    // Simulacija draft operacija (u realnoj implementaciji bi se koristila baza ili cache)
    const response = {
      success: true,
      operation,
      draftId,
      result: null,
      timestamp: new Date().toISOString()
    };

    switch (operation) {
      case 'create':
        response.result = {
          draftId: `draft_${Date.now()}`,
          projectId: data.projectId,
          process: data.process || 'montaza',
          dateRange: data.dateRange || null,
          teams: data.teams || 1,
          workHours: { start: "08:00", end: "16:00" },
          lines: {},
          activeLineId: null,
          created: new Date().toISOString(),
          status: 'active'
        };
        break;
        
      case 'update':
        response.result = {
          updated: true,
          changes: data
        };
        break;
        
      case 'delete':
        response.result = {
          deleted: true,
          draftId
        };
        break;
        
      default:
        return res.status(400).json({
          error: true,
          message: `Unknown operation: ${operation}`
        });
    }

    res.json(response);
    
  } catch (error) {
    console.error("❌ Gantt Draft error:", error);
    res.status(500).json({
      error: true,
      message: 'Draft operation error: ' + error.message
    });
  }
});

/* ========== PDF Document Endpoints ========== */

// GET /api/documents/list - Lista dostupnih PDF dokumenata
app.get('/api/documents/list', (req, res) => {
  try {
    const backendPath = path.resolve('src/backend');
    const files = fs.readdirSync(backendPath);
    
    const pdfDocs = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(filename => ({
        filename: filename.replace('.pdf', ''),
        fullFilename: filename,
        path: path.join(backendPath, filename)
      }));

    res.json({
      success: true,
      documents: pdfDocs,
      count: pdfDocs.length
    });
    
  } catch (error) {
    console.error('❌ Documents list error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/documents/:filename/info - PDF metadata (broj stranica)
app.get('/api/documents/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params;
    const pdfPath = path.resolve('src/backend', `${filename}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        error: `Dokument "${filename}.pdf" nije pronađen`
      });
    }

    // For now, return basic info without PDF.js
    // TODO: Implement PDF.js page counting
    const stats = fs.statSync(pdfPath);
    
    res.json({
      success: true,
      document: {
        filename: filename,
        fullFilename: `${filename}.pdf`,
        path: pdfPath,
        size: stats.size,
        pages: 'unknown' // Placeholder until PDF.js integration
      }
    });
    
  } catch (error) {
    console.error('❌ Document info error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/documents/:filename/pages/:pageNumber - Ekstraktiranje stranice
app.get('/api/documents/:filename/pages/:pageNumber', async (req, res) => {
  try {
    const { filename, pageNumber } = req.params;
    const page = parseInt(pageNumber, 10);
    
    if (!page || page < 1) {
      return res.status(400).json({
        success: false,
        error: 'Broj stranice mora biti pozitivni broj'
      });
    }

    const pdfPath = path.resolve('src/backend', `${filename}.pdf`);
    
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({
        success: false,
        error: `Dokument "${filename}.pdf" nije pronađen`
      });
    }

    // For now, return PDF path for direct browser rendering
    // TODO: Implement PDF.js page extraction to base64/PNG
    const relativePath = `/src/backend/${filename}.pdf#page=${page}`;
    
    res.json({
      success: true,
      page: {
        filename: filename,
        pageNumber: page,
        url: relativePath,
        extractedImage: null // Placeholder for base64 image
      }
    });
    
  } catch (error) {
    console.error('❌ Page extraction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* ========== Excel Agent Helper Functions ========== */

/**
 * Execute Excel operations on a session
 */
async function executeExcelOperations(sessionId, actions) {
  console.log(`📊 Excel Agent: Executing ${actions.length} operations for session ${sessionId}`);

  const session = ExcelStore.getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.workbook) {
    throw new Error('No workbook loaded in session');
  }

  const applied = [];
  const errors = [];

  // Load the Excel workbook
  console.log('🔍 XLSX available methods:', Object.keys(XLSX));

  // Try different ways to access readFile
  const readFile = XLSX.readFile || XLSX.default?.readFile || XLSX.utils?.readFile;

  if (!readFile) {
    throw new Error('XLSX.readFile function not available');
  }

  const workbook = readFile(session.workbook.path);

  for (const action of actions) {
    try {
      console.log(`🔧 Executing action: ${action.type} on ${action.target}`);

      if (action.type === 'formatCell') {
        // Get the worksheet
        const worksheet = workbook.Sheets[action.sheet || 'Sheet1'];
        if (!worksheet) {
          throw new Error(`Sheet '${action.sheet}' not found`);
        }

        // Apply formatting (XLSX library has limited formatting support)
        const cell = worksheet[action.target] || {};

        // Set cell properties
        if (action.style) {
          cell.s = cell.s || {};

          // Background color (limited support in XLSX)
          if (action.style.backgroundColor) {
            cell.s.fill = {
              fgColor: { rgb: action.style.backgroundColor.replace('#', '') }
            };
          }

          // Font styles
          if (action.style.fontWeight === 'bold' || action.style.color || action.style.fontSize) {
            cell.s.font = cell.s.font || {};
            if (action.style.fontWeight === 'bold') cell.s.font.bold = true;
            if (action.style.color) cell.s.font.color = { rgb: action.style.color.replace('#', '') };
            if (action.style.fontSize) cell.s.font.sz = action.style.fontSize;
          }
        }

        worksheet[action.target] = cell;
        applied.push(`${action.type} on ${action.target} - formatted`);

      } else if (action.type === 'updateCell') {
        // Get the worksheet
        const worksheet = workbook.Sheets[action.sheet || 'Sheet1'];
        if (!worksheet) {
          throw new Error(`Sheet '${action.sheet}' not found`);
        }

        // Update cell value
        worksheet[action.target] = { t: 's', v: action.value };
        applied.push(`${action.type} on ${action.target} - set to "${action.value}"`);

      } else {
        throw new Error(`Unsupported action type: ${action.type}`);
      }

      // Add event to session for SSE
      ExcelStore.addEvent(sessionId, {
        type: 'action',
        message: `Applied ${action.type} to ${action.target}`,
        data: action
      });

    } catch (error) {
      console.error(`❌ Action failed: ${action.type}:`, error);
      errors.push(`${action.type}: ${error.message}`);
    }
  }

  // Save the modified workbook back to the file
  try {
    const writeFile = XLSX.writeFile || XLSX.default?.writeFile || XLSX.utils?.writeFile;

    if (!writeFile) {
      throw new Error('XLSX.writeFile function not available');
    }

    writeFile(workbook, session.workbook.path);
    console.log(`💾 Saved changes to: ${session.workbook.path}`);
  } catch (saveError) {
    console.error(`❌ Failed to save workbook:`, saveError);
    errors.push(`Save failed: ${saveError.message}`);
  }

  const result = {
    applied,
    errors,
    stats: {
      totalActions: actions.length,
      appliedActions: applied.length,
      errorCount: errors.length
    }
  };

  console.log(`✅ Excel Agent: Operations completed for session ${sessionId}`);
  return result;
}

/* ========== Excel Agent API Routes ========== */

// POST /api/llm/excel-planner - Convert natural language to Excel actions
app.post("/api/llm/excel-planner", async (req, res) => {
  try {
    const { prompt, sessionId, activeSheet, selection, context } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`🤖 Excel Planner: Processing prompt for session ${sessionId}`);
    console.log(`📝 Prompt: "${prompt}"`);
    console.log(`📊 Context: Sheet=${activeSheet}, Selection=${selection?.range || 'none'}`);

    // Generate planning prompt for the LLM
    const planningPrompt = `You are an Excel AI assistant that converts natural language commands into structured Excel actions.

CONTEXT:
- Active sheet: ${activeSheet || 'Unknown'}
- Available sheets: ${context?.sheets?.join(', ') || 'Unknown'}
- Current selection: ${selection?.range || 'None'}
- Workbook: ${context?.workbookInfo?.name || 'Unknown'}

USER COMMAND: "${prompt}"

INSTRUCTIONS:
1. Interpret the user's natural language command
2. Convert it to precise Excel actions using the supported action types
3. Use A1 notation for cell references (e.g., "A1", "B5", "C10")
4. For ranges, use format "A1:B5"
5. Be conservative - if uncertain, provide simple actions

SUPPORTED ACTIONS:
- updateCell: Change cell value
- formatCell: Apply styling (bold, italic, colors, alignment, font size)
- insertRow/deleteRow: Add or remove rows
- setRowHeight/setColumnWidth: Adjust dimensions
- mergeCells: Merge cell ranges

RESPONSE FORMAT: Return valid JSON with actions array, reasoning, and confidence score.

Examples:
"Make A1 bold" → [{"type": "formatCell", "sheet": "${activeSheet || 'Sheet1'}", "target": "A1", "style": {"bold": true}}]
"Change B2 to Hello" → [{"type": "updateCell", "sheet": "${activeSheet || 'Sheet1'}", "target": "B2", "value": "Hello"}]
"Change cell A1 background color to blue" → [{"type": "formatCell", "sheet": "${activeSheet || 'Sheet1'}", "target": "A1", "style": {"backgroundColor": "#0000FF"}}]

Respond with JSON only - no explanatory text before or after:
{
  "actions": [...],
  "reasoning": "explanation of what will be done",
  "confidence": 0.8
}`;

    try {
      // Call your hosted LLM
      const LLM_BASE_URL = 'http://192.168.30.11:1234';
      const LLM_MODEL = 'qwen3-4b-thinking-2507';

      console.log(`🤖 Calling hosted LLM at ${LLM_BASE_URL} with model ${LLM_MODEL}`);

      const llmResponse = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an Excel AI assistant. When users request Excel operations, you MUST call the appropriate function.

CRITICAL RULES:
- ALWAYS use function calls for Excel operations
- DO NOT output JSON in text content
- DO NOT include <think> blocks
- DO NOT explain what you're doing
- ONLY call the function with the correct parameters

Available functions: formatCell, updateCell, insertRow`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "formatCell",
                description: "Apply formatting to Excel cells (colors, fonts, alignment)",
                parameters: {
                  type: "object",
                  properties: {
                    sheet: {
                      type: "string",
                      description: "Sheet name (e.g., 'Sheet1')"
                    },
                    target: {
                      type: "string",
                      description: "Cell reference in A1 notation (e.g., 'A1', 'B5:C10')"
                    },
                    style: {
                      type: "object",
                      properties: {
                        backgroundColor: { type: "string", description: "Hex color code (e.g., '#FF0000')" },
                        color: { type: "string", description: "Text color hex code" },
                        fontWeight: { type: "string", description: "'bold' or 'normal'" },
                        fontStyle: { type: "string", description: "'italic' or 'normal'" },
                        fontSize: { type: "number", description: "Font size in points" }
                      }
                    }
                  },
                  required: ["sheet", "target", "style"]
                }
              }
            },
            {
              type: "function",
              function: {
                name: "updateCell",
                description: "Update cell values",
                parameters: {
                  type: "object",
                  properties: {
                    sheet: { type: "string", description: "Sheet name" },
                    target: { type: "string", description: "Cell reference (A1 notation)" },
                    value: { type: "string", description: "New cell value" }
                  },
                  required: ["sheet", "target", "value"]
                }
              }
            }
          ],
          tool_choice: "required",
          temperature: 0.1,
          max_tokens: 4096,
          stream: false
        })
      });

      if (!llmResponse.ok) {
        throw new Error(`LLM API error: ${llmResponse.status} ${llmResponse.statusText}`);
      }

      const llmData = await llmResponse.json();

      if (!llmData.choices || !llmData.choices[0] || !llmData.choices[0].message) {
        throw new Error('Invalid LLM response structure');
      }

      const message = llmData.choices[0].message;
      const responseText = message.content;
      const toolCalls = message.tool_calls;

      console.log(`🔍 LLM Response - Content: ${responseText?.length || 0} chars, Tool calls: ${toolCalls?.length || 0}`);

      // Parse and validate response
      let parsedResult;

      // Process tool calls if available
      if (toolCalls && toolCalls.length > 0) {
        console.log(`🔧 Processing ${toolCalls.length} tool calls`);

        const actions = toolCalls.map(toolCall => {
          const { name, arguments: args } = toolCall.function;
          console.log(`📞 Tool call: ${name} with args:`, args);

          // Parse arguments if they're a string
          const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

          return {
            type: name,
            ...parsedArgs
          };
        });

        parsedResult = {
          actions,
          reasoning: "Tool functions called by LLM",
          confidence: 0.95
        };
      } else {
        // Fallback to content parsing
        console.log(`📝 No tool calls, parsing content as JSON`);
        try {
          // Clean response - remove any non-JSON content
          let cleanedResponse = responseText.trim();

          // Remove think tags if present (for hosted LLM that outputs thinking)
          const beforeCleaning = cleanedResponse.length;
          cleanedResponse = cleanedResponse.replace(/<think>[\s\S]*?<\/think>/g, '');
          const afterCleaning = cleanedResponse.length;

          if (beforeCleaning !== afterCleaning) {
            console.log(`🧹 [Server] Removed thinking tags: ${beforeCleaning} -> ${afterCleaning} chars`);
          }

          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
          cleanedResponse = cleanedResponse.trim();

          const jsonStart = cleanedResponse.indexOf('{');
          const jsonEnd = cleanedResponse.lastIndexOf('}');

          if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('No JSON object found in response');
          }

          const jsonStr = cleanedResponse.substring(jsonStart, jsonEnd + 1);
          parsedResult = JSON.parse(jsonStr);

          // Basic validation
          if (!parsedResult.actions || !Array.isArray(parsedResult.actions)) {
            throw new Error('Response must contain actions array');
          }

          // Validate each action has required fields
          for (const action of parsedResult.actions) {
            if (!action.type || !action.sheet || !action.target) {
              throw new Error(`Invalid action: missing required fields in ${JSON.stringify(action)}`);
            }
          }

        } catch (parseError) {
          console.error('❌ Failed to parse LLM response:', parseError);
          console.error('Raw response:', responseText);

          // Generate fallback actions for simple patterns
          const lowerPrompt = prompt.toLowerCase();
          let fallbackActions = [];

          if (lowerPrompt.includes('background') && lowerPrompt.includes('color') && lowerPrompt.includes('blue') && lowerPrompt.includes('a1')) {
            fallbackActions = [{
              type: 'formatCell',
              sheet: activeSheet || 'Sheet1',
              target: 'A1',
              style: { backgroundColor: '#0000FF' }
            }];
          } else if (lowerPrompt.includes('color') && lowerPrompt.includes('red') && lowerPrompt.includes('a1')) {
            fallbackActions = [{
              type: 'formatCell',
              sheet: activeSheet || 'Sheet1',
              target: 'A1',
              style: { backgroundColor: '#FF0000' }
            }];
          }

          if (fallbackActions.length > 0) {
            parsedResult = {
              actions: fallbackActions,
              reasoning: "Fallback pattern matching used due to LLM parsing failure",
              confidence: 0.3
            };
          } else {
            throw parseError;
          }
        }
      }

      console.log(`✅ Parsed ${parsedResult.actions.length} actions with confidence ${parsedResult.confidence || 'unknown'}`);
      console.log(`💭 Reasoning: ${parsedResult.reasoning}`);

      // Execute the actions immediately
      if (parsedResult.actions.length > 0) {
        console.log(`🔧 Executing ${parsedResult.actions.length} actions on session ${sessionId}`);

        try {
          // Execute actions via the Excel operations endpoint
          const executeResult = await executeExcelOperations(sessionId, parsedResult.actions);
          console.log(`✅ Excel operations completed:`, executeResult);

          return res.status(200).json({
            success: true,
            actions: parsedResult.actions,
            reasoning: parsedResult.reasoning,
            confidence: parsedResult.confidence || 0.8,
            executionResult: executeResult,
            sessionId,
            llmSource: 'hosted',
            timestamp: new Date().toISOString()
          });
        } catch (executeError) {
          console.error(`❌ Excel operations failed:`, executeError);

          return res.status(200).json({
            success: true,
            actions: parsedResult.actions,
            reasoning: parsedResult.reasoning,
            confidence: parsedResult.confidence || 0.8,
            executionError: executeError.message,
            sessionId,
            llmSource: 'hosted',
            timestamp: new Date().toISOString()
          });
        }
      } else {
        return res.status(200).json({
          success: true,
          actions: parsedResult.actions,
          reasoning: parsedResult.reasoning,
          confidence: parsedResult.confidence || 0.8,
          sessionId,
          llmSource: 'hosted',
          timestamp: new Date().toISOString()
        });
      }

    } catch (llmError) {
      console.error('❌ LLM call failed:', llmError);

      // Generate fallback actions based on simple pattern matching
      const lowerPrompt = prompt.toLowerCase();
      let fallbackActions = [];

      if (lowerPrompt.includes('background') && lowerPrompt.includes('color') && lowerPrompt.includes('blue') && lowerPrompt.includes('a1')) {
        fallbackActions = [{
          type: 'formatCell',
          sheet: activeSheet || 'Sheet1',
          target: 'A1',
          style: { backgroundColor: '#0000FF' }
        }];
      } else if (lowerPrompt.includes('bold') && lowerPrompt.includes('a1')) {
        fallbackActions = [{
          type: 'formatCell',
          sheet: activeSheet || 'Sheet1',
          target: 'A1',
          style: { bold: true }
        }];
      } else if (lowerPrompt.includes('insert row')) {
        const rowMatch = lowerPrompt.match(/row (\d+)/);
        const index = rowMatch ? parseInt(rowMatch[1]) + 1 : 2;
        fallbackActions = [{
          type: 'insertRow',
          sheet: activeSheet || 'Sheet1',
          target: `A${index}`,
          index: index,
          count: 1
        }];
      } else {
        fallbackActions = [{
          type: 'updateCell',
          sheet: activeSheet || 'Sheet1',
          target: 'A1',
          value: 'Updated by AI'
        }];
      }

      console.log(`🔄 Using fallback actions: ${fallbackActions.length} actions generated`);

      return res.status(200).json({
        success: true,
        actions: fallbackActions,
        reasoning: `Fallback pattern matching used (LLM error: ${llmError.message})`,
        confidence: 0.3,
        fallback: true,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Excel planner error:', error);

    return res.status(500).json({
      error: 'Failed to plan Excel actions',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/excel/session - Create new Excel session
app.post("/api/excel/session", (req, res) => {
  try {
    const sessionId = ExcelStore.createSession();
    console.log(`📊 Excel Agent: Created session ${sessionId}`);

    res.json({
      success: true,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('❌ Excel session creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/excel/open - Upload and open Excel file
app.post("/api/excel/open", upload.single("file"), async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const file = req.file;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Session ID required" });
    }

    if (!file) {
      return res.status(400).json({ success: false, error: "Excel file required" });
    }

    const session = ExcelStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    // Store file info in session
    session.workbook = {
      name: file.originalname,
      size: file.size,
      path: file.path,
      uploadedAt: new Date().toISOString()
    };

    // Mock sheet data for now
    session.sheets = [
      { name: "Sheet1", rows: 100, cols: 26, cellCount: 2600 },
      { name: "Data", rows: 50, cols: 8, cellCount: 400 }
    ];

    ExcelStore.addEvent(sessionId, {
      type: "status",
      message: `Excel file '${file.originalname}' loaded successfully`
    });

    console.log(`📊 Excel Agent: File uploaded to session ${sessionId}`);

    res.json({
      success: true,
      workbook: {
        name: file.originalname,
        sheets: session.sheets.length
      }
    });

  } catch (error) {
    console.error('❌ Excel file upload failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/excel/sheets - Get sheets list
app.get("/api/excel/sheets", (req, res) => {
  try {
    const sessionId = req.query.sessionId;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Session ID required" });
    }

    const session = ExcelStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    res.json({
      success: true,
      sheets: session.sheets
    });

  } catch (error) {
    console.error('❌ Excel sheets listing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/excel/range - Get cell range data
app.get("/api/excel/range", (req, res) => {
  try {
    const { sessionId, sheet, range } = req.query;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Session ID required" });
    }

    const session = ExcelStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    // Mock cell data
    res.json({
      success: true,
      range: range,
      cells: [
        [{ value: "Header 1", coordinate: "A1" }, { value: "Header 2", coordinate: "B1" }],
        [{ value: "Data 1", coordinate: "A2" }, { value: "Data 2", coordinate: "B2" }]
      ]
    });

  } catch (error) {
    console.error('❌ Excel range retrieval failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/excel/ops - Execute Excel operations
app.post("/api/excel/ops", async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const { actions, dryRun = false, transactionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "Session ID required" });
    }

    const session = ExcelStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    console.log(`📊 Excel Agent: Executing ${actions.length} operations for session ${sessionId}`);

    // Add processing events
    ExcelStore.addEvent(sessionId, {
      type: "status",
      message: `Starting execution of ${actions.length} operations...`
    });

    // Mock execution - in real implementation, this would use a proper Excel library
    const applied = [];
    const errors = [];
    const diff = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      ExcelStore.addEvent(sessionId, {
        type: "finding",
        message: `Executing ${action.type} on ${action.sheet}:${action.target}`
      });

      try {
        // Mock successful execution
        applied.push(`${action.type} on ${action.sheet}:${action.target}`);

        diff.push({
          sheet: action.sheet,
          row: 1,
          col: 1,
          before: { value: "old_value" },
          after: { value: action.value || "new_value" }
        });

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        errors.push(`Failed ${action.type}: ${error.message}`);
      }
    }

    // Add completion event
    ExcelStore.addEvent(sessionId, {
      type: "result",
      message: `Execution complete: ${applied.length} operations applied, ${errors.length} errors`,
      diff: diff
    });

    const result = {
      success: true,
      applied: applied,
      errors: errors,
      diff: diff,
      stats: {
        totalActions: actions.length,
        appliedActions: applied.length,
        errorCount: errors.length,
        cellsModified: diff.length
      },
      traceId: transactionId || uuidv4()
    };

    console.log(`✅ Excel Agent: Operations completed for session ${sessionId}`);

    res.json(result);

  } catch (error) {
    console.error('❌ Excel operations failed:', error);

    ExcelStore.addEvent(sessionId, {
      type: "error",
      message: `Execution failed: ${error.message}`
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/excel/export - Export workbook
app.post("/api/excel/export", (req, res) => {
  try {
    const { sessionId, format = "xlsx" } = req.body;

    console.log(`📥 Export request: sessionId=${sessionId}, format=${format}`);

    if (!sessionId) {
      console.error('❌ Export failed: No session ID provided');
      return res.status(400).json({ success: false, error: "Session ID required" });
    }

    const session = ExcelStore.getSession(sessionId);
    if (!session) {
      console.error(`❌ Export failed: Session ${sessionId} not found`);
      return res.status(404).json({ success: false, error: "Session not found" });
    }

    console.log(`📊 Session found: ${sessionId}, workbook:`, session.workbook);

    // Check if workbook exists
    if (!session.workbook) {
      console.error('❌ Export failed: No workbook in session');
      return res.status(400).json({ success: false, error: "No workbook loaded in session" });
    }

    // Check if file exists
    if (!session.workbook.path) {
      console.error('❌ Export failed: No file path in workbook');
      return res.status(400).json({ success: false, error: "No file path available" });
    }

    // Check if file exists on disk
    if (!fs.existsSync(session.workbook.path)) {
      console.error(`❌ Export failed: File not found at ${session.workbook.path}`);
      return res.status(400).json({ success: false, error: "File not found on disk" });
    }

    console.log(`✅ Exporting file: ${session.workbook.path}`);

    // Copy to easily accessible location for inspection
    const inspectionPath = path.join('E:\\UI REFACTOR\\aluminum-store-ui\\src\\backend', `EXPORTED_${Date.now()}.xlsx`);
    try {
      fs.copyFileSync(session.workbook.path, inspectionPath);
      console.log(`📋 File copied for inspection: ${inspectionPath}`);
    } catch (copyError) {
      console.warn('⚠️ Could not copy file for inspection:', copyError.message);
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="exported_workbook.${format}"`);

    // Send the file
    res.download(session.workbook.path, `exported_workbook.${format}`, (err) => {
      if (err) {
        console.error('❌ File download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: "File download failed" });
        }
      } else {
        console.log('✅ File export completed successfully');
      }
    });

  } catch (error) {
    console.error('❌ Excel export failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

// GET /api/excel/stream/:sessionId - SSE event stream
app.get("/api/excel/stream/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Stream connected' })}\n\n`);

  const session = ExcelStore.getSession(sessionId);
  if (!session) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Session not found' })}\n\n`);
    res.end();
    return;
  }

  let lastEventIndex = 0;

  // Send existing events
  session.events.slice(lastEventIndex).forEach(event => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });
  lastEventIndex = session.events.length;

  // Set up polling for new events
  const pollInterval = setInterval(() => {
    const currentSession = ExcelStore.getSession(sessionId);
    if (!currentSession) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Session expired' })}\n\n`);
      clearInterval(pollInterval);
      res.end();
      return;
    }

    // Send new events
    const newEvents = currentSession.events.slice(lastEventIndex);
    newEvents.forEach(event => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    lastEventIndex = currentSession.events.length;
  }, 500);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(pollInterval);
  });
});

// Cleanup Excel sessions periodically
setInterval(() => {
  ExcelStore.cleanup();
}, 60000); // Every minute

/* ========== Pokreni server ========== */
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ API server radi na http://localhost:${PORT}`);
  console.log(`📊 Excel Agent API dostupan na /api/excel/*`);
});
