// hr-nlu.js - Hrvatski Natural Language Understanding

export const HR_SYNONYMS = {
  send: [
    'pošalji','posalji','šalji','salji','uploadaj','predaj','pošalji na obradu','obradi',
    'pošalji dokument','pošalji datoteku','aj pošalji','daj pošalji','šalji ga','pošalji to'
  ],
  select: [
    'odaberi','izaberi','nađi','pronadi','pronađi','otvori','digni','podigni','učitaj','pokaži'
  ],
  confirm: ['potvrdi','da potvrdi','može','ajde','može može','jasno','jasan zvuk','jasan','da'],
  cancel: ['poništi','odustani','prekini','stop','stani','ne','otkazi'],
  help: ['pomoć','help','što mogu reći','upute','kako','što']
};

const HR_STOPWORDS = [
  'molim','daj','ajde','aj','mi','ga','je','tu','ovaj','onaj','ovu','ovu datoteku','to','ovo',
  'mi','samo','onda','i','pa','znači','e','ma','evo','hai','a'
];

// Normalizacija hrvatskog teksta
export function normalizeHr(s) {
  const lower = s.toLowerCase().trim();
  // Ukloni dijakritike za bolje prepoznavanje
  const ascii = lower
    .replace(/č/g,'c').replace(/ć/g,'c').replace(/ž/g,'z').replace(/š/g,'s').replace(/đ/g,'dj')
    .replace(/á|à|ä|â/g,'a').replace(/é|è|ë|ê/g,'e').replace(/í|ì|ï|î/g,'i')
    .replace(/ó|ò|ö|ô/g,'o').replace(/ú|ù|ü|û/g,'u');
  return ascii.replace(/\s+/g, ' ').trim();
}

export function stripStopwords(s) {
  let out = s;
  for (const w of HR_STOPWORDS) {
    const n = normalizeHr(w);
    out = out.replace(new RegExp(`\\\\b${n}\\\\b`, 'g'), ' ');
  }
  return out.replace(/\s+/g,' ').trim();
}

// Detektiraj intent iz teksta
export function detectIntent(raw) {
  const text = normalizeHr(raw);
  for (const intent of Object.keys(HR_SYNONYMS)) {
    for (const k of HR_SYNONYMS[intent]) {
      const n = normalizeHr(k);
      if (text.includes(n)) return intent;
    }
  }
  return 'unknown';
}

// Ekstraktiraj entitete
const NUMBER_WORDS = {
  'nula':'0','jedan':'1','jednu':'1','jedno':'1','dva':'2','dvije':'2','tri':'3',
  'četiri':'4','pet':'5','šest':'6','sedam':'7','osam':'8','devet':'9','deset':'10'
};

export function extractEntities(raw) {
  const t = normalizeHr(stripStopwords(raw));
  const wantsNewest = /\\bnajn?ovij(e|i)?\\b/.test(t) || /\\bnajzadnj/i.test(t);

  // Izvući brojeve
  const numWord = Object.keys(NUMBER_WORDS).find(w => t.includes(w));
  const numDigit = (t.match(/\\b\\d{1,5}\\b/)||[])[0];
  const numberGuess = numDigit || (numWord ? NUMBER_WORDS[numWord] : undefined);

  // Heuristike za ime dokumenta
  const extName = (t.match(/[\\w\\d _-]+\\.(pdf|xlsx|xls|docx|png|jpg|jpeg)/) || [])[0];
  
  // Obrasci "ponuda 001", "račun 123" itd.
  const className = (() => {
    const m = t.match(/\\b(ponuda|pozicija|komad|projekt|racun|otpremnica|testnik|specifikacija)\\b(?:\\s*(br\\.?|broj)?)?\\s*(\\d{1,5})/);
    if (m) return `${m[1]} ${m[3]}`;
    if (numberGuess) {
      const m2 = t.match(/\\b(ponuda|pozicija|komad|projekt|racun|otpremnica|testnik|specifikacija)\\b/);
      if (m2) return `${m2[1]} ${numberGuess}`;
    }
    return undefined;
  })();

  const nameGuess = extName || className;
  return { nameGuess, wantsNewest, numberGuess };
}

// Fuzzy pretraživanje dokumenata
export function fuzzyFindDoc(cue, list) {
  if (!cue || !list.length) return null;
  const needle = normalizeHr(cue);
  const scored = list.map(d => {
    const n = normalizeHr(d.name);
    const words = needle.split(/\\s+/).filter(Boolean);
    const hits = words.reduce((acc, w) => acc + (n.includes(w) ? 1 : 0), 0);
    const eq = n === needle ? 2 : 0;
    const prefix = n.startsWith(needle) ? 1 : 0;
    return { d, score: hits + eq + prefix };
  }).sort((a,b) => b.score - a.score);
  return scored[0]?.score ? scored[0].d : null;
}