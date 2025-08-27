import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import {
  Upload,
  Download,
  Camera,
  FileImage,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Layers,
  Filter,
  Search,
  FileJson,
  FileUp,
  FileDown,
  Trash,
  MapPin,
  ClipboardCheck,
  Check,
  AlertTriangle,
  Info,
  ExternalLink,
  FileText,
  Paperclip,
} from "lucide-react";

/************************************
 * FLOOR MANAGER + HOVER TAB (SFC)
 * — single-file, drop-in React component
 * TailwindCSS + framer-motion + lucide-react
 * Optional: html2canvas for screenshots
 ************************************/

/***** Helpers *****/
const cls = (...xs) => xs.filter(Boolean).join(" ");
const formatPct = (n) => `${n.toFixed(1)}%`;

const PAGE_SIZES_MM = {
  A2: { w: 420, h: 594 },
  A3: { w: 297, h: 420 },
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
};

const DEFAULT_PHASES = [
  { key: "transport", label: "Transport" },
  { key: "ugradnja", label: "Ugradnja" },
  { key: "stakljenje", label: "Stakljenje" },
  { key: "brtvljenje", label: "Brtvljenje" },
  { key: "dodaci", label: "Dodaci" },
  { key: "gotovo", label: "Završeno" },
  { key: "blokirano", label: "Blokirano" },
  { key: "reklamacija", label: "Reklamacija" },
];

const COLOR_BY_STATUS = {
  gotovo: "bg-emerald-500",
  reklamacija: "bg-red-500",
  blokirano: "bg-rose-500",
  ready: "bg-blue-500",
  progress: "bg-amber-500",
  pending: "bg-slate-400",
};

const INITIAL_PROJECT = {
  id: "proj-demo",
  name: "Demo projekt",
  floors: [
    { id: "f1", name: "Prizemlje", paper: "A3", orientation: "portrait", image: null },
    { id: "f2", name: "Kat 1", paper: "A3", orientation: "portrait", image: null },
  ],
  currentFloorId: "f1",
  positions: [
    {
      id: "PZ-01",
      title: "Glavni ulaz",
      documents: [],
      pieces: [
        {
          id: 1,
          floorId: null, // when placed becomes a floor id
          x: null,
          y: null,
          phases: { transport: true, ugradnja: true, stakljenje: false, brtvljenje: false, dodaci: false, gotovo: false, blokirano: false, reklamacija: false },
          comments: [],
          attachments: [],
        },
        {
          id: 2,
          floorId: null,
          x: null,
          y: null,
          phases: { transport: false, ugradnja: false, stakljenje: false, brtvljenje: false, dodaci: false, gotovo: false, blokirano: false, reklamacija: false },
          comments: [],
          attachments: [],
        },
      ],
    },
    {
      id: "PZ-02",
      title: "Fasadni paneli",
      documents: [],
      pieces: [
        { id: 1, floorId: null, x: null, y: null, phases: { transport: true, ugradnja: true, stakljenje: true, brtvljenje: true, dodaci: true, gotovo: true, blokirano: false, reklamacija: false }, comments: [], attachments: [] },
        { id: 2, floorId: null, x: null, y: null, phases: { transport: true, ugradnja: true, stakljenje: true, brtvljenje: false, dodaci: false, gotovo: false, blokirano: false, reklamacija: false }, comments: [], attachments: [] },
      ],
    },
  ],
};

/***** Core status logic *****/
function piecePhaseStatus(ph) {
  if (!ph) return "pending";
  if (ph.reklamacija) return "reklamacija";
  if (ph.blokirano) return "blokirano";
  if (ph.gotovo) return "gotovo";
  const baseKeys = ["transport", "ugradnja", "stakljenje", "brtvljenje", "dodaci"];
  const done = baseKeys.filter((k) => ph[k]).length;
  if (done === 0) return "pending";
  if (done === baseKeys.length) return "ready";
  return "progress";
}

function statusDot(ph) {
  const s = piecePhaseStatus(ph);
  return COLOR_BY_STATUS[s] ?? COLOR_BY_STATUS.pending;
}

function pctDone(ph) {
  if (!ph) return 0;
  const keys = ["transport", "ugradnja", "stakljenje", "brtvljenje", "dodaci", "gotovo"]; // rekl/blok not counted in %
  const total = keys.length;
  const done = keys.filter((k) => ph[k]).length;
  return Math.round((done / total) * 100);
}

/***** File helpers *****/
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function FloorManagerComponent() {
  const [project, setProject] = useState(() => INITIAL_PROJECT);
  const [placedNotes, setPlacedNotes] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showNotesDropdown, setShowNotesDropdown] = useState(false);
  const [draggedNote, setDraggedNote] = useState(null);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingNote, setPendingNote] = useState(null); // Note waiting for details
  const [noteModalText, setNoteModalText] = useState("");
  const [noteModalProject, setNoteModalProject] = useState("");
  const [noteModalPosition, setNoteModalPosition] = useState("");
  const [noteModalFloor, setNoteModalFloor] = useState("");
  
  // Filter states
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedPosition, setSelectedPosition] = useState("all");
  const [selectedFloor, setSelectedFloor] = useState("all");
  const [showProjectFilter, setShowProjectFilter] = useState(false);
  const [showPositionFilter, setShowPositionFilter] = useState(false);
  const [showFloorFilter, setShowFloorFilter] = useState(false);
  const [showUnpositionedItems, setShowUnpositionedItems] = useState(false);
  const [showPositionedItems, setShowPositionedItems] = useState(false);
  
  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const fileImageRef = useRef(null);
  const fileJsonRef = useRef(null);

  const currentFloor = useMemo(() => project.floors.find((f) => f.id === project.currentFloorId) ?? project.floors[0], [project]);
  
  // A4 landscape aspect ratio (297mm x 210mm = 1.414)
  const A4_LANDSCAPE_ASPECT = 297 / 210;

  // Filter options
  const projectOptions = useMemo(() => {
    const unique = [...new Set(placedNotes.map(note => note.project || "Nedefinirano"))];
    return [{ value: "all", label: "Svi projekti" }, ...unique.map(p => ({ value: p, label: p }))];
  }, [placedNotes]);

  const positionOptions = useMemo(() => {
    const unique = [...new Set(placedNotes.map(note => note.position || "Nedefinirano"))];
    return [{ value: "all", label: "Sve pozicije" }, ...unique.map(p => ({ value: p, label: p }))];
  }, [placedNotes]);

  const floorOptions = useMemo(() => {
    return [
      { value: "all", label: "Svi katovi" },
      ...project.floors.map(f => ({ value: f.id, label: f.name }))
    ];
  }, [project.floors]);

  // Unpositioned items (pieces without floor location)
  const unpositionedItems = useMemo(() => {
    const matched = [];
    for (const pos of project.positions) {
      for (const pc of pos.pieces) {
        if (!pc.floorId) {
          matched.push({ positionId: pos.id, positionTitle: pos.title, piece: pc });
        }
      }
    }
    return matched;
  }, [project]);

  // Positioned items on current floor
  const positionedItems = useMemo(() => {
    const matched = [];
    for (const pos of project.positions) {
      for (const pc of pos.pieces) {
        if (pc.floorId === currentFloor.id) {
          matched.push({ positionId: pos.id, positionTitle: pos.title, piece: pc });
        }
      }
    }
    return matched;
  }, [project, currentFloor.id]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return placedNotes.filter(note => {
      if (selectedProject !== "all" && (note.project || "Nedefinirano") !== selectedProject) return false;
      if (selectedPosition !== "all" && (note.position || "Nedefinirano") !== selectedPosition) return false;
      if (selectedFloor !== "all" && (note.floor || currentFloor.id) !== selectedFloor) return false;
      return true;
    });
  }, [placedNotes, selectedProject, selectedPosition, selectedFloor, currentFloor.id]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!pageRef.current) return;
      
      const rect = pageRef.current.getBoundingClientRect();
      const x = ((e.clientX - dragOffset.x - rect.left) / rect.width) * 100;
      const y = ((e.clientY - dragOffset.y - rect.top) / rect.height) * 100;
      
      const boundedX = Math.max(2, Math.min(98, x));
      const boundedY = Math.max(2, Math.min(98, y));
      
      // Handle note dragging
      if (draggedNote) {
        setPlacedNotes(prev => 
          prev.map(note => 
            note.placedId === draggedNote.placedId
              ? { ...note, x: boundedX, y: boundedY }
              : note
          )
        );
      }
      
      // Handle piece dragging
      if (draggedPiece) {
        setProject(prev => {
          const next = structuredClone(prev);
          const pos = next.positions.find(p => p.id === draggedPiece.positionId);
          if (!pos) return prev;
          const piece = pos.pieces.find(p => p.id === draggedPiece.pieceId);
          if (!piece) return prev;
          piece.x = boundedX;
          piece.y = boundedY;
          return next;
        });
      }
    };

    const handleMouseUp = () => {
      setDraggedNote(null);
      setDraggedPiece(null);
      setDragOffset({ x: 0, y: 0 });
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    if (draggedNote || draggedPiece) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggedNote, draggedPiece, dragOffset]);

  // Image Upload
  function onUploadImage(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setProject((p) => ({
        ...p,
        floors: p.floors.map((f) => (f.id === p.currentFloorId ? { ...f, image: e.target.result } : f)),
      }));
    };
    reader.readAsDataURL(file);
  }

  // JSON Import (V5.1 canonical)
  function onUploadJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        // Minimal support for earlier shared structure
        if (json?.version === "5.1") {
          // Expect json.projects[0].positions[*].pieces[*].floorX/floorY
          const active = json.projects?.find((x) => x.id === json.activeProjectId) || json.projects?.[0];
          if (!active) throw new Error("JSON nema aktivni projekt");
          const next = structuredClone(project);
          const floorId = project.currentFloorId;
          for (const p of active.positions ?? []) {
            const found = next.positions.find((pp) => pp.id === p.id);
            if (!found) continue;
            for (const piece of p.pieces ?? []) {
              const target = found.pieces.find((pc) => pc.id === piece.id);
              if (!target) continue;
              if (typeof piece.floorX === "number" && typeof piece.floorY === "number") {
                target.floorId = floorId;
                target.x = piece.floorX;
                target.y = piece.floorY;
                if (piece.processes) target.phases = { ...target.phases, ...piece.processes };
              }
            }
          }
          setProject(next);
          alert("✅ Učitan V5.1 JSON – pozicije postavljene.");
        } else {
          alert("⚠️ JSON nije u očekivanom V5.1 formatu.");
        }
      } catch (err) {
        console.error(err);
        alert("❌ Neispravan JSON.");
      }
    };
    reader.readAsText(file);
  }

  // JSON Export (simple snapshot)
  function onExportJson() {
    const exportObj = {
      version: "5.1",
      exportedAt: new Date().toISOString(),
      activeProjectId: project.id,
      projects: [
        {
          id: project.id,
          positions: project.positions.map((p) => ({
            id: p.id,
            pieces: p.pieces.map((pc) => ({
              id: pc.id,
              floorX: typeof pc.x === "number" ? pc.x : null,
              floorY: typeof pc.y === "number" ? pc.y : null,
              processes: pc.phases,
            })),
          })),
        },
      ],
    };
    downloadJSON("floor-plan-export.json", exportObj);
  }

  // Export Image - Simple floor plan export
  async function onExportImage() {
    if (!pageRef.current) {
      alert("Tlocrt nije učitan.");
      return;
    }

    alert("Priprema slike za preuzimanje, molimo pričekajte...");

    try {
      const canvas = await html2canvas(pageRef.current, {
        scale: 2, // 2x rezolucija za bolju kvalitetu
        useCORS: true,
        backgroundColor: "#ffffff", // Bijela pozadina
        logging: false
      });

      const url = canvas.toDataURL("image/png", 1.0); // Maksimalna kvaliteta
      const a = document.createElement("a");
      a.href = url;
      a.download = `tlocrt-${project.name}-${currentFloor.name}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      alert(`✅ Slika tlocrta je spremljena!`);
    } catch (err) {
      console.error("Greška prilikom kreiranja slike:", err);
      alert("Došlo je do greške prilikom spremanja slike.");
    }
  }

  // Screenshot - Systematic component testing (for debugging)
  async function onScreenshot() {
    const componentTargets = [
      // Level 1 - Largest containers
      { 
        level: 1,
        name: 'WHOLE_APP', 
        selector: '.h-screen.w-full.flex.flex-col.bg-slate-50',
        description: 'Main app container'
      },
      { 
        level: 1,
        name: 'DOCUMENT_BODY', 
        element: document.body,
        description: 'Entire document body'
      },

      // Level 2 - Major sections  
      {
        level: 2,
        name: 'TOOLBAR',
        selector: '.flex.items-center.justify-between.p-3.border-b.border-slate-200.bg-white',
        description: 'Top toolbar section'
      },
      {
        level: 2, 
        name: 'MAIN_CONTENT',
        selector: '.flex-1.flex',
        description: 'Main content area below toolbar'
      },

      // Level 3 - Content sections
      {
        level: 3,
        name: 'SIDEBAR',
        selector: '.bg-white.border-r.border-slate-200',
        description: 'Left sidebar'
      },
      {
        level: 3,
        name: 'FLOOR_AREA',
        selector: '.flex-1.flex.flex-col',
        description: 'Floor management area'
      },

      // Level 4 - Floor viewer components
      {
        level: 4,
        name: 'FLOOR_CONTAINER',
        element: 'containerRef',
        description: 'Floor viewer container (overflow-auto)'
      },
      {
        level: 4,
        name: 'FLOOR_CENTER',
        selector: '.flex.items-center.justify-center.min-h-full',
        description: 'Centered floor area'
      },

      // Level 5 - Floor plan itself
      {
        level: 5,
        name: 'FLOOR_PLAN',
        element: 'pageRef',
        description: 'Actual floor plan element'
      },
      {
        level: 5,
        name: 'STATUS_BAR',
        selector: '.p-4.bg-white.border-t.border-slate-200',
        description: 'Bottom status bar'
      }
    ];

    let currentLevel = parseInt(prompt("Enter level to screenshot (1-5):", "1"));
    if (!currentLevel || currentLevel < 1 || currentLevel > 5) {
      alert("Invalid level. Defaulting to level 1.");
      currentLevel = 1;
    }

    const targets = componentTargets.filter(t => t.level === currentLevel);
    
    console.log(`=== SCREENSHOT LEVEL ${currentLevel} START ===`);
    alert(`🎯 Testing ${targets.length} components at level ${currentLevel}`);

    let successCount = 0;

    for (const target of targets) {
      let element;
      
      if (target.element === 'containerRef') {
        element = containerRef.current;
      } else if (target.element === 'pageRef') {
        element = pageRef.current;
      } else if (target.element) {
        element = target.element;
      } else if (target.selector) {
        element = document.querySelector(target.selector);
      }

      if (!element) {
        console.log(`❌ ${target.name}: element not found`);
        continue;
      }

      try {
        const rect = element.getBoundingClientRect();
        console.log(`📐 ${target.name}: ${rect.width}x${rect.height} - ${target.description}`);

        if (rect.width < 10 || rect.height < 10) {
          console.log(`⚠️ ${target.name}: too small`);
          continue;
        }

        const canvas = await html2canvas(element, {
          scale: 0.5,
          useCORS: true,
          backgroundColor: "#f8fafc",
          allowTaint: true,
          logging: false
        });

        if (canvas.width > 0 && canvas.height > 0) {
          const url = canvas.toDataURL("image/png", 0.7);
          const a = document.createElement("a");
          a.href = url;
          a.download = `L${currentLevel}-${target.name}-${canvas.width}x${canvas.height}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          successCount++;
          console.log(`✅ ${target.name}: saved ${canvas.width}x${canvas.height}px`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (err) {
        console.log(`❌ ${target.name}: ${err.message}`);
      }
    }

    console.log(`=== SCREENSHOT LEVEL ${currentLevel} END ===`);
    alert(`✅ Level ${currentLevel} complete! ${successCount}/${targets.length} screenshots saved.`);
  }

  // Note management functions
  function createNoteFromModal() {
    if (!noteModalText.trim() || !pendingNote) return;
    
    const colors = ["bg-yellow-200", "bg-blue-200", "bg-green-200", "bg-pink-200", "bg-purple-200"];
    const newNote = {
      id: Date.now(),
      text: noteModalText.trim(),
      project: noteModalProject.trim() || "Nedefinirano",
      position: noteModalPosition.trim() || "Nedefinirano", 
      floor: noteModalFloor || currentFloor.id,
      color: colors[Math.floor(Math.random() * colors.length)],
      x: pendingNote.x,
      y: pendingNote.y,
      placedId: Date.now()
    };
    
    setPlacedNotes(prev => [...prev, newNote]);
    setShowNoteModal(false);
    setPendingNote(null);
    setNoteModalText("");
    setNoteModalProject("");
    setNoteModalPosition("");
    setNoteModalFloor("");
  }

  function cancelNoteModal() {
    setShowNoteModal(false);
    setPendingNote(null);
    setNoteModalText("");
    setNoteModalProject("");
    setNoteModalPosition("");
    setNoteModalFloor("");
  }

  // Drag and drop functions
  function handleDropOnImage(ev) {
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text/plain");
    if (!data) return;
    
    try {
      const dragData = JSON.parse(data);
      const rect = pageRef.current.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      
      // Check if it's a note icon being dragged
      if (dragData.type === 'note-icon') {
        // Set pending note position and show modal
        setPendingNote({
          x: Math.max(5, Math.min(95, x)),
          y: Math.max(5, Math.min(95, y))
        });
        setNoteModalFloor(currentFloor.id); // Set default floor
        setShowNoteModal(true);
      }
      
      // Check if it's a position piece being dragged
      else if (dragData.type === 'position-piece') {
        setProject((p) => {
          const next = structuredClone(p);
          const pos = next.positions.find((pp) => pp.id === dragData.positionId);
          if (!pos) return p;
          const piece = pos.pieces.find((pc) => pc.id === dragData.pieceId);
          if (!piece) return p;
          piece.floorId = next.currentFloorId;
          piece.x = Math.max(0, Math.min(100, x));
          piece.y = Math.max(0, Math.min(100, y));
          return next;
        });
      }
    } catch (err) {
      console.error("Error dropping note:", err);
    }
  }

  function handleDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  }

  function removeFromImage(placedId) {
    setPlacedNotes(prev => prev.filter(n => n.placedId !== placedId));
  }

  // Note moving functions
  function handleNoteMouseDown(e, note) {
    e.preventDefault();
    e.stopPropagation();
    
    const noteRect = e.currentTarget.getBoundingClientRect();
    
    setDraggedNote(note);
    setDragOffset({
      x: e.clientX - noteRect.left - (noteRect.width / 2),
      y: e.clientY - noteRect.top - (noteRect.height / 2)
    });
  }

  // Piece moving functions
  function handlePieceMouseDown(e, positionId, pieceId) {
    e.preventDefault();
    e.stopPropagation();
    
    const pieceRect = e.currentTarget.getBoundingClientRect();
    
    setDraggedPiece({ positionId, pieceId });
    setDragOffset({
      x: e.clientX - pieceRect.left - (pieceRect.width / 2),
      y: e.clientY - pieceRect.top - (pieceRect.height / 2)
    });
  }



  // UI – top toolbar
  function Toolbar() {
    return (
      <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold text-slate-800">Tlocrt</div>

          {/* Unpositioned items dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUnpositionedItems(!showUnpositionedItems)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm inline-flex items-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              Neposiconirani komadi ({unpositionedItems.length})
              <ChevronDown className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showUnpositionedItems && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute z-40 mt-2 w-80 max-h-96 overflow-y-auto p-3 rounded-xl border bg-white shadow-xl"
                >
                  {unpositionedItems.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-4">
                      Svi komadi na ovom katu su pozicionirani.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {unpositionedItems.map((item) => (
                        <div
                          key={`${item.positionId}-${item.piece.id}`}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", JSON.stringify({ 
                              type: 'position-piece',
                              positionId: item.positionId,
                              pieceId: item.piece.id 
                            }));
                          }}
                          className="p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-move group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{item.positionId}</div>
                              <div className="text-xs text-slate-600">{item.positionTitle}</div>
                              <div className="text-xs text-slate-500">Komad #{item.piece.id}</div>
                            </div>
                            <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            {/* Project filter */}
            <div className="relative">
              <button
                onClick={() => setShowProjectFilter(!showProjectFilter)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm inline-flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Projekt
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showProjectFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute z-40 mt-2 w-48 p-2 rounded-xl border bg-white shadow-xl"
                  >
                    {projectOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedProject(option.value);
                          setShowProjectFilter(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${
                          selectedProject === option.value ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Position filter */}
            <div className="relative">
              <button
                onClick={() => setShowPositionFilter(!showPositionFilter)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm inline-flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Pozicija
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showPositionFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute z-40 mt-2 w-48 p-2 rounded-xl border bg-white shadow-xl"
                  >
                    {positionOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedPosition(option.value);
                          setShowPositionFilter(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${
                          selectedPosition === option.value ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Floor filter */}
            <div className="relative">
              <button
                onClick={() => setShowFloorFilter(!showFloorFilter)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm inline-flex items-center gap-2"
              >
                <Layers className="w-4 h-4" />
                Kat
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showFloorFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute z-40 mt-2 w-48 p-2 rounded-xl border bg-white shadow-xl"
                  >
                    {floorOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedFloor(option.value);
                          setShowFloorFilter(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-slate-100 ${
                          selectedFloor === option.value ? 'bg-blue-50 text-blue-700' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2">
          {/* Uploads */}
          <input ref={fileImageRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => onUploadImage(e.target.files?.[0])} />
          <input ref={fileJsonRef} type="file" accept=".json" className="hidden" onChange={(e) => onUploadJson(e.target.files?.[0])} />

          <button onClick={() => fileImageRef.current?.click()} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 inline-flex items-center gap-2">
            <Upload className="w-4 h-4" /> Slika
          </button>
          <button onClick={() => fileJsonRef.current?.click()} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 inline-flex items-center gap-2">
            <FileUp className="w-4 h-4" /> JSON
          </button>
          <button onClick={onExportJson} className="px-3 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 inline-flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export
          </button>
          <button onClick={onExportImage} className="px-3 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 inline-flex items-center gap-2">
            <Download className="w-4 h-4" /> Spremi kao sliku
          </button>
          <button onClick={onScreenshot} className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm hover:bg-orange-600 inline-flex items-center gap-2">
            <Camera className="w-4 h-4" /> Debug Screenshot
          </button>

          {/* Notes dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotesDropdown(!showNotesDropdown)}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Bilješke ({placedNotes.length}) | Komadi ({positionedItems.length})
              <ChevronDown className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {showNotesDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute right-0 z-40 mt-2 w-80 max-h-96 overflow-y-auto p-3 rounded-xl border bg-white shadow-xl"
                >
                  {/* Bilješke */}
                  {placedNotes.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Bilješke</h4>
                      <div className="space-y-2">
                        {placedNotes.map((note) => (
                          <div key={note.placedId} className={`p-3 rounded-lg ${note.color} group relative`}>
                            <div className="text-sm font-medium pr-6">
                              {note.text}
                            </div>
                            <button
                              onClick={() => removeFromImage(note.placedId)}
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black/10 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positioned pieces */}
                  {positionedItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Pozicionirani komadi</h4>
                      <div className="space-y-2">
                        {positionedItems.map((item) => (
                          <div key={`${item.positionId}-${item.piece.id}`} className="p-3 bg-slate-50 rounded-lg group relative">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-sm">{item.positionId}</div>
                                <div className="text-xs text-slate-600">{item.positionTitle}</div>
                                <div className="text-xs text-slate-500">Komad #{item.piece.id}</div>
                              </div>
                              <button
                                onClick={() => {
                                  setProject((p) => {
                                    const next = structuredClone(p);
                                    const pos = next.positions.find((pp) => pp.id === item.positionId);
                                    if (!pos) return p;
                                    const piece = pos.pieces.find((pc) => pc.id === item.piece.id);
                                    if (!piece) return p;
                                    piece.floorId = null;
                                    piece.x = null;
                                    piece.y = null;
                                    return next;
                                  });
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                                title="Ukloni s kata"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {placedNotes.length === 0 && positionedItems.length === 0 && (
                    <div className="text-sm text-slate-500 text-center py-4">
                      Nema bilješki ni komada na ovom katu.
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    );
  }


  return (
    <div className="h-screen w-full flex flex-col bg-slate-50">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Left sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 80, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white border-r border-slate-200 flex-shrink-0 overflow-hidden"
            >
              <div className="p-4 h-full flex flex-col items-center">
                <div className="flex items-center justify-center mb-6">
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Note icon for dragging */}
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'note-icon' }));
                  }}
                  className="p-4 rounded-xl bg-yellow-100 hover:bg-yellow-200 cursor-move transition-colors group border-2 border-dashed border-yellow-300"
                  title="Povucite na crtež da dodate bilješku"
                >
                  <FileText className="w-8 h-8 text-yellow-700 group-hover:scale-110 transition-transform" />
                </div>

                <div className="mt-3 text-xs text-slate-500 text-center max-w-16">
                  Povucite na crtež
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main floor area */}
        <div className="flex-1 flex flex-col">
          {/* Toggle sidebar button when hidden */}
          {!showSidebar && (
            <div className="absolute top-20 left-4 z-10">
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 bg-white shadow-lg hover:bg-slate-50 rounded-lg border"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Floor viewer */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-auto bg-slate-100 p-4"
          >
          <div className="flex items-center justify-center min-h-full">
            <div
              ref={pageRef}
              className="relative bg-white shadow-lg mx-auto"
              style={{
                width: `min(90vw, calc((100vh - 200px) * ${A4_LANDSCAPE_ASPECT}))`,
                height: `min(calc(90vw / ${A4_LANDSCAPE_ASPECT}), calc(100vh - 200px))`,
                aspectRatio: `${A4_LANDSCAPE_ASPECT}`,
              }}
              onDrop={handleDropOnImage}
              onDragOver={handleDragOver}
            >
              {/* Background image */}
              {currentFloor?.image && (
                <img
                  src={currentFloor.image}
                  alt="Floor plan"
                  className="absolute inset-0 w-full h-full object-contain"
                />
              )}

              {/* No image placeholder */}
              {!currentFloor?.image && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-white">
                  <div className="text-center p-8">
                    <FileImage className="w-24 h-24 mx-auto mb-6 text-slate-300" />
                    <div className="text-xl font-medium mb-3 text-slate-600">Floor Plan</div>
                    <div className="text-base mb-4 text-slate-500">
                      {currentFloor?.name || 'Prizemlje'}
                    </div>
                    <div className="text-sm text-slate-400 max-w-xs">
                      Kliknite "Slika" button da učitate tlocrt za ovaj kat
                    </div>
                    
                    {/* Mock technical drawing grid */}
                    <div className="mt-8 opacity-20">
                      <div className="grid grid-cols-8 gap-1 w-32 mx-auto">
                        {Array.from({length: 32}).map((_, i) => (
                          <div key={i} className="w-3 h-3 border border-slate-300"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Drop zone indicator when dragging */}
              <div 
                ref={(el) => {
                  if (el) el.screenshotZone = true;
                }}
                className="absolute inset-4 border-2 border-dashed border-slate-300 rounded-lg pointer-events-none opacity-0 transition-opacity"
              >
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm">Postavite bilješku ovdje</div>
                  </div>
                </div>
              </div>

              {/* Placed notes */}
              {filteredNotes.map((note) => (
                <div
                  key={note.placedId}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move group select-none ${
                    draggedNote?.placedId === note.placedId ? 'z-50' : 'z-10'
                  }`}
                  style={{
                    left: `${note.x}%`,
                    top: `${note.y}%`,
                  }}
                  onMouseDown={(e) => handleNoteMouseDown(e, note)}
                >
                  <div className={`max-w-32 p-2 rounded-lg shadow-lg ${note.color} ${
                    draggedNote?.placedId === note.placedId 
                      ? 'scale-110 shadow-xl' 
                      : 'group-hover:scale-105'
                  } transition-all relative`}>
                    <div className="text-xs font-medium pr-4 pointer-events-none">
                      {note.text}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromImage(note.placedId);
                      }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/10 rounded pointer-events-auto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Positioned pieces */}
              {positionedItems.map((item) => (
                <div
                  key={`${item.positionId}-${item.piece.id}`}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move group select-none ${
                    draggedPiece?.positionId === item.positionId && draggedPiece?.pieceId === item.piece.id ? 'z-50' : 'z-20'
                  }`}
                  style={{
                    left: `${item.piece.x}%`,
                    top: `${item.piece.y}%`,
                  }}
                  onMouseDown={(e) => handlePieceMouseDown(e, item.positionId, item.piece.id)}
                >
                  <div className={`bg-yellow-400 text-black text-xs font-black px-3 py-2 rounded-full shadow-xl border-2 border-red-600 whitespace-nowrap ${
                    draggedPiece?.positionId === item.positionId && draggedPiece?.pieceId === item.piece.id
                      ? 'scale-110 shadow-2xl ring-2 ring-orange-500' 
                      : ''
                  } transition-all pointer-events-none`}>
                    {item.positionId}-{item.piece.id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

          {/* Status bar */}
          <div className="p-4 bg-white border-t border-slate-200">
            <div className="flex items-center justify-center">
              <div className="text-sm text-slate-600">
                {currentFloor?.name} - A4 Landscape (297×210mm)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      <AnimatePresence>
        {showNoteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={cancelNoteModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-96 max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FileText className="w-6 h-6 text-yellow-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Nova bilješka</h3>
                  <p className="text-sm text-slate-600">Unesite detalje bilješke</p>
                </div>
              </div>

              <div className="mb-6 space-y-4">
                {/* Text area */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tekst bilješke
                  </label>
                  <textarea
                    value={noteModalText}
                    onChange={(e) => setNoteModalText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        createNoteFromModal();
                      }
                    }}
                    placeholder="Unesite tekst bilješke... (Ctrl+Enter za potvrdu)"
                    className="w-full h-24 px-4 py-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                {/* Project input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Projekt
                  </label>
                  <input
                    type="text"
                    value={noteModalProject}
                    onChange={(e) => setNoteModalProject(e.target.value)}
                    placeholder="Naziv projekta (opcionalno)"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Position input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Pozicija
                  </label>
                  <input
                    type="text"
                    value={noteModalPosition}
                    onChange={(e) => setNoteModalPosition(e.target.value)}
                    placeholder="Pozicija (opcionalno)"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Floor select */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Kat
                  </label>
                  <select
                    value={noteModalFloor}
                    onChange={(e) => setNoteModalFloor(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {project.floors.map((floor) => (
                      <option key={floor.id} value={floor.id}>
                        {floor.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={cancelNoteModal}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Odustani
                </button>
                <button
                  onClick={createNoteFromModal}
                  disabled={!noteModalText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  Dodaj bilješku
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}

// Export komponente
export default FloorManagerComponent;
