import React from 'react';
import { Mic, MessageSquare, CheckCircle2, AlertTriangle, Cpu, Network, Wand2, Save, ChevronRight } from 'lucide-react';

const ICONS = {
  focus: Mic,
  parse: Wand2,
  route_local: Cpu,
  route_server: Network,
  apply: CheckCircle2,
  persist: Save,
  warn: AlertTriangle,
};

function Pill({ color='slate', children }) {
  const map = {
    slate: 'bg-slate-700/80 text-white',
    blue: 'bg-blue-600/80 text-white',
    amber: 'bg-amber-600/80 text-white',
    green: 'bg-emerald-600/85 text-white',
    red: 'bg-rose-600/85 text-white',
  };
  return <div className={`px-2 py-1 rounded-md text-[11px] ${map[color] || map.slate}`}>{children}</div>;
}

export default function FloatingTimeline({ events = [] }) {
  return (
    <div className="fixed top-20 left-[76px] z-[60] select-none">
      <div className="flex flex-col items-start gap-3">
        {events.map(ev => {
          const Icon = ICONS[ev.icon] || MessageSquare;
          const color = ev.status === 'error' ? 'red' : ev.status === 'success' ? 'green' : ev.variant === 'local' ? 'blue' : ev.variant === 'server' ? 'amber' : 'slate';
          return (
            <div key={ev.id} className="relative group">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md border border-theme ${color==='blue' ? 'bg-blue-50' : color==='amber' ? 'bg-amber-50' : color==='green' ? 'bg-emerald-50' : color==='red' ? 'bg-rose-50' : 'bg-white'}`}>
                <Icon className={`w-4 h-4 ${color==='blue' ? 'text-blue-600' : color==='amber' ? 'text-amber-600' : color==='green' ? 'text-emerald-600' : color==='red' ? 'text-rose-600' : 'text-slate-600'}`} />
              </div>
              {/* Hover card */}
              <div className="absolute left-11 top-1/2 -translate-y-1/2 hidden group-hover:flex">
                <div className="pointer-events-none">
                  <div className="flex items-center gap-2">
                    <Pill color={color}>{ev.label}</Pill>
                    {ev.meta && <Pill>{ev.meta}</Pill>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

