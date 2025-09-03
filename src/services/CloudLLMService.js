/**
 * CHANGE: 2025-09-02 - Final refactor and correction for Google AI integration
 * WHY: Corrected duplicate variable declaration, ensured robust library import.
 * IMPACT: Stably provides high-quality document processing with Gemini models.
 * AUTHOR: Gemini Code Assistant
 * SEARCH_TAGS: #google-ai #gemini #refactor #document-analysis #api-fix
 */


/**
 * Pretvori Blob/File u base64 string.
 * @param {Blob} blob - Datoteka za konverziju.
 * @returns {Promise<string>} Base64 reprezentacija datoteke.
 */

import { GoogleGenAI, Type } from '@google/genai';

export async function blobToBase64(blob) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractJsonString(raw) {
  if (!raw) return '';
  // 1) Ako je u ``` ``` blokovima, skini ih
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  // 2) Ako nije, pokušaj izvući prvi {...} blok
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return raw.slice(first, last + 1).trim();
  }
  return raw.trim();
}

function normalizeMultimodalPayload(d) {
  const out = { ...d };

  // 1) transcript
  if (!out.transcript && Array.isArray(out.transcriptions)) {
    out.transcript = out.transcriptions.map(t => t?.text).filter(Boolean).join(' ').trim() || null;
  }

  // 2) actionItems
  if (!out.actionItems && Array.isArray(out.actions)) {
    out.actionItems = out.actions.map(a =>
      [a?.action, a?.target].filter(Boolean).join(' ')
    ).filter(Boolean);
  }

  // 3) entities minimal
  out.entities = out.entities || {};
  if (out.projectId && !out.entities.projectId) out.entities.projectId = out.projectId;
  if (out.positionId && !out.entities.positionId) out.entities.positionId = out.positionId;

  // 4) image/video minimal mapping ako ti ih netko vrati pod drugim ključevima
  if (!out.imageFindings && Array.isArray(out.images)) {
    out.imageFindings = out.images.map(img => ({
      caption: img.caption || null,
      notes: img.notes || null,
      ocr: (Array.isArray(out.ocr) ? out.ocr.join(' ') : out.ocr) || null,
    }));
  }
  if (!out.videoFindings && Array.isArray(out.videos)) {
    out.videoFindings = out.videos.map(v => ({
      fileName: v.fileName || null,
      durationSec: v.durationSec || null,
      audioDetected: v.audioDetected ? 1 : 0,
      sceneSummary: v.sceneSummary || null,
      speechTranscript: v.speechTranscript || null,
      ocrSnippets: v.ocrSnippets || [],
      events: v.events || [],
      issues: v.issues || [],
    }));
  }

  // 5) chatMessage fallback
  if (!out.chatMessage && out.transcript) {
    out.chatMessage = out.transcript.slice(0, 480);
  }

  return out;
}

/**
 * Kreira shemu odgovora kompatibilnu s Google AI, koristeći Type enum.
 * @returns {object} Ispravno formatirana shema.
 */
export function createDocumentSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      documentType: {
        type: Type.STRING,
        enum: ["quote", "invoice", "delivery", "receipt", "transfer", "request", "other"],
        description: "Tip dokumenta (npr. 'invoice' za račun)."
      },
      documentNumber: {
        type: Type.STRING,
        description: "Broj dokumenta."
      },
      date: {
        type: Type.STRING,
        description: "Datum izdavanja dokumenta u YYYY-MM-DD formatu."
      },
      dueDate: {
        type: Type.STRING,
        description: "Datum dospijeća u YYYY-MM-DD formatu. Ako ne postoji, vrati null."
      },
      currency: {
        type: Type.STRING,
        description: "Valuta (npr. EUR)."
      },
      supplier: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Puni naziv dobavljača." },
          address: { type: Type.STRING, description: "Puna adresa dobavljača." },
          oib: { type: Type.STRING, description: "OIB dobavljača." },
          iban: { type: Type.STRING, description: "IBAN dobavljača." }
        },
        description: "Podaci o dobavljaču."
      },
      buyer: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Puni naziv kupca." },
          address: { type: Type.STRING, description: "Puna adresa kupca." },
          oib: { type: Type.STRING, description: "OIB kupca." }
        },
        description: "Podaci o kupcu."
      },
      items: {
        type: Type.ARRAY,
        description: "Lista svih stavki s dokumenta.",
        items: {
          type: Type.OBJECT,
          properties: {
            position: { type: Type.INTEGER, description: "Redni broj stavke (počevši od 1)." },
            code: { type: Type.STRING, description: "Šifra artikla/usluge." },
            description: { type: Type.STRING, description: "Opis artikla/usluge." },
            quantity: { type: Type.NUMBER, description: "Količina." },
            unit: { type: Type.STRING, description: "Mjerna jedinica (npr. 'kom', 'h')." },
            unitPrice: { type: Type.NUMBER, description: "Jedinična cijena bez poreza." },
            discountPercent: { type: Type.NUMBER, description: "Postotak popusta (npr. 10 za 10%). Ako nema, vrati 0." },
            totalPrice: { type: Type.NUMBER, description: "Ukupna cijena stavke nakon popusta, bez poreza." }
          },
        }
      },
      totals: {
        type: Type.OBJECT,
        description: "Ukupni iznosi na dnu dokumenta.",
        properties: {
          subtotal: { type: Type.NUMBER, description: "Osnovica (iznos bez PDV-a)." },
          vatAmount: { type: Type.NUMBER, description: "Ukupan iznos PDV-a." },
          totalAmount: { type: Type.NUMBER, description: "Ukupan iznos za plaćanje (s PDV-om)." }
        }
      }
    },
    required: ["documentType", "documentNumber", "date", "currency", "supplier", "buyer", "items", "totals"]
  };
}

/**
 * Minimalan, strogo-vođen prompt za analizu dokumenata.
 */
export const PROMPT_HR_ACCOUNTING = `Ti si AI ekspert za hrvatske poslovne dokumente (račun, ponuda, otpremnica). Tvoj zadatak je precizno izvući podatke iz priloženog dokumenta.

KRITIČNO VAŽNO: Vrati ISKLJUČIVO RAW JSON objekt koji STRIKTNO odgovara zadanoj shemi. NEMA markdown code blocks, NEMA \`\`\`json, NEMA dodatnih objašnjenja.

OBAVEZNO koristi TOČNO OVE nazive polja:
- documentType (ne "vrstaDokumenta")
- documentNumber (ne "brojDokumenta") 
- date (ne "datumDokumenta")
- dueDate (ne "datumDospijeca")
- currency (ne "valuta")
- supplier (ne "izdavatelj") sa poljima: name, address, oib, iban
- buyer (ne "primatelj") sa poljima: name, address, oib
- items (ne "stavke") sa poljima: position, code, description, quantity, unit, unitPrice, discountPercent, totalPrice
- totals sa poljima: subtotal, vatAmount, totalAmount

Sve numeričke vrijednosti pretvori u JSON brojeve (1.234,56 -> 1234.56).
Sve datume pretvori u ISO format (DD.MM.YYYY -> YYYY-MM-DD).`;

/**
 * Unaprijeđen prompt za vizualnu analizu dokumenata (slike).
 */
export const PROMPT_HR_ACCOUNTING_VISION = `Ti si AI ekspert za hrvatske poslovne dokumente (račun, ponuda, otpremnica). Tvoj zadatak je precizno izvući podatke iz priložene slike dokumenta.

KRITIČNO VAŽNO: Vrati ISKLJUČIVO RAW JSON objekt koji STRIKTNO odgovara zadanoj shemi. NEMA markdown code blocks, NEMA \`\`\`json, NEMA dodatnih objašnjenja.

OBAVEZNO koristi TOČNO OVE nazive polja:
- documentType (ne "vrstaDokumenta")
- documentNumber (ne "brojDokumenta") 
- date (ne "datumDokumenta")
- dueDate (ne "datumDospijeca")
- currency (ne "valuta")
- supplier (ne "izdavatelj") sa poljima: name, address, oib, iban
- buyer (ne "primatelj") sa poljima: name, address, oib
- items (ne "stavke") sa poljima: position, code, description, quantity, unit, unitPrice, discountPercent, totalPrice
- totals sa poljima: subtotal, vatAmount, totalAmount

Vizualno detektiraj i parsiraj tablice sa stavkama, obraćajući pažnju na poravnanje stupaca.
Sve numeričke vrijednosti pretvori u JSON brojeve (1.234,56 -> 1234.56).
Sve datume pretvori u ISO format (DD.MM.YYYY -> YYYY-MM-DD).`;

/**
 * Uploadaj datoteku na Google AI File API.
 * @param {string} apiKey - Vaš Google AI API ključ.
 * @param {File} file - Datoteka za upload.
 * @param {string} [displayName] - Opcionalno ime za prikaz.
 * @returns {Promise<object>} Objekt s podacima o uploadanoj datoteci.
 */
export async function uploadFileToGoogle(apiKey, file, displayName) {
  console.groupCollapsed('📤 GOOGLE FILE API UPLOAD');
  console.log('📁 File:', { name: file.name || displayName, size: `${(file.size / 1024 / 1024).toFixed(2)} MB`, type: file.type });

  const formData = new FormData();
  formData.append('file', file, file.name || displayName);
  if (displayName) {
    formData.append('file.display_name', displayName);
  }

  try {
    console.log('🚀 Uploading to Google File API...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/files?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`File upload failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', { uri: result.file?.uri, mimeType: result.file?.mimeType });
    return result.file;

  } catch (error) {
    console.error('❌ File upload error:', error);
    throw error;
  } finally {
    console.groupEnd();
  }
}

/**
 * Odlučuje treba li koristiti File API ili inline base64 na temelju veličine i tipa datoteke.
 * @param {File} file - Datoteka za provjeru.
 * @returns {{useFileAPI: boolean, reason: string}} Odluka i razlog.
 */
function shouldUseFileAPI(file) {
  // Temporarily disable File API to use inline processing for all files
  return { useFileAPI: false, reason: 'Using inline processing for compatibility.' };
}

/**
 * Glavna funkcija za analizu dokumenta (PDF, JPEG, PNG) i pretvaranje u strukturirani JSON.
 */
export async function analyzeDocumentGoogle({
  apiKey = null,
  model = "gemini-1.5-pro",
  prompt = null,
  schema = null,
  files = [],
  onProgress = () => {}
}) {
  const finalApiKey = apiKey || import.meta.env.VITE_GOOGLE_AI_API_KEY;
  if (!finalApiKey) throw new Error("Google AI API ključ nije konfiguriran. Postavite VITE_GOOGLE_AI_API_KEY u .env datoteku.");
  if (!files.length) throw new Error("Nije priložena nijedna datoteka za analizu.");

  const ai = new GoogleGenAI({ apiKey: finalApiKey });

  const generationConfig = {
    responseMimeType: "application/json",
    responseSchema: schema || createDocumentSchema(),
  };

  const isVisionMode = files.some(f => f.type.includes('image'));
  const finalPrompt = prompt || (isVisionMode ? PROMPT_HR_ACCOUNTING_VISION : PROMPT_HR_ACCOUNTING);

  const parts = [{ text: finalPrompt }];
  onProgress("Priprema datoteka...", 20);
  console.group('📦 GOOGLE AI REQUEST PREPARATION');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const decision = shouldUseFileAPI(file);
    onProgress(`Obrada datoteke ${i + 1}/${files.length}...`, 20 + (i / files.length) * 30);

    console.log(`📄 File ${i + 1}: ${file.name || 'file'}, Method: ${decision.useFileAPI ? 'File API' : 'Inline Base64'}, Reason: ${decision.reason}`);

    if (decision.useFileAPI) {
      try {
        const uploadResult = await uploadFileToGoogle(finalApiKey, file, file.name || `Document-${i + 1}`);
        parts.push({
          fileData: {
            mimeType: uploadResult.mimeType,
            fileUri: uploadResult.uri
          }
        });
      } catch (uploadError) {
        console.warn(`⚠️ File API upload failed for ${file.name}, falling back to inline.`, uploadError);
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: await blobToBase64(file)
          }
        });
      }
    } else {
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: await blobToBase64(file)
        }
      });
    }
  }
  console.groupEnd();
  onProgress("Slanje zahtjeva Google AI...", 50);

  try {
    const result = await ai.models.generateContent({
      model,
      contents: parts,
      generationConfig,        // <- na rootu, ne u "config"
    });
    onProgress("Obrada odgovora...", 80);

    console.group('📥 GOOGLE AI RESPONSE');
    const response = result;
    console.log('✅ Response received.');

    const responseText =
      (result?.response && typeof result.response.text === 'function')
        ? result.response.text()
        : (typeof result?.text === 'function' ? result.text() : (result?.text || ''));

    let data;
    try {
      const jsonStr = extractJsonString(responseText);
      data = JSON.parse(jsonStr);
      console.log('✅ JSON parsing successful.');
    } catch (parseError) {
      console.error('❌ JSON parsing failed. Raw text:', responseText);
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }

    // Normalize the payload to handle different response formats
    data = normalizeMultimodalPayload(data);
    console.groupEnd();
    onProgress("Analiza završena!", 100);

    return { ok: true, data, raw: response };

  } catch (error) {
    console.error('❌ Google AI API Error:', error);
    onProgress("Greška u analizi.", 100);
    throw error;
  }
}

/**
 * Pokreće serijsku obradu više dokumenata.
 */
export async function batchAnalyzeDocuments({
  apiKey = null,
  model = "gemini-1.5-pro",
  documents,
  onProgress,
  onDocumentComplete
}) {
  const finalApiKey = apiKey || import.meta.env.VITE_GOOGLE_AI_API_KEY;
  const results = [];
  const total = documents.length;

  for (let i = 0; i < total; i++) {
    const doc = documents[i];
    const docProgress = (message, progressPercent) => {
      const overallProgress = ((i / total) * 100) + (progressPercent / total);
      if (onProgress) onProgress(`[${i + 1}/${total}] ${doc.name}: ${message}`, overallProgress);
    };

    try {
      const result = await analyzeDocumentGoogle({
        apiKey: finalApiKey,
        model,
        files: [doc.file],
        onProgress: docProgress
      });
      const analysisResult = { name: doc.name, success: true, data: result.data };
      results.push(analysisResult);
      if (onDocumentComplete) onDocumentComplete(analysisResult, i + 1, total);
    } catch (error) {
      const errorResult = { name: doc.name, success: false, error: error.message, data: null };
      results.push(errorResult);
      if (onDocumentComplete) onDocumentComplete(errorResult, i + 1, total);
    }
  }
  return results;
}

/**
 * Uspoređuje analizirane dokumente i generira uvide.
 */
export function compareDocuments(documents) {
  // Implementacija ostaje ista...
  // Ovdje možete dodati logiku za usporedbu
  if (!documents || documents.length < 2) {
    return { error: "Potrebna su barem 2 dokumenta za usporedbu." };
  }
  return { summary: `Uspoređeno ${documents.length} dokumenata.`};
}

/**
 * Testira ispravnost API ključa i konekciju s Google AI servisom.
 */
export async function testGoogleAIConnection(apiKey = null, model = "gemini-1.5-pro") {
  const finalApiKey = apiKey || import.meta.env.VITE_GOOGLE_AI_API_KEY;
  if (!finalApiKey) throw new Error("API ključ je obavezan za testiranje konekcije.");

  try {
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': finalApiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Test konekcije - odgovori kratko 'OK'" }] }] })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const status = response.status;
      if (status === 400) throw new Error("API ključ nije valjan ili model nije dostupan.");
      if (status === 403) throw new Error("API ključ nema dozvolu za pristup Gemini modelu.");
      if (status === 429) throw new Error("Previše zahtjeva (Rate Limit Exceeded). Pokušajte ponovo kasnije.");
      throw new Error(`API greška: ${status} - ${errorData.error?.message || 'Nepoznata greška'}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { success: true, message: "API konekcija uspješna!", model, testResponse: responseText };

  } catch (error) {
    if (error.message.includes('fetch')) throw new Error("Mrežna greška: Nema internetske konekcije ili je Google AI servis nedostupan.");
    throw error;
  }
}


export default {
  analyzeDocumentGoogle,
  batchAnalyzeDocuments,
  compareDocuments,
  testGoogleAIConnection,
  uploadFileToGoogle,
  createDocumentSchema,
  PROMPT_HR_ACCOUNTING,
  PROMPT_HR_ACCOUNTING_VISION
};