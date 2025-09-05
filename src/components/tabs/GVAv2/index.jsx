import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Mic, CheckCircle, Loader2, Send, ChevronRight,
  Undo2, Redo2, Command, Palette, Activity, CalendarDays, Database, User, Sparkles, X, Bot
} from 'lucide-react';
import { cycleTheme } from '../../../theme/manager';

// --- Date helpers (UTC safe) ---
const ymd = (d) => d.toISOString().slice(0, 10);
const fromYmd = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => { if (!s) return s; const d = fromYmd(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const diffDays = (a, b) => { if (!a || !b) return 0; const d1 = fromYmd(a), d2 = fromYmd(b); return Math.round((d2 - d1) / (1000*60*60*24)); };
const rangeDays = (from, to) => { if (!from || !to) return []; const out=[]; let cur=fromYmd(from), end=fromYmd(to); while(cur<=end){ out.push(ymd(cur)); cur.setUTCDate(cur.getUTCDate()+1);} return out; };

// --- Mock data (can be replaced by store later) ---
const MOCK_GANTT_JSON = {
  project: { id: 'PRJ-2025-001', name: 'Voltaža - Fasadni Sustav', description: 'Montaža aluminijske fasade za stambenu zgradu' },
  pozicije: [
    { id:'P-001', naziv:'Fasada Sjever', montaza:{ opis:'Montaža aluminijskih panela (Tip A)', osoba:'Marko Petrović', datum_pocetka:'2025-10-10', datum_zavrsetka:'2025-10-15' } },
    { id:'P-002', naziv:'Fasada Jug', montaza:{ opis:'Montaža panela (Tip B) s UV zaštitom', osoba:'Ana Kovačević', datum_pocetka:'2025-10-16', datum_zavrsetka:'2025-10-22' } },
    { id:'P-003', naziv:'Horizontalne Lamele', montaza:{ opis:'Ugradnja horizontalnih lamelnih elemenata (RAL 7016)', osoba:'Tomislav Novak', datum_pocetka:'2025-10-23', datum_zavrsetka:'2025-10-28' } },
    { id:'P-004', naziv:'Stakleni Paneli - Prizemlje', montaza:{ opis:'Sigurnosno staklo 6mm', osoba:'Ivana Horvat', datum_pocetka:'2025-10-12', datum_zavrsetka:'2025-10-18' } },
  ],
  metadata: { version:'1.0' }
};

// --- Agent simulation ---
function useGanttAgent() {
  const [state, setState] = useState('idle');
  const [isListening, setIsListening] = useState(false);
  const [processStages, setProcessStages] = useState([]);
  const [lastResponse, setLastResponse] = useState(null);
  const [transcript, setTranscript] = useState('');

  const startListening = () => { setIsListening(true); setState('listening'); setTranscript('Slušam...'); };
  const stopListening = () => { setIsListening(false); if (state==='listening') setState('idle'); setTranscript(''); };

  const processTextCommand = async (command, updateGanttJson) => {
    setState('processing'); setTranscript(`Obrada: "${command}"`);
    // trigger background highlight for context
    window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } }));

    const stages = [
      { id:'nlu', name:'NLU', icon:'🧠', status:'active' },
      { id:'ctx', name:'Kontekst', icon:'📋', status:'idle' },
      { id:'plan', name:'Planiranje', icon:'✏️', status:'idle' },
      { id:'apply', name:'Primjena', icon:'💾', status:'idle' },
    ];
    setProcessStages(stages);
    const step = (id) => new Promise(r=>setTimeout(()=>{
      setProcessStages(prev=>prev.map((s,i)=> s.id===id?{...s,status:'completed'}: (prev[i-1]?.id===id?{...s,status:'active'}:s)));
      r();
    }, 400));
    await step('nlu'); await step('ctx'); await step('plan');

    let modification=null, responseText='Nisam prepoznao naredbu.';
    if (command.toLowerCase().includes('pomakni p-001 za 2 dana')) {
      modification={ operation:'shift_date', pozicija_id:'P-001', days:2 };
      responseText='Pomaknuo sam poziciju P-001 za 2 dana unaprijed.';
    }
    if (modification) updateGanttJson(modification);
    await step('apply');
    setTimeout(()=> setProcessStages([]), 1200);
    setLastResponse({ tts: responseText });
    setState('idle'); setTranscript('');
  };

  return { state,isListening,processStages,lastResponse,transcript, startListening, stopListening, processTextCommand, resetAgent:()=>{setLastResponse(null); setProcessStages([]); setState('idle');} };
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
                  <div className="input-bg p-3 rounded-lg"><p className="text-xs text-subtle">Početak</p><p className="font-medium text-primary">{activeLine.start}</p></div>
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

function GanttCanvas({ ganttJson, activeLineId, setActiveLineId }) {
  const { dateRange, lines } = useMemo(() => {
    if (!ganttJson?.pozicije) return { dateRange: {}, lines: [] };
    const jsonLines = ganttJson.pozicije.map(p=>({
      id:p.id, pozicija_id:p.id, label:p.naziv, start:p.montaza.datum_pocetka, end:p.montaza.datum_zavrsetka,
      duration_days: diffDays(p.montaza.datum_pocetka, p.montaza.datum_zavrsetka)+1, osoba:p.montaza.osoba, opis:p.montaza.opis
    }));
    const all = jsonLines.flatMap(l=>[l.start,l.end]).filter(Boolean).sort();
    if (!all.length) return { dateRange:{}, lines: jsonLines };
    return { dateRange: { from: all[0], to: all[all.length-1] }, lines: jsonLines };
  }, [ganttJson]);
  const days = useMemo(()=> rangeDays(dateRange.from, dateRange.to), [dateRange]);
  const totalDays = days.length || 1;
  if (!lines.length) return <div className="panel flex-1 rounded-2xl flex items-center justify-center text-subtle">Učitavanje podataka...</div>;
  const barColors = ['from-indigo-500 to-purple-600','from-sky-500 to-blue-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600'];
  return (
    <div className="panel flex-1 rounded-2xl overflow-hidden flex flex-col">
      <div className="p-6 border-b border-theme flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">{ganttJson.project.name}</h2>
          <p className="text-sm text-subtle mt-1">{ganttJson.project.description}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-secondary">
          <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4"/> {dateRange.from} — {dateRange.to}</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: `250px repeat(${totalDays}, 35px)` }}>
          <div className="text-sm font-semibold sticky top-0 left-0 z-30 panel px-6 py-3 border-b border-theme">Pozicija</div>
          {days.map((d)=>{ const dateObj = fromYmd(d); const dayNum = dateObj.getUTCDate(); const dayName = dateObj.toLocaleDateString('hr-HR',{weekday:'short', timeZone:'UTC'}).toUpperCase(); return (
            <div key={d} className="text-xs text-center py-3 sticky top-0 z-10 panel border-b border-l gantt-grid-line border-theme">
              <div className="font-bold text-sm text-primary">{dayNum}</div>
              <div className="text-subtle">{dayName}</div>
            </div>
          );})}
          {lines.map((ln,idx)=>{
            const startIdx = Math.max(0, diffDays(dateRange.from, ln.start));
            const span = ln.duration_days;
            const isActive = ln.id===activeLineId; const barColor = barColors[idx%barColors.length];
            return (
              <React.Fragment key={ln.id}>
                <div className={`px-6 py-3 text-sm sticky left-0 z-20 panel border-t border-theme flex flex-col justify-center h-20 cursor-pointer transition-shadow ${isActive?'ring-2 ring-inset ring-accent':''}`} onClick={()=>setActiveLineId(ln.id)}>
                  <div className="font-medium text-primary truncate" title={ln.label}>{ln.label}</div>
                  <div className="text-xs text-subtle mt-1 flex items-center gap-2"><span className="px-2 py-0.5 input-bg rounded-md text-xs">{ln.pozicija_id}</span><span>{ln.osoba}</span></div>
                </div>
                <div className="relative col-span-full grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 35px)`, gridColumnStart: 2 }}>
                  {days.map((d,i)=> (<div key={`${ln.id}-${d}`} className="h-20 border-t border-l gantt-grid-line border-theme"/>))}
                  <motion.div layoutId={`gantt-bar-${ln.id}`} className={`absolute top-2 h-16 rounded-lg shadow-xl bg-gradient-to-r ${barColor} flex items-center px-4 text-white cursor-pointer`}
                    style={{ gridColumnStart: startIdx+1, gridColumnEnd: startIdx+1+span, width:`calc(${span*35}px - 8px)`, left:'4px', filter: isActive? 'brightness(1.1) drop-shadow(0 0 15px var(--color-accent))':'none' }}
                    initial={{opacity:0.8}} animate={{opacity:1}} whileHover={{scale:1.02}} transition={{type:'spring',stiffness:300,damping:25}}
                    onMouseEnter={(e)=>{ const r = e.currentTarget.getBoundingClientRect(); const x = r.left + r.width/2; const y = r.top + r.height/2; window.dispatchEvent(new CustomEvent('bg:highlight',{ detail:{ x, y, radius: Math.max(r.width,r.height), durationMs: 900 } })); }}
                    onClick={()=>setActiveLineId(ln.id)}>
                    <span className="text-sm font-medium truncate">{ln.label}</span>
                  </motion.div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgentInteractionBar({ agent, processCommand }) {
  const [textInput, setTextInput] = useState('');
  const handleTextSubmit = (e) => { e.preventDefault(); if (textInput.trim()) { processCommand(textInput.trim()); setTextInput(''); } };
  const toggleListening = () => { agent.isListening ? agent.stopListening() : agent.startListening(); };
  const isProcessing = agent.state==='processing';
  return (
    <div className="relative">
      <ProcessStagesPanel processStages={agent.processStages} />
      <div className="px-8 pb-6 pt-2">
        {agent.lastResponse && !isProcessing && (
          <AnimatePresence>
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mb-3 text-sm text-center text-secondary flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-accent"/>
              <span className="font-medium">{agent.lastResponse.tts}</span>
              <button onClick={agent.resetAgent} className="text-subtle hover:text-primary transition" title="Očisti odgovor"><X size={14}/></button>
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
            <button onClick={handleTextSubmit} className="p-3 rounded-full bg-accent text-white transition hover:opacity-90 disabled:opacity-50 shadow-md" disabled={isProcessing || agent.isListening || (!textInput.trim() && !agent.transcript)} title="Pošalji naredbu"><Send size={20}/></button>
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
  const [activeLineId, setActiveLineId] = useState(MOCK_GANTT_JSON.pozicije[0]?.id);
  const agent = useGanttAgent();

  const updateGanttJson = useCallback((mod) => {
    if (!mod) return; const cur = JSON.parse(JSON.stringify(ganttJson)); cur.metadata.modified = new Date().toISOString();
    const i = cur.pozicije.findIndex(p=>p.id===mod.pozicija_id); if (i!==-1) { const p = cur.pozicije[i];
      switch(mod.operation){
        case 'shift_date': p.montaza.datum_pocetka = addDays(p.montaza.datum_pocetka, mod.days); p.montaza.datum_zavrsetka = addDays(p.montaza.datum_zavrsetka, mod.days); break;
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

  return (
    <div className="h-full flex flex-col">
      <header className="flex justify-between items-center p-4 px-8">
        <div className="flex items-center gap-4">
          <Command className="text-accent w-6 h-6"/>
          <h1 className="text-xl font-bold text-primary">Gantt Agent Workspace</h1>
          <span className="input-bg px-3 py-1 rounded-full text-sm text-secondary border border-theme">{ganttJson.project.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={()=>cycleTheme()} className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" title="Promijeni stil"><Palette size={20}/></button>
        </div>
      </header>
      <div className="flex-1 flex gap-6 px-8 overflow-hidden min-h-[560px]">
        <GanttCanvas ganttJson={ganttJson} activeLineId={activeLineId} setActiveLineId={setActiveLineId} />
        <InspectorSidebar ganttJson={ganttJson} activeLine={activeLine} jsonHistory={jsonHistory} historyIndex={historyIndex} canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
      </div>
      <AgentInteractionBar agent={agent} processCommand={(cmd)=>agent.processTextCommand(cmd, updateGanttJson)} />
    </div>
  );
}
