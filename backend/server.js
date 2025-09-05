import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";

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
const upload = multer(); // memory storage

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

/* ========== Pokreni server ========== */
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`✅ API server radi na http://localhost:${PORT}`);
});

/* ========== Local LLM helpers ==========
   - Health check for OpenAI-compatible local server
   - Scan models directory for GGUF files
*/
app.get('/api/llm/local/health', async (req, res) => {
  try {
    const base = (req.query.base || req.query.baseUrl || '').toString().replace(/\/+$/,'');
    if (!base) return res.status(400).json({ ok: false, error: 'Missing base or baseUrl query param' });
    const url = `${base}/v1/models`;
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(502).json({ ok: false, error: `HTTP ${r.status}`, url });
    }
    const j = await r.json().catch(() => ({}));
    const count = Array.isArray(j?.data) ? j.data.length : 0;
    res.json({ ok: true, url, models: count, raw: j });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

app.get('/api/llm/local/models', async (req, res) => {
  try {
    // Default models root as requested
    let root = (req.query.root || 'E:\\Modeli').toString();
    // Normalize and ensure it exists
    const abs = path.resolve(root);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({ ok: false, error: `Path not found: ${abs}` });
    }
    // Walk directory (one level deep) and collect .gguf files
    const result = [];
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(abs, e.name);
      if (e.isFile() && /\.gguf$/i.test(e.name)) {
        result.push({ name: e.name, path: p });
      } else if (e.isDirectory()) {
        try {
          const sub = fs.readdirSync(p, { withFileTypes: true });
          for (const s of sub) {
            if (s.isFile() && /\.gguf$/i.test(s.name)) {
              result.push({ name: s.name, path: path.join(p, s.name) });
            }
          }
        } catch {}
      }
    }
    res.json({ ok: true, root: abs, count: result.length, models: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

/* ========== Local LLM tool-calling (OpenAI-compatible) ==========
   POST /api/llm/local/tool-calling
   Body: { prompt: string, tools?: [], base_url?: string, model?: string }
*/
app.post('/api/llm/local/tool-calling', async (req, res) => {
  try {
    const { prompt, tools = [], base_url, model } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    // Simulated tool functions (server-side)
    const availableTools = {
      get_weather: async (location) => ({
        location,
        temperature: Math.round(Math.random() * 30 + 5),
        condition: ["sunny","cloudy","rainy","windy"][Math.floor(Math.random()*4)],
        humidity: Math.round(Math.random()*100),
        timestamp: new Date().toISOString()
      }),
      calculate: async (expression) => {
        try { const sanitized = String(expression||'').replace(/[^0-9+\-*/\(\)\.\s]/g, ''); return { expression, result: eval(sanitized), valid: true }; }
        catch (error) { return { expression, result: null, valid: false, error: error.message }; }
      },
      create_aluminum_quote: async (customer, items, total) => ({
        quote_id: `ALU-${Date.now()}`,
        customer,
        items: items||[],
        total_amount: total||0,
        currency: 'HRK',
        created_at: new Date().toISOString(),
        valid_until: new Date(Date.now()+30*24*60*60*1000).toISOString(),
        status: 'draft'
      }),
      search_projects: async (query, limit=5) => {
        const mock = [
          { id: 'P001', name: 'Škola Zadar', status: 'active', client: 'Grad Zadar' },
          { id: 'P002', name: 'Trgovački centar Split', status: 'completed', client: 'Mall Group' },
          { id: 'P003', name: 'Stambena zgrada Zagreb', status: 'planning', client: 'Nekretnine d.o.o.' },
          { id: 'P004', name: 'Industrijska hala Varaždin', status: 'active', client: 'Production Ltd' },
          { id: 'P005', name: 'Hotel Dubrovnik', status: 'completed', client: 'Tourism Corp' }
        ];
        const filtered = mock.filter(p => p.name.toLowerCase().includes(String(query||'').toLowerCase()) || p.client.toLowerCase().includes(String(query||'').toLowerCase())).slice(0, limit);
        return { query, results: filtered, total_found: filtered.length };
      }
    };

    const base = String(base_url || 'http://127.0.0.1:1234').replace(/\/+$/,'');
    const mdl = model || 'local';
    const messages = [ { role: 'user', content: prompt } ];
    let iterations = 0;
    let toolCallsExecuted = 0;
    const maxIterations = 5;

    while (iterations < maxIterations) {
      iterations++;
      const body = { model: mdl, messages, tools, tool_choice: 'auto', stream: false, temperature: 0.3 };
      const r = await fetch(`${base}/v1/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.text(); return res.status(502).json({ error: `Local LLM HTTP ${r.status}: ${e.slice(0,200)}` }); }
      const j = await r.json().catch(err => ({ error: String(err?.message||err) }));
      if (j?.error) return res.status(502).json({ error: j.error });
      const msg = j.choices?.[0]?.message || {};
      const toolCalls = msg.tool_calls || [];
      if (!toolCalls.length) {
        messages.push({ role: 'assistant', content: msg.content || '' });
        return res.json({ id: j.id, model: j.model, status: 'completed', iterations, tool_calls_executed: toolCallsExecuted, usage: j.usage, final_response: msg.content || '', full_conversation: messages });
      }
      for (const tc of toolCalls) {
        const fn = tc.function?.name; let args = {}; try { args = JSON.parse(tc.function?.arguments || '{}'); } catch {}
        let out;
        if (availableTools[fn]) { try { out = await availableTools[fn](...Object.values(args)); } catch (err) { out = { error: String(err?.message||err) }; } }
        else { out = { error: `Unknown function: ${fn}` }; }
        toolCallsExecuted++;
        messages.push({ role: 'tool', tool_call_id: tc.id, name: fn, content: JSON.stringify(out) });
      }
    }
    return res.json({ id: 'local-unknown', model: mdl, status: 'incomplete', iterations: maxIterations, tool_calls_executed: toolCallsExecuted, usage: null, final_response: '', full_conversation: messages });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
});
