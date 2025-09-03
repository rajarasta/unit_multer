import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer(); // memory storage
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

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
    console.error("❌ Transcribe error:", err);
    res.status(500).json({ error: err.message, fallback_text: "Fallback transcript" });
  }
});

/* ========== LLM DRAFT (prvi jasni zvuk) ========== */
app.post("/api/llm/draft", async (req, res) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: "Nema command u body" });
    }

    console.log("📤 Draft request:", command);

    const response = await client.responses.create({
      model: "gpt-5-mini",   // brži i jeftiniji za draft
      instructions: `Pretvori glasovnu naredbu u JSON. Vrati samo JSON.`,
      input: `Naredba: "${command}"`,
      text: { verbosity: "low" },
      reasoning: { effort: "minimal" },
    });

    // Sigurno parsiranje
    let raw = response.output_text;
    if (!raw && response.output?.[0]?.content?.[0]?.text) {
      raw = response.output[0].content[0].text;
    }

    const json = JSON.parse(raw);
    json.status = "draft";
    json.flags = json.flags || {};
    json.flags.confirmed = false;

    console.log("✅ Draft response:", json);
    res.json(json);
  } catch (err) {
    console.error("❌ Draft error:", err);
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

    const response = await client.responses.create({
      model: "gpt-5-mini",
      instructions: `Finaliziraj akciju i dodaj "confirmed": true. Vrati JSON.`,
      input: `Original: "${command}"\nPolja: ${JSON.stringify(fields, null, 2)}`,
      text: { verbosity: "medium" },
      reasoning: { effort: "low" },
    });

    let raw = response.output_text;
    if (!raw && response.output?.[0]?.content?.[0]?.text) {
      raw = response.output[0].content[0].text;
    }

    const json = JSON.parse(raw);
    json.status = "final";
    json.flags = json.flags || {};
    json.flags.confirmed = true;
    json.flags.needs_manual_input = [];

    console.log("✅ Confirm response:", json);
    res.json(json);
  } catch (err) {
    console.error("❌ Confirm error:", err);
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

/* ========== Pokreni server ========== */
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ API server radi na http://localhost:${PORT}`);
});