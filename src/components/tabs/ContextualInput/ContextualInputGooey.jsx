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

  const base = "w-full h-12 rounded-lg px-3 py-2 text-left transition-all duration-150 active:scale-[0.98] focus:outline-none";
  const state = isActive
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
      className={`${base} ${state}`}
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
 * Gooey Unified Container
 * - Jedan kontejner (neprozirno)
 * - Gooey spajanje dviju "ploha" (input-blob + picker-blob) pomoću SVG filtera
 * - Tekst/gumbi nisu pod filterom (ostaju oštri)
 * - Jak bijeli ring (100% opaqueness) je poseban overlay
 * - Ekspanzija na :focus-within (CSS-only)
 */
export default function ContextualInputGooey({
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
        {/* SVG filter definisan jednom */}
        <svg width="0" height="0" className="absolute">
          <filter id="goo">
            {/* zamuti izvorne oblike */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            {/* threshold – pretvara zamućenje u "gustu" masu koja spaja rubove */}
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 20 -10"
              result="goo"
            />
            {/* vrati izvor preko gooa (zadrži volumetriju) */}
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </svg>

        <div className="relative" style={{ width: 400 }}>
          {/* UNIFIED WRAPPER (neprozirno, sjena izvana) */}
          <div className="unified rounded-[24px] overflow-hidden bg-gray-900 shadow-2xl">
            {/* STAGE s goo filterom – SAMO pozadinske plohe (bez teksta) */}
            <div className="absolute inset-0 goo-stage pointer-events-none">
              {/* Gornja "pilula" za input */}
              <div className="blob blob-input" />
              {/* Donja ploha za picker – visina animirana CSS varijablom */}
              <div className="blob blob-picker" />
            </div>

            {/* CONTENT LAYER (bez filtera, oštar tekst) */}
            <form onSubmit={handleSubmit} className="relative z-10 flex items-center h-14 px-4">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder:text-gray-400 focus:outline-none"
                placeholder="Postavite upit ili pretražite..."
              />
              <button 
                type="button" 
                className="p-2 rounded-full text-gray-300 hover:text-white transition-colors"
                aria-label="Dodaj privitak"
              >
                <Paperclip size={18} />
              </button>
              <button 
                type="button" 
                onClick={() => agent.isListening ? agent.stopListening() : agent.startListening()}
                className={`p-2 rounded-full transition-colors ${
                  agent.isListening
                    ? "text-red-500 bg-red-500/20"
                    : "text-gray-300 hover:text-white"
                }`}
                aria-label="Mikrofon"
              >
                <Mic size={18} />
              </button>
              <button
                type="submit"
                className="ml-2 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white grid place-items-center transition-colors"
                aria-label="Pošalji"
              >
                <Send size={16} />
              </button>
            </form>

            {/* PICKER CONTENT – vertikalne kartice; otvara se CSS-om */}
            <div className="picker-content relative z-10 px-4 pb-4">
              <div className="flex flex-col gap-2">
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

          {/* KRISTALNI BIJELI RING (odvojen od filtera) */}
          <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-2 ring-white" />
        </div>
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

      {/* Stilovi i animacije (CSS-only) */}
      <style>{`
        /* Unified container s kontrolnim varijablama */
        .unified {
          --r: 24px;           /* radijus kuta */
          --picker-h: 0px;     /* visina donje plohe (zatvoreno) */
          position: relative;
          border-radius: var(--r);
          transition: all 300ms ease;
        }
        /* Otvaranje na fokus unutar kontejnera */
        .unified:focus-within {
          --picker-h: 200px;   /* visina donje plohe (otvoreno) */
        }

        /* Goo stage – primijeni filter samo na pozadinske oblike */
        .goo-stage {
          filter: url(#goo);
        }

        /* Bazni stil za pozadinske plohe; 100% neprozirno */
        .blob {
          background: #111827; /* Tailwind gray-900 */
          width: 100%;
        }
        .blob-input {
          height: 56px;
          border-radius: 9999px; /* pilula */
          margin-top: 0;
        }
        .blob-picker {
          height: var(--picker-h);
          border-radius: var(--r);
          margin-top: -12px;           /* blago preklapanje radi boljeg "fuziranja" */
          transition: height 300ms ease;
        }

        /* Sadržaj pickera – klizno otvaranje */
        .picker-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transform: translateY(-8px);
          transition: max-height 300ms ease, opacity 250ms ease 50ms, transform 250ms ease 50ms;
        }
        .unified:focus-within .picker-content {
          max-height: var(--picker-h);
          opacity: 1;
          transform: translateY(0);
        }

        /* Performanse */
        .blob-picker { 
          will-change: height; 
        }
        
        /* Bolja dostupnost */
        @media (prefers-reduced-motion: reduce) {
          .unified, .blob-picker, .picker-content {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}