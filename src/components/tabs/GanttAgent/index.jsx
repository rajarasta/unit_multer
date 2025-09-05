import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Play, Square, Mic, AudioLines, CheckCircle2, Loader2, Send, ChevronRight, ChevronLeft, ClipboardPaste, Download, AlertCircle, CheckCircle, Maximize2, Minimize2, FileText, Undo2, Redo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useGanttAgent } from '../../../hooks/useGanttAgent.js';
import { useProjectStore } from '../../../store/useProjectStore.js';

// Import extracted components
import ProcessStagesPanel from './components/ProcessStagesPanel.jsx';
import JsonHighlighter from './components/JsonHighlighter.jsx';
import VoiceFocusBanner from './components/VoiceFocusBanner.jsx';
import MiniGanttActiveLine from './components/MiniGanttActiveLine.jsx';
import { ymd, fromYmd, addDays, diffDays, rangeDays } from './utils/dateHelpers.js';

// Sample responses for development
const SAMPLE_RESPONSES = {
  schedule_all: {
    type: "gantt_agent_response",
    tts: "Generirala sam prvi nacrt. Krenimo redom.",
    reasoning_summary: "Postavljen raspon i raspoređene tri pozicije prema normativu, 2 ekipe.",
    next_prompt: "Slažete li se s terminima za P-001?",
    intent: "schedule_all",
    commit_mode: false,
    ui_patches: [
      {
        op: "init_draft",
        draft_id: "DRAFT-001",
        project_id: "PRJ-2025-001",
        process: "montaza",
        date_range: { from: "2025-10-10", to: "2025-11-30" },
        teams: 2,
        work_hours: { start: "08:00", end: "16:00" },
      },
      {
        op: "upsert_line",
        draft_id: "DRAFT-001",
        line: {
          id: "L-001",
          pozicija_id: "P-001",
          label: "Fasada sjever",
          start: "2025-10-10",
          end: "2025-10-14",
          duration_days: 3,
          confirmed: false,
          needs_review: true,
          source: "normative",
          conflicts: [],
        },
      },
      {
        op: "upsert_line",
        draft_id: "DRAFT-001",
        line: {
          id: "L-002",
          pozicija_id: "P-002",
          label: "Fasada jug",
          start: "2025-10-15",
          end: "2025-10-22",
          duration_days: 6,
          confirmed: false,
          needs_review: true,
          source: "normative",
          conflicts: [],
        },
      },
      {
        op: "upsert_line",
        draft_id: "DRAFT-001",
        line: {
          id: "L-003",
          pozicija_id: "P-003",
          label: "Horizontalne lamele",
          start: "2025-10-23",
          end: "2025-10-28",
          duration_days: 4,
          confirmed: false,
          needs_review: true,
          source: "estimated",
          conflicts: [],
        },
      },
      { op: "set_active_line", draft_id: "DRAFT-001", line_id: "L-001" },
    ],
    backend_ops: [],
    validation: { ok: true, issues: [] },
  },
  adjust_line: {
    type: "gantt_agent_response",
    tts: "Ažurirano. Početak 12. listopada, trajanje osam dana.",
    reasoning_summary: "Korisnik pomaknuo početak i trajanje za L-001.",
    next_prompt: "Potvrđujete li novu liniju P-001?",
    intent: "set_line_dates",
    commit_mode: false,
    ui_patches: [
      {
        op: "upsert_line",
        draft_id: "DRAFT-001",
        line: {
          id: "L-001",
          pozicija_id: "P-001",
          label: "Fasada sjever",
          start: "2025-10-12",
          end: "2025-10-21",
          duration_days: 8,
          confirmed: false,
          needs_review: true,
          source: "user",
          conflicts: [],
        },
      },
    ],
    backend_ops: [],
    validation: { ok: true, issues: [] },
  },
  confirm_and_next: {
    type: "gantt_agent_response",
    tts: "Linija je potvrđena. Idemo na sljedeću.",
    reasoning_summary: "L-001 potvrđena, fokus na L-002.",
    next_prompt: "Slažete li se s terminima za P-002?",
    intent: "confirm_line",
    commit_mode: false,
    ui_patches: [
      { op: "mark_line_confirmed", draft_id: "DRAFT-001", line_id: "L-001", confirmed: true },
      { op: "set_active_line", draft_id: "DRAFT-001", line_id: "L-002" },
    ],
    backend_ops: [],
    validation: { ok: true, issues: [] },
  },
  commit_all: {
    type: "gantt_agent_response",
    tts: "Draft je potvrđen i poslan u sustav.",
    reasoning_summary: "Sve linije potvrđene, šaljem commit u backend.",
    next_prompt: "Želite li otvoriti drugi proces?",
    intent: "commit_draft",
    commit_mode: true,
    ui_patches: [],
    backend_ops: [
      { op: "commit_draft", draft_id: "DRAFT-001", project_id: "PRJ-2025-001", process: "montaza" },
    ],
    validation: { ok: true, issues: [] },
  },
};




// Gantt Canvas
function GanttCanvas({ draft, ganttJson }) {
  const { dateRange, lines = [], activeLineId } = useMemo(() => {
    // Prioritize ganttJson data over legacy draft
    if (ganttJson?.pozicije) {
      const jsonLines = ganttJson.pozicije.map((pozicija, index) => {
        const { montaza } = pozicija;
        const lineId = `L-${pozicija.id.split('-')[1]}`;
        return {
          id: lineId,
          pozicija_id: pozicija.id,
          label: pozicija.naziv,
          start: montaza.datum_pocetka,
          end: montaza.datum_zavrsetka,
          duration_days: diffDays(montaza.datum_pocetka, montaza.datum_zavrsetka) + 1,
          confirmed: false,
          needs_review: true,
          source: "json_loaded",
          conflicts: [],
          // Additional data from JSON
          opis: montaza.opis,
          osoba: montaza.osoba,
        };
      });

      // Calculate date range from JSON data
      const allDates = jsonLines.flatMap(line => [line.start, line.end]);
      const minDate = allDates.reduce((min, date) => date < min ? date : min);
      const maxDate = allDates.reduce((max, date) => date > max ? date : max);

      return {
        dateRange: { from: minDate, to: maxDate },
        lines: jsonLines,
        activeLineId: draft?.activeLineId,
      };
    }
    
    // Fallback to legacy draft format
    return {
      dateRange: draft?.dateRange || { from: "2025-10-10", to: "2025-11-30" },
      lines: Array.from(draft?.lines?.values?.() || []),
      activeLineId: draft?.activeLineId,
    };
  }, [draft, ganttJson]);

  const days = useMemo(() => rangeDays(dateRange.from, dateRange.to), [dateRange]);
  const totalDays = days.length || 1;

  return (
    <div className="h-full border rounded-lg bg-white">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cijeli Gantt — {ganttJson?.project?.name || "Projekt"} (Montaža)</h2>
          <div className="text-sm text-gray-600">
            {ganttJson ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                JSON učitan: {ganttJson.pozicije?.length || 0} pozicija
              </span>
            ) : (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                Legacy draft režim
              </span>
            )}
          </div>
        </div>
        {ganttJson?.project?.description && (
          <p className="text-sm text-gray-600 mt-1">{ganttJson.project.description}</p>
        )}
      </div>
      <div className="p-4 h-[680px]">
        <div className="border rounded-xl overflow-hidden h-full flex flex-col">
          <div className="grid" style={{ gridTemplateColumns: `240px repeat(${totalDays}, minmax(24px, 1fr))` }}>
            <div className="bg-gray-50 px-3 py-2 text-xs font-medium sticky left-0 z-10">Pozicija</div>
            {days.map((d) => (
              <div key={d} className="bg-gray-50 text-[10px] text-center py-1 border-l last:border-r">{d.slice(5)}</div>
            ))}
          </div>

          <div className="flex-1 overflow-auto">
            {lines.map((ln) => {
              const startIdx = Math.max(0, diffDays(dateRange.from, ln.start));
              const endIdx = Math.max(0, diffDays(dateRange.from, ln.end));
              const span = Math.max(1, endIdx - startIdx + 1);
              return (
                <div key={ln.id} className="grid items-center border-t" style={{ gridTemplateColumns: `240px repeat(${totalDays}, minmax(24px, 1fr))` }}>
                  <div className="px-3 py-2 text-sm sticky left-0 bg-white z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${ln.confirmed ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>{ln.pozicija_id}</span>
                      <span className="truncate" title={ln.label}>{ln.label}</span>
                      {!ln.confirmed && <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">draft</span>}
                    </div>
                    {ln.osoba && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>👤</span>
                        <span>{ln.osoba}</span>
                      </div>
                    )}
                  </div>
                  {Array.from({ length: startIdx }).map((_, i) => (
                    <div key={`pre-${ln.id}-${i}`} className="h-8 border-l" />
                  ))}
                  <div className={`h-8 rounded-md border flex items-center justify-center text-xs font-medium select-none ${
                    ln.id === activeLineId ? "bg-blue-600 text-white" : ln.confirmed ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                  }`} style={{ gridColumn: `span ${span} / span ${span}` }}>
                    {ln.start.slice(5)} → {ln.end.slice(5)}
                  </div>
                  {Array.from({ length: Math.max(0, totalDays - startIdx - span) }).map((_, i) => (
                    <div key={`post-${ln.id}-${i}`} className="h-8 border-l" />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Agent Panel
function AgentPanel({ draft, hasDraft, draftId, activeLineId, linesCount, confirmedLinesCount, lastResponse, state, transcript, isListening, isProcessing, isWaitingConfirmation, isCommitting, error, processStages, onStartListening, onStopListening, onConfirmLine, onCommitDraft, onResetAgent, clearStages, compact=false, textInput, onTextInputChange, onTextSubmit, ganttJson, onApplyJSON, onConfirmActive, onShiftActive, onDemoStages, isJsonLoaded, jsonHistory, historyIndex, canUndo, canRedo, onUndo, onRedo }) {
  const active = draft?.lines?.get?.(draft?.activeLineId);
  const [jsonText, setJsonText] = useState("");
  const [activeTab, setActiveTab] = useState("json-data");
  const [showJsonDetails, setShowJsonDetails] = useState(false);

  return (
    <div className="h-full border rounded-lg bg-white">
      <div className="p-4 border-b flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold">Gantt Agent</h2>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700">Aktiviran iz orchestratora</span>
          
          {!window.SpeechRecognition && !window.webkitSpeechRecognition ? (
            <span className="px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Mikrofon nije podržan
            </span>
          ) : (
            <button 
              className={`px-3 py-2 rounded border flex items-center gap-2 transition-colors ${isListening ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100' : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'}`}
              onClick={isListening ? onStopListening : onStartListening}
              title={isListening ? "Zaustavi glasovne naredbe (Croatian Web Speech API)" : "Pokreni glasovne naredbe (Croatian Web Speech API)"}
            >
              {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />} 
              {isListening ? "Stop" : "Start"} glas
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {!compact && <ProcessStagesPanel processStages={processStages} clearStages={clearStages} />}

        <div className="flex flex-col gap-4">
          <div className={`border border-dashed border-gray-300 rounded-lg bg-gray-50 ${compact ? 'order-2' : 'order-1'}`}>
            <div className="p-4 border-b">
              <h3 className="text-base font-medium flex items-center gap-2">
                <AudioLines className="w-4 h-4" /> Razgovor s agentom
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {/* Agent Response Display */}
              <div className="space-y-2">
                <div className="text-sm text-gray-600">{lastResponse?.next_prompt || "Od kojeg do kojeg datuma želite montirati sve pozicije?"}</div>
                {lastResponse?.tts && (
                  <div className="text-sm bg-blue-50 border border-blue-200 rounded p-2">
                    <span className="text-blue-700 font-medium">🤖 Agent odgovor:</span>
                    <div className="mt-1 text-blue-900 italic">{lastResponse.tts}</div>
                  </div>
                )}
                {lastResponse?.reasoning_summary && (
                  <div className="text-xs bg-gray-50 border rounded p-2">
                    <span className="text-gray-600 font-medium">💭 Rezoniranje:</span>
                    <div className="mt-1 text-gray-700">{lastResponse.reasoning_summary}</div>
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2 mt-2 flex-wrap">
                <button className="px-3 py-1 text-sm bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded transition-colors" onClick={() => { onDemoStages('schedule'); onApplyJSON(SAMPLE_RESPONSES.schedule_all); }}>Generiraj draft</button>
                <button className="px-3 py-1 text-sm bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded transition-colors" onClick={() => { onDemoStages('adjust'); onApplyJSON(SAMPLE_RESPONSES.adjust_line); }}>Pomakni liniju</button>
                <button className="px-3 py-1 text-sm bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded transition-colors" onClick={() => { onDemoStages('confirm'); onApplyJSON(SAMPLE_RESPONSES.confirm_and_next); }}>Potvrdi i dalje</button>
                <button className="px-3 py-1 text-sm bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 rounded transition-colors" onClick={() => { onDemoStages('commit'); onApplyJSON(SAMPLE_RESPONSES.commit_all); }}>Commit</button>
              </div>
            </div>
          </div>

          {/* JSON Data Display */}
          <div className={`border rounded-lg bg-white ${compact ? 'order-1' : 'order-2'}`}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Gantt JSON Data
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    {isJsonLoaded ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                        ✅ Učitan
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">
                        ⏳ Učitavanje...
                      </span>
                    )}
                    {jsonHistory.length > 1 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        Povijest: {historyIndex + 1}/{jsonHistory.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      onClick={onUndo}
                      disabled={!canUndo}
                      title={`Vrati promjenu (${historyIndex}/${jsonHistory.length - 1})`}
                    >
                      <Undo2 className="w-3 h-3" /> Undo
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      onClick={onRedo}
                      disabled={!canRedo}
                      title={`Ponovi promjenu (${historyIndex}/${jsonHistory.length - 1})`}
                    >
                      <Redo2 className="w-3 h-3" /> Redo
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      onClick={() => setShowJsonDetails(!showJsonDetails)}
                    >
                      {showJsonDetails ? 'Sakrij' : 'Prikaži'} detalje
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {ganttJson ? (
                <>
                  {/* Project Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <h4 className="font-medium text-blue-900">{ganttJson.project?.name}</h4>
                    <p className="text-sm text-blue-700 mt-1">{ganttJson.project?.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-blue-600">
                      <span>ID: {ganttJson.project?.id}</span>
                      <span>Pozicije: {ganttJson.pozicije?.length || 0}</span>
                      <span>Verzija: {ganttJson.metadata?.version}</span>
                    </div>
                  </div>
                  
                  {/* Positions Summary */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Pozicije ({ganttJson.pozicije?.length || 0}):</h4>
                    {ganttJson.pozicije?.map((pozicija) => (
                      <div key={pozicija.id} className="bg-gray-50 border rounded p-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">{pozicija.id}</span>
                            <span className="font-medium">{pozicija.naziv}</span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {pozicija.montaza?.datum_pocetka} → {pozicija.montaza?.datum_zavrsetka}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
                          <span>👤 {pozicija.montaza?.osoba}</span>
                        </div>
                        {showJsonDetails && (
                          <div className="text-xs text-gray-600 mt-1 bg-white border rounded p-2">
                            {pozicija.montaza?.opis}
                          </div>
                        )}
                      </div>
                    )) || []}
                  </div>
                  
                  {/* JSON Raw Display */}
                  {showJsonDetails && (
                    <div className="border-t pt-3">
                      <h4 className="font-medium text-gray-900 mb-2">Raw JSON:</h4>
                      <JsonHighlighter data={ganttJson} />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-600">
                  Nema JSON podataka. Učitavanje u tijeku...
                </div>
              )}
            </div>
          </div>
          
          {/* Active Line Panel */}
          <div className={`border rounded-lg bg-white ${compact ? 'order-3' : 'order-3'}`}>
            <div className="p-4 border-b">
              <h3 className="text-base font-medium">Aktivna linija</h3>
            </div>
            <div className="p-4 space-y-2">
              {!active ? (
                <div className="text-sm text-gray-600">Nema aktivne linije. Generirajte draft i odaberite liniju.</div>
              ) : (
                <div className="space-y-2">
                  <MiniGanttActiveLine dateRange={draft?.dateRange} line={active} />
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{active.pozicija_id}</span>
                    <div className="font-medium">{active.label}</div>
                    {active.confirmed ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> potvrđeno
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">draft</span>
                    )}
                  </div>
                  <div className="text-sm grid grid-cols-2 gap-2">
                    <div><span className="text-gray-600">Početak:</span> {active.start}</div>
                    <div><span className="text-gray-600">Kraj:</span> {active.end}</div>
                    <div><span className="text-gray-600">Trajanje:</span> {active.duration_days} dana</div>
                    <div><span className="text-gray-600">Izvor:</span> {active.source}</div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button 
                      className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={onConfirmActive} 
                      disabled={!active || active.confirmed}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Potvrdi liniju
                    </button>
                    <button 
                      className="px-3 py-1 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => onShiftActive(-1)} 
                      disabled={!active || active.confirmed}
                      title="Pomiče početak i kraj -1 dan"
                    >
                      <ChevronLeft className="w-4 h-4" /> -1 dan
                    </button>
                    <button 
                      className="px-3 py-1 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => onShiftActive(1)} 
                      disabled={!active || active.confirmed}
                      title="Pomiče početak i kraj +1 dan"
                    >
                      +1 dan <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border rounded-lg bg-white order-3">
            <div className="border-b">
              <div className="flex">
                <button 
                  className={`px-4 py-2 text-sm border-b-2 ${activeTab === 'json-in' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setActiveTab('json-in')}
                >
                  JSON → UI
                </button>
                <button 
                  className={`px-4 py-2 text-sm border-b-2 ${activeTab === 'json-last' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setActiveTab('json-last')}
                >
                  Zadnji odgovor
                </button>
                <button 
                  className={`px-4 py-2 text-sm border-b-2 ${activeTab === 'draft-meta' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
                  onClick={() => setActiveTab('draft-meta')}
                >
                  Draft meta
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {activeTab === 'json-in' && (
                <div className="space-y-2">
                  <textarea 
                    rows={8} 
                    placeholder="Zalijepi gantt_agent_response JSON ovdje…" 
                    value={jsonText} 
                    onChange={(e) => setJsonText(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-sm font-mono"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 rounded flex items-center gap-1 transition-colors"
                      onClick={() => {
                        try { onApplyJSON(JSON.parse(jsonText)); } catch (e) { alert("Neispravan JSON"); }
                      }}
                    >
                      <ClipboardPaste className="w-4 h-4" /> Primijeni JSON
                    </button>
                    <button 
                      className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      onClick={() => setJsonText(JSON.stringify(SAMPLE_RESPONSES.schedule_all, null, 2))}
                    >
                      Umetni primjer
                    </button>
                    <button 
                      className="px-3 py-2 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      onClick={() => setJsonText(JSON.stringify(SAMPLE_RESPONSES.adjust_line, null, 2))}
                    >
                      Umetni korekciju
                    </button>
                  </div>
                </div>
              )}
              
              {activeTab === 'json-last' && (
                <JsonHighlighter data={lastResponse} />
              )}
              
              {activeTab === 'draft-meta' && (
                <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto max-h-60 font-mono border">{JSON.stringify({
                  draftId: draft?.draftId,
                  projectId: draft?.projectId,
                  process: draft?.process,
                  dateRange: draft?.dateRange,
                  teams: draft?.teams,
                  workHours: draft?.workHours,
                  activeLineId: draft?.activeLineId,
                  lines: Array.from(draft?.lines?.values?.() || []),
                }, null, 2)}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Voice Focus Banner

/**
 * Gantt Agent Tab - Glasovno upravljanje Gantt dijagramima
 * 
 * ARHITEKTURA:
 * ===========
 * 1. VOICE PIPELINE: OpenAI Whisper (ASR) → GPT (NLU + Response) → UI Update
 * 2. JSON MANAGEMENT: Učitava sample-gantt.json kao "poznatu datoteku" 
 * 3. REAL-TIME EDITING: Agent modificira JSON strukture preko voice commands
 * 4. VISUAL FEEDBACK: Prikazuje promjene u Gantt view + JSON highlighter
 * 5. CONVERSATION FLOW: Agent predlaže daljnje korake i opcije
 * 
 * JSON STRUKTURA:
 * ===============
 * - project: {id, name, description}
 * - pozicije: [
 *     {
 *       id: "P-001",
 *       naziv: "Fasada Sjever", 
 *       montaza: {
 *         opis: "Detaljni opis montaže",
 *         osoba: "Ime i prezime odgovorne osobe",
 *         datum_pocetka: "YYYY-MM-DD",
 *         datum_zavrsetka: "YYYY-MM-DD"
 *       }
 *     }
 *   ]
 * 
 * VOICE COMMANDS PRIMJERI:
 * =======================
 * - "Pomakni početak montaže za P-001 na 12. listopad"
 * - "Promijeni osobu za fasadu jug u Petra Marića" 
 * - "Produži montažu lamelnih elemenata za 3 dana"
 * - "Dodaj novu poziciju balkonska ograda"
 * - "Koji su datumi za sve pozicije?"
 * 
 * INTEGRATION TOČKE:
 * ==================
 * - useKnownDocsV2: Registrira JSON kao "poznatu datoteku"
 * - OpenAI API: Whisper + GPT-4 for voice processing 
 * - Real-time updates: JSON → UI state sync
 * - Agent suggestions: Kontinuirani prijedlozi optimizacija
 */

// Main Component
export default function GanttAgentTab() {
  // Use project store for current project context
  const { activeProject } = useProjectStore();
  const projectId = activeProject?.id || 'PRJ-2025-001'; // Fallback project ID
  
  // Initialize Gantt Agent hook with real backend integration
  const {
    state,
    draft,
    lastResponse,
    processStages,
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    processTextCommand,
    confirmLine,
    commitDraft,
    resetAgent,
    clearStages,
    isIdle,
    isProcessing,
    isWaitingConfirmation,
    isCommitting,
    hasError,
    hasDraft,
    draftId,
    activeLineId,
    linesCount,
    confirmedLinesCount
  } = useGanttAgent(projectId);

  // UI STATE
  const [focusMode, setFocusMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  
  // SPEECH RECOGNITION STATE
  const [recognition, setRecognition] = useState(null);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  
  // JSON HISTORY STATE
  const [jsonHistory, setJsonHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [ganttJson, setGanttJson] = useState(null);
  
  // Derived values
  const isJsonLoaded = !!ganttJson;

  console.log('🎯 GanttAgent render:', {
    state,
    hasDraft,
    linesCount,
    isListening,
    hasError: !!error,
    isJsonLoaded
  });

  // Initialize component
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      // Configure speech recognition for Croatian
      recognitionInstance.lang = 'hr-HR';
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.maxAlternatives = 1;
      
      // Event handlers
      recognitionInstance.onstart = () => {
        console.log('🎤 Speech recognition started');
        setLiveTranscript('');
      };
      
      recognitionInstance.onresult = (event) => {
        console.log('🔊 =================================');
        console.log('🎤 SPEECH RECOGNITION RESULT');
        console.log('🔊 =================================');
        console.log('🗺 Event details:', {
          resultIndex: event.resultIndex,
          resultsLength: event.results.length,
          isFinal: event.results[event.resultIndex]?.isFinal
        });
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          console.log(`🔍 Result ${i}:`, {
            transcript: transcript,
            confidence: confidence,
            isFinal: event.results[i].isFinal
          });
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        console.log('🔥 TRANSCRIPTS:');
        console.log('  Final:', finalTranscript);
        console.log('  Interim:', interimTranscript);
        console.log('  Combined:', finalTranscript + interimTranscript);
        
        // Update live transcript for UI feedback
        setLiveTranscript(finalTranscript + interimTranscript);
        
        // Process final transcript
        if (finalTranscript.trim()) {
          console.log('🚀 PROCESSING FINAL TRANSCRIPT:', finalTranscript);
          console.log('🧪 Characters:', [...finalTranscript.trim()]);
          processVoiceCommand(finalTranscript.trim());
        }
        
        console.log('🔊 =================================');
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          alert('Mikrofonski pristup je potreban za glasovne naredbe. Molimo dozvolite pristup.');
        }
      };
      
      recognitionInstance.onend = () => {
        console.log('🎤 Speech recognition ended');
        // Restart if still listening (continuous mode)
        if (isListening && !isProcessingVoice) {
          setTimeout(() => {
            try {
              recognitionInstance.start();
            } catch (e) {
              console.warn('Could not restart recognition:', e);
            }
          }, 100);
        }
      };
      
      setRecognition(recognitionInstance);
      setIsRecognitionSupported(true);
    } else {
      console.warn('⚠️ Web Speech API not supported in this browser');
      setIsRecognitionSupported(false);
    }
  }, []);
  
  // Start/stop speech recognition based on listening state
  useEffect(() => {
    if (!recognition || isProcessingVoice) return;
    
    if (isListening) {
      try {
        // Check if already running to prevent InvalidStateError
        if (recognition.state === 'inactive') {
          recognition.start();
          console.log('🎤 Started speech recognition');
        } else {
          console.warn('🚀 Recognition already active, skipping start');
        }
      } catch (e) {
        console.warn('Could not start recognition:', e);
        // Try to reset and start again
        setTimeout(() => {
          try {
            recognition.start();
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }, 100);
      }
    } else {
      try {
        recognition.stop();
        setLiveTranscript('');
        console.log('🎤 Stopped speech recognition');
      } catch (e) {
        console.warn('Could not stop recognition:', e);
      }
    }
  }, [isListening, recognition, isProcessingVoice]);

  // JSON LOADING EFFECT
  // ===================  
  // Učitava sample JSON pri mount-u komponente
  useEffect(() => {
    loadSampleGanttJson();
  }, []);

  /**
   * CORE FUNCTION: loadSampleGanttJson
   * =================================
   * Učitava sample-gantt.json i registrira ga kao "poznatu datoteku"
   * Ovo omogućava da agent može referencirati i modificirati JSON strukturu
   */
  const loadSampleGanttJson = async () => {
    try {
      // Učitaj JSON datoteku iz src/data/
      const response = await fetch('/src/data/sample-gantt.json');
      const jsonData = await response.json();
      
      setGanttJson(jsonData);
      
      // Inicijaliziraj povijest za undo/redo
      setJsonHistory([jsonData]);
      setHistoryIndex(0);
      
      // Stvori draft state iz JSON strukture za kompatibilnost s postojećim UI
      convertJsonToDraft(jsonData);
      
      console.log('📊 Gantt JSON loaded:', jsonData);
      
      // TODO: Registrirati kao "poznatu datoteku" u useKnownDocsV2
      // registerKnownDocument('sample-gantt.json', jsonData);
      
    } catch (error) {
      console.error('❌ Failed to load Gantt JSON:', error);
      // Fallback na mock data
      const fallbackData = createFallbackJson();
      setGanttJson(fallbackData);
      convertJsonToDraft(fallbackData);
      setHistoryIndex(0);
    }
  };

  /**
   * HELPER FUNCTION: createFallbackJson
   * ===================================
   * Stvara fallback JSON strukturu ako učitavanje datoteke ne uspije
   */
  const createFallbackJson = () => ({
    project: {
      id: "PRJ-2025-001",
      name: "Voltaža - Fasadni Sustav", 
      description: "Montaža aluminijske fasade za stambenu zgradu"
    },
    pozicije: [
      {
        id: "P-001",
        naziv: "Fasada Sjever",
        montaza: {
          opis: "Montaža aluminijskih panela na sjevernoj strani zgrade",
          osoba: "Marko Petrović", 
          datum_pocetka: "2025-10-10",
          datum_zavrsetka: "2025-10-15"
        }
      },
      {
        id: "P-002",
        naziv: "Fasada Jug", 
        montaza: {
          opis: "Montaža aluminijskih panela na južnoj strani zgrade s posebnim UV zaštitnim slojem",
          osoba: "Ana Kovačević",
          datum_pocetka: "2025-10-16", 
          datum_zavrsetka: "2025-10-22"
        }
      },
      {
        id: "P-003",
        naziv: "Horizontalne Lamele",
        montaza: {
          opis: "Ugradnja horizontalnih lamelnih elemenata za suncobran i estetski učinak", 
          osoba: "Tomislav Novak",
          datum_pocetka: "2025-10-23",
          datum_zavrsetka: "2025-10-28"
        }
      }
    ],
    metadata: {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      version: "1.0",
      editor: "Voice Gantt Agent"
    }
  });

  /**
   * CORE FUNCTION: convertJsonToDraft  
   * =================================
   * Konvertira JSON strukturu u draft state za kompatibilnost s postojećim UI
   * Ova funkcija će se ukloniti kad refactoramo UI da radi direktno s JSON-om
   */
  const convertJsonToDraft = (jsonData) => {
    if (!jsonData?.pozicije) return;

    const lines = new Map();
    let earliestDate = null;
    let latestDate = null;

    jsonData.pozicije.forEach((pozicija) => {
      const { montaza } = pozicija;
      const lineId = `L-${pozicija.id.split('-')[1]}`;
      
      // Konvertiraj poziciju u draft line format
      lines.set(lineId, {
        id: lineId,
        pozicija_id: pozicija.id,
        label: pozicija.naziv,
        start: montaza.datum_pocetka,
        end: montaza.datum_zavrsetka,
        duration_days: diffDays(montaza.datum_pocetka, montaza.datum_zavrsetka) + 1,
        confirmed: false, // Sve su u draft modu
        needs_review: true,
        source: "json_loaded",
        conflicts: [],
        // Dodatne informacije iz JSON-a
        opis: montaza.opis,
        osoba: montaza.osoba
      });

      // Izračunaj date range za cijeli projekt
      const startDate = new Date(montaza.datum_pocetka);
      const endDate = new Date(montaza.datum_zavrsetka);
      
      if (!earliestDate || startDate < earliestDate) earliestDate = startDate;
      if (!latestDate || endDate > latestDate) latestDate = endDate;
    });

    // Note: Draft state is managed by useGanttAgent hook
    // This function converts JSON to internal representation for display purposes
    const draftInfo = {
      draftId: `DRAFT-${jsonData.project.id}`,
      projectId: jsonData.project.id,
      dateRange: {
        from: earliestDate ? earliestDate.toISOString().split('T')[0] : "2025-10-10",
        to: latestDate ? latestDate.toISOString().split('T')[0] : "2025-10-30"
      },
      lines,
      activeLineId: lines.size > 0 ? Array.from(lines.keys())[0] : null
    };

    console.log('🔄 Converted JSON to draft:', { lines: lines.size, dateRange: { from: earliestDate, to: latestDate } });
  };

  // Handle text input (debugging/manual mode)
  const handleTextSubmit = useCallback(async () => {
    if (textInput.trim()) {
      console.log('📝 Processing text command:', textInput);
      await processTextCommand(textInput.trim());
      setTextInput("");
    }
  }, [textInput, processTextCommand]);

  // Demo/debugging handlers (placeholders)
  const handleApplyJSON = useCallback((jsonResponse) => {
    console.log('🧪 Applying demo JSON response:', jsonResponse);
    // This would normally integrate with the agent system
  }, []);

  const handleConfirmActive = useCallback(() => {
    console.log('✅ Confirming active line');
    // This would normally confirm the current active line
  }, []);

  const handleShiftActive = useCallback((direction) => {
    console.log('🔄 Shifting active line:', direction);
    // This would normally shift focus to next/previous line
  }, []);

  const handleDemoStages = useCallback((stageType) => {
    console.log('🎬 Demo stages:', stageType);
    // This would normally trigger demo stage animations
  }, []);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    undoLastChange();
  }, []);

  const handleRedo = useCallback(() => {
    redoLastChange();
  }, []);

  // Handle line confirmation
  const handleConfirmLine = useCallback(async (lineId) => {
    console.log('✅ Confirming line:', lineId);
    await confirmLine(lineId);
  }, [confirmLine]);

  // Handle draft commit
  const handleCommitDraft = useCallback(async () => {
    console.log('💾 Committing draft...');
    try {
      const result = await commitDraft();
      console.log('✅ Draft committed successfully:', result);
    } catch (error) {
      console.error('❌ Draft commit failed:', error);
    }
  }, [commitDraft]);

  /**
   * HELPER FUNCTION: calculateDaysBetween
   * ====================================
   * Izračunava broj radnih dana između dva datuma
   */
  const calculateDaysBetween = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  /**
   * MOCK FUNCTION: simulateOpenAIResponse
   * ====================================
   * Simulira OpenAI API response za razvoj i testiranje
   * TODO: Zamijeniti s pravim API pozivom na /api/transcribe + /api/llm/gantt
   */
  const simulateOpenAIResponse = async (transcript, currentJson) => {
    // Simuliraj delay za API poziv
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Jednostavna analiza intent-a na temelju ključnih riječi
    const lowerTranscript = transcript.toLowerCase();
    
    if (lowerTranscript.includes('pomakni') && lowerTranscript.includes('početak')) {
      return {
        jsonModification: {
          operation: 'update_date',
          pozicija_id: 'P-001',
          field: 'datum_pocetka',
          new_value: '2025-10-12'
        },
        agentResponse: {
          type: "gantt_agent_response",
          tts: "Pomaknuo sam početak montaže za P-001 na 12. listopad.",
          reasoning_summary: "Korisnik je tražio pomak početka montaže.",
          next_prompt: "Želite li pomaknuti i ostale pozicije ili je ovo u redu?",
          intent: "modify_date",
          suggestions: ["Pomakni sve pozicije za 2 dana", "Provjeri preklapanja", "Potvrdi promjene"]
        }
      };
    }
    
    if (lowerTranscript.includes('promijeni') && lowerTranscript.includes('osobu')) {
      return {
        jsonModification: {
          operation: 'update_person',
          pozicija_id: 'P-002', 
          field: 'osoba',
          new_value: 'Petar Marić'
        },
        agentResponse: {
          type: "gantt_agent_response",
          tts: "Promijenio sam osobu za fasadu jug u Petra Marića.",
          reasoning_summary: "Korisnik je tražio promjenu odgovorne osobe.",
          next_prompt: "Je li potrebno obavijestiti novu osobu o terminu?",
          intent: "modify_person",
          suggestions: ["Pošalji obavijest", "Provjeri dostupnost", "Ažuriraj kontakte"]
        }
      };
    }
    
    if (lowerTranscript.includes('koji') && lowerTranscript.includes('datumi')) {
      return {
        jsonModification: null, // Nema promjene, samo query
        agentResponse: {
          type: "gantt_agent_response", 
          tts: "Evo pregleda svih datuma: P-001 od 10. do 15. listopad, P-002 od 16. do 22. listopad, P-003 od 23. do 28. listopad.",
          reasoning_summary: "Korisnik je tražio pregled svih datuma montaže.",
          next_prompt: "Trebate li modificirati neke od ovih datuma?",
          intent: "query_dates",
          suggestions: ["Pomakni sve za 1 tjedan", "Optimiziraj preklapanja", "Izvezi kalendar"]
        }
      };
    }
    
    // Default response za neprepoznate naredbe
    return {
      jsonModification: null,
      agentResponse: {
        type: "gantt_agent_response",
        tts: "Nisam sigurna što točno tražite. Možete li ponoviti jasnije?",
        reasoning_summary: "Naredba nije jasno prepoznata.",
        next_prompt: "Pokušajte s naredbama poput 'pomakni datum', 'promijeni osobu' ili 'dodaj poziciju'.",
        intent: "clarification_needed", 
        suggestions: ["Pomakni datume", "Promijeni osobe", "Dodaj poziciju", "Pregled statusa"]
      }
    };
  };

  /**
   * CROATIAN NLU PATTERNS
   * =====================
   * Advanced regex patterns for Croatian voice command recognition
   */
  const CROATIAN_NLU_PATTERNS = {
    // Date modification patterns
    MOVE_START_DATE: [
      /pomakni\s+početak\s+(montaže?|rada)?\s*(za|kod)\s*(P-\d+|pozicij[au]\s+\d+)\s*(na|za)\s*(.+)/i,
      /promijeni\s+početak\s*(za|kod)\s*(P-\d+|pozicij[au]\s+\d+)\s*(na|u)\s*(.+)/i,
      /početak\s+(P-\d+)\s*(pomakni|promijeni|stavi)\s*(na|za)\s*(.+)/i
    ],
    
    MOVE_END_DATE: [
      /pomakni\s+(kraj|završetak)\s+(montaže?|rada)?\s*(za|kod)\s*(P-\d+|pozicij[au]\s+\d+)\s*(na|za)\s*(.+)/i,
      /produži\s+(montažu|rad)\s*(za|kod)\s*(P-\d+|pozicij[au]\s+\d+)\s*(za|do)\s*(.+)/i,
      /(završetak|kraj)\s+(P-\d+)\s*(pomakni|promijeni|stavi)\s*(na|za)\s*(.+)/i
    ],
    
    // Person modification patterns
    CHANGE_PERSON: [
      /promijeni\s+osobu\s*(za|kod|na)\s*(P-\d+|pozicij[au]\s+\d+|fasad[au]\s+\w+)\s*(u|na)\s*(.+)/i,
      /stavi\s+(.+)\s+(na|za|kod)\s*(P-\d+|pozicij[au]\s+\d+|fasad[au]\s+\w+)/i,
      /osob[au]\s*(za|na|kod)\s*(P-\d+|pozicij[au]\s+\d+|fasad[au]\s+\w+)\s*(je|treba\s+biti)\s*(.+)/i
    ],
    
    // Query patterns
    QUERY_DATES: [
      /(koji|kakvi)\s+(su\s+)?datumi?/i,
      /prikaži\s+(sve\s+)?datum[ei]/i,
      /kad[a]?\s+(je|su|počinje|završava)/i,
      /pregled\s+datum[a]?/i
    ],
    
    QUERY_PEOPLE: [
      /(tko|koji)\s+(radi|je\s+odgovoran)\s*(za|na)/i,
      /prikaži\s+(sve\s+)?osobe/i,
      /pregled\s+radnik[a]?/i
    ],
    
    // Add/delete patterns
    ADD_POSITION: [
      /dodaj\s+(nov[au]\s+)?pozicij[au]\s*(.+)?/i,
      /stvori\s+(nov[au]\s+)?pozicij[au]\s*(.+)?/i,
      /trebam\s+(nov[au]\s+)?pozicij[au]\s*(.+)?/i
    ],
    
    DELETE_POSITION: [
      /(obriši|ukloni|makni)\s+pozicij[au]\s*(P-\d+|\d+)/i,
      /(neće\s+biti|otkaži)\s*(P-\d+|pozicij[au]\s+\d+)/i
    ]
  };
  
  /**
   * ENHANCED NLU FUNCTION: analyzeCroatianCommand
   * ============================================
   * Advanced pattern matching for Croatian voice commands
   */
  const analyzeCroatianCommand = (transcript) => {
    const normalizedText = transcript.toLowerCase().trim();
    console.log('🚨 =================================');
    console.log('🎙️ VOICE COMMAND DEBUG');
    console.log('🚨 =================================');
    console.log('📝 Original transcript:', transcript);
    console.log('🔤 Normalized text:', normalizedText);
    console.log('📏 Text length:', normalizedText.length);
    console.log('🧪 Text characters:', [...normalizedText]);
    
    // Extract position ID if present
    const pozicijaMatch = normalizedText.match(/(P-\d+|pozicij[au]\s+(\d+))/i);
    const pozicijaId = pozicijaMatch ? (pozicijaMatch[1].startsWith('P-') ? pozicijaMatch[1] : `P-${pozicijaMatch[2].padStart(3, '0')}`) : null;
    
    // Date modification patterns
    for (const pattern of CROATIAN_NLU_PATTERNS.MOVE_START_DATE) {
      const match = normalizedText.match(pattern);
      if (match) {
        const dateStr = extractDateFromText(match[match.length - 1]);
        return {
          intent: 'modify_start_date',
          pozicija_id: pozicijaId || 'P-001',
          new_date: dateStr,
          confidence: 0.9,
          matched_pattern: 'MOVE_START_DATE'
        };
      }
    }
    
    for (const pattern of CROATIAN_NLU_PATTERNS.CHANGE_PERSON) {
      const match = normalizedText.match(pattern);
      if (match) {
        const personName = extractPersonName(match[match.length - 1]);
        return {
          intent: 'modify_person',
          pozicija_id: pozicijaId || detectPositionFromContext(normalizedText),
          new_person: personName,
          confidence: 0.85,
          matched_pattern: 'CHANGE_PERSON'
        };
      }
    }
    
    for (const pattern of CROATIAN_NLU_PATTERNS.QUERY_DATES) {
      if (pattern.test(normalizedText)) {
        return {
          intent: 'query_dates',
          confidence: 0.8,
          matched_pattern: 'QUERY_DATES'
        };
      }
    }
    
    for (const pattern of CROATIAN_NLU_PATTERNS.ADD_POSITION) {
      const match = normalizedText.match(pattern);
      if (match) {
        return {
          intent: 'add_position',
          new_position_name: match[2] || 'Nova pozicija',
          confidence: 0.85,
          matched_pattern: 'ADD_POSITION'
        };
      }
    }
    
    // EXTENSIVE DEBUG LOGGING
    console.log('❌ NO PATTERNS MATCHED!');
    console.log('🧪 TESTING ALL PATTERNS:');
    
    // Test each pattern category
    console.log('\n📅 TESTING MOVE_START_DATE patterns:');
    CROATIAN_NLU_PATTERNS.MOVE_START_DATE.forEach((pattern, i) => {
      const match = normalizedText.match(pattern);
      console.log(`  Pattern ${i+1}:`, pattern.toString());
      console.log(`  Match result:`, match);
    });
    
    console.log('\n👤 TESTING CHANGE_PERSON patterns:');
    CROATIAN_NLU_PATTERNS.CHANGE_PERSON.forEach((pattern, i) => {
      const match = normalizedText.match(pattern);
      console.log(`  Pattern ${i+1}:`, pattern.toString());
      console.log(`  Match result:`, match);
    });
    
    console.log('\n❓ TESTING QUERY_DATES patterns:');
    CROATIAN_NLU_PATTERNS.QUERY_DATES.forEach((pattern, i) => {
      const test = pattern.test(normalizedText);
      console.log(`  Pattern ${i+1}:`, pattern.toString());
      console.log(`  Test result:`, test);
    });
    
    console.log('\n➕ TESTING ADD_POSITION patterns:');
    CROATIAN_NLU_PATTERNS.ADD_POSITION.forEach((pattern, i) => {
      const match = normalizedText.match(pattern);
      console.log(`  Pattern ${i+1}:`, pattern.toString());
      console.log(`  Match result:`, match);
    });
    
    // Basic keyword tests
    console.log('\n🔍 BASIC KEYWORD TESTS:');
    console.log('  Contains "pomakni":', normalizedText.includes('pomakni'));
    console.log('  Contains "početak":', normalizedText.includes('početak'));
    console.log('  Contains "promijeni":', normalizedText.includes('promijeni'));
    console.log('  Contains "osobu":', normalizedText.includes('osobu'));
    console.log('  Contains "koji":', normalizedText.includes('koji'));
    console.log('  Contains "datumi":', normalizedText.includes('datumi'));
    console.log('  Contains "dodaj":', normalizedText.includes('dodaj'));
    console.log('  Contains "poziciju":', normalizedText.includes('poziciju'));
    
    console.log('🚨 =================================');
    console.log('❌ FALLBACK TO CLARIFICATION_NEEDED');
    console.log('🚨 =================================');
    
    // Default fallback with extensive debug info
    return {
      intent: 'clarification_needed',
      confidence: 0.1,
      original_text: normalizedText,
      debug_info: {
        originalTranscript: transcript,
        normalizedText: normalizedText,
        textLength: normalizedText.length,
        characters: [...normalizedText],
        patternsAvailable: Object.keys(CROATIAN_NLU_PATTERNS),
        basicKeywords: {
          pomakni: normalizedText.includes('pomakni'),
          početak: normalizedText.includes('početak'),
          promijeni: normalizedText.includes('promijeni'),
          osobu: normalizedText.includes('osobu'),
          koji: normalizedText.includes('koji'),
          datumi: normalizedText.includes('datumi'),
          dodaj: normalizedText.includes('dodaj'),
          poziciju: normalizedText.includes('poziciju')
        }
      }
    };
  };
  
  /**
   * HELPER FUNCTIONS for Croatian NLU
   * =================================
   */
  const extractDateFromText = (dateText) => {
    // Croatian month names
    const months = {
      'siječanj': '01', 'veljača': '02', 'ožujak': '03', 'travanj': '04',
      'svibanj': '05', 'lipanj': '06', 'srpanj': '07', 'kolovoz': '08',
      'rujan': '09', 'listopad': '10', 'studeni': '11', 'prosinac': '12'
    };
    
    // Try to extract date patterns
    const dayMonth = dateText.match(/(\d{1,2})\.?\s*(\w+)/i);
    if (dayMonth) {
      const day = dayMonth[1].padStart(2, '0');
      const monthName = dayMonth[2].toLowerCase();
      const month = months[monthName] || '10'; // default listopad
      return `2025-${month}-${day}`;
    }
    
    // Simple day number (assume current month)
    const dayOnly = dateText.match(/(\d{1,2})/i);
    if (dayOnly) {
      const day = dayOnly[1].padStart(2, '0');
      return `2025-10-${day}`; // Default to October 2025
    }
    
    return '2025-10-12'; // Default fallback
  };
  
  const extractPersonName = (personText) => {
    // Clean up the person name
    return personText.replace(/^(u|na)\s+/i, '').trim()
                   .split(' ')
                   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                   .join(' ');
  };
  
  const detectPositionFromContext = (text) => {
    if (text.includes('fasad') && text.includes('sjever')) return 'P-001';
    if (text.includes('fasad') && text.includes('jug')) return 'P-002';
    if (text.includes('lamel')) return 'P-003';
    return 'P-001'; // Default
  };
  
  const formatDateCroatian = (dateStr) => {
    const months = ['siječnja', 'veljače', 'ožujka', 'travnja', 'svibnja', 'lipnja',
                   'srpnja', 'kolovoza', 'rujna', 'listopada', 'studenog', 'prosinca'];
    const date = new Date(dateStr);
    return `${date.getDate()}. ${months[date.getMonth()]}`;
  };
  
  /**
   * ENHANCED FUNCTION: processVoiceCommandWithNLU
   * ============================================
   * Now uses Croatian NLU patterns for better command recognition
   */
  const processVoiceCommandWithNLU = async (transcript, currentJson) => {
    console.log('🚨 ===== PROCESS VOICE COMMAND WITH NLU =====');
    console.log('📝 Input transcript:', transcript);
    console.log('📊 Current JSON:', currentJson);
    
    // Analyze command with Croatian NLU
    const analysis = analyzeCroatianCommand(transcript);
    console.log('🤖 🔥 NLU ANALYSIS RESULT:', analysis);
    console.log('🎣 Intent detected:', analysis.intent);
    console.log('📈 Confidence:', analysis.confidence);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate response based on intent
    switch (analysis.intent) {
      case 'modify_start_date':
        return {
          jsonModification: {
            operation: 'update_date',
            pozicija_id: analysis.pozicija_id,
            field: 'datum_pocetka',
            new_value: analysis.new_date
          },
          agentResponse: {
            type: "gantt_agent_response",
            tts: `Pomaknuo sam početak montaže za ${analysis.pozicija_id} na ${formatDateCroatian(analysis.new_date)}.`,
            reasoning_summary: `Prepoznao sam zahtjev za promjenu datuma početka (${Math.round(analysis.confidence * 100)}% sigurnost).`,
            next_prompt: "Želite li pomaknuti i ostale pozicije ili je ovo u redu?",
            intent: analysis.intent,
            suggestions: ["Pomakni sve pozicije", "Provjeri preklapanja", "Potvrdi promjene"]
          }
        };
        
      case 'modify_person':
        return {
          jsonModification: {
            operation: 'update_person',
            pozicija_id: analysis.pozicija_id,
            field: 'osoba',
            new_value: analysis.new_person
          },
          agentResponse: {
            type: "gantt_agent_response",
            tts: `Promijenio sam osobu za ${analysis.pozicija_id} u ${analysis.new_person}.`,
            reasoning_summary: `Prepoznao sam zahtjev za promjenu odgovorne osobe (${Math.round(analysis.confidence * 100)}% sigurnost).`,
            next_prompt: "Je li potrebno obavijestiti novu osobu?",
            intent: analysis.intent,
            suggestions: ["Pošalji obavijest", "Provjeri dostupnost", "Ažuriraj kontakte"]
          }
        };
        
      case 'query_dates':
        const datesSummary = currentJson?.pozicije?.map(p => 
          `${p.id}: ${formatDateCroatian(p.montaza.datum_pocetka)} - ${formatDateCroatian(p.montaza.datum_zavrsetka)}`
        ).join(', ') || 'Nema dostupnih podataka';
        
        return {
          jsonModification: null,
          agentResponse: {
            type: "gantt_agent_response",
            tts: `Evo pregleda datuma: ${datesSummary}`,
            reasoning_summary: "Korisnik je tražio pregled svih datuma montaže.",
            next_prompt: "Trebate li modificirati neki od datuma?",
            intent: analysis.intent,
            suggestions: ["Pomakni sve za 1 tjedan", "Optimiziraj preklapanja", "Izvezi kalendar"]
          }
        };
        
      case 'add_position':
        const newId = `P-${String((currentJson?.pozicije?.length || 0) + 1).padStart(3, '0')}`;
        return {
          jsonModification: {
            operation: 'add_pozicija',
            new_pozicija: {
              id: newId,
              naziv: analysis.new_position_name,
              montaza: {
                opis: `Nova pozicija: ${analysis.new_position_name}`,
                osoba: "TBD",
                datum_pocetka: "2025-11-01",
                datum_zavrsetka: "2025-11-05"
              }
            }
          },
          agentResponse: {
            type: "gantt_agent_response",
            tts: `Dodao sam novu poziciju ${newId}: ${analysis.new_position_name}`,
            reasoning_summary: "Stvorio sam novu poziciju s default vrijednostima.",
            next_prompt: "Trebate li modificirati datum ili osobu za novu poziciju?",
            intent: analysis.intent,
            suggestions: ["Stavi datum", "Dodijeli osobu", "Promijeni opis"]
          }
        };
        
      default:
        return {
          jsonModification: null,
          agentResponse: {
            type: "gantt_agent_response",
            tts: `Nisam razumio naredbu: "${transcript}". Možete li biti precizniji?`,
            reasoning_summary: `Naredba nije prepoznata (${Math.round(analysis.confidence * 100)}% sigurnost).`,
            next_prompt: "Pokušajte s naredbama poput 'pomakni početak za P-001' ili 'promijeni osobu za fasadu'.",
            intent: "clarification_needed",
            suggestions: ["Pomakni datume", "Promijeni osobe", "Dodaj poziciju", "Pregled statusa"]
          }
        };
    }
  };

  /**
   * CORE FUNCTION: updateGanttJson
   * ==============================
   * Ažurira glavnu JSON strukturu na temelju agent modifications
   */
  const updateGanttJson = (modification) => {
    if (!modification || !ganttJson) return;
    
    const newJson = { ...ganttJson };
    newJson.metadata.modified = new Date().toISOString();
    
    // Handle different operations
    switch (modification.operation) {
      case 'update_date':
      case 'update_person':
        // Pronađi poziciju za modificiranje
        const pozicijaIndex = newJson.pozicije.findIndex(p => p.id === modification.pozicija_id);
        if (pozicijaIndex !== -1) {
          newJson.pozicije[pozicijaIndex].montaza[modification.field] = modification.new_value;
        }
        break;
        
      case 'add_pozicija':
        if (modification.new_pozicija) {
          newJson.pozicije.push(modification.new_pozicija);
        }
        break;
        
      case 'delete_pozicija':
        newJson.pozicije = newJson.pozicije.filter(p => p.id !== modification.pozicija_id);
        break;
        
      default:
        console.warn('Unknown modification operation:', modification.operation);
        return;
    }
    
    // Ažuriraj state i povijest (trim history if we're not at the end)
    const newHistory = jsonHistory.slice(0, historyIndex + 1);
    newHistory.push(newJson);
    
    setGanttJson(newJson);
    setJsonHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Re-generiraj draft za UI kompatibilnost
    convertJsonToDraft(newJson);
    
    console.log('🔄 JSON updated:', modification);
    console.log('📚 History:', { total: newHistory.length, current: newHistory.length - 1 });
  };

  /**
   * UNDO/REDO FUNCTIONALITY
   * =======================
   * Navigacija kroz JSON povijest promjena
   */
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < jsonHistory.length - 1;
  
  const undoLastChange = () => {
    if (!canUndo) return;
    
    const newIndex = historyIndex - 1;
    const previousJson = jsonHistory[newIndex];
    
    setGanttJson(previousJson);
    setHistoryIndex(newIndex);
    convertJsonToDraft(previousJson);
    
    console.log('⏪ Undo applied:', { from: historyIndex, to: newIndex });
  };
  
  const redoLastChange = () => {
    if (!canRedo) return;
    
    const newIndex = historyIndex + 1;
    const nextJson = jsonHistory[newIndex];
    
    setGanttJson(nextJson);
    setHistoryIndex(newIndex);
    convertJsonToDraft(nextJson);
    
    console.log('⏩ Redo applied:', { from: historyIndex, to: newIndex });
  };
  
  /**
   * HELPER FUNCTION: generateNextSuggestions
   * ========================================
   * Generira prijedloge za sljedeće akcije na temelju agent response
   */
  const generateNextSuggestions = (response) => {
    // TODO: Implementiraj logiku za generiranje pametnih prijedloga
    console.log('💡 Generated suggestions:', response.suggestions);
  };

  const startDemoStages = (kind) => {
    const now = Date.now();
    const base = [
      { id: "asr", name: "ASR", icon: "🎙️", description: "Prepoznavanje govora", status: "active", timestamp: now },
      { id: "nlu", name: "NLU", icon: "🧠", description: "Intent + entiteti", status: "idle", timestamp: now },
      { id: "ctx", name: "JSON Context", icon: "📋", description: "Učitavanje JSON konteksta", status: "idle", timestamp: now },
      { id: "plan", name: "Modificiranje", icon: "✏️", description: "Planiranje JSON promjena", status: "idle", timestamp: now },
      { id: "validate", name: "Validacija", icon: "✅", description: "Provjera JSON integriteta", status: "idle", timestamp: now },
      { id: "apply", name: "Primjena", icon: "💾", description: "Ažuriranje JSON strukture", status: "idle", timestamp: now },
    ];
    setProcessStages(base);
    const updates = [
      [500, "asr", { status: "completed", completedAt: new Date(now + 500).toISOString() }],
      [550, "nlu", { status: "active" }],
      [1000, "nlu", { status: "completed", completedAt: new Date(now + 1000).toISOString() }],
      [1050, "ctx", { status: "active" }],
      [1400, "ctx", { status: "completed", completedAt: new Date(now + 1400).toISOString() }],
      [1450, "plan", { status: "active" }],
      [1700, "plan", { status: "completed", completedAt: new Date(now + 1700).toISOString() }],
      [1750, "validate", { status: "active" }],
      [2100, "validate", { status: "completed", completedAt: new Date(now + 2100).toISOString() }],
      [2150, "patch", { status: "active" }],
      [2500, "patch", { status: "completed", completedAt: new Date(now + 2500).toISOString() }],
    ];
    updates.forEach(([delay, id, patch]) => {
      setTimeout(() => {
        setProcessStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      }, delay);
    });
  };

  const applyAgentResponse = (resp) => {
    if (!resp || resp.type !== "gantt_agent_response") return;
    const next = { ...draft, lines: new Map(draft.lines) };

    (resp.ui_patches || []).forEach((p) => {
      switch (p.op) {
        case "init_draft":
          next.draftId = p.draft_id;
          next.projectId = p.project_id;
          next.process = p.process || next.process;
          next.dateRange = p.date_range || next.dateRange;
          next.teams = p.teams ?? next.teams;
          next.workHours = p.work_hours || next.workHours;
          break;
        case "upsert_line":
          const ln = p.line;
          next.lines.set(ln.id, { ...ln });
          break;
        case "set_active_line":
          next.activeLineId = p.line_id;
          break;
        case "mark_line_confirmed":
          const lnToConfirm = next.lines.get(p.line_id);
          if (lnToConfirm) { 
            lnToConfirm.confirmed = true; 
            lnToConfirm.needs_review = false; 
            next.lines.set(lnToConfirm.id, { ...lnToConfirm }); 
          }
          break;
        case "shift_line":
          const lnToShift = next.lines.get(p.line_id);
          if (lnToShift) {
            lnToShift.start = addDays(lnToShift.start, p.days || 0);
            lnToShift.end = addDays(lnToShift.end, p.days || 0);
            next.lines.set(lnToShift.id, { ...lnToShift });
          }
          break;
        case "annotate":
          next.annotations = next.annotations || [];
          next.annotations.push({ target: p.target, id: p.id, tags: p.tags, note: p.note });
          break;
        default:
          break;
      }
    });

    if (resp.commit_mode && (resp.backend_ops || []).length) {
      next.annotations = next.annotations || [];
      next.annotations.push({ target: "draft", id: next.draftId, tags: ["committed"], note: "Draft committed (mock)" });
    }

    setDraft(next);
    setLastResponse(resp);
  };

  const confirmActive = () => {
    const resp = {
      type: "gantt_agent_response",
      tts: "Linija potvrđena.",
      reasoning_summary: "Korisnik ručno potvrdio aktivnu liniju.",
      next_prompt: "Želite li nastaviti na sljedeću liniju?",
      intent: "confirm_line",
      commit_mode: false,
      ui_patches: [
        { op: "mark_line_confirmed", draft_id: draft.draftId, line_id: draft.activeLineId, confirmed: true },
      ],
      backend_ops: [],
      validation: { ok: true, issues: [] },
    };
    applyAgentResponse(resp);
  };

  const shiftActive = (delta) => {
    const resp = {
      type: "gantt_agent_response",
      tts: `Pomičem liniju za ${delta} dan(a).`,
      reasoning_summary: "Ručno pomicanje aktivne linije.",
      next_prompt: "Potvrđujete li novi termin?",
      intent: "shift_line",
      commit_mode: false,
      ui_patches: [
        { op: "shift_line", draft_id: draft.draftId, line_id: draft.activeLineId, days: delta },
      ],
      backend_ops: [],
      validation: { ok: true, issues: [] },
    };
    applyAgentResponse(resp);
  };

  return (
    <div className="p-4 space-y-4">
      <VoiceFocusBanner show={isListening} transcript={transcript} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gantt Agent - Voice Control</h1>
          <p className="text-sm text-gray-600">
            Aktiviran iz Voice Orchestratora za specijalizirano Gantt editiranje
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 border border-gray-300 rounded text-sm">Projekt: {draft?.projectId || "—"}</span>
          <span className="px-2 py-1 border border-gray-300 rounded text-sm">Draft: {draft?.draftId || "—"}</span>
          <span className="px-2 py-1 bg-gray-200 rounded text-sm">Timova: {draft?.teams || 0}</span>
          {isListening && <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 rounded text-sm">🎧 Focus</span>}
          <button 
            className="px-3 py-1 bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 rounded flex items-center gap-1"
            onClick={() => setFocusMode(v => !v)}
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {focusMode ? 'Pregled' : 'Fokus'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {!focusMode && (
          <div className="xl:col-span-7">
            <GanttCanvas draft={draft} ganttJson={ganttJson} />
          </div>
        )}
        <div className={focusMode ? "xl:col-span-12" : "xl:col-span-5"}>
          <AgentPanel
            draft={draft}
            hasDraft={hasDraft}
            draftId={draftId}
            activeLineId={activeLineId}
            linesCount={linesCount}
            confirmedLinesCount={confirmedLinesCount}
            lastResponse={lastResponse}
            state={state}
            transcript={transcript}
            isListening={isListening}
            isProcessing={isProcessing}
            isWaitingConfirmation={isWaitingConfirmation}
            isCommitting={isCommitting}
            error={error}
            processStages={processStages}
            onStartListening={startListening}
            onStopListening={stopListening}
            onConfirmLine={handleConfirmLine}
            onCommitDraft={handleCommitDraft}
            onResetAgent={resetAgent}
            clearStages={clearStages}
            compact={focusMode}
            textInput={textInput}
            onTextInputChange={setTextInput}
            onTextSubmit={handleTextSubmit}
            ganttJson={ganttJson}
            onApplyJSON={handleApplyJSON}
            onConfirmActive={handleConfirmActive}
            onShiftActive={handleShiftActive}
            onDemoStages={handleDemoStages}
            isJsonLoaded={isJsonLoaded}
            jsonHistory={jsonHistory}
            historyIndex={historyIndex}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </div>
      </div>
    </div>
  );
}