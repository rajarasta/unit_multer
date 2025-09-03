import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { command, images } = req.body;

    if (!command) {
      return res.status(400).json({ error: 'Command is required' });
    }

    console.log(`📤 Processing voice command: "${command}"`);
    if (images?.length > 0) {
      console.log(`🖼️ Processing ${images.length} images`);
    }

    // Kreiraj input - multimodalni ako imamo slike
    let input = [];

    // Dodaj instrukcije kao system poruku
    input.push({
      type: "message",
      role: "system", 
      content: [{
        type: "output_text",
        text: `Ti si napredni AI agent za upravljanje aluminium-store aplikacijom.
Analiziraj glasovne naredbe i eventulane slike, te vrati strukturirani JSON odgovor.

DOSTUPNE AKCIJE:
- upload_offer: Dodavanje ponude (možda s dokumentima/slikama)
- create_invoice: Kreiranje fakture
- add_project: Dodavanje projekta
- generate_report: Generiranje izvještaja
- schedule_task: Planiranje zadatka
- analyze_image: Analiza slika/dokumenata
- extract_text: Izvlačenje teksta iz slika

MULTIMODALNE MOGUĆNOSTI:
- Ako vidiš slike dokumenata, analiziraj ih i izvuci relevantne podatke
- Ako vidiš građevinske planove, prepoznaj elemente i dimenzije
- Ako vidiš fakture/ponude, izvuci brojeve, datume, iznose

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

Ako korisnik spominje "dokument", "cloud", "broj" ili vidiš brojeve na slikama - izvuci document_id.
Ako vidiš građevinske elemente - dodaj ih u description.
Ako nisu spomenuti svi podaci - stavi ih u needs_manual_input array.
Vrati SAMO JSON, bez objašnjenja.`
      }]
    });

    // Dodaj korisničku naredbu
    let userContent = [{
      type: "output_text",
      text: `Glasovna naredba: "${command}"`
    }];

    // Dodaj slike ako postoje
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: images[i].mimeType || "image/jpeg",
            data: images[i].data // base64 string bez prefiksa
          }
        });
      }
    }

    input.push({
      type: "message",
      role: "user",
      content: userContent
    });

    // Pozovi Responses API s multimodalnim inputom
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: input,
      text: { 
        verbosity: "low",
        format: { type: "json_object" }
      },
      reasoning: { effort: "medium" },
      temperature: 0.3,
      store: true
    });

    console.log("✅ OpenAI Responses API successful");

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(response.output_text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.log("Raw response:", response.output_text);
      
      // Fallback - kreiraj standardni odgovor
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

    // Osiguraj da draft ima status: "draft"
    jsonResponse.status = "draft";
    jsonResponse.flags = jsonResponse.flags || {};
    jsonResponse.flags.confirmed = false;

    console.log("📋 Draft response generated:", JSON.stringify(jsonResponse, null, 2));
    res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("❌ OpenAI API error:", error);
    
    // Fallback odgovor u slučaju greške
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

    res.status(200).json(fallbackResponse);
  }
}