/**
 * Schüco Systems Constants
 * Centralized configuration for all Schüco-related functionality
 * Used by: IRIS3, future Schüco integration tabs
 */

// Available Schüco systems
export const SCHUCO_SYSTEMS = [
  { id: 'AD_UP', name: 'AD UP', type: 'door', description: 'aluminijski sistem za vrata' },
  { id: 'AWS_50', name: 'AWS 50', type: 'window', description: 'prozorski sistem' },
  { id: 'AWS_65', name: 'AWS 65', type: 'window', description: 'prozorski sistem' },
  { id: 'AWS_70', name: 'AWS 70', type: 'window', description: 'prozorski sistem' },
  { id: 'FW_50_SG', name: 'FW 50+ SG', type: 'facade', description: 'fasadni sistem' },
  { id: 'FWS_50_S', name: 'FWS 50 S', type: 'facade', description: 'fasadni sistem' },
  { id: 'FWS_50', name: 'FWS 50', type: 'facade', description: 'fasadni sistem' }
];

// Product types
export const PRODUCT_TYPES = [
  { id: 'vrata', label: 'Vrata', icon: 'door' },
  { id: 'prozor', label: 'Prozor', icon: 'window' },
  { id: 'fasada', label: 'Fasada', icon: 'facade' }
];

// IRIS3 tab configuration
export const IRIS3_TABS = [
  { id: 'prodaja', label: 'Prodaja' },
  { id: 'projektiranje', label: 'Projektiranje' },
  { id: 'priprema', label: 'Priprema' },
  { id: 'proizvodnja', label: 'Proizvodnja' }
];

// Troškovnik baseline price
export const TROSKOVNIK_BASELINE_PRICE = 2000; // EUR

// Detail image variants for projektiranje
export const DETAIL_VARIANTS = {
  donji_detalj: ['donji_detalj1', 'donji_detalj2'],
  gornji_detalj: ['gornji_detalj'] // Only one variant exists
};

// Default system prompts
export const SCHUCO_SYSTEM_PROMPT = `Ti si specijalist za SCHÜCO aluminijske sustave. Analiziraj korisnikov glasovni unos.

VAŽNO: Korisnik traži SCHÜCO aluminijske profile za gradnju, NE IT sustave!

DOSTUPNI SCHÜCO SISTEMI:
${SCHUCO_SYSTEMS.map(s => `- ${s.name} (${s.description})`).join('\n')}

OBAVEZNO vrati TOČNO ovaj JSON format (ništa drugo):

{
  "analysis": {
    "sistema_considered": ["AWS 50", "AWS 65", "AWS 70"],
    "sistema_selected": "AWS 65",
    "reasoning": "Korisnik je spomenuo..."
  },
  "tip": {
    "considered": ["vrata", "prozor", "fasada"],
    "selected": "prozor",
    "reasoning": "Na temelju konteksta..."
  },
  "brochure": {
    "system": "AWS 65"
  },
  "pricing": {
    "materijal": 1200,
    "staklo": 650,
    "rad": 450,
    "total": 2300,
    "currency": "EUR"
  },
  "location": "Zagreb, Hrvatska"
}`;

export const PROJEKTIRANJE_SYSTEM_PROMPT = `Ti si SCHÜCO projektant specijalist za standardne detalje.
Tvoja uloga je obrada glasovnih naredbi za projektiranje aluminijskih sustava.

DOSTUPNE NAREDBE:
- "Primjeni standardne detalje" - učitaj standardne detalje za trenutni sistem
- "Promijeni donji detalj" - prebaci na donji_detalj2
- "Promijeni gornji detalj" - prebaci na gornji_detalj2
- "Vrati na originalne detalje" - vrati donji_detalj1 i gornji_detalj1`;