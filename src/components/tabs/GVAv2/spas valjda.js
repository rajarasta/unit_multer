1 file changed
+1743
-1874
index.jsx
+1743
-1874

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Mic, CheckCircle, Loader2, Send, ChevronRight,
  Undo2, Redo2, Command, Palette, Activity, CalendarDays, Database, User, Sparkles, X, Bot, Sliders, AlertCircle, Clock
} from 'lucide-react';
import { cycleTheme } from '../../../theme/manager';
import AgentStepFlow from '../../agent/AgentStepFlow.jsx';
import AgentConsole from '../../agent/AgentConsole.jsx';
import AgentTaskCard from '../../agent/AgentTaskCard.jsx';
// --- Date helpers (UTC safe) ---
const ymd = (d) => d.toISOString().slice(0, 10);
const fromYmd = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => { if (!s) return s; const d = fromYmd(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const diffDays = (a, b) => { if (!a || !b) return 0; const d1 = fromYmd(a), d2 = fromYmd(b); return Math.round((d2 - d1) / (1000*60*60*24)); };
const rangeDays = (from, to) => { if (!from || !to) return []; const out=[]; let cur=fromYmd(from), end=fromYmd(to); while(cur<=end){ out.push(ymd(cur)); cur.setUTCDate(cur.getUTCDate()+1);} return out; };
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
    
    console.log(`📊 Loaded ${prodajaProcesses.length} prodaja processes for GVAv2`);
    return PRODAJA_GANTT_JSON;
    
  } catch (error) {
    console.error('❌ Failed to load prodaja data:', error);
    // Fallback to mock data with prodaja theme
    return {
      project: { id: 'PRODAJA-FALLBACK', name: 'Prodaja Procesi - Fallback', description: 'Fallback podaci za prodaju procese' },
      pozicije: [
        { id:'PRJ-01-PZ-01-PRODAJA', naziv:'Stambena zgrada – Istok - Aluminijski profili', montaza:{ opis:'Prodaja za Aluminijski profili KTM-2025', osoba:'Marko P.', datum_pocetka:'2025-08-16', datum_zavrsetka:'2025-08-16', status:'Završeno' } },
        { id:'PRJ-01-PZ-02-PRODAJA', naziv:'Stambena zgrada – Istok - Staklo termoizol.', montaza:{ opis:'Prodaja za Staklo termoizol. 4+12+4', osoba:'Marko P.', datum_pocetka:'2025-08-18', datum_zavrsetka:'2025-08-23', status:'Završeno' } },
        { id:'PRJ-02-PZ-01-PRODAJA', naziv:'Ured Zapad - Čelični okvir', montaza:{ opis:'Prodaja za Čelični okvir FEA D45-001', osoba:'Marko P.', datum_pocetka:'2025-08-16', datum_zavrsetka:'2025-08-17', status:'Završeno' } },
      ],
      metadata: { version:'2.0', source:'fallback' }
    };
  }
};
// Initialize with fallback, will be replaced by loaded data
const MOCK_GANTT_JSON = {
  project: { id: 'LOADING', name: 'Učitavanje podataka...', description: 'Učitavam procese prodaje iz all_projects datoteke' },
  pozicije: [],
  metadata: { version:'2.0', loading:true }
};
// --- Agent Interaction Panel Component ---
function AgentInteractionPanel({ agent, focusMode, processCommand, pendingActions, confirmAction, cancelAction, aliasByLine }) {
  const [textInput, setTextInput] = useState('');
  // handle quick command events
  useEffect(() => {
    const h = (e) => {
      const t = e?.detail?.t;
      if (typeof t === 'string' && t.trim()) {
        processCommand(t.trim());
      }
    };
    window.addEventListener('gva:quickCommand', h);
    return () => window.removeEventListener('gva:quickCommand', h);
  }, [processCommand]);
  
  const hasActiveContent = focusMode || pendingActions.length > 0 || agent.transcript || agent.isListening;
  
  return (
    <div className="h-full flex flex-col">
      {hasActiveContent && (
        <div className="panel rounded-2xl p-4 mb-4 shadow-lg">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Chat & Glasovni Agent
          </h3>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {!hasActiveContent ? (
          <div 
            className="p-4 h-full flex items-center justify-center cursor-pointer"
            onClick={agent.startListening}
          >
            <div className="text-center text-subtle">
              <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Chat & Glasovni Agent</p>
              <p className="text-xs mt-1">Kliknite za početak snimanja</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
        {/* Voice Control */}
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <button
              onClick={agent.isListening ? agent.stopListening : agent.startListening}
              className={`flex-1 p-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                agent.isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-accent hover:bg-accent/80 text-white'
              }`}
            >
              {agent.isListening ? <Square size={16} /> : <Mic size={16} />}
              {agent.isListening ? 'Stop' : 'Voice'}
            </button>
          </div>
          
          {agent.transcript && (
            <div className="p-2 bg-gray-100 rounded text-sm text-gray-700 mb-2">
              {agent.transcript}
            </div>
          )}
        </div>
        {/* Text Input */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && textInput.trim()) {
                  processCommand(textInput);
                  setTextInput('');
                }
              }}
              placeholder={focusMode ? "Recite naredbu..." : "Recite 'agent' za fokus"}
              className="flex-1 p-2 rounded-lg input-bg border border-theme text-sm"
            />
            <button
              onClick={() => {
                if (textInput.trim()) {
                  processCommand(textInput);
                  setTextInput('');
                }
              }}
              disabled={!textInput.trim()}
              className="px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        {/* Focus Mode Indicator */}
        {focusMode && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-amber-800">Focus Mode Aktivan</span>
            </div>
            <p className="text-xs text-amber-700">Reci "dalje" za izlaz iz focus moda</p>
          </div>
        )}
        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary">Čekaju potvrdu:</h4>
            {pendingActions.map(action => (
              <div key={action.id} className="p-3 input-bg rounded-lg border border-theme">
                <div className="text-xs text-secondary mb-1">Akcija</div>
                <div className="text-sm font-medium text-primary mb-2">Pomakni početak</div>
                <div className="text-xs text-secondary mb-1">
                  Meta: <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">{aliasByLine[action.lineId] || action.alias}</span>
                </div>
                <div className="text-xs text-secondary mb-3">
                  Vrijeme: <span className="font-mono">{action.iso}</span>
                </div>
                <div className="text-[11px] text-amber-700 mb-2">Reci "potvrdi" ili "poni1ti"</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => confirmAction(action)}
                    className="px-2 py-1 rounded bg-emerald-600 text-white text-xs flex items-center gap-1"
                  >
                    <CheckCircle size={12}/> Potvrdi
                  </button>
                  <button 
                    onClick={() => cancelAction(action.id)}
                    className="px-2 py-1 rounded border text-xs"
                  >
                    Poništi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
// --- Process Timeline Panel Component ---
function ProcessTimelinePanel({ processStages, clearStages }) {
  return (
    <div className="h-[600px] flex flex-col">
      {processStages.length > 0 && (
        <div className="panel rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Proces obrade
            </h3>
            <button
              onClick={clearStages}
              className="text-xs text-subtle hover:text-primary transition-colors"
            >
              Očisti
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {processStages.length === 0 ? (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center text-subtle">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nema aktivnih procesa</p>
              <p className="text-xs mt-1">Timeline će se prikazati kad pokrenete glasovnu naredbu</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
                {processStages.map((stage, index) => (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      transition: { delay: index * 0.1 }
                    }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all duration-300
                      ${stage.status === 'active' ? 'border-blue-200 bg-blue-50/50' : ''}
                      ${stage.status === 'completed' ? 'border-green-200 bg-green-50/50' : ''}
                      ${stage.status === 'failed' ? 'border-red-200 bg-red-50/50' : ''}
                      ${stage.status === 'idle' ? 'border-gray-200 bg-gray-50/30' : ''}
                    `}
                  >
                    {/* Timeline connector */}
                    {index < processStages.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-300" />
                    )}
                    
                    {/* Status indicator */}
                    <div className="absolute top-3 left-3">
                      {stage.status === 'active' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                        />
                      )}
                      {stage.status === 'completed' && (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      )}
                      {stage.status === 'failed' && (
                        <AlertCircle className="w-3 h-3 text-red-600" />
                      )}
                      {stage.status === 'idle' && (
                        <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
                      )}
                    </div>
                    {/* Stage content */}
                    <div className="ml-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{stage.icon}</span>
                        <h4 className={`font-medium text-sm ${
                          stage.status === 'active' ? 'text-blue-900' :
                          stage.status === 'completed' ? 'text-green-900' :
                          stage.status === 'failed' ? 'text-red-900' : 'text-gray-900'
                        }`}>
                          {stage.name}
                        </h4>
                      </div>
                      <p className={`text-xs mb-2 ${
                        stage.status === 'active' ? 'text-blue-700' :
                        stage.status === 'completed' ? 'text-green-700' :
                        stage.status === 'failed' ? 'text-red-700' : 'text-gray-600'
                      }`}>
                        {stage.description}
                      </p>
                      {/* Parameters */}
                      {stage.params && Object.keys(stage.params).length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-gray-600 mb-1">Parametri:</div>
                          <div className="space-y-1">
                            {Object.entries(stage.params).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-gray-500">{key}:</span>
                                <span className="text-gray-700 font-mono max-w-[100px] truncate">
                                  {typeof value === 'string' ? value : JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Result */}
                      {stage.result && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-green-600 mb-1">Rezultat:</div>
                          <div className="text-xs text-green-700 font-mono">
                            {typeof stage.result === 'string' 
                              ? stage.result 
                              : JSON.stringify(stage.result, null, 2).substring(0, 50) + '...'
                            }
                          </div>
                        </div>
                      )}
                      {/* Error */}
                      {stage.error && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-red-600 mb-1">Greška:</div>
                          <div className="text-xs text-red-700 font-mono">
                            {typeof stage.error === 'string' 
                              ? stage.error 
                              : JSON.stringify(stage.error, null, 2).substring(0, 50) + '...'
                            }
                          </div>
                        </div>
                      )}
                      {/* Timing */}
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                        <span>
                          {stage.timestamp && new Date(stage.timestamp).toLocaleTimeString('hr-HR', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          })}
                        </span>
                        {stage.completedAt && (
                          <span>
                            ({Math.round((new Date(stage.completedAt) - new Date(stage.timestamp)) / 1000)}s)
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
// --- Quick Command Cards (right side) ---
function QuickCommandCards({ onSend }) {
  // Flat list of colored command chips (no grouping)
  const cmds = [
    { id: 'shift-1', title: 'Pomakni PZ-01 +2 dana', text: 'pomakni pz-01 za +2 dana', icon: Activity, tint: 'sky' },
    { id: 'shift-2', title: 'Pomakni aktivnu -1 dan', text: 'pomakni aktivnu liniju za -1 dan', icon: Activity, tint: 'sky' },
    { id: 'date-1',  title: 'Start PZ-02 na 1.9.',   text: 'postavi početak pz-02 na 2025-09-01', icon: CalendarDays, tint: 'indigo' },
    { id: 'date-2',  title: 'Kraj PZ-03 na 5.9.',     text: 'postavi kraj pz-03 na 2025-09-05',   icon: CalendarDays, tint: 'indigo' },
    { id: 'conf-1',  title: 'Potvrdi aktivnu liniju', text: 'potvrdi',                            icon: CheckCircle,  tint: 'emerald' },
    { id: 'nav-1',   title: 'Izlaz i spremi',         text: 'dalje',                              icon: X,            tint: 'rose' },
  ];
  const tintToGradient = (t) => {
    switch (t) {
      case 'sky':     return { from: '#38bdf8', via: '#0ea5e9', to: '#0284c7' };
      case 'indigo':  return { from: '#818cf8', via: '#6366f1', to: '#4f46e5' };
      case 'emerald': return { from: '#34d399', via: '#10b981', to: '#059669' };
      case 'rose':    return { from: '#fb7185', via: '#f43f5e', to: '#e11d48' };
      default:        return { from: '#94a3b8', via: '#64748b', to: '#475569' };
    }
  };
  return (
    <div className="panel h-full rounded-2xl p-4 shadow-lg flex flex-col">
      <h3 className="font-semibold text-primary mb-3">Brze naredbe</h3>
      <div className="flex flex-wrap gap-2">
        {cmds.map((c) => {
          const Icon = c.icon || Sparkles;
          const g = tintToGradient(c.tint);
          const style = {
            background: `linear-gradient(135deg, ${g.from}22, ${g.via}22 45%, ${g.to}26), rgba(255,255,255,0.04)`,
            boxShadow: `inset 0 1px 0 0 rgba(255,255,255,.12), 0 8px 20px rgba(0,0,0,.12)`,
            borderColor: 'rgba(255,255,255,.18)'
          };
          return (
            <button
              key={c.id}
              onClick={()=>onSend(c.text)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white/90 backdrop-blur-md border transition hover:translate-y-[-1px]`}
              style={style}
              title={c.text}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/85 text-slate-700 shadow-sm">
                <Icon size={12} />
              </span>
              <span className="text-xs font-medium">{c.title}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto" />
    </div>
  );
}
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
function resolveMonthToken(tok) {
  const m = {
    'prvog':1,'drugog':2,'trećeg':3,'treceg':3,'četvrtog':4,'cetvrtog':4,'petog':5,'šestog':6,'sestog':6,'sedmog':7,'osmog':8,'devetog':9,'desetog':10,'jedanaestog':11,'dvanaestog':12,
    'siječnja':1,'veljače':2,'ožujka':3,'travnja':4,'svibnja':5,'lipnja':6,'srpnja':7,'kolovoza':8,'rujna':9,'listopada':10,'studenog':11,'prosinca':12,
    'sijecnja':1,'veljace':2,'ozujka':3,'travnja':4,'svibnja':5,'lipnja':6,'srpnja':7,'kolovoza':8,'rujna':9,'listopada':10,'studenog':11,'prosinca':12,
    '1.':1,'2.':2,'3.':3,'4.':4,'5.':5,'6.':6,'7.':7,'8.':8,'9.':9,'10.':10,'11.':11,'12.':12,
    '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'11':11,'12':12
  };
  return m[tok] || null;
}
function parseCroatianCommand(text, { aliasToLine, defaultYear }) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  // Pattern: "pomakni početak PR5 na početak <mjeseca>"
  const m = t.match(/pomakni\s+po(?:č|c)etak\s+(pr\d+)\s+na\s+(po(?:č|c)etak\s+([^.\s]+)\s+mjeseca|([0-9]{4}-[0-9]{2}-[0-9]{2}))/);
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
  const s = t.match(/pomakni\s+(pr\d+)\s+za\s+(-?\d+)\s+dana?/);
  if (s) {
    const alias = s[1].toUpperCase();
    const delta = parseInt(s[2], 10);
    const lineId = aliasToLine[alias];
    if (!lineId || !Number.isFinite(delta)) return null;
    return { type: 'shift', alias, lineId, days: delta, confidence: 0.8 };
  }
  // Pattern: natural numbers and plus/minus wording (e.g., "pomakni pr4 za jedan dan", "pomakni pr4 plus jedan dan")
  const s2 = t.match(/pomakni\s+(pr\d+)\s+(?:za\s+)?(?:(plus|minu[sz])\s+)?([a-zčćšđž]+|\d+)\s+(dan|dana|tjedan|tjedna)/);
  if (s2) {
    const alias = s2[1].toUpperCase();
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
  const g1 = t.match(/pomakni\s+sve\s+za\s+(-?\d+|[a-zčćšđž]+)\s+dana?/);
  if (g1) {
    const numMapAll = { 'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'četiri':4,'cetiri':4,'pet':5,'šest':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10 };
    let n = /^-?\d+$/.test(g1[1]) ? parseInt(g1[1],10) : (numMapAll[g1[1]] ?? null);
    if (n == null) return null;
    return { type: 'shift_all', days: n };
  }
  // Global: "rasporedi početke sa krajevima"
  if (/rasporedi\s+po(?:c|č)etke\s+sa\s+krajevima/.test(t)) {
    return { type: 'distribute_chain' };
  }
  // Global: "korigiraj trajanje prema normativu" (+2 dana trajanje)
  if (/korigiraj\s+trajanje.*normativ/.test(t)) {
    return { type: 'normative_extend', days: 2 };
  }
  // Global UI: open Add Task modal (synonyms)
  if (/dodaj\s+zadatak/.test(t) || /\bzadatak\b/.test(t) || /dodaj\s+bilje\s*\u0161?ku/.test(t)) {
    return { type: 'add_task_open' };
  }
  // Modal-scoped commands (will only apply if modal is open)
  if (/^upi[šs]i\s+.+/.test(t)) {
    const mU = t.match(/^upi[šs]i\s+(.+)$/);
    return { type: 'add_task_append', text: (mU && mU[1]) ? mU[1] : '' };
  }
  if (/^(spremi|potvrdi)$/.test(t)) {
    return { type: 'modal_save' };
  }
  if (/^(odustani|poni[sš]ti|zatvori|prekini)$/.test(t)) {
    return { type: 'modal_cancel' };
  }
  // Global: "pročitaj mi"
  if (/(pročitaj|procitaj)\s+mi/.test(t)) {
    return { type: 'tts_read' };
  }
  // Global: "prekini" -> exit focus without persisting
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
function GanttCanvas({ ganttJson, activeLineId, setActiveLineId, pendingActions }) {
  const [isListening, setIsListening] = useState(false);
  const [ganttVisible, setGanttVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
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
  // Voice recognition for "gantt" wake word
  useEffect(() => {
    if (!isListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'hr-HR';
    
    const onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
      }
      
      if (finalText) {
        const text = finalText.trim().toLowerCase();
        setTranscript(text);
        
        if (/\bgantt\b/.test(text) || /\bgant\b/.test(text)) {
          setGanttVisible(true);
          setIsListening(false);
          setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } })), 0);
        }
      }
    };
    
    rec.onresult = onresult;
    rec.onerror = () => {};
    rec.start();
    
    return () => { try { rec.stop(); } catch {} };
  }, [isListening]);
  const startListening = () => {
    setIsListening(true);
    setTranscript('');
  };
  const handleTextSearch = () => {
    if (textInput.trim()) {
      const searchText = textInput.trim().toLowerCase();
      if (searchText.includes('gantt') || searchText.includes('gant')) {
        setGanttVisible(true);
        setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } })), 0);
      }
      // TODO: Later implement search functionality for specific gantt elements
      console.log('Searching for:', searchText);
    }
  };
  if (!ganttVisible) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-subtle p-8 w-full max-w-md">
          {/* Voice Control */}
          <div 
            className="cursor-pointer mb-6"
            onClick={startListening}
          >
            <motion.div
              animate={isListening ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
            >
              <Mic className="w-16 h-16 mx-auto mb-4 opacity-30" />
            </motion.div>
            <p className="text-lg mb-2">Gantt Dijagram</p>
            <p className="text-sm mb-4">
              {isListening ? 'Slušam... Recite "gantt"' : 'Kliknite za glasovnu aktivaciju'}
            </p>
            {transcript && (
              <div className="text-xs text-secondary bg-gray-100 rounded px-3 py-1 inline-block mb-4">
                {transcript}
              </div>
            )}
          </div>
          {/* Text Input */}
          <div className="w-full">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && textInput.trim()) {
                    handleTextSearch();
                    setTextInput('');
                  }
                }}
                placeholder="Upišite 'gantt' ili pretražite elemente..."
                className="flex-1 p-3 rounded-lg input-bg border border-theme text-sm text-primary placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={() => {
                  handleTextSearch();
                  setTextInput('');
                }}
                disabled={!textInput.trim()}
                className="px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
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
          <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4"/> {dateRange.from} – {dateRange.to}</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: `280px repeat(${totalDays}, 45px)` }}>
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
                <div className={`px-6 py-2 text-sm sticky left-0 z-20 panel border-t border-theme flex flex-col justify-center h-12 cursor-pointer transition-shadow ${isActive?'ring-2 ring-inset ring-accent':''}`} onClick={()=>setActiveLineId(ln.id)}>
                  <div className="font-medium text-primary truncate" title={ln.label}>{ln.label}</div>
                  <div className="text-xs text-subtle mt-1 flex items-center gap-2"><span className="px-2 py-0.5 input-bg rounded-md text-xs">{ln.pozicija_id}</span><span>{ln.osoba}</span></div>
                </div>
                <div className="relative col-span-full grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 45px)`, gridColumnStart: 2 }}>
          {days.map((d,i)=> (<div key={`${ln.id}-${d}`} className="h-12 border-t border-l gantt-grid-line border-theme"/>))}
                  <motion.div layoutId={`gantt-bar-${ln.id}`} data-bar-id={ln.id} className={`absolute top-1 h-10 rounded-lg shadow-xl bg-gradient-to-r ${barColor} flex flex-col justify-center pl-3 pr-3 text-white cursor-pointer`}
                    style={{ gridColumnStart: startIdx+1, gridColumnEnd: startIdx+1+span, width:`calc(${span*45}px - 8px)`, left:'4px', filter: isActive? 'brightness(1.1) drop-shadow(0 0 15px var(--color-accent))':'none' }}
                    initial={{opacity:0.8}} animate={{opacity:1}} whileHover={{scale:1.02}} transition={{type:'spring',stiffness:300,damping:25}}
                    onMouseEnter={(e)=>{ const r = e.currentTarget.getBoundingClientRect(); const x = r.left + r.width/2; const y = r.top + r.height/2; window.dispatchEvent(new CustomEvent('bg:highlight',{ detail:{ x, y, radius: Math.max(r.width,r.height), durationMs: 900 } })); if (window.__gvaFocusAssignAlias) window.__gvaFocusAssignAlias(ln.id); }}
                    onClick={()=>setActiveLineId(ln.id)}>
                    {/* Alias badge (focus mode only) injected via CSS toggle */}
                    <span className="alias-badge hidden mr-2 px-2 py-0.5 rounded bg-white/20 text-xs">PR?</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate block leading-tight">{ln.label}</span>
                      <span className="text-xs opacity-80 leading-tight">
                        {ln.duration_days} {ln.duration_days === 1 ? 'dan' : 'dana'}
                      </span>
                    </div>
                  </motion.div>
                  {/* Ghost preview when action pending for this line */}
                  {pendingActions && pendingActions.filter(a=>a.lineId===ln.id).map((a)=>{
                    const newStart = a.iso || ln.start;
                    const newStartIdx = Math.max(0, diffDays(dateRange.from, newStart));
                    const newEndIdx = newStartIdx + span;
                    return (
                      <div key={`ghost-${a.id}`} className="absolute top-1 h-10 rounded-lg border-2 border-dashed border-amber-400/80 bg-amber-200/20 pointer-events-none"
                        style={{ gridColumnStart: newStartIdx+1, gridColumnEnd: newEndIdx+1, width:`calc(${span*45}px - 8px)`, left:'4px', backdropFilter:'blur(1px)' }}
                        title={`Preview: ${a.iso}`}>
                        <div className="absolute inset-0 rounded-lg" style={{boxShadow:'inset 0 0 0 2px rgba(251,191,36,.5)'}} />
                      </div>
                    );
                  })}
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
      {/* legacy stages removed in favor of top stepper */}
      <div className="px-8 pb-6 pt-2">
        {false && agent.lastResponse && !isProcessing && (
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
  const [activeLineId, setActiveLineId] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const agent = useGanttAgent();
  
  // Load prodaja data on component mount
  useEffect(() => {
    const initializeProdajaData = async () => {
      console.log('🔄 Loading prodaja data for GVAv2...');
      const prodajaData = await loadProdajaData();
      
      setJsonHistory([prodajaData]);
      setHistoryIndex(0);
      setIsDataLoaded(true);
      
      // Set first pozicija as active
      if (prodajaData.pozicije && prodajaData.pozicije.length > 0) {
        setActiveLineId(prodajaData.pozicije[0].id);
      }
      
      console.log('✅ Prodaja data loaded and set as active JSON');
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
    try { return localStorage.getItem('gva.agent.url') || 'http://10.255.130.136:1234'; } catch { return 'http://10.255.130.136:1234'; }
  });
  const [localPing, setLocalPing] = useState(null);
  const log = useCallback((msg) => {
    setConsoleLogs((prev) => [...prev.slice(-400), { id: Date.now() + Math.random(), t: Date.now(), msg }]);
  }, []);
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
  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gva.glow.enabled', JSON.stringify(glowEnabled));
      localStorage.setItem('gva.glow.intensity', JSON.stringify(glowIntensity));
      localStorage.setItem('gva.glow.duration', JSON.stringify(glowDurationMs));
      localStorage.setItem('gva.agent.mode', agentSource);
      localStorage.setItem('gva.agent.url', localAgentUrl);
    } catch {}
  }, [glowEnabled, glowIntensity, glowDurationMs, agentSource, localAgentUrl]);
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
          log(`🎤 LIVE: ${interim}`);
        }
      }
      if (finalText) {
        // Log final recognized text
        log(`✅ Prepoznato: "${finalText}"`);
      
        const t = finalText.trim().toLowerCase();
        // Wake word
        if (!focusMode && /\bagent\b/.test(t)) {
          setFocusMode(true);
          // Add to console
          log('🎯 Focus Mode aktiviran - Agent je spreman za glasovne naredbe');
          // Add stage to timeline
          const focusStage = {
            id: `focus-${Date.now()}`,
            name: 'Focus Mode aktiviran',
            description: 'Agent je detektirao "agent" wake word',
            icon: '🎯',
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
            // Scoped input command: "upiši ..."
            const m = t.match(/^upi[šs]i\s+(.+)$/);
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
            if (/\b(odustani|poni[sš]ti|ne)\b/.test(t)) {
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
              icon: '🏁',
              status: 'completed',
              timestamp: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              params: { command: t, pendingActions: pendingActions.length }
            };
            agent.addStage(exitStage);
            
            // Add to console
            log('🏁 Izlazim iz Focus Mode - Spremljene promjene');
            
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
            icon: '🧠',
            status: 'active',
            timestamp: new Date().toISOString(),
            params: { command: t, focusMode: true }
          };
          agent.addStage(parseStage);
          
          const parsed = parseCroatianCommand(t, { aliasToLine: lineByAlias, defaultYear: Number(year) });
          if (parsed) {
            // Log successful parsing
            log(`✅ Naredba parsirana: ${parsed.type} za ${parsed.alias} → ${parsed.iso}`);
            
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
              name: 'Dodajem u red čekanja',
              description: `Akcija "${parsed.type}" za ${parsed.alias}`,
              icon: '⏳',
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
            log(`❌ Naredba nije prepoznata: "${t}"`);
            
            // Update stage as failed
            agent.setProcessStages(prev => 
              prev.map(stage => 
                stage.id === parseStage.id 
                  ? { ...stage, status: 'failed', completedAt: new Date().toISOString(), error: 'Naredba nije prepoznata' }
                  : stage
              )
            );
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
      log('✅ Spremanje promjena dovršeno');
    } catch (e) {
      console.warn('Persist queued changes failed (demo environment):', e?.message);
      log('⚠️  Spremanje promjena nije uspjelo (demo)');
    }
  }
  const confirmAction = async (action) => {
    // Add confirmation stage to timeline
    const confirmStage = {
      id: `confirm-${Date.now()}`,
      name: 'Potvrda korisnika',
      description: `Pokrećem akciju "${action.type}" za ${action.alias}`,
      icon: '✅',
      status: 'active',
      timestamp: new Date().toISOString(),
      params: action
    };
    agent.addStage(confirmStage);
    
    setSuperFocus(true);
    setFlowActive(0); setFlowDone(-1); log('🚀 Agent pokrenuo izvršavanje zadatka...');
    // Step 0 → 1 (Thinking → Research)
    setTimeout(()=>{ 
      setFlowDone(0); setFlowActive(1); log('[Razmišljanje] Analiziram zahtjev...');
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
      setFlowDone(1); setFlowActive(2); log('[Istraživanje] Prikupljam kontekst...');
      // Add research stage
      const researchStage = {
        id: `research-${Date.now()}`,
        name: 'Istraživanje konteksta',
        description: `Analiziram postojeće stanje pozicije ${action.alias}`,
        icon: '📊',
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
        const processingStage = { id: `processing-${Date.now()}`, name: 'Primjena promjene', description: 'Globalna operacija primijenjena', icon: '⚙️', status: 'active', timestamp: new Date().toISOString(), params: action };
        agent.addStage(processingStage);
        return;
      }
      
      const processingStage = {
        id: `processing-${Date.now()}`,
        name: 'Primjena promjene',
        description: `Ažuriram datum početka na ${action.iso}`,
        icon: '🔄',
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
        description: 'Provjera je li promjena uspješno primijenjena',
        icon: '🔍',
        status: 'active',
        timestamp: new Date().toISOString()
      };
      agent.addStage(validationStage);
    }, 1200);
    
    setTimeout(()=>{ 
      setFlowDone(4); log('✅ Zadatak završen.'); setSuperFocus(false);
      
      // Update validation stage as completed
      agent.setProcessStages(prev => 
        prev.map(stage => 
          stage.id.startsWith('validation-') && stage.status === 'active'
            ? { ...stage, status: 'completed', completedAt: new Date().toISOString(), result: 'Promjena uspješno primijenjena' }
            : stage
        )
      );
      
      // Add completion stage
      const completionStage = {
        id: `completion-${Date.now()}`,
        name: 'Zadatak završen',
        description: `Uspješno pomjeren početak za ${action.alias}`,
        icon: '🎉',
        status: 'completed',
        timestamp: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        result: { positionId: action.lineId, newStart: action.iso, durationMs: 1300 }
      };
      agent.addStage(completionStage);
      
      // Activity card (keep existing functionality)
      const params = [ { key:'alias', value: aliasByLine[action.lineId] || action.alias }, { key:'newStart', value: action.iso } ];
      const resultSnippet = JSON.stringify({ positionId: action.lineId, newStart: action.iso }).slice(0, 120) + '...';
      setActivities((a) => [{ id: action.id, startedAt: Date.now(), title: 'Pomicanje početka procesa', subtitle: `Primjena na ${action.lineId}`, params, resultSnippet, durationMs: 1300 }, ...a].slice(0, 5));
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
              title="Izađi iz focus/superfocus"
            >
              Izađi
            </button>
          )}
          <div className="relative">
            <button onClick={()=>setShowGlowSettings(v=>!v)} className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" title="Glow postavke"><Sliders size={18}/></button>
            {showGlowSettings && (
              <div className="absolute right-0 mt-2 w-64 panel p-3 border border-theme rounded-xl shadow-xl z-40">
                <div className="text-sm font-semibold text-primary mb-2">Ambient Glow</div>
                <label className="flex items-center justify-between text-sm mb-2">
                  <span className="text-secondary">Uključen</span>
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
                  <label className="text-xs text-secondary mb-1">Način komunikacije</label>
                  <select className="w-full border rounded px-2 py-1 text-sm mb-2" value={agentSource} onChange={(e)=>setAgentSource(e.target.value)}>
                    <option value="server">Server (OpenAI)</option>
                    <option value="local">Local LLM</option>
                  </select>
                  {agentSource === 'local' && (
                    <div className="space-y-2">
                      <label className="text-xs text-secondary">Local LLM URL</label>
                      <input className="w-full border rounded px-2 py-1 text-sm" value={localAgentUrl} onChange={(e)=>setLocalAgentUrl(e.target.value)} placeholder="http://10.255.130.136:1234" />
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 text-xs border rounded" onClick={async()=>{
                          try {
                            setLocalPing({ loading: true });
                            const u = new URL('/api/llm/local/health', 'http://localhost:3002'); u.searchParams.set('base', localAgentUrl);
                            const r = await fetch(u.toString()); const j = await r.json(); setLocalPing(j);
                          } catch (e) { setLocalPing({ ok:false, error: String(e?.message||e) }); }
                        }}>Ping</button>
                        {localPing?.loading ? (
                          <span className="text-xs text-slate-500">Pinging…</span>
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
              Reci "potvrdi" za primjenu ili "poništi" za odustajanje.
            </div>
            <div className="text-xs text-amber-700">
              Čekajuća akcija: {pendingActions[0]?.alias || pendingActions[0]?.type}
            </div>
          </div>
        </div>
      )}
      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowAddTaskModal(false)} />
          <div className="panel relative z-10 w-[520px] max-w-[92vw] rounded-xl p-4 border border-theme shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary">Dodaj zadatak (diktat)</h3>
              <button
                onClick={() => { agent.isListening ? agent.stopListening() : agent.startListening(); }}
                className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded text-xs border ${agent.isListening ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-700'}`}
                title={agent.isListening ? 'Zaustavi slušanje' : 'Započni slušanje'}
              >
                {agent.isListening ? 'Slušam…' : 'Slušaj'}
              </button>
            </div>
            <p className="text-xs text-secondary mb-2">Recite tekst ili upišite. Naredbe: "pročitaj mi" za čitanje, "potvrdi" za spremanje, "poništi" za zatvaranje.</p>
            <textarea ref={addTaskRef} className="w-full h-40 input-bg border border-theme rounded-lg p-2 text-sm" value={addTaskDraft} onChange={(e)=>setAddTaskDraft(e.target.value)} placeholder="Diktirajte ili upišite..." />
            {agent.isListening && (
              <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="truncate">Slušam… recite sadržaj, pa "potvrdi"</span>
              </div>
            )}
            <div className="flex justify-between items-center mt-3">
              <div className="text-xs text-secondary">Spremljeno: {savedNotes.length}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs rounded border" onClick={()=>setShowAddTaskModal(false)}>Zatvori</button>
                <button className="px-3 py-1.5 text-xs rounded bg-emerald-600 text-white" onClick={()=>{ if(addTaskDraft.trim()){ setSavedNotes(n=>[...n, addTaskDraft.trim()]); setAddTaskDraft(''); setShowAddTaskModal(false);} }}>Spremi</button>
                <button className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white" onClick={speakNotes}>Pročitaj</button>
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
          <GanttCanvas ganttJson={ganttJson} activeLineId={activeLineId} setActiveLineId={setActiveLineId} pendingActions={pendingActions} />
        </div>
        
        {/* Chat/Voice Input Panel - Right (1/6 width) */}
        <div className="w-1/6 flex-shrink-0">
          <AgentInteractionPanel 
            agent={agent} 
            focusMode={focusMode}
            processCommand={(cmd) => {
              // If local agent selected (tab setting), route to local tool-calling API
              if (!focusMode && agentSource === 'local') {
                (async () => {
                  try {
                    log(`[LOCAL] ⇢ ${cmd}`);
                    const r = await fetch('http://localhost:3002/api/llm/local/tool-calling', {
                      method: 'POST',
                      headers: { 'content-type': 'application/json' },
                      body: JSON.stringify({ prompt: cmd, base_url: localAgentUrl, model: 'local', tools: [] })
                    });
                    const j = await r.json();
                    if (!r.ok) throw new Error(j?.error || 'HTTP error');
                    log(`[LOCAL] ⇠ ${j.final_response || '(nema odgovora)'}`);
                  } catch (err) {
                    log(`[LOCAL:ERR] ${err?.message || String(err)}`);
                  }
                })();
                return;
              }
              // If in focus mode, treat text as a command to parse and confirm
              if (focusMode) {
                const year = (ganttJson?.pozicije?.[0]?.montaza?.datum_pocetka || '2025-01-01').slice(0,4);
                // Add command parsing stage
                const parseStage = {
                  id: `parse-${Date.now()}`,
                  name: 'Parsiranje glasovne naredbe',
                  description: `Analiziram naredbu: "${cmd}"`,
                  icon: '🧠',
                  status: 'active',
                  timestamp: new Date().toISOString(),
                  params: { command: cmd, focusMode: true }
                };
                agent.addStage(parseStage);
                
                const parsed = parseCroatianCommand(cmd, { aliasToLine: lineByAlias, defaultYear: Number(year) });
                if (parsed) {
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
                    name: 'Dodajem u red čekanja',
                    description: `Akcija "${parsed.type}" za ${parsed.alias}`,
                    icon: '⏳',
                    status: 'completed',
                    timestamp: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    params: parsed
                  };
                  agent.addStage(queueStage);
                  
                  const action = { id: `${Date.now()}`, type: parsed.type, alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso };
                  setPendingActions((q) => [action, ...q].slice(0, 5));
                } else {
                  // Update stage as failed
                  agent.setProcessStages(prev => 
                    prev.map(stage => 
                      stage.id === parseStage.id 
                        ? { ...stage, status: 'failed', completedAt: new Date().toISOString(), error: 'Naredba nije prepoznata' }
                        : stage
                    )
                  );
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
﻿import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Mic, CheckCircle, Loader2, Send, ChevronRight,
  Undo2, Redo2, Command, Palette, Activity, CalendarDays, Database, User, Sparkles, X, Bot, Sliders, AlertCircle, Clock
} from 'lucide-react';
import { cycleTheme } from '../../../theme/manager';
import AgentStepFlow from '../../agent/AgentStepFlow.jsx';
import AgentConsole from '../../agent/AgentConsole.jsx';
import AgentTaskCard from '../../agent/AgentTaskCard.jsx';
// --- Date helpers (UTC safe) ---
const ymd = (d) => d.toISOString().slice(0, 10);
const fromYmd = (s) => new Date(`${s}T00:00:00Z`);
const addDays = (s, n) => { if (!s) return s; const d = fromYmd(s); d.setUTCDate(d.getUTCDate() + n); return ymd(d); };
const diffDays = (a, b) => { if (!a || !b) return 0; const d1 = fromYmd(a), d2 = fromYmd(b); return Math.round((d2 - d1) / (1000*60*60*24)); };
const rangeDays = (from, to) => { if (!from || !to) return []; const out=[]; let cur=fromYmd(from), end=fromYmd(to); while(cur<=end){ out.push(ymd(cur)); cur.setUTCDate(cur.getUTCDate()+1);} return out; };
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
function AgentInteractionPanel({ agent, focusMode, processCommand, pendingActions, confirmAction, cancelAction, aliasByLine }) {
  const [textInput, setTextInput] = useState('');
  // handle quick command events
  useEffect(() => {
    const h = (e) => {
      const t = e?.detail?.t;
      if (typeof t === 'string' && t.trim()) {
        processCommand(t.trim());
      }
    };
    window.addEventListener('gva:quickCommand', h);
    return () => window.removeEventListener('gva:quickCommand', h);
  }, [processCommand]);
  
  const hasActiveContent = focusMode || pendingActions.length > 0 || agent.transcript || agent.isListening;
  
  return (
    <div className="h-full flex flex-col">
      {hasActiveContent && (
        <div className="panel rounded-2xl p-4 mb-4 shadow-lg">
          <h3 className="font-semibold text-primary flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Chat & Glasovni Agent
          </h3>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {!hasActiveContent ? (
          <div 
            className="p-4 h-full flex items-center justify-center cursor-pointer"
            onClick={agent.startListening}
          >
            <div className="text-center text-subtle">
              <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Chat & Glasovni Agent</p>
              <p className="text-xs mt-1">Kliknite za poÄetak snimanja</p>
            </div>
          </div>
        ) : (
          <div className="p-4">
        {/* Voice Control */}
        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <button
              onClick={agent.isListening ? agent.stopListening : agent.startListening}
              className={`flex-1 p-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                agent.isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-accent hover:bg-accent/80 text-white'
              }`}
            >
              {agent.isListening ? <Square size={16} /> : <Mic size={16} />}
              {agent.isListening ? 'Stop' : 'Voice'}
            </button>
          </div>
          
          {agent.transcript && (
            <div className="p-2 bg-gray-100 rounded text-sm text-gray-700 mb-2">
              {agent.transcript}
            </div>
          )}
        </div>
        {/* Text Input */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && textInput.trim()) {
                  processCommand(textInput);
                  setTextInput('');
                }
              }}
              placeholder={focusMode ? "Recite naredbu..." : "Recite 'agent' za fokus"}
              className="flex-1 p-2 rounded-lg input-bg border border-theme text-sm"
            />
            <button
              onClick={() => {
                if (textInput.trim()) {
                  processCommand(textInput);
                  setTextInput('');
                }
              }}
              disabled={!textInput.trim()}
              className="px-3 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        {/* Focus Mode Indicator */}
        {focusMode && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-amber-800">Focus Mode Aktivan</span>
            </div>
            <p className="text-xs text-amber-700">Reci "dalje" za izlaz iz focus moda</p>
          </div>
        )}
        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-primary">ÄŒekaju potvrdu:</h4>
            {pendingActions.map(action => (
              <div key={action.id} className="p-3 input-bg rounded-lg border border-theme">
                <div className="text-xs text-secondary mb-1">Akcija</div>
                <div className="text-sm font-medium text-primary mb-2">Pomakni poÄetak</div>
                <div className="text-xs text-secondary mb-1">
                  Meta: <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">{aliasByLine[action.lineId] || action.alias}</span>
                </div>
                <div className="text-xs text-secondary mb-3">
                  Vrijeme: <span className="font-mono">{action.iso}</span>
                </div>
                <div className="text-[11px] text-amber-700 mb-2">Reci "potvrdi" ili "poni1ti"</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => confirmAction(action)}
                    className="px-2 py-1 rounded bg-emerald-600 text-white text-xs flex items-center gap-1"
                  >
                    <CheckCircle size={12}/> Potvrdi
                  </button>
                  <button 
                    onClick={() => cancelAction(action.id)}
                    className="px-2 py-1 rounded border text-xs"
                  >
                    PoniÅ¡ti
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
          </div>
        )}
      </div>
    </div>
  );
}
// --- Process Timeline Panel Component ---
function ProcessTimelinePanel({ processStages, clearStages }) {
  return (
    <div className="h-[600px] flex flex-col">
      {processStages.length > 0 && (
        <div className="panel rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Proces obrade
            </h3>
            <button
              onClick={clearStages}
              className="text-xs text-subtle hover:text-primary transition-colors"
            >
              OÄisti
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {processStages.length === 0 ? (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center text-subtle">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nema aktivnih procesa</p>
              <p className="text-xs mt-1">Timeline Ä‡e se prikazati kad pokrenete glasovnu naredbu</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
                {processStages.map((stage, index) => (
                  <motion.div
                    key={stage.id}
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1, 
                      y: 0,
                      transition: { delay: index * 0.1 }
                    }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all duration-300
                      ${stage.status === 'active' ? 'border-blue-200 bg-blue-50/50' : ''}
                      ${stage.status === 'completed' ? 'border-green-200 bg-green-50/50' : ''}
                      ${stage.status === 'failed' ? 'border-red-200 bg-red-50/50' : ''}
                      ${stage.status === 'idle' ? 'border-gray-200 bg-gray-50/30' : ''}
                    `}
                  >
                    {/* Timeline connector */}
                    {index < processStages.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-300" />
                    )}
                    
                    {/* Status indicator */}
                    <div className="absolute top-3 left-3">
                      {stage.status === 'active' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                        />
                      )}
                      {stage.status === 'completed' && (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      )}
                      {stage.status === 'failed' && (
                        <AlertCircle className="w-3 h-3 text-red-600" />
                      )}
                      {stage.status === 'idle' && (
                        <div className="w-3 h-3 rounded-full border-2 border-gray-400" />
                      )}
                    </div>
                    {/* Stage content */}
                    <div className="ml-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{stage.icon}</span>
                        <h4 className={`font-medium text-sm ${
                          stage.status === 'active' ? 'text-blue-900' :
                          stage.status === 'completed' ? 'text-green-900' :
                          stage.status === 'failed' ? 'text-red-900' : 'text-gray-900'
                        }`}>
                          {stage.name}
                        </h4>
                      </div>
                      <p className={`text-xs mb-2 ${
                        stage.status === 'active' ? 'text-blue-700' :
                        stage.status === 'completed' ? 'text-green-700' :
                        stage.status === 'failed' ? 'text-red-700' : 'text-gray-600'
                      }`}>
                        {stage.description}
                      </p>
                      {/* Parameters */}
                      {stage.params && Object.keys(stage.params).length > 0 && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-gray-600 mb-1">Parametri:</div>
                          <div className="space-y-1">
                            {Object.entries(stage.params).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="text-gray-500">{key}:</span>
                                <span className="text-gray-700 font-mono max-w-[100px] truncate">
                                  {typeof value === 'string' ? value : JSON.stringify(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Result */}
                      {stage.result && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-green-600 mb-1">Rezultat:</div>
                          <div className="text-xs text-green-700 font-mono">
                            {typeof stage.result === 'string' 
                              ? stage.result 
                              : JSON.stringify(stage.result, null, 2).substring(0, 50) + '...'
                            }
                          </div>
                        </div>
                      )}
                      {/* Error */}
                      {stage.error && (
                        <div className="mb-2">
                          <div className="text-xs font-medium text-red-600 mb-1">GreÅ¡ka:</div>
                          <div className="text-xs text-red-700 font-mono">
                            {typeof stage.error === 'string' 
                              ? stage.error 
                              : JSON.stringify(stage.error, null, 2).substring(0, 50) + '...'
                            }
                          </div>
                        </div>
                      )}
                      {/* Timing */}
                      <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                        <span>
                          {stage.timestamp && new Date(stage.timestamp).toLocaleTimeString('hr-HR', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit' 
                          })}
                        </span>
                        {stage.completedAt && (
                          <span>
                            ({Math.round((new Date(stage.completedAt) - new Date(stage.timestamp)) / 1000)}s)
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
// --- Quick Command Cards (right side) ---
function QuickCommandCards({ onSend }) {
  // Flat list of colored command chips (no grouping)
  const cmds = [
    { id: 'shift-1', title: 'Pomakni PZ-01 +2 dana', text: 'pomakni pz-01 za +2 dana', icon: Activity, tint: 'sky' },
    { id: 'shift-2', title: 'Pomakni aktivnu -1 dan', text: 'pomakni aktivnu liniju za -1 dan', icon: Activity, tint: 'sky' },
    { id: 'date-1',  title: 'Start PZ-02 na 1.9.',   text: 'postavi poÄetak pz-02 na 2025-09-01', icon: CalendarDays, tint: 'indigo' },
    { id: 'date-2',  title: 'Kraj PZ-03 na 5.9.',     text: 'postavi kraj pz-03 na 2025-09-05',   icon: CalendarDays, tint: 'indigo' },
    { id: 'conf-1',  title: 'Potvrdi aktivnu liniju', text: 'potvrdi',                            icon: CheckCircle,  tint: 'emerald' },
    { id: 'nav-1',   title: 'Izlaz i spremi',         text: 'dalje',                              icon: X,            tint: 'rose' },
  ];
  const tintToGradient = (t) => {
    switch (t) {
      case 'sky':     return { from: '#38bdf8', via: '#0ea5e9', to: '#0284c7' };
      case 'indigo':  return { from: '#818cf8', via: '#6366f1', to: '#4f46e5' };
      case 'emerald': return { from: '#34d399', via: '#10b981', to: '#059669' };
      case 'rose':    return { from: '#fb7185', via: '#f43f5e', to: '#e11d48' };
      default:        return { from: '#94a3b8', via: '#64748b', to: '#475569' };
    }
  };
  return (
    <div className="panel h-full rounded-2xl p-4 shadow-lg flex flex-col">
      <h3 className="font-semibold text-primary mb-3">Brze naredbe</h3>
      <div className="flex flex-wrap gap-2">
        {cmds.map((c) => {
          const Icon = c.icon || Sparkles;
          const g = tintToGradient(c.tint);
          const style = {
            background: `linear-gradient(135deg, ${g.from}22, ${g.via}22 45%, ${g.to}26), rgba(255,255,255,0.04)`,
            boxShadow: `inset 0 1px 0 0 rgba(255,255,255,.12), 0 8px 20px rgba(0,0,0,.12)`,
            borderColor: 'rgba(255,255,255,.18)'
          };
          return (
            <button
              key={c.id}
              onClick={()=>onSend(c.text)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-white/90 backdrop-blur-md border transition hover:translate-y-[-1px]`}
              style={style}
              title={c.text}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/85 text-slate-700 shadow-sm">
                <Icon size={12} />
              </span>
              <span className="text-xs font-medium">{c.title}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-auto" />
    </div>
  );
}
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
      { id:'nlu', name:'NLU', icon:'ðŸ§ ', status:'active' },
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
function resolveMonthToken(tok) {
  const m = {
    'prvog':1,'drugog':2,'treÄ‡eg':3,'treceg':3,'Äetvrtog':4,'cetvrtog':4,'petog':5,'Å¡estog':6,'sestog':6,'sedmog':7,'osmog':8,'devetog':9,'desetog':10,'jedanaestog':11,'dvanaestog':12,
    'sijeÄnja':1,'veljaÄe':2,'oÅ¾ujka':3,'travnja':4,'svibnja':5,'lipnja':6,'srpnja':7,'kolovoza':8,'rujna':9,'listopada':10,'studenog':11,'prosinca':12,
    'sijecnja':1,'veljace':2,'ozujka':3,'travnja':4,'svibnja':5,'lipnja':6,'srpnja':7,'kolovoza':8,'rujna':9,'listopada':10,'studenog':11,'prosinca':12,
    '1.':1,'2.':2,'3.':3,'4.':4,'5.':5,'6.':6,'7.':7,'8.':8,'9.':9,'10.':10,'11.':11,'12.':12,
    '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'11':11,'12':12
  };
  return m[tok] || null;
}
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
  const s = t.match(/pomakni\s+(pr\d+)\s+za\s+(-?\d+)\s+dana?/);
  if (s) {
    const alias = s[1].toUpperCase();
    const delta = parseInt(s[2], 10);
    const lineId = aliasToLine[alias];
    if (!lineId || !Number.isFinite(delta)) return null;
    return { type: 'shift', alias, lineId, days: delta, confidence: 0.8 };
  }
  // Pattern: natural numbers and plus/minus wording (e.g., "pomakni pr4 za jedan dan", "pomakni pr4 plus jedan dan")
  const s2 = t.match(/pomakni\s+(pr\d+)\s+(?:za\s+)?(?:(plus|minu[sz])\s+)?([a-zÄÄ‡Å¡Ä‘Å¾]+|\d+)\s+(dan|dana|tjedan|tjedna)/);
  if (s2) {
    const alias = s2[1].toUpperCase();
    const signWord = s2[2];
    const numWord = s2[3];
    const unit = s2[4];
    const numMap = { 'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'Äetiri':4,'cetiri':4,'pet':5,'Å¡est':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10 };
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
    const numMapAll = { 'nula':0,'jedan':1,'jedna':1,'jedno':1,'dva':2,'dvije':2,'tri':3,'Äetiri':4,'cetiri':4,'pet':5,'Å¡est':6,'sest':6,'sedam':7,'osam':8,'devet':9,'deset':10 };
    let n = /^-?\d+$/.test(g1[1]) ? parseInt(g1[1],10) : (numMapAll[g1[1]] ?? null);
    if (n == null) return null;
    return { type: 'shift_all', days: n };
  }
  // Global: "rasporedi poÄetke sa krajevima"
  if (/rasporedi\s+po(?:c|Ä)etke\s+sa\s+krajevima/.test(t)) {
    return { type: 'distribute_chain' };
  }
  // Global: "korigiraj trajanje prema normativu" (+2 dana trajanje)
  if (/korigiraj\s+trajanje.*normativ/.test(t)) {
    return { type: 'normative_extend', days: 2 };
  }
  // Global UI: open Add Task modal (synonyms)
  if (/dodaj\s+zadatak/.test(t) || /\bzadatak\b/.test(t) || /dodaj\s+bilje\s*\u0161?ku/.test(t)) {
    return { type: 'add_task_open' };
  }
  // Modal-scoped commands (will only apply if modal is open)
  if (/^upi[Å¡s]i\s+.+/.test(t)) {
    const mU = t.match(/^upi[Å¡s]i\s+(.+)$/);
    return { type: 'add_task_append', text: (mU && mU[1]) ? mU[1] : '' };
  }
  if (/^(spremi|potvrdi)$/.test(t)) {
    return { type: 'modal_save' };
  }
  if (/^(odustani|poni[sÅ¡]ti|zatvori|prekini)$/.test(t)) {
    return { type: 'modal_cancel' };
  }
  // Global: "proÄitaj mi"
  if (/(proÄitaj|procitaj)\s+mi/.test(t)) {
    return { type: 'tts_read' };
  }
  // Global: "prekini" -> exit focus without persisting
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
function GanttCanvas({ ganttJson, activeLineId, setActiveLineId, pendingActions }) {
  const [isListening, setIsListening] = useState(false);
  const [ganttVisible, setGanttVisible] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
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
  // Voice recognition for "gantt" wake word
  useEffect(() => {
    if (!isListening) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'hr-HR';
    
    const onresult = (e) => {
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
      }
      
      if (finalText) {
        const text = finalText.trim().toLowerCase();
        setTranscript(text);
        
        if (/\bgantt\b/.test(text) || /\bgant\b/.test(text)) {
          setGanttVisible(true);
          setIsListening(false);
          setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } })), 0);
        }
      }
    };
    
    rec.onresult = onresult;
    rec.onerror = () => {};
    rec.start();
    
    return () => { try { rec.stop(); } catch {} };
  }, [isListening]);
  const startListening = () => {
    setIsListening(true);
    setTranscript('');
  };
  const handleTextSearch = () => {
    if (textInput.trim()) {
      const searchText = textInput.trim().toLowerCase();
      if (searchText.includes('gantt') || searchText.includes('gant')) {
        setGanttVisible(true);
        setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 1000 } })), 0);
      }
      // TODO: Later implement search functionality for specific gantt elements
      console.log('Searching for:', searchText);
    }
  };
  if (!ganttVisible) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-subtle p-8 w-full max-w-md">
          {/* Voice Control */}
          <div 
            className="cursor-pointer mb-6"
            onClick={startListening}
          >
            <motion.div
              animate={isListening ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
            >
              <Mic className="w-16 h-16 mx-auto mb-4 opacity-30" />
            </motion.div>
            <p className="text-lg mb-2">Gantt Dijagram</p>
            <p className="text-sm mb-4">
              {isListening ? 'SluÅ¡am... Recite "gantt"' : 'Kliknite za glasovnu aktivaciju'}
            </p>
            {transcript && (
              <div className="text-xs text-secondary bg-gray-100 rounded px-3 py-1 inline-block mb-4">
                {transcript}
              </div>
            )}
          </div>
          {/* Text Input */}
          <div className="w-full">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && textInput.trim()) {
                    handleTextSearch();
                    setTextInput('');
                  }
                }}
                placeholder="UpiÅ¡ite 'gantt' ili pretraÅ¾ite elemente..."
                className="flex-1 p-3 rounded-lg input-bg border border-theme text-sm text-primary placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                onClick={() => {
                  handleTextSearch();
                  setTextInput('');
                }}
                disabled={!textInput.trim()}
                className="px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!lines.length) return <div className="panel flex-1 rounded-2xl flex items-center justify-center text-subtle">UÄitavanje podataka...</div>;
  const barColors = ['from-indigo-500 to-purple-600','from-sky-500 to-blue-600','from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600'];
  return (
    <div className="panel flex-1 rounded-2xl overflow-hidden flex flex-col">
      <div className="p-6 border-b border-theme flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">{ganttJson.project.name}</h2>
          <p className="text-sm text-subtle mt-1">{ganttJson.project.description}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-secondary">
          <div className="flex items-center gap-2"><CalendarDays className="w-4 h-4"/> {dateRange.from} â€“ {dateRange.to}</div>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: `280px repeat(${totalDays}, 45px)` }}>
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
                <div className={`px-6 py-2 text-sm sticky left-0 z-20 panel border-t border-theme flex flex-col justify-center h-12 cursor-pointer transition-shadow ${isActive?'ring-2 ring-inset ring-accent':''}`} onClick={()=>setActiveLineId(ln.id)}>
                  <div className="font-medium text-primary truncate" title={ln.label}>{ln.label}</div>
                  <div className="text-xs text-subtle mt-1 flex items-center gap-2"><span className="px-2 py-0.5 input-bg rounded-md text-xs">{ln.pozicija_id}</span><span>{ln.osoba}</span></div>
                </div>
                <div className="relative col-span-full grid" style={{ gridTemplateColumns: `repeat(${totalDays}, 45px)`, gridColumnStart: 2 }}>
          {days.map((d,i)=> (<div key={`${ln.id}-${d}`} className="h-12 border-t border-l gantt-grid-line border-theme"/>))}
                  <motion.div layoutId={`gantt-bar-${ln.id}`} data-bar-id={ln.id} className={`absolute top-1 h-10 rounded-lg shadow-xl bg-gradient-to-r ${barColor} flex flex-col justify-center pl-3 pr-3 text-white cursor-pointer`}
                    style={{ gridColumnStart: startIdx+1, gridColumnEnd: startIdx+1+span, width:`calc(${span*45}px - 8px)`, left:'4px', filter: isActive? 'brightness(1.1) drop-shadow(0 0 15px var(--color-accent))':'none' }}
                    initial={{opacity:0.8}} animate={{opacity:1}} whileHover={{scale:1.02}} transition={{type:'spring',stiffness:300,damping:25}}
                    onMouseEnter={(e)=>{ const r = e.currentTarget.getBoundingClientRect(); const x = r.left + r.width/2; const y = r.top + r.height/2; window.dispatchEvent(new CustomEvent('bg:highlight',{ detail:{ x, y, radius: Math.max(r.width,r.height), durationMs: 900 } })); if (window.__gvaFocusAssignAlias) window.__gvaFocusAssignAlias(ln.id); }}
                    onClick={()=>setActiveLineId(ln.id)}>
                    {/* Alias badge (focus mode only) injected via CSS toggle */}
                    <span className="alias-badge hidden mr-2 px-2 py-0.5 rounded bg-white/20 text-xs">PR?</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium truncate block leading-tight">{ln.label}</span>
                      <span className="text-xs opacity-80 leading-tight">
                        {ln.duration_days} {ln.duration_days === 1 ? 'dan' : 'dana'}
                      </span>
                    </div>
                  </motion.div>
                  {/* Ghost preview when action pending for this line */}
                  {pendingActions && pendingActions.filter(a=>a.lineId===ln.id).map((a)=>{
                    const newStart = a.iso || ln.start;
                    const newStartIdx = Math.max(0, diffDays(dateRange.from, newStart));
                    const newEndIdx = newStartIdx + span;
                    return (
                      <div key={`ghost-${a.id}`} className="absolute top-1 h-10 rounded-lg border-2 border-dashed border-amber-400/80 bg-amber-200/20 pointer-events-none"
                        style={{ gridColumnStart: newStartIdx+1, gridColumnEnd: newEndIdx+1, width:`calc(${span*45}px - 8px)`, left:'4px', backdropFilter:'blur(1px)' }}
                        title={`Preview: ${a.iso}`}>
                        <div className="absolute inset-0 rounded-lg" style={{boxShadow:'inset 0 0 0 2px rgba(251,191,36,.5)'}} />
                      </div>
                    );
                  })}
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
  const [dictationBuffer, setDictationBuffer] = useState(''); // live interim text when dictating in modal
  const addTaskRef = useRef(null);
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
      try {
        setTimeout(() => {
          if (addTaskRef.current) {
            addTaskRef.current.focus();
            const len = addTaskDraft?.length || 0;
            try { addTaskRef.current.setSelectionRange(len, len); } catch {}
          }
        }, 0);
      } catch {}
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
    try { return localStorage.getItem('gva.agent.url') || 'http://10.255.130.136:1234'; } catch { return 'http://10.255.130.136:1234'; }
  });
  const [localPing, setLocalPing] = useState(null);
  const log = useCallback((msg) => {
    setConsoleLogs((prev) => [...prev.slice(-400), { id: Date.now() + Math.random(), t: Date.now(), msg }]);
  }, []);
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
  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gva.glow.enabled', JSON.stringify(glowEnabled));
      localStorage.setItem('gva.glow.intensity', JSON.stringify(glowIntensity));
      localStorage.setItem('gva.glow.duration', JSON.stringify(glowDurationMs));
      localStorage.setItem('gva.agent.mode', agentSource);
      localStorage.setItem('gva.agent.url', localAgentUrl);
    } catch {}
  }, [glowEnabled, glowIntensity, glowDurationMs, agentSource, localAgentUrl]);
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
      if (interim) { if (showAddTaskModal) { setDictationBuffer(interim.trim()); } else { agent.setTranscript(interim); if (interim.trim()) { log('LIVE: ' + interim); } } }
      }
      
        if (showAddTaskModal) { const pure = finalText.trim(); if (pure) setAddTaskDraft(prev => (prev ? prev + ' ' : '') + pure); setDictationBuffer(''); }
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
            icon: 'ðŸ§ ',
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
      log('âš ï¸  Spremanje promjena nije uspjelo (demo)');
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
                      <input className="w-full border rounded px-2 py-1 text-sm" value={localAgentUrl} onChange={(e)=>setLocalAgentUrl(e.target.value)} placeholder="http://10.255.130.136:1234" />
                      <div className="flex items-center gap-2">
                        <button className="px-2 py-1 text-xs border rounded" onClick={async()=>{
                          try {
                            setLocalPing({ loading: true });
                            const u = new URL('/api/llm/local/health', 'http://localhost:3002'); u.searchParams.set('base', localAgentUrl);
                            const r = await fetch(u.toString()); const j = await r.json(); setLocalPing(j);
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
<textarea ref={addTaskRef} className="w-full h-40 input-bg border border-theme rounded-lg p-2 text-sm" value={dictationBuffer ? (addTaskDraft ? addTaskDraft + " " + dictationBuffer : dictationBuffer) : addTaskDraft} onChange={(e)=>{ setAddTaskDraft(e.target.value); setDictationBuffer(""); }} placeholder="Diktirajte ili upišite..." />
            {agent.isListening && (
