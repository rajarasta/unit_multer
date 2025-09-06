// src/data/MockData.js

// Ekstrahirano i prilagođeno iz priloženog JSON-a
const ProjectData = [
  {
    id: "PRJ-2025-0101",
    name: "Stambena zgrada – Istok",
    summary: "Alu profili, staklo, čelik, okov, montaža.",
    color: "#6366f1", // Indigo (za vizualni stil)
    positions: [
      { id: "PZ-01", title: "Aluminijski L profil 40x20x3mm" },
      { id: "PZ-02", title: "Stakleni panel 6-6.4mm, kaljeno/laminirano" },
      { id: "PZ-03", title: "Čelični okvir FEA D45-001" },
      { id: "PZ-04", title: "Okov i spojni elementi" },
      { id: "PZ-05", title: "Montaža kompletne stijene" },
    ],
  },
  {
    id: "PRJ-2025-0102",
    name: "Uredski Kompleks – Zapad",
    summary: "Fasadni modul, klizni sistem, servis.",
    color: "#06b6d4", // Cyan (za vizualni stil)
    positions: [
      { id: "ZP-01", title: "Fasadni modul CW-50 segment A" },
      { id: "ZP-02", title: "Klizni sistem HS-76" },
      { id: "ZP-03", title: "Servis i atesti" },
    ],
  },
];

// Simulirani dokumenti koji dolaze iz "data dana"
const InboxDocuments = [
  {
    id: "DOC-NEW-101",
    name: "Narudzbenica_Staklo_Hitno.pdf",
    summary: "Hitna narudžba za staklene panele 6-6.4mm. Dobavljač GlassCo.",
    // Rezultati noćnog LLM run-a (Koeficijenti)
    aiProbabilities: {
      "PRJ-2025-0101": 0.95,
      "PZ-02": 0.98, // Vrlo visoka vjerojatnost za PZ-02
      "PRJ-2025-0102": 0.05,
    },
  },
  {
    id: "DOC-NEW-102",
    name: "Specifikacija_CW50_Atesti.pdf",
    summary: "Atesti i specifikacije za fasadne module CW-50.",
    aiProbabilities: {
      "PRJ-2025-0102": 0.90,
      "ZP-01": 0.70,
      "ZP-03": 0.30,
      "PRJ-2025-0101": 0.10,
    },
  },
   {
    id: "DOC-NEW-103",
    name: "Opći upit klijenta.eml",
    summary: "Klijent pita o rokovima za više projekata. Nije specifično.",
    aiProbabilities: {
      "PRJ-2025-0102": 0.50,
      "PRJ-2025-0101": 0.55,
    },
  },
];

export { ProjectData, InboxDocuments };