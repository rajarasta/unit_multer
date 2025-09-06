import React, { useEffect, useState } from 'react';
import { Bot, Mic, Square, CheckCircle, Send } from 'lucide-react';

export default function AgentInteractionPanel({
  agent,
  focusMode,
  processCommand,
  pendingActions = [],
  confirmAction,
  cancelAction,
  aliasByLine = {},
}) {
  const [textInput, setTextInput] = useState('');

  // Quick command bridge (existing event bus)
  useEffect(() => {
    const h = (e) => {
      const t = e?.detail?.t;
      if (typeof t === 'string' && t.trim()) processCommand(t.trim());
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
            {agent.transcript && (
              <div className="p-2 bg-gray-100 rounded text-sm text-gray-700 mb-2">{agent.transcript}</div>
            )}

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
                  placeholder={focusMode ? 'Recite naredbu...' : "Recite 'agent' za fokus"}
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

            {/* Pending Actions */}
            {pendingActions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-primary">Čekaju potvrdu:</h4>
                {pendingActions.map((action) => (
                  <div key={action.id} className="p-3 input-bg rounded-lg border border-theme">
                    <div className="text-xs text-secondary mb-1">Akcija</div>
                    <div className="text-sm font-medium text-primary mb-2">Pomakni početak</div>
                    <div className="text-xs text-secondary mb-1">
                      Meta:{' '}
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                        {aliasByLine[action.lineId] || action.alias}
                      </span>
                    </div>
                    <div className="text-xs text-secondary mb-3">
                      Vrijeme: <span className="font-mono">{action.iso}</span>
                    </div>
                    <div className="text-[11px] text-amber-700 mb-2">Reci "potvrdi" ili "poništi"</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmAction?.(action)}
                        className="px-2 py-1 rounded bg-emerald-600 text-white text-xs flex items-center gap-1"
                      >
                        <CheckCircle size={12} /> Potvrdi
                      </button>
                      <button
                        onClick={() => cancelAction?.(action.id)}
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

