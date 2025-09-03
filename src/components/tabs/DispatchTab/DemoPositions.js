export const demoPositions = [
  {
    id: "pos_001",
    title: "Prozor dvostruki 120x150cm",
    type: "window",
    description: "Dvostruki prozor s termoizolacijskim staklom, bijela RAL 9016",
    status: "završeno",
    qty: 4,
    pieces: [
      { id: "p1", name: "Ram vanjski", dimensions: "120x150", material: "Aluminij 6060" },
      { id: "p2", name: "Ram unutarnji", dimensions: "116x146", material: "Aluminij 6060" },
      { id: "p3", name: "Staklo termo", dimensions: "114x144", material: "4-16-4mm" },
      { id: "p4", name: "Kovanje", dimensions: "set", material: "Inox" }
    ],
    documents: [
      { name: "Tehnički crtež", type: "PDF" },
      { name: "Specifikacija stakla", type: "PDF" }
    ]
  },
  {
    id: "pos_002", 
    title: "Ulazna vrata 90x210cm",
    type: "door",
    description: "Sigurnosna ulazna vrata s termoprekinutim profilom",
    status: "u_radu",
    qty: 1,
    pieces: [
      { id: "d1", name: "Okvir vrata", dimensions: "90x210", material: "Aluminij 6060" },
      { id: "d2", name: "Krilo vrata", dimensions: "86x206", material: "Sendvič panel" },
      { id: "d3", name: "Brava sigurnosna", dimensions: "set", material: "Čelik" }
    ]
  },
  {
    id: "pos_003",
    title: "Roletna električna 200x180cm", 
    type: "roller",
    description: "Aluminijska roletna s električnim pogonom i daljinskim upravljanjem",
    status: "planiran",
    qty: 2,
    pieces: [
      { id: "r1", name: "Lamele", dimensions: "200x180", material: "Aluminij" },
      { id: "r2", name: "Motor", dimensions: "kompakt", material: "Električni" },
      { id: "r3", name: "Vodilice", dimensions: "180cm", material: "Aluminij" }
    ]
  },
  {
    id: "pos_004",
    title: "Balkonska ograda s prozorom",
    type: "railing", 
    description: "Staklena balkonska ograda s integriranim kliznim prozorom",
    status: "završeno",
    qty: 1,
    pieces: [
      { id: "b1", name: "Okvir ograde", dimensions: "300x110", material: "Aluminij 6060" },
      { id: "b2", name: "Staklo sigurnosno", dimensions: "290x100", material: "8mm ESG" },
      { id: "b3", name: "Klizni element", dimensions: "100x110", material: "Aluminij" }
    ]
  },
  {
    id: "pos_005",
    title: "L-profil 50x50x3mm",
    type: "l-profile",
    description: "Strukturalni L-profil za okvire i konstrukcije",
    status: "završeno", 
    qty: 20,
    pieces: Array.from({length: 20}, (_, i) => ({
      id: `l${i+1}`, 
      name: `L-profil ${i+1}`, 
      dimensions: "50x50x3x6000mm", 
      material: "Aluminij 6060"
    }))
  },
  {
    id: "pos_006",
    title: "T-profil nosivi 80x40x4mm",
    type: "t-profile",
    description: "Nosivi T-profil za konstrukcije i ojačanja",
    status: "u_radu",
    qty: 12,
    pieces: Array.from({length: 12}, (_, i) => ({
      id: `t${i+1}`, 
      name: `T-profil ${i+1}`, 
      dimensions: "80x40x4x6000mm", 
      material: "Aluminij 6060"
    }))
  },
  {
    id: "pos_007",
    title: "Fasadni panel kompozitni",
    type: "facade",
    description: "Kompozitni fasadni panel za vanjsku oblogu",
    status: "problem",
    qty: 8,
    pieces: [
      { id: "f1", name: "Panel A", dimensions: "150x300", material: "Kompozit ALU" },
      { id: "f2", name: "Panel B", dimensions: "150x300", material: "Kompozit ALU" },
      { id: "f3", name: "Nosiva konstrukcija", dimensions: "set", material: "Aluminij 6060" }
    ]
  },
  {
    id: "pos_008",
    title: "U-profil završni 30x15x2mm", 
    type: "u-profile",
    description: "Završni U-profil za rubove i spojeve",
    status: "završeno",
    qty: 50,
    pieces: Array.from({length: 50}, (_, i) => ({
      id: `u${i+1}`, 
      name: `U-profil ${i+1}`, 
      dimensions: "30x15x2x3000mm", 
      material: "Aluminij 6060"
    }))
  },
  {
    id: "pos_009",
    title: "Klizni prozor 300x200cm",
    type: "window",
    description: "Veliki klizni prozor za terasu s low-e staklom",
    status: "završeno",
    qty: 2,
    pieces: [
      { id: "k1", name: "Fiksni dio", dimensions: "150x200", material: "Aluminij 6060" },
      { id: "k2", name: "Klizni dio", dimensions: "150x200", material: "Aluminij 6060" },
      { id: "k3", name: "Tračnice", dimensions: "300cm", material: "Aluminij" },
      { id: "k4", name: "Kotačići", dimensions: "set", material: "Inox" }
    ]
  },
  {
    id: "pos_010",
    title: "Francuska vrata 160x220cm",
    type: "door",
    description: "Dvostruka francuska vrata s prozorom i kvakama",
    status: "u_radu",
    qty: 1,
    pieces: [
      { id: "f1", name: "Lijevo krilo", dimensions: "80x220", material: "Aluminij + staklo" },
      { id: "f2", name: "Desno krilo", dimensions: "80x220", material: "Aluminij + staklo" },
      { id: "f3", name: "Prag", dimensions: "160cm", material: "Aluminij" }
    ]
  },
  {
    id: "pos_011",
    title: "Roletna manuelna 80x120cm",
    type: "roller",
    description: "Klasična manuelna roletna s poliuretanskim lamelama",
    status: "završeno",
    qty: 5,
    pieces: [
      { id: "rm1", name: "Lamele PU", dimensions: "80x120", material: "Poliuretan" },
      { id: "rm2", name: "Ručica", dimensions: "standard", material: "Plastika" },
      { id: "rm3", name: "Mehanizam", dimensions: "set", material: "Čelik" }
    ]
  },
  {
    id: "pos_012",
    title: "Nadstrešnica 400x150cm",
    type: "facade",
    description: "Aluminijska nadstrešnica s polikarbonatnim pokrivom",
    status: "planiran",
    qty: 1,
    pieces: [
      { id: "n1", name: "Nosiva konstrukcija", dimensions: "400x150", material: "Aluminij 6060" },
      { id: "n2", name: "Polikarbonat", dimensions: "400x150x8mm", material: "PC komorni" },
      { id: "n3", name: "Spojni materijal", dimensions: "set", material: "Inox" }
    ]
  },
  {
    id: "pos_013",
    title: "Balkonska ograda jednostavna",
    type: "railing",
    description: "Standardna aluminijska ograda bez stakla",
    status: "završeno",
    qty: 3,
    pieces: [
      { id: "bo1", name: "Donji profil", dimensions: "200cm", material: "Aluminij" },
      { id: "bo2", name: "Gornji profil", dimensions: "200cm", material: "Aluminij" },
      { id: "bo3", name: "Vertikalne šipke", dimensions: "10x80cm", material: "Aluminij" },
      { id: "bo4", name: "Stupovi", dimensions: "2x110cm", material: "Aluminij" }
    ]
  },
  {
    id: "pos_014",
    title: "Ostakljenje terasa 600x250cm",
    type: "window",
    description: "Kompletno ostakljenje terase s kliznim sustavom",
    status: "u_radu",
    qty: 1,
    pieces: [
      { id: "ot1", name: "Klizna krila", dimensions: "6x100x250", material: "Aluminij + staklo" },
      { id: "ot2", name: "Gornja tračnica", dimensions: "600cm", material: "Aluminij" },
      { id: "ot3", name: "Donja tračnica", dimensions: "600cm", material: "Aluminij" }
    ]
  },
  {
    id: "pos_015",
    title: "Vrata garaže 240x200cm",
    type: "door",
    description: "Sektorska garažna vrata s automatskim pogonom",
    status: "problem",
    qty: 1,
    pieces: [
      { id: "g1", name: "Paneli vrata", dimensions: "4x240x50", material: "Aluminij + izolacija" },
      { id: "g2", name: "Vodilice", dimensions: "2x200cm", material: "Čelik" },
      { id: "g3", name: "Pogon električni", dimensions: "1kom", material: "Motor + upravljanje" }
    ]
  },
  {
    id: "pos_016",
    title: "Roletna sigurnosna 150x160cm",
    type: "roller",
    description: "Ojačana sigurnosna roletna s aluminijskim lamelama",
    status: "završeno",
    qty: 3,
    pieces: [
      { id: "rs1", name: "Lamele ALU", dimensions: "150x160", material: "Aluminij ojačan" },
      { id: "rs2", name: "Kućište", dimensions: "150cm", material: "Aluminij" },
      { id: "rs3", name: "Sigurnosni sustav", dimensions: "set", material: "Elektronika" }
    ]
  },
  {
    id: "pos_017",
    title: "Fasadni sustav kontinuiran",
    type: "facade",
    description: "Kontinuirani fasadni sustav s termoizolacijom",
    status: "u_radu",
    qty: 12,
    pieces: [
      { id: "fs1", name: "Nosivi profili", dimensions: "verschiedene", material: "Aluminij 6060" },
      { id: "fs2", name: "Izolacijski paneli", dimensions: "verschillende", material: "Kompozit + izolacija" },
      { id: "fs3", name: "Brtve", dimensions: "set", material: "EPDM" }
    ]
  },
  {
    id: "pos_018",
    title: "Prozorska klupa 120x25cm", 
    type: "l-profile",
    description: "Unutarnja aluminijska prozorska klupa",
    status: "završeno",
    qty: 8,
    pieces: [
      { id: "pk1", name: "Klupa profil", dimensions: "120x25x2", material: "Aluminij 6060" },
      { id: "pk2", name: "Završni profil", dimensions: "2x25cm", material: "Aluminij" }
    ]
  },
  {
    id: "pos_019",
    title: "Sigurnosna ograda stepenice",
    type: "railing",
    description: "Sigurnosna ograda za vanjske stepenice",
    status: "planiran",
    qty: 1,
    pieces: [
      { id: "so1", name: "Rukohvat", dimensions: "500cm", material: "Aluminij Ø42mm" },
      { id: "so2", name: "Nosači", dimensions: "8kom", material: "Aluminij + čelik" },
      { id: "so3", name: "Ispuna", dimensions: "различit", material: "Aluminij profili" }
    ]
  },
  {
    id: "pos_020",
    title: "Ulazni portal 200x250cm",
    type: "door",
    description: "Reprezentativni ulazni portal s bočnim staklom",
    status: "završeno",
    qty: 1,
    pieces: [
      { id: "up1", name: "Glavna vrata", dimensions: "100x220", material: "Aluminij + panel" },
      { id: "up2", name: "Bočno staklo", dimensions: "100x220", material: "Sigurnosno staklo" },
      { id: "up3", name: "Nadsvjetlo", dimensions: "200x30", material: "Staklo + aluminij" }
    ]
  },
  {
    id: "pos_facade_special",
    title: "Fasada - Kompozitni paneli",
    type: "facade_special",
    description: "Veliki fasadni sustav s 16 individualnih elemenata",
    status: "u_radu",
    qty: 16,
    pieces: Array.from({length: 16}, (_, i) => ({
      id: `facade_${i+1}`, 
      name: `Element ${i+1}`, 
      dimensions: "150x100cm", 
      material: "Kompozit ALU",
      status: ['završeno', 'u_radu', 'planiran', 'problem'][Math.floor(Math.random() * 4)],
      shipped: Math.random() < 0.3
    })),
    isSpecialCard: true,
    cardSize: 'large'
  },
  {
    id: "pos_large_grid_special",
    title: "Veliki fasadni sustav - 20x2",
    type: "large_grid_special",
    description: "Masivni fasadni sustav s 40 elemenata (20x2 grid)",
    status: "u_radu",
    qty: 40,
    pieces: Array.from({length: 40}, (_, i) => ({
      id: `large_grid_${i+1}`, 
      name: `Element ${i+1}`, 
      dimensions: "100x100cm", 
      material: "Kompozit ALU mix",
      status: ['završeno', 'u_radu', 'planiran', 'problem'][Math.floor(Math.random() * 4)],
      shipped: Math.random() < 0.2
    })),
    isSpecialCard: true,
    cardSize: 'xlarge'
  }
];