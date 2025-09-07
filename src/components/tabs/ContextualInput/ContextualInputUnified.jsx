import React, { useMemo, useRef, useState, useCallback } from "react";
import { Send, Paperclip, Mic } from "lucide-react";

// --- Konstante dizajna ---
const PILL_WIDTH = 400;               // Manja širina za input
const RADIUS_PX = 24;                 // Za rounded-3xl dojam
const OUTER_STYLE =
  "bg-gray-900 border-2 border-white text-white shadow-xl rounded-3xl";

// --- Mock podaci i helperi (ostavljeni iz vaše logike) ---
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
  if (!context) return <div className="h-10" />;

  // Sve je 100% neprozirno; bez unutarnjih jakih sjena - manje kartice
  const base =
    "w-full h-10 rounded-lg p-2 text-left transition-transform duration-150 active:scale-[0.98] focus:outline-none";
  const state = isActive
    ? "bg-gray-800"
    : position === "broaden"
    ? "bg-gray-800 hover:bg-gray-700"
    : "bg-gray-800 hover:bg-gray-700";

  return (
    <button
      type="button"
      onClick={() => onClick?.(context)}
      className={`${base} ${state}`}
    >
      <div className="text-[9px] uppercase tracking-wider text-gray-400">
        {context.type}
      </div>
      <div className="font-medium text-white truncate text-sm mt-0.5">
        {context.label}
      </div>
    </button>
  );
}

export default function ContextualInputUnified({
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
    // Fokus ostaje unutar unified container-a => picker ostaje otvoren
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setLastSubmittedCommand(inputValue);
    onCommandSubmit(inputValue, currentContext);
    setInputValue("");
    // Nema imperativnog "expand"; CSS :focus-within drži picker otvoren dok je fokus unutra
    inputRef.current?.focus();
  };

  return (
    <>
      {/* --- Stilovi za unified container i CSS-based animacije --- */}
      <style>{`
        .unified-container {
          width: ${PILL_WIDTH}px;
          height: 56px; /* Manja visina kontejnera */
          border-radius: ${RADIUS_PX}px;
          position: relative;
          display: flex;
          align-items: center;
          transition: width 300ms ease, border-radius 300ms ease;
        }
        
        /* Ekspandiraj lijevo kada je fokus unutar kontejnera */
        .unified-container:focus-within {
          width: ${PILL_WIDTH + 280}px; /* Dodaj 280px lijevo za picker (manje prostora) */
          border-radius: ${RADIUS_PX}px; /* Zadržaj isti radius */
        }
        
        /* Picker sekcija - lijevi dio kontejnera */
        .picker {
          width: 0;
          opacity: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 8px;
          padding: 0;
          transition: width 300ms ease, opacity 200ms ease, padding 300ms ease;
        }
        
        .unified-container:focus-within .picker {
          width: 280px;  /* Manja širina pickera */
          opacity: 1;
          padding: 12px; /* Manji padding */
        }
        
        /* Input sekcija - desni dio kontejnera - FIKSNA ŠIRINA */
        .input-section {
          width: ${PILL_WIDTH}px; /* Uvijek ista širina - sada 400px */
          flex-shrink: 0; /* Ne smanji se */
          height: 56px; /* Manja visina */
          display: flex;
          align-items: center;
        }
        
        /* Bolja dostupnost: ako korisnik preferira smanjene animacije */
        @media (prefers-reduced-motion: reduce) {
          .unified-container, .picker {
            transition: none;
          }
        }
      `}</style>

      <div className="w-full flex justify-center p-6">
        {/* ⭐ Jedan, unificirani, neprozirni container sa snažnim bijelim borderom i vanjskom sjenom */}
        <div className={`unified-container ${OUTER_STYLE}`}>
          
          {/* LIJEVA SEKCIJA: Contextual picker - ekspandira se s lijeve strane */}
          <div className="picker">
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

          {/* DESNA SEKCIJA: Input + actions (fiksne širine) */}
          <div className="input-section">
            <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full px-4">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Postavite upit ili pretražite..."
                className="flex-1 h-10 bg-transparent text-white placeholder:text-gray-400 focus:outline-none"
                aria-label="Contextual input"
                aria-expanded={undefined /* drži ga CSS :focus-within */}
              />
              <button
                type="button"
                className="p-2 rounded-full text-gray-300 hover:text-white focus:outline-none"
                aria-label="Dodaj privitak"
              >
                <Paperclip size={20} />
              </button>
              <button
                type="button"
                onClick={() =>
                  agent.isListening ? agent.stopListening() : agent.startListening()
                }
                className={`p-2 rounded-full focus:outline-none ${
                  agent.isListening
                    ? "text-red-500 bg-red-500/20"
                    : "text-gray-300 hover:text-white"
                }`}
                aria-pressed={agent.isListening}
                aria-label="Mikrofon"
              >
                <Mic size={20} />
              </button>
              <button
                type="submit"
                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white grid place-items-center"
                aria-label="Pošalji"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Info o zadnjoj komandi (izvan unified container-a) */}
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
    </>
  );
}