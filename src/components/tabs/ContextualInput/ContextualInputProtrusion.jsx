import React, { useMemo, useRef, useState, useCallback } from "react";
import { Send, Paperclip, Mic } from "lucide-react";

// --- Mock podaci i helperi ---
const calculateContextStack = (currentContext) => {
  const allContexts = {
    Sve: { type: "Sve", label: "Globalni Kontekst" },
    "PRJ-01": {
      type: "Projekt",
      label: "Projekt: Stambena Zgrada – Istok",
      id: "PRJ-01",
      parent: "Sve",
    },
    "PRJ-01-PZ-06": {
      type: "Pozicija",
      label: "Pozicija: PZ6 - Staklo",
      id: "PRJ-01-PZ-06",
      parent: "PRJ-01",
    },
    "PROC-MONTAZA": {
      type: "Proces",
      label: "Proces: Montaža",
      id: "PROC-MONTAZA",
      parent: "PRJ-01-PZ-06",
    },
  };

  const findById = (id) => Object.values(allContexts).find((c) => c.id === id);

  switch (currentContext.type) {
    case "Sve":
      return [null, allContexts["Sve"], allContexts["PRJ-01"]];
    case "Projekt":
      return [allContexts["Sve"], currentContext, allContexts["PRJ-01-PZ-06"]];
    case "Pozicija":
      return [findById(currentContext.parent), currentContext, allContexts["PROC-MONTAZA"]];
    case "Proces":
      return [findById(currentContext.parent), currentContext, null];
    default:
      return [null, currentContext, null];
  }
};

function ContextCard({ context, isActive, onClick, position }) {
  if (!context) return <div className="h-12" />;

  const baseStyles = "w-full h-12 rounded-lg px-3 py-2 text-left transition-all duration-150 active:scale-[0.98] focus:outline-none";
  const stateStyles = isActive
    ? "bg-gray-800 border border-gray-600"
    : position === "broaden"
    ? "bg-gray-800 hover:bg-gray-700 border border-sky-500/30"
    : position === "narrow" 
    ? "bg-gray-800 hover:bg-gray-700 border border-amber-500/30"
    : "bg-gray-800 hover:bg-gray-700 border border-gray-600";

  return (
    <button
      type="button"
      onClick={() => onClick?.(context)}
      className={`${baseStyles} ${stateStyles}`}
    >
      <div className="text-[9px] uppercase tracking-wider text-gray-400">
        {context.type}
      </div>
      <div className="font-medium text-white truncate text-sm mt-1">
        {context.label}
      </div>
    </button>
  );
}

/**
 * Protrusion Morph Effect - SVG precizno morfiranje
 * - Kontejner se morfira između normalnog i "s izraslinom" oblika
 * - Bijeli ring = stroke na istom pathu (savršeno čist)
 * - Otvaranje na focus-within s SMIL animacijom
 */
export default function ContextualInputProtrusion({
  agent = { isListening: false, startListening: () => {}, stopListening: () => {} },
  onCommandSubmit = () => {},
  initialContext = { type: "Sve", label: "Globalni Kontekst" },
}) {
  const [inputValue, setInputValue] = useState("");
  const [currentContext, setCurrentContext] = useState(initialContext);
  const [lastSubmittedCommand, setLastSubmittedCommand] = useState("");
  const inputRef = useRef(null);

  const contextStack = useMemo(
    () => calculateContextStack(currentContext),
    [currentContext]
  );
  const [broadenContext, activeContext, narrowContext] = contextStack;

  const handleContextSelect = useCallback((ctx) => {
    if (ctx) setCurrentContext(ctx);
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setLastSubmittedCommand(inputValue);
    onCommandSubmit(inputValue, currentContext);
    setInputValue("");
    inputRef.current?.focus();
  };

  return (
    <>
      <div className="w-full flex justify-center p-8">
        <svg
          className="shadow-2xl"
          viewBox="-80 0 480 400" // prostor ostavljen lijevo za izraslinu
          width="400"
          height="240"
          aria-label="Morphing contextual input container"
        >
          {/* DEFINICIJE: putanja + clipPath */}
          <defs>
            {/* početni oblik - zatvorena pilula */}
            <path id="morph-shape" d="
              M 24,0 H 376 
              Q 400,0 400,24 
              V 32 
              Q 400,56 376,56 
              H 24 
              Q 0,56 0,32 
              V 32 L 0,32 L 0,32 L 0,32 
              V 24 
              Q 0,0 24,0 Z
            " />
            <clipPath id="morph-clip">
              <use href="#morph-shape" />
            </clipPath>
          </defs>

          {/* FILL + STROKE (kristalno bijeli ring) */}
          <use href="#morph-shape" fill="#111827" stroke="#ffffff" strokeWidth="2" />

          {/* HTML sadržaj unutra (klipovan oblikom) */}
          <g clipPath="url(#morph-clip)">
            <foreignObject id="morph-content" x="0" y="0" width="400" height="400">
              <div xmlns="http://www.w3.org/1999/xhtml" className="morph-wrapper">
                <form onSubmit={handleSubmit} className="morph-input-bar">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="morph-input"
                    placeholder="Postavite upit ili pretražite..."
                  />
                  <button 
                    type="button" 
                    className="morph-icon-btn"
                    aria-label="Dodaj privitak"
                  >
                    <Paperclip size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => agent.isListening ? agent.stopListening() : agent.startListening()}
                    className={`morph-icon-btn ${agent.isListening ? 'listening' : ''}`}
                    aria-label="Mikrofon"
                  >
                    <Mic size={16} />
                  </button>
                  <button
                    type="submit"
                    className="morph-send-btn"
                    aria-label="Pošalji"
                  >
                    <Send size={14} />
                  </button>
                </form>
                
                <div className="morph-picker-list">
                  <div className="morph-cards">
                    <ContextCard
                      context={broadenContext}
                      position="broaden"
                      onClick={handleContextSelect}
                    />
                    <ContextCard
                      context={activeContext}
                      isActive
                      onClick={handleContextSelect}
                    />
                    <ContextCard
                      context={narrowContext}
                      position="narrow"
                      onClick={handleContextSelect}
                    />
                  </div>
                </div>
              </div>
            </foreignObject>
          </g>

          {/* SVG MORPH ANIMACIJE (SMIL) — slušaju focusin/focusout */}
          <animate
            xlinkHref="#morph-shape"
            attributeName="d"
            dur="300ms"
            fill="freeze"
            begin="morph-content.focusin"
            to="
              M 24,0 H 376 
              Q 400,0 400,24 
              V 176 
              Q 400,200 376,200 
              H 24 
              Q 0,200 0,176 
              V 88 L -60,88 L -60,58 L 0,58 
              V 24 
              Q 0,0 24,0 Z
            "
          />
          <animate
            xlinkHref="#morph-shape"
            attributeName="d"
            dur="280ms"
            fill="freeze"
            begin="morph-content.focusout"
            to="
              M 24,0 H 376 
              Q 400,0 400,24 
              V 32 
              Q 400,56 376,56 
              H 24 
              Q 0,56 0,32 
              V 32 L 0,32 L 0,32 L 0,32 
              V 24 
              Q 0,0 24,0 Z
            "
          />
        </svg>
      </div>

      {/* Info o zadnjoj komandi */}
      {lastSubmittedCommand && (
        <div className="w-full flex justify-center mt-3">
          <div className="max-w-3xl text-center text-sm text-gray-400">
            Zadnja komanda u kontekstu <span className="font-semibold text-white">
              {currentContext.label}
            </span>
            : <span className="text-white">"{lastSubmittedCommand}"</span>
          </div>
        </div>
      )}

      {/* Stilovi za sadržaj unutar SVG-a */}
      <style>{`
        .morph-wrapper { 
          color: #fff; 
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; 
          width: 100%;
          height: 100%;
        }
        
        .morph-input-bar { 
          display: flex; 
          align-items: center; 
          height: 56px; 
          padding: 0 16px; 
          gap: 8px;
        }
        
        .morph-input { 
          flex: 1; 
          background: transparent; 
          border: none; 
          outline: none; 
          color: #fff; 
          font-size: 14px;
        }
        
        .morph-input::placeholder { 
          color: #9ca3af; 
        }
        
        .morph-icon-btn {
          padding: 6px;
          color: #9ca3af;
          background: transparent;
          border: none;
          border-radius: 50%;
          transition: color 0.2s;
          cursor: pointer;
        }
        
        .morph-icon-btn:hover {
          color: #fff;
        }
        
        .morph-icon-btn.listening {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.2);
        }
        
        .morph-send-btn { 
          width: 36px; 
          height: 36px; 
          border-radius: 50%; 
          background: #2563eb; 
          border: none; 
          color: #fff; 
          display: grid; 
          place-items: center;
          transition: background 0.2s;
          cursor: pointer;
        }
        
        .morph-send-btn:hover {
          background: #1d4ed8;
        }
        
        .morph-picker-list {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: max-height 300ms ease, opacity 250ms ease, transform 250ms ease;
          transform: translateY(-8px);
          padding: 0 16px 0 16px;
        }
        
        /* Otvaranje sadržaja sinkronizirano s morfom (focus-within) */
        svg:has(#morph-content:focus-within) .morph-picker-list {
          max-height: 200px; 
          opacity: 1; 
          transform: translateY(0); 
          padding-bottom: 16px;
        }

        .morph-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 8px;
        }
        
        /* Bolja dostupnost */
        @media (prefers-reduced-motion: reduce) {
          .morph-picker-list {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}