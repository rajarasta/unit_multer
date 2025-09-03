const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const cors = require('cors');
const formidable = require('formidable');

// Load environment variables
require('dotenv').config();

// Import OpenAI (using dynamic import for ESM compatibility)
let OpenAI;

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API endpoint za spremanje agbim.json
app.put('/api/save-agbim', async (req, res) => {
  try {
    const data = req.body;
    const filePath = path.join(__dirname, 'src', 'backend', 'agbim.json');
    
    // Spremi novi sadržaj s proper formatting
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log('✅ agbim.json updated successfully');
    console.log(`📊 Projects: ${data.projects?.length || 0}, Tasks: ${data.tasks?.length || 0}`);
    
    res.json({ success: true, message: 'agbim.json saved successfully' });
  } catch (error) {
    console.error('❌ Error saving agbim.json:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Initialize OpenAI client
async function initOpenAI() {
  try {
    const { default: OpenAISDK } = await import('openai');
    OpenAI = new OpenAISDK({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('✅ OpenAI client initialized');
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI:', error.message);
  }
}

// OpenAI API - Draft endpoint
app.post('/api/llm/draft', async (req, res) => {
  try {
    if (!OpenAI) {
      throw new Error('OpenAI client not initialized');
    }

    const { command, images } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    console.log(`📤 Processing voice command: "${command}"`);
    if (images?.length > 0) {
      console.log(`🖼️ Processing ${images.length} images`);
    }

    // Create multimodal input
    let input = [];

    // System instructions
    input.push({
      type: "message",
      role: "system", 
      content: [{
        type: "input_text",
        text: `Ti si napredni AI agent za upravljanje aluminium-store aplikacijom.
Analiziraj glasovne naredbe i eventualne slike, te vrati strukturirani JSON odgovor.

DOSTUPNE AKCIJE:
- upload_offer: Dodavanje ponude (možda s dokumentima/slikama)
- create_invoice: Kreiranje fakture
- add_project: Dodavanje projekta
- generate_report: Generiranje izvještaja
- schedule_task: Planiranje zadatka
- analyze_image: Analiza slika/dokumenata
- extract_text: Izvlačenje teksta iz slika

JSON FORMAT (obvezno vrati ovakav format):
{
  "action": "upload_offer",
  "document_id": "broj-dokumenta-ako-spomenut-ili-pronađen-na-slikama",
  "status": "draft",
  "fields": {
    "customer": "ime-klijenta",
    "date": "datum-u-ISO-formatu",
    "amount": "iznos-ako-pronađen-na-slikama",
    "currency": "HRK",
    "description": "opis-sa-detaljima-iz-slika"
  },
  "flags": {
    "needs_manual_input": ["polja-koja-trebaju-dopunu"],
    "confirmed": false,
    "refresh_ui": true
  },
  "attachments": [],
  "image_analysis": {
    "detected_text": "tekst-pronađen-na-slikama",
    "document_type": "tip-dokumenta",
    "key_data": {}
  }
}

Vrati SAMO JSON, bez objašnjenja.`
      }]
    });

    // User content
    let userContent = [{
      type: "input_text",
      text: `Glasovna naredba: "${command}"`
    }];

    // Add images if present
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: images[i].mimeType || "image/jpeg",
            data: images[i].data
          }
        });
      }
    }

    input.push({
      type: "message",
      role: "user",
      content: userContent
    });

    // Convert input format for Chat Completions API
    const messages = input.map(item => ({
      role: item.role,
      content: item.content.map(c => {
        if (c.type === "input_text") return { type: "text", text: c.text };
        if (c.type === "image") return { type: "image_url", image_url: { url: `data:${c.source.media_type};base64,${c.source.data}` }};
        return c;
      })
    }));

    // Call Chat Completions API instead of Responses API
    const response = await OpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    console.log("✅ OpenAI Chat Completions API successful");

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      
      // Fallback response
      jsonResponse = {
        action: "upload_offer",
        document_id: command.match(/\d{4}-\d+/)?.[0] || null,
        status: "draft",
        fields: {
          customer: null,
          date: new Date().toISOString().split('T')[0],
          amount: null,
          currency: "HRK",
          description: command
        },
        flags: {
          needs_manual_input: ["customer", "amount"],
          confirmed: false,
          refresh_ui: true
        },
        attachments: [],
        image_analysis: {
          detected_text: "Parse error occurred",
          document_type: "unknown",
          key_data: {}
        }
      };
    }

    // Ensure draft status
    jsonResponse.status = "draft";
    jsonResponse.flags = jsonResponse.flags || {};
    jsonResponse.flags.confirmed = false;

    console.log("📋 Draft response generated");
    res.json(jsonResponse);

  } catch (error) {
    console.error("❌ OpenAI API error:", error);
    
    // Fallback response
    const fallbackResponse = {
      action: "upload_offer",
      document_id: null,
      status: "draft",
      fields: {
        customer: null,
        date: new Date().toISOString().split('T')[0], 
        amount: null,
        currency: "HRK",
        description: req.body.command || "Nepoznata naredba"
      },
      flags: {
        needs_manual_input: ["customer", "amount"],
        confirmed: false,
        refresh_ui: true
      },
      attachments: [],
      image_analysis: {
        detected_text: "API error occurred",
        document_type: "unknown", 
        key_data: {}
      },
      error: "OpenAI nedostupan - korišten fallback"
    };

    res.json(fallbackResponse);
  }
});

// OpenAI API - Confirm endpoint
app.post('/api/llm/confirm', async (req, res) => {
  try {
    if (!OpenAI) {
      throw new Error('OpenAI client not initialized');
    }

    const { command, fields } = req.body;

    if (!command || !fields) {
      return res.status(400).json({ error: 'Command and fields are required' });
    }

    const response = await OpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Finalize the action with confirmed: true. Add execution_plan with specific steps. Return ONLY JSON."
        },
        {
          role: "user", 
          content: `Original command: "${command}"\nConfirmed data: ${JSON.stringify(fields, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1000
    });

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      
      // Fallback final response
      jsonResponse = {
        action: fields.action || "unknown",
        document_id: fields.document_id || null,
        status: "final",
        fields: fields,
        flags: {
          needs_manual_input: [],
          confirmed: true,
          refresh_ui: false
        },
        execution_plan: [
          "Opening relevant module",
          "Creating new document", 
          "Entering data",
          "Saving to database"
        ],
        result: "Action completed successfully"
      };
    }

    // Ensure final status
    jsonResponse.status = "final";
    jsonResponse.flags = jsonResponse.flags || {};
    jsonResponse.flags.confirmed = true;
    jsonResponse.flags.needs_manual_input = [];

    console.log("✅ Confirm response generated");
    res.json(jsonResponse);

  } catch (error) {
    console.error("❌ OpenAI API error:", error);
    
    // Fallback response
    const fallbackResponse = {
      action: "unknown",
      document_id: null,
      status: "final",
      fields: req.body.fields || {},
      flags: {
        needs_manual_input: [],
        confirmed: true,
        refresh_ui: false
      },
      execution_plan: [
        "LLM nedostupan",
        "Koristim fallback izvršavanje"
      ],
      result: "Akcija izvršena (fallback mode)",
      error: "LLM nedostupan - korišten fallback"
    };

    res.json(fallbackResponse);
  }
});

// Whisper transcription endpoint
app.post('/api/transcribe', (req, res) => {
  if (!OpenAI) {
    return res.status(500).json({ error: 'OpenAI client not initialized' });
  }

  const form = formidable({ 
    multiples: false,
    maxFileSize: 25 * 1024 * 1024, // 25MB limit
    keepExtensions: true
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('❌ Formidable parsing error:', err);
      return res.status(500).json({ error: 'File parsing error' });
    }

    try {
      // Get uploaded audio file
      const audioFile = files.file || files.audio;
      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      console.log('🎤 Processing audio transcription...');
      console.log('📁 File path:', audioFile[0]?.filepath || audioFile.filepath);
      console.log('📊 File size:', audioFile[0]?.size || audioFile.size, 'bytes');

      // Create read stream for Whisper
      const filePath = audioFile[0]?.filepath || audioFile.filepath;
      const audioStream = fsSync.createReadStream(filePath);

      // Call Whisper API
      const response = await OpenAI.audio.transcriptions.create({
        model: "whisper-1",
        file: audioStream,
        language: "hr", // Croatian language
        response_format: "text",
        temperature: 0.1
      });

      console.log('✅ Whisper transcription successful');
      console.log('📝 Transcript:', response.substring(0, 100) + (response.length > 100 ? '...' : ''));

      // Clean up temp file
      try {
        await fs.unlink(filePath);
      } catch (unlinkError) {
        console.warn('⚠️ Could not delete temp file:', unlinkError.message);
      }

      res.status(200).json({ 
        text: response,
        language: 'hr',
        duration: audioFile[0]?.size || audioFile.size 
      });

    } catch (error) {
      console.error('❌ Whisper transcription error:', error);
      
      // Clean up temp file on error
      try {
        const filePath = files.file?.[0]?.filepath || files.file?.filepath || files.audio?.[0]?.filepath || files.audio?.filepath;
        if (filePath) {
          await fs.unlink(filePath);
        }
      } catch (unlinkError) {
        // Ignore cleanup errors
      }

      res.status(500).json({ 
        error: 'Transcription failed',
        message: error.message,
        fallback_text: "Greška pri transkripciji - molimo ponovite naredbu"
      });
    }
  });
});

// Initialize and start server
(async () => {
  await initOpenAI();
  
  app.listen(PORT, () => {
    console.log(`🚀 Enhanced file writer + OpenAI API running on http://localhost:${PORT}`);
    console.log(`📝 Endpoints:`);
    console.log(`   PUT  /api/save-agbim - Save agbim.json`);
    console.log(`   POST /api/llm/draft - OpenAI draft processing`);
    console.log(`   POST /api/llm/confirm - OpenAI confirm processing`);
    console.log(`   POST /api/transcribe - Whisper audio transcription`);
  });
})();