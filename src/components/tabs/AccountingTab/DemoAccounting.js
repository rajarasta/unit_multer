export const demoAccounting = [
  {
    id: "acc_001",
    title: "Račun kupca 001/2025",
    type: "invoice",
    amount: 1250.00,
    currency: "EUR",
    status: "neplaćeno",
    date: "2025-01-15",
    dueDate: "2025-02-14",
    relatedProjectId: "proj_001",
    documents: [
      { name: "Račun 001/2025", type: "PDF" }
    ]
  },
  {
    id: "acc_002",
    title: "Trošak materijala - Aluminij",
    type: "expense",
    amount: 3400.00,
    currency: "EUR",
    status: "plaćeno",
    date: "2025-01-20",
    dueDate: "2025-01-20",
    relatedProjectId: "proj_001",
    documents: [
      { name: "Primka materijala", type: "PDF" },
      { name: "Ugovor o nabavi", type: "DOCX" }
    ]
  },
  {
    id: "acc_003",
    title: "Uplata kupca",
    type: "payment",
    amount: 2000.00,
    currency: "EUR",
    status: "obrađeno",
    date: "2025-01-25",
    dueDate: null,
    relatedProjectId: "proj_001",
    documents: []
  },
  {
    id: "acc_004",
    title: "Račun dobavljača - Staklo",
    type: "invoice",
    amount: 1800.00,
    currency: "EUR",
    status: "plaćeno",
    date: "2025-02-01",
    dueDate: "2025-03-03",
    relatedProjectId: "proj_002",
    documents: [
      { name: "Račun staklo 2025-02", type: "PDF" }
    ]
  },
  {
    id: "acc_005",
    title: "Plaća radnika - Siječanj",
    type: "expense",
    amount: 7200.00,
    currency: "EUR",
    status: "plaćeno",
    date: "2025-02-05",
    dueDate: "2025-02-05",
    relatedProjectId: null,
    documents: [
      { name: "Obračun plaća 01/2025", type: "XLSX" }
    ]
  },
  {
    id: "acc_006",
    title: "Račun kupca 002/2025",
    type: "invoice",
    amount: 5000.00,
    currency: "EUR",
    status: "dospjelo",
    date: "2025-02-10",
    dueDate: "2025-02-25",
    relatedProjectId: "proj_002",
    documents: [
      { name: "Račun 002/2025", type: "PDF" },
      { name: "Potvrda isporuke", type: "PDF" }
    ]
  },
  {
    id: "acc_007",
    title: "Trošak - Električna energija",
    type: "expense",
    amount: 950.00,
    currency: "EUR",
    status: "neplaćeno",
    date: "2025-02-15",
    dueDate: "2025-03-15",
    relatedProjectId: null,
    documents: [
      { name: "HEP račun 02/2025", type: "PDF" }
    ]
  },
  {
    id: "acc_008",
    title: "Račun dobavljača - Bravarski elementi",
    type: "invoice",
    amount: 2200.00,
    currency: "EUR",
    status: "plaćeno",
    date: "2025-02-18",
    dueDate: "2025-03-20",
    relatedProjectId: "proj_003",
    documents: [
      { name: "Račun bravarski elementi", type: "PDF" }
    ]
  },
  {
    id: "acc_009",
    title: "Uplata kupca",
    type: "payment",
    amount: 3500.00,
    currency: "EUR",
    status: "obrađeno",
    date: "2025-02-20",
    dueDate: null,
    relatedProjectId: "proj_002",
    documents: [
      { name: "Izvod banke", type: "PDF" }
    ]
  },
  {
    id: "acc_010",
    title: "Trošak - Gorivo i transport",
    type: "expense",
    amount: 670.00,
    currency: "EUR",
    status: "plaćeno",
    date: "2025-02-22",
    dueDate: "2025-02-22",
    relatedProjectId: "proj_003",
    documents: [
      { name: "Faktura gorivo 02/2025", type: "PDF" }
    ]
  },
  {
    id: "acc_011",
    title: "Račun kupca 003/2025",
    type: "invoice",
    amount: 2890.00,
    currency: "EUR",
    status: "plaćeno",
    date: "2025-03-01",
    dueDate: "2025-03-31",
    relatedProjectId: "proj_003",
    documents: [
      { name: "Račun 003/2025", type: "PDF" }
    ]
  },
  {
    id: "acc_012",
    title: "Račun dobavljača - Boje i premazi",
    type: "invoice",
    amount: 1250.00,
    currency: "EUR",
    status: "neplaćeno",
    date: "2025-03-03",
    dueDate: "2025-04-02",
    relatedProjectId: "proj_003",
    documents: [
      { name: "Račun boje 2025-03", type: "PDF" },
      { name: "Tehnička specifikacija", type: "DOCX" }
    ]
  },
  {
    id: "acc_013",
    title: "Trošak - Održavanje strojeva",
    type: "expense",
    amount: 1850.00,
    currency: "EUR",
    status: "dospjelo",
    date: "2025-03-05",
    dueDate: "2025-03-05",
    relatedProjectId: null,
    documents: [
      { name: "Račun održavanje", type: "PDF" },
      { name: "Izvještaj servisa", type: "PDF" }
    ]
  },
  {
    id: "acc_014",
    title: "Avansni račun kupca 004/2025",
    type: "invoice",
    amount: 4200.00,
    currency: "EUR",
    status: "u tijeku",
    date: "2025-03-08",
    dueDate: "2025-04-07",
    relatedProjectId: "proj_004",
    documents: [
      { name: "Avansni račun 004/2025", type: "PDF" },
      { name: "Ugovor o radu", type: "DOCX" }
    ]
  },
  {
    id: "acc_015",
    title: "Uplata za avans",
    type: "payment",
    amount: 2100.00,
    currency: "EUR",
    status: "obrađeno",
    date: "2025-03-10",
    dueDate: null,
    relatedProjectId: "proj_004",
    documents: [
      { name: "Potvrda uplate", type: "PDF" }
    ]
  }
];