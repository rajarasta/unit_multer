import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

export default function AgentConsole({ logs = [] }) {
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [logs]);
  
  return (
    <div className="panel rounded-2xl overflow-hidden h-[240px] flex flex-col">
      <div className="p-4 border-b border-theme">
        <h3 className="font-semibold text-primary flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Agent Konzola
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center text-subtle">
              <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nema poruka</p>
            </div>
          </div>
        ) : (
          <div className="p-4 pb-6">
            <div className="space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="flex items-start gap-3 text-sm">
                  <span className="text-xs text-subtle font-mono flex-shrink-0 mt-0.5">
                    {new Date(l.t).toLocaleTimeString('hr-HR', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </span>
                  <div className="flex-1 text-secondary whitespace-pre-wrap leading-relaxed">
                    {l.msg}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

