/**
 * Voice-enabled Document Processing Server
 * OpenAI Responses API + Realtime API integration
 * 
 * Features:
 * - Croatian voice processing (Web Speech + OpenAI Realtime)
 * - Known documents management (IndexedDB sync)
 * - Smart document processing with structured extraction
 * - Tool-calling orchestration with custom tools
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Load environment variables from both .env and .env.local
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
}

// Check if OpenAI is available
let OpenAI = null;
let openai = null;

try {
  OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ OpenAI SDK loaded successfully');
} catch (error) {
  console.warn('⚠️ OpenAI SDK not installed. Run: npm install openai');
  console.warn('   Voice processing will use fallback methods');
}

const PORT = process.env.PORT || 3000;

// Express setup
const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('dist')); // Serve Vite build

/* ====================== Background Images API ====================== */
const BG_DIR = process.env.BG_SCREENSHOTS_DIR || (process.platform === 'win32' ? 'C:/Users/Josip/Pictures/Screenshots' : process.env.HOME || '/tmp');
const IMG_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function isUnderDir(filePath, baseDir) {
  try {
    const rel = path.relative(path.resolve(baseDir), path.resolve(filePath));
    return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  } catch { return false; }
}

app.get('/api/bg/random', (req, res) => {
  try {
    const dir = BG_DIR;
    if (!dir || !fs.existsSync(dir)) {
      return res.json({ ok: false, reason: 'dir_missing' });
    }
    const files = fs.readdirSync(dir).filter(f => IMG_EXT.has(path.extname(f).toLowerCase()));
    if (!files.length) {
      return res.json({ ok: false, reason: 'no_images' });
    }
    const pick = files[Math.floor(Math.random() * files.length)];
    const full = path.join(dir, pick);
    return res.json({ ok: true, name: pick, url: `/api/bg/image?f=${encodeURIComponent(Buffer.from(full).toString('base64'))}` });
  } catch (e) {
    return res.json({ ok: false, reason: 'error', message: e.message });
  }
});

app.get('/api/bg/image', (req, res) => {
  const b64 = req.query.f;
  if (!b64) return res.status(400).send('missing file');
  try {
    const filePath = Buffer.from(String(b64), 'base64').toString('utf8');
    if (!isUnderDir(filePath, BG_DIR)) return res.status(403).send('forbidden');
    if (!fs.existsSync(filePath)) return res.status(404).send('not found');
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    res.setHeader('Content-Type', type);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.status(500).send('error');
  }
});

// Multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// In-memory storage (replace with database in production)
const KNOWN_DOCS = [];
const UPLOADS = new Map(); // uploadId -> file info

/* ====================== Known Documents API ====================== */

app.get('/api/docs', (req, res) => {
  res.json({
    docs: KNOWN_DOCS,
    count: KNOWN_DOCS.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/docs', (req, res) => {
  const { name, url, localOnly } = req.body || {};
  
  if (!name) {
    return res.status(400).json({ error: 'Document name is required' });
  }
  
  const id = uuidv4();
  const doc = {
    id,
    name,
    url: url || null,
    localOnly: Boolean(localOnly),
    createdAt: new Date().toISOString(),
    type: getDocumentType(name),
    filePath: localOnly ? path.join(__dirname, 'src', 'backend', 'Računi', name) : null
  };
  
  KNOWN_DOCS.push(doc);
  console.log(`📄 Added document: ${name} (${localOnly ? 'local' : 'remote'})`);
  
  res.status(201).json(doc);
});

app.delete('/api/docs/:id', (req, res) => {
  const index = KNOWN_DOCS.findIndex(doc => doc.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  const removed = KNOWN_DOCS.splice(index, 1)[0];
  console.log(`🗑️ Removed document: ${removed.name}`);
  
  res.json({ success: true, removed });
});

function getDocumentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const typeMap = {
    '.pdf': 'document',
    '.doc': 'document', 
    '.docx': 'document',
    '.xls': 'spreadsheet',
    '.xlsx': 'spreadsheet',
    '.txt': 'text',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image'
  };
  return typeMap[ext] || 'unknown';
}

/* ====================== File Upload API ====================== */

app.post('/api/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const uploadId = uuidv4();
  const fileInfo = {
    path: file.path,
    name: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString()
  };
  
  UPLOADS.set(uploadId, fileInfo);
  console.log(`📁 File uploaded: ${file.originalname} (${file.size} bytes)`);
  
  res.json({
    uploadId,
    name: file.originalname,
    size: file.size,
    type: getDocumentType(file.originalname)
  });
});

/* ====================== OpenAI Realtime API ====================== */

app.post('/api/agent/voice-token', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ 
      error: 'OpenAI not configured',
      fallback: 'Use Web Speech API instead'
    });
  }

  try {
    console.log('🎤 Creating Realtime session token...');
    
    const session = await openai.realtime.sessions.create({
      model: process.env.VITE_REALTIME_MODEL || "gpt-realtime-preview",
      voice: "alloy", // or "echo", "fable", "onyx", "nova", "shimmer"
      turn_detection: {
        type: "server_vad", // Voice Activity Detection
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      input_audio_transcription: {
        model: "whisper-1"
      },
      tools: [
        {
          type: "function",
          name: "list_known_docs",
          description: "Vrati listu poznatih dokumenata za korisnika",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        },
        {
          type: "function", 
          name: "send_document",
          description: "Pošalji dokument na obradu sa određenim upitom",
          parameters: {
            type: "object",
            properties: {
              docId: { type: "string", description: "ID dokumenta iz liste" },
              query: { type: "string", description: "Upit za obradu dokumenta" }
            },
            required: ["docId", "query"],
            additionalProperties: false
          }
        }
      ],
      instructions: `
Govoriš hrvatski jezik i pomaže korisnicima s obradom dokumenata glasovnim naredbama.

Kad korisnik kaže nešto poput "pošalji ponudu 001", first call list_known_docs to see available documents, then find the best match and call send_document.

Uvijek traži potvrdu prije slanja: "Našla sam Ponuda_001.pdf. Reci 'jasan zvuk' za potvrdu."

Odgovori su kratki i jasni na hrvatskom jeziku.
      `.trim()
    });
    
    console.log('✅ Realtime session created');
    res.json(session);
    
  } catch (error) {
    console.error('❌ Realtime session creation failed:', error);
    res.status(500).json({
      error: 'Failed to create Realtime session',
      message: error.message,
      fallback: 'Use Web Speech API instead'
    });
  }
});

/* ====================== Smart Document Processing ====================== */

app.post('/api/agent/smart-document', upload.single('file'), async (req, res) => {
  try {
    const { url, docId, uploadId, query } = req.body || {};
    let documentSource = null;
    
    console.log('🧠 Smart document processing started...');
    console.log('📋 Request params:', { url: !!url, docId: !!docId, uploadId: !!uploadId, hasFile: !!req.file });
    
    // Determine document source
    if (req.file) {
      // Direct file upload
      const tempUploadId = uuidv4();
      UPLOADS.set(tempUploadId, {
        path: req.file.path,
        name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      });
      documentSource = { type: 'upload', uploadId: tempUploadId };
    } else if (uploadId && UPLOADS.has(uploadId)) {
      // Previously uploaded file
      documentSource = { type: 'upload', uploadId };
    } else if (docId) {
      // Reference to known document
      const doc = KNOWN_DOCS.find(d => d.id === docId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found in known docs' });
      }
      if (doc.localOnly && !doc.filePath) {
        return res.status(409).json({ 
          needPicker: true, 
          message: 'Document is local-only. Upload required.',
          docName: doc.name
        });
      }
      documentSource = { type: 'known', doc };
    } else if (url) {
      // Remote URL
      documentSource = { type: 'remote', url };
    } else {
      return res.status(400).json({ error: 'No document source provided' });
    }
    
    // Process document based on source
    let result = {};
    
    if (documentSource.type === 'upload') {
      const fileInfo = UPLOADS.get(documentSource.uploadId);
      result = await processUploadedFile(fileInfo, query);
    } else if (documentSource.type === 'remote') {
      result = {
        docName: path.basename(documentSource.url),
        note: 'Remote URL processing not implemented in this demo',
        answer: { message: 'Would process remote document: ' + documentSource.url }
      };
    } else if (documentSource.type === 'known') {
      const doc = documentSource.doc;
      if (doc.filePath) {
        // Process local file
        const fs = require('fs');
        const fileStats = fs.statSync(doc.filePath);
        const fileInfo = {
          name: doc.name,
          mimetype: doc.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
          size: fileStats.size,
          path: doc.filePath
        };
        result = await processUploadedFile(fileInfo, query);
      } else {
        result = {
          docName: doc.name,
          note: 'Known document reference (no local file)',
          answer: { message: 'Would process known document: ' + doc.name }
        };
      }
    }
    
    console.log('✅ Document processing completed');
    res.json({
      success: true,
      query: query || 'general processing',
      timestamp: new Date().toISOString(),
      ...result
    });
    
  } catch (error) {
    console.error('❌ Smart document processing failed:', error);
    res.status(500).json({
      error: 'Document processing failed',
      message: error.message
    });
  }
});

async function processUploadedFile(fileInfo, query = 'extract key data') {
  try {
    console.log(`📄 Processing file: ${fileInfo.name} (${fileInfo.mimetype})`);
    
    // For now, return mock processing result
    // In production, implement actual PDF/XLSX parsing here
    const mockResult = {
      docName: fileInfo.name,
      fileSize: fileInfo.size,
      fileType: fileInfo.mimetype,
      query: query,
      answer: {
        total_amount: "12.540,00",
        currency: "EUR", 
        positions: [
          { item: "Aluminijski profil ALP-6060-T5", qty: 25, unit: "kom", price: "12.50", line_total: "312.50" },
          { item: "Prašno lakiranje RAL 7016", qty: 5.5, unit: "m²", price: "18.00", line_total: "99.00" }
        ],
        notes: `Mock extraction from ${fileInfo.name}. Query: ${query}`
      }
    };
    
    // Use OpenAI for actual PDF processing:
    if (openai && fileInfo.mimetype === 'application/pdf') {
      console.log('🤖 Processing PDF with OpenAI GPT...');
      
      try {
        // Extract actual PDF text content
        const pdf = require('pdf-parse');
        const fs = require('fs');
        
        console.log('📖 Extracting text from PDF...');
        const pdfBuffer = fs.readFileSync(fileInfo.path);
        const pdfData = await pdf(pdfBuffer);
        const extractedText = pdfData.text;
        
        console.log(`📝 Extracted ${extractedText.length} characters from PDF`);
        console.log(`📄 PDF text preview: ${extractedText.substring(0, 200)}...`);
        
        const pdfAnalysisPrompt = `
Analiziraj sljedeći hrvatski dokument "${fileInfo.name}" i izvuci ključne informacije:

SADRŽAJ DOKUMENTA:
${extractedText}

UPIT:
${query}

Analiziraj TOČNO što piše u dokumentu. Ne izmišljaj podatke!

Vrati odgovor u JSON formatu sa sljedećim poljima:
- total_amount: ukupna cijena (string sa decimalnim zarezom)
- currency: valuta (HRK, EUR, USD)
- positions: array pozicija sa poljima {item, qty, unit, price, line_total}
- supplier: naziv dobavljača
- document_number: broj dokumenta
- date: datum dokumenta
- notes: dodatne napomene

Prikaži sve iznose u hrvatskom formatu (decimalni zarez, točke za tisućice).
        `.trim();

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system", 
              content: "Ti si stručnjak za analizu hrvatskih poslovnih dokumenata. Analiziraš STVARNI SADRŽAJ dokumenata (ponude, račune, fakture) te izvlačiš točne strukturirane podatke iz teksta. Koristi samo informacije koje su stvarno prisutne u dokumentu."
            },
            {
              role: "user",
              content: pdfAnalysisPrompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        });

        const aiResponse = JSON.parse(completion.choices[0].message.content);
        
        console.log('✨ OpenAI analysis completed');
        
        return {
          docName: fileInfo.name,
          fileSize: fileInfo.size,
          fileType: fileInfo.mimetype,
          query: query,
          answer: {
            ...aiResponse,
            ai_processed: true,
            pdf_text_extracted: true,
            extracted_text_length: extractedText.length,
            processing_time: new Date().toISOString()
          }
        };
        
      } catch (aiError) {
        console.error('❌ OpenAI processing failed:', aiError);
        // Fallback to mock data if AI fails
        console.log('📋 Falling back to mock data');
      }
    }
    
    return mockResult;
    
  } catch (error) {
    console.error('❌ File processing error:', error);
    throw error;
  }
}

/* ====================== Responses API Orchestrator ====================== */

app.post('/api/agent/orchestrate', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ 
      error: 'OpenAI not configured',
      message: 'Install OpenAI SDK and set OPENAI_API_KEY'
    });
  }

  try {
    const { userInput, context = {} } = req.body || {};
    
    if (!userInput) {
      return res.status(400).json({ error: 'userInput is required' });
    }

    console.log('🤖 Orchestrating user request:', userInput);

    const tools = [
      {
        type: "function",
        function: {
          name: "list_known_docs", 
          description: "Retrieve list of known documents available to user",
          parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "send_document",
          description: "Send a document for processing with specific query",
          parameters: {
            type: "object", 
            properties: {
              docId: { type: "string", description: "Document ID from known docs" },
              query: { type: "string", description: "Processing query/request" }
            },
            required: ["docId", "query"],
            additionalProperties: false
          }
        }
      },
      {
        type: "function",
        function: {
          name: "request_file_picker",
          description: "Request user to select a file via file picker",
          parameters: {
            type: "object",
            properties: {
              accept: {
                type: "array",
                items: { type: "string" },
                description: "Accepted file types"
              }
            },
            additionalProperties: false
          }
        }
      }
    ];

    const response = await openai.chat.completions.create({
      model: process.env.VITE_RESPONSES_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Govoriš hrvatski jezik i pomaže korisnicima s obradom dokumenata.

Kad korisnik traži slanje dokumenta (npr. "pošalji ponudu 001"):
1. Pozovi list_known_docs da vidiš dostupne dokumente
2. Pronađi najbolji match (fuzzy matching po imenu)  
3. Traži potvrdu: "Našla sam [ime]. Reci 'jasan zvuk' za potvrdu"
4. Pozovi send_document s docId i query

Ako dokument nije pronađen, pozovi request_file_picker.

Budi kratak i jasan. Odgovori na hrvatskom.
          `.trim()
        },
        {
          role: "user", 
          content: userInput
        }
      ],
      tools,
      tool_choice: "auto"
    });

    // Handle tool calls
    const message = response.choices[0]?.message;
    if (message?.tool_calls) {
      console.log('🔧 Processing tool calls:', message.tool_calls.length);
      
      const toolResults = [];
      
      for (const toolCall of message.tool_calls) {
        const { name, arguments: args } = toolCall.function;
        let toolResult = null;
        
        try {
          const parsedArgs = JSON.parse(args);
          toolResult = await handleToolCall(name, parsedArgs);
        } catch (error) {
          console.error(`❌ Tool call error (${name}):`, error);
          toolResult = { error: error.message };
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          name,
          result: toolResult
        });
      }
      
      res.json({
        message: message.content,
        tool_calls: message.tool_calls,
        tool_results: toolResults,
        needs_continuation: true
      });
    } else {
      res.json({
        message: message.content,
        tool_calls: null,
        tool_results: null,
        needs_continuation: false
      });
    }

  } catch (error) {
    console.error('❌ Orchestration failed:', error);
    res.status(500).json({
      error: 'Orchestration failed',
      message: error.message
    });
  }
});

async function handleToolCall(toolName, args) {
  console.log(`🔧 Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'list_known_docs':
      return {
        docs: KNOWN_DOCS.map(doc => ({
          id: doc.id,
          name: doc.name,
          localOnly: doc.localOnly,
          type: doc.type,
          createdAt: doc.createdAt
        })),
        count: KNOWN_DOCS.length
      };
      
    case 'send_document':
      const doc = KNOWN_DOCS.find(d => d.id === args.docId);
      if (!doc) {
        return { error: 'Document not found' };
      }
      
      // For demo, return mock processing result
      return {
        success: true,
        docName: doc.name,
        query: args.query,
        result: {
          message: `Mock processing of ${doc.name} with query: ${args.query}`,
          extractedData: {
            total_amount: "15.750,00",
            currency: "EUR",
            positions_count: 4
          }
        }
      };
      
    case 'request_file_picker':
      return {
        action: 'file_picker_requested',
        accept: args.accept || ['.pdf', '.xlsx', '.docx'],
        message: 'Please select a file to upload'
      };
      
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/* ====================== Development Server ====================== */

// Simple root endpoint for testing
app.get('/', (req, res) => {
  res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <title>Voice Document Processing</title>
  <style>body{font-family:sans-serif;padding:2rem;background:#0b1020;color:#e7ecf5;}</style>
</head>
<body>
  <h1>🎤 Voice Document Processing Server</h1>
  <p>Backend is running on port ${PORT}</p>
  <p>API endpoints available:</p>
  <ul>
    <li>GET /api/docs - Known documents</li>
    <li>POST /api/agent/voice-token - Realtime session token</li>
    <li>POST /api/agent/smart-document - Document processing</li>
    <li>POST /api/agent/orchestrate - AI orchestration</li>
  </ul>
  <p><strong>Status:</strong></p>
  <ul>
    <li>✅ OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Set' : 'Missing'}</li>
    <li>✅ Server Running: Yes</li>
    <li>✅ Dependencies: Installed</li>
  </ul>
</body>
</html>
  `);
});

/* ====================== Server Startup ====================== */

app.listen(PORT, () => {
  console.log(`✅ Voice Document Processing Server running on http://localhost:${PORT}`);
  console.log(`📁 Known documents: ${KNOWN_DOCS.length}`);
  console.log(`🔧 OpenAI: ${openai ? 'Connected' : 'Not configured'}`);
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set. Voice processing will be limited.');
    console.warn('   Add your API key to .env.local file');
  }
  
  console.log('\n📋 Available API endpoints:');
  console.log('   GET  /api/docs - List known documents');
  console.log('   POST /api/docs - Add known document');
  console.log('   POST /api/upload - Upload file');
  console.log('   POST /api/agent/voice-token - Get Realtime session');
  console.log('   POST /api/agent/smart-document - Process document');
  console.log('   POST /api/agent/orchestrate - AI orchestration');
  console.log('');

  // Add sample documents for testing
  const sampleDocs = [
    'DOK020725-110147.pdf',
    'testni.pdf', 
    'AGS  PONUDA 1960.pdf'
  ];
  
  for (const docName of sampleDocs) {
    const id = uuidv4();
    const doc = {
      id,
      name: docName,
      url: null,
      localOnly: true,
      createdAt: new Date().toISOString(),
      type: getDocumentType(docName),
      filePath: path.join(__dirname, 'src', 'backend', 'Računi', docName)
    };
    
    KNOWN_DOCS.push(doc);
    console.log(`📄 Added document: ${docName} (local)`);
  }
});

/* ====================== GVA Voice Intent (tool-calling) ====================== */
app.post('/api/gva/voice-intent', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: 'openai_not_configured' });
  }
  try {
    const { transcript, context = {} } = req.body || {};
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'missing_transcript' });
    }
    if (!process.env.OPENAI_API_KEY) {
      console.error('[GVA] (voice-server) OPENAI_API_KEY missing');
      return res.status(503).json({ error: 'openai_not_configured' });
    }

    const aliasToLine = context.aliasToLine || {};
    const activeLineId = context.activeLineId || null;
    const defaultYear = Number(context.defaultYear) || new Date().getUTCFullYear();
    const nowISO = (context.nowISO || new Date().toISOString()).slice(0, 10);

    console.log(`[GVA] (voice-server) IN → t:"${transcript}" | aliases:${Object.keys(aliasToLine).length} active:${activeLineId} year:${defaultYear}`);
    const tools = [
      {
        type: 'function',
        function: {
          name: 'move_start',
          description: 'Set start date of a single position (by alias or ref).',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              alias: { type: 'string', description: 'PR code, e.g. PR1 (normalize to uppercase, no spaces).' },
              date: { type: 'string', description: 'ISO date YYYY-MM-DD.' }
            },
            required: ['alias', 'date'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'shift',
          description: 'Shift one or more positions by ±days, preserving duration.',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              alias: {
                anyOf: [ { type: 'string' }, { type: 'array', items: { type: 'string' } } ],
                description: "PR code(s), e.g. 'PR3' or ['PR3','PR5']."
              },
              days: { type: 'integer', description: 'Can be negative.' }
            },
            required: ['alias', 'days'],
            additionalProperties: false
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'shift_all',
          description: 'Shift every visible position by ±days.',
          strict: true,
          parameters: { type: 'object', properties: { days: { type: 'integer' } }, required: ['days'], additionalProperties: false }
        }
      },
      { type: 'function', function: { name: 'distribute_chain', description: 'Make each start = previous end + 1 day.', strict: true, parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } } },
      { type: 'function', function: { name: 'normative_extend', description: 'Extend end dates by +days according to normative.', strict: true, parameters: { type: 'object', properties: { days: { type: 'integer' } }, required: ['days'], additionalProperties: false } } },
      { type: 'function', function: { name: 'add_task_open', description: "Open 'add task' modal.", strict: true, parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } } },
      { type: 'function', function: { name: 'image_popup', description: 'Show the image popup.', strict: true, parameters: { type: 'object', properties: {}, required: [], additionalProperties: false } } },
      {
        type: 'function',
        function: {
          name: 'ask_clarify',
          description: 'If exactly one key detail is missing/ambiguous, ask a SHORT clarifying question in Croatian.',
          strict: true,
          parameters: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              missing: { type: 'array', items: { type: 'string' } }
            },
            required: ['question', 'missing'],
            additionalProperties: false
          }
        }
      }
    ];

    const SYSTEM_PROMPT = `
Ti si Gantt Tool Router.
- Jezik: hrvatski. Popravi ASR greške (razmaci, dijakritici, nazivi mjeseci), dodaj potrebnu interpunkciju.
- UVIJEK preferiraj TOOL CALLS. Ako nedostaje točno JEDAN ključni podatak, pozovi ask_clarify sa kratkim pitanjem.
- Normaliziraj alias: ukloni razmake, pretvori u VELIKA SLOVA (npr. "pr 5"→"PR5").
- Prihvati "aktivna (linija)" kao alias aktivnog reda iz konteksta.
- Datumi: ako korisnik kaže "1.9.", uzmi godinu iz defaultYear i vrati ISO "YYYY-MM-DD".
- Relativno: "+2 dana", "za -1 dan" → cijeli broj days (može biti negativan).
- Više meta: razdvoji po zarezima i "i"; za shift vrati niz aliasa.
- Ako je čista UI radnja (npr. "otvori zadatak", "slika"), pozovi odgovarajući UI tool.
- Nikad ne vraćaj slobodan tekst osim ako je eksplicitno traženo; u suprotnom samo tool pozivi.
`.trim();

    const knownAliases = Object.keys(aliasToLine);
    const userBlock = [
      `Naredba: ${transcript}`,
      '',
      'Kontekst:',
      `- today: ${nowISO} (Europe/Zagreb)`,
      `- defaultYear: ${defaultYear}`,
      `- activeLineId: ${activeLineId || 'null'}`,
      `- knownAliases: ${knownAliases.join(', ')}`
    ].join('\n');

    console.log(`[GVA] (voice-server) OpenAI model: ${process.env.VITE_RESPONSES_MODEL || 'gpt-4o-mini'}`);
    const response = await openai.chat.completions.create({
      model: process.env.VITE_RESPONSES_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userBlock }
      ],
      tools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
      temperature: 0.1
    });

    const message = response.choices?.[0]?.message || {};
    const toolCalls = message.tool_calls || [];
    console.log(`[GVA] (voice-server) tool_calls: ${toolCalls.length}`);

    const norm = (s = '') => String(s).toUpperCase().replace(/\s+/g, '');
    const resolveActiveAlias = () => {
      if (!activeLineId) return null;
      for (const [alias, lineId] of Object.entries(aliasToLine)) {
        if (lineId === activeLineId) return alias;
      }
      return null;
    };
    const mapAlias = (a) => {
      const v = norm(a || '');
      if (!v) return v;
      if (v === 'AKTIVNA' || v === 'AKTIVNALINIJA' || v === 'ACTIVE' || v === 'ACTIVELINE') {
        return resolveActiveAlias() || v;
      }
      return v;
    };

    if (toolCalls.length) {
      const actions = [];
      for (const call of toolCalls) {
        const fn = call.function || {};
        const name = fn.name;
        let args = {};
        try { args = JSON.parse(fn.arguments || '{}'); } catch {}
        console.log(`[GVA] (voice-server) → tool: ${name} args: ${JSON.stringify(args)}`);

        if (name === 'ask_clarify') {
          return res.json({ type: 'clarify', question: args.question, missing: args.missing });
        }
        if (name === 'move_start') {
          const alias = mapAlias(args.alias);
          actions.push({ type: 'move_start', alias, lineId: aliasToLine[alias], iso: args.date });
        } else if (name === 'shift') {
          const arr = Array.isArray(args.alias) ? args.alias : [args.alias];
          for (const raw of arr) {
            const alias = mapAlias(raw);
            actions.push({ type: 'shift', alias, days: args.days });
          }
        } else if (name === 'shift_all') {
          actions.push({ type: 'shift_all', days: args.days });
        } else if (name === 'distribute_chain') {
          actions.push({ type: 'distribute_chain' });
        } else if (name === 'normative_extend') {
          actions.push({ type: 'normative_extend', days: args.days });
        } else if (name === 'add_task_open' || name === 'image_popup') {
          actions.push({ type: name });
        }
      }
      console.log(`[GVA] (voice-server) actions mapped: ${JSON.stringify(actions)}`);
      return res.json({ type: 'actions', actions });
    }

    return res.json({ type: 'none', text: message.content || '' });
  } catch (e) {
    try { console.error('Voice intent error (voice-server):', e?.stack || e); } catch {}
    const payload = { error: e?.message || 'internal_error' };
    if (process.env.NODE_ENV !== 'production') payload.stack = String(e?.stack || '');
    try { return res.status(500).json(payload); } catch { res.setHeader('Content-Type','application/json'); res.statusCode=500; res.end(JSON.stringify(payload)); }
  }
});

module.exports = app;
