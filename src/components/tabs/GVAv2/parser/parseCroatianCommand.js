// Lightweight Croatian command parser used as a local fallback
// Returns one of:
// - { type:'move_start', alias, lineId, iso }
// - { type:'shift', alias, lineId, days }
// - { type:'shift_all', days }
// - { type:'distribute_chain' }
// - { type:'normative_extend', days }
// - { type:'apply_normative', profile }
// - { type:'open_document', document, page }
// - { type:'add_task_open' }

function resolveMonthToken(tok) {
  const m = {
    'prvog':1,'drugog':2,'trećeg':3,'treceg':3,'četvrtog':4,'cetvrtog':4,'petog':5,'šestog':6,'sestog':6,'sedmog':7,'osmog':8,'devetog':9,'desetog':10,'jedanaestog':11,'dvanaestog':12,
    'siječnja':1,'veljače':2,'ožujka':3,'travnja':4,'svibnja':5,'lipnja':6,'srpnja':7,'kolovoza':8,'rujna':9,'listopada':10,'studenog':11,'prosinca':12,
    'sijecnja':1,'veljace':2,'ozujka':3,'travnja':4,'svibnja':5,'lipnja':6,'srpnja':7,'kolovoza':8,'rujna':9,'listopada':10,'studenog':11,'prosinca':12,
    '1.':1,'2.':2,'3.':3,'4.':4,'5.':5,'6.':6,'7.':7,'8.':8,'9.':9,'10.':10,'11.':11,'12.':12,
    '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'11':11,'12':12
  };
  return m[tok] || null;
}

// Helper function to parse batch/multi-operation commands
function parseBatchCommand(text, { aliasToLine = {}, defaultYear }) {
  if (!text) return null;
  const t = String(text).toLowerCase().trim();
  
  // Enhanced number recognition with Croatian words
  const enhancedNumMap = { 
    'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'četiri':4,'cetiri':4,'pet':5,
    'šest':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10,'jedanaest':11,'dvanaest':12,
    'trinaest':13,'četrnaest':14,'cetrnaest':14,'petnaest':15,'šesnaest':16,'sesnaest':16,
    'sedamnaest':17,'osamnaest':18,'devetnaest':19,'dvadeset':20,'dvadeset-jedan':21,'dvadeset-dva':22,
    'dvadeset-tri':23,'dvadeset-četiri':24,'dvadeset-pet':25,'dvadeset-šest':26,'dvadeset-sedam':27,
    'dvadeset-osam':28,'dvadeset-devet':29,'trideset':30
  };
  
  const parseNumber = (numStr) => {
    if (/^\d+$/.test(numStr)) return parseInt(numStr, 10);
    return enhancedNumMap[numStr] ?? null;
  };
  
  // Complex batch: "pozicija X N dana naprijed, pozicija Y M dana naprijed, ..."
  const batchPattern = /pozicija\s+([a-z0-9\s]+?)\s+([\da-zčćđšž-]+)\s+dana?\s+na?pri?jed/gi;
  const operations = [];
  let match;
  
  while ((match = batchPattern.exec(t)) !== null) {
    const alias = match[1].trim().toUpperCase().replace(/\s+/g, '');
    const daysStr = match[2].trim();
    const days = parseNumber(daysStr);
    const lineId = aliasToLine[alias] || aliasToLine[alias.replace(/^PR/, 'PR')];
    
    if (lineId && days !== null) {
      operations.push({
        type: 'shift',
        alias: alias,
        lineId: lineId,
        days: days
      });
    }
  }
  
  if (operations.length > 0) {
    return { type: 'batch_operations', operations };
  }
  
  // Global operations: "sve pozicije povećaj trajanje za N dana"
  const globalExtend = t.match(/sve\s+pozicije\s+pove(?:ć|c)aj\s+trajanje\s+za\s+([\da-zčćđšž-]+)\s+dana?/);
  if (globalExtend) {
    const days = parseNumber(globalExtend[1]);
    if (days !== null) {
      return { type: 'extend_all_duration', days };
    }
  }
  
  // Date-based operations: "nezavršene pozicije prebaci početak dvadeset prvi osmog"
  const dateMove = t.match(/nezavr(?:š|s)ene\s+pozicije\s+prebaci\s+po(?:č|c)etak\s+([a-zčćđšž-]+)\s+([a-zčćđšž-]+)\s+([a-zčćđšž-]+)/);
  if (dateMove) {
    const dayWord = dateMove[1];
    const dayNumWord = dateMove[2]; // "prvi", "drugi", etc.
    const monthWord = dateMove[3];
    
    const dayNumMap = {
      'prvi':1,'druga':2,'drugi':2,'treći':3,'treci':3,'četvrti':4,'cetvrti':4,'peti':5,
      'šesti':6,'sesti':6,'sedmi':7,'osmi':8,'deveti':9,'deseti':10,'jedanaesti':11,
      'dvanaesti':12,'trinaesti':13,'četrnaesti':14,'cetrnaesti':14,'petnaesti':15,
      'šesnaesti':16,'sesnaesti':16,'sedamnaesti':17,'osamnaesti':18,'devetnaesti':19,
      'dvadeseti':20,'dvadeset-prvi':21,'dvadeset-drugi':22,'dvadeset-treći':23,
      'dvadeset-četvrti':24,'dvadeset-peti':25,'dvadeset-šesti':26,'dvadeset-sedmi':27,
      'dvadeset-osmi':28,'dvadeset-deveti':29,'trideseti':30,'trideset-prvi':31
    };
    
    const day = parseNumber(dayWord) || dayNumMap[dayNumWord];
    const month = resolveMonthToken(monthWord);
    
    if (day && month) {
      const year = defaultYear || new Date().getUTCFullYear();
      const iso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      return { type: 'move_unfinished_to_date', iso };
    }
  }
  
  return null;
}

export function parseCroatianCommand(text, { aliasToLine = {}, defaultYear }) {
  if (!text) return null;
  const t = String(text).toLowerCase().trim();
  
  // First try to parse as batch command
  const batchResult = parseBatchCommand(text, { aliasToLine, defaultYear });
  if (batchResult) return batchResult;

  // move_start: "pomakni početak PR5 na početak <mjeseca>" | ISO date
  const m = t.match(/pomakni\s+po(?:č|c)etak\s+(pr\s*\d+)\s+na\s+(po(?:č|c)etak\s+([^.\s]+)\s+mjeseca|([0-9]{4}-[0-9]{2}-[0-9]{2}))/);
  if (m) {
    const alias = m[1].toUpperCase().replace(/\s+/g, '');
    let iso = null;
    if (m[4]) {
      iso = m[4];
    } else {
      const monthTok = (m[2] || '').split(/\s+/).pop();
      const month = resolveMonthToken(monthTok);
      if (month) {
        const y = defaultYear || new Date().getUTCFullYear();
        iso = `${y}-${String(month).padStart(2,'0')}-01`;
      }
    }
    const lineId = aliasToLine[alias];
    if (!lineId || !iso) return null;
    return { type: 'move_start', alias, lineId, iso };
  }

  // shift: "pomakni PR5 za 2 dana"
  const s = t.match(/pomakni\s+(pr\s*\d+)\s+za\s+(-?\d+)\s+dana?/);
  if (s) {
    const alias = s[1].toUpperCase().replace(/\s+/g, '');
    const delta = parseInt(s[2], 10);
    const lineId = aliasToLine[alias];
    if (!lineId || !Number.isFinite(delta)) return null;
    return { type: 'shift', alias, lineId, days: delta };
  }

  // shift with words: "pomakni pr4 plus jedan dan", "minus tri tjedna"
  const s2 = t.match(/pomakni\s+(pr\s*\d+)\s+(?:za\s+)?(?:(plus|minu[sz])\s+)?([a-zčćđšž]+|\d+)\s+(dan|dana|tjedan|tjedna)/);
  if (s2) {
    const alias = s2[1].toUpperCase().replace(/\s+/g, '');
    const signWord = s2[2];
    const numWord = s2[3];
    const unit = s2[4];
    const numMap = { 'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'četiri':4,'cetiri':4,'pet':5,'šest':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10,'jedanaest':11,'dvanaest':12,'trinaest':13,'četrnaest':14,'cetrnaest':14,'petnaest':15,'šesnaest':16,'sesnaest':16,'sedamnaest':17,'osamnaest':18,'devetnaest':19,'dvadeset':20,'dvadeset-jedan':21,'dvadeset-dva':22,'dvadeset-tri':23,'dvadeset-četiri':24,'dvadeset-pet':25,'dvadeset-šest':26,'dvadeset-sedam':27,'dvadeset-osam':28,'dvadeset-devet':29,'trideset':30 };
    let n = (/^\d+$/.test(numWord) ? parseInt(numWord,10) : (numMap[numWord] ?? null));
    if (n == null) return null;
    if (/tjedan/.test(unit)) n *= 7;
    if (signWord && /minu[sz]/.test(signWord)) n = -n;
    const lineId = aliasToLine[alias];
    if (!lineId) return null;
    return { type: 'shift', alias, lineId, days: n };
  }

  // shift_all: "pomakni sve za N dana"
  const g1 = t.match(/pomakni\s+sve\s+za\s+(-?\d+|[a-zčćđšž-]+)\s+dana?/);
  if (g1) {
    const numMapAll = { 'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'četiri':4,'cetiri':4,'pet':5,'šest':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10,'jedanaest':11,'dvanaest':12,'trinaest':13,'četrnaest':14,'cetrnaest':14,'petnaest':15,'šesnaest':16,'sesnaest':16,'sedamnaest':17,'osamnaest':18,'devetnaest':19,'dvadeset':20,'dvadeset-jedan':21,'dvadeset-dva':22,'dvadeset-tri':23,'dvadeset-četiri':24,'dvadeset-pet':25,'dvadeset-šest':26,'dvadeset-sedam':27,'dvadeset-osam':28,'dvadeset-devet':29,'trideset':30 };
    let n = /^-?\d+$/.test(g1[1]) ? parseInt(g1[1],10) : (numMapAll[g1[1]] ?? null);
    if (n == null) return null;
    return { type: 'shift_all', days: n };
  }

  // distribute_chain
  if (/rasporedi\s+po(?:č|c)etke\s+sa\s+krajevima/.test(t) || /rasporedi\s+lanac/.test(t)) {
    return { type: 'distribute_chain' };
  }

  // Legacy normative patterns moved after new unified pattern to avoid conflicts

  // DISTRIBUTE BY DURATION: "rasporedi prema trajanju"
  if (/rasporedi\s+prema\s+trajanj(u|ima)/.test(t)) {
    return { type: 'distribute_chain' };
  }

  // ADD DAY TO ALL: "dodaj svim procesima po jedan dan" / "dodaj svim procesima po 3 dana"  
  const addAll = t.match(/(dodaj|uvećaj|povećaj|produži|produzi)\s+svim\s+procesima\s+po\s+(jedan|dva|tri|četiri|pet|\d+)\s+dan(a)?/);
  if (addAll) {
    const numMap = { 'jedan':1, 'dva':2, 'tri':3, 'četiri':4, 'pet':5 };
    const n = numMap[addAll[2]] || parseInt(addAll[2],10);
    if (Number.isFinite(n)) return { type: 'shift_all', days: n };
  }

  // STRUCTURED NORMATIVE PROFILE APPLICATION (UNIFIED - all variants)
  const normativeProfile = t.match(/(?:primijeni|primjeni|daj|postavi|koristi|rasporedi\s+procese\s+prema)?\s*(?:prvi\s+|drugi\s+)?normativ(?:u|i)?\s+(jedan|1|dva|2|prvi|drugi)|(?:primijeni|primjeni|daj|postavi|koristi)\s+(?:prvi|drugi)\s+normativ/);
  if (normativeProfile) {
    const profileWord = normativeProfile[1] || (t.includes('prvi') ? 'prvi' : 'drugi');
    const profile = (profileWord === 'jedan' || profileWord === '1' || profileWord === 'prvi') ? 1 : 
                   (profileWord === 'dva' || profileWord === '2' || profileWord === 'drugi') ? 2 : 1;
    
    const profileConfig = profile === 1 
      ? { start_days: 1, end_days: 3 }
      : { start_days: 4, end_days: 9 };
    
    return { 
      type: 'apply_normative_profile', 
      profile: {
        id: `NORMATIV_${profile}`,
        offsets: profileConfig
      },
      scope: {
        targets: ['PROJECT:*'],
        unit: 'calendar_days'
      },
      execution_mode: 'preview'
    };
  }

  // CUSTOM NORMATIVE: "primijeni normativ custom početak plus X kraj plus Y"
  const customNormative = t.match(/(?:primijeni|primjeni|daj|postavi)\s+normativ\s+custom(?:.*?)po(?:č|c)etak\s+(?:plus\s+)?(\d+)(?:.*?)kraj\s+(?:plus\s+)?(\d+)/);
  if (customNormative) {
    const startDays = parseInt(customNormative[1], 10);
    const endDays = parseInt(customNormative[2], 10);
    
    return {
      type: 'apply_normative_profile',
      profile: {
        id: 'CUSTOM',
        offsets: { start_days: startDays, end_days: endDays }
      },
      scope: {
        targets: ['PROJECT:*'], 
        unit: 'calendar_days'
      },
      execution_mode: 'preview'
    };
  }

  // STANDARD PLAN: "pokaži standardni plan", "poravnaj kraj prethodne na početak sljedeće"
  const standardPlan = t.match(/(pokaži|prikaži|poravnaj)\s+(standardni\s+plan|kraj\s+prethodne\s+na\s+po(?:č|c)etak\s+slje(?:d|ć)e(?:ć|c)e)/);
  if (standardPlan) {
    return {
      type: 'show_standard_plan',
      targets: ['PROJECT:*'],
      gap_days: 0,
      anchor: 'next_start',
      adjust: 'prev_end', 
      duration_policy: 'preserve_start',
      execution_mode: 'preview'
    };
  }

  // KORIGIRAJ TRAJANJE PREMA NORMATIVU 1/2 (backward compatibility)
  const normKorigiraj = t.match(/(korigiraj|kori)\s+trajanje\s+prema\s+normativ(u|i)\s+(jedan|1|dva|2)/);
  if (normKorigiraj) {
    const profileWord = normKorigiraj[3];
    const profile = (profileWord === 'jedan' || profileWord === '1') ? 1 : 
                   (profileWord === 'dva' || profileWord === '2') ? 2 : 1;
    return { type: 'apply_normative', profile }; // Legacy format
  }

  // normative_extend (existing - for backward compatibility)
  if (/normativ/.test(t) && /(produži|produzi|kori|korigiraj|povećaj|povecaj)/.test(t)) {
    const dm = t.match(/(\+|plus|još|jos)?\s*(\d+)\s+dana?/);
    const days = dm ? parseInt(dm[2],10) : 2;
    return { type: 'normative_extend', days };
  }

  // OPEN DOCUMENT: "otvori subota stranica 5", "prikaži petak stranica 1"
  const docCmd = t.match(/(otvori|prikaži|prikaži|dokument)\s+(subota|petak|srijeda|sreda|četvrtak|cetrtak|nedjelja|ponedelj|ponedjeljak|utorak)\s+stranica\s+(\d+)/);
  if (docCmd) {
    const document = docCmd[2];
    const page = parseInt(docCmd[3], 10);
    if (Number.isFinite(page) && page > 0) {
      return { type: 'open_document', document, page };
    }
  }

  // Alternative document pattern: "dokument subota 3"
  const docCmd2 = t.match(/dokument\s+(subota|petak|srijeda|sreda|četvrtak|cetrtak|nedjelja|ponedelj|ponedjeljak|utorak)\s+(\d+)/);
  if (docCmd2) {
    const document = docCmd2[1];
    const page = parseInt(docCmd2[2], 10);
    if (Number.isFinite(page) && page > 0) {
      return { type: 'open_document', document, page };
    }
  }

  // DOCUMENT ANALYSIS: "analiza petak", "analiza subota", "analiza sve"
  const analysisCmd = t.match(/analiz[ae]\s+(petak|subota|sve)/);
  if (analysisCmd) {
    const target = analysisCmd[1];
    return { type: 'analyze_document', target };
  }

  // UI helpers
  if (/otvori\s+zadatak/.test(t) || /dodaj\s+zadatak/.test(t)) return { type: 'add_task_open' };

  // CANCEL/CLEAR commands
  if (/^(poništi|ponisti|odustani|prekini|obriši|obrisi|očisti|ocisti)$/i.test(t)) {
    return { type: 'cancel_pending' };
  }

  return null;
}
