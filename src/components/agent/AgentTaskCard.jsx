import React from 'react';
import { Search, CheckCircle } from 'lucide-react';

export default function AgentTaskCard({ title, subtitle, params = [], resultSnippet = '', startedAt, durationMs }) {
  const started = startedAt ? new Date(startedAt).toLocaleTimeString() : '';
  const dur = typeof durationMs === 'number' ? `(${Math.round(durationMs/1000)}s)` : '';
  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm p-3 relative">
      <div className="absolute top-2 right-2"><CheckCircle className="w-4 h-4 text-emerald-600"/></div>
      <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-2">
        <Search className="w-4 h-4" /> {title}
      </div>
      {subtitle && <div className="text-sm mb-2">{subtitle}</div>}
      {params?.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-semibold">Parametri:</div>
          <div className="grid grid-cols-2 gap-y-1 text-xs mt-1">
            {params.map((p, i) => (
              <div key={i} className="contents">
                <div className="text-slate-700">{p.key}:</div>
                <div className="font-mono text-emerald-800 truncate">{p.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {resultSnippet && (
        <div className="mt-2">
          <div className="text-xs font-semibold">Rezultat:</div>
          <pre className="text-xs bg-white/60 border border-emerald-200 rounded p-2 overflow-auto max-h-36">{resultSnippet}</pre>
        </div>
      )}
      <div className="text-[11px] text-emerald-700 mt-2 flex items-center gap-2">
        <span>{started}</span>
        <span>{dur}</span>
      </div>
    </div>
  );
}

