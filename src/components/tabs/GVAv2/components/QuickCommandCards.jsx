import React from 'react';
import { Activity, CalendarDays, CheckCircle, Sparkles, X } from 'lucide-react';

export default function QuickCommandCards({ onSend }) {
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
      <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[180px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-400">
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

