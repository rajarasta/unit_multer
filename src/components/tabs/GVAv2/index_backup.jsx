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
import AgentInteractionPanelView from './components/AgentInteractionPanel.jsx';
import { loadProdajaData as loadProdajaDataExternal } from './data/prodaja.js';

import { parseJsonSafe } from './utils/json.js';
import { ymd, fromYmd, addDays, diffDays, rangeDays } from './utils/date.js';

// Import custom hooks
import useGanttAgent from './hooks/useGanttAgent.js';
import { useGanttData } from './hooks/useGanttData.js';
import { useGanttSettings } from './hooks/useGanttSettings.js';

// Import utilities
import { assignAliasToLine, findPositionCodes, calculateDateRange } from './utils/ganttCalculations.js';
import { parseCroatianCommand } from './parser/parseCroatianCommand.js';
// --- JSON helper: safely parse raw model output (handles code fences) ---
// parseJsonSafe moved to utils/json.js
// --- Date helpers (UTC safe) ---
// date helpers moved to utils/date.js`n// --- Load prodaja processes from all_projects JSON ---
// data loader moved to data/prodaja.js
// Initialize with fallback, will be replaced by loaded data
const MOCK_GANTT_JSON = {
  project: { id: 'LOADING', name: 'UÄitavanje podataka...', description: 'UÄitavam procese prodaje iz all_projects datoteke' },
  pozicije: [],
  metadata: { version:'2.0', loading:true }
};
// --- Agent Interaction Panel Component ---
// Agent panel moved to external component
// --- Process Timeline Panel Component ---
import ProcessTimelinePanel from './components/ProcessTimelinePanel.jsx';
// --- Quick Command Cards (right side) ---
import QuickCommandCards from './components/QuickCommandCards.jsx';
// --- Agent simulation ---
function useGanttAgent() {
  const [state, setState] = useState('idle');
  const [isListening, setIsListening] = useState(false);
  const [processStages, setProcessStages] = useState([]);
  const [lastResponse, setLastResponse] = useState(null);
  const [transcript, setTranscript] = useState('');
  const startListening = () => { setIsListening(true); setState('listening'); setTranscript('SluÅ¡am...'); };
  const stopListening = () => { setIsListening(false); if (state==='listening') setState('idle'); setTranscript(''); };
  const processTextCommand = async (command, updateGanttJson) => {
    setState('processing'); setTranscript(`Obrada: "${command}"`);
    // trigger background highlight for context
    window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } }));
    const stages = [
      { id:'nlu', name:'NLU', icon:'ðŸ§ ', status:'active' },
      { id:'ctx', name:'Kontekst', icon:'ðŸ“‹', status:'idle' },
      { id:'plan', name:'Planiranje', icon:'âœï¸', status:'idle' },
      { id:'apply', name:'Primjena', icon:'ðŸ’¾', status:'idle' },
    ];
    setProcessStages(stages);
    const step = (id) => new Promise(r=>setTimeout(()=>{
      setProcessStages(prev=>prev.map((s,i)=> s.id===id?{...s,status:'completed'}: (prev[i-1]?.id===id?{...s,status:'active'}:s)));
      r();
    }, 400));
    await step('nlu'); await step('ctx'); await step('plan');
    let modification=null, responseText='Nisam prepoznao naredbu.';
    const lowerCommand = command.toLowerCase();
    
    // Enhanced prodaja-specific commands
    if (lowerCommand.includes('pomakni') && lowerCommand.includes('prodaja')) {
      // Find first prodaja process ID for demo
      const firstProdajaId = updateGanttJson.ganttJson?.pozicije?.[0]?.id;
      if (firstProdajaId) {
        if (lowerCommand.includes('za 2 dana')) {
          modification={ operation:'shift_date', pozicija_id: firstProdajaId, days:2 };
          responseText=`Pomaknuo sam proces prodaje ${firstProdajaId} za 2 dana unaprijed.`;
        } else if (lowerCommand.includes('za 1 dan')) {
          modification={ operation:'shift_date', pozicija_id: firstProdajaId, days:1 };
          responseText=`Pomaknuo sam proces prodaje ${firstProdajaId} za 1 dan unaprijed.`;
        }
      }
    }
    // Legacy P-001 format for backward compatibility
    else if (lowerCommand.includes('pomakni p-001 za 2 dana')) {
      modification={ operation:'shift_date', pozicija_id:'P-001', days:2 };
      responseText='Pomaknuo sam poziciju P-001 za 2 dana unaprijed.';
    }
    // Enhanced process identification by project name
    else if (lowerCommand.includes('stambena zgrada') && lowerCommand.includes('pomakni')) {
      // Find processes related to "Stambena zgrada"
      const stambenoId = updateGanttJson.ganttJson?.pozicije?.find(p => 
        p.naziv?.toLowerCase().includes('stambena zgrada')
      )?.id;
      if (stambenoId) {
        modification={ operation:'shift_date', pozicija_id: stambenoId, days:1 };
        responseText=`Pomaknuo sam prodaju za Stambenu zgradu za 1 dan unaprijed.`;
      }
    }
    
    if (modification) updateGanttJson(modification);
    await step('apply');
    setTimeout(()=> setProcessStages([]), 1200);
    setLastResponse({ tts: responseText });
    setState('idle'); setTranscript('');
  };
  return { 
    state, isListening, processStages, lastResponse, transcript, 
    startListening, stopListening, 
    setTranscript: (t) => setTranscript(t), 
    setProcessStages: (updater) => setProcessStages(updater),
    addStage: (stage) => setProcessStages(prev => [...prev, stage]),
    processTextCommand, 
    resetAgent: () => {setLastResponse(null); setProcessStages([]); setState('idle');} 
  };
}
// --- Simple Croatian command parser (heuristic) ---
import { parseCroatianCommand } from './parser/parseCroatianCommand.js';

function parseCroatianCommand(text, { aliasToLine, defaultYear }) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  // Pattern: "pomakni poÄetak PR5 na poÄetak <mjeseca>"
  const m = t.match(/pomakni\s+po(?:Ä|c)etak\s+(pr\d+)\s+na\s+(po(?:Ä|c)etak\s+([^.\s]+)\s+mjeseca|([0-9]{4}-[0-9]{2}-[0-9]{2}))/);
  if (m) {
    const alias = m[1].toUpperCase();
    let iso = null;
    if (m[4]) {
      iso = m[4];
    } else {
      const monthTok = (m[2] || '').split(/\s+/).pop();
      const month = resolveMonthToken(monthTok);
      if (month) {
        const y = defaultYear || new Date().getUTCFullYear();
        iso = `${y}-${String(month).padStart(2,'0')}-01`;
      }
    }
    const lineId = aliasToLine[alias];
    if (!lineId || !iso) return null;
    return { type: 'move_start', alias, lineId, iso, confidence: 0.82 };
  }
  // Pattern: "pomakni PR5 za 2 dana" (shift by N days)
  // Accept fillers (pa, ajde, molim te, ok) and verb synonyms (pomakni|makni|pomjeri|premjesti|prebaci)
  // Allow space in alias: "pr 6" ? normalize later
  const s = t.match(/^(?:pa|ajmo|ajde|hajde|molim(?:\s+te)?|ma|hej|ok|okej)?\s*(?:pomakni|makni|pomjeri|premjesti|prebaci)\s+(pr\s*\d+)\s+za\s+(-?\d+)\s+dana?/u);
  if (s) {
    const alias = s[1].replace(/\\s+/g,'').toUpperCase();
    const delta = parseInt(s[2], 10);
    const lineId = aliasToLine[alias];
    if (!lineId || !Number.isFinite(delta)) return null;
    return { type: 'shift', alias, lineId, days: delta, confidence: 0.8 };
  }
  // Pattern: natural numbers and plus/minus wording (e.g., "pomakni pr4 za jedan dan", "pomakni pr4 plus jedan dan")
  const s2 = t.match(/^(?:pa|ajmo|ajde|hajde|molim(?:\s+te)?|ma|hej|ok|okej)?\s*(?:pomakni|makni|pomjeri|premjesti|prebaci)\s+(pr\s*\d+)\s+(?:za\s+)?(?:(plus|minu[sz])\s+)?([a-zccdï¿½ï¿½]+|\d+)\s+(dan|dana|tjedan|tjedna)/u);
  if (s2) {
    const alias = s2[1].replace(/\\s+/g,'').toUpperCase();
    const signWord = s2[2];
    const numWord = s2[3];
     const unit = s2[4];
     const numMap = { 'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'četiri':4,'cetiri':4,'pet':5,'šest':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10 };
    let n = (/^\d+$/.test(numWord) ? parseInt(numWord,10) : (numMap[numWord] ?? null));
    if (n == null) return null;
    if (/tjedan/.test(unit)) n *= 7;
    if (signWord && /minu[sz]/.test(signWord)) n = -n;
    const lineId = aliasToLine[alias];
    if (!lineId) return null;
    return { type: 'shift', alias, lineId, days: n, confidence: 0.8 };
  }
  // Global: "pomakni sve za N dana"
  const g1 = t.match(/pomakni\s+sve\s+za\s+(-?\d+|[a-zÄÄ‡Å¡Ä‘Å¾]+)\s+dana?/);
  if (g1) {
    // FIX: Corrected character encoding for 'c' and 'ï¿½'.
    const numMapAll = { 'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'cetiri':4,'cetiri':4,'pet':5,'ï¿½est':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10 };
    
    // Use toLowerCase() for case-insensitive matching with the map keys.
    const input = g1[1].toLowerCase();

    let n = /^-?\d+$/.test(input) ? parseInt(input, 10) : (numMapAll[input] ?? null);
    
    if (n == null) return null;
    return { type: 'shift_all', days: n };
}

// Global: "rasporedi pocetke sa krajevima"
// FIX: Added case-insensitivity (i), unicode support (u), and optional 'a' in 'sa' (sa?)
//      to correctly handle "s krajevima" as well.
if (/rasporedi\s+po(?:c|c)etke\s+sa?\s+krajevima/iu.test(t)) {
    return { type: 'distribute_chain' };
}

// Global: "korigiraj trajanje prema normativu"
// FIX: Added case-insensitivity (i flag).
if (/korigiraj\s+trajanje.*normativ/i.test(t)) {
    return { type: 'normative_extend', days: 2 };
}

// Global UI: open Add Task modal (synonyms)
// FIX: Combined multiple conditions into one efficient regex.
//      Handles "dodaj zadatak", "zadatak", "dodaj biljeï¿½ku", "dodaj biljesku" case-insensitively.
if (/(?:dodaj\s+)?(?:zadatak|bilje(?:ï¿½|s)ku)/iu.test(t)) {
    return { type: 'add_task_open' };
}

// Modal-scoped commands (will only apply if modal is open)

// Handles commands like: "upiï¿½i Naziv novog zadatka"
// FIX: Changed to a non-capturing group (?:ï¿½|s) and added case-insensitivity.
if (/^upi(?:ï¿½|s)i\s+.+/iu.test(t)) {
    const mU = t.match(/^upi(?:ï¿½|s)i\s+(.+)$/iu);
    return { type: 'add_task_append', text: (mU && mU[1]) ? mU[1] : '' };
}

// Handles save/confirm commands in a modal.
// FIX: Added case-insensitivity and more synonyms for "save".
if (/^(spremi|potvrdi|unesi|dodaj)$/i.test(t)) {
    return { type: 'modal_save' };
}

// Handles cancel/close commands in a modal.
// FIX: Replaced a syntax error with a specific regex for canceling,
//      including common synonyms and case-insensitivity.
if (/^(odustani|prekini|zatvori|izadi)$/i.test(t)) {
    return { type: 'modal_cancel' };
}
  // Global: show image popup (supports: "popup", "pop up", "digni/otvori/prikaï¿½i popup/sliku")
  if (/(?:\bpop\s*up\b|\bpopup\b|\b(?:digni|otvori|prikaï¿½i|prikazi)\s+(?:popup|sliku)\b)/iu.test(t)) {
    return { type: 'image_popup' };
  }
  // Global: "procitaj mi"
  // Global: "procitaj mi"
  if (/(pro\u010Ditaj|procitaj)\s+mi/u.test(t)) {
    return { type: 'tts_read' };
  }
  if (/\bprekini\b/.test(t)) {
    return { type: 'exit_focus' };
  }
  // Pattern: "start pr4 na 1.9[.2025]" or "start pz02 na 1.9" -> set start date
  const s3 = t.match(/start\s+([a-z]{2}\d+|pr\d+)\s+na\s+([0-3]?\d)\.([01]?\d)(?:\.([12]\d{3}))?/);
  if (s3) {
    const ref = s3[1];
    const aliasKey = ref.toUpperCase();
    const d = parseInt(s3[2],10);
    const mth = parseInt(s3[3],10);
    const y = s3[4] ? parseInt(s3[4],10) : (defaultYear || new Date().getUTCFullYear());
    const iso = `${y}-${String(mth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const lineId = aliasToLine[aliasKey];
    if (!lineId) return null;
    return { type: 'move_start', alias: aliasKey, lineId, iso, confidence: 0.78 };
  }
  return null;
}
function JsonHighlighter({ data }) {
  return <pre className="text-xs code-font input-bg rounded-lg p-4 overflow-auto h-full border-theme border text-secondary">{JSON.stringify(data, null, 2)}</pre>;
}
function ProcessStagesPanel({ processStages=[] }) {
  return (
    <AnimatePresence>
      {processStages.length>0 && (
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:20}} className="absolute bottom-full left-0 right-0 mb-4 px-8">
          <div className="panel rounded-xl p-4 shadow-xl">
            <div className="flex justify-center gap-4 overflow-x-auto">
              {processStages.map((s,i)=> (
                <div key={s.id} className="flex items-center gap-3 flex-shrink-0">
                  <div className={`flex items-center gap-3 p-2 rounded-lg input-bg ${s.status==='active'?'ring-2 ring-accent':''}`}>
                    <span className="text-md">{s.icon}</span>
                    <span className="text-sm font-medium text-primary">{s.name}</span>
                    {s.status==='active' && (<motion.div animate={{rotate:360}} transition={{duration:1,repeat:Infinity,ease:'linear'}} className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full" />)}
                    {s.status==='completed' && (<CheckCircle className="w-4 h-4 text-green-500" />)}
                  </div>
                  {i<processStages.length-1 && (<ChevronRight className="text-subtle w-4 h-4" />)}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function InspectorSidebar({ ganttJson, activeLine, jsonHistory, historyIndex, canUndo, canRedo, onUndo, onRedo }) {
  const [tab, setTab] = useState('line');
  return (
    <div className="panel w-80 flex flex-col h-full rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-theme flex justify-between items-center">
        <h2 className="text-lg font-semibold text-primary">Inspektor</h2>
        <div className="flex items-center gap-2">
          <button onClick={onUndo} disabled={!canUndo} className="p-2 input-bg rounded-lg text-subtle disabled:opacity-40 hover:text-accent transition" title="Undo"><Undo2 size={18}/></button>
          <button onClick={onRedo} disabled={!canRedo} className="p-2 input-bg rounded-lg text-subtle disabled:opacity-40 hover:text-accent transition" title="Redo"><Redo2 size={18}/></button>
        </div>
      </div>
      <div className="flex border-b border-theme input-bg">
        <button onClick={()=>setTab('line')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition ${tab==='line'?'text-accent border-b-2 border-accent':'text-subtle'}`}><Activity size={16}/> Linija</button>
        <button onClick={()=>setTab('data')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition ${tab==='data'?'text-accent border-b-2 border-accent':'text-subtle'}`}><Database size={16}/> Podaci</button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab==='line' ? (
          <div className="p-4 overflow-y-auto h-full">
            <h3 className="text-md font-semibold mb-4 text-secondary">Detalji Aktivne Linije</h3>
            {activeLine ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 input-bg rounded-full text-sm font-medium text-primary">{activeLine.pozicija_id}</span>
                  <h4 className="text-xl font-bold text-primary">{activeLine.label}</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="input-bg p-3 rounded-lg"><p className="text-xs text-subtle">PoÄetak</p><p className="font-medium text-primary">{activeLine.start}</p></div>
                  <div className="input-bg p-3 rounded-lg"><p className="text-xs text-subtle">Kraj</p><p className="font-medium text-primary">{activeLine.end}</p></div>
                  <div className="input-bg p-3 rounded-lg"><p className="text-xs text-subtle">Trajanje</p><p className="font-medium text-primary">{activeLine.duration_days} dana</p></div>
                  <div className="input-bg p-3 rounded-lg"><p className="text-xs text-subtle">Osoba</p><p className="font-medium text-primary flex items-center gap-1"><User size={14}/> {activeLine.osoba}</p></div>
                </div>
                <div className="input-bg p-3 rounded-lg text-sm"><p className="text-xs text-subtle mb-1">Opis</p><p className="text-secondary">{activeLine.opis}</p></div>
              </div>
            ) : (<p className="text-subtle italic text-center mt-10">Odaberite liniju na Gantt dijagramu.</p>)}
          </div>
        ) : (
          <div className="p-4 overflow-y-auto h-full">
            <div className="flex justify-between items-center mb-4"><h3 className="text-md font-semibold text-secondary">Gantt JSON Data</h3><span className="text-xs text-subtle">Povijest: {historyIndex+1}/{jsonHistory.length}</span></div>
            <JsonHighlighter data={ganttJson} />
          </div>
        )}
      </div>
    </div>
  );
}
import GanttCanvas from './components/GanttCanvas.jsx';
function AgentInteractionBar({ agent, processCommand }) {
  const [textInput, setTextInput] = useState('');
  const handleTextSubmit = (e) => { e.preventDefault(); if (textInput.trim()) { processCommand(textInput.trim()); setTextInput(''); } };
  const toggleListening = () => { agent.isListening ? agent.stopListening() : agent.startListening(); };
  const isProcessing = agent.state==='processing';
  return (
    <div className="relative">
      {/* legacy stages removed in favor of top stepper */}
      <div className="px-8 pb-6 pt-2">
        {false && agent.lastResponse && !isProcessing && (
          <AnimatePresence>
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mb-3 text-sm text-center text-secondary flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-accent"/>
              <span className="font-medium">{agent.lastResponse.tts}</span>
              <button onClick={agent.resetAgent} className="text-subtle hover:text-primary transition" title="OÄisti odgovor"><X size={14}/></button>
            </motion.div>
          </AnimatePresence>
        )}
        <div className="panel rounded-full shadow-2xl p-2 flex items-center gap-3">
          <div className="pl-3">
            {isProcessing ? (
              <motion.div animate={{rotate:360}} transition={{duration:1.5,repeat:Infinity,ease:'linear'}}>
                <Loader2 className="w-6 h-6 text-accent"/>
              </motion.div>
            ) : agent.isListening ? (
              <motion.div animate={{scale:[1,1.2,1]}} transition={{duration:1,repeat:Infinity}}>
                <Bot className="w-6 h-6 text-red-500"/>
              </motion.div>
            ) : (
              <Bot className="w-6 h-6 text-subtle"/>
            )}
          </div>
          <form onSubmit={handleTextSubmit} className="flex-1">
            <input type="text" value={agent.transcript || textInput} onChange={(e)=>setTextInput(e.target.value)} placeholder={agent.isListening? 'Govorite sada...' : "Naredi agentu (npr. 'Pomakni P-001 za 2 dana')..."} className="w-full bg-transparent focus:outline-none text-primary placeholder-text-subtle" disabled={isProcessing || agent.isListening} />
          </form>
          <div className="flex items-center gap-2">
            <button onClick={toggleListening} className={`p-3 rounded-full transition-colors shadow-md ${agent.isListening ? 'bg-red-500 text-white' : 'input-bg text-subtle hover:text-primary border border-theme'}`} title="Glasovna naredba">{agent.isListening ? <Square size={20}/> : <Mic size={20}/>}</button>
            <button onClick={handleTextSubmit} className="p-3 rounded-full bg-accent text-white transition hover:opacity-90 disabled:opacity-50 shadow-md" disabled={isProcessing || agent.isListening || (!textInput.trim() && !agent.transcript)} title="PoÅ¡alji naredbu"><Send size={20}/></button>
          </div>
        </div>
      </div>
    </div>
  );
}
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
      const prodajaData = await loadProdajaDataExternal();
      
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
  const [aliasByLine, setAliasByLine] = useState({}); // lineId -> PRn
  const [lineByAlias, setLineByAlias] = useState({}); // PRn -> lineId
  const [pendingActions, setPendingActions] = useState([]); // { id, type, alias, lineId, iso }
  const [pendingPatches, setPendingPatches] = useState([]); // persistence queue
  const nextAliasNumRef = useRef(1);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [activities, setActivities] = useState([]); // completed task cards
  const [flowActive, setFlowActive] = useState(0); // 0..4 stepper
  const [flowDone, setFlowDone] = useState(-1);
  // Add Task modal + notes store
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskDraft, setAddTaskDraft] = useState('');
  const [savedNotes, setSavedNotes] = useState([]); // array of strings
  const addTaskRef = useRef(null);
  // Image popup state
  const [showImagePopup, setShowImagePopup] = useState(false);
  const [popupBlurPx, setPopupBlurPx] = useState(100);
  const [popupTransitionMs, setPopupTransitionMs] = useState(2000);
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

  const [fallbackMode, setFallbackMode] = useState('idle'); const [fallbackPending, setFallbackPending] = useState(null); const [fallbackPrimarySuggestion, setFallbackPrimarySuggestion] = useState(null); const fallbackInputRef = useRef(null);
  const [localPing, setLocalPing] = useState(null);
  const log = useCallback((msg) => {
    setConsoleLogs((prev) => [...prev.slice(-400), { id: Date.now() + Math.random(), t: Date.now(), msg }]);
  }, []);
  // Focus fallback chat input and ensure listening when fallback opens
  useEffect(() => {
    if (fallbackOpen) {
      try { setTimeout(() => fallbackInputRef.current?.focus(), 0); } catch {}
      try { if (!agent.isListening) agent.startListening(); } catch {}
    }
  }, [fallbackOpen, agent]);
  // Assign alias helper (usable by hover and by auto-assignment)
  const assignAliasToLine = useCallback((lineId) => {
    if (!lineId) return null;
    let outAlias = null;
    setAliasByLine((prev) => {
      if (prev[lineId]) { outAlias = prev[lineId]; return prev; }
      const alias = `PR${nextAliasNumRef.current++}`;
      outAlias = alias;
      setLineByAlias((r) => ({ ...r, [alias]: lineId }));
      // Render badge text in DOM immediately
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-bar-id="${lineId}"] .alias-badge`);
        if (el) {
          el.textContent = alias;
          el.classList.remove('hidden');
          el.classList.add('alias-badge--active');
        }
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
  // Toggle alias badge visibility on focus on/off
  useEffect(() => {
    if (!focusMode) {
      document.querySelectorAll('.alias-badge').forEach(el => el.classList.add('hidden'));
    } else {
      // Reapply visible badges for already assigned
      Object.entries(aliasByLine).forEach(([lineId, alias]) => {
        const el = document.querySelector(`[data-bar-id="${lineId}"] .alias-badge`);
        if (el) { el.textContent = alias; el.classList.remove('hidden'); }
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
    try {
      const b = document.body;
      b.classList.remove('app-focus', 'app-superfocus', 'app-focus-local');
      if (glowEnabled) {
        if (superFocus) b.classList.add('app-superfocus');
        else if (focusMode) b.classList.add(agentSource === 'local' ? 'app-focus-local' : 'app-focus');
      }
      return () => { b.classList.remove('app-focus', 'app-superfocus', 'app-focus-local'); };
    } catch {}
  }, [focusMode, superFocus, glowEnabled, agentSource]);
  // Apply CSS variables for intensity/duration
  const applyGlowVars = useCallback(() => {
    const root = document.documentElement;
    const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
    const I = clamp(Number(glowIntensity) || 0);
    const fd = Math.max(50, Math.min(2000, Number(glowDurationMs)||200));
    root.style.setProperty('--focus-glow-border', String(0.35 * I));
    root.style.setProperty('--focus-glow-outer', String(0.18 * I));
    root.style.setProperty('--focus-glow-duration', `${fd}ms`);
    root.style.setProperty('--superfocus-glow-border', String(0.45 * I));
    root.style.setProperty('--superfocus-glow-outer', String(0.22 * I));
    root.style.setProperty('--superfocus-glow-duration', `${fd}ms`);
  }, [glowIntensity, glowDurationMs]);
  useEffect(() => { applyGlowVars(); }, [applyGlowVars]);

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
    if(t==='image_popup') return 'Prikaï¿½i sliku';
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
    } else if (tool === 'shift_all') {
      setPendingActions(q => [{ id:`${Date.now()}`, type:'shift_all', days: params.days }, ...q].slice(0,5));
    } else if (tool === 'distribute_chain') {
      setPendingActions(q => [{ id:`${Date.now()}`, type:'distribute_chain' }, ...q].slice(0,5));
    } else if (tool === 'normative_extend') {
      setPendingActions(q => [{ id:`${Date.now()}`, type:'normative_extend', days: params.days }, ...q].slice(0,5));
    } else if (tool === 'add_task_open') {
      setShowAddTaskModal(true);
    } else if (tool === 'image_popup') {
      setShowImagePopup(true);
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
          if (/^(zatvori|odustani|prekini)$/.test(t)) { setFallbackOpen(false); setSuperFocus(false); return; }
          if (/^potvrdi\\s+sve\\s+izmjene$/.test(t)) { persistQueuedChanges(); setFallbackOpen(false); setSuperFocus(false); return; }
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
            if (/\b(odustani|poni[sÅ¡]ti|ne)\b/.test(t)) {
              cancelAction(pendingActions[0].id);
              return;
            }
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
            setAliasByLine({}); setLineByAlias({}); nextAliasNumRef.current = 1;
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
              setFocusMode(false); setAliasByLine({}); setLineByAlias({}); nextAliasNumRef.current=1; return;
            }
            if (parsed.type === 'add_task_open') { setShowAddTaskModal(true); return; }
            if (parsed.type === 'image_popup') { setShowImagePopup(true); return; }
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
                  setFallbackOpen(true);
                  setFallbackLoading(true);
                  const context = {
                    currentDate: new Date().toISOString().slice(0,10),
                    availableAliases: Object.keys(lineByAlias || {})
                  };
                  const sys = 'Vrati JSON strogo ovog oblika: {"suggestions":[{"tool":"...","params":{...},"confidence":0.0,"ask":"(ako je potrebna TOCNO jedna najnejasnija varijabla ï¿½ postavi kratko pitanje na hrvatskom; inace izostavi)"},...]}.' +
                    ' Alati: move_start{alias:string,date:YYYY-MM-DD}, shift{alias:(string|array),days:number}, shift_all{days:number}, distribute_chain{}, normative_extend{days:number}, add_task_open{}, image_popup{}.' +
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
      
      // Apply local change keeping duration
      updateGanttJson({ operation:'set_start', pozicija_id: action.lineId, newStart: action.iso });
      // Queue patch for persistence
      setPendingPatches((p) => [{ type:'setStart', positionId: action.lineId, newStart: action.iso }, ...p]);
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
      // Clear that action from queue
      setPendingActions((q) => q.filter(a => a.id !== action.id));
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
          <div className={`text-xs px-2 py-1 rounded-full ${isFocusOn ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'input-bg text-subtle border border-theme'}`}>{isFocusOn ? 'FOCUS MODE' : 'IDLE'}</div>
          {(focusMode || superFocus) && (
            <button
              onClick={() => {
                try { agent.stopListening(); } catch {}
                setSuperFocus(false);
                setFocusMode(false);
              }}
              className="px-3 py-1.5 rounded border border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 text-sm"
              title="IzaÄ‘i iz focus/superfocus"
            >
              IzaÄ‘i
            </button>
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
      {focusMode && pendingActions.length > 0 && (
        <div className="mx-8 mb-2">
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-2 flex items-center justify-between shadow-sm">
            <div className="text-sm font-medium">
              Reci "potvrdi" za primjenu ili "poniÅ¡ti" za odustajanje.
            </div>
            <div className="text-xs text-amber-700">
              ÄŒekajuÄ‡a akcija: {pendingActions[0]?.alias || pendingActions[0]?.type}
            </div>
          </div>
        </div>
      )}
      {/* Add Task Modal */}
      {/* Image Popup */}
      {showImagePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative z-10 p-2 rounded-xl">
            <img src={slika1} alt="popup" style={{ filter: `blur(${popupBlurPx}px)`, transition: `filter ${popupTransitionMs}ms ease` }} className="max-w-[85vw] max-h-[80vh] rounded-xl shadow-2xl" />
          </div>
        </div>
      )}
      {fallbackOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-md bg-black/20" />
          <div className="relative z-10 w-[720px] max-w-[95vw] panel border border-theme rounded-2xl shadow-2xl p-5 bg-white/95">
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
                              setShowImagePopup(true);
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
                        } else if (tool === 'shift_all') {
                          setPendingActions(q => [{ id:`${Date.now()}`, type:'shift_all', days: params.days }, ...q].slice(0,5));
                        } else if (tool === 'distribute_chain') {
                          setPendingActions(q => [{ id:`${Date.now()}`, type:'distribute_chain' }, ...q].slice(0,5));
                        } else if (tool === 'normative_extend') {
                          setPendingActions(q => [{ id:`${Date.now()}`, type:'normative_extend', days: params.days }, ...q].slice(0,5));
                        } else if (tool === 'add_task_open') {
                          setShowAddTaskModal(true);
                        } else if (tool === 'image_popup') {
                          setShowImagePopup(true);
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
      <div className="flex-1 flex gap-4 px-8 overflow-hidden min-h-[560px]">
        {/* Process Timeline Panel - Left (1/6 width) */}
        <div className="w-1/6 flex-shrink-0 h-full max-h-[calc(100vh-200px)]">
          <ProcessTimelinePanel 
            processStages={agent.processStages} 
            clearStages={agent.resetAgent}
          />
        </div>
        
        {/* Main Gantt Canvas - Center (4/6 width) */}
        <div className="w-4/6 flex-shrink-0">
          <GanttCanvas
            ganttJson={ganttJson}
            activeLineId={activeLineId}
            setActiveLineId={setActiveLineId}
            pendingActions={pendingActions}
          />
        </div>

        {/* Chat/Voice Input Panel - Right (1/6 width) */}
        <div className="w-1/6 flex-shrink-0">
          <AgentInteractionPanelView
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
              // In focus mode, treat text as a command to parse and confirm
              if (focusMode) {
                const year = (ganttJson?.pozicije?.[0]?.montaza?.datum_pocetka || '2025-01-01').slice(0,4);
                const parsed = parseCroatianCommand(cmd, { aliasToLine: lineByAlias, defaultYear: Number(year) });
                if (parsed) {
                  const action = { id: `${Date.now()}`, type: parsed.type, alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso };
                  setPendingActions((q) => [action, ...q].slice(0, 5));
                } else {
                  log(`Naredba nije prepoznata: "${cmd}"`);
                }
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
      {/* Agent Console - Bottom (split) */}
      <div className="px-8 pb-6 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <AgentConsole logs={consoleLogs} />
          <QuickCommandCards onSend={(t)=>{
            const evt = new CustomEvent('gva:quickCommand', { detail: { t } });
            window.dispatchEvent(evt);
          }} />
        </div>
      </div>
    </div>
  );
}




