import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { parseLogikalXml } from '../utils/parseLogikalXml';
// Named exports used by ProjectView.jsx
export const DEPARTMENTS = [
  'Design', 'Procurement', 'Cutting', 'Fabrication',
  'Assembly', 'QA', 'Packing', 'Transport', 'Installation'
];
export const STATUSES = ['Backlog', 'In progress', 'Blocked', 'Done'];

// V5.5 Canonical Schema Constants
export const SCHEMA_VERSION = '5.5.0';

// Floor management installation phases  
export const INSTALLATION_PHASES = [
  'spremno', 'montirano', 'ostakljeno', 'brtvljenje', 'dodaci', 'zavrseno', 'blokirano'
];

// Legacy montaža processes (for backward compatibility)
export const MONTAZA_PROCESSES = [
  'transport', 'ugradnja', 'stakljenje', 'brtvljenje', 'dodaci', 'gotovo', 'reklamacija', 'blokirano'
];

// Helper for creating default floor management structure
const defaultFloorManagement = () => ({
  location: null, // { floorId, x, y, w, h } - coordinates in %
  installation: {
    spremno: false,
    montirano: false, 
    ostakljeno: false,
    brtvljenje: false,
    dodaci: false,
    zavrseno: false,
    blokirano: false,
    reklamacija: false
  }
});

// Helper for creating default process data (comments, documents, tasks)
const defaultProcessData = () => ({
  comments: [], // [{ id, text, author, date, type? }]
  documents: [], // [{ id, name, url, type, author, date, size? }]
  tasks: [] // [{ id, title, description?, assignee, status, due, created }]
});

// Helper for creating default subprocess data
const defaultSubprocessData = () => ({
  status: false,
  ...defaultProcessData(),
  timestamp: null // when marked as completed
});

// Helper for creating default drawing
const defaultDrawing = (id, name) => ({
  id,
  name,
  image: '', // base64 data URL or URL
  annotations: [], // future: text annotations, measurements, etc
  created: new Date().toISOString(),
  updated: new Date().toISOString()
});

// Helper for creating position with v5.5 3-level hierarchy
const createPosition = (positionData, pieceCount = 1) => ({
  id: positionData.id || nanoid(),
  tag: positionData.tag || positionData.id,
  title: positionData.title || positionData.tag,
  level: positionData.level || '',
  zone: positionData.zone || '',
  type: positionData.type || 'Element', 
  qty: positionData.qty || pieceCount,
  status: positionData.status || 'Backlog',
  coords: positionData.coords || null,
  
  // LEVEL 1: Position-wide process data
  processData: defaultProcessData(),
  
  // V5.5 Floor Management Structure
  floorManagement: defaultFloorManagement(),
  
  // LEVEL 2 & 3: Pieces with their own process data and subprocess data
  pieces: Array.from({ length: pieceCount }, (_, i) => ({
    id: i + 1,
    pieceNumber: i + 1,
    floor: positionData.defaultFloor || 'Prizemlje',
    
    // LEVEL 2: Piece-specific process data
    processData: defaultProcessData(),
    
    // LEVEL 3: Subprocess data with comments/docs/tasks
    montaza: {
      transport: defaultSubprocessData(),
      ugradnja: defaultSubprocessData(),
      stakljenje: defaultSubprocessData(),
      brtvljenje: defaultSubprocessData(),
      dodaci: defaultSubprocessData(),
      gotovo: defaultSubprocessData(),
      reklamacija: defaultSubprocessData(),
      blokirano: defaultSubprocessData()
    },
    
    // Legacy simple montaza (for backward compatibility)
    legacyMontaza: {
      transport: false,
      ugradnja: false,
      stakljenje: false,
      brtvljenje: false,
      dodaci: false,
      gotovo: false,
      reklamacija: false,
      blokirano: false
    },
    
    dimensions: positionData.dimensions || null,
    material: positionData.material || null,
    color: positionData.color || null,
    notes: '', // General notes for the piece
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  })),
  
  // Timestamps
  created: new Date().toISOString(),
  updated: new Date().toISOString()
});

const defaultProject = () => ({
  id: nanoid(),
  name: 'Demo Aluminum Project',
  orderNo: 'ORD-2024-001',
  offerNo: 'OFF-2024-001',
  pm: 'Ivan Horvat',
  vat: 25,
  system: 'Schuco AWS',
  colors: ['RAL 7016', 'RAL 9016'],
  metaText: 'Demonstracijski projekt za aluminum store UI',
  client: 'Demo Client d.o.o.',
  address: 'Zagreb, Croatia',
  currency: 'EUR',
  positions: [
    createPosition({
      id: 'PZ-01',
      tag: 'PZ-01',
      title: 'Glavni ulaz',
      type: 'Vrata',
      defaultFloor: 'Prizemlje'
    }, 3),
    createPosition({
      id: 'PZ-02', 
      tag: 'PZ-02',
      title: 'Fasadni paneli',
      type: 'Panel',
      defaultFloor: 'Prvi kat'
    }, 4),
    createPosition({
      id: 'PZ-03',
      tag: 'PZ-03', 
      title: 'Prozori',
      type: 'Prozor',
      defaultFloor: 'Prizemlje'
    }, 6)
  ],
  materials: [],
  cutList: [],
  glass: [],
  warnings: [],
  tasks: [],
  docs: [],
  totals: { subtotal: 15750.00 },
  
  // V5.5 Floor Plan Structure
  floorplan: {
    drawings: {
      'floor-1': defaultDrawing('floor-1', 'Prizemlje'),
      'floor-2': defaultDrawing('floor-2', 'Prvi kat'),
      'floor-3': defaultDrawing('floor-3', 'Drugi kat')
    },
    currentFloorId: 'floor-1'
  },
  
  // Legacy floor structure (for backward compatibility)
  floor: { imageUrl: '', pdfMeta: null, markers: [] },
});

// helper for demo seeding
function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seedTasksFromParsed(parsed, positions) {
  const tasks = [];
  const suppliers = new Map();
  (parsed.items || []).forEach(it => {
    const key = it.meta?.supplier || it.meta?.priceClass || 'General';
    suppliers.set(key, (suppliers.get(key) || 0) + (it.total || 0));
  });
  [...suppliers.keys()].forEach((key, i) => {
    tasks.push({
      id: nanoid(),
      title: `Procure â€” ${key}`,
      department: 'Procurement',
      status: 'Backlog',
      start: daysFromNow(0 + i),
      end: daysFromNow(3 + i),
      budget: suppliers.get(key),
    });
  });

  (parsed.cutList || []).forEach(cut => {
    tasks.push({
      id: nanoid(),
      title: `Cut â€” ${cut.profile || cut.sku}`,
      department: 'Cutting',
      status: 'Backlog',
      start: daysFromNow(1),
      end: daysFromNow(2),
      positionId: cut.positionId,
    });
  });

  (parsed.glass || []).forEach(g => {
    tasks.push({
      id: nanoid(),
      title: `Glazing â€” ${g.name || 'Glass'}`,
      department: 'Assembly',
      status: 'Backlog',
      start: daysFromNow(2),
      end: daysFromNow(3),
    });
  });

  (positions || []).forEach((p, i) => {
    tasks.push({
      id: nanoid(),
      title: `Install ${p.tag}`,
      department: 'Installation',
      status: 'Backlog',
      start: daysFromNow(5 + i),
      end: daysFromNow(6 + i),
      positionId: p.id,
    });
  });

  return tasks;
}

// Named export for the store
export const useProjectStore = create((set, get) => ({
  project: defaultProject(),        // <-- defined on first render
  activeSubtab: 'overview',
  
  // Batch execution mode settings
  skipConfirmations: false,
  batchExecutionMode: false,

  setActiveSubtab: (k) => set({ activeSubtab: k }),
  reset: () => set({ project: defaultProject() }),
  
  // Batch execution control
  setSkipConfirmations: (value) => set({ skipConfirmations: value }),
  setBatchExecutionMode: (value) => set({ batchExecutionMode: value }),

  importFromXmlFile: async (file) => {
    const parsed = await parseLogikalXml(file);
    
    // Create enhanced positions with pieces tracking
    const positions = (parsed.positions && parsed.positions.length)
      ? parsed.positions.map(pos => createPosition({
          id: pos.id,
          tag: pos.tag,
          title: pos.tag,
          level: pos.level,
          zone: pos.zone,
          type: pos.type,
          qty: pos.qty,
          status: 'Backlog'
        }, pos.qty || 1))
      : (parsed.items || []).filter(i => i.meta?.positionTag).reduce((acc, it) => {
          const existingPos = acc.find(p => p.tag === it.meta.positionTag);
          if (!existingPos) {
            acc.push(createPosition({
              id: nanoid(),
              tag: it.meta.positionTag,
              title: it.meta.positionTag,
              level: it.meta.level || '',
              zone: it.meta.zone || '',
              type: it.meta.type || 'Element',
              qty: it.quantity || 1,
              status: 'Backlog'
            }, it.quantity || 1));
          }
          return acc;
        }, []);

    const seededTasks = seedTasksFromParsed(parsed, positions);

    set({
      project: {
        ...defaultProject(),
        id: nanoid(),
        name: parsed.project?.name || 'LogiKal Project',
        orderNo: parsed.project?.orderNo || parsed.project?.order || '',
        offerNo: parsed.project?.offerNo || '',
        pm: parsed.project?.pm || parsed.project?.personInCharge || '',
        vat: parsed.project?.vat ?? 25,
        system: parsed.project?.system || parsed.project?.profileSystem || '',
        colors: parsed.project?.colors || [],
        metaText: parsed.project?.description || '',
        client: parsed.project?.customer || '',
        currency: parsed.project?.currency || 'EUR',

        positions,
        materials: parsed.items || [],
        cutList: parsed.cutList || [],
        glass: parsed.glass || [],
        warnings: (parsed.warnings || []).map(w => (typeof w === 'string' ? w : w.text)),
        totals: parsed.totals || { subtotal: 0 },
        tasks: seededTasks,
        docs: [],
        floor: { imageUrl: '', pdfMeta: null, markers: [] },
      },
    });
  },

  setFloorImage: (url, meta = null) =>
    set(state => ({ project: { ...state.project, floor: { ...state.project.floor, imageUrl: url, pdfMeta: meta } } })),
  addMarker: (marker) =>
    set(state => ({ project: { ...state.project, floor: { ...state.project.floor, markers: [...state.project.floor.markers, marker] } } })),
  updateMarker: (id, patch) =>
    set(state => ({
      project: {
        ...state.project,
        floor: {
          ...state.project.floor,
          markers: state.project.floor.markers.map(m => (m.id === id ? { ...m, ...patch } : m)),
        },
      },
    })),

  addTask: (task) =>
    set(state => ({ project: { ...state.project, tasks: [...state.project.tasks, { id: nanoid(), status: 'Backlog', ...task }] } })),
  updateTask: (id, patch) =>
    set(state => ({ project: { ...state.project, tasks: state.project.tasks.map(t => (t.id === id ? { ...t, ...patch } : t)) } })),
  moveTaskStatus: (id, status) =>
    set(state => ({ project: { ...state.project, tasks: state.project.tasks.map(t => (t.id === id ? { ...t, status } : t)) } })),

  // Montaža management functions
  updatePieceMontaza: (positionId, pieceId, montazaUpdates) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  return {
                    ...piece,
                    montaza: { ...piece.montaza, ...montazaUpdates },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  togglePieceMontazaProcess: (positionId, pieceId, processKey) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  return {
                    ...piece,
                    montaza: { 
                      ...piece.montaza, 
                      [processKey]: !piece.montaza[processKey] 
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  // Helper to get position statistics
  getPositionStats: (positionId) => {
    const state = get();
    const position = state.project.positions.find(pos => pos.id === positionId);
    if (!position) return null;

    const totalPieces = position.pieces.length;
    const completedPieces = position.pieces.filter(p => p.montaza.gotovo).length;
    const inProgressPieces = position.pieces.filter(p => 
      Object.values(p.montaza).some(v => v) && !p.montaza.gotovo
    ).length;

    return {
      total: totalPieces,
      completed: completedPieces,
      inProgress: inProgressPieces,
      pending: totalPieces - completedPieces - inProgressPieces,
      completionPercentage: totalPieces > 0 ? Math.round((completedPieces / totalPieces) * 100) : 0
    };
  },

  // V5.5 Floor Management Functions
  setCurrentFloor: (floorId) =>
    set(state => ({
      project: {
        ...state.project,
        floorplan: {
          ...state.project.floorplan,
          currentFloorId: floorId
        }
      }
    })),

  addFloorDrawing: (floorId, name, image = '') =>
    set(state => ({
      project: {
        ...state.project,
        floorplan: {
          ...state.project.floorplan,
          drawings: {
            ...state.project.floorplan.drawings,
            [floorId]: defaultDrawing(floorId, name)
          }
        }
      }
    })),

  updateFloorDrawing: (floorId, updates) =>
    set(state => ({
      project: {
        ...state.project,
        floorplan: {
          ...state.project.floorplan,
          drawings: {
            ...state.project.floorplan.drawings,
            [floorId]: {
              ...state.project.floorplan.drawings[floorId],
              ...updates,
              updated: new Date().toISOString()
            }
          }
        }
      }
    })),

  removeFloorDrawing: (floorId) =>
    set(state => {
      const { [floorId]: removed, ...remainingDrawings } = state.project.floorplan.drawings;
      
      // Remove location data for positions on this floor
      const updatedPositions = state.project.positions.map(pos => ({
        ...pos,
        floorManagement: {
          ...pos.floorManagement,
          location: pos.floorManagement.location?.floorId === floorId ? null : pos.floorManagement.location
        }
      }));

      return {
        project: {
          ...state.project,
          positions: updatedPositions,
          floorplan: {
            ...state.project.floorplan,
            drawings: remainingDrawings,
            currentFloorId: state.project.floorplan.currentFloorId === floorId 
              ? Object.keys(remainingDrawings)[0] || null 
              : state.project.floorplan.currentFloorId
          }
        }
      };
    }),

  updatePositionLocation: (positionId, location) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              floorManagement: {
                ...pos.floorManagement,
                location: location ? { ...location } : null
              },
              updated: new Date().toISOString()
            };
          }
          return pos;
        })
      }
    })),

  updatePositionInstallation: (positionId, installationUpdates) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              floorManagement: {
                ...pos.floorManagement,
                installation: {
                  ...pos.floorManagement.installation,
                  ...installationUpdates
                }
              },
              updated: new Date().toISOString()
            };
          }
          return pos;
        })
      }
    })),

  // === 3-LEVEL HIERARCHY MANAGEMENT FUNCTIONS ===
  // LEVEL 1: Position Comments/Documents/Tasks
  addPositionComment: (positionId, comment) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            const newComment = {
              id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: comment,
              timestamp: new Date().toISOString(),
              author: 'user' // Could be dynamic based on current user
            };
            return {
              ...pos,
              processData: {
                ...pos.processData,
                comments: [...pos.processData.comments, newComment]
              },
              updated: new Date().toISOString()
            };
          }
          return pos;
        })
      }
    })),

  addPositionDocument: (positionId, document) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            const newDocument = {
              id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: document.name,
              type: document.type,
              url: document.url || '',
              uploadDate: new Date().toISOString(),
              size: document.size || 0
            };
            return {
              ...pos,
              processData: {
                ...pos.processData,
                documents: [...pos.processData.documents, newDocument]
              },
              updated: new Date().toISOString()
            };
          }
          return pos;
        })
      }
    })),

  addPositionTask: (positionId, task) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            const newTask = {
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: task.title,
              description: task.description || '',
              status: task.status || 'pending',
              priority: task.priority || 'medium',
              assignee: task.assignee || '',
              createdDate: new Date().toISOString(),
              dueDate: task.dueDate || null
            };
            return {
              ...pos,
              processData: {
                ...pos.processData,
                tasks: [...pos.processData.tasks, newTask]
              },
              updated: new Date().toISOString()
            };
          }
          return pos;
        })
      }
    })),

  // LEVEL 2: Piece Comments/Documents/Tasks
  addPieceComment: (positionId, pieceId, comment) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  const newComment = {
                    id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: comment,
                    timestamp: new Date().toISOString(),
                    author: 'user'
                  };
                  return {
                    ...piece,
                    processData: {
                      ...piece.processData,
                      comments: [...piece.processData.comments, newComment]
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  addPieceDocument: (positionId, pieceId, document) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  const newDocument = {
                    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: document.name,
                    type: document.type,
                    url: document.url || '',
                    uploadDate: new Date().toISOString(),
                    size: document.size || 0
                  };
                  return {
                    ...piece,
                    processData: {
                      ...piece.processData,
                      documents: [...piece.processData.documents, newDocument]
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  addPieceTask: (positionId, pieceId, task) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  const newTask = {
                    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: task.title,
                    description: task.description || '',
                    status: task.status || 'pending',
                    priority: task.priority || 'medium',
                    assignee: task.assignee || '',
                    createdDate: new Date().toISOString(),
                    dueDate: task.dueDate || null
                  };
                  return {
                    ...piece,
                    processData: {
                      ...piece.processData,
                      tasks: [...piece.processData.tasks, newTask]
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  // LEVEL 3: Subprocess Comments/Documents/Tasks
  addSubprocessComment: (positionId, pieceId, subprocessKey, comment) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  const newComment = {
                    id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: comment,
                    timestamp: new Date().toISOString(),
                    author: 'user'
                  };
                  return {
                    ...piece,
                    montaza: {
                      ...piece.montaza,
                      [subprocessKey]: {
                        ...piece.montaza[subprocessKey],
                        comments: [...piece.montaza[subprocessKey].comments, newComment]
                      }
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  addSubprocessDocument: (positionId, pieceId, subprocessKey, document) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  const newDocument = {
                    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: document.name,
                    type: document.type,
                    url: document.url || '',
                    uploadDate: new Date().toISOString(),
                    size: document.size || 0
                  };
                  return {
                    ...piece,
                    montaza: {
                      ...piece.montaza,
                      [subprocessKey]: {
                        ...piece.montaza[subprocessKey],
                        documents: [...piece.montaza[subprocessKey].documents, newDocument]
                      }
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  addSubprocessTask: (positionId, pieceId, subprocessKey, task) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  const newTask = {
                    id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    title: task.title,
                    description: task.description || '',
                    status: task.status || 'pending',
                    priority: task.priority || 'medium',
                    assignee: task.assignee || '',
                    createdDate: new Date().toISOString(),
                    dueDate: task.dueDate || null
                  };
                  return {
                    ...piece,
                    montaza: {
                      ...piece.montaza,
                      [subprocessKey]: {
                        ...piece.montaza[subprocessKey],
                        tasks: [...piece.montaza[subprocessKey].tasks, newTask]
                      }
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),

  // Toggle subprocess status with timestamp tracking
  toggleSubprocessStatus: (positionId, pieceId, subprocessKey, status) =>
    set(state => ({
      project: {
        ...state.project,
        positions: state.project.positions.map(pos => {
          if (pos.id === positionId) {
            return {
              ...pos,
              pieces: pos.pieces.map(piece => {
                if (piece.id === pieceId) {
                  const currentStatus = piece.montaza[subprocessKey].status;
                  const newStatus = status !== undefined ? status : !currentStatus;
                  const timestamp = newStatus ? new Date().toISOString() : null;
                  
                  return {
                    ...piece,
                    montaza: {
                      ...piece.montaza,
                      [subprocessKey]: {
                        ...piece.montaza[subprocessKey],
                        status: newStatus,
                        completedAt: timestamp
                      }
                    },
                    updated: new Date().toISOString()
                  };
                }
                return piece;
              })
            };
          }
          return pos;
        })
      }
    })),
}));


