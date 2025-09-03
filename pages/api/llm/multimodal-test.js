import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, images, tools } = req.body;

    console.log(`🧪 Multimodal test - Prompt: "${prompt}"`);
    if (images?.length > 0) {
      console.log(`🖼️ Processing ${images.length} images`);
    }

    // Kreiraj input array za Responses API
    let input = [];

    // System instrukcije
    if (tools && tools.length > 0) {
      input.push({
        type: "message", 
        role: "system",
        content: [{
          type: "output_text",
          text: "You are a helpful AI assistant with access to tools. Analyze images and use tools as needed to provide comprehensive responses."
        }]
      });
    }

    // User content - tekst + slike
    let userContent = [{
      type: "output_text",
      text: prompt
    }];

    // Dodaj slike
    if (images && images.length > 0) {
      for (const image of images) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mimeType || "image/jpeg", 
            data: image.data
          }
        });
      }
    }

    input.push({
      type: "message",
      role: "user", 
      content: userContent
    });

    // Pozovi Responses API
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: input,
      tools: tools || [],
      text: { verbosity: "medium" },
      reasoning: { effort: "medium" },
      temperature: 0.7,
      store: true
    });

    console.log("✅ Multimodal test successful");
    console.log("Output items:", response.output.length);

    // Analiziraj output
    const result = {
      id: response.id,
      model: response.model,
      created_at: response.created_at,
      status: response.status,
      usage: response.usage,
      output_items: response.output.length,
      output_text: response.output_text,
      full_output: response.output,
      reasoning_summary: response.reasoning?.summary || null
    };

    res.status(200).json(result);

  } catch (error) {
    console.error("❌ Multimodal test error:", error);
    res.status(500).json({ 
      error: error.message,
      type: error.type || "unknown",
      code: error.code || "unknown"
    });
  }
}