import React from 'react';
import { Brain, Search, Zap, ShieldCheck, CheckCircle } from 'lucide-react';

const STEPS = [
  { key: 'thinking', label: 'Razmišljanje', desc: 'Analizira i planira', Icon: Brain, color: 'text-slate-500', bg: 'bg-white' },
  { key: 'research', label: 'Istraživanje', desc: 'Pretražuje izvore', Icon: Search, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  { key: 'processing', label: 'Obrada', desc: 'Obrađuje podatke', Icon: Zap, color: 'text-amber-700', bg: 'bg-amber-50' },
  { key: 'validation', label: 'Validacija', desc: 'Provjerava rezultate', Icon: ShieldCheck, color: 'text-sky-700', bg: 'bg-sky-50' },
  { key: 'done', label: 'Završeno', desc: 'Zadatak završen', Icon: CheckCircle, color: 'text-slate-500', bg: 'bg-white' }
];

export default function AgentStepFlow({ activeIndex = 0, doneIndex = -1 }) {
  return (
    <div className="flex gap-3 items-stretch overflow-auto p-2">
      {STEPS.map((s, i) => {
        const isActive = i === activeIndex;
        const isDone = i <= doneIndex;
        const Icon = s.Icon;
        return (
          <div key={s.key} className={`flex-1 min-w-[180px] rounded-xl border ${isActive ? 'border-emerald-300 shadow-md' : 'border-theme'} ${isActive ? s.bg : 'bg-white'} transition-colors`}>
            <div className="p-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isActive ? 'bg-white' : 'input-bg'} border border-theme`}>
                  <Icon className={`w-5 h-5 ${isActive ? s.color : 'text-subtle'}`} />
                </div>
                <div>
                  <div className={`text-sm font-semibold ${isActive ? 'text-emerald-800' : 'text-primary'}`}>{s.label}</div>
                  <div className="text-xs text-subtle">{s.desc}</div>
                </div>
              </div>
              {isDone && <CheckCircle className="w-4 h-4 text-emerald-600" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

