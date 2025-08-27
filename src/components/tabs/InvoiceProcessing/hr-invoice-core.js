// /src/lib/hr-invoice-core.js
// Hrvatski računi/ponude/predračuni + LogiKal ispisi (AGS).
// Poboljšano: PDF linije (y-grupiranje), filtriranje LogiKal šuma,
// sigurniji fallback za stavke i širi skup regexa za UKUPNO.

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

GlobalWorkerOptions.workerSrc = pdfWorker;

/** ======================== POMOĆNE ======================== */
export function normalizeWhitespace(s) {
  return (s || '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
export function toAscii(s) {
  return (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}
export function parseHRNumber(raw) {
  if (raw == null) return null;
  let s = ('' + raw).replace(/\u00A0/g, ' ').trim();
  s = s.replace(/[€\s]+/g, '').replace(/[A-Za-z]+/g, '');
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  } else {
    s = s.replace(/\.(?=\d{3}\b)/g, '');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function parseHRDate(raw) {
  if (!raw) return null;
  const m = ('' + raw).trim().match(/\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})\b/);
  if (!m) return null;
  let [_, d, mo, y] = m;
  let year = Number(y);
  if (year < 100) year += 2000;
  const iso = `${year}-${String(Number(mo)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : iso;
}
export function firstMatch(text, regexes, group = 1) {
  for (const r of regexes) {
    const m = text.match(r);
    if (m && m[group]) return m[group].trim();
  }
  return null;
}
export function detectCurrency(text) {
  if (/\bEUR\b|€/.test(text)) return 'EUR';
  return 'EUR';
}

/** ========== Detekcija tipa dokumenta ========== */
export function detectDocType(text) {
  const t = toAscii(text).toUpperCase();
  if (/\bRACUN\b/.test(t)) return 'RAČUN';
  if (/\bPREDRACUN\b|\bPROFORMA\b/.test(t)) return 'PREDRAČUN';
  if (/\bPONUDA\b/.test(t)) return 'PONUDA';
  if (/\bESTIMATION\b|\bPROCJENA\b|\bLOGIKAL\b/.test(t)) return 'PROCJENA';
  return 'OSTALO';
}

/** ========== Stranke ========== */
export function extractParties(text) {
  const oibRegex = /\bOIB[:\s]*([0-9]{11})\b/;
  const ibanRegex = /\bIBAN[:\s]*([A-Z]{2}\d{19}|\bHR[0-9]{19}\b)\b/;
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  const blocks = text.split(/\n{2,}/).map(b => normalizeWhitespace(b));
  let seller = {}, buyer = {};
  const candidates = [];
  for (const block of blocks) {
    const oib = firstMatch(block, [oibRegex]);
    if (oib) {
      const lines = block.split('\n').map(s => s.trim()).filter(Boolean);
      const nameLine =
        lines.find(l => /(d\.o\.o\.|d\.d\.|j\.d\.o\.o\.|obrt)/i.test(l)) ||
        lines.find(l => l.length > 5);
      const email = firstMatch(block, [emailRegex]);
      const iban = firstMatch(block, [ibanRegex]);
      candidates.push({ raw: block, name: nameLine, oib, iban, email });
    }
  }
  if (candidates.length >= 2) {
    seller = candidates[0];
    buyer = candidates[1];
  } else if (candidates.length === 1) {
    const one = candidates[0];
    if (/ALUMINIUM\s+GLASS\s+STEEL/i.test(one.name || '')) buyer = one; else seller = one;
  }
  return { seller, buyer };
}

/** ========== Meta ========== */
export function extractDocMeta(text) {
  const currency = detectCurrency(text);
  const docType = detectDocType(text);

  const number = firstMatch(text, [
    /\bPonuda\s*br\.?\s*[:#]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bPONUDA\s*-\s*PREDRA[CČ]UN\s*br\.?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bPROFORMA\s*[- ]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bRa[cč]un\s*[:#]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bQuote\s*No\.?\s*[:#]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bJob\s*No\.?\s*[:#]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
  ]);

  const issue = firstMatch(text, [
    /\bDatum\s+dokumenta\s*[:]?\s*([0-9.\-\/ ]{6,})/i,
    /\bDatum\s*[:]?\s*([0-9.\-\/ ]{6,})/i,
    /\bDate\s*[:]?\s*([0-9.\-\/ ]{6,})/i,
  ]);
  const due = firstMatch(text, [
    /\bDatum\s+dospije[cć]a\s*[:]?\s*([0-9.\-\/ ]{6,})/i,
    /\bVrijedi\s+do\s*[:]?\s*([0-9.\-\/ ]{6,})/i,
  ]);
  const place = firstMatch(text, [
    /\bMjesto\s+i\s+datum[: ]\s*([A-Za-zĆČŽĐŠćčžđš ,.\-0-9]+)\b/i,
    /\bMjesto\s+izdavanja[: ]\s*([A-Za-zĆČŽĐŠćčžđš ,.\-0-9]+)\b/i,
  ]);

  const issueDate = parseHRDate(issue);
  const dueDate = parseHRDate(due);

  const payTerms = firstMatch(text, [
    /\bNa[cč]in\s+pla[cć]anja[: ]\s*([^\n]+)/i,
    /\bUvjeti\s+pla[cć]anja[: ]\s*([^\n]+)/i,
    /\bPla[cć]anje\s*[: ]\s*([^\n]+)/i,
  ]);
  const deliv = firstMatch(text, [
    /\bNa[cč]in\s+isporuke[: ]\s*([^\n]+)/i,
    /\bRok\s+isporuke[: ]\s*([^\n]+)/i,
    /\bIsporuka\s*[: ]\s*([^\n]+)/i,
  ]);

  return { docType, number, issueDate, dueDate, place, currency, paymentTerms: payTerms, delivery: deliv };
}

/** ========== Rekapitulacija ========== */
export function extractTotals(text) {
  const blocks = normalizeWhitespace(text);

  const subtotal = parseHRNumber(firstMatch(blocks, [
    /\bOSNOVICA(?:\s*[-–]\s*PDV)?\s*(?:\(\s*25[,\.]0+%?\s*\))?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bOSNOVICA\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bNet(?:to)?\s*amount\s*[: ]\s*([0-9\.\,\s]+)\b/i,
  ]));

  const vatAmount = parseHRNumber(firstMatch(blocks, [
    /\bPDV(?:\s*iznos)?\s*(?:\(\s*25[,\.]0+%?\s*\))?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bVAT\s*(?:amount)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
  ]));

  const total = parseHRNumber(firstMatch(blocks, [
    /\bZa\s+naplatu.*?([0-9\.\,\s]+)\b/i,
    /\bSVEUKUPNO\s*(?:EUR|€)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bUkupno\s*(?:s\s*PDV-?om)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bTotal\s*(?:price|amount|sum)?\s*(?:EUR|€)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
  ]));

  const discount = parseHRNumber(firstMatch(blocks, [
    /\bUkupno\s+rabat\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bRabat\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bDiscount\s*[: ]\s*([0-9\.\,\s]+)\b/i,
  ]));

  let vatRate = 25;
  if (/\bPDV[^0-9]*(0[,\.]?0*%)/i.test(blocks)) vatRate = 0;
  if (/\b25\s*%/.test(blocks)) vatRate = 25;

  return {
    subtotal: subtotal ?? null,
    discountTotal: discount ?? null,
    vatRate,
    vatAmount: vatAmount ?? null,
    total: (total ?? (subtotal != null && vatAmount != null ? +(subtotal + vatAmount).toFixed(2) : null)),
  };
}

/** ========== Stavke (tablice) ========== */
function looksLikeHeader(line) {
  const t = toAscii(line).toUpperCase();
  let score = 0;
  if (/\bSIFRA|\bARTIKL|\bNAZIV|\bOPIS/.test(t)) score++;
  if (/\bJMJ|\bJM|\bJ\.MJ\.|\bJED\.?/.test(t)) score++;
  if (/\bKOLICINA|\bKOL\.?/.test(t)) score++;
  if (/\bCIJENA|\bC\.?JED/.test(t)) score++;
  if (/\bPDV\b|\bRABAT|\bUKUPNO|\bIZNOS/.test(t)) score++;
  return score >= 2;
}

// kratka sanitizacija “LogiKal/Estimation/Optimization/Please check/Orgadata” buke
export function stripVendorNoise(text) {
  const bad = [
    /^(?:Estimation|Optimization)\s+on\s+Page.*$/i,
    /^Person\s+in\s+Charge.*$/i,
    /^Date\s*:.*$/i,
    /^Time\s*:.*$/i,
    /^Please\s+check.*$/i,
    /ORGADATA|LogiKal/i,
    /^Germany\s*:/i,
  ];
  const lines = normalizeWhitespace(text).split('\n');
  const clean = lines.filter(ln => !bad.some(r => r.test(ln)));
  return clean.join('\n').replace(/\n{3,}/g, '\n\n');
}

const LONG_NAME_LIMIT = 180;

export function extractLinesFromPlainText(text) {
  const lines = normalizeWhitespace(text).split('\n');

  // 1) Pokušaj tablični header
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 400); i++) {
    if (looksLikeHeader(lines[i])) { headerIdx = i; break; }
  }

  if (headerIdx !== -1) {
    const out = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const ln = lines[i];
      if (/^\s*$/.test(ln)) continue;
      if (/\bOSNOVICA\b|\bPDV\b|\bUKUPNO\b|\bSVEUKUPNO\b|\bZA NAPLATU\b/i.test(ln)) break;

      const parts = ln.split(/\t| {2,}/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) continue;

      let qty = null, unitPrice = null, amountNet = null, vatPct = null, discountPct = null, unit = null;

      const unitIdx = parts.findIndex(p => /\b(kom|pcs|m2|m|kg|rol|pak|par|jmj|jm)\b/i.test(p));
      if (unitIdx !== -1) unit = parts[unitIdx];

      if (unitIdx > 0 && parseHRNumber(parts[unitIdx - 1]) !== null) {
        qty = parseHRNumber(parts[unitIdx - 1]);
      } else {
        const cand = parts.find(p => /^[0-9]+([.,][0-9]+)?$/.test(p));
        if (cand) qty = parseHRNumber(cand);
      }

      const numeric = parts.map((p, idx) => ({ idx, val: parseHRNumber(p) })).filter(o => o.val !== null);
      if (numeric.length >= 2) {
        amountNet = numeric[numeric.length - 1].val;
        unitPrice = numeric[numeric.length - 2].val;
      }

      const vatTxt = parts.find(p => /%/.test(p) && /pdv/i.test(ln));
      const discTxt = parts.find(p => /%/.test(p) && /rabat/i.test(ln));
      if (vatTxt) vatPct = parseHRNumber(vatTxt);
      if (discTxt) discountPct = parseHRNumber(discTxt);
      if (!vatPct) {
        const anyPct = parts.find(p => /%/.test(p));
        if (anyPct) vatPct = parseHRNumber(anyPct);
      }

      let code = null, name = null;
      if (/^[A-Z0-9\-\.\/]+$/.test(parts[0]) && parts[0].length >= 3) {
        code = parts[0];
        name = parts.slice(1, unitIdx === -1 ? undefined : unitIdx).join(' ');
      } else {
        name = parts.slice(0, unitIdx === -1 ? undefined : unitIdx).join(' ');
      }

      const prettyName = name && name.length > LONG_NAME_LIMIT ? name.slice(0, LONG_NAME_LIMIT) + '…' : name;

      out.push({
        rbr: out.length + 1,
        code: code || null,
        name: prettyName || ln.trim(),
        unit,
        qty,
        unitPrice,
        discountPct,
        vatPct,
        amountNet,
        amountGross: null,
      });
    }
    return out;
  }

  // 2) NEMA TABLICE → pametni fallback (izbjegni kilometarske retke)
  const out = [];

  // “Pozicija/Position/Item” blokovi (LogiKal)
  const posSplits = text.split(/\n(?=\s*(?:Pozicija|Position|Pos\.?|Item)\s*[:# ]?\s*\d+)/i);
  if (posSplits.length > 1) {
    for (const chunk of posSplits) {
      const firstLine = chunk.split('\n').find(x => x && x.trim().length > 3) || '';
      const compact = firstLine.trim().replace(/\s+/g, ' ');
      if (!compact) continue;
      const short = compact.length > LONG_NAME_LIMIT ? compact.slice(0, LONG_NAME_LIMIT) + '…' : compact;
      out.push({
        rbr: out.length + 1,
        code: null,
        name: short,
        unit: null, qty: null, unitPrice: null, discountPct: null, vatPct: null, amountNet: null, amountGross: null
      });
      if (out.length >= 50) break; // safety
    }
  }

  // Ako i dalje ništa smisleno, vrati prazno — bolje prazno nego šum.
  return out;
}

/** ========== Excel stavke ========== */
export function extractLinesFromExcel(workbook) {
  const out = [];
  const headersSyn = {
    code: ['šifra', 'sifra', 'oznaka', 'artikl', 'šif.art.', 'šif. art.'],
    name: ['naziv', 'opis', 'naziv artikla', 'šifra i naziv robe / usluge'],
    unit: ['jm', 'jmj', 'j.mj.', 'jed'],
    qty: ['količina', 'kolicina', 'kol.', 'kol', 'količ'],
    unitPrice: ['jed. cijena', 'cijena', 'cijena bez pdv', 'c.jed', 'vpc'],
    vatPct: ['pdv', 'pdv %', 'stopa'],
    discountPct: ['rabat', 'rab %', 'popust'],
    amount: ['iznos', 'ukupno', 'vrijednost', 'cijena/iznos'],
  };

  const strEq = (a, b) => toAscii(a).toLowerCase() === toAscii(b).toLowerCase();
  const includesAny = (h, arr) => arr.some(s => strEq(h, s));

  const trySheet = (ws) => {
    const sheet = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    if (!sheet.length) return;

    let headerRowIdx = -1;
    let headerMap = null;

    for (let r = 0; r < Math.min(sheet.length, 15); r++) {
      const row = sheet[r].map(v => (v || '').toString().trim());
      if (!row.length) continue;

      const map = {};
      row.forEach((h, idx) => {
        const H = toAscii(h).toLowerCase();
        if (includesAny(H, headersSyn.code)) map.code = idx;
        if (includesAny(H, headersSyn.name)) map.name = idx;
        if (includesAny(H, headersSyn.unit)) map.unit = idx;
        if (includesAny(H, headersSyn.qty)) map.qty = idx;
        if (includesAny(H, headersSyn.unitPrice)) map.unitPrice = idx;
        if (includesAny(H, headersSyn.vatPct)) map.vatPct = idx;
        if (includesAny(H, headersSyn.discountPct)) map.discountPct = idx;
        if (includesAny(H, headersSyn.amount)) map.amount = idx;
      });

      const hits = Object.keys(map).length;
      if (hits >= 3) { headerRowIdx = r; headerMap = map; break; }
    }

    if (headerRowIdx === -1) return;

    for (let r = headerRowIdx + 1; r < sheet.length; r++) {
      const row = sheet[r];
      if (!row || row.every(c => !c)) continue;

      const get = (k) => headerMap[k] != null ? (row[headerMap[k]] ?? '').toString() : '';
      const name = get('name') || '';
      if (!name.trim()) continue;

      const prettyName = name.length > LONG_NAME_LIMIT ? name.slice(0, LONG_NAME_LIMIT) + '…' : name;

      out.push({
        rbr: out.length + 1,
        code: get('code') || null,
        name: prettyName,
        unit: get('unit') || null,
        qty: parseHRNumber(get('qty')),
        unitPrice: parseHRNumber(get('unitPrice')),
        discountPct: parseHRNumber(get('discountPct')),
        vatPct: parseHRNumber(get('vatPct')),
        amountNet: parseHRNumber(get('amount')),
        amountGross: null,
      });
    }
  };

  for (const sn of (workbook.SheetNames || [])) trySheet(workbook.Sheets[sn]);
  return out;
}

/** ========== PDF ekstrakcija — linije po Y koordinati ========== */
function itemsToPageText(content) {
  const items = content.items || [];
  if (!items.length) return '';
  const lines = [];
  let row = [];
  let prevY = null;
  const TOL = 3; // px

  for (const it of items) {
    const y = Math.round((it.transform && it.transform[5]) || 0);
    const str = (it.str || '').trim();
    if (!str) continue;

    if (prevY === null) prevY = y;

    const newLine = (Math.abs(y - prevY) > TOL) || it.hasEOL === true;
    if (newLine) {
      if (row.length) lines.push(row.join(' '));
      row = [str];
      prevY = y;
    } else {
      row.push(str);
    }
  }
  if (row.length) lines.push(row.join(' '));
  return lines.join('\n');
}

export async function extractTextFromPdf(fileOrArrayBuffer) {
  const data = fileOrArrayBuffer instanceof ArrayBuffer ? fileOrArrayBuffer : await fileOrArrayBuffer.arrayBuffer();
  const pdf = await getDocument({ data }).promise;

  const pages = [];
  let fullText = '';

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = normalizeWhitespace(itemsToPageText(content));
    pages.push(pageText);
    fullText += pageText + '\n';
  }

  // Ako nakon pokušaja linija i dalje “premalo” teksta, probaj OCR (skener)
  let ocrUsed = false;
  const avgLen = fullText.length / Math.max(1, pdf.numPages);
  if (avgLen < 150) {
    const ocr = await Tesseract.recognize(data, 'hrv+eng', { tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    fullText = normalizeWhitespace(ocr.data.text || '');
    ocrUsed = true;
  }

  return { text: fullText, pages, ocrUsed };
}

/** ========== OCR slike ========== */
export async function extractTextFromImage(fileOrBlob) {
  const { data } = await Tesseract.recognize(fileOrBlob, 'hrv+eng', { tessedit_pageseg_mode: Tesseract.PSM.AUTO });
  return { text: normalizeWhitespace(data.text || ''), ocrUsed: true };
}

/** ========== Excel ========== */
export async function parseExcel(fileOrArrayBuffer) {
  const data = fileOrArrayBuffer instanceof ArrayBuffer ? fileOrArrayBuffer : await fileOrArrayBuffer.arrayBuffer();
  return XLSX.read(data, { type: 'array' });
}

/** ========== Glavna: parseAnyFile ========== */
export async function parseAnyFile(file) {
  const mime = file.type || '';
  const name = file.name || 'dokument';

  let rawText = '';
  let excelWb = null;

  if (mime.includes('pdf')) {
    const pdf = await extractTextFromPdf(file);
    rawText = pdf.text;
  } else if (mime.startsWith('image/')) {
    const img = await extractTextFromImage(file);
    rawText = img.text;
  } else if (mime.includes('sheet') || /\.xlsx?$/i.test(name) || mime.includes('ms-excel')) {
    excelWb = await parseExcel(file);
    const txtParts = [];
    for (const sn of excelWb.SheetNames) {
      const rows = XLSX.utils.sheet_to_csv(excelWb.Sheets[sn], { FS: '\t' });
      txtParts.push(rows);
    }
    rawText = txtParts.join('\n');
  } else {
    rawText = await file.text();
  }

  // LogiKal/AGS šum -> out
  const text = stripVendorNoise(normalizeWhitespace(rawText));

  const meta = extractDocMeta(text);
  const { seller, buyer } = extractParties(text);
  const summary = extractTotals(text);

  let lines = [];
  if (excelWb) {
    lines = extractLinesFromExcel(excelWb);
  } else {
    lines = extractLinesFromPlainText(text);

    // Ako fallback vratio *samo* 1–2 jako duga retka (tipično loš slučaj) → bolje prazno
    const looksBad =
      lines.length > 0 &&
      lines.length <= 2 &&
      lines.every(l => (l.name || '').length > LONG_NAME_LIMIT);
    if (looksBad) lines = [];
  }

  const result = {
    source: { filename: name, mimetype: mime },
    doc: meta,
    seller,
    buyer,
    lines,
    summary,
    rawText: text,
  };

  // Posljednji pokušaj “UKUPNO” u repu
  if (result.summary.total == null) {
    const tail = text.split('\n').slice(-60).join('\n');
    const t2 = parseHRNumber(firstMatch(tail, [
      /\bUKUPNO\s*[: ]\s*([0-9\.\,\s]+)\b/i,
      /\bSVEUKUPNO\s*[: ]\s*([0-9\.\,\s]+)\b/i,
      /\bTotal\s*(?:amount|sum)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    ]));
    if (t2 != null) result.summary.total = t2;
  }

  return result;
}
