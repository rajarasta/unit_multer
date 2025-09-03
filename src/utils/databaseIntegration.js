import { demoPositions } from '../components/tabs/DispatchTab/DemoPositions.js';

// Convert our demo positions to agbim.json format
export const convertPositionsToAgbimFormat = (positions) => {
  return positions.map((pos, index) => ({
    id: pos.id,
    tag: `PZ-${String(index + 1).padStart(3, '0')}`,
    title: pos.title,
    level: index < 10 ? "Prizemlje" : "Prvi kat", 
    zone: `Zona ${String.fromCharCode(65 + (index % 5))}`, // A, B, C, D, E
    type: getAgbimType(pos.type),
    subtype: pos.type,
    qty: pos.qty,
    status: mapStatusToAgbim(pos.status),
    coords: { x: 50 + (index % 5) * 100, y: 50 + Math.floor(index / 5) * 100 },
    description: pos.description,
    dimensions: extractDimensions(pos.title),
    material: extractMaterial(pos.pieces?.[0]?.material || "Aluminij 6060"),
    color: getDefaultColor(pos.type),
    specifications: generateSpecifications(pos),
    processData: {
      comments: pos.description ? [pos.description] : [],
      documents: (pos.documents || []).map((doc, i) => ({
        id: `doc_${pos.id}_${i}`,
        name: doc.name,
        type: doc.type,
        url: `/docs/${pos.id}_${doc.name.toLowerCase().replace(/\s+/g, '_')}.pdf`
      })),
      tasks: generateTasks(pos)
    },
    floorManagement: {
      location: {
        floor: index < 10 ? "Prizemlje" : "Prvi kat",
        room: `${pos.type} ${index + 1}`,
        wall: ["Sjeverna", "Južna", "Istočna", "Zapadna"][index % 4]
      },
      installation: generateInstallationStatus(pos.status)
    },
    dispatch: {
      ready: pos.status === "završeno",
      reserved: 0,
      shipped: 0,
      remaining: pos.qty,
      lastShipped: null,
      warnings: generateDispatchWarnings(pos)
    },
    pieces: (pos.pieces || []).map((piece, i) => ({
      ...piece,
      status: mapPieceStatus(pos.status),
      created: "2025-01-15T08:00:00.000Z",
      updated: new Date().toISOString()
    })),
    created: "2025-01-15T08:00:00.000Z",
    updated: new Date().toISOString()
  }));
};

// Helper functions
function getAgbimType(type) {
  const typeMap = {
    'window': 'Prozor',
    'door': 'Vrata', 
    'roller': 'Roletna',
    'railing': 'Ograda',
    'facade': 'Panel',
    'l-profile': 'Profil',
    't-profile': 'Profil',
    'u-profile': 'Profil'
  };
  return typeMap[type] || 'Ostalo';
}

function mapStatusToAgbim(status) {
  const statusMap = {
    'završeno': 'Done',
    'u_radu': 'In Progress',
    'planiran': 'Planned', 
    'problem': 'Blocked'
  };
  return statusMap[status] || 'Backlog';
}

function extractDimensions(title) {
  const match = title.match(/(\d+x\d+(?:x\d+)?(?:cm|mm)?)/i);
  return match ? match[1] : null;
}

function extractMaterial(material) {
  return material || "Aluminij 6060";
}

function getDefaultColor(type) {
  const colorMap = {
    'window': 'RAL 9016',
    'door': 'RAL 7016',
    'roller': 'RAL 8017',
    'railing': 'RAL 7021',
    'facade': 'RAL 9006'
  };
  return colorMap[type] || 'RAL 9016';
}

function generateSpecifications(pos) {
  const specs = {};
  
  if (pos.type === 'window') {
    specs.glazing = "4-16-4mm termoizolacijsko";
    specs.frame = "Termoprekidni profil";
    specs.hardware = "MACO multimatic";
    specs.installation = "Vanjska montaža";
  } else if (pos.type === 'door') {
    specs.security = "RC2 sigurnosna klasa";
    specs.insulation = "Termoprekidni profil"; 
    specs.lock = "3-točkovni sigurnosni sistem";
    specs.threshold = "Niskopražni sistem";
  } else if (pos.type === 'roller') {
    specs.motor = "Somfy Oximo RTS 10/17";
    specs.control = "RTS daljinski + zidni prekidač";
    specs.insulation = "PU pjena izolacija";
    specs.profiles = "55mm aluminijske lamele";
  }
  
  return specs;
}

function generateTasks(pos) {
  const tasks = [];
  
  if (pos.status === 'u_radu') {
    tasks.push({
      id: `task_${pos.id}_1`,
      description: `Završi ${pos.title.toLowerCase()}`,
      status: "in_progress",
      assignee: "Radnik A."
    });
  }
  
  if (pos.status === 'problem') {
    tasks.push({
      id: `task_${pos.id}_2`, 
      description: `Riješi problem s ${pos.title.toLowerCase()}`,
      status: "pending",
      assignee: "Voditelj B."
    });
  }
  
  return tasks;
}

function generateInstallationStatus(status) {
  if (status === 'završeno') {
    return {
      spremno: true,
      montirano: true,
      ostakljeno: true,
      brtvljenje: true,
      dodaci: true,
      zavrseno: true,
      blokirano: false,
      reklamacija: false
    };
  } else if (status === 'u_radu') {
    return {
      spremno: true,
      montirano: false,
      ostakljeno: false,
      brtvljenje: false,
      dodaci: false,
      zavrseno: false,
      blokirano: false,
      reklamacija: false
    };
  } else if (status === 'problem') {
    return {
      spremno: true,
      montirano: false,
      ostakljeno: false,
      brtvljenje: false,
      dodaci: false,
      zavrseno: false,
      blokirano: true,
      reklamacija: false
    };
  }
  
  return {
    spremno: false,
    montirano: false,
    ostakljeno: false,
    brtvljenje: false,
    dodaci: false,
    zavrseno: false,
    blokirano: false,
    reklamacija: false
  };
}

function generateDispatchWarnings(pos) {
  const warnings = [];
  
  if (pos.status === 'problem') {
    warnings.push("Pozicija blokirana - riješiti problem");
  }
  
  if (pos.status === 'planiran') {
    warnings.push("Još nije u proizvodnji");
  }
  
  if (pos.status === 'u_radu') {
    warnings.push("U tijeku proizvodnja");
  }
  
  return warnings;
}

function mapPieceStatus(positionStatus) {
  const statusMap = {
    'završeno': 'completed',
    'u_radu': 'in_progress', 
    'planiran': 'planned',
    'problem': 'blocked'
  };
  return statusMap[positionStatus] || 'pending';
}

// Generate additional database sections
export const generateWarehouseData = () => ({
  sections: [
    {
      id: "sec_finished",
      name: "Gotovi proizvodi",
      description: "Skladište gotovih aluminijskih elemenata",
      capacity: 1000,
      occupied: 245,
      items: []
    },
    {
      id: "sec_raw", 
      name: "Sirovine",
      description: "Aluminijski profili i komponente",
      capacity: 500,
      occupied: 387,
      items: []
    },
    {
      id: "sec_glass",
      name: "Staklo",
      description: "Različite vrste stakla i panela",
      capacity: 200,
      occupied: 156,
      items: []
    }
  ],
  movements: [],
  lastInventory: "2025-09-01T00:00:00.000Z"
});

export const generateProcessData = () => ([
  {
    id: "proc_production",
    name: "Proizvodnja",
    description: "Proces proizvodnje aluminijskih elemenata", 
    stages: ["design", "cutting", "assembly", "finishing", "quality_control"],
    activeItems: 23,
    completedToday: 8
  },
  {
    id: "proc_dispatch",
    name: "Otprema",
    description: "Proces pripreme i otpreme proizvoda",
    stages: ["preparation", "packing", "loading", "transport", "delivery"],
    activeItems: 5,
    completedToday: 2
  },
  {
    id: "proc_procurement",
    name: "Nabava", 
    description: "Proces nabave materijala i komponenti",
    stages: ["request", "quotation", "order", "delivery", "inspection"],
    activeItems: 12,
    completedToday: 4
  }
]);

export const generateMaterialsData = () => ([
  {
    id: "mat_alu_6060",
    name: "Aluminij 6060 profil",
    category: "profiles",
    unit: "m",
    stock: 2340,
    reserved: 456,
    available: 1884,
    minStock: 500,
    supplier: "Hydro Aluminium"
  },
  {
    id: "mat_glass_4164",
    name: "Termoizolacijsko staklo 4-16-4",
    category: "glazing",
    unit: "m²", 
    stock: 145,
    reserved: 23,
    available: 122,
    minStock: 50,
    supplier: "Guardian Glass"
  },
  {
    id: "mat_hardware_maco",
    name: "MACO kovanje set",
    category: "hardware",
    unit: "kom",
    stock: 87,
    reserved: 12,
    available: 75,
    minStock: 20,
    supplier: "MACO"
  }
]);

// Main integration function
export const integrateWithAgbimDatabase = () => {
  const convertedPositions = convertPositionsToAgbimFormat(demoPositions);
  
  return {
    positions: convertedPositions,
    warehouse: generateWarehouseData(),
    processes: generateProcessData(),
    materials: generateMaterialsData(),
    dispatches: [
      {
        id: "dispatch_001",
        documentNumber: "OTPR-20250903-0001",
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: "user_demo",
        items: [],
        recipient: {
          name: "Gradilište Demo",
          address: "Zadarska 42, Zagreb", 
          contact: "Ana Novak",
          phone: "+385 98 123 4567"
        },
        transport: {
          plannedDate: new Date(Date.now() + 24*60*60*1000).toISOString(),
          method: "truck",
          driver: null,
          vehicle: null,
          route: null
        },
        documents: [],
        notes: ""
      }
    ]
  };
};

console.log('🔗 Database integration utilities loaded');