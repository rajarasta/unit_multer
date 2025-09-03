import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { command, fields } = req.body;

    if (!command || !fields) {
      return res.status(400).json({ error: 'Command and fields are required' });
    }

    const systemPrompt = `Ti si agent za finalizaciju akcija u aluminium-store aplikaciji.
Korisnik je potvrdio draft podatke. Tvoj zadatak je kreirati finalni JSON s confirmed: true.

Uzmi podatke iz fields objekta i kreiraj finalni odgovor.
Dodaj execution_plan s koracima koje treba izvršiti.

FINALNI JSON FORMAT:
{
  "action": "action_name",
  "document_id": "document-id",
  "status": "final",
  "fields": {
    // svi podaci iz user input
  },
  "flags": {
    "needs_manual_input": [],
    "confirmed": true,
    "refresh_ui": false
  },
  "execution_plan": [
    "Otvaranje modula za ponude",
    "Kreiranje novog dokumenta", 
    "Unos podataka klijenta",
    "Spremanje dokumenta",
    "Generiranje PDF-a"
  ],
  "result": "Ponuda uspješno kreirana"
}

Vrati SAMO JSON, bez objašnjenja.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Originalna naredba: "${command}"
Potvrđeni podaci: ${JSON.stringify(fields, null, 2)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    let jsonResponse;

    try {
      jsonResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      
      // Fallback - kreiraj standardni finalni odgovor
      jsonResponse = {
        action: "upload_offer",
        document_id: fields.document_id || command.match(/\d{4}-\d+/)?.[0] || null,
        status: "final", 
        fields: fields,
        flags: {
          needs_manual_input: [],
          confirmed: true,
          refresh_ui: false
        },
        execution_plan: [
          "Otvaranje modula za ponude",
          "Kreiranje novog dokumenta",
          "Unos podataka",
          "Spremanje dokumenta"
        ],
        result: "Akcija uspješno izvršena"
      };
    }

    // Osiguraj da je final response označen kao potvrđen
    jsonResponse.status = "final";
    jsonResponse.flags = jsonResponse.flags || {};
    jsonResponse.flags.confirmed = true;
    jsonResponse.flags.needs_manual_input = [];

    console.log("Confirm response:", JSON.stringify(jsonResponse, null, 2));
    res.status(200).json(jsonResponse);

  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Fallback odgovor
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

    res.status(200).json(fallbackResponse);
  }
}