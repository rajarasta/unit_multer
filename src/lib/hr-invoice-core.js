// /src/lib/hr-invoice-core.js
// Logika za: ekstrakciju teksta iz PDF/SLIKA/EXCEL, parsiranje HR računa/ponuda/predračuna,
// normalizaciju brojeva/datumâ i heuristike za tablice stavki.
// Radi s: pdfjs-dist, tesseract.js, xlsx

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

// ====== PDF.js worker ======
GlobalWorkerOptions.workerSrc = pdfWorker;

// ====== Pomoćne funkcije ======
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

// Prepoznaje razne HR formate: 2.507,45 ; 3 428,50 ; 3,281.50 ; 724,99 ; 724.99
export function parseHRNumber(raw) {
  if (raw == null) return null;
  let s = ('' + raw).replace(/\u00A0/g, ' ').trim();

  // Makni oznake valute i nepotrebne znakove
  s = s.replace(/[€\s]+/g, '').replace(/[A-Za-z]+/g, '');

  // Ako ima i točku i zarez, pretpostavi da je zarez decimalni (EU)
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.'); // 2.507,45 -> 2507.45
  } else if (s.includes(',')) {
    // samo zarez -> decimalni zarez
    // ukloni razmake tisućica ako ih ima
    s = s.replace(/\.(?=\d{3}\b)/g, ''); // sigurnosno
    s = s.replace(',', '.');
  } else {
    // samo točke ili ništa
    // ukloni razmake tisućica
    s = s.replace(/\.(?=\d{3}\b)/g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parseHRDate(raw) {
  // podržava: 02.07.2025 ; 18.7.25 ; 12-12-24 ; 30/08/2024
  if (!raw) return null;
  const s = ('' + raw).trim();
  const m = s.match(
    /\b(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})\b/
  );
  if (!m) return null;
  let [_, d, mo, y] = m;
  let year = Number(y);
  if (year < 100) year += 2000;
  const month = String(Number(mo)).padStart(2, '0');
  const day = String(Number(d)).padStart(2, '0');
  const iso = `${year}-${month}-${day}`;
  // Validacija
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

export function allMatches(text, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(text))) {
    out.push(m);
  }
  return out;
}

export function detectCurrency(text) {
  if (/\bEUR\b|€/.test(text)) return 'EUR';
  return 'EUR'; // default
}

// ====== Detekcija tipa dokumenta ======
export function detectDocType(text) {
  const t = toAscii(text).toUpperCase();

  if (/\bRACUN\b/.test(t)) return 'RAČUN';
  if (/\bPREDRACUN\b|\bPROFORMA\b/.test(t)) return 'PREDRAČUN';
  if (/\bPONUDA\b/.test(t)) return 'PONUDA';
  if (/\bESTIMATION\b|\bEVALUATION\b|LOGIKAL/i.test(text)) return 'PROCJENA';
  return 'OSTALO';
}

// ====== Ekstrakcija ključnih polja ======
export function extractParties(text) {
  // Vrlo tolerantno, vraća najbolje pogodke
  const oibRegex = /\bOIB[:\s]*([0-9]{11})\b/;
  const ibanRegex = /\bIBAN[:\s]*([A-Z]{2}\d{19}|\bHR[0-9]{19}\b)\b/;
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  // Heuristika: blokovi prije/poslije OIB pojave
  const blocks = text.split(/\n{2,}/).map(b => normalizeWhitespace(b));
  let seller = {};
  let buyer = {};

  // Nađi sve OIB-ove i heuristički zakvači ime u istom bloku
  const candidates = [];
  for (const block of blocks) {
    const oib = firstMatch(block, [oibRegex]);
    if (oib) {
      // Naziv: prva linija s d.o.o. / d.d. / obrt / j.d.o.o. ili VELIKIM SLOVIMA
      const lines = block.split('\n').map(s => s.trim()).filter(Boolean);
      const nameLine =
        lines.find(l => /(d\.o\.o\.|d\.d\.|j\.d\.o\.o\.|obrt)/i.test(l)) ||
        lines.find(l => l.length > 5);
      const email = firstMatch(block, [emailRegex]);
      const iban = firstMatch(block, [ibanRegex]);
      candidates.push({
        raw: block,
        name: nameLine,
        oib,
        iban,
        email,
      });
    }
  }

  // Ako postoje 2, pretpostavi 1. = prodavatelj, 2. = kupac (često tako)
  if (candidates.length >= 2) {
    seller = candidates[0];
    buyer = candidates[1];
  } else if (candidates.length === 1) {
    // imamo samo jedan OIB (često samo kupac)
    // Procjena: ako sadrži riječi "ALUMINIUM GLASS STEEL" set kao kupac
    const one = candidates[0];
    if (/ALUMINIUM\s+GLASS\s+STEEL/i.test(one.name || '')) {
      buyer = one;
    } else {
      seller = one;
    }
  }

  return { seller, buyer };
}

export function extractDocMeta(text) {
  const currency = detectCurrency(text);
  const docType = detectDocType(text);

  // Brojevi dokumenta — pokrivaju tipične varijacije
  const number = firstMatch(text, [
    /\bPonuda\s*br\.?\s*[:#]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bPONUDA\s*-\s*PREDRA[CČ]UN\s*br\.?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bPROFORMA\s*-\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bRa[cč]un\s*[:#]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
    /\bQuote\s*No\.?\s*[:#]?\s*([A-Z0-9\/\-\.\s]+)\b/i,
  ]);

  // Datumi (izdavanja / dospijeća / vrijedi do / datum dokumenta)
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

  // Uvjeti plaćanja / isporuke (opcionalno)
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

  const issueDate = parseHRDate(issue);
  const dueDate = parseHRDate(due);

  return { docType, number, issueDate, dueDate, place, currency, paymentTerms: payTerms, delivery: deliv };
}

// ====== Re-cap / Total ======
export function extractTotals(text) {
  // Osnovica, PDV, Ukupno, Za naplatu...
  const blocks = normalizeWhitespace(text);

  const subtotal = parseHRNumber(firstMatch(blocks, [
    /\bOsnovica(?:\s*-\s*PDV)?\s*\(\s*25[,\.]00%?\s*\)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bOSNOVICA\s*[: ]\s*([0-9\.\,\s]+)\b/i,
  ]));

  // PDV iznosi
  const vatAmount = parseHRNumber(firstMatch(blocks, [
    /\bPDV(?:\s*iznos)?\s*(?:\(\s*25[,\.]00%?\s*\))?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bIznos\s*-\s*PDV\s*\(\s*25[,\.]00%?\s*\)\s*[: ]\s*([0-9\.\,\s]+)\b/i,
  ]));

  // Ukupno s/bez PDV
  const total = parseHRNumber(firstMatch(blocks, [
    /\bZa\s+naplatu.*?([0-9\.\,\s]+)\b/i,
    /\bSVEUKUPNO\s*(?:EUR|€)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bUkupno\s*EUR\s*s\s*PDV(?:-om)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bUkupno\s*(?:s\s*PDV-om)?\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bEstimation\s*Price\s*([0-9\.\,\s]+)\s*EUR/i,
  ]));

  const discount = parseHRNumber(firstMatch(blocks, [
    /\bUkupno\s+rabat\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    /\bRabat\s*[: ]\s*([0-9\.\,\s]+)\b/i,
  ]));

  // Ako nema ukupno, probaj subtotal + PDV
  const computedTotal = (total ?? null) ?? (
    subtotal != null && vatAmount != null ? +(subtotal + vatAmount).toFixed(2) : null
  );

  // VAT rate heuristika: ako piše 25 ili 0 (neki dokumenti bez PDV-a)
  let vatRate = 25;
  if (/\bPDV[^0-9]*(0[,\.]?0*%)/i.test(blocks)) vatRate = 0;
  if (/\b25\s*%/.test(blocks)) vatRate = 25;

  return {
    subtotal: subtotal ?? null,
    discountTotal: discount ?? null,
    vatRate,
    vatAmount: vatAmount ?? null,
    total: computedTotal,
  };
}

// ====== Stavke (heuristike) ======
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

export function extractLinesFromPlainText(text) {
  // 1) podijeli na linije
  const lines = normalizeWhitespace(text).split('\n');
  // 2) pronađi header i kraj (prije rekapitulacije)
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (looksLikeHeader(lines[i])) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    // Fallback: pokušaj sve linije koje sadrže brojčane kolone
    return lines
      .map((ln, i) => ({ ln, i }))
      .filter(o => /[0-9],[0-9]{2}\b/.test(o.ln) || /\b[0-9]+\s*(kom|pcs|m2|m|kg|rol|pak|par)\b/i.test(o.ln))
      .map(({ ln }, idx) => ({
        rbr: idx + 1,
        code: null,
        name: ln.trim(),
        unit: null,
        qty: null,
        unitPrice: null,
        discountPct: null,
        vatPct: null,
        amountNet: null,
        amountGross: null,
      }));
  }

  // 3) Parsiraj redove nakon headera dok ne naiđemo na rekapitulaciju
  const out = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (/^\s*$/.test(ln)) continue;
    if (/\bOSNOVICA\b|\bPDV\b|\bUKUPNO\b|\bSVEUKUPNO\b|\bZA NAPLatu\b/i.test(ln)) break;

    // Razdvajanje kolona: više razmaka ili tab
    const parts = ln.split(/\t| {2,}/).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    // Heuristike: pokušaj pronaći brojčane kolone
    let qty = null, unitPrice = null, amountNet = null, vatPct = null, discountPct = null, unit = null;

    // nađi kom/jmj
    const unitIdx = parts.findIndex(p => /\b(kom|pcs|m2|m|kg|rol|pak|par|jmj|jm)\b/i.test(p));
    if (unitIdx !== -1) unit = parts[unitIdx];

    // nađi vjerojatnu količinu (broj blizu jedinice)
    if (unitIdx > 0 && parseHRNumber(parts[unitIdx - 1]) !== null) {
      qty = parseHRNumber(parts[unitIdx - 1]);
    } else {
      // fallback — prvo polje koje izgleda kao količina
      const cand = parts.find(p => /^[0-9]+([.,][0-9]+)?$/.test(p));
      if (cand) qty = parseHRNumber(cand);
    }

    // cijena i iznos — tipično zadnje dvije brojčane kolone
    const numeric = parts.map((p, idx) => ({ idx, val: parseHRNumber(p) })).filter(o => o.val !== null);
    if (numeric.length >= 2) {
      amountNet = numeric[numeric.length - 1].val;
      unitPrice = numeric[numeric.length - 2].val;
    }

    // PDV i rabat postoci — traži s '%' u istom redu
    const vatTxt = parts.find(p => /%/.test(p) && /pdv/i.test(ln));
    const discTxt = parts.find(p => /%/.test(p) && /rabat/i.test(ln));
    if (vatTxt) vatPct = parseHRNumber(vatTxt);
    if (discTxt) discountPct = parseHRNumber(discTxt);
    if (!vatPct) {
      const anyPct = parts.find(p => /%/.test(p));
      if (anyPct) vatPct = parseHRNumber(anyPct);
    }

    // šifra + naziv
    let code = null, name = null;
    // šifra često na početku; naziv dugačak tekst
    if (/^[A-Z0-9\-\.\/]+$/.test(parts[0]) && parts[0].length >= 3) {
      code = parts[0];
      name = parts.slice(1, unitIdx === -1 ? undefined : unitIdx).join(' ');
    } else {
      name = parts.slice(0, unitIdx === -1 ? undefined : unitIdx).join(' ');
    }

    out.push({
      rbr: out.length + 1,
      code: code || null,
      name: name || ln.trim(),
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

// EXCEL stavke: pokušaj mapiranja kolona po nazivima
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

    // Pronađi header red (onaj koji sadrži barem 3 pogotka iz bilo kojih skupina)
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
      if (hits >= 3) {
        headerRowIdx = r;
        headerMap = map;
        break;
      }
    }

    if (headerRowIdx === -1) return;

    for (let r = headerRowIdx + 1; r < sheet.length; r++) {
      const row = sheet[r];
      if (!row || row.every(c => !c)) continue;

      const get = (k) => headerMap[k] != null ? (row[headerMap[k]] ?? '').toString() : '';
      const name = get('name') || '';
      if (!name.trim()) continue;

      out.push({
        rbr: out.length + 1,
        code: get('code') || null,
        name,
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

  const sheetNames = workbook.SheetNames || [];
  for (const sn of sheetNames) {
    trySheet(workbook.Sheets[sn]);
  }
  return out;
}

// ====== Ekstrakcija teksta iz PDF ======
export async function extractTextFromPdf(fileOrArrayBuffer) {
  const loadingTask = getDocument({
    data: fileOrArrayBuffer instanceof ArrayBuffer
      ? fileOrArrayBuffer
      : await fileOrArrayBuffer.arrayBuffer(),
  });

  const pdf = await loadingTask.promise;
  const pages = [];
  let fullText = '';

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map(it => it.str).join(' ');
    const cleaned = normalizeWhitespace(pageText);
    pages.push(cleaned);
    fullText += cleaned + '\n';
  }

  // Ako tekst slab (npr. sken), fallback na OCR
  const avgLen = fullText.length / Math.max(1, pdf.numPages);
  let ocrUsed = false;
  if (avgLen < 250) {
    // OCR svaka stranica kao image via render, ali u browseru: render to canvas -> ocr
    // Ovdje jednostavno probamo jedan batch OCR-a cijelog file-a (brže za PoC)
    // Napomena: za produkciju preporučujem OCR po stranici s pdf.js canvas renderom.
    const ocr = await Tesseract.recognize(
      await fileOrArrayBuffer.arrayBuffer?.() ?? fileOrArrayBuffer,
      'hrv+eng',
      { tessedit_pageseg_mode: Tesseract.PSM.AUTO }
    );
    fullText = normalizeWhitespace(ocr.data.text || '');
    ocrUsed = true;
  }

  return { text: fullText, pages, ocrUsed };
}

// ====== Ekstrakcija teksta iz SLIKE ======
export async function extractTextFromImage(fileOrBlob) {
  const { data } = await Tesseract.recognize(fileOrBlob, 'hrv+eng', {
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
  });
  return { text: normalizeWhitespace(data.text || ''), ocrUsed: true };
}

// ====== Ekstrakcija iz EXCEL-a ======
export async function parseExcel(fileOrArrayBuffer) {
  const data = fileOrArrayBuffer instanceof ArrayBuffer
    ? fileOrArrayBuffer
    : await fileOrArrayBuffer.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  return wb;
}

// ====== Glavna funkcija: parseAny ======
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
  } else if (
    mime.includes('sheet') ||
    /\.xlsx?$/i.test(name) ||
    mime.includes('ms-excel')
  ) {
    excelWb = await parseExcel(file);
    // Kreiraj tekst iz excel-a za meta polja
    const txtParts = [];
    for (const sn of excelWb.SheetNames) {
      const rows = XLSX.utils.sheet_to_csv(excelWb.Sheets[sn], { FS: '\t' });
      txtParts.push(rows);
    }
    rawText = txtParts.join('\n');
  } else {
    // fallback – pokušaj pročitati kao tekst
    rawText = await file.text();
  }

  const text = normalizeWhitespace(rawText);

  // Meta (tip, broj, datumi, valuta, mjesto, uvjeti)
  const meta = extractDocMeta(text);
  // Stranke
  const { seller, buyer } = extractParties(text);
  // Rekap
  const summary = extractTotals(text);
  // Stavke
  const lines = excelWb ? extractLinesFromExcel(excelWb) : extractLinesFromPlainText(text);

  const result = {
    source: { filename: name, mimetype: mime },
    doc: meta,
    seller,
    buyer,
    lines,
    summary,
    rawText: text,
  };

  // Dodatne korekcije:
  // Ako total null, ali postoji "UKUPNO: <broj>" u zadnjim linijama — još jedan pokušaj
  if (result.summary.total == null) {
    const tail = text.split('\n').slice(-50).join('\n');
    const t2 = parseHRNumber(firstMatch(tail, [
      /\bUKUPNO\s*[: ]\s*([0-9\.\,\s]+)\b/i,
      /\bSVEUKUPNO\s*[: ]\s*([0-9\.\,\s]+)\b/i,
    ]));
    if (t2 != null) result.summary.total = t2;
  }

  return result;
}
