import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  AlertCircle,
  Settings,
  ListChecks,
  ClipboardCheck,
  MessageSquare,
  Paperclip,
  ListTodo,
  X,
  Upload,
  ExternalLink,
  FileText,
  History,
  Truck,
  Hammer,
  PanelsTopLeft,
  Droplets,
  Puzzle,
  CheckCircle2,
  Ban,
  AlertOctagon,
  Plus,
  ShoppingCart,
  Palette,
  Package,
  Wrench,
  Factory,
  Building2,
  MapPin,
  HandMetal,
} from "lucide-react";

/**
 * ASCII-SAFE SOURCE
 * -----------------
 * This file avoids raw non-ASCII characters entirely to sidestep bundlers
 * that expect unicode escapes. All Croatian diacritics are encoded using
 * \uXXXX sequences inside string literals.
 */

/* ------------------------------------------------------------------
   Helpers & constants
------------------------------------------------------------------- */
export const STATUSI_FAZA = {
  ceka: { text: "\u010Ceka", bg: "#64748b", light: "#e2e8f0" },
  u_radu: { text: "U radu", bg: "#2563eb", light: "#dbeafe" },
  kasni: { text: "Kasni", bg: "#dc2626", light: "#fee2e2" },
  gotovo: { text: "Gotovo", bg: "#16a34a", light: "#dcfce7" },
};

export const STATUSI_HITNOST = {
  normalno: { text: "Normalno", bg: "#6b7280", light: "#f3f4f6" },
  hitno: { text: "Hitno", bg: "#7c3aed", light: "#ede9fe" },
  prvo_rijesiti: { text: "Prvo rije\u0161iti", bg: "#dc2626", light: "#fee2e2" },
};

export const PROCESI = [
  { id: "prodaja", boja: "#10b981", ikona: ShoppingCart },
  { id: "dizajn", boja: "#8b5cf6", ikona: Palette },
  { id: "nabava", boja: "#f59e0b", ikona: Package },
  { id: "tehni\u010Dka_priprema", boja: "#ef4444", ikona: Wrench },
  { id: "proizvodnja", boja: "#3b82f6", ikona: Factory },
  { id: "monta\u017Ea", boja: "#2563eb", ikona: Building2 },
  { id: "logistika", boja: "#06b6d4", ikona: Truck },
  { id: "primopredaja", boja: "#84cc16", ikona: HandMetal },
];

const pad = (n) => String(n).padStart(2, "0");
const toDate = (d) => (d instanceof Date ? d : new Date(d));
const toInputDateValue = (d) => {
  const dt = toDate(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const daysBetween = (a, b) =>
  Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);

function lighten(hex, amount = 0.6) {
  const n = hex.replace("#", "");
  const r = parseInt(n.substring(0, 2), 16);
  const g = parseInt(n.substring(2, 4), 16);
  const b = parseInt(n.substring(4, 6), 16);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// Nice soft gradient for process pills
function gradientFor(hex) {
  return `linear-gradient(135deg, ${lighten(hex, 0.18)} 0%, ${hex} 100%)`;
}

// Sub-processes per process (for the left secondary dock)
const SUBPROCESI = {
  "monta\u017Ea": [
    { id: "transport", title: "Transport", icon: Truck },
    { id: "ugradnja", title: "Ugradnja", icon: Hammer },
    { id: "stakljenje", title: "Stakljenje", icon: PanelsTopLeft },
    { id: "brtvljenje", title: "Brtvljenje", icon: Droplets },
    { id: "dodaci", title: "Dodaci", icon: Puzzle },
    { id: "zavrseno", title: "Zavr\u0161eno", icon: CheckCircle2 },
    { id: "reklamacija", title: "Reklamacija", icon: AlertOctagon },
    { id: "blokirano", title: "Blokirano", icon: Ban },
  ],
  kontrola: [
    { id: "ulazna", title: "Ulazna kontrola", icon: ClipboardCheck },
    { id: "izlazna", title: "Izlazna kontrola", icon: ClipboardCheck },
  ],
  "op\u0107enito": [{ id: "info", title: "Op\u0107e informacije", icon: Settings }],
};

/* ------------------------------------------------------------------
   Right dock (generic)
------------------------------------------------------------------- */
function RightDock({
  open,
  width = 340,
  children,
  onClose,
  scopeLabel,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layout
          initial={{ width: 0, opacity: 1 }}
          animate={{ width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="h-full border-l border-slate-200 rounded-r-xl overflow-hidden bg-white"
        >
          <div className="h-full p-3 flex flex-col">
            <div className="flex items-center justify-between">
              {scopeLabel ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate max-w-[65%]">
                  {scopeLabel}
                </span>
              ) : (
                <span />
              )}
              <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------
   Left docks (primary processes + secondary + tertiary detail)
------------------------------------------------------------------- */
function LeftPrimaryDock({
  open,
  width = 56,
  processes,
  onSelect,
  onHover,
  currentFaza,
  currentHitnost,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layout
          initial={{ width: 0 }}
          animate={{ width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="h-full overflow-hidden bg-transparent"
        >
          <div className="h-full p-2 flex flex-col items-center">
            <div className="flex flex-col gap-2 mt-1">
              {processes.map((p) => {
                const Icon = p.ikona;
                return (
                  <button
                    key={p.id}
                    title={p.id}
                    onClick={() => onSelect(p.id)}
                    style={{ 
                      background: "transparent",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = `
                        radial-gradient(circle at center, ${p.boja}15 0%, transparent 70%),
                        rgba(255,255,255,0.1)
                      `;
                      onHover && onHover(p.id);
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                    }}
                    className="h-10 w-10 rounded-xl ring-1 ring-black/5 shadow-sm flex items-center justify-center hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  >
                    <Icon className="w-5 h-5" style={{ color: p.boja }} />
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LeftSecondaryDock({
  open,
  width = 220,
  items,
  activeMap,
  onToggle,
  onSelect,
  onClose,
  currentFaza,
  currentHitnost,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layout
          initial={{ width: 0 }}
          animate={{ width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="h-full overflow-hidden bg-transparent"
        >
          <div className="h-full p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-70">Podprocesi</span>
              <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
              {items.map((it) => {
                const Icon = it.icon;
                const done = !!(activeMap && activeMap[it.id]);
                return (
                  <button
                    key={it.id}
                    onClick={() => { onToggle ? onToggle(it.id, !done) : onSelect(it.id); }}
                    className={`w-full text-left flex items-center gap-2 rounded-lg border p-2 text-xs ${done ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:bg-slate-50"}`}
                  >
                    <Icon className={`w-4 h-4 ${done ? "text-emerald-600" : "opacity-70"}`} />
                    <span>{it.title}</span>
                    {done && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LeftTertiaryDock({
  open,
  width = 300,
  title,
  children,
  onClose,
  currentFaza,
  currentHitnost,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layout
          initial={{ width: 0 }}
          animate={{ width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="h-full overflow-hidden bg-transparent"
        >
          <div className="h-full p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-70 truncate max-w-[70%]">{title || "Podaci"}</span>
              <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
              {children}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------
   Panels (attachments / comments / tasks / history)
------------------------------------------------------------------- */
function AttachmentsPanel({ docs = [], onAddDoc, inputMode, onCancel } = {}) {
  const [files, setFiles] = useState([]);
  const [fileName, setFileName] = useState("");

  if (inputMode) {
    return (
      <div className="space-y-3">
        <input
          type="text"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Naziv dokumenta..."
          className="w-full rounded-lg border border-slate-300 bg-white text-sm p-2"
          autoFocus
        />
        <div
          className="rounded-xl border border-dashed border-slate-300 p-4 text-center cursor-pointer hover:border-slate-400"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = Array.from(e.dataTransfer.files);
            if (dropped[0]) {
              setFileName(dropped[0].name);
            }
          }}
        >
          <Upload className="w-7 h-7 mx-auto mb-2 opacity-70" />
          <p className="text-xs opacity-80">Povuci datoteku ovdje</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!fileName.trim()) return;
              onAddDoc && onAddDoc({ name: fileName.trim() });
              setFileName("");
            }}
            className="flex-1 rounded-lg bg-violet-600 text-white text-sm py-2 hover:bg-violet-700"
          >
            Spremi
          </button>
          <button 
            onClick={() => { 
              setFileName(""); 
              onCancel && onCancel(); 
            }} 
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-sm py-2 px-3"
          >
            Odustani
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {docs.length === 0 && <p className="text-xs opacity-70">Nema dokumenata</p>}
        {docs.map((d) => (
          <div key={d.id} className="rounded-lg border border-slate-200 p-2 flex items-center gap-2 text-xs bg-white">
            <FileText className="w-4 h-4 opacity-70" />
            <span className="truncate">{d.name}</span>
            <button className="ml-auto p-1 rounded hover:bg-slate-100">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentsPanel({ items = [], onAdd, inputMode, onCancel } = {}) {
  const [txt, setTxt] = useState("");
  const display = items.map((i) => typeof i === 'string' ? i : i.text || String(i));

  if (inputMode) {
    return (
      <div className="space-y-2">
        <textarea
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-slate-300 bg-white text-sm p-2"
          placeholder="Upisi komentar..."
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!txt.trim()) return;
              onAdd && onAdd(txt.trim());
              setTxt("");
            }}
            className="flex-1 rounded-lg bg-blue-600 text-white text-sm py-2 hover:bg-blue-700"
          >
            Spremi
          </button>
          <button 
            onClick={() => { 
              setTxt(""); 
              onCancel && onCancel(); 
            }} 
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-sm py-2 px-3"
          >
            Odustani
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {display.length === 0 && <p className="text-xs opacity-70">Nema komentara</p>}
        {display.map((c, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs bg-white">
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryPanel() {
  const items = [
    { t: "2025-08-23 14:10", e: "Status promijenjen: U tijeku" },
    { t: "2025-08-22 09:02", e: "Dodan prilog: skica.pdf" },
    { t: "2025-08-21 16:44", e: "Komentar: 'Provjeriti dimenzije'" },
  ];
  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs bg-white">
            <div className="font-medium opacity-70">{it.t}</div>
            <div>{it.e}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksPanel({ items = [], onAdd, inputMode, onCancel } = {}) {
  const [taskData, setTaskData] = useState({
    title: "",
    assignee: "",
    due: ""
  });

  if (inputMode) {
    return (
      <div className="space-y-3">
        <input
          value={taskData.title}
          onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Naziv zadatka..."
          className="w-full rounded-lg border border-slate-300 bg-white text-sm p-2"
          autoFocus
        />
        <input
          value={taskData.assignee}
          onChange={(e) => setTaskData(prev => ({ ...prev, assignee: e.target.value }))}
          placeholder="Zadužena osoba..."
          className="w-full rounded-lg border border-slate-300 bg-white text-sm p-2"
        />
        <div className="space-y-1">
          <label className="text-xs text-slate-600 block">Rok:</label>
          <input
            type="date"
            value={taskData.due}
            onChange={(e) => setTaskData(prev => ({ ...prev, due: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white text-sm p-2"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!taskData.title.trim()) return;
              onAdd && onAdd({
                title: taskData.title.trim(),
                assignee: taskData.assignee.trim() || "Nedodjeljeno",
                due: taskData.due || new Date().toISOString().split('T')[0]
              });
              setTaskData({ title: "", assignee: "", due: "" });
            }}
            className="flex-1 rounded-lg bg-emerald-600 text-white text-sm py-2 hover:bg-emerald-700"
          >
            Spremi
          </button>
          <button 
            onClick={() => { 
              setTaskData({ title: "", assignee: "", due: "" });
              onCancel && onCancel(); 
            }} 
            className="rounded-lg bg-slate-100 hover:bg-slate-200 text-sm py-2 px-3"
          >
            Odustani
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {items.length === 0 && <p className="text-xs opacity-70">Nema zadataka</p>}
        {items.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 p-2 text-sm bg-white space-y-1">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!t.done}
                readOnly
              />
              <span className={t.done ? "line-through opacity-50" : "font-medium"}>{t.title}</span>
            </label>
            {t.assignee && (
              <div className="text-xs text-slate-600 ml-6">
                👤 {t.assignee}
              </div>
            )}
            {t.due && (
              <div className="text-xs text-slate-600 ml-6">
                📅 {new Date(t.due).toLocaleDateString('hr-HR')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Main card (small \u2192 large hover)
------------------------------------------------------------------- */

// type Task = {
//   id: string;
//   naziv: string;
//   pozicija: string;
//   proces: string;
//   status: keyof typeof STATUSI;
//   start?: string | Date;
//   end?: string | Date;
//   plannedEnd?: string | Date;
//   opis?: string;
//   komentari?: string[];
//   prilozi?: string[];
// };

const MOCK_OPIS = [
  "Izrada aluminijskog okvira po tehni\u010Dkoj dokumentaciji.",
  "Profili se re\u017Eu na potrebne dimenzije prema nacrtu.",
  "Svi rezovi se obra\u0111uju i odma\u0161\u0107uju po standardu.",
  "Spajanje kutnicima i vijcima propisane \u010Dvr\u0107e.",
  "Kontrola dijagonala i ravnine svakog segmenta okvira.",
  "Umetanje brtvi i provjera nepropusnosti.",
  "Za\u0161tita povr\u0161ina trakom do instalacije.",
  "Priprema za transport na gradili\u0161te.",
  "Pozicioniranje i privremena fiksacija na objektu.",
  "Finalno u\u010Dvr\u0161\u0107ivanje svih spojeva.",
  "Vizualna kontrola i dokumentiranje stanja.",
  "Predaja radova investitoru s garan\u010Dijskim listom.",
  "Eventualne popravke se evidentiraju u zapisnik.",
  "Koordinacija s ostalim izvo\u0111a\u010Dima radova.",
  "Provjera usagla\u0161enosti s projektom.",
  "Ispitivanje funkcionalnosti pokretnih elemenata.",
  "Čišćenje radne površine nakon završetka.",
  "Arhiviranje tehničke dokumentacije.",
  "Priprema izvještaja o izvedenim radovima.",
  "Planiranje održavanja u garantnom roku."
].join(" ");

// --- Position domain types and mock data (ASCII-safe) ---
// type PDComment = { id: string; text: string; author?: string; date?: string };
// type PDDoc = { id: string; name: string; url?: string; type?: string };
// type PDTask = { id: string; title: string; assignee?: string; due?: string; done?: boolean };
// type ProcessData = { comments: PDComment[]; documents: PDDoc[]; tasks: PDTask[] };
// type Piece = {
//   id: number;
//   pieceNumber: number;
//   processData: ProcessData;
//   montaza?: {
//     // transport?: { status: boolean; comments: PDComment[]; documents: PDDoc[]; tasks: PDTask[]; timestamp: string | null };
//     // ugradnja?: { status: boolean; comments: PDComment[]; documents: PDDoc[]; tasks: PDTask[]; timestamp: string | null };
//   };
// };

// type Position = { id: string; title: string; processData: ProcessData; pieces: Piece[] };

const MOCK_POSITION = {
  id: "PZ-01",
  title: "Glavni ulaz",
  processData: {
    comments: [
      { id: "c-pos-1", text: "Klijent trazi RAL 7016 boju", author: "PM", date: "2025-08-18" },
      { id: "c-pos-2", text: "Provjeri dimenzije otvora na licu mjesta", author: "Voditelj", date: "2025-08-20" },
      { id: "c-pos-3", text: "Staklo mora biti sigurnosno - tempered", author: "Projektant", date: "2025-08-21" },
    ],
    documents: [
      { id: "d-pos-1", name: "PZ-01_nacrt.pdf", url: "#", type: "drawing" },
      { id: "d-pos-2", name: "Specifikacija_materijala.xlsx", url: "#", type: "spec" },
      { id: "d-pos-3", name: "RAL_7016_uzorak.jpg", url: "#", type: "photo" },
    ],
    tasks: [
      { id: "t-pos-1", title: "Naruci dodatne vijke", assignee: "Nabava", due: "2025-08-28" },
      { id: "t-pos-2", title: "Provjeri dostupnost stakla", assignee: "Skladište", due: "2025-08-26" },
      { id: "t-pos-3", title: "Koordiniraj s električarom za kablove", assignee: "PM", due: "2025-08-29" },
    ],
  },
  pieces: [
    {
      id: 1,
      pieceNumber: 1,
      processData: {
        comments: [
          { id: "c-p1-1", text: "Ovaj komad ima ostecenje", author: "QC", date: "2025-08-19" },
        ],
        documents: [
          { id: "d-p1-1", name: "Komad1_foto.jpg", url: "#", type: "photo" },
        ],
        tasks: [
          { id: "t-p1-1", title: "Popraviti ostecenje", assignee: "Radionica", due: "2025-08-25" },
        ],
      },
      montaza: {
        transport: { status: false, comments: [{ id: "c-tt-1", text: "Transport odgoden zbog kise" }], documents: [], tasks: [], timestamp: null },
        ugradnja: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
      },
    },
    {
      id: 2,
      pieceNumber: 2,
      processData: {
        comments: [],
        documents: [],
        tasks: [],
      },
      montaza: { transport: { status: false, comments: [], documents: [], tasks: [], timestamp: null }, ugradnja: { status: false, comments: [], documents: [], tasks: [], timestamp: null } },
    },
  ],
};

export default function TaskHoverCardRedesign({ 
  task: propTask, 
  level = 1, 
  onClose, 
  onExpand,
  position: taskPosition,
  hoverMeta,
  ...otherProps 
}) {
  const task = propTask || {
    id: "z1",
    naziv: "Izrada aluminijskog okvira",
    pozicija: "P-12 (Fasada A)",
    proces: "monta\u017Ea",
    faza: "kasni",
    hitnost: "hitno",
    start: "2025-08-20",
    end: "2025-08-23",
    plannedEnd: "2025-08-24",
    opis: MOCK_OPIS,
    komentari: ["Provjeriti dimenzije", "Dodan nacrt"],
    prilozi: ["skica.pdf"],
  };
  
  // Ensure task has opis if not provided
  if (!task.opis) {
    task.opis = MOCK_OPIS;
  }

  // Local state for status changes
  const [currentFaza, setCurrentFaza] = useState(task.faza || "u_radu");
  const [currentHitnost, setCurrentHitnost] = useState(task.hitnost || "normalno");
  

  const [expanded, setExpanded] = useState(level >= 2);
  const [dockRight, setDockRight] = useState(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [leftProcess, setLeftProcess] = useState(null);
  const [showSaveGlow, setShowSaveGlow] = useState(false);
  const [smallHeight, setSmallHeight] = useState(300); // Increased default height
  const [hoveringLeft, setHoveringLeft] = useState(false);
  const collapseTO = useRef(null);
  const smallRef = useRef(null);
  // Left tertiary state (selected subprocess)
  const [leftSub, setLeftSub] = useState(null);
  const [leftTab, setLeftTab] = useState("comments");
  // Inline edit opis
  const [editingOpis, setEditingOpis] = useState(false);
  const [opisDraft, setOpisDraft] = useState(task.opis || "");

  // Position data
  const [position, setPosition] = useState(MOCK_POSITION);
  const [currentPieceIdx, setCurrentPieceIdx] = useState(0);
  
  // Update position data when hoverMeta is provided (for Employogram)
  useEffect(() => {
    if (hoverMeta && hoverMeta.position) {
      setPosition(hoverMeta.position);
    }
  }, [hoverMeta]);
  
  // New state for content buttons
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [inputMode, setInputMode] = useState(null);

  // Card dimensions (single source of truth) - optimized for compact date inputs
  const CARD_W = expanded ? 440 : 320;
  const CARD_H = expanded ? 380 : Math.max(smallHeight, 220);

  const delay = task.end && task.plannedEnd ? daysBetween(task.plannedEnd, task.end) : 0;

  const currentPiece = position.pieces[currentPieceIdx] || position.pieces[0];

  // Helpers for left subprocess data buckets
  const procKeyFromId = (id) => (id === "monta\u017Ea" ? "montaza" : id === "op\u0107enito" ? "opcenito" : id);
  const ensureSubBucket = (piece, procId, subId) => {
    const key = procKeyFromId(procId);
    if (!piece[key]) piece[key] = {};
    if (!piece[key][subId]) piece[key][subId] = { status: false, comments: [], documents: [], tasks: [], timestamp: null };
    return piece[key][subId];
  };

  // Helper: handle button click (open panel or toggle input mode)
  function handleButtonClick(which) {
    if (inputMode === which) {
      // Already in input mode for this button - close input mode but keep panel open
      setInputMode(null);
    } else if (dockRight === which) {
      // Panel is already open - switch to input mode
      setInputMode(which);
    } else {
      // Open new panel
      setDockRight(which);
      setInputMode(null);
    }
  }

  // Helper: render a content-control button - shows icon normally, + on hover when content is open
  const renderRightBtn = (which, Icon) => {
    const isHovered = hoveredBtn === which;
    const isActive = dockRight === which;
    const isInInputMode = inputMode === which;
    
    const colors = {
      comments: "#2563eb", // blue
      attachments: "#7c3aed", // violet  
      tasks: "#16a34a", // emerald
      history: "#d97706" // amber
    };
    const color = colors[which];

    const titleBase =
      which === "comments" ? "Komentari" : which === "attachments" ? "Prilozi" : which === "tasks" ? "Zadaci" : "Povijest";
    
    let title = titleBase;
    if (isActive && !isInInputMode) title = `${titleBase} pozicije`;
    if (isHovered && isActive) title = `Dodaj ${titleBase.toLowerCase()}`;
    if (isInInputMode) title = `Unos ${titleBase.toLowerCase()}`;

    // Show + icon when hovered, or when in input mode
    const showPlus = isHovered || isInInputMode;
    const DisplayIcon = showPlus ? Plus : Icon;
    

    return (
      <button
        title={title}
        aria-label={title}
        onClick={() => handleButtonClick(which)}
        onMouseEnter={() => {
          setHoveredBtn(which);
          if (!isActive) {
            setDockRight(which);
            setInputMode(null);
          }
        }}
        onMouseLeave={() => {
          setHoveredBtn(null);
          // Don't auto-close right dock panels when leaving button hover
          // They stay open until user leaves the entire large hover area
        }}
        style={{ 
          background: isHovered ? gradientFor(color) : "transparent",
        }}
        className={`h-10 w-10 rounded-xl flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all duration-200`}
      >
        {DisplayIcon && typeof DisplayIcon === 'function' ? (
          <DisplayIcon 
            className={`w-5 h-5 transition-all duration-200 ${showPlus ? "scale-110" : "scale-100"}`}
            style={{ 
              color: isHovered ? "white" : color,
              strokeWidth: 2
            }}
          />
        ) : (
          <div 
            className={`w-5 h-5 flex items-center justify-center text-sm font-bold transition-all duration-200 ${showPlus ? "scale-110" : "scale-100"}`}
            style={{ color: isHovered ? "white" : color }}
          >
            {showPlus ? "+" : (which === "comments" ? "💬" : which === "attachments" ? "📎" : which === "tasks" ? "✅" : "📋")}
          </div>
        )}
      </button>
    );
  };

  // Right-side buttons (only visible on large hover) - in container like left side
  const RightButtons = (
    <div className="absolute left-full top-0 bottom-0 z-20 pointer-events-auto flex">
      <div 
        className="h-full border border-slate-200 border-l-0 rounded-r-xl overflow-hidden"
        style={{
          background: `
            linear-gradient(45deg, ${STATUSI_FAZA[currentFaza].light} 0%, transparent 50%),
            linear-gradient(-135deg, ${STATUSI_HITNOST[currentHitnost].light} 0%, transparent 50%),
            linear-gradient(-135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)
          `
        }}
      >
        <div className="h-full p-2 flex flex-col items-center justify-start pt-4 gap-2">
          {renderRightBtn("comments", MessageSquare)}
          {renderRightBtn("attachments", Paperclip)}
          {renderRightBtn("tasks", ListTodo)}
          {renderRightBtn("history", History)}
        </div>
      </div>
    </div>
  );

  // Update handler with auto-save glow
  const updateDate = (key, value) => {
    setTask((t) => ({ ...t, [key]: value }));
    triggerSaveGlow();
  };
  
  const triggerSaveGlow = () => {
    setShowSaveGlow(true);
    setTimeout(() => setShowSaveGlow(false), 1500); // Glow for 1.5 seconds
  };

  const saveOpis = () => {
    setTask((t) => ({ ...t, opis: opisDraft }));
    setEditingOpis(false);
    triggerSaveGlow();
  };
  const cancelOpis = () => {
    setEditingOpis(false);
    setOpisDraft(task.opis || "");
  };
  const onOpisKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancelOpis();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveOpis();
    }
  };


  const IconProc = (PROCESI.find((p) => p.id === task.proces) || PROCESI[0]).ikona;

  // Diagnostics / tests (commented out to prevent app crashes)
  /*
  useEffect(() => {
    console.groupCollapsed("Diagnostics");
    console.assert("\u010D\u0161\u017E\u0106\u0160\u017D".length === 6, "Unicode diacritics length check");
    console.assert(toInputDateValue("2025-08-20") === "2025-08-20", "toInputDateValue failed");
    console.assert(daysBetween("2025-08-20", "2025-08-23") === 3, "daysBetween failed");
    console.assert(PROCESI.length >= 3, "PROCESI mapping looks wrong");
    console.assert(STATUSI["u_tijeku"].text === "U tijeku", "STATUSI mapping wrong");
    console.assert(MOCK_OPIS.length > 100, "Opis mock should be long enough");
    console.assert("a\nb\nc".split("\n").length === 3, "Newline split must work");
    // ensure sub-bucket creation works
    (function(){
      const piece = { };
      const key = procKeyFromId('monta\u017Ea');
      console.assert(key === 'montaza', 'procKeyFromId should normalize monta\u017Ea');
      const tmp = { status:false, comments:[], documents:[], tasks:[], timestamp:null };
      const bucket = (function(){ const x = {}; x[key] = { transport: { ...tmp } }; return x[key].transport; })();
      console.assert(bucket && Array.isArray(bucket.comments), 'Left subprocess bucket structure');
    })();
    console.assert((SUBPROCESI['monta\u017Ea'] || []).length >= 8, 'SUBPROCESI monta\u017Ea should contain 8 items');
    console.assert(true, 'JSX structure compiled');
    console.assert(typeof window.setTimeout === 'function', 'setTimeout available');
    console.assert((MOCK_POSITION.pieces || []).length >= 1, 'Position pieces present');
    console.assert(rightScope === 'piece', 'Initial right scope should be piece');
    console.groupEnd();
  }, []);
  */

  // Measure small hover natural height so the whole description fits
  useLayoutEffect(() => {
    const el = smallRef.current;
    if (!el || expanded) return;

    const measure = () => {
      const h = Math.ceil(el.scrollHeight);
      if (h && h !== smallHeight) setSmallHeight(h);
    };

    measure();
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }
    const id = requestAnimationFrame(measure);
    const onLoad = () => measure();
    window.addEventListener("load", onLoad);

    return () => {
      if (ro) ro.disconnect();
      cancelAnimationFrame(id);
      window.removeEventListener("load", onLoad);
    };
  }, [expanded, task.opis, task.komentari?.length, task.prilozi?.length, smallHeight]);

  // Auto-adjust height removed to prevent infinite loops
  // useEffect for height adjustment disabled

  useEffect(() => { if (!expanded && leftOpen) setLeftOpen(false); }, [expanded, leftOpen]);
  useEffect(() => { setLeftOpen(expanded); }, [expanded]);
  
  // Sync expanded state with level prop
  useEffect(() => {
    setExpanded(level >= 2);
  }, [level]);
  
  const positionStyle = task?.position ? {
    left: task.position.x || 0,
    top: task.position.y || 0,
  } : {};

  return (
    <div 
      className="absolute z-20 pointer-events-none" 
      style={positionStyle}
    >
      <div 
        className="pointer-events-auto relative flex items-stretch" 
        style={{ pointerEvents: 'auto' }}
        onMouseEnter={() => {
          // Kad miš uđe u bilo koji dio hover container-a
          if (level === 1 && onExpand) {
            onExpand(); // Proširi u veliki - ovo će obrisati timer u glavnoj komponenti
          }
        }}
        onMouseLeave={() => {
          // Kad miš izađe iz cijelog hover container-a - zatvori sve panele
          setLeftProcess(null);
          setDockRight(null);
          setInputMode(null);
          if (onClose) onClose();
        }}
      >
        {/* Card + overlays wrapper */}
        <div className="relative flex" style={{ height: CARD_H }}>
          <motion.div
            style={{ 
              willChange: "height, width, transform",
              background: `
                linear-gradient(135deg, ${STATUSI_FAZA[currentFaza].light} 0%, transparent 50%),
                linear-gradient(-45deg, ${STATUSI_HITNOST[currentHitnost].light} 0%, transparent 50%),
                white
              `,
              boxShadow: showSaveGlow ? "0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3)" : "none",
              transition: "box-shadow 0.3s ease-in-out"
            }}
            className={`relative rounded-xl border border-slate-200 overflow-hidden text-slate-800 ${expanded ? "rounded-l-none border-l-0 rounded-r-none border-r-0" : ""}`}
            animate={{ width: CARD_W, height: CARD_H }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >

            <div id="small-measure" ref={smallRef}>
              {/* Header */}
              <div className="p-4 pb-2">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {(() => { const Icon = IconProc; return <Icon className="w-4 h-4" style={{ color: (PROCESI.find((p) => p.id === task.proces) || PROCESI[0]).boja }} />; })()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        title={STATUSI_FAZA[currentFaza].text}
                        style={{ backgroundColor: STATUSI_FAZA[currentFaza].bg }}
                      />
                      <h4 className="font-semibold text-sm">{task.naziv}</h4>
                    </div>
                    <p className="text-xs opacity-70">{task.pozicija}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="px-4">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="opacity-70 block">Po\u010Detak</span>
                    {!expanded ? (
                      <p className="font-medium">{toInputDateValue(task.start || new Date())}</p>
                    ) : (
                      <input
                        type="date"
                        value={toInputDateValue(task.start || new Date())}
                        onChange={(e) => updateDate("start", e.target.value)}
                        className="w-20 text-xs rounded border border-slate-300 bg-white px-1 py-0.5"
                      />
                    )}
                  </div>
                  <div>
                    <span className="opacity-70 block">Zavr\u0161etak</span>
                    {!expanded ? (
                      <p className="font-medium">{toInputDateValue(task.end || new Date())}</p>
                    ) : (
                      <input
                        type="date"
                        value={toInputDateValue(task.end || new Date())}
                        onChange={(e) => updateDate("end", e.target.value)}
                        className="w-20 text-xs rounded border border-slate-300 bg-white px-1 py-0.5"
                      />
                    )}
                  </div>
                </div>

                {task.end && task.plannedEnd && (
                  <div className={`mt-3 flex items-center gap-2 p-2 rounded-lg text-xs ${delay > 0 ? "bg-red-50/60" : "bg-emerald-50/60"}`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {delay > 0 ? `Kasni ${delay} dana` : `Prije roka ${Math.abs(delay)} dana`}
                    </span>
                  </div>
                )}

                {/* Counters above description */}
                <div className="mt-3 flex items-center gap-4 text-xs opacity-80">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{task.komentari?.length ?? 0} komentara</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{task.prilozi?.length ?? 0} prilog(a)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>1 zadatak(a)</span>
                  </div>
                </div>

                {/* Status dropdowns - show above description */}
                <div className="mt-3 flex gap-2">
                  {/* Faza dropdown */}
                  <div className="flex-1">
                    {expanded ? (
                      <select
                        value={currentFaza}
                        onChange={(e) => {
                          setCurrentFaza(e.target.value);
                          triggerSaveGlow();
                        }}
                        className="w-full text-xs rounded border border-slate-300 bg-white px-2 py-1"
                        style={{ backgroundColor: STATUSI_FAZA[currentFaza].light }}
                      >
                        {Object.entries(STATUSI_FAZA).map(([key, value]) => (
                          <option key={key} value={key}>{value.text}</option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: STATUSI_FAZA[currentFaza].bg }}
                      >
                        {STATUSI_FAZA[currentFaza].text}
                      </span>
                    )}
                  </div>
                  
                  {/* Hitnost dropdown */}
                  <div className="flex-1">
                    {expanded ? (
                      <select
                        value={currentHitnost}
                        onChange={(e) => {
                          setCurrentHitnost(e.target.value);
                          triggerSaveGlow();
                        }}
                        className="w-full text-xs rounded border border-slate-300 bg-white px-2 py-1"
                        style={{ backgroundColor: STATUSI_HITNOST[currentHitnost].light }}
                      >
                        {Object.entries(STATUSI_HITNOST).map(([key, value]) => (
                          <option key={key} value={key}>{value.text}</option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        className="inline-block px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: STATUSI_HITNOST[currentHitnost].bg }}
                      >
                        {STATUSI_HITNOST[currentHitnost].text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description - always show in both small and large hover */}
                {task.opis && (
                  <div className="mt-3">
                    {expanded && <span className="text-xs opacity-70 block mb-1">Opis</span>}
                    {!editingOpis ? (
                      <p
                        className={`text-xs leading-relaxed text-slate-700 whitespace-pre-wrap ${expanded ? "cursor-text" : ""}`}
                        title={expanded ? "Klikni za ured\u017Eivanje" : undefined}
                        onClick={() => {
                          if (expanded) {
                            setOpisDraft(task.opis || "");
                            setEditingOpis(true);
                          }
                        }}
                      >
                        {task.opis}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={opisDraft}
                          onChange={(e) => setOpisDraft(e.target.value)}
                          onKeyDown={onOpisKeyDown}
                          rows={Math.min(12, Math.max(3, ((opisDraft.match(/\n/g)?.length ?? 0) + 1)))}
                          className="w-full rounded-lg border border-slate-300 bg-white text-xs p-2 leading-relaxed"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={saveOpis} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700">Spremi opis</button>
                          <button onClick={cancelOpis} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs hover:bg-slate-200">Odustani</button>
                        </div>
                        <p className="text-[10px] opacity-60">Pre\u010Daci: Ctrl/Cmd+Enter za spremanje, Esc za odustajanje.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Missing dates warning */}
              {!task.start || !task.end ? (
                <div className="px-4 py-8 text-red-600">
                  <AlertTriangle className="w-6 h-6 mb-2" />
                  <p className="text-sm font-medium">Datumi nisu definirani!</p>
                </div>
              ) : null}
            </div>

          </motion.div>

          {/* Right buttons container – large hover only */}
          {expanded && RightButtons}

          {/* Left docks (primary + secondary + tertiary) — always on large hover */}
          {expanded && (
            <div
              className="absolute right-full top-0 bottom-0 z-20 pointer-events-auto flex"
              style={{
                background: `
                  linear-gradient(225deg, ${STATUSI_FAZA[currentFaza].light} 0%, transparent 50%),
                  linear-gradient(45deg, ${STATUSI_HITNOST[currentHitnost].light} 0%, transparent 50%),
                  linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)
                `,
                borderRadius: '0.75rem 0 0 0.75rem',
                border: '1px solid rgb(226 232 240)',
                borderRight: 'none'
              }}
              onMouseEnter={() => { setHoveringLeft(true); if (collapseTO.current) { clearTimeout(collapseTO.current); collapseTO.current = null; } }}
              onMouseLeave={() => { 
                setHoveringLeft(false); 
                // Don't auto-collapse to small hover when leaving left panels
                // Only collapse when leaving the entire hover system
              }}
            >
              <LeftSecondaryDock
                open={!!leftProcess}
                items={leftProcess ? (SUBPROCESI[leftProcess] || []) : []}
                activeMap={leftProcess === "monta\u017Ea" && currentPiece?.montaza ? Object.fromEntries(Object.entries(currentPiece.montaza).map(([k, v]) => [k, !!v?.status])) : {}}
                onToggle={(subId, next) => {
                  triggerSaveGlow();
                  setPosition((p) => {
                    const base = { ...p, pieces: p.pieces.map((pe, i) => (i === currentPieceIdx ? { ...pe, montaza: { ...(pe.montaza) } } : pe)) };
                    if (leftProcess === "monta\u017Ea") {
                      const m = (base.pieces[currentPieceIdx].montaza) || {};
                      if (!m[subId]) m[subId] = { status: false, comments: [], documents: [], tasks: [], timestamp: null };
                      m[subId] = { ...m[subId], status: next, timestamp: next ? new Date().toISOString() : null };
                      base.pieces[currentPieceIdx].montaza = m;
                    }
                    return base;
                  });
                }}
                onSelect={(id) => { console.log('subprocess selected', leftProcess, id); setLeftSub(id); }}
                onClose={() => setLeftProcess(null)}
                width={220}
                currentFaza={currentFaza}
                currentHitnost={currentHitnost}
              />
              <LeftPrimaryDock
                open={true}
                processes={PROCESI}
                onSelect={(pid) => { setLeftProcess(pid); setLeftSub(null); }}
                onHover={(pid) => { setLeftProcess(pid); }}
                width={56}
                currentFaza={currentFaza}
                currentHitnost={currentHitnost}
              />
              <LeftTertiaryDock
                open={!!(leftProcess && leftSub)}
                title={leftProcess && leftSub ? `${leftProcess} · ${(SUBPROCESI[leftProcess]||[]).find(s=>s.id===leftSub)?.title || leftSub}` : undefined}
                onClose={() => setLeftSub(null)}
                width={300}
                currentFaza={currentFaza}
                currentHitnost={currentHitnost}
              >
                {/* tabs */}
                <div className="flex gap-2 mb-2">
                  {(["comments","documents","tasks"]).map((t) => (
                    <button key={t}
                      onClick={() => setLeftTab(t)}
                      className={`px-2 py-1 rounded-lg border text-xs ${leftTab===t? 'bg-slate-900 text-white border-slate-900':'bg-white border-slate-200 hover:bg-slate-50'}`}
                    >
                      {t === 'comments' ? 'Komentari' : t === 'documents' ? 'Prilozi' : 'Zadaci'}
                    </button>
                  ))}
                </div>
                {/* content list with add-at-bottom pinned */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                    {(() => {
                      if (!leftProcess || !leftSub) return null;
                      const base = currentPiece;
                      const bucket = ensureSubBucket(base, leftProcess, leftSub);
                      if (leftTab === 'comments') {
                        return (bucket.comments).length === 0 ? (
                          <p className="text-xs opacity-70">Nema komentara</p>
                        ) : (
                          (bucket.comments).map((c, i) => (
                            <div key={c.id || i} className="rounded-lg border border-slate-200 p-2 text-xs bg-white">{c.text || String(c)}</div>
                          ))
                        );
                      }
                      if (leftTab === 'documents') {
                        return (bucket.documents).length === 0 ? (
                          <p className="text-xs opacity-70">Nema priloga</p>
                        ) : (
                          (bucket.documents).map((d, i) => (
                            <div key={d.id || i} className="rounded-lg border border-slate-200 p-2 flex items-center gap-2 text-xs bg-white">
                              <FileText className="w-4 h-4 opacity-70" />
                              <span className="truncate">{d.name || String(d)}</span>
                            </div>
                          ))
                        );
                      }
                      // tasks
                      return (bucket.tasks).length === 0 ? (
                        <p className="text-xs opacity-70">Nema zadataka</p>
                      ) : (
                        (bucket.tasks).map((t, i) => (
                          <label key={t.id || i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm bg-white">
                            <input type="checkbox" defaultChecked={!!t.done} onChange={(e) => {
                              setPosition((p) => {
                                const clone = { ...p, pieces: p.pieces.map((pe) => ({ ...pe })) };
                                const piece = clone.pieces[currentPieceIdx];
                                const b = ensureSubBucket(piece, leftProcess, leftSub);
                                b.tasks = (b.tasks || []).map((x, idx) => idx===i ? { ...x, done: e.currentTarget.checked } : x);
                                return clone;
                              });
                              triggerSaveGlow();
                            }} />
                            <span className={t.done ? 'line-through opacity-60' : ''}>{t.title || String(t)}</span>
                          </label>
                        ))
                      );
                    })()}
                  </div>
                  {/* add bar pinned to bottom */}
                  <div className="pt-2 mt-2 border-t">
                    {leftTab === 'comments' && (
                      <button
                        onClick={() => {
                          const text = prompt('Unesi komentar');
                          if (!text) return;
                          setPosition((p) => {
                            const clone = { ...p, pieces: p.pieces.map((pe) => ({ ...pe })) };
                            const piece = clone.pieces[currentPieceIdx];
                            const b = ensureSubBucket(piece, leftProcess, leftSub);
                            b.comments = [...(b.comments||[]), { id: `c-${Date.now()}`, text }];
                            return clone;
                          });
                          triggerSaveGlow();
                        }}
                        className="w-full rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-sm py-2"
                      >
                        Dodaj komentar
                      </button>
                    )}
                    {leftTab === 'documents' && (
                      <button
                        onClick={() => {
                          const name = prompt('Naziv dokumenta');
                          if (!name) return;
                          setPosition((p) => {
                            const clone = { ...p, pieces: p.pieces.map((pe) => ({ ...pe })) };
                            const piece = clone.pieces[currentPieceIdx];
                            const b = ensureSubBucket(piece, leftProcess, leftSub);
                            b.documents = [...(b.documents||[]), { id: `d-${Date.now()}`, name }];
                            return clone;
                          });
                          triggerSaveGlow();
                        }}
                        className="w-full rounded-lg border border-violet-300 bg-violet-50 hover:bg-violet-100 text-sm py-2"
                      >
                        Dodaj prilog
                      </button>
                    )}
                    {leftTab === 'tasks' && (
                      <button
                        onClick={() => {
                          const title = prompt('Naziv zadatka');
                          if (!title) return;
                          setPosition((p) => {
                            const clone = { ...p, pieces: p.pieces.map((pe) => ({ ...pe })) };
                            const piece = clone.pieces[currentPieceIdx];
                            const b = ensureSubBucket(piece, leftProcess, leftSub);
                            b.tasks = [...(b.tasks||[]), { id: `t-${Date.now()}`, title }];
                            return clone;
                          });
                          triggerSaveGlow();
                        }}
                        className="w-full rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-sm py-2"
                      >
                        Dodaj zadatak
                      </button>
                    )}
                  </div>
                </div>
              </LeftTertiaryDock>
            </div>
          )}

          {/* Right docks overlay – positioned after right buttons container */}
          <div 
            className="absolute z-20 pointer-events-auto flex"
            style={{ left: expanded ? (CARD_W + 56) : 'calc(100% + 56px)', top: 0, bottom: 0 }}
          >
            <RightDock 
              open={dockRight === "comments"} 
              onClose={() => { setDockRight(null); setInputMode(null); }} 
              scopeLabel={`Pozicija ${position.id}`}
            >
              <CommentsPanel
                items={position.processData.comments}
                inputMode={inputMode === "comments"}
                onAdd={(text) => {
                  triggerSaveGlow();
                  setPosition((p) => {
                    const base = { ...p, processData: { ...p.processData, comments: [...p.processData.comments, { id: `c-${Date.now()}`, text }] }};
                    return base;
                  });
                  setInputMode(null);
                }}
                onCancel={() => setInputMode(null)}
              />
            </RightDock>
            <RightDock 
              open={dockRight === "attachments"} 
              onClose={() => { setDockRight(null); setInputMode(null); }} 
              scopeLabel={`Pozicija ${position.id}`}
            >
              <AttachmentsPanel
                docs={position.processData.documents}
                inputMode={inputMode === "attachments"}
                onAddDoc={(doc) => {
                  triggerSaveGlow();
                  setPosition((p) => {
                    const base = { ...p, processData: { ...p.processData, documents: [...p.processData.documents, { id: `d-${Date.now()}`, name: doc.name }] }};
                    return base;
                  });
                  setInputMode(null);
                }}
                onCancel={() => setInputMode(null)}
              />
            </RightDock>
            <RightDock 
              open={dockRight === "tasks"} 
              onClose={() => { setDockRight(null); setInputMode(null); }} 
              scopeLabel={`Pozicija ${position.id}`}
            >
              <TasksPanel
                items={position.processData.tasks}
                inputMode={inputMode === "tasks"}
                onAdd={(taskData) => {
                  triggerSaveGlow();
                  setPosition((p) => {
                    const base = { ...p, processData: { ...p.processData, tasks: [...p.processData.tasks, { id: `t-${Date.now()}`, ...taskData }] }};
                    return base;
                  });
                  setInputMode(null);
                }}
                onCancel={() => setInputMode(null)}
              />
            </RightDock>
            <RightDock 
              open={dockRight === "history"} 
              onClose={() => { setDockRight(null); setInputMode(null); }} 
              scopeLabel={`Pozicija ${position.id}`}
            >
              <HistoryPanel />
            </RightDock>
          </div>
        </div>
      </div>
    </div>
  );
}