import React, { useState } from 'react';
import { Activity, Database, Redo2, Undo2, User } from 'lucide-react';
import JsonHighlighter from './JsonHighlighter.jsx';

export default function InspectorSidebar({ ganttJson, activeLine, jsonHistory, historyIndex, canUndo, canRedo, onUndo, onRedo }) {
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

