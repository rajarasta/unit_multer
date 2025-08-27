import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Download, Camera, ChevronDown, X, Plus, Edit3, Save, Trash2,
  MessageSquare, Paperclip, ListTodo, History, FileText, ExternalLink,
  AlertTriangle, AlertCircle, Settings, Maximize2, Minimize2,
  FileUp, CheckCircle2, Clock, Filter, Grid, Layers,
  ListChecks, ClipboardCheck, Truck, Hammer, PanelsTopLeft,
  Droplets, Puzzle, Ban, AlertOctagon
} from 'lucide-react';

// =============== KONSTANTE I HELPERI ===============
export const STATUSI = {
  "čeka": { text: "Čeka", bg: "#64748b", light: "#e2e8f0" },
  u_tijeku: { text: "U tijeku", bg: "#2563eb", light: "#dbeafe" },
  kasni: { text: "Kasni", bg: "#dc2626", light: "#fee2e2" },
  "završeno": { text: "Završeno", bg: "#16a34a", light: "#dcfce7" },
};

export const PROCESI = [
  { id: "općenito", boja: "#764ba2", ikona: Settings },
  { id: "montaža", boja: "#2563eb", ikona: ListChecks },
  { id: "kontrola", boja: "#16a34a", ikona: ClipboardCheck },
];

const SUBPROCESI = {
  "montaža": [
    { id: "transport", title: "Transport", icon: Truck },
    { id: "ugradnja", title: "Ugradnja", icon: Hammer },
    { id: "stakljenje", title: "Stakljenje", icon: PanelsTopLeft },
    { id: "brtvljenje", title: "Brtvljenje", icon: Droplets },
    { id: "dodaci", title: "Dodaci", icon: Puzzle },
    { id: "zavrseno", title: "Završeno", icon: CheckCircle2 },
    { id: "reklamacija", title: "Reklamacija", icon: AlertOctagon },
    { id: "blokirano", title: "Blokirano", icon: Ban },
  ],
  kontrola: [
    { id: "ulazna", title: "Ulazna kontrola", icon: ClipboardCheck },
    { id: "izlazna", title: "Izlazna kontrola", icon: ClipboardCheck },
  ],
  "općenito": [{ id: "info", title: "Opće informacije", icon: Settings }],
};

// Paper formats
const PAPER_FORMATS = {
  'A2': { width: 1587, height: 2245, name: 'A2 (420×594mm)' },
  'A3': { width: 1123, height: 1587, name: 'A3 (297×420mm)' },
  'A4': { width: 794, height: 1123, name: 'A4 (210×297mm)' },
  'A5': { width: 559, height: 794, name: 'A5 (148×210mm)' }
};

// Helper functions
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

function gradientFor(hex) {
  return `linear-gradient(135deg, ${lighten(hex, 0.18)} 0%, ${hex} 100%)`;
}

// =============== DOCK KOMPONENTE ===============
function RightDock({ open, width = 340, children, onClose, scopeLabel }) {
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

function LeftPrimaryDock({ open, width = 56, processes, onSelect, onHover }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layout
          initial={{ width: 0 }}
          animate={{ width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="h-full border-r border-slate-200 rounded-l-xl overflow-hidden bg-white"
        >
          <div className="h-full p-2 flex flex-col items-center">
            <div className="flex flex-col gap-2 mt-1">
              {processes.map((p) => {
                const Icon = p.ikona;
                return (
                  <button
                    key={p.id}
                    title={p.id}
                    onMouseEnter={() => onHover && onHover(p.id)}
                    onClick={() => onSelect(p.id)}
                    style={{ background: gradientFor(p.boja) }}
                    className="h-10 w-10 rounded-xl text-white ring-1 ring-black/5 shadow-sm flex items-center justify-center hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/40"
                  >
                    <Icon className="w-5 h-5" />
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

function LeftSecondaryDock({ open, width = 220, items, activeMap, onToggle, onSelect, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layout
          initial={{ width: 0 }}
          animate={{ width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="h-full border-r border-slate-200 rounded-l-xl overflow-hidden bg-white"
        >
          <div className="h-full p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-70">Podprocesi</span>
              <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
              {items.map((it) => {
                const Icon = it.icon;
                const done = !!(activeMap && activeMap[it.id]);
                return (
                  <button
                    key={it.id}
                    onClick={() => { onToggle ? onToggle(it.id, !done) : onSelect(it.id); }}
                    className={`w-full text-left flex items-center gap-2 rounded-lg border p-2 text-xs ${
                      done ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:bg-slate-50"
                    }`}
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

function LeftTertiaryDock({ open, width = 300, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          layout
          initial={{ width: 0 }}
          animate={{ width }}
          exit={{ width: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="h-full border-r border-slate-200 rounded-l-xl overflow-hidden bg-white"
        >
          <div className="h-full p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium opacity-70 truncate max-w-[70%]">
                {title || "Podaci"}
              </span>
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

// =============== PANEL KOMPONENTE ===============
function AttachmentsPanel({ docs = [], onAddDoc }) {
  const displayDocs = docs || [];
  return (
    <div className="space-y-3 h-full min-h-0 flex flex-col">
      {displayDocs.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {displayDocs.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 p-2 flex items-center gap-2 text-xs bg-white">
              <FileText className="w-4 h-4 opacity-70" />
              <span className="truncate">{d.name}</span>
              <button className="ml-auto p-1 rounded hover:bg-slate-100">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        className="rounded-xl border border-dashed border-slate-300 p-4 text-center cursor-pointer hover:border-slate-400"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files);
          if (onAddDoc && dropped[0]) {
            onAddDoc({ id: `doc-${Date.now()}`, name: dropped[0].name });
          }
        }}
      >
        <Upload className="w-7 h-7 mx-auto mb-2 opacity-70" />
        <p className="text-xs opacity-80">Povuci datoteke ovdje ili klikni</p>
      </div>
    </div>
  );
}

function CommentsPanel({ items = [], onAdd }) {
  const [stage, setStage] = useState("list");
  const [txt, setTxt] = useState("");
  const display = items.map((i) => i.text || i);

  return stage === "list" ? (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {display.length === 0 && <p className="text-xs opacity-70">Nema komentara</p>}
        {display.map((c, i) => (
          <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs bg-white">
            {c}
          </div>
        ))}
      </div>
      <button
        onClick={() => setStage("compose")}
        className="mt-3 w-full rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-sm py-2"
      >
        Dodaj komentar
      </button>
    </div>
  ) : (
    <div className="space-y-2">
      <textarea
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-slate-300 bg-white text-sm p-2"
        placeholder="Upiši komentar..."
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!txt.trim()) return;
            if (onAdd) onAdd(txt.trim());
            setTxt("");
            setStage("list");
          }}
          className="flex-1 rounded-lg bg-blue-600 text-white text-sm py-2 hover:bg-blue-700"
        >
          Spremi
        </button>
        <button onClick={() => setStage("list")} className="rounded-lg bg-slate-100 hover:bg-slate-200 text-sm py-2 px-3">
          Odustani
        </button>
      </div>
    </div>
  );
}

function TasksPanel({ items = [], onAdd }) {
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState("");

  if (!adding) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {items.map((t) => (
            <label key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm bg-white">
              <input type="checkbox" defaultChecked={!!t.done} />
              <span className={t.done ? "line-through opacity-50" : ""}>{t.title}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() => setAdding(true)}
          className="mt-3 w-full rounded-lg border border-emerald-300/60 bg-emerald-50/30 hover:bg-emerald-50/60 text-sm py-2"
        >
          Dodaj zadatak
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        placeholder="Naziv zadatka..."
        className="w-full rounded-lg border border-slate-300 bg-white text-sm p-2"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!txt.trim()) return;
            if (onAdd) onAdd(txt.trim());
            setTxt("");
            setAdding(false);
          }}
          className="flex-1 rounded-lg bg-emerald-600 text-white text-sm py-2 hover:bg-emerald-700"
        >
          Spremi
        </button>
        <button onClick={() => setAdding(false)} className="rounded-lg bg-slate-100 hover:bg-slate-200 text-sm py-2 px-3">
          Odustani
        </button>
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

// =============== NAPREDNI HOVER CARD ===============
export function AdvancedTaskHoverCard({ 
  task, 
  position, 
  level,
  isExpanded,
  onClose,
  onEdit,
  onExpand,
  onHoverEnter,
  onHoverLeave,
  onUpdateTask,
  onAddEvent,
  projectService,
  projectId
}) {
  const [dockRight, setDockRight] = useState(null);
  const [leftProcess, setLeftProcess] = useState(null);
  const [leftSub, setLeftSub] = useState(null);
  const [leftTab, setLeftTab] = useState("comments");
  const [dirty, setDirty] = useState(false);
  const [smallHeight, setSmallHeight] = useState(220);
  const [hoveringLeft, setHoveringLeft] = useState(false);
  const [editingOpis, setEditingOpis] = useState(false);
  const [opisDraft, setOpisDraft] = useState(task.opis || "");
  const [rightScope, setRightScope] = useState("piece");
  const [currentPieceIdx, setCurrentPieceIdx] = useState(0);
  const [localTask, setLocalTask] = useState(task);
  
  const collapseTO = useRef(null);
  const smallRef = useRef(null);

  // Računaj veličinu prema hover level-u
  const getCardSize = () => {
    if (level === 1) return { width: 280, height: Math.max(smallHeight, 180) }; // Mali hover
    if (level === 2) return { width: 360, height: Math.max(smallHeight, 240) }; // Srednji hover
    if (level >= 3 || isExpanded) return { width: 480, height: 380 }; // Veliki hover
    return { width: 320, height: Math.max(smallHeight, 220) }; // Fallback
  };
  
  const { width: CARD_W, height: CARD_H } = getCardSize();


  const delay = localTask.end && localTask.plannedEnd ? daysBetween(localTask.plannedEnd, localTask.end) : 0;
  const currentPiece = localTask.pieces?.[currentPieceIdx] || { pieceNumber: 1, processData: { comments: [], documents: [], tasks: [] } };

  // Helper functions
  const procKeyFromId = (id) => (id === "montaža" ? "montaza" : id === "općenito" ? "opcenito" : id);
  
  const ensureSubBucket = (piece, procId, subId) => {
    const key = procKeyFromId(procId);
    if (!piece[key]) piece[key] = {};
    if (!piece[key][subId]) {
      piece[key][subId] = { status: false, comments: [], documents: [], tasks: [], timestamp: null };
    }
    return piece[key][subId];
  };

  function openOrCycle(which) {
    setDockRight((prev) => {
      if (prev === which) {
        if (rightScope === "piece") {
          setRightScope("position");
          return which;
        }
        setRightScope("piece");
        return null;
      }
      setRightScope("piece");
      return which;
    });
  }

  const renderRightBtn = (which, Icon, activeRing) => {
    const isActive = dockRight === which;
    const colorName = which === "comments" ? "blue" : which === "attachments" ? "violet" : which === "tasks" ? "emerald" : "amber";
    
    const btnColorClass = !isActive
      ? "bg-white text-slate-700 border-slate-200/70 hover:bg-slate-50"
      : rightScope === "piece"
      ? `bg-${colorName}-600 text-white border-${colorName}-600 hover:bg-${colorName}-600/90`
      : `bg-${colorName}-50 text-${colorName}-700 border-${colorName}-300 hover:bg-${colorName}-100`;

    const fillClass = isActive
      ? (which === "comments" ? "bg-blue-500" : which === "attachments" ? "bg-violet-500" : which === "tasks" ? "bg-emerald-500" : "bg-amber-500")
      : "bg-slate-300/70";

    const s1 = isActive && rightScope === "piece";
    const s2 = isActive && rightScope === "position";
    const ring = isActive ? activeRing : "";

    const titleBase = which === "comments" ? "Komentari" : which === "attachments" ? "Prilozi" : which === "tasks" ? "Zadaci" : "Povijest";
    const title = isActive ? `${titleBase} – ${rightScope === "piece" ? "Komad" : "Pozicija"}` : titleBase;

    return (
      <div className="relative">
        <button
          title={title}
          onClick={() => openOrCycle(which)}
          className={`p-2 rounded-lg border shadow-sm ${btnColorClass} ${ring}`}
        >
          <Icon className="w-4 h-4" />
        </button>
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-slate-300/70 rounded-full overflow-hidden pointer-events-none">
          <div className={`h-full ${fillClass} transition-all duration-200`} style={{ width: s1 ? "50%" : s2 ? "100%" : "0%" }} />
        </div>
      </div>
    );
  };

  const updateDate = (key, value) => {
    setLocalTask((t) => ({ ...t, [key]: value }));
    setDirty(true);
  };

  const saveOpis = () => {
    setLocalTask((t) => ({ ...t, opis: opisDraft }));
    setDirty(true);
    setEditingOpis(false);
  };

  const IconProc = (PROCESI.find((p) => p.id === localTask.proces) || PROCESI[0]).ikona;

  // Measure small hover height
  useLayoutEffect(() => {
    const el = smallRef.current;
    if (!el || isExpanded) return;

    const measure = () => {
      const h = Math.ceil(el.scrollHeight);
      if (h && h !== smallHeight) setSmallHeight(h);
    };

    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [isExpanded, localTask.opis, smallHeight]);

  return (
    <motion.div
      className="fixed z-[60] pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)'
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25 }}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <div className="relative flex items-stretch">
        {/* Left expansion panel - kada se klikne proces */}
        {(level >= 3 || isExpanded) && leftProcess && (
          <motion.div 
            className="absolute right-full top-0 bottom-0 z-40 pointer-events-auto"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="h-full w-full bg-white/95 backdrop-blur-sm border border-slate-200/50 rounded-l-xl shadow-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium capitalize">{leftProcess}</span>
                <button 
                  onClick={() => setLeftProcess(null)}
                  className="p-1 rounded hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Subprocess buttons */}
              <div className="space-y-2 mb-4">
                {(SUBPROCESI[leftProcess] || []).map((sub) => {
                  const Icon = sub.icon;
                  const isActive = leftSub === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setLeftSub(isActive ? null : sub.id)}
                      className={`w-full text-left flex items-center gap-3 p-2 rounded-lg transition-all ${
                        isActive ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-slate-200'
                      } border text-sm`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-600'}`} />
                      <span className={isActive ? 'text-blue-700 font-medium' : 'text-slate-700'}>
                        {sub.title}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {/* Content based on selected subprocess */}
              {leftSub && (
                <div className="border-t pt-3">
                  <h4 className="text-xs font-medium text-slate-600 mb-2">
                    {(SUBPROCESI[leftProcess] || []).find(s => s.id === leftSub)?.title}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-slate-600">Podaci za {leftSub} u razvoju...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {/* Old Left docks - keeping for future use */}
        {false && (level >= 3 || isExpanded) && (
          <div className="absolute right-full top-0 bottom-0 z-20 pointer-events-auto flex"
               onMouseEnter={() => setHoveringLeft(true)}
               onMouseLeave={() => { setHoveringLeft(false); setLeftProcess(null); }}>
            <LeftTertiaryDock
              open={!!(leftProcess && leftSub)}
              title={leftProcess && leftSub ? `${leftProcess} · ${(SUBPROCESI[leftProcess]||[]).find(s=>s.id===leftSub)?.title || leftSub}` : undefined}
              onClose={() => setLeftSub(null)}
              width={300}
            >
              <div className="flex gap-2 mb-2">
                {["comments","documents","tasks"].map((t) => (
                  <button key={t}
                    onClick={() => setLeftTab(t)}
                    className={`px-2 py-1 rounded-lg border text-xs ${leftTab===t? 'bg-slate-900 text-white':'bg-white border-slate-200 hover:bg-slate-50'}`}
                  >
                    {t === 'comments' ? 'Komentari' : t === 'documents' ? 'Prilozi' : 'Zadaci'}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {leftTab === 'comments' && (
                    <>
                      {(localTask.komentari || []).map((comment, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs bg-white">
                          {comment}
                        </div>
                      ))}
                      {(localTask.komentari || []).length === 0 && (
                        <p className="text-xs opacity-70">Nema komentara</p>
                      )}
                    </>
                  )}
                  {leftTab === 'documents' && (
                    <>
                      {(localTask.prilozi || []).map((doc, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs bg-white flex items-center gap-2">
                          <FileText className="w-4 h-4 opacity-70" />
                          <span className="truncate">{doc}</span>
                        </div>
                      ))}
                      {(localTask.prilozi || []).length === 0 && (
                        <p className="text-xs opacity-70">Nema priloga</p>
                      )}
                    </>
                  )}
                  {leftTab === 'tasks' && (
                    <>
                      {(localTask.subtasks || []).map((task, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 p-2 text-xs bg-white flex items-center gap-2">
                          <input type="checkbox" checked={task.done} readOnly />
                          <span className={task.done ? "line-through opacity-50" : ""}>{task.title}</span>
                        </div>
                      ))}
                      {(localTask.subtasks || []).length === 0 && (
                        <p className="text-xs opacity-70">Nema zadataka</p>
                      )}
                    </>
                  )}
                </div>
                <div className="pt-2 mt-2 border-t">
                  <button 
                    onClick={() => {
                      // Implementacija dodavanja ovisno o leftTab
                      if (leftTab === 'comments') {
                        const text = prompt('Dodaj komentar:');
                        if (text) {
                          const newComments = [...(localTask.komentari || []), text];
                          setLocalTask(prev => ({...prev, komentari: newComments}));
                          setDirty(true);
                        }
                      } else if (leftTab === 'documents') {
                        const name = prompt('Naziv dokumenta:');
                        if (name) {
                          const newDocs = [...(localTask.prilozi || []), name];
                          setLocalTask(prev => ({...prev, prilozi: newDocs}));
                          setDirty(true);
                        }
                      } else if (leftTab === 'tasks') {
                        const title = prompt('Naziv zadatka:');
                        if (title) {
                          const newTask = {id: `st${Date.now()}`, title, done: false};
                          const newSubtasks = [...(localTask.subtasks || []), newTask];
                          setLocalTask(prev => ({...prev, subtasks: newSubtasks}));
                          setDirty(true);
                        }
                      }
                    }}
                    className="w-full rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-sm py-2"
                  >
                    Dodaj {leftTab === 'comments' ? 'komentar' : leftTab === 'documents' ? 'prilog' : 'zadatak'}
                  </button>
                </div>
              </div>
            </LeftTertiaryDock>
            <LeftSecondaryDock
              open={!!leftProcess}
              items={leftProcess ? (SUBPROCESI[leftProcess] || []) : []}
              onSelect={(id) => setLeftSub(id)}
              onClose={() => setLeftProcess(null)}
              width={220}
            />
            <LeftPrimaryDock
              open={true}
              processes={PROCESI}
              onSelect={(pid) => { setLeftProcess(pid); setLeftSub(null); }}
              onHover={(pid) => setLeftProcess(pid)}
              width={56}
            />
          </div>
        )}

        {/* Main card */}
        <div className="relative" style={{ height: CARD_H }}>
          <motion.div
            className={`relative rounded-xl border border-slate-200 overflow-hidden bg-white text-slate-800 ${
              isExpanded ? "rounded-l-none border-l-0" : ""
            } ${dockRight ? "rounded-r-none border-r-0" : ""}`}
            animate={{ width: CARD_W, height: CARD_H }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {/* 4 sadržajne tipke DESNO iznad hover-a - s 3 stanja */}
            {(level >= 3 || isExpanded) && (
              <div className="absolute -top-12 right-4 flex flex-row gap-2 z-50 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-slate-200/50">
                {renderRightBtn("comments", MessageSquare, "ring-2 ring-blue-400")}
                {renderRightBtn("attachments", Paperclip, "ring-2 ring-violet-400")}
                {renderRightBtn("tasks", ListTodo, "ring-2 ring-emerald-400")}
                {renderRightBtn("history", History, "ring-2 ring-amber-400")}
              </div>
            )}


            <div ref={smallRef}>
              {/* Header */}
              <div className="p-4 pb-2">
                <div className="flex items-start gap-2">
                  {/* Mini ladica s 3 tipke LIJEVO unutar hover-a */}
                  {(level >= 3 || isExpanded) && (
                    <div className="flex flex-col gap-1 mr-2">
                      {PROCESI.map((proces) => {
                        const Icon = proces.ikona;
                        const isActive = leftProcess === proces.id;
                        return (
                          <button
                            key={proces.id}
                            title={proces.id}
                            onClick={() => {
                              setLeftProcess(isActive ? null : proces.id);
                              setLeftSub(null);
                            }}
                            style={{ 
                              background: isActive ? gradientFor(proces.boja) : 'transparent',
                              color: isActive ? 'white' : proces.boja
                            }}
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-all text-xs border border-slate-200"
                          >
                            <Icon className="w-3 h-3" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-0.5">
                    <IconProc className="w-4 h-4" style={{ color: (PROCESI.find((p) => p.id === localTask.proces) || PROCESI[0]).boja }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: STATUSI[localTask.status]?.bg }}
                      />
                      <h4 className="font-semibold text-sm">{localTask.naziv}</h4>
                    </div>
                    <p className="text-xs opacity-70">{localTask.pozicija}</p>
                  </div>
                  {level === 1 && (
                    <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="px-4">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="opacity-70 block">Početak</span>
                    {(level >= 3 || isExpanded) ? (
                      <input
                        type="date"
                        value={toInputDateValue(localTask.start || new Date())}
                        onChange={(e) => updateDate("start", e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-300 bg-white px-2 py-1"
                      />
                    ) : (
                      <p className="font-medium">{toInputDateValue(localTask.start || new Date())}</p>
                    )}
                  </div>
                  <div>
                    <span className="opacity-70 block">Završetak</span>
                    {(level >= 3 || isExpanded) ? (
                      <input
                        type="date"
                        value={toInputDateValue(localTask.end || new Date())}
                        onChange={(e) => updateDate("end", e.target.value)}
                        className="w-full text-sm rounded-lg border border-slate-300 bg-white px-2 py-1"
                      />
                    ) : (
                      <p className="font-medium">{toInputDateValue(localTask.end || new Date())}</p>
                    )}
                  </div>
                </div>

                {delay !== 0 && (
                  <div className={`mt-3 flex items-center gap-2 p-2 rounded-lg text-xs ${
                    delay > 0 ? "bg-red-50/60" : "bg-emerald-50/60"
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      {delay > 0 ? `Kasni ${delay} dana` : `Prije roka ${Math.abs(delay)} dana`}
                    </span>
                  </div>
                )}

                {/* Counters */}
                <div className="mt-3 flex items-center gap-4 text-xs opacity-80">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{localTask.komentari?.length || 0} komentara</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{localTask.prilozi?.length || 0} priloga</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>{localTask.komadi?.length || 0} komada</span>
                  </div>
                </div>

                {/* Description */}
                {localTask.opis && (
                  <div className="mt-3">
                    <span className="text-xs opacity-70 block mb-1">Opis</span>
                    {!editingOpis ? (
                      <p
                        className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap cursor-text"
                        onClick={() => (level >= 3 || isExpanded) && setEditingOpis(true)}
                      >
                        {localTask.opis}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={opisDraft}
                          onChange={(e) => setOpisDraft(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-slate-300 bg-white text-xs p-2"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={saveOpis} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs">
                            Spremi
                          </button>
                          <button onClick={() => setEditingOpis(false)} className="px-3 py-1.5 rounded-lg bg-slate-100 text-xs">
                            Odustani
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Save bar */}
            <AnimatePresence>
              {dirty && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 52, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="absolute left-0 right-0 bottom-0"
                >
                  <div className="m-2 rounded-xl bg-emerald-600 text-white text-sm flex items-center justify-between px-4 h-full shadow">
                    <span>Spremi promjene</span>
                    <button 
                      onClick={() => {
                        if (onUpdateTask) {
                          onUpdateTask(localTask.id, localTask);
                        }
                        setDirty(false);
                        if (onAddEvent) {
                          onAddEvent({ 
                            id: `e${Date.now()}`, 
                            date: new Date().toISOString().split('T')[0], 
                            type: 'promjena', 
                            naslov: `Task ažuriran`, 
                            opis: `${localTask.naziv} - ${localTask.pozicija}` 
                          });
                        }
                      }} 
                      className="px-3 py-1 rounded-lg bg-white text-emerald-700"
                    >
                      Spremi
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Right docks */}
        <div className="absolute left-full top-0 bottom-0 z-20 pointer-events-auto flex">
          <RightDock open={dockRight === "comments"} onClose={() => setDockRight(null)} 
                     scopeLabel={rightScope === "piece" ? `Komad #${currentPiece.pieceNumber}` : `Pozicija ${localTask.pozicija}`}>
            <CommentsPanel 
              items={localTask.komentari?.map(k => ({text: k})) || []} 
              onAdd={(text) => {
                const newComments = [...(localTask.komentari || []), text];
                setLocalTask(prev => ({...prev, komentari: newComments}));
                setDirty(true);
              }}
            />
          </RightDock>
          <RightDock open={dockRight === "attachments"} onClose={() => setDockRight(null)}
                     scopeLabel={rightScope === "piece" ? `Komad #${currentPiece.pieceNumber}` : `Pozicija ${localTask.pozicija}`}>
            <AttachmentsPanel 
              docs={localTask.prilozi?.map(p => ({id: p, name: p})) || []} 
              onAddDoc={(doc) => {
                const newPrilozi = [...(localTask.prilozi || []), doc.name];
                setLocalTask(prev => ({...prev, prilozi: newPrilozi}));
                setDirty(true);
              }}
            />
          </RightDock>
          <RightDock open={dockRight === "tasks"} onClose={() => setDockRight(null)}
                     scopeLabel={rightScope === "piece" ? `Komad #${currentPiece.pieceNumber}` : `Pozicija ${localTask.pozicija}`}>
            <TasksPanel 
              items={localTask.subtasks?.map(s => ({id: s.id, title: s.title, done: s.done})) || []} 
              onAdd={(title) => {
                const newTask = {id: `st${Date.now()}`, title, done: false};
                const newSubtasks = [...(localTask.subtasks || []), newTask];
                setLocalTask(prev => ({...prev, subtasks: newSubtasks}));
                setDirty(true);
              }}
            />
          </RightDock>
          <RightDock open={dockRight === "history"} onClose={() => setDockRight(null)}
                     scopeLabel={rightScope === "piece" ? `Komad #${currentPiece.pieceNumber}` : `Pozicija ${localTask.pozicija}`}>
            <HistoryPanel />
          </RightDock>
        </div>
      </div>
    </motion.div>
  );
}

// =============== POSITION MARKER ===============
function PositionMarker({ position, isActive, onClick, onDragEnd, zoomLevel }) {
  const [isDragging, setIsDragging] = useState(false);
  const markerRef = useRef(null);
  
  // Definicije boja za svaki podproces
  const SUBPROCESS_COLORS = {
    transport: '#3B82F6',    // blue
    ugradnja: '#8B5CF6',     // violet
    stakljenje: '#06B6D4',   // cyan
    brtvljenje: '#10B981',   // emerald
    dodaci: '#F59E0B',       // amber
    zavrseno: '#16A34A',     // green
    reklamacija: '#DC2626',  // red
    blokirano: '#6B7280'     // gray
  };

  // Računaj status montaže
  const getMontazaStatus = () => {
    const subprocesses = ['transport', 'ugradnja', 'stakljenje', 'brtvljenje', 'dodaci', 'zavrseno'];
    const status = {
      completed: [],
      hasReklamacija: false,
      hasBlokirano: false
    };

    // Ako pozicija ima montažne podatke
    if (position.montazaStatus) {
      subprocesses.forEach(sub => {
        if (position.montazaStatus[sub]) {
          status.completed.push(sub);
        }
      });
      status.hasReklamacija = position.montazaStatus.reklamacija || false;
      status.hasBlokirano = position.montazaStatus.blokirano || false;
    }

    return status;
  };

  const montazaStatus = getMontazaStatus();
  const hasProblems = montazaStatus.hasReklamacija || montazaStatus.hasBlokirano;
  
  // Računaj segmente za SVG
  const createSegments = () => {
    const subprocesses = ['transport', 'ugradnja', 'stakljenje', 'brtvljenje', 'dodaci', 'zavrseno'];
    const segmentAngle = 360 / subprocesses.length;
    const radius = 28;
    const centerX = 40;
    const centerY = 40;
    
    return subprocesses.map((subprocess, index) => {
      const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
      const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
      
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      
      const largeArcFlag = segmentAngle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      const isCompleted = montazaStatus.completed.includes(subprocess);
      
      return {
        subprocess,
        pathData,
        color: isCompleted ? SUBPROCESS_COLORS[subprocess] : 'transparent',
        opacity: isCompleted ? 1 : 0.1
      };
    });
  };

  const segments = createSegments();

  const handleDragStart = (e) => {
    setIsDragging(true);
    const rect = markerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    const handleDragMove = (e) => {
      if (!markerRef.current) return;
      markerRef.current.style.position = 'fixed';
      markerRef.current.style.left = `${e.clientX - offsetX}px`;
      markerRef.current.style.top = `${e.clientY - offsetY}px`;
      markerRef.current.style.zIndex = '9999';
    };
    
    const handleDragEnd = (e) => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      
      const container = markerRef.current.parentElement.getBoundingClientRect();
      const newX = ((e.clientX - container.left) / container.width) * 100;
      const newY = ((e.clientY - container.top) / container.height) * 100;
      
      onDragEnd(position.id, { x: newX, y: newY });
      
      markerRef.current.style.position = 'absolute';
      markerRef.current.style.left = `${newX}%`;
      markerRef.current.style.top = `${newY}%`;
      markerRef.current.style.zIndex = '';
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };

  // Boja glowa ovisno o problemu
  const glowColor = montazaStatus.hasReklamacija ? '#DC2626' : montazaStatus.hasBlokirano ? '#6B7280' : 'transparent';

  return (
    <motion.div
      ref={markerRef}
      className={`absolute cursor-pointer ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, -50%) scale(${1 / zoomLevel})`,
        zIndex: isActive ? 40 : 30
      }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 / zoomLevel }}
      whileHover={{ scale: 1.2 / zoomLevel }}
      onClick={onClick}
      onMouseDown={handleDragStart}
    >
      {/* Ambient glow za probleme */}
      {hasProblems && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            width: '80px',
            height: '80px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
            filter: 'blur(8px)'
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* SVG sa segmentima montaže */}
      <svg className="absolute -inset-5 w-20 h-20" viewBox="0 0 80 80">
        {/* Pozadinski krug */}
        <circle cx="40" cy="40" r="28" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
        
        {/* Segmenti montaže */}
        {segments.map((segment, index) => (
          <g key={segment.subprocess}>
            {/* Pozadinski segment */}
            <path
              d={segment.pathData}
              fill="rgba(0,0,0,0.03)"
              stroke="white"
              strokeWidth="1"
            />
            {/* Aktivni segment */}
            {segment.opacity === 1 && (
              <motion.path
                d={segment.pathData}
                fill={segment.color}
                stroke="white"
                strokeWidth="1"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ 
                  delay: index * 0.1,
                  duration: 0.3,
                  ease: "easeOut"
                }}
                style={{ transformOrigin: '40px 40px' }}
              />
            )}
            {/* Tooltip na hover */}
            <title>
              {segment.subprocess === 'transport' && 'Transport'}
              {segment.subprocess === 'ugradnja' && 'Ugradnja'}
              {segment.subprocess === 'stakljenje' && 'Stakljenje'}
              {segment.subprocess === 'brtvljenje' && 'Brtvljenje'}
              {segment.subprocess === 'dodaci' && 'Dodaci'}
              {segment.subprocess === 'zavrseno' && 'Završeno'}
              : {montazaStatus.completed.includes(segment.subprocess) ? '✓ Završeno' : '○ Čeka'}
            </title>
          </g>
        ))}
        
        {/* Unutarnji bijeli krug za separaciju */}
        <circle cx="40" cy="40" r="20" fill="white" />
        
        {/* Problem indikatori */}
        {montazaStatus.hasReklamacija && (
          <motion.circle
            cx="40" cy="40" r="19"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeDasharray="2 4"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: '40px 40px' }}
          />
        )}
        {montazaStatus.hasBlokirano && (
          <motion.circle
            cx="40" cy="40" r="19"
            fill="none"
            stroke="#6B7280"
            strokeWidth="2"
            strokeDasharray="4 2"
            initial={{ rotate: 0 }}
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            style={{ transformOrigin: '40px 40px' }}
          />
        )}
      </svg>
      
      {/* Glavni marker */}
      <div 
        className="relative bg-white rounded-full w-10 h-10 shadow-lg border-2 flex items-center justify-center"
        style={{ 
          borderColor: hasProblems ? glowColor : '#e5e7eb',
          boxShadow: hasProblems ? `0 0 0 2px ${glowColor}20, 0 4px 6px -1px rgba(0, 0, 0, 0.1)` : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <span className="text-sm font-bold text-slate-700">
          {position.komadi?.length || 0}
        </span>
      </div>
      
      {/* Pill za ime pozicije */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <motion.div 
          className="relative"
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Pill pozadina s glow efektom */}
          {hasProblems && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${glowColor}30, ${glowColor}10)`,
                filter: 'blur(4px)',
                transform: 'scale(1.2)'
              }}
            />
          )}
          
          {/* Glavni pill */}
          <div 
            className={`relative px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
              hasProblems ? 'text-white' : 'text-slate-700'
            }`}
            style={{
              background: hasProblems 
                ? `linear-gradient(135deg, ${glowColor}, ${glowColor}dd)` 
                : 'linear-gradient(135deg, white, #f9fafb)',
              boxShadow: hasProblems
                ? `0 2px 8px ${glowColor}40, inset 0 1px 0 rgba(255,255,255,0.2)`
                : '0 2px 8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
              border: hasProblems ? `1px solid ${glowColor}` : '1px solid rgba(0,0,0,0.08)'
            }}
          >
            {position.naziv}
            
            {/* Status indikator u pillu */}
            {hasProblems && (
              <motion.span
                className="inline-block w-1.5 h-1.5 rounded-full ml-2"
                style={{ 
                  backgroundColor: 'white',
                  boxShadow: '0 0 4px rgba(255,255,255,0.8)'
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// =============== GLAVNI FLOOR MANAGEMENT ===============
export default function FloorManagement() {
  const [floorplanImage, setFloorplanImage] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [isExpandedHover, setExpandedHover] = useState(false);
  const [paperFormat, setPaperFormat] = useState('A3');
  const [orientation, setOrientation] = useState('landscape');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showSidebar, setShowSidebar] = useState(true);
  
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Mock data
  useEffect(() => {
    const mockPositions = [
      {
        id: 'pz-01',
        naziv: 'Glavni ulaz',
        pozicija: 'PZ-01',
        x: 30,
        y: 50,
        proces: 'montaža',
        status: 'u_tijeku',
        start: '2025-01-15',
        end: '2025-01-25',
        plannedEnd: '2025-01-23',
        opis: 'Montaža glavnih ulaznih vrata s automatskim otvaranjem. Uključuje instalaciju senzora, programiranje kontrolera i testiranje sigurnosnih sustava.',
        komentari: ['Provjeriti dimenzije', 'Klijent traži RAL 7016'],
        prilozi: ['nacrt_vrata.pdf', 'specifikacija.xlsx'],
        komadi: [
          { id: 'k1', broj: 1, status: 'završeno' },
          { id: 'k2', broj: 2, status: 'u_tijeku' },
          { id: 'k3', broj: 3, status: 'čeka' }
        ],
        montazaStatus: {
          transport: true,
          ugradnja: true,
          stakljenje: true,
          brtvljenje: false,
          dodaci: false,
          zavrseno: false,
          reklamacija: false,
          blokirano: false
        },
        pieces: [
          {
            pieceNumber: 1,
            processData: {
              comments: [{ id: 'c1', text: 'Okvir montiran' }],
              documents: [{ id: 'd1', name: 'foto_okvir.jpg' }],
              tasks: [{ id: 't1', title: 'Testirati automatiku', done: false }]
            }
          },
          {
            pieceNumber: 2,
            processData: {
              comments: [],
              documents: [],
              tasks: []
            }
          }
        ]
      },
      {
        id: 'pz-02',
        naziv: 'Fasada A',
        pozicija: 'PZ-02',
        x: 60,
        y: 30,
        proces: 'kontrola',
        status: 'završeno',
        start: '2025-01-10',
        end: '2025-01-18',
        plannedEnd: '2025-01-20',
        opis: 'Kontrola kvalitete fasadnih elemenata',
        komadi: [
          { id: 'k4', broj: 1, status: 'završeno' },
          { id: 'k5', broj: 2, status: 'završeno' }
        ],
        montazaStatus: {
          transport: true,
          ugradnja: true,
          stakljenje: true,
          brtvljenje: true,
          dodaci: true,
          zavrseno: true,
          reklamacija: false,
          blokirano: false
        }
      },
      {
        id: 'pz-03',
        naziv: 'Prozor P1',
        pozicija: 'PZ-03',
        x: 45,
        y: 70,
        proces: 'općenito',
        status: 'kasni',
        start: '2025-01-12',
        end: '2025-01-28',
        plannedEnd: '2025-01-22',
        opis: 'Ugradnja prozorskih okvira prema EN standardima',
        komadi: [
          { id: 'k6', broj: 1, status: 'u_tijeku' },
          { id: 'k7', broj: 2, status: 'čeka' },
          { id: 'k8', broj: 3, status: 'čeka' },
          { id: 'k9', broj: 4, status: 'čeka' }
        ],
        montazaStatus: {
          transport: true,
          ugradnja: true,
          stakljenje: false,
          brtvljenje: false,
          dodaci: false,
          zavrseno: false,
          reklamacija: true,  // Ima reklamaciju
          blokirano: false
        }
      },
      {
        id: 'pz-04',
        naziv: 'Bočna vrata',
        pozicija: 'PZ-04',
        x: 75,
        y: 60,
        proces: 'montaža',
        status: 'čeka',
        start: '2025-01-20',
        end: '2025-01-30',
        plannedEnd: '2025-01-28',
        opis: 'Montaža bočnih vrata',
        komadi: [
          { id: 'k10', broj: 1, status: 'čeka' },
          { id: 'k11', broj: 2, status: 'čeka' }
        ],
        montazaStatus: {
          transport: false,
          ugradnja: false,
          stakljenje: false,
          brtvljenje: false,
          dodaci: false,
          zavrseno: false,
          reklamacija: false,
          blokirano: true  // Blokirano
        }
      }
    ];
    setPositions(mockPositions);
  }, []);

  const getFloorplanDimensions = () => {
    const format = PAPER_FORMATS[paperFormat];
    return orientation === 'landscape' 
      ? { width: format.height, height: format.width }
      : { width: format.width, height: format.height };
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFloorplanImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePositionClick = (position) => {
    setSelectedPosition(position);
    setExpandedHover(true);
  };

  const handlePositionDragEnd = (positionId, newCoords) => {
    setPositions(positions.map(p => 
      p.id === positionId ? { ...p, x: newCoords.x, y: newCoords.y } : p
    ));
  };

  const exportData = () => {
    const dataStr = JSON.stringify(positions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `floor_positions_${Date.now()}.json`);
    linkElement.click();
  };

  const filteredPositions = positions.filter(p => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const dimensions = getFloorplanDimensions();

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 320 }}
            exit={{ width: 0 }}
            className="bg-white border-r border-gray-200 flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold mb-4">Upravljanje tlocrtom</h2>
              
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Format papira</label>
                <div className="grid grid-cols-2 gap-2">
                  <select value={paperFormat} onChange={(e) => setPaperFormat(e.target.value)}
                          className="px-3 py-2 border rounded-lg text-sm">
                    {Object.entries(PAPER_FORMATS).map(([key, value]) => (
                      <option key={key} value={key}>{value.name}</option>
                    ))}
                  </select>
                  <select value={orientation} onChange={(e) => setOrientation(e.target.value)}
                          className="px-3 py-2 border rounded-lg text-sm">
                    <option value="portrait">Portret</option>
                    <option value="landscape">Pejzaž</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Zoom: {Math.round(zoomLevel * 100)}%
                </label>
                <input type="range" min="50" max="200" value={zoomLevel * 100}
                       onChange={(e) => setZoomLevel(e.target.value / 100)}
                       className="w-full" />
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Filter po statusu</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="all">Sve pozicije</option>
                  {Object.entries(STATUSI).map(([key, value]) => (
                    <option key={key} value={key}>{value.text}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <button onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  <Upload className="w-4 h-4 inline mr-2" />
                  Učitaj tlocrt
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                
                <button onClick={exportData}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  <Download className="w-4 h-4 inline mr-2" />
                  Izvezi podatke
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pozicije ({filteredPositions.length})</h3>
              <div className="space-y-2">
                {filteredPositions.map(position => (
                  <div key={position.id}
                       className={`p-3 bg-white border rounded-lg cursor-pointer hover:shadow-md ${
                         selectedPosition?.id === position.id ? 'border-blue-500' : 'border-gray-200'
                       }`}
                       onClick={() => handlePositionClick(position)}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{position.naziv}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs"
                            style={{
                              backgroundColor: STATUSI[position.status]?.light,
                              color: STATUSI[position.status]?.bg
                            }}>
                        {STATUSI[position.status]?.text}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {position.pozicija} • {position.komadi?.length || 0} komada
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-100 rounded-lg">
              <Layers className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600">
              {dimensions.width} × {dimensions.height}px ({paperFormat} {orientation})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
                    className="p-2 hover:bg-gray-100 rounded-lg">
              <Minimize2 className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium px-2">{Math.round(zoomLevel * 100)}%</span>
            <button onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
                    className="p-2 hover:bg-gray-100 rounded-lg">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <div className="flex items-center justify-center min-h-full">
            <div ref={containerRef}
                 className="relative bg-white shadow-xl"
                 style={{
                   width: dimensions.width * zoomLevel,
                   height: dimensions.height * zoomLevel
                 }}>
              {floorplanImage ? (
                <img src={floorplanImage} alt="Tlocrt" 
                     className="absolute inset-0 w-full h-full object-contain" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Upload className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Povucite sliku tlocrta ovdje</p>
                  </div>
                </div>
              )}

              {filteredPositions.map(position => (
                <PositionMarker
                  key={position.id}
                  position={position}
                  isActive={selectedPosition?.id === position.id}
                  onClick={() => handlePositionClick(position)}
                  onDragEnd={handlePositionDragEnd}
                  zoomLevel={zoomLevel}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Hover Card */}
      <AnimatePresence>
        {selectedPosition && (
          <AdvancedTaskHoverCard
            task={selectedPosition}
            position={{
              x: containerRef.current?.getBoundingClientRect().left + 
                 (selectedPosition.x / 100) * (dimensions.width * zoomLevel),
              y: containerRef.current?.getBoundingClientRect().top + 
                 (selectedPosition.y / 100) * (dimensions.height * zoomLevel)
            }}
            isExpanded={isExpandedHover}
            onClose={() => {
              setSelectedPosition(null);
              setExpandedHover(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}