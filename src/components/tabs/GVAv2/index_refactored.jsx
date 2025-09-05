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

// Import components
import AgentInteractionPanelView from './components/AgentInteractionPanel.jsx';
import ProcessTimelinePanel from './components/ProcessTimelinePanel.jsx';
import QuickCommandCards from './components/QuickCommandCards.jsx';

// Import custom hooks
import useGanttAgent from './hooks/useGanttAgent.js';
import { useGanttData } from './hooks/useGanttData.js';
import { useGanttSettings } from './hooks/useGanttSettings.js';

// Import utilities
import { parseJsonSafe } from './utils/json.js';
import { ymd, fromYmd, addDays, diffDays, rangeDays } from './utils/date.js';
import { assignAliasToLine, findPositionCodes, calculateDateRange } from './utils/ganttCalculations.js';
import { parseCroatianCommand } from './parser/parseCroatianCommand.js';

// Small UI helper components
function JsonHighlighter({ data }) {
  return <pre className="text-xs code-font input-bg rounded-lg p-4 overflow-auto h-full border-theme border text-secondary">{JSON.stringify(data, null, 2)}</pre>;
}

function ProcessStagesPanel({ processStages = [] }) {
  return (
    <AnimatePresence>
      {processStages.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-full left-0 right-0 mb-4 px-8">
          <div className="panel rounded-xl p-4 shadow-xl">
            <div className="flex justify-center gap-4 overflow-x-auto">
              {processStages.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 flex-shrink-0">
                  <div className={`flex items-center gap-3 p-2 rounded-lg input-bg ${s.status === 'active' ? 'ring-2 ring-accent' : ''}`}>
                    <span className="text-md">{s.icon}</span>
                    <span className="text-sm font-medium text-primary">{s.name}</span>
                    {s.status === 'active' && (<motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full" />)}
                    {s.status === 'completed' && (<CheckCircle className="w-4 h-4 text-green-500" />)}
                  </div>
                  {i < processStages.length - 1 && (<ChevronRight className="text-subtle w-4 h-4" />)}
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
          <button onClick={onUndo} disabled={!canUndo} className="p-2 input-bg rounded-lg text-subtle disabled:opacity-40 hover:text-accent transition" title="Undo"><Undo2 size={18} /></button>
          <button onClick={onRedo} disabled={!canRedo} className="p-2 input-bg rounded-lg text-subtle disabled:opacity-40 hover:text-accent transition" title="Redo"><Redo2 size={18} /></button>
        </div>
      </div>
      <div className="flex border-b border-theme input-bg">
        <button onClick={() => setTab('line')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition ${tab === 'line' ? 'text-accent border-b-2 border-accent' : 'text-subtle'}`}><Activity size={16} /> Linija</button>
        <button onClick={() => setTab('data')} className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition ${tab === 'data' ? 'text-accent border-b-2 border-accent' : 'text-subtle'}`}><Database size={16} /> Podaci</button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'line' && (
          <div className="h-full flex flex-col">
            {activeLine ? (
              <div className="p-4 space-y-4 flex-1 overflow-auto">
                <div>
                  <label className="text-xs text-subtle uppercase font-medium tracking-wide">ID</label>
                  <div className="text-sm text-primary font-mono">{activeLine.id}</div>
                </div>
                <div>
                  <label className="text-xs text-subtle uppercase font-medium tracking-wide">Naziv</label>
                  <div className="text-sm text-primary">{activeLine.naziv || 'Bez naziva'}</div>
                </div>
                {activeLine.montaza && (
                  <div className="space-y-2">
                    <label className="text-xs text-subtle uppercase font-medium tracking-wide">Montaža</label>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-subtle">Početak:</span>
                        <span className="text-primary font-mono">{activeLine.montaza.datum_pocetka || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-subtle">Završetak:</span>
                        <span className="text-primary font-mono">{activeLine.montaza.datum_zavrsetka || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-subtle">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Odaberite liniju za prikaz detalja</p>
              </div>
            )}
          </div>
        )}
        {tab === 'data' && (
          <div className="h-full p-2">
            <JsonHighlighter data={ganttJson} />
          </div>
        )}
      </div>
    </div>
  );
}

function AgentInteractionBar({ agent, processCommand }) {
  const [textInput, setTextInput] = useState('');
  const handleTextSubmit = (e) => { e.preventDefault(); if (textInput.trim()) { processCommand(textInput.trim()); setTextInput(''); } };
  const toggleListening = () => { agent.isListening ? agent.stopListening() : agent.startListening(); };

  return (
    <div className="panel rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${agent.state === 'idle' ? 'bg-green-400' : agent.state === 'listening' ? 'bg-blue-400 animate-pulse' : 'bg-orange-400 animate-pulse'}`}></div>
          <span className="text-sm font-medium text-primary">Agent {agent.state === 'idle' ? 'spreman' : agent.state === 'listening' ? 'sluša' : 'obrađuje'}</span>
        </div>
        <div className="flex-1"></div>
        <button onClick={toggleListening} className={`p-3 rounded-xl transition ${agent.isListening ? 'bg-red-500 text-white' : 'input-bg text-primary hover:text-accent'}`} title={agent.isListening ? 'Prekini slušanje' : 'Počni slušanje'}>
          {agent.isListening ? <Square size={20} /> : <Mic size={20} />}
        </button>
      </div>
      <form onSubmit={handleTextSubmit} className="flex gap-3">
        <input value={textInput} onChange={(e) => setTextInput(e.target.value)} className="flex-1 input-bg border border-theme rounded-xl px-4 py-3 text-primary placeholder-subtle focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Unesite naredbu ili govorite..." disabled={agent.state !== 'idle'} />
        <button type="submit" disabled={!textInput.trim() || agent.state !== 'idle'} className="px-6 py-3 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-2">
          <Send size={16} />
          Pošalji
        </button>
      </form>
      {agent.transcript && (
        <div className="text-sm text-subtle bg-subtle/10 rounded-lg p-3">
          <span className="font-medium">Transkript: </span>
          {agent.transcript}
        </div>
      )}
      <ProcessStagesPanel processStages={agent.processStages} />
    </div>
  );
}

// Main GVAv2 Component
export default function GVAv2() {
  // Use custom hooks
  const ganttData = useGanttData();
  const agent = useGanttAgent();
  const settings = useGanttSettings();

  // Local state for aliases and actions
  const [aliasByLine, setAliasByLine] = useState({});
  const [lineByAlias, setLineByAlias] = useState({});
  const [pendingActions, setPendingActions] = useState([]);
  const nextAliasNumRef = useRef(1);
  
  // Console and activity tracking
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [flowActive, setFlowActive] = useState(0);
  const [flowDone, setFlowDone] = useState(-1);
  
  // Task modal and notes
  const [addTaskDraft, setAddTaskDraft] = useState('');
  const [savedNotes, setSavedNotes] = useState([]);
  const addTaskRef = useRef(null);

  const log = useCallback((msg) => {
    setConsoleLogs((prev) => [...prev.slice(-400), { id: Date.now() + Math.random(), t: Date.now(), msg }]);
  }, []);

  const assignAliasToLineLocal = useCallback((lineId) => {
    return assignAliasToLine(lineId, aliasByLine, setAliasByLine, setLineByAlias, nextAliasNumRef);
  }, [aliasByLine]);

  // Speech synthesis for notes
  const speakNotes = useCallback(() => {
    try {
      if (savedNotes.length === 0) {
        log('Nema zabilješka za čitanje.');
        return;
      }
      const allText = savedNotes.join('. ');
      const utterance = new SpeechSynthesisUtterance(allText);
      const voices = speechSynthesis.getVoices();
      const hr = voices.find(v => /hr|cro/i.test(v.lang)) || voices.find(v => /sh|sr/i.test(v.lang));
      if (hr) utterance.voice = hr;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
      log(`🔊 Čitam ${savedNotes.length} zabilješka`);
    } catch (e) {
      log(`Greška TTS: ${e?.message || String(e)}`);
    }
  }, [savedNotes, log]);

  // Handle keyboard shortcuts
  const onKey = useCallback((e) => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); ganttData.onUndo(); }
    if (e.ctrlKey && e.key === 'y') { e.preventDefault(); ganttData.onRedo(); }
    if (e.key === 'Escape') { settings.setFocusMode(false); settings.setSuperFocus(false); }
  }, [ganttData, settings]);

  useEffect(() => {
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onKey]);

  // Process command function
  const processCommand = useCallback(async (text) => {
    if (!text.trim()) return;

    log(`👤 Korisnik: ${text}`);
    
    // Try Croatian parser first
    const parsed = parseCroatianCommand(text, { 
      aliasToLine: lineByAlias, 
      defaultYear: new Date().getUTCFullYear() 
    });

    if (parsed) {
      log(`🎯 Prepoznato: ${parsed.type} (pouzdanost: ${parsed.confidence || 'N/A'})`);
      
      // Handle different command types
      if (parsed.type === 'move_start') {
        setPendingActions(q => [{ id: `${Date.now()}`, type: 'move_start', alias: parsed.alias, lineId: parsed.lineId, iso: parsed.iso }, ...q].slice(0, 5));
      } else if (parsed.type === 'shift') {
        setPendingActions(q => [{ id: `${Date.now()}`, type: 'shift', alias: parsed.alias, lineId: parsed.lineId, days: parsed.days }, ...q].slice(0, 5));
      } else if (parsed.type === 'add_task_open') {
        settings.setShowAddTaskModal(true);
      } else if (parsed.type === 'image_popup') {
        settings.setShowImagePopup(true);
      } else if (parsed.type === 'tts_read') {
        speakNotes();
      }
    } else {
      // Fallback to agent processing
      await agent.processTextCommand(text, ganttData);
    }
  }, [agent, ganttData, lineByAlias, log, settings, speakNotes]);

  // Confirm pending actions
  const confirmAction = async (action) => {
    try {
      if (action.type === 'move_start') {
        ganttData.updateGanttJson({ operation: 'move_start', pozicija_id: action.lineId, iso: action.iso });
        log(`✅ Pomaknut početak ${action.alias} na ${action.iso}`);
      } else if (action.type === 'shift') {
        ganttData.updateGanttJson({ operation: 'shift_date', pozicija_id: action.lineId, days: action.days });
        log(`✅ Pomaknut ${action.alias} za ${action.days} dana`);
      }
      setPendingActions(q => q.filter(a => a.id !== action.id));
    } catch (e) {
      log(`❌ Greška: ${e?.message || String(e)}`);
    }
  };

  const cancelAction = (id) => setPendingActions((q) => q.filter(a => a.id !== id));

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-subtle/5">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-theme">
        <div>
          <h1 className="text-2xl font-bold text-primary">GVA v2</h1>
          <p className="text-sm text-subtle">Napredni Gantt asistent s AI integracijom</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={cycleTheme} className="p-2 input-bg rounded-lg text-subtle hover:text-accent transition" title="Promijeni temu">
            <Palette size={18} />
          </button>
          <button onClick={() => settings.setFocusMode(!settings.focusMode)} className={`p-2 rounded-lg transition ${settings.focusMode ? 'bg-accent text-accent-foreground' : 'input-bg text-subtle hover:text-accent'}`} title="Focus mode">
            <Command size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left Sidebar - Inspector */}
        <InspectorSidebar 
          ganttJson={ganttData.ganttJson} 
          activeLine={ganttData.activeLine}
          jsonHistory={ganttData.jsonHistory}
          historyIndex={ganttData.historyIndex}
          canUndo={ganttData.canUndo}
          canRedo={ganttData.canRedo}
          onUndo={ganttData.onUndo}
          onRedo={ganttData.onRedo}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Gantt Chart would go here */}
          <div className="flex-1 panel rounded-2xl p-6">
            <div className="h-full flex items-center justify-center text-subtle">
              <div className="text-center">
                <CalendarDays className="w-16 h-16 mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-medium mb-2">Gantt Chart</h3>
                <p className="text-sm">Grafički prikaz rasporeda zadataka</p>
                {ganttData.isDataLoaded && (
                  <p className="text-xs mt-2">Učitano: {ganttData.ganttJson.pozicije?.length || 0} pozicija</p>
                )}
              </div>
            </div>
          </div>

          {/* Agent Interaction */}
          <AgentInteractionBar agent={agent} processCommand={processCommand} />
        </div>

        {/* Right Sidebar - Quick Actions */}
        <div className="w-80">
          <QuickCommandCards onSend={processCommand} />
        </div>
      </div>

      {/* Modals and overlays would go here */}
      {/* Add Task Modal, Image Popup, LLM Fallback, etc. */}
    </div>
  );
}