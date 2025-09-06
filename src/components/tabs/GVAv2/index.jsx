import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import slika1 from '../../../backend/slika1.png';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Mic, CheckCircle, Loader2, Send, ChevronRight,
  Undo2, Redo2, Command, Palette, Activity, CalendarDays, Database, User, Sparkles, X, Bot, Sliders, AlertCircle, Clock
} from 'lucide-react';
import { cycleTheme } from '../../../theme/manager';
import AgentStepFlow from '../../agent/AgentStepFlow.jsx';
import AgentConsole from '../../agent/AgentConsole.jsx';
import AgentTaskCard from '../../agent/AgentTaskCard.jsx';
import { chatCompletions } from '../../../agent/llmClient.js';
import { validateParams } from '../../../agent/tooling.js';
// Using inline AgentInteractionPanel and loadProdajaData in this file
import AgentInteractionPanel from './components/AgentInteractionPanel.jsx';
import useGanttAgent from './hooks/useGanttAgent.js';
import ProcessCarousel from './components/ProcessCarousel.jsx';
import PDFPagePopup from './components/PDFPagePopup.jsx';
// (JsonHighlighter, ProcessStagesPanel, InspectorSidebar are now standalone; import when used)

import GanttCanvas from './components/GanttCanvas.jsx';
import { parseCroatianCommand } from './parser/parseCroatianCommand.js';
import DocumentService from '../../../services/DocumentService.js';


// --- JSON helper: safely parse raw model output (handles code fences) ---
function parseJsonSafe(text) {
  try {
    let s = String(text || '').trim();
    // strip optional markdown code fences
    s = s.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/i, '');
    // clamp to the first/last brace (defensive against logging noise)
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
    return JSON.parse(s);
  } catch {
    return null;
  }
}
// --- Date helpers (UTC safe) ---
const ymd = (d) => d.toISOString().slice(0, 10);
const fromYmd = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => { if (!s) return s; const d = fromYmd(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const diffDays = (a, b) => { if (!a || !b) return 0; const d1 = fromYmd(a), d2 = fromYmd(b); return Math.round((d2 - d1) / (1000*60*60*24)); };
const rangeDays = (from, to) => { if (!from || !to) return []; const out=[]; let cur=fromYmd(from), end=fromYmd(to); while(cur<=end){ out.push(ymd(cur)); cur.setUTCDate(cur.getUTCDate()+1);} return out; };

// --- Normative helpers ---
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hashStr = (s) => [...String(s)].reduce((h,c)=>((h<<5)-h + c.charCodeAt(0))|0, 0);

// Deterministic random number generator based on string hash
const seededRandom = (str, min, max) => {
  const hash = Math.abs(hashStr(str));
  const normalized = (hash % 10000) / 10000; // 0-1 range
  return Math.floor(normalized * (max - min + 1)) + min;
};

function computeNormativeDurations(profile, pozicije) {
  const out = {};
  const base = {};

  pozicije.forEach((p) => {
    const name = (p?.naziv || '').toLowerCase();
    const curDur = Math.max(1, (diffDays(p.montaza.datum_pocetka, p.montaza.datum_zavrsetka) || 0) + 1);

    let d1;
    if (/staklo/.test(name)) d1 = 3;
    else if (/aluminij/.test(name) || /aluminijski/.test(name)) d1 = 2;
    else d1 = clamp(curDur || 2, 2, 4);

    base[p.id] = d1;
  });

  if (profile === 1) {
    return outAssign(out, base);
  }

  if (profile === 2) {
    Object.keys(base).forEach((id) => {
      const h = Math.abs(hashStr(id)) % 3;
      const b = base[id];
      out[id] = clamp(b + (h === 0 ? +1 : (h === 1 ? -1 : 0)), 1, b + 2);
    });
    return out;
  }

  return outAssign(out, base);

  function outAssign(dst, src) { Object.keys(src).forEach(k => dst[k] = src[k]); return dst; }
}

// Batched ghost action addition helper - prevents UI jerking
const addGhostActionsBatched = (ghosts, setPendingActions, batchSize = 3) => {
  let index = 0;
  const addBatch = () => {
    if (index >= ghosts.length) return;
    const batch = ghosts.slice(index, index + batchSize);
    setPendingActions(q => [...batch, ...q]);
    index += batchSize;
    if (index < ghosts.length) {
      requestAnimationFrame(() => setTimeout(addBatch, 16)); // 60fps staggering
    }
  };
  addBatch();
};

// --- Ghost builders (grupirane akcije) ---
function buildGhostActionsForNormative(profile, { pozicije, aliasByLine }) {
  const groupId = `norm-${profile}-${Date.now()}`;
  
  return pozicije.map(p => {
    const currentStart = p.montaza.datum_pocetka;
    const currentEnd = p.montaza.datum_zavrsetka;
    
    let startShift, endShift;
    
    if (profile === 1) {
      // NORMATIV 1: početak +1 do +2 dana, kraj +1 do +4 dana
      startShift = seededRandom(`${p.id}-start`, 1, 2);
      endShift = seededRandom(`${p.id}-end`, 1, 4);
    } else if (profile === 2) {
      // NORMATIV 2: početak +1 do +5 dana, kraj +4 do +8 dana  
      startShift = seededRandom(`${p.id}-start`, 1, 5);
      endShift = seededRandom(`${p.id}-end`, 4, 8);
    } else {
      // Default: no change
      startShift = 0;
      endShift = 0;
    }
    
    return {
      id: `${groupId}-${p.id}`,
      client_action_id: groupId,
      type: 'set_range',
      lineId: p.id,
      alias: aliasByLine[p.id] || p.id,
      start: addDays(currentStart, startShift),
      end: addDays(currentEnd, endShift)
    };
  });
}

function buildGhostActionsForShiftAll(days, { pozicije, aliasByLine }) {
  const groupId = `shiftall-${days}-${Date.now()}`;
  return pozicije.map(p => ({
    id: `${groupId}-${p.id}`,
    client_action_id: groupId,
    type: 'set_range',
    lineId: p.id,
    alias: aliasByLine[p.id] || p.id,
    start: addDays(p.montaza.datum_pocetka, days),
    end: addDays(p.montaza.datum_zavrsetka, days)
  }));
}

function buildGhostActionsForDistributeChain({ pozicije, aliasByLine }) {
  const groupId = `chain-${Date.now()}`;
  const arr = [...pozicije].sort((a,b)=> (a.montaza.datum_pocetka||'').localeCompare(b.montaza.datum_pocetka||''));  
  const list = [];
  for (let i=0;i<arr.length;i++) {
    const p = arr[i];
    const dur = Math.max(0, diffDays(p.montaza.datum_pocetka, p.montaza.datum_zavrsetka));
    const newStart = i === 0 ? p.montaza.datum_pocetka : addDays(arr[i-1].montaza.datum_zavrsetka, 1);
    const newEnd = addDays(newStart, dur);
    list.push({
      id: `${groupId}-${p.id}`,
      client_action_id: groupId,
      type: 'set_range',
      lineId: p.id,
      alias: aliasByLine[p.id] || p.id,
      start: newStart,
      end: newEnd
    });
  }
  return list;
}
// --- Load prodaja processes from all_projects JSON ---
let PRODAJA_GANTT_JSON = null;
const loadProdajaData = async () => {
  try {
    const response = await fetch('/all_projects_2025-09-02T23-56-55.json');
    const allProjectsData = await response.json();
    
    // Extract all "Prodaja" processes
    const prodajaProcesses = [];
    
    if (allProjectsData.projects) {
      allProjectsData.projects.forEach((project) => {
        if (project.positions) {
          project.positions.forEach((pozicija) => {
            if (pozicija.processes) {
              pozicija.processes.forEach((process) => {
                if (process.name === "Prodaja") {
                  prodajaProcesses.push({
                    project,
                    pozicija,
                    process,
                    uniqueId: `${project.id}-${pozicija.id}-PRODAJA`
                  });
                }
              });
            }
          });
        }
      });
    }
    
    // Convert to GVAv2 format
    PRODAJA_GANTT_JSON = {
      project: {
        id: 'ALL-PRODAJA-PROCESSES',
        name: 'Svi Procesi Prodaje',
        description: `Prikaz ${prodajaProcesses.length} procesa prodaje iz svih projekata`
      },
      pozicije: prodajaProcesses.map((item, index) => ({
        id: item.uniqueId,
        naziv: `${item.project.name} - ${item.pozicija.title}`,
        montaza: {
          opis: `Prodaja za ${item.pozicija.title} (${item.project.client?.name || 'N/A'})`,
          osoba: item.process.owner?.name || "Nepoznato",
          datum_pocetka: item.process.plannedStart,
          datum_zavrsetka: item.process.plannedEnd,
          // Additional data for voice commands
          status: item.process.status,
          progress: item.process.progress || 0,
          actualStart: item.process.actualStart,
          actualEnd: item.process.actualEnd,
          notes: item.process.notes || '',
          // Metadata for voice modification
          projectId: item.project.id,
          pozicijaId: item.pozicija.id,
          clientName: item.project.client?.name
        }
      })),
      metadata: {
        version: '2.0',
        source: 'all_projects_2025-09-02T23-56-55.json',
        processCount: prodajaProcesses.length,
        loadedAt: new Date().toISOString()
      }
    };
    
    console.log(`ðŸ“Š Loaded ${prodajaProcesses.length} prodaja processes for GVAv2`);
    return PRODAJA_GANTT_JSON;
    
  } catch (error) {
    console.error('âŒ Failed to load prodaja data:', error);
    // Fallback to mock data with prodaja theme
    return {
      project: { id: 'PRODAJA-FALLBACK', name: 'Prodaja Procesi - Fallback', description: 'Fallback podaci za prodaju procese' },
      pozicije: [
        { id:'PRJ-01-PZ-01-PRODAJA', naziv:'Stambena zgrada â€“ Istok - Aluminijski profili', montaza:{ opis:'Prodaja za Aluminijski profili KTM-2025', osoba:'Marko P.', datum_pocetka:'2025-08-16', datum_zavrsetka:'2025-08-16', status:'ZavrÅ¡eno' } },
        { id:'PRJ-01-PZ-02-PRODAJA', naziv:'Stambena zgrada â€“ Istok - Staklo termoizol.', montaza:{ opis:'Prodaja za Staklo termoizol. 4+12+4', osoba:'Marko P.', datum_pocetka:'2025-08-18', datum_zavrsetka:'2025-08-23', status:'ZavrÅ¡eno' } },
        { id:'PRJ-02-PZ-01-PRODAJA', naziv:'Ured Zapad - ÄŒeliÄni okvir', montaza:{ opis:'Prodaja za ÄŒeliÄni okvir FEA D45-001', osoba:'Marko P.', datum_pocetka:'2025-08-16', datum_zavrsetka:'2025-08-17', status:'ZavrÅ¡eno' } },
      ],
      metadata: { version:'2.0', source:'fallback' }
    };
  }
};
// Initialize with fallback, will be replaced by loaded data
const MOCK_GANTT_JSON = {
  project: { id: 'LOADING', name: 'UÄitavanje podataka...', description: 'UÄitavam procese prodaje iz all_projects datoteke' },
  pozicije: [],
  metadata: { version:'2.0', loading:true }
};
// --- Agent Interaction Panel Component ---

// --- Process Timeline Panel Component ---
import ProcessTimelinePanel from './components/ProcessTimelinePanel.jsx';
// --- Quick Command Cards (right side) ---
export default function GVAv2() {
  const [jsonHistory, setJsonHistory] = useState([MOCK_GANTT_JSON]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const ganttJson = jsonHistory[historyIndex];
  const [activeLineId, setActiveLineId] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const agent = useGanttAgent();
  
  // Load prodaja data on component mount
  useEffect(() => {
    const initializeProdajaData = async () => {
      console.log('ðŸ”„ Loading prodaja data for GVAv2...');
      const prodajaData = await loadProdajaData();
      
      setJsonHistory([prodajaData]);
      setHistoryIndex(0);
      setIsDataLoaded(true);
      
      // Set first pozicija as active
      if (prodajaData.pozicije && prodajaData.pozicije.length > 0) {
        setActiveLineId(prodajaData.pozicije[0].id);
      }
      
      console.log('âœ… Prodaja data loaded and set as active JSON');
    };
    
    initializeProdajaData();
  }, []);
  const [focusMode, setFocusMode] = useState(false);
  const [superFocus, setSuperFocus] = useState(false);
  const [aliasByLine, setAliasByLine] = useState({}); // lineId -> "KIA 7" (Display)
  const [lineByAlias, setLineByAlias] = useState({}); // "KIA7" -> lineId (Internal/Normalized)
  const [pendingActions, setPendingActions] = useState([]); // { id, type, alias, lineId, iso }
  const [pendingPatches, setPendingPatches] = useState([]); // persistence queue
  const nextAliasIndexRef = useRef(0); // Replaces nextAliasNumRef

  // === MEGA SPEC: Normalization and Badges (Section 8) ===
  const normalizeAlias = (alias) => String(alias || '').toUpperCase().replace(/[\s.]+/g, '');

  const CUSTOM_BADGES = [
    'POZ 1', 'POZICIJA 9', '5561', 'POZICIJA 35', 'POZ 14',
    'PZR 3', 'PZ 78', 'KIA 7', 'AKO 5', '334'
  ];
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [activities, setActivities] = useState([]); // completed task cards
  const [flowActive, setFlowActive] = useState(0); // 0..4 stepper
  const [flowDone, setFlowDone] = useState(-1);
  // Add Task modal + notes store
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskDraft, setAddTaskDraft] = useState('');
  const [savedNotes, setSavedNotes] = useState([]); // array of strings
  const addTaskRef = useRef(null);
  // PDF popup state
  const [showPDFPopup, setShowPDFPopup] = useState(false);
  const [pdfPopupData, setPdfPopupData] = useState({ url: slika1, documentName: 'Uzorak dokumenta', pageNumber: 1 });
  const [showImagePopup, setShowImagePopup] = useState(false);
  const speakNotes = useCallback(() => {
    try {
      const text = addTaskDraft || savedNotes[savedNotes.length-1] || 'Nema spremljenog teksta.';
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis?.getVoices?.() || [];
      const hr = voices.find(v=>/hr|cro/i.test(v.lang)) || voices.find(v=>/sh|sr/i.test(v.lang));
      if (hr) u.voice = hr; u.lang = (hr?.lang || 'hr-HR');
      window.speechSynthesis.speak(u);
    } catch {}
  }, [savedNotes, addTaskDraft]);
  // Focus textarea and ensure listening when modal opens
  useEffect(() => {
    if (showAddTaskModal) {
      try { setTimeout(() => addTaskRef.current?.focus(), 0); } catch {}
      try { if (!agent.isListening) agent.startListening(); } catch {}
    }
  }, [showAddTaskModal, agent]);
  // Glow settings
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [glowIntensity, setGlowIntensity] = useState(1);
  const [glowDurationMs, setGlowDurationMs] = useState(200);
  const [showGlowSettings, setShowGlowSettings] = useState(false);
  // Tab-level agent selection (defaults from localStorage)
  const [agentSource, setAgentSource] = useState(() => {
    try { return localStorage.getItem('gva.agent.mode') || 'server'; } catch { return 'server'; }
  });
  const [localAgentUrl, setLocalAgentUrl] = useState(() => {
    try { return localStorage.getItem('gva.agent.url') || 'http://192.168.30.12:1234'; } catch { return 'http://192.168.30.12:1234'; }
  });
  const [enableLLMFallback, setEnableLLMFallback] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gva.llm.fallback') || 'true'); } catch { return true; }
  });
  const [llmThreshold, setLlmThreshold] = useState(() => {
    try { return Number(localStorage.getItem('gva.llm.threshold') || '0.7'); } catch { return 0.7; }
  });
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackSuggestions, setFallbackSuggestions] = useState([]);
  const [fallbackClarification, setFallbackClarification] = useState('');
  const [fallbackChat, setFallbackChat] = useState([]); // [{role:'assistant'|'user', text:string}]
  
  // NEW: Matrix chat state - replaces old fallback
  const [matrixChatActive, setMatrixChatActive] = useState(false);

  const [fallbackMode, setFallbackMode] = useState('idle'); const [fallbackPending, setFallbackPending] = useState(null); const [fallbackPrimarySuggestion, setFallbackPrimarySuggestion] = useState(null); const fallbackInputRef = useRef(null);
  const [localPing, setLocalPing] = useState(null);
  
  // Log function - must be defined before other callbacks that use it
  const log = useCallback((msg) => {
    setConsoleLogs((prev) => [...prev.slice(-400), { id: Date.now() + Math.random(), t: Date.now(), msg }]);
  }, []);

  // Function to trigger Matrix chat instead of old fallback
  const triggerMatrixChat = useCallback((initialMessage = '') => {
    log('Aktiviranje Matrix chat fallback umjesto starog');
    setMatrixChatActive(true);
    // Disable old fallback
    setFallbackOpen(false);
    setSuperFocus(false);
  }, [log]);
  // Focus fallback chat input and ensure listening when fallback opens
  useEffect(() => {
    if (fallbackOpen) {
      try { setTimeout(() => fallbackInputRef.current?.focus(), 0); } catch {}
      try { if (!agent.isListening) agent.startListening(); } catch {}
    }
  }, [fallbackOpen, agent]);
  // === UPDATED: assignAliasToLine using CUSTOM_BADGES ===
  const assignAliasToLine = useCallback((lineId) => {
    if (!lineId) return null;
    let outAlias = null;
    setAliasByLine((prev) => {
      if (prev[lineId]) { outAlias = prev[lineId]; return prev; }
      
      let alias;
      if (nextAliasIndexRef.current < CUSTOM_BADGES.length) {
          alias = CUSTOM_BADGES[nextAliasIndexRef.current];
      } else {
          alias = `PR${nextAliasIndexRef.current + 1}`; // Fallback
      }
      nextAliasIndexRef.current++;
      
      outAlias = alias;
      const normalized = normalizeAlias(alias); // Key: KIA 7 -> KIA7
      
      // Update internal normalized aliases map
      setLineByAlias((r) => ({ ...r, [normalized]: lineId }));
      
      // Render in DOM (Shows original "KIA 7") - batched update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { // Double RAF for smooth transition
          const el = document.querySelector(`[data-bar-id="${lineId}"] .alias-badge`);
          if (el) {
            el.textContent = alias; 
            el.classList.remove('hidden');
            el.classList.add('alias-badge--active');
          }
        });
      });
      return { ...prev, [lineId]: alias };
    });
    return outAlias;
  }, []);
  // Expose alias assigner for hover path
  useEffect(() => {
    window.__gvaFocusAssignAlias = (lineId) => { if (!focusMode || !lineId) return; assignAliasToLine(lineId); };
    return () => { delete window.__gvaFocusAssignAlias; };
  }, [focusMode, assignAliasToLine]);
  // Reset index and badges when Focus Mode is disabled
  useEffect(() => {
    if (!focusMode) {
        nextAliasIndexRef.current = 0;
        // Reset maps (important for clean start)
        setAliasByLine({}); 
        setLineByAlias({});
        // Hide badges - batched update
        requestAnimationFrame(() => {
          document.querySelectorAll('.alias-badge').forEach(el => el.classList.add('hidden'));
        });
    }
  }, [focusMode]);

  // Separate effect to reapply badges when aliasByLine changes (and focusMode is true)
  useEffect(() => {
    if (focusMode && Object.keys(aliasByLine).length > 0) {
        // Reapply visible badges for already assigned - batched update
        requestAnimationFrame(() => {
          Object.entries(aliasByLine).forEach(([lineId, alias]) => {
              const el = document.querySelector(`[data-bar-id="${lineId}"] .alias-badge`);
              if (el) { el.textContent = alias; el.classList.remove('hidden'); }
          });
        });
    }
  }, [focusMode, aliasByLine]);
  // When Focus Mode activates, auto-assign aliases to first N visible bars and flash them
  useEffect(() => {
    if (!focusMode) return;
    const MAX_AUTO = 12; // first 12 tasks are enough for clarity
    const all = (ganttJson?.pozicije || []);
    const first = all.slice(0, MAX_AUTO);
    const ids = first.map(p => p.id);
    let delay = 0;
    // Build alias lookups for short codes across all positions (e.g., PZ02)
    try {
      const aliasMap = {};
      all.forEach(pos => {
        const text = `${pos?.id || ''} ${pos?.naziv || ''}`;
        const codes = Array.from(text.matchAll(/\b([a-z]{2}\d{1,3})\b/gi)).map(m=>m[1].toUpperCase());
        codes.forEach(code => { if (!aliasMap[code]) aliasMap[code] = pos.id; });
      });
      if (Object.keys(aliasMap).length) {
        setLineByAlias(prev => ({ ...aliasMap, ...prev }));
      }
    } catch {}
    ids.forEach((id, idx) => {
      assignAliasToLine(id);
      // also map common short codes (e.g., PZ02) to this line for command resolution
      try {
        const pos = first.find(pp => pp.id === id);
        const text = `${pos?.id || ''} ${pos?.naziv || ''}`;
        const codes = Array.from(text.matchAll(/\b([a-z]{2}\d{1,3})\b/gi)).map(m=>m[1].toUpperCase());
        if (codes.length) {
          setLineByAlias(prev => {
            const next = { ...prev };
            codes.forEach(code => { if (!next[code]) next[code] = id; });
            return next;
          });
        }
      } catch {}
      // small cascading background highlights
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { selector: `[data-bar-id="${id}"]`, durationMs: 700 } }));
      }, delay);
      delay += 90;
    });
  }, [focusMode, ganttJson, assignAliasToLine]);
  // Global ambient glow: focus (server: yellow, local: blue) / superfocus (green)
  useEffect(() => {
    const updateBodyClasses = () => {
      try {
        const b = document.body;
        b.classList.remove('app-focus', 'app-superfocus', 'app-focus-local');
        if (glowEnabled) {
          if (superFocus) b.classList.add('app-superfocus');
          else if (focusMode) b.classList.add(agentSource === 'local' ? 'app-focus-local' : 'app-focus');
        }
      } catch {}
    };
    
    // Defer to next frame to prevent layout thrashing
    const timeoutId = setTimeout(updateBodyClasses, 0);
    
    return () => {
      clearTimeout(timeoutId);
      try {
        document.body.classList.remove('app-focus', 'app-superfocus', 'app-focus-local');
      } catch {}
    };
  }, [focusMode, superFocus, glowEnabled, agentSource]);
  // Apply CSS variables for intensity/duration
  const applyGlowVars = useCallback(() => {
    const root = document.documentElement;
    const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
    const I = clamp(Number(glowIntensity) || 0);
    const fd = Math.max(50, Math.min(2000, Number(glowDurationMs)||200));
    
    // Batch style updates to prevent reflows
    requestAnimationFrame(() => {
      root.style.setProperty('--focus-glow-border', String(0.35 * I));
      root.style.setProperty('--focus-glow-outer', String(0.18 * I));
      root.style.setProperty('--focus-glow-duration', `${fd}ms`);
      root.style.setProperty('--superfocus-glow-border', String(0.45 * I));
      root.style.setProperty('--superfocus-glow-outer', String(0.22 * I));
      root.style.setProperty('--superfocus-glow-duration', `${fd}ms`);
    });
  }, [glowIntensity, glowDurationMs]);
  
  useEffect(() => {
    // Debounce glow variable updates to prevent excessive DOM updates
    const timeoutId = setTimeout(applyGlowVars, 16); // ~60fps
    return () => clearTimeout(timeoutId);
  }, [applyGlowVars]);

  // Image popup animation: 100px -> 90px blur over 2s, then to 0px over 0.0s, then close
  useEffect(() => {
    if (!showImagePopup) return;
    setPopupBlurPx(100);
    setPopupTransitionMs(2000);
    const t1 = setTimeout(() => {
      setPopupBlurPx(50);
      const t2 = setTimeout(() => {
        setPopupTransitionMs(0);
        setPopupBlurPx(0);
        const t3 = setTimeout(() => setShowImagePopup(false), 200);
        return () => clearTimeout(t3);
      }, 2000);
      return () => clearTimeout(t2);
    }, 20);
    return () => clearTimeout(t1);
  }, [showImagePopup]);
  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gva.glow.enabled', JSON.stringify(glowEnabled));
      localStorage.setItem('gva.glow.intensity', JSON.stringify(glowIntensity));
      localStorage.setItem('gva.glow.duration', JSON.stringify(glowDurationMs));
      localStorage.setItem('gva.agent.mode', agentSource);
      localStorage.setItem('gva.agent.url', localAgentUrl);
      localStorage.setItem('gva.llm.fallback', JSON.stringify(enableLLMFallback));
      localStorage.setItem('gva.llm.threshold', String(llmThreshold));
    } catch {}
  }, [glowEnabled, glowIntensity, glowDurationMs, agentSource, localAgentUrl, enableLLMFallback, llmThreshold]);

  function describeSuggestion(sug){
    if(!sug) return '';
    const t = sug.tool; const p = sug.params||{};
    if(t==='move_start') return `Pomakni ${String(p.alias||'').toUpperCase()} na ${p.date}`;
    if(t==='shift') {
      const aliases = Array.isArray(p.alias) ? p.alias : [p.alias];
      const label = aliases.filter(Boolean).map(a=>String(a).toUpperCase()).join(', ');
      return `Pomakni ${label} za ${p.days} dana`;
    }
    if(t==='shift_all') return `Pomakni sve za ${p.days} dana`;
    if(t==='distribute_chain') return 'Rasporedi pocetke sa krajevima';
    if(t==='normative_extend') return `Produï¿½i trajanje po normativu (+${p.days} dana)`;
    if(t==='add_task_open') return 'Otvori modal za zadatak';
    if(t==='image_popup') return 'Prikaži PDF dokument';
    if(t==='analyze_document') return `Analiziraj dokument: ${p.target}`;
    if(t==='apply_normative_profile') return `Primijeni ${p.profile?.id || 'normativ'} (start:+${p.profile?.offsets?.start_days || 0}d, end:+${p.profile?.offsets?.end_days || 0}d)`;
    if(t==='show_standard_plan') return `Standardni plan - poravnaj krajeve na početke`;
    if(t==='cancel_pending') return `Poništi sve pending naredbe`;
    return JSON.stringify({tool:t,params:p});
  }

  const runSuggestion = useCallback((sug)=>{
    const v = validateParams(sug?.tool, sug?.params); if (!v.ok) { log(`Prijedlog neispravan: ${v.error}`); return; }
    const tool = sug.tool; const params = sug.params || {};
    if (tool === 'move_start') {
      const aliasKey = String(params.alias||'').toUpperCase();
      const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
      setPendingActions(q => [{ id:`${Date.now()}`, type:'move_start', alias:aliasKey, lineId, iso: params.date }, ...q].slice(0,5));
    } else if (tool === 'shift') {
      const aliases = Array.isArray(params.alias) ? params.alias : [params.alias];
      aliases.forEach((a)=>{
        const aliasKey = String(a||'').toUpperCase(); const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
        try { const pos=(ganttJson?.pozicije||[]).find(p=>p.id===lineId); const curStart=pos?.montaza?.datum_pocetka; if(curStart&&Number.isFinite(params.days)){ const d=new Date(curStart+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+params.days); const iso=d.toISOString().slice(0,10); setPendingActions(q=>[{ id:`${Date.now()}`, type:'move_start', alias:aliasKey, lineId, iso }, ...q].slice(0,5)); } } catch {}
      });
    } else if (tool === 'apply_normative') {
      const profile = Number(params?.profile) || 1;
      const ghosts = buildGhostActionsForNormative(profile, { 
        pozicije: ganttJson?.pozicije || [], 
        aliasByLine: lineByAlias 
      });
      addGhostActionsBatched(ghosts, setPendingActions);
      return;
    } else if (tool === 'shift_all') {
      const ghosts = buildGhostActionsForShiftAll(params.days || 1, { 
        pozicije: ganttJson?.pozicije || [], 
        aliasByLine: lineByAlias 
      });
      addGhostActionsBatched(ghosts, setPendingActions);
      return;
    } else if (tool === 'distribute_chain') {
      const ghosts = buildGhostActionsForDistributeChain({ 
        pozicije: ganttJson?.pozicije || [], 
        aliasByLine: lineByAlias 
      });
      addGhostActionsBatched(ghosts, setPendingActions);
      return;
    } else if (tool === 'normative_extend') {
      setPendingActions(q => [{ id:`${Date.now()}`, type:'normative_extend', days: params.days }, ...q].slice(0,5));
    } else if (tool === 'add_task_open') {
      setShowAddTaskModal(true);
    } else if (tool === 'analyze_document') {
      // Activate Matrix chat for document analysis
      triggerMatrixChat(`analiza ${params.target}`);
    } else if (tool === 'apply_normative_profile') {
      // Generate structured shift_all actions for normative profile
      const { profile, scope, execution_mode } = params;
      const { start_days, end_days } = profile.offsets;
      
      if (execution_mode === 'preview') {
        // Show what would change in focus mode
        const startAction = {
          id: `${Date.now()}_start`,
          type: 'shift_all',
          field: 'start',
          days: start_days,
          targets: scope.targets,
          unit: scope.unit,
          client_action_id: `${profile.id}_shift_start`
        };
        
        const endAction = {
          id: `${Date.now()}_end`, 
          type: 'shift_all',
          field: 'end',
          days: end_days,
          targets: scope.targets,
          unit: scope.unit,
          client_action_id: `${profile.id}_shift_end`
        };
        
        setPendingActions(q => [startAction, endAction, ...q].slice(0, 10));
        log(`📋 ${profile.id} Preview: Start +${start_days}d, End +${end_days}d`);
        
      } else if (execution_mode === 'commit') {
        // Execute immediately - implement later
        log(`⚡ Izvršavam ${profile.id}: Start +${start_days}d, End +${end_days}d`);
      }
    } else if (tool === 'show_standard_plan') {
      // Chain distribution for standard plan
      const { targets, gap_days, anchor, adjust, duration_policy, execution_mode } = params;
      
      if (execution_mode === 'preview') {
        const planAction = {
          id: `${Date.now()}_plan`,
          type: 'distribute_chain',
          targets: targets,
          gap_days: gap_days,
          anchor: anchor,
          adjust: adjust,
          duration_policy: duration_policy,
          client_action_id: 'show_standard_plan'
        };
        
        setPendingActions(q => [planAction, ...q].slice(0, 5));
        log(`📋 Standardni plan: ${adjust} → ${anchor} (gap: ${gap_days}d)`);
        
      } else if (execution_mode === 'commit') {
        log(`⚡ Izvršavam standardni plan`);
      }
    } else if (tool === 'cancel_pending') {
      // Clear all pending actions
      setPendingActions([]);
      log('🚫 Sve naredbe poništene');
    } else if (tool === 'open_document') {
      const { document, page } = params;
      const logMsg = (msg) => agent.addStage({ 
        id: `log-${Date.now()}`, 
        name: 'PDF Document', 
        description: msg, 
        icon: '📄', 
        status: 'completed',
        timestamp: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });
      
      (async () => {
        try {
          logMsg(`Otviram dokument "${document}" na stranici ${page}...`);
          
          const availableDocs = await DocumentService.getAvailableDocuments();
          const exactDoc = availableDocs.find(doc => doc.filename.toLowerCase() === document.toLowerCase());
          
          if (!exactDoc) {
            const suggestion = DocumentService.findClosestMatch(document, availableDocs);
            const errorMsg = suggestion 
              ? `Dokument "${document}" nije pronađen. Možda: "${suggestion}"?`
              : `Dokument "${document}" nije pronađen. Dostupni: ${availableDocs.map(d => d.filename).join(', ')}`;
            logMsg(errorMsg);
            return;
          }
          
          const pageData = await DocumentService.extractPage(exactDoc.filename, page);
          
          setPdfPopupData({
            url: pageData.url,
            documentName: `${exactDoc.filename}.pdf`,
            pageNumber: page
          });
          setShowPDFPopup(true);
          logMsg(`✅ Dokument otvoren: ${exactDoc.filename}.pdf, stranica ${page}`);
          
        } catch (error) {
          logMsg(`❌ Greška: ${error.message}`);
        }
      })();
    } else if (tool === 'image_popup') {
      setShowPDFPopup(true);
    } else if (tool === 'move_end') {
      const aliasKey = String(params.alias||'').toUpperCase();
      const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
      setPendingActions(q => [{ id:`${Date.now()}`, type:'move_end', alias:aliasKey, lineId, iso: params.date }, ...q].slice(0,5));
    } else if (tool === 'set_range') {
      const aliasKey = String(params.alias||'').toUpperCase();
      const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
      setPendingActions(q => [{ id:`${Date.now()}`, type:'set_range', alias:aliasKey, lineId, start: params.start, end: params.end }, ...q].slice(0,5));
    } else if (tool === 'set_duration') {
      const aliasKey = String(params.alias||'').toUpperCase();
      const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
      setPendingActions(q => [{ id:`${Date.now()}`, type:'set_duration', alias:aliasKey, lineId, days: params.duration_days }, ...q].slice(0,5));
    }
    setFallbackOpen(false); setSuperFocus(false);
    log(`? Pokrecem alat: ${tool}`);
  }, [ganttJson, lineByAlias]);
  // Load persisted settings
  useEffect(() => {
    try {
      const ge = JSON.parse(localStorage.getItem('gva.glow.enabled') || 'true');
      const gi = JSON.parse(localStorage.getItem('gva.glow.intensity') || '1');
      const gd = JSON.parse(localStorage.getItem('gva.glow.duration') || '200');
      setGlowEnabled(Boolean(ge));
      setGlowIntensity(Number.isFinite(gi) ? gi : 1);
      setGlowDurationMs(Number.isFinite(gd) ? gd : 200);
    } catch {}
  }, []);
  // Exit via Escape key
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && (focusMode || superFocus)) {
        try { agent.stopListening(); } catch {}
        setSuperFocus(false); setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, superFocus, agent]);
  const updateGanttJson = useCallback((mod) => {
    if (!mod) return; const cur = JSON.parse(JSON.stringify(ganttJson)); cur.metadata.modified = new Date().toISOString();
    const i = cur.pozicije.findIndex(p=>p.id===mod.pozicija_id); if (i!==-1) { const p = cur.pozicije[i];
      switch(mod.operation){
        case 'shift_date': p.montaza.datum_pocetka = addDays(p.montaza.datum_pocetka, mod.days); p.montaza.datum_zavrsetka = addDays(p.montaza.datum_zavrsetka, mod.days); break;
        case 'set_start': {
          const prevDur = diffDays(p.montaza.datum_pocetka, p.montaza.datum_zavrsetka) || 0;
          p.montaza.datum_pocetka = mod.newStart;
          if (prevDur >= 0) {
            const newEnd = addDays(mod.newStart, prevDur);
            p.montaza.datum_zavrsetka = newEnd;
          }
          break;
        }
        case 'move_end': {
          p.montaza.datum_zavrsetka = mod.newEnd;
          break;
        }
        case 'set_range': {
          p.montaza.datum_pocetka = mod.start;
          p.montaza.datum_zavrsetka = mod.end;
          break;
        }
        case 'set_duration': {
          const currentStart = p.montaza.datum_pocetka;
          if (currentStart && Number.isFinite(mod.days)) {
            p.montaza.datum_zavrsetka = addDays(currentStart, mod.days - 1);
          }
          break;
        }
        case 'update_person': p.montaza.osoba = mod.new_value; break;
        default: break;
      }
    }
    const nh = jsonHistory.slice(0, historyIndex+1); nh.push(cur); setJsonHistory(nh); setHistoryIndex(nh.length-1);
  }, [ganttJson, jsonHistory, historyIndex]);
  const canUndo = historyIndex>0, canRedo = historyIndex<jsonHistory.length-1;
  const onUndo = () => { if (canUndo) setHistoryIndex(historyIndex-1); };
  const onRedo = () => { if (canRedo) setHistoryIndex(historyIndex+1); };
  const activeLine = useMemo(()=>{ const p = ganttJson.pozicije.find(x=>x.id===activeLineId); if(!p) return null; return { id:p.id, pozicija_id:p.id, label:p.naziv, start:p.montaza.datum_pocetka, end:p.montaza.datum_zavrsetka, duration_days: diffDays(p.montaza.datum_pocetka, p.montaza.datum_zavrsetka)+1, osoba:p.montaza.osoba, opis:p.montaza.opis }; }, [activeLineId, ganttJson]);
  // Voice recognition (browser Web Speech API)
  useEffect(() => {
    if (!agent.isListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'hr-HR';
    const onresult = (e) => {
      let interim = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript; else interim += res[0].transcript;
      }
      if (interim) { 
        agent.setTranscript(interim);
        // Log live transcript
        if (interim.trim()) {
          log(`ðŸŽ¤ LIVE: ${interim}`);
        }
      }
      if (finalText) {
        // Log final recognized text
        log(`âœ… Prepoznato: "${finalText}"`);
      
        const t = finalText.trim().toLowerCase();
        if (fallbackOpen) {
          if (/^prijedlog\\s*[123]$/.test(t)) { const n=parseInt((t.match(/\\d/)[0]),10)-1; const sug=fallbackSuggestions[n]; if(sug){ runSuggestion(sug);} return; }
          if (/^(zatvori|odustani|prekini)$/.test(t)) { 
            setFallbackOpen(false); 
            setSuperFocus(false); 
            log('Chat zatvoren glasovno - povratak na glasovni mod');
            
            // Reset voice session
            try {
              agent.stopListening();
              setTimeout(() => {
                agent.startListening();
                log('Voice session resetovan - spreman za nove komande');
              }, 300);
            } catch (e) {
              log(`Greška pri reset voice session: ${e.message}`);
            }
            return; 
          }
          if (/^potvrdi\\s+sve\\s+izmjene$/.test(t)) { 
            persistQueuedChanges(); 
            setFallbackOpen(false); 
            setSuperFocus(false); 
            log('Chat zatvorovan após potvrda sve - povratak na glasovni mod');
            
            // Reset voice session
            try {
              agent.stopListening();
              setTimeout(() => {
                agent.startListening();
                log('Voice session resetovan - spreman za nove komande');
              }, 300);
            } catch (e) {
              log(`Greška pri reset voice session: ${e.message}`);
            }
            return; 
          }
          setFallbackChat(c=>[...c,{role:'user',text:t}]); setFallbackClarification(t); try{ fallbackInputRef.current?.focus(); }catch{};
          return;
        }
        // Wake word
        if (!focusMode && /\bagent\b/.test(t)) {
          setFocusMode(true);
          // Add to console
          log('ðŸŽ¯ Focus Mode aktiviran - Agent je spreman za glasovne naredbe');
          // Add stage to timeline
          const focusStage = {
            id: `focus-${Date.now()}`,
            name: 'Focus Mode aktiviran',
            description: 'Agent je detektirao "agent" wake word',
            icon: 'ðŸŽ¯',
            status: 'completed',
            timestamp: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            params: { wakeWord: 'agent', command: t }
          };
          agent.addStage(focusStage);
          setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 800 } })), 0);
          return;
        }
        if (focusMode) {
          // Add Task modal voice mode: dictate text and confirm/cancel within modal context
          if (showAddTaskModal) {
            if (/\b(potvrdi|spremi|ok|u\s*redu)\b/.test(t)) {
              if (addTaskDraft.trim()) setSavedNotes(n=>[...n, addTaskDraft.trim()]);
              setAddTaskDraft(''); setShowAddTaskModal(false);
              return;
            }
            if (/\b(odustani|ponisti|zatvori|prekini)\b/.test(t)) { setShowAddTaskModal(false); return; }
            if (/(procitaj)\s+mi/.test(t)) { speakNotes(); return; }
            // Scoped input command: "upiÅ¡i ..."
            const m = t.match(/^upi[Å¡s]i\s+(.+)$/);
            if (m && m[1]) {
              const payload = m[1].trim();
              if (payload) setAddTaskDraft(prev => (prev ? prev + ' ' : '') + payload);
            }
            return;
          }
          // Voice confirm/cancel when pending actions exist
          if (pendingActions.length > 0) {
            if (/\b(potvrdi|primjeni|primijeni|da|okej|ok|u\s*redu)\b/.test(t)) {
              confirmAction(pendingActions[0]);
              return;
            }
            if (/\b(odustani|poništi|ponisti|ne)\b/.test(t)) {
              // Complete exit: cancel action + exit focus + close chats + reset agent
              if (pendingActions.length > 0) {
                cancelAction(pendingActions[0].id);
              }
              
              // Exit focus mode
              setFocusMode(false);
              setSuperFocus(false);
              setAliasByLine({});
              setLineByAlias({});
              nextAliasIndexRef.current = 0;
              
              // Close all chats
              setFallbackOpen(false);
              setMatrixChatActive(false);
              
              // Stop listening
              try { 
                agent.stopListening(); 
                agent.resetAgent(); // Clear console/stages
              } catch {}
              
              log('❌ Kompletno poništeno - izašao iz focus moda i zatvoreni chatovi');
              return;
            }
          }
          
          // Global cancel handler - works even when no pending actions
          if (/\b(odustani|poništi|ponisti|ne)\b/.test(t) && focusMode) {
            // Exit focus mode completely
            setFocusMode(false);
            setSuperFocus(false);
            setAliasByLine({});
            setLineByAlias({});
            nextAliasIndexRef.current = 0;
            
            // Close all chats
            setFallbackOpen(false);
            setMatrixChatActive(false);
            
            // Stop listening and reset agent
            try { 
              agent.stopListening(); 
              agent.resetAgent(); // Clear console/stages
            } catch {}
            
            log('❌ Kompletno poništeno - izašao iz focus moda i zatvoreni chatovi');
            return;
          }
          
          if (/\bdalje\b/.test(t)) {
            // Add exit focus stage
            const exitStage = {
              id: `exit-focus-${Date.now()}`,
              name: 'Izlazim iz Focus Mode',
              description: 'Agent je detektirao "dalje" - spremam promjene',
              icon: 'ðŸ',
              status: 'completed',
              timestamp: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              params: { command: t, pendingActions: pendingActions.length }
            };
            agent.addStage(exitStage);
            
            // Add to console
            log('ðŸ Izlazim iz Focus Mode - Spremljene promjene');
            
            // Persist and exit focus
            persistQueuedChanges();
            setFocusMode(false);
            setAliasByLine({}); setLineByAlias({}); nextAliasIndexRef.current = 0;
            return;
          }
          // Try parse command
          const year = (ganttJson?.pozicije?.[0]?.montaza?.datum_pocetka || '2025-01-01').slice(0,4);
          // Add command parsing stage
          const parseStage = {
            id: `parse-${Date.now()}`,
            name: 'Parsiranje glasovne naredbe',
            description: `Analiziram naredbu: "${t}"`,
            icon: 'ðŸ§ ',
            status: 'active',
            timestamp: new Date().toISOString(),
            params: { command: t, focusMode: true }
          };
          agent.addStage(parseStage);
          // Prefer GPT tool-calling endpoint; fallback to local parser
          (async () => {
            try {
              // Enhanced payload with position details for better LLM understanding
              const pozicijeForLLM = (ganttJson?.pozicije || []).map(pos => ({
                id: pos.id,
                naziv: pos.naziv,
                alias: Object.keys(lineByAlias).find(key => lineByAlias[key] === pos.id) || null,
                datum_pocetka: pos.montaza.datum_pocetka,
                datum_zavrsetka: pos.montaza.datum_zavrsetka,
                trajanje_dana: diffDays(pos.montaza.datum_pocetka, pos.montaza.datum_zavrsetka) + 1,
                osoba: pos.montaza.osoba,
                opis: pos.montaza.opis,
                status: pos.status || 'aktivna'
              }));
              
              const payload = {
                transcript: t,
                context: {
                  aliasToLine: lineByAlias,
                  activeLineId,
                  defaultYear: Number(year),
                  nowISO: new Date().toISOString().slice(0,10),
                  pozicije: pozicijeForLLM, // Complete position data for fuzzy matching
                  projektNaziv: ganttJson?.project?.name || 'Nepoznat projekt',
                  ukupnoPozicija: pozicijeForLLM.length,
                  // Context hints for LLM reasoning
                  hints: {
                    fuzzyMatching: true,
                    canInferPositions: true,
                    supportsBatchOperations: true,
                    supportsDateParsing: true
                  }
                }
              };
              
              console.log('🔍 PAYLOAD ŠALJE:', JSON.stringify(payload, null, 2));
              try { log(`[API] → /api/gva/voice-intent payload: ${JSON.stringify({ transcript: t, ctx:{ aliases:Object.keys(lineByAlias||{}).length, active: activeLineId, defaultYear: Number(year) } })}`); } catch {}
              const r = await fetch('/api/gva/voice-intent', {
                method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
              });
              try { log(`[API] ← /api/gva/voice-intent status: ${r.status}`); } catch {}
              let j = null;
              try {
                if (!r.ok) {
                  const raw = await r.text();
                  try { const parsed = raw ? JSON.parse(raw) : null; log(`[API] ← error body: ${raw || '(empty)'}`); } catch { log(`[API] ← error body: ${raw || '(empty)'}`); }
                  throw new Error(`HTTP ${r.status}`);
                }
                const raw = await r.text();
                j = raw ? JSON.parse(raw) : null;
                console.log('📥 ODGOVOR BACKEND:', j);
              } catch (e) {
                try { log(`[API:ERR] parsing response JSON: ${e?.message || String(e)}`); } catch {}
                throw e;
              }
              try { log(`[API] ← result: ${j?.type || 'none'} ${j?.type==='actions'?`(${(j.actions||[]).length})`:''}`); } catch {}

              // Mark parse stage as completed
              agent.setProcessStages(prev => prev.map(stage => stage.id === parseStage.id
                ? { ...stage, status: 'completed', completedAt: new Date().toISOString(), result: j }
                : stage));

              if (j?.type === 'clarify') {
                triggerMatrixChat(j.question);
                setFallbackSuggestions([]);
                setFallbackChat([{ role: 'assistant', text: j.question }]);
                setFallbackClarification('');
                return;
              }

              // === KEY CHANGE: Structured response handling (MEGA SPEC Section 9) ===
              if (j?.type === 'actions' && Array.isArray(j.actions) && j.actions.length > 0) {
                
                const newPendingActions = [];

                // Process each action returned by API (usually one, but supports multiple)
                for (const apiAction of j.actions) {
                    const { type, targets, params, client_action_id } = apiAction;

                    // 1. Global actions (shift_all...)
                    if (['shift_all', 'distribute_chain', 'normative_extend'].includes(type)) {
                        newPendingActions.push({
                            id: client_action_id,
                            client_action_id,
                            type: type,
                            params: params,
                            // Preview mapping
                            days: params.days 
                        });
                        continue;
                    }

                    // 2. Targeted actions (Batch - e.g., "KIA7 and 334")
                    // API returns normalized targets (e.g., ["KIA7", "334"])
                    for (const targetAliasNormalized of targets) {
                        const lineId = lineByAlias[targetAliasNormalized];
                        if (!lineId) {
                            log(`[API] Warning: Unknown normalized alias: ${targetAliasNormalized}`);
                            continue;
                        }
                        
                        // Get original alias for display (e.g., "KIA 7")
                        const displayAlias = aliasByLine[lineId] || targetAliasNormalized;

                        const pendingAction = {
                            id: `${client_action_id}-${targetAliasNormalized}`, // Unique ID for frontend
                            client_action_id, // Group ID (for batch confirmation)
                            type: type,
                            alias: displayAlias,
                            lineId: lineId,
                            params: params,
                        };

                        // Parameter mapping for PREVIEW (Ghost)
                        if (type === 'set_status') {
                            pendingAction.status = params.status;
                        } else if (type === 'move_start' || type === 'set_start' || type === 'move_end' || type === 'set_end') {
                            pendingAction.iso = params.date;
                        } else if (type === 'set_range') {
                            pendingAction.start = params.start;
                            pendingAction.end = params.end;
                        } else if (type === 'set_duration') {
                            pendingAction.days = params.duration_days;
                        } else if (type === 'shift') {
                            // Handle 'shift' - calculate new date for PREVIEW
                            try {
                                const pos = (ganttJson?.pozicije || []).find(p => p.id === lineId);
                                const curStart = pos?.montaza?.datum_pocetka;
                                if (curStart && Number.isFinite(params.days)) {
                                    const duration = diffDays(pos.montaza.datum_pocetka, pos.montaza.datum_zavrsetka) || 0;
                                    const newStart = addDays(curStart, params.days);
                                    // Set ISO for GanttCanvas ghost preview
                                    pendingAction.iso = newStart; 
                                    // Also calculate end for more complete preview
                                    pendingAction.endIso = addDays(newStart, duration);
                                }
                            } catch (e) {
                                continue;
                            }
                        }

                        newPendingActions.push(pendingAction);
                    }
                }

                if (newPendingActions.length > 0) {
                    // Add all new actions to the queue
                    setPendingActions(q => [...newPendingActions, ...q]);
                }
                return; // Successfully processed
              }

              // Fallback to local parser
              const parsed = parseCroatianCommand(t, { aliasToLine: lineByAlias, defaultYear: Number(year) });
              if (parsed) {
                agent.addStage({ id:`queue-${Date.now()}`, name:'Dodajem u red čekanja', description:`Akcija "${parsed.type}" za ${parsed.alias}`, icon:'🧩', status:'completed', timestamp:new Date().toISOString(), completedAt:new Date().toISOString(), params:parsed });
                
                if (parsed.type === 'apply_normative') {
                  const ghosts = buildGhostActionsForNormative(parsed.profile || 1, { 
                    pozicije: ganttJson?.pozicije || [], 
                    aliasByLine: lineByAlias 
                  });
                  addGhostActionsBatched(ghosts, setPendingActions);
                } else if (parsed.type === 'shift_all') {
                  const ghosts = buildGhostActionsForShiftAll(parsed.days || 1, { 
                    pozicije: ganttJson?.pozicije || [], 
                    aliasByLine: lineByAlias 
                  });
                  addGhostActionsBatched(ghosts, setPendingActions);
                } else if (parsed.type === 'distribute_chain') {
                  const ghosts = buildGhostActionsForDistributeChain({ 
                    pozicije: ganttJson?.pozicije || [], 
                    aliasByLine: lineByAlias 
                  });
                  addGhostActionsBatched(ghosts, setPendingActions);
                } else if (parsed.type === 'batch_operations') {
                  // Handle multiple operations from batch command
                  log(`🔄 Batch operacija: ${parsed.operations.length} akcija`);
                  const batchActions = parsed.operations.map((op, idx) => {
                    const pos = (ganttJson?.pozicije || []).find(p => p.id === op.lineId);
                    const curStart = pos?.montaza?.datum_pocetka;
                    if (curStart && Number.isFinite(op.days)) {
                      const target = addDays(curStart, op.days);
                      return { 
                        id: `batch-${Date.now()}-${idx}`, 
                        type: 'move_start', 
                        alias: op.alias, 
                        lineId: op.lineId, 
                        iso: target 
                      };
                    }
                    return null;
                  }).filter(Boolean);
                  
                  addGhostActionsBatched(batchActions, setPendingActions);
                } else if (parsed.type === 'extend_all_duration') {
                  // Extend duration of all positions by N days
                  log(`⏰ Produžavam trajanje svih pozicija za ${parsed.days} dana`);
                  const extendActions = (ganttJson?.pozicije || []).map((pos, idx) => {
                    const currentEnd = pos.montaza.datum_zavrsetka;
                    const newEnd = addDays(currentEnd, parsed.days);
                    const alias = Object.keys(lineByAlias).find(key => lineByAlias[key] === pos.id) || pos.id;
                    return {
                      id: `extend-${Date.now()}-${idx}`,
                      type: 'move_end',
                      alias: alias,
                      lineId: pos.id,
                      iso: newEnd
                    };
                  });
                  
                  addGhostActionsBatched(extendActions, setPendingActions);
                } else if (parsed.type === 'move_unfinished_to_date') {
                  // Move unfinished positions to specific date
                  log(`📅 Premještam nezavršene pozicije na datum ${parsed.iso}`);
                  const unfinishedActions = (ganttJson?.pozicije || [])
                    .filter(pos => {
                      const endDate = new Date(pos.montaza.datum_zavrsetka + 'T00:00:00Z');
                      const today = new Date();
                      return endDate > today; // Unfinished if end date is in future
                    })
                    .map((pos, idx) => {
                      const alias = Object.keys(lineByAlias).find(key => lineByAlias[key] === pos.id) || pos.id;
                      return {
                        id: `unfinished-${Date.now()}-${idx}`,
                        type: 'move_start',
                        alias: alias,
                        lineId: pos.id,
                        iso: parsed.iso
                      };
                    });
                  
                  addGhostActionsBatched(unfinishedActions, setPendingActions);
                } else {
                  let normalized = { id: `${Date.now()}`, type: parsed.type, alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso };
                  if (parsed.type === 'shift') {
                    try { const pos=(ganttJson?.pozicije||[]).find(p=>p.id===parsed.lineId); const curStart=pos?.montaza?.datum_pocetka; if(curStart&&Number.isFinite(parsed.days)){ const target=addDays(curStart, parsed.days); normalized={ id:`${Date.now()}`, type:'move_start', alias:parsed.alias, lineId:parsed.lineId, iso:target }; } } catch {}
                  } else if (parsed.type === 'normative_extend') { normalized = { id:`${Date.now()}`, type:'normative_extend', days: parsed.days }; }
                  setPendingActions((q) => [normalized, ...q].slice(0, 5));
                }
              } else {
                log(`Naredba nije prepoznata: "${t}"`);
              }
            } catch (err) {
              try { log(`[API:ERR] voice-intent: ${err?.message || String(err)}`); } catch {}
              // On endpoint/network error → try local parser
              const parsed = parseCroatianCommand(t, { aliasToLine: lineByAlias, defaultYear: Number(year) });
              if (parsed) {
                const normalized = { id: `${Date.now()}`, type: parsed.type, alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso };
                setPendingActions((q) => [normalized, ...q].slice(0, 5));
              } else {
                log(`Naredba nije prepoznata: "${t}"`);
              }
            }
          })();
          return;
          
          const parsed = parseCroatianCommand(t, { aliasToLine: lineByAlias, defaultYear: Number(year) });
          if (parsed) {
            // Log successful parsing
            log(`âœ… Naredba parsirana: ${parsed.type} za ${parsed.alias} â†’ ${parsed.iso}`);
            
            // Update stage as completed
            agent.setProcessStages(prev => 
              prev.map(stage => 
                stage.id === parseStage.id 
                  ? { ...stage, status: 'completed', completedAt: new Date().toISOString(), result: parsed }
                  : stage
              )
            );
            
            // Add action queue stage
            const queueStage = {
              id: `queue-${Date.now()}`,
              name: 'Dodajem u red Äekanja',
              description: `Akcija "${parsed.type}" za ${parsed.alias}`,
              icon: 'â³',
              status: 'completed',
              timestamp: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              params: parsed
            };
            agent.addStage(queueStage);
            
            // Handle global and local actions
            if (parsed.type === 'exit_focus') {
              try { agent.stopListening(); } catch {}
              setFocusMode(false); setAliasByLine({}); setLineByAlias({}); nextAliasIndexRef.current=0; return;
            }
            if (parsed.type === 'add_task_open') { setShowAddTaskModal(true); return; }
            if (parsed.type === 'image_popup') { setShowPDFPopup(true); return; }
            if (parsed.type === 'cancel_pending') { 
              setPendingActions([]); 
              log('🗑️ Sve čekajuće akcije poništene');
              return; 
            }
            if (parsed.type === 'analyze_document') { 
              // Activate Matrix chat for document analysis
              triggerMatrixChat(`analiza ${parsed.target}`);
              return; 
            }
            if (parsed.type === 'apply_normative_profile') {
              // Run structured normative profile
              runSuggestion({ tool: 'apply_normative_profile', params: parsed });
              return;
            }
            if (parsed.type === 'show_standard_plan') {
              // Run standard plan distribution
              runSuggestion({ tool: 'show_standard_plan', params: parsed });
              return;
            }
            if (parsed.type === 'cancel_pending') {
              // Clear all pending actions
              setPendingActions([]);
              log('🚫 Sve naredbe poništene');
              return;
            }
            if (parsed.type === 'modal_save') { if (showAddTaskModal) { if (addTaskDraft.trim()) setSavedNotes(n=>[...n, addTaskDraft.trim()]); setAddTaskDraft(''); setShowAddTaskModal(false); } return; }
            if (parsed.type === 'modal_cancel') { if (showAddTaskModal) setShowAddTaskModal(false); return; }
            if (parsed.type === 'add_task_append') { if (showAddTaskModal && parsed.text) setAddTaskDraft(prev => (prev ? prev + ' ' : '') + parsed.text); return; }
            if (parsed.type === 'tts_read') { speakNotes(); return; }
            let normalized = { id: `${Date.now()}`, type: parsed.type, alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso };
            if (parsed.type === 'shift') {
              try {
                const pos = (ganttJson?.pozicije || []).find(p => p.id === parsed.lineId);
                const curStart = pos?.montaza?.datum_pocetka;
                if (curStart && Number.isFinite(parsed.days)) {
                  const target = addDays(curStart, parsed.days);
                  normalized = { id: `${Date.now()}`, type: 'move_start', alias: parsed.alias, lineId: parsed.lineId, iso: target };
                }
              } catch {}
            } else if (parsed.type === 'shift_all') {
              normalized = { id: `${Date.now()}`, type: 'shift_all', days: parsed.days };
            } else if (parsed.type === 'distribute_chain') {
              normalized = { id: `${Date.now()}`, type: 'distribute_chain' };
            } else if (parsed.type === 'normative_extend') {
              normalized = { id: `${Date.now()}`, type: 'normative_extend', days: parsed.days };
            } else if (parsed.type === 'apply_normative_profile') {
              normalized = { id: `${Date.now()}`, ...parsed };
            } else if (parsed.type === 'show_standard_plan') {
              normalized = { id: `${Date.now()}`, ...parsed };
            }
            setPendingActions((q) => [normalized, ...q].slice(0, 5));
          } else {
            // Log failed parsing
            log(`âŒ Naredba nije prepoznata: "${t}"`);
            
            // Update stage as failed
            agent.setProcessStages(prev => 
              prev.map(stage => 
                stage.id === parseStage.id 
                  ? { ...stage, status: 'failed', completedAt: new Date().toISOString(), error: 'Naredba nije prepoznata' }
                  : stage
              )
            );
            // LLM fallback suggestions
            if (enableLLMFallback && agentSource === 'local') {
              (async () => {
                try {
                  triggerMatrixChat(`Nepoznata naredba: "${cmd}"`);
                  setFallbackLoading(true);
                  const context = {
                    currentDate: new Date().toISOString().slice(0,10),
                    availableAliases: Object.keys(lineByAlias || {})
                  };
                  const sys = 'Vrati JSON strogo ovog oblika: {"suggestions":[{"tool":"...","params":{...},"confidence":0.0,"ask":"(ako je potrebna TOCNO jedna najnejasnija varijabla ï¿½ postavi kratko pitanje na hrvatskom; inace izostavi)"},...]}.' +
                    ' Alati: move_start{alias:string,date:YYYY-MM-DD}, shift{alias:(string|array),days:number}, shift_all{days:number}, distribute_chain{}, normative_extend{days:number}, add_task_open{}, image_popup{}, analyze_document{target:petak|subota|sve}, apply_normative_profile{profile:{id:NORMATIV_1|NORMATIV_2|CUSTOM,offsets:{start_days:number,end_days:number}},scope:{targets:array,unit:calendar_days|work_days},execution_mode:preview|commit}, show_standard_plan{targets:array,gap_days:number,execution_mode:preview|commit}, cancel_pending{}.' +
                    ' Normaliziraj alias: ukloni razmake ("pr 10"?"PR10"), velika slova. Ako korisnik navede viï¿½e aliasa, koristi polje alias:["PR10","PR12"].' +
                    ' Izvedi inferenciju gdje moï¿½eï¿½ i postavi samo JEDNO pitanje (ask) za najnejasniju varijablu.';
                  const user = `Kontekst: ${JSON.stringify(context)}\nNaredba: ${t}`;
                  const text = await chatCompletions(localAgentUrl, [ { role:'system', content: sys }, { role:'user', content: user } ]);
                  let suggestions = [];
                  try { const obj = JSON.parse(text); suggestions = Array.isArray(obj?.suggestions) ? obj.suggestions.slice(0,3) : []; } catch {}
                  setFallbackSuggestions(suggestions);
                  setSuperFocus(true);
                } catch (e) {
                  log(`LLM fallback error: ${e?.message || String(e)}`);
                } finally {
                  setFallbackLoading(false);
                }
              })();
            }
          }
        }
      }
    };
    const onerror = () => {};
    rec.onresult = onresult; rec.onerror = onerror; rec.start();
    return () => { try { rec.stop(); } catch {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.isListening, focusMode, lineByAlias, ganttJson, pendingActions]);
  // Auto-enable listening for quick confirm while in Focus Mode with pending actions
  useEffect(() => {
    try {
      if (focusMode && pendingActions.length > 0 && !agent.isListening) {
        agent.startListening();
      }
    } catch {}
  }, [focusMode, pendingActions, agent]);
  async function persistQueuedChanges() {
    if (!pendingPatches.length) return;
    try {
      // Attempt persistence via ProjectDataService if available in runtime
      const svcMod = await import('../../../store/ProjectDataService.js').catch(() => null);
      if (svcMod && svcMod.default) {
        const svc = new svcMod.default();
        for (const p of pendingPatches) {
          // This demo lacks mapping to unified schema. Best effort: find any active project containing positionId
          const data = await svc.loadAllProjects();
          let foundProjIndex = -1, foundPosIndex = -1, projId = null;
          if (Array.isArray(data?.projects)) {
            for (let i=0;i<data.projects.length;i++) {
              const posIndex = (data.projects[i].positions||[]).findIndex(pos=>pos.id===p.positionId);
              if (posIndex!==-1) { foundProjIndex=i; foundPosIndex=posIndex; projId = data.projects[i].id; break; }
            }
          }
          if (foundProjIndex!==-1) {
            const ptr = `/projects/${foundProjIndex}/positions/${foundPosIndex}/processes/0/plannedStart`;
            await svc.savePartialUpdate([{ op:'replace', path: ptr, value: p.newStart }]);
          }
        }
      }
      setPendingPatches([]);
      log('âœ… Spremanje promjena dovrÅ¡eno');
    } catch (e) {
      console.warn('Persist queued changes failed (demo environment):', e?.message);
      log('âš ï¸  Spremanje promjena nije uspjelo (demo)');
    }
  }
  const confirmAction = async (action) => {
    // Auto-close Matrix chat when action is confirmed
    if (matrixChatActive) {
      setMatrixChatActive(false);
      log('Matrix chat zatvoren nakon potvrde');
    }
    
    // Auto-close chat fallback when action is confirmed
    if (fallbackOpen) {
      setFallbackOpen(false);
      setSuperFocus(false);
      log('Chat zatvorovan após potvrda - povratak na glasovni mod');
      
      // Reset voice session like "agent" command
      try {
        agent.stopListening();
        setTimeout(() => {
          agent.startListening();
          log('Voice session resetovan - spreman za nove komande');
        }, 300);
      } catch (e) {
        log(`Greška pri reset voice session: ${e.message}`);
      }
    }

    // Add confirmation stage to timeline
    const confirmStage = {
      id: `confirm-${Date.now()}`,
      name: 'Potvrda korisnika',
      description: `PokreÄ‡em akciju "${action.type}" za ${action.alias}`,
      icon: 'âœ…',
      status: 'active',
      timestamp: new Date().toISOString(),
      params: action
    };
    agent.addStage(confirmStage);
    
    setSuperFocus(true);
    setFlowActive(0); setFlowDone(-1); log('ðŸš€ Agent pokrenuo izvrÅ¡avanje zadatka...');
    // Step 0 â†’ 1 (Thinking â†’ Research)
    setTimeout(()=>{ 
      setFlowDone(0); setFlowActive(1); log('[RazmiÅ¡ljanje] Analiziram zahtjev...');
      // Update confirmation stage as completed
      agent.setProcessStages(prev => 
        prev.map(stage => 
          stage.id === confirmStage.id 
            ? { ...stage, status: 'completed', completedAt: new Date().toISOString() }
            : stage
        )
      );
    }, 150);
    // Animate background highlight to the target bar
    const selector = `[data-bar-id="${action.lineId}"]`;
    window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { selector, durationMs: 1200 } }));
    // Simulate Research/Processing flow
    setTimeout(()=>{ 
      setFlowDone(1); setFlowActive(2); log('[IstraÅ¾ivanje] Prikupljam kontekst...');
      // Add research stage
      const researchStage = {
        id: `research-${Date.now()}`,
        name: 'IstraÅ¾ivanje konteksta',
        description: `Analiziram postojeÄ‡e stanje pozicije ${action.alias}`,
        icon: 'ðŸ“Š',
        status: 'active',
        timestamp: new Date().toISOString(),
        params: { lineId: action.lineId, alias: action.alias }
      };
      agent.addStage(researchStage);
    }, 450);
    
    setTimeout(()=>{ 
      setFlowDone(2); setFlowActive(3); log('[Obrada] Primjenjujem promjenu na ganttu...');
      
      // Update research stage as completed and add processing stage
      agent.setProcessStages(prev => 
        prev.map(stage => 
          stage.id.startsWith('research-') && stage.status === 'active'
            ? { ...stage, status: 'completed', completedAt: new Date().toISOString() }
            : stage
        )
      );
      // Handle global actions immediately
      if (action.type === 'shift_all' || action.type === 'distribute_chain' || action.type === 'normative_extend') {
        let cur = JSON.parse(JSON.stringify(ganttJson));
        if (action.type === 'shift_all') {
          cur.pozicije.forEach(p => { p.montaza.datum_pocetka = addDays(p.montaza.datum_pocetka, action.days); p.montaza.datum_zavrsetka = addDays(p.montaza.datum_zavrsetka, action.days); });
        } else if (action.type === 'distribute_chain') {
          const arr = cur.pozicije.slice().sort((a,b)=> (a.montaza.datum_pocetka||'').localeCompare(b.montaza.datum_pocetka||''));
          for (let i=1;i<arr.length;i++) { const prev = arr[i-1].montaza; const p = arr[i].montaza; const dur = diffDays(p.datum_pocetka, p.datum_zavrsetka) || 0; const newStart = addDays(prev.datum_zavrsetka, 1); p.datum_pocetka = newStart; p.datum_zavrsetka = addDays(newStart, dur); }
        } else if (action.type === 'normative_extend') {
          cur.pozicije.forEach(p => { p.montaza.datum_zavrsetka = addDays(p.montaza.datum_zavrsetka, action.days || 2); });
        }
        const nh = jsonHistory.slice(0, historyIndex+1); nh.push(cur); setJsonHistory(nh); setHistoryIndex(nh.length-1);
        // Mark processing and skip the single-line path
        const processingStage = { id: `processing-${Date.now()}`, name: 'Primjena promjene', description: 'Globalna operacija primijenjena', icon: 'âš™ï¸', status: 'active', timestamp: new Date().toISOString(), params: action };
        agent.addStage(processingStage);
        
        // CRITICAL FIX: Remove from pending queue for batch actions
        const groupId = action.client_action_id || action.id;
        if (groupId) {
          setPendingActions(prev => prev.filter(a => (a.client_action_id || a.id) !== groupId));
          log(`✅ Batch operacija završena: ${action.type}`);
        }
        
        // MATRIX CHAT FIX: Close Matrix Chat for batch operations
        if (matrixChatActive) {
          setMatrixChatActive(false);
          log('Matrix chat zatvoren nakon batch potvrde');
        }
        return;
      }
      
      const processingStage = {
        id: `processing-${Date.now()}`,
        name: 'Primjena promjene',
        description: `AÅ¾uriram datum poÄetka na ${action.iso}`,
        icon: 'ðŸ”„',
        status: 'active',
        timestamp: new Date().toISOString(),
        params: { operation: 'set_start', newStart: action.iso }
      };
      agent.addStage(processingStage);
      
      // Apply local change based on action type
      if (action.type === 'move_start') {
        updateGanttJson({ operation: 'set_start', pozicija_id: action.lineId, newStart: action.iso });
      } else if (action.type === 'move_end') {
        updateGanttJson({ operation: 'move_end', pozicija_id: action.lineId, newEnd: action.iso });
      } else if (action.type === 'set_range') {
        updateGanttJson({ operation: 'set_range', pozicija_id: action.lineId, start: action.start, end: action.end });
      } else if (action.type === 'set_duration') {
        updateGanttJson({ operation: 'set_duration', pozicija_id: action.lineId, days: action.days });
      } else {
        // Fallback for unknown types (move_start)
        updateGanttJson({ operation: 'set_start', pozicija_id: action.lineId, newStart: action.iso });
      }
      // Queue patch for persistence based on action type
      let patchData;
      if (action.type === 'move_start') {
        patchData = { type: 'setStart', positionId: action.lineId, newStart: action.iso };
      } else if (action.type === 'move_end') {
        patchData = { type: 'setEnd', positionId: action.lineId, newEnd: action.iso };
      } else if (action.type === 'set_range') {
        patchData = { type: 'setRange', positionId: action.lineId, start: action.start, end: action.end };
      } else if (action.type === 'set_duration') {
        patchData = { type: 'setDuration', positionId: action.lineId, days: action.days };
      } else {
        // Fallback for unknown types
        patchData = { type: 'setStart', positionId: action.lineId, newStart: action.iso };
      }
      setPendingPatches((p) => [patchData, ...p]);
    }, 900);
    
    setTimeout(()=>{ 
      setFlowDone(3); setFlowActive(4); log('[Validacija] Provjeravam rezultat...');
      
      // Update processing stage as completed and add validation stage
      agent.setProcessStages(prev => 
        prev.map(stage => 
          stage.id.startsWith('processing-') && stage.status === 'active'
            ? { ...stage, status: 'completed', completedAt: new Date().toISOString(), result: { success: true } }
            : stage
        )
      );
      
      const validationStage = {
        id: `validation-${Date.now()}`,
        name: 'Validacija rezultata',
        description: 'Provjera je li promjena uspjeÅ¡no primijenjena',
        icon: 'ðŸ”',
        status: 'active',
        timestamp: new Date().toISOString()
      };
      agent.addStage(validationStage);
    }, 1200);
    
    setTimeout(()=>{ 
      setFlowDone(4); log('âœ… Zadatak zavrÅ¡en.'); setSuperFocus(false);
      
      // Update validation stage as completed
      agent.setProcessStages(prev => 
        prev.map(stage => 
          stage.id.startsWith('validation-') && stage.status === 'active'
            ? { ...stage, status: 'completed', completedAt: new Date().toISOString(), result: 'Promjena uspjeÅ¡no primijenjena' }
            : stage
        )
      );
      
      // Add completion stage
      const completionStage = {
        id: `completion-${Date.now()}`,
        name: 'Zadatak zavrÅ¡en',
        description: `UspjeÅ¡no pomjeren poÄetak za ${action.alias}`,
        icon: 'ðŸŽ‰',
        status: 'completed',
        timestamp: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        result: { positionId: action.lineId, newStart: action.iso, durationMs: 1300 }
      };
      agent.addStage(completionStage);
      
      // Activity card (keep existing functionality)
      const params = [ { key:'alias', value: aliasByLine[action.lineId] || action.alias }, { key:'newStart', value: action.iso } ];
      const resultSnippet = JSON.stringify({ positionId: action.lineId, newStart: action.iso }).slice(0, 120) + '...';
      setActivities((a) => [{ id: action.id, startedAt: Date.now(), title: 'Pomicanje poÄetka procesa', subtitle: `Primjena na ${action.lineId}`, params, resultSnippet, durationMs: 1300 }, ...a].slice(0, 5));
      // === MEGA SPEC: Remove entire batch group from queue ===
      // Remove entire group from queue based on client_action_id
      const groupId = action.client_action_id || action.id;
      if (groupId) {
        const idsToRemove = new Set();
        pendingActions.forEach(a => {
          if ((a.client_action_id || a.id) === groupId) {
            idsToRemove.add(a.id);
          }
        });
        setPendingActions((q) => q.filter(a => !idsToRemove.has(a.id)));
      } else {
        // Fallback for single action
        setPendingActions((q) => q.filter(a => a.id !== action.id));
      }
    }, 1500);
  };
  const cancelAction = (id) => setPendingActions((q) => q.filter(a => a.id !== id));
  const isFocusOn = focusMode;
  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between items-center p-4 px-8">
        <div className="flex items-center gap-4">
          <Command className="text-accent w-6 h-6"/>
          <h1 className="text-xl font-bold text-primary">Gantt Agent Workspace</h1>
          <span className="input-bg px-3 py-1 rounded-full text-sm text-secondary border border-theme">{ganttJson.project.name}</span>
        </div>
        <div className="flex items-center gap-4">
          {(() => {
            const groups = {};
            for (const a of pendingActions) {
              const g = a.client_action_id || a.id;
              groups[g] = (groups[g] || 0) + 1;
            }
            const groupList = Object.entries(groups).map(([id, count]) => ({ id, count }));
            return groupList.length > 0 ? (
              <div className="flex gap-2">
                {groupList.map(g => (
                  <button
                    key={g.id}
                    className="text-xs px-2 py-1 rounded border bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors"
                    onClick={async () => {
                      const batch = pendingActions.filter(a => (a.client_action_id || a.id) === g.id);
                      for (const a of batch) {
                        await confirmAction(a);
                      }
                    }}
                  >
                    Potvrdi sve ({g.count})
                  </button>
                ))}
              </div>
            ) : (
              <div className={`text-xs px-2 py-1 rounded-full ${isFocusOn ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'input-bg text-subtle border border-theme'}`}>{isFocusOn ? 'FOCUS MODE' : 'IDLE'}</div>
            );
          })()}
          {(focusMode || superFocus) && (
            <div className="flex items-center gap-2">
              {/* Focus Mode Status */}
              <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-amber-800 font-medium">Focus Mode Aktivan</span>
              </div>
              
              {/* Voice Control */}
              <button
                onClick={agent.isListening ? agent.stopListening : agent.startListening}
                className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 ${
                  agent.isListening ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-accent hover:bg-accent/80 text-white'
                }`}
                title={agent.isListening ? 'Zaustavi slušanje' : 'Započni slušanje'}
              >
                {agent.isListening ? 'Stop' : 'Slušaj'}
              </button>

              {/* Exit Button */}
              <button
                onClick={() => {
                  try { agent.stopListening(); } catch {}
                  setSuperFocus(false);
                  setFocusMode(false);
                }}
                className="px-3 py-1.5 rounded border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 text-sm"
                title="Izađi iz focus/superfocus"
              >
                Izađi
              </button>
            </div>
          )}
          <div className="relative">
            <button onClick={()=>setShowGlowSettings(v=>!v)} className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" title="Glow postavke"><Sliders size={18}/></button>
            {showGlowSettings && (
              <div className="absolute right-0 mt-2 w-64 panel p-3 border border-theme rounded-xl shadow-xl z-40">
                <div className="text-sm font-semibold text-primary mb-2">Ambient Glow</div>
                <label className="flex items-center justify-between text-sm mb-2">
                  <span className="text-secondary">UkljuÄen</span>
                  <input type="checkbox" checked={glowEnabled} onChange={(e)=>setGlowEnabled(e.target.checked)} />
                </label>
                <div className="mb-2">
                  <div className="text-xs text-secondary mb-1">Intenzitet: <span className="font-mono">{glowIntensity.toFixed(2)}</span></div>
                  <input type="range" min="0" max="1" step="0.05" value={glowIntensity} onChange={(e)=>setGlowIntensity(parseFloat(e.target.value))} className="w-full" />
                </div>
                <div className="mb-2">
                  <div className="text-xs text-secondary mb-1">Trajanje: <span className="font-mono">{glowDurationMs}ms</span></div>
                  <input type="range" min="100" max="800" step="25" value={glowDurationMs} onChange={(e)=>setGlowDurationMs(parseInt(e.target.value))} className="w-full" />
                </div>
                <div className="mt-3 pt-2 border-t border-theme">
                  <div className="text-sm font-semibold text-primary mb-2">Agent</div>
                  <label className="text-xs text-secondary mb-1">NaÄin komunikacije</label>
                  <select className="w-full border rounded px-2 py-1 text-sm mb-2" value={agentSource} onChange={(e)=>setAgentSource(e.target.value)}>
                    <option value="server">Server (OpenAI)</option>
                    <option value="local">Local LLM</option>
                  </select>
                  {agentSource === 'local' && (
                    <div className="space-y-2">
                      <label className="text-xs text-secondary">Local LLM URL</label>
                      <input className="w-full border rounded px-2 py-1 text-sm" value={localAgentUrl} onChange={(e)=>setLocalAgentUrl(e.target.value)} placeholder="http://192.168.30.12:1234" />
                      <div className="flex items-center justify-between text-xs">
                        <label className="text-secondary">Enable LLM Fallback</label>
                        <input type="checkbox" checked={enableLLMFallback} onChange={(e)=>setEnableLLMFallback(e.target.checked)} />
                      </div>
                      <div>
                        <div className="text-xs text-secondary mb-1">Confidence: <span className="font-mono">{llmThreshold.toFixed(2)}</span></div>
                        <input type="range" min="0.3" max="0.95" step="0.05" value={llmThreshold} onChange={(e)=>setLlmThreshold(parseFloat(e.target.value))} className="w-full" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 text-xs border rounded" onClick={async()=>{
                          try {
                            setLocalPing({ loading: true });
                            const base = String(localAgentUrl || '').replace(/\/+$/,'');
                            const r = await fetch(`${base}/v1/models`, { headers:{ 'accept':'application/json' } });
                            const ct = r.headers.get('content-type') || '';
                            if (!r.ok) throw new Error(`HTTP ${r.status}`);
                            if (!ct.includes('application/json')) {
                              const txt = await r.text();
                              throw new Error(`Non-JSON response: ${txt.slice(0,80)}`);
                            }
                            const j = await r.json();
                            const data = Array.isArray(j?.data) ? j.data : (Array.isArray(j?.models) ? j.models : []);
                            const first = (data[0]?.id) || (data[0]) || null;
                            setLocalPing({ ok:true, models: data.length || 0, model:first });
                          } catch (e) { setLocalPing({ ok:false, error: String(e?.message||e) }); }
                        }}>Ping</button>
                        {localPing?.loading ? (
                          <span className="text-xs text-slate-500">Pingingâ€¦</span>
                        ) : localPing ? (
                          <span className={`text-xs ${localPing.ok? 'text-emerald-600' : 'text-rose-600'}`}>
                            {localPing.ok ? `OK (${localPing.models||0} models)` : `ERR: ${localPing.error||'unknown'}`}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button onClick={()=>cycleTheme()} className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" title="Promijeni stil"><Palette size={20}/></button>
        </div>
      </header>
      {/* Add Task Modal */}
      {/* PDF Popup */}
      <PDFPagePopup 
        isOpen={showPDFPopup}
        onClose={() => setShowPDFPopup(false)}
        pdfUrl={pdfPopupData.url}
        pageNumber={pdfPopupData.pageNumber}
        documentName={pdfPopupData.documentName}
        isListening={agent.isListening}
        onStartListening={() => { try { agent.startListening(); } catch {} }}
        onStopListening={() => { try { agent.stopListening(); } catch {} }}
      />
      {fallbackOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] px-8 pb-6">
          <div className="absolute inset-0" />
          <div className="relative z-10 max-w-[calc(33.333%-1rem)] ml-auto mr-[calc(66.666%+1rem)] panel border border-theme rounded-2xl shadow-2xl p-5 bg-white/95 backdrop-blur-md"
               style={{filter: 'none', backdropFilter: 'blur(8px)'}}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-primary">Asistent (LLM) ï¿½ razjaï¿½njenje naredbe</div>
              <button className="text-xs px-2 py-1 rounded border" onClick={()=>{ setFallbackOpen(false); setSuperFocus(false); }}>Zatvori</button>
            </div>
            {fallbackLoading ? (
              <div className="text-sm text-secondary">Traï¿½im prijedloge...</div>
            ) : (
              <div className="space-y-3">
                {!!fallbackChat.length && (
                  <div className="space-y-1 max-h-32 overflow-auto pr-1">
                    {fallbackChat.map((m,idx)=> (
                      <div key={idx} className={`text-xs ${m.role==='assistant'?'text-primary':'text-secondary'}`}>[{m.role}] {m.text}</div>
                    ))}
                  </div>
                )}
                <div className="space-y-2 max-h-64 overflow-auto pr-1">
                  {fallbackSuggestions.map((sug, i) => (
                    <div key={i} className="border border-theme rounded-lg p-2">
                      <div className="text-xs text-secondary">Prijedlog {i+1} ï¿½ {(sug?.confidence ?? 0).toFixed(2)}</div>
                      <div className="text-sm break-words">{describeSuggestion(sug)}</div>
                      {sug?.ask && (<div className="text-xs text-amber-700 mt-1">Pitanje: {sug.ask}</div>)}
                      <div className="mt-2 flex gap-2">
                        <button className="px-2 py-1 text-xs border rounded" onClick={()=>{
                          try {
                            const v = validateParams(sug?.tool, sug?.params);
                            if (!v.ok) { log(`Prijedlog neispravan: ${v.error}`); return; }
                            const tool = sug.tool; const params = sug.params || {};
                            if (tool === 'move_start') {
                              const aliasKey = String(params.alias||'').toUpperCase();
                              const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
                              setPendingActions(q => [{ id:`${Date.now()}`, type:'move_start', alias:aliasKey, lineId, iso: params.date }, ...q].slice(0,5));
                            } else if (tool === 'shift') {
                              const aliasKey = String(params.alias||'').toUpperCase(); const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
                              try { const pos=(ganttJson?.pozicije||[]).find(p=>p.id===lineId); const curStart=pos?.montaza?.datum_pocetka; if(curStart&&Number.isFinite(params.days)){ const d=new Date(curStart+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+params.days); const iso=d.toISOString().slice(0,10); setPendingActions(q=>[{ id:`${Date.now()}`, type:'move_start', alias:aliasKey, lineId, iso }, ...q].slice(0,5)); } } catch {}
                            } else if (tool === 'shift_all') {
                              setPendingActions(q => [{ id:`${Date.now()}`, type:'shift_all', days: params.days }, ...q].slice(0,5));
                            } else if (tool === 'distribute_chain') {
                              setPendingActions(q => [{ id:`${Date.now()}`, type:'distribute_chain' }, ...q].slice(0,5));
                            } else if (tool === 'normative_extend') {
                              setPendingActions(q => [{ id:`${Date.now()}`, type:'normative_extend', days: params.days }, ...q].slice(0,5));
                            } else if (tool === 'add_task_open') {
                              setShowAddTaskModal(true);
                            } else if (tool === 'image_popup') {
                              setShowPDFPopup(true);
                            }
                            setFallbackOpen(false); setSuperFocus(false);
                            log(`? Pokrecem alat: ${tool}`);
                          } catch (e) { log(`Greï¿½ka: ${e?.message||String(e)}`); }
                        }}>Pokreni</button>
                        {sug?.ask && (
                          <button className="px-2 py-1 text-xs border rounded" onClick={()=>{
                            setFallbackChat(c=>[...c,{role:'assistant',text:sug.ask}]);
                            try { fallbackInputRef.current?.focus(); } catch {} 
                          }}>Pitaj</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-theme">
                  <div className="text-xs text-secondary mb-1">Pojaï¿½njenje</div>
                  <div className="flex gap-2">
                    <input ref={fallbackInputRef} className="flex-1 input-bg border border-theme rounded px-2 py-1 text-sm" value={fallbackClarification} onChange={(e)=>setFallbackClarification(e.target.value)} placeholder="Npr. odaberi prijedlog 2 i za PR5" />
                    <button className={`px-2 py-1 text-xs rounded border ${agent.isListening ? 'bg-rose-500 text-white border-rose-500' : ''}`} onClick={()=>{ agent.isListening ? agent.stopListening() : agent.startListening(); }}>{agent.isListening?'Mic ON':'Mic'}</button>
                    <button className="px-2 py-1 text-xs border rounded" onClick={async()=>{
                      try {
                        setFallbackLoading(true);
                        const context = { suggestions: fallbackSuggestions.map(s=>({tool:s.tool, params:s.params, confidence:s.confidence})) };
                        const sys = 'Vrati tocno jedan JSON: {"tool":"...","params":{...},"confidence":0.0}. ' +
                          ' Normaliziraj alias(e) ("pr 6"?"PR6", lista aliasa dopusti kao polje). Bez objaï¿½njenja.';
                        const user = `Kontekst: ${JSON.stringify(context)}\nPojaï¿½njenje: ${fallbackClarification}`;
                        const text = await chatCompletions(localAgentUrl, [{role:'system',content:sys},{role:'user',content:user}]);
                        const chosen = parseJsonSafe(text);
                        if(!chosen||!chosen.tool){ log('LLM nije vratio valjanu odluku.'); return; }
                        const v = validateParams(chosen.tool, chosen.params); if(!v.ok){ log(`Neispravni parametri: ${v.error}`); return; }
                        const tool=chosen.tool, params=chosen.params||{};
                        if (tool === 'move_start') {
                          const aliasKey = String(params.alias||'').toUpperCase(); const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
                          setPendingActions(q => [{ id:`${Date.now()}`, type:'move_start', alias:aliasKey, lineId, iso: params.date }, ...q].slice(0,5));
                        } else if (tool === 'shift') {
                          const aliasKey = String(params.alias||'').toUpperCase(); const lineId = lineByAlias[aliasKey]; if (!lineId) { log(`Nepoznat alias: ${aliasKey}`); return; }
                          try { const pos=(ganttJson?.pozicije||[]).find(p=>p.id===lineId); const curStart=pos?.montaza?.datum_pocetka; if(curStart&&Number.isFinite(params.days)){ const d=new Date(curStart+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+params.days); const iso=d.toISOString().slice(0,10); setPendingActions(q=>[{ id:`${Date.now()}`, type:'move_start', alias:aliasKey, lineId, iso }, ...q].slice(0,5)); } } catch {}
                        } else if (tool === 'apply_normative') {
                          const ghosts = buildGhostActionsForNormative(params.profile || 1, { 
                            pozicije: ganttJson?.pozicije || [], 
                            aliasByLine: lineByAlias 
                          });
                          addGhostActionsBatched(ghosts, setPendingActions);
                        } else if (tool === 'shift_all') {
                          const ghosts = buildGhostActionsForShiftAll(params.days || 1, { 
                            pozicije: ganttJson?.pozicije || [], 
                            aliasByLine: lineByAlias 
                          });
                          addGhostActionsBatched(ghosts, setPendingActions);
                        } else if (tool === 'distribute_chain') {
                          const ghosts = buildGhostActionsForDistributeChain({ 
                            pozicije: ganttJson?.pozicije || [], 
                            aliasByLine: lineByAlias 
                          });
                          addGhostActionsBatched(ghosts, setPendingActions);
                        } else if (tool === 'normative_extend') {
                          setPendingActions(q => [{ id:`${Date.now()}`, type:'normative_extend', days: params.days }, ...q].slice(0,5));
                        } else if (tool === 'add_task_open') {
                          setShowAddTaskModal(true);
                        } else if (tool === 'image_popup') {
                          setShowPDFPopup(true);
                        }
                        setFallbackOpen(false); setSuperFocus(false);
                        log(`? Pokrecem alat: ${tool}`);
                      } catch(e){ log(`Greï¿½ka klarifikacije: ${e?.message||String(e)}`);} finally { setFallbackLoading(false); }
                    }}>Razrijeï¿½i</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowAddTaskModal(false)} />
          <div className="panel relative z-10 w-[520px] max-w-[92vw] rounded-xl p-4 border border-theme shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary">Dodaj zadatak (diktat)</h3>
              <button
                onClick={() => { agent.isListening ? agent.stopListening() : agent.startListening(); }}
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded text-xs border ${agent.isListening ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-700'}`}
                title={agent.isListening ? 'Zaustavi sluÅ¡anje' : 'ZapoÄni sluÅ¡anje'}
              >
                {agent.isListening ? 'SluÅ¡amâ€¦' : 'SluÅ¡aj'}
              </button>
            </div>
            <p className="text-xs text-secondary mb-2">Recite tekst ili upiÅ¡ite. Naredbe: "proÄitaj mi" za Äitanje, "potvrdi" za spremanje, "poniÅ¡ti" za zatvaranje.</p>
            <textarea ref={addTaskRef} className="w-full h-40 input-bg border border-theme rounded-lg p-2 text-sm" value={addTaskDraft} onChange={(e)=>setAddTaskDraft(e.target.value)} placeholder="Diktirajte ili upiÅ¡ite..." />
            {agent.isListening && (
              <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="truncate">SluÅ¡amâ€¦ recite sadrÅ¾aj, pa "potvrdi"</span>
              </div>
            )}
            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-secondary">Spremljeno: {savedNotes.length}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs rounded border" onClick={()=>setShowAddTaskModal(false)}>Zatvori</button>
                <button className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white" onClick={()=>{ if(addTaskDraft.trim()){ setSavedNotes(n=>[...n, addTaskDraft.trim()]); setAddTaskDraft(''); setShowAddTaskModal(false);} }}>Spremi</button>
                <button className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white" onClick={speakNotes}>ProÄitaj</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={`flex-1 flex gap-4 px-8 overflow-hidden min-h-[560px] transition-all duration-300 ${fallbackOpen ? 'blur-[1px] opacity-80' : ''}`}>
        {/* Main Gantt Canvas - Full Width */}
        <div className="flex-1">
          <GanttCanvas
            ganttJson={ganttJson}
            activeLineId={activeLineId}
            setActiveLineId={setActiveLineId}
            pendingActions={pendingActions}
          />
        </div>

        {/* Chat/Voice Input Panel - Right (1/6 width) */}
        <div className="w-1/6 flex-shrink-0">
          <AgentInteractionPanel
            agent={agent}
            focusMode={focusMode}
            processCommand={(cmd) => {
              // If local agent selected (tab setting) and not in focus mode, route to Local LLM chat
              if (!focusMode && agentSource === 'local') {
                (async () => {
                  try {
                    const base = String(localAgentUrl || '').replace(/\/+$/,'');
                    let model = 'local';
                    try {
                      const mr = await fetch(`${base}/v1/models`);
                      if (mr.ok) {
                        const mj = await mr.json();
                        model = (mj?.data?.[0]?.id) || (Array.isArray(mj?.models) ? (mj.models[0]?.id || model) : model);
                      }
                    } catch {}
                    const r = await fetch(`${base}/v1/chat/completions`, {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({
                        model,
                        messages: [
                          { role:'system', content: 'Ti si asistent za Gantt agenta. Odgovaraj kratko i jasno.' },
                          { role:'user', content: cmd }
                        ]
                      })
                    });
                    const j = await r.json();
                    if (!r.ok) throw new Error(j?.error || 'HTTP error');
                    const text = j?.choices?.[0]?.message?.content?.trim() || '(nema odgovora)';
                    log(`[LOCAL] ✓ ${text}`);
                    agent.setLastResponse({ tts: text });
                  } catch (err) {
                    log(`[LOCAL:ERR] ${err?.message || String(err)}`);
                  }
                })();
                return;
              }
              // In focus mode, route to GPT tool-calling endpoint for strict actions
              if (focusMode) {
                (async () => {
                  try {
                    const defaultYear = Number((ganttJson?.pozicije?.[0]?.montaza?.datum_pocetka || '2025-01-01').slice(0,4));
                    
                    // Enhanced payload with position details for better LLM understanding (same as above)
                    const pozicijeForLLM = (ganttJson?.pozicije || []).map(pos => ({
                      id: pos.id,
                      naziv: pos.naziv,
                      alias: Object.keys(lineByAlias).find(key => lineByAlias[key] === pos.id) || null,
                      datum_pocetka: pos.montaza.datum_pocetka,
                      datum_zavrsetka: pos.montaza.datum_zavrsetka,
                      trajanje_dana: diffDays(pos.montaza.datum_pocetka, pos.montaza.datum_zavrsetka) + 1,
                      osoba: pos.montaza.osoba,
                      opis: pos.montaza.opis,
                      status: pos.status || 'aktivna'
                    }));
                    
                    const payload = {
                      transcript: cmd,
                      context: {
                        aliasToLine: lineByAlias,
                        activeLineId,
                        defaultYear,
                        nowISO: new Date().toISOString().slice(0,10),
                        pozicije: pozicijeForLLM, // Complete position data for fuzzy matching
                        projektNaziv: ganttJson?.project?.name || 'Nepoznat projekt',
                        ukupnoPozicija: pozicijeForLLM.length,
                        // Context hints for LLM reasoning
                        hints: {
                          fuzzyMatching: true,
                          canInferPositions: true,
                          supportsBatchOperations: true,
                          supportsDateParsing: true
                        }
                      }
                    };
                    
                    console.log('🔍 BATCH PAYLOAD ŠALJE:', JSON.stringify(payload, null, 2));
                    try { log(`[API] → /api/gva/voice-intent payload: ${JSON.stringify({ transcript: cmd, ctx:{ aliases:Object.keys(lineByAlias||{}).length, active: activeLineId, defaultYear } })}`); } catch {}
                    const r = await fetch('/api/gva/voice-intent', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    try { log(`[API] ← /api/gva/voice-intent status: ${r.status}`); } catch {}
                    let j = null;
                    try {
                      if (!r.ok) {
                        const raw = await r.text();
                        try { const parsed = raw ? JSON.parse(raw) : null; log(`[API] ← error body: ${raw || '(empty)'}`); } catch { log(`[API] ← error body: ${raw || '(empty)'}`); }
                        throw new Error(`HTTP ${r.status}`);
                      }
                      const raw = await r.text();
                      j = raw ? JSON.parse(raw) : null;
                      console.log('📥 BATCH ODGOVOR BACKEND:', j);
                    } catch (e) {
                      try { log(`[API:ERR] parsing response JSON: ${e?.message || String(e)}`); } catch {}
                      throw e;
                    }
                    try { log(`[API] ← result: ${j?.type || 'none'} ${j?.type==='actions'?`(${(j.actions||[]).length})`:''}`); } catch {}

                    if (j?.type === 'clarify') {
                      triggerMatrixChat(j.question);
                      setFallbackSuggestions([]);
                      setFallbackChat([{ role: 'assistant', text: j.question }] );
                      return;
                    }
                    if (j?.type === 'actions' && Array.isArray(j.actions)) {
                      for (const a of j.actions) {
                        if (a.type === 'move_start') {
                          runSuggestion({ tool: 'move_start', params: { alias: a.alias, date: a.iso } });
                        } else if (a.type === 'shift') {
                          runSuggestion({ tool: 'shift', params: { alias: a.alias, days: a.days } });
                        } else if (a.type === 'apply_normative') {
                          const ghosts = buildGhostActionsForNormative(a.profile || 1, { 
                            pozicije: ganttJson?.pozicije || [], 
                            aliasByLine: lineByAlias 
                          });
                          addGhostActionsBatched(ghosts, setPendingActions);
                        } else if (a.type === 'shift_all') {
                          const ghosts = buildGhostActionsForShiftAll(a.days || 1, { 
                            pozicije: ganttJson?.pozicije || [], 
                            aliasByLine: lineByAlias 
                          });
                          addGhostActionsBatched(ghosts, setPendingActions);
                        } else if (a.type === 'distribute_chain') {
                          const ghosts = buildGhostActionsForDistributeChain({ 
                            pozicije: ganttJson?.pozicije || [], 
                            aliasByLine: lineByAlias 
                          });
                          addGhostActionsBatched(ghosts, setPendingActions);
                        } else if (a.type === 'normative_extend') {
                          runSuggestion({ tool: 'normative_extend', params: { days: a.days } });
                        } else if (a.type === 'add_task_open' || a.type === 'image_popup') {
                          runSuggestion({ tool: a.type, params: {} });
                        }
                      }
                      return;
                    }

                    // Fallback to local parser if no tool calls
                    const parsed = parseCroatianCommand(cmd, { aliasToLine: lineByAlias, defaultYear });
                    if (parsed) {
                      const action = { id: `${Date.now()}`, type: parsed.type, alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso };
                      setPendingActions((q) => [action, ...q].slice(0, 5));
                    } else {
                      log(`Naredba nije prepoznata: "${cmd}"`);
                    }
                  } catch (err) {
                    try { log(`[API:ERR] voice-intent: ${err?.message || String(err)}`); } catch {}
                    // Network/endpoint error – fallback to local parser
                    const defaultYear = Number((ganttJson?.pozicije?.[0]?.montaza?.datum_pocetka || '2025-01-01').slice(0,4));
                    const parsed = parseCroatianCommand(cmd, { aliasToLine: lineByAlias, defaultYear });
                    if (parsed) {
                      const action = { id: `${Date.now()}`, type: parsed.type, alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso };
                      setPendingActions((q) => [action, ...q].slice(0, 5));
                    } else {
                      log(`Naredba nije prepoznata: "${cmd}"`);
                    }
                  }
                })();
                return;
              }
              // Fallback to old simulation
              agent.processTextCommand(cmd, updateGanttJson);
            }}
            pendingActions={pendingActions}
            confirmAction={confirmAction}
            cancelAction={cancelAction}
            aliasByLine={aliasByLine}
          />
        </div>
      </div>
      {/* Bottom Panel - Process Carousel + Agent Console + Quick Commands */}
      <div className="px-8 pb-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <ProcessCarousel 
            processStages={agent.processStages} 
            clearStages={agent.resetAgent}
            isHidden={fallbackOpen}
            onStageClick={(stage) => {
              if (stage.document) {
                window.open(stage.document.url, '_blank');
              }
            }}
          />
          <AgentConsole 
            logs={consoleLogs} 
            enableFallback={true}
            matrixChatActive={matrixChatActive}
            onChatFallback={() => {
              log('Matrix chat aktiviran iz Agent Console');
              setMatrixChatActive(true);
            }}
            onMatrixChatClose={() => {
              log('Matrix chat zatvoren');
              setMatrixChatActive(false);
            }}
            onVoiceReset={() => {
              log('Chat zatvoren putem X - resetiranje voice session');
              try {
                agent.stopListening();
                setTimeout(() => {
                  agent.startListening();
                  log('Voice session resetovan - spreman za nove komande');
                }, 300);
              } catch (e) {
                log(`Greška pri reset voice session: ${e.message}`);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}



