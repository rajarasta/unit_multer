import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic } from 'lucide-react';

// --- Konfiguracija Dizajna ---
const PILL_WIDTH = 600; // Fiksna širina pilule za stabilnost
const CONNECTION_RADIUS = 24; // Radius spoja (odgovara npr. rounded-3xl u Tailwindu)

// Unificirani stil površine (Neprozirna pozadina) - Ključno za iluziju jedinstvenog objekta
const UNIFIED_SURFACE_STYLE = "bg-gray-900 border border-white shadow-lg";

const calculateContextStack = (currentContext) => {
  const allContexts = {
    'Sve': { type: 'Sve', label: 'Globalni Kontekst' },
    'PRJ-01': { type: 'Projekt', label: 'Projekt: Stambena Zgrada – Istok', id: 'PRJ-01', parent: 'Sve' },
    'PRJ-01-PZ-06': { type: 'Pozicija', label: 'Pozicija: PZ6 - Staklo', id: 'PRJ-01-PZ-06', parent: 'PRJ-01' },
    'PROC-MONTAZA': { type: 'Proces', label: 'Proces: Montaža', id: 'PROC-MONTAZA', parent: 'PRJ-01-PZ-06' },
  };

  const findById = (id) => Object.values(allContexts).find(c => c.id === id);

  switch (currentContext.type) {
    case 'Sve':
      return [
        null,
        allContexts['Sve'],
        allContexts['PRJ-01']
      ];
    case 'Projekt':
      return [
        allContexts['Sve'],
        currentContext,
        allContexts['PRJ-01-PZ-06']
      ];
    case 'Pozicija':
       return [
        findById(currentContext.parent),
        currentContext,
        allContexts['PROC-MONTAZA']
      ];
    case 'Proces':
      return [
        findById(currentContext.parent),
        currentContext,
        null
      ];
    default:
      return [null, currentContext, null];
  }
};

// --- Komponenta Kartice Konteksta ---

const ContextCard = ({ context, isActive, onClick, position }) => {
    if (!context) return <div className="h-16" />;

    // Bojanje kartica (Input 9)
    const getCardStyles = () => {
        if (isActive) return 'bg-white/20 border-white/40 shadow-lg';
        if (position === 'broaden') return 'bg-sky-600/30 border-sky-500/50 hover:bg-sky-600/40';
        if (position === 'narrow') return 'bg-amber-600/30 border-amber-500/50 hover:bg-amber-600/40';
        return 'bg-white/10 border-white/20 hover:bg-white/20';
    };

    return (
        <motion.button
            // Varijante za stagger efekt (postepeno pojavljivanje unutar oblaka)
            variants={{
                hidden: { opacity: 0, x: -30 },
                visible: { opacity: 1, x: 0 }
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onClick(context)}
            className={`w-full h-16 rounded-xl p-3 text-left transition-all duration-200 border ${getCardStyles()}`}
        >
            <div className="text-xs uppercase tracking-wider text-white/70">{context.type}</div>
            <div className="font-semibold text-white truncate mt-0.5">{context.label}</div>
        </motion.button>
    );
};

// --- Glavna Komponenta Transformacije ---

export default function ContextualInputEnhanced({ 
    // Dodani default mockovi za agenta i funkcije radi robusnosti
    agent = {isListening: false, startListening: ()=>{}, stopListening: ()=>{}}, 
    onCommandSubmit = ()=>{}, 
    initialContext = { type: 'Sve', label: 'Globalni Kontekst' } 
}) {
  const [inputValue, setInputValue] = useState('');
  const [currentContext, setCurrentContext] = useState(initialContext);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastSubmittedCommand, setLastSubmittedCommand] = useState('');
  const inputRef = useRef(null);

  const contextStack = useMemo(() => calculateContextStack(currentContext), [currentContext]);
  const [broadenContext, activeContext, narrowContext] = contextStack;

  // Funkcionalnost: Odabir konteksta (Input 5 & 7)
  const handleContextSelect = useCallback((newContext) => {
    if (newContext) {
      setCurrentContext(newContext);
    }
    // Vraćanje fokusa (Input 7), oblak ostaje otvoren (Input 5)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Focus/Blur handlers za prirodnu ekspanziju
  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    // Dodaj kratki delay da korisnik može kliknuti na kartice
    setTimeout(() => {
      setIsExpanded(false);
    }, 150);
  };

  // Funkcionalnost: Slanje komande (Input 3, 4 & 10)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setLastSubmittedCommand(inputValue); // Spremanje zadnje poruke (Input 10)
    onCommandSubmit(inputValue, currentContext);
    // Ekspandiraj nakon slanja komande za prikaz konteksta
    setIsExpanded(true);
    setInputValue(''); // Očisti input nakon slanja
  };
  
  // Sinkronizirana Spring Animacija (⚡ Ključno: Fluidni pokret)
  const transmogrificationTransition = {
    type: 'spring',
    stiffness: 150, // Umjerena brzina
    damping: 20,    // Blagi "bounce" za organski osjećaj
    mass: 1.1       // Malo veća masa za osjećaj težine
  };

  // Varijante animacije za "Izlijevanje" oblaka (🎯 Transformacija)
  const cloudVariants = {
    hidden: {
      width: 0,
      opacity: 0,
      transition: {
        ...transmogrificationTransition,
        when: "afterChildren" // Čekaj da kartice nestanu prije zatvaranja
       }
    },
    visible: {
      width: 320, // Širina oblaka (w-80)
      opacity: 1,
      transition: {
        ...transmogrificationTransition,
        when: "beforeChildren", // Otvori oblak prije animiranja kartica
        staggerChildren: 0.05 // Postepeno prikazivanje kartica
      }
    }
  };

  // Mock CSS slika (Input 10) - Aluminijska industrija
  const getBackgroundImage = () => {
    const searchTerm = inputValue.toLowerCase();
    const contextType = currentContext.type.toLowerCase();

    // Primjeri vezani za industriju (metalik/high-tech)
    if (searchTerm.includes('staklo') || contextType.includes('staklo')) {
        return 'linear-gradient(to right, #2c3e50, #4ca1af)'; // Hladno, stakleno
    }
    if (searchTerm.includes('montaž') || contextType.includes('proces')) {
        return 'linear-gradient(to right, #0f2027, #203a43, #2c5364)'; // Tamno, tehničko
    }
    if (contextType === 'projekt') {
        return 'linear-gradient(135deg, #a8c0ff, #3f2b96)'; // Projektno plava
    }
    // Default: Brušeni aluminij
    return 'linear-gradient(45deg, #949494 0%, #e0e0e0 50%, #949494 100%)';
  };

  return (
    <>
      {/* CSS stilovi za staggered animacije */}
      <style>{`
        .contextual-input-container {
          position: relative;
          transition: all 0.4s ease-in-out;
        }
        
        .contextual-cloud {
          opacity: 0;
          transform: translateX(-10px);
          transition: opacity 0.3s ease-out 0.2s, transform 0.3s ease-out 0.2s;
        }
        
        .contextual-input-container.expanded .contextual-cloud {
          opacity: 1;
          transform: translateX(0);
        }
        
        .contextual-input-container.expanded .contextual-cloud > * {
          animation: slideInStagger 0.3s ease-out forwards;
        }
        
        .contextual-input-container.expanded .contextual-cloud > *:nth-child(1) {
          animation-delay: 0.1s;
        }
        
        .contextual-input-container.expanded .contextual-cloud > *:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .contextual-input-container.expanded .contextual-cloud > *:nth-child(3) {
          animation-delay: 0.3s;
        }
        
        @keyframes slideInStagger {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      
      {/* Dodan padding gore da se osigura prostor za vertikalnu ekspanziju */}
      <div className="w-full flex flex-col items-center gap-8 p-4 pt-24">
        
        {/* Glavni spremnik za transformaciju - osigurava centriranje */}
        <div className="flex justify-center items-center">

            {/* Glavni kontejner s conditional class aplikacijom */}
            <div className={`contextual-input-container ${isExpanded ? 'expanded' : ''}`}>
                {/* 1. DESNA PILULA (Input Polje) */}
                {/* Ključno: position relative (za sidrenje oblaka), fiksna širina, z-10 (iznad oblaka) */}
                <motion.div
                    // Korištenje sinkronizirane tranzicije za border-radius
                    transition={transmogrificationTransition}
                    className={`relative z-10 h-16 flex items-center ${UNIFIED_SURFACE_STYLE}`}
                style={{
                    width: `${PILL_WIDTH}px`,
                    // 🎯 Dinamički border-radius za besprijekoran spoj
                    borderRadius: isExpanded
                        ? `${CONNECTION_RADIUS}px 9999px 9999px ${CONNECTION_RADIUS}px`
                        : '9999px',
                    // Ukloni lijevi border na mjestu spoja
                    borderLeftWidth: isExpanded ? '0px' : undefined,
                    // Prilagodi sjenu za kompatibilnost spoja - potpuna sjena za iluziju jedinstvene komponente
                    boxShadow: isExpanded 
                        ? '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1), 10px 0 15px -3px rgb(0 0 0 / 0.1), 0 -10px 15px -3px rgb(0 0 0 / 0.1)'
                        : '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1), 10px 0 15px -3px rgb(0 0 0 / 0.1), -10px 0 15px -3px rgb(0 0 0 / 0.1)'
                }}
            >
                {/* Sadržaj Pilule (Input i Gumbi) */}
                <form onSubmit={handleSubmit} className="flex-grow flex items-center h-full">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Postavite upit ili pretražite..."
                        // Dinamički padding lijevo za stabilnost teksta tijekom promjene radiusa
                        className="flex-grow h-full bg-transparent focus:outline-none text-white placeholder:text-gray-400 transition-all duration-300 ease-in-out"
                        style={{
                            // Malo veći padding lijevo kada je otvoreno da se tekst odmakne od spoja
                            paddingLeft: isExpanded ? '2.25rem' : '1.75rem' 
                        }}
                    />

                    {/* Desni gumbi (Input 8: Paperclip, Mic, Send) */}
                    <div className="flex items-center pr-3 gap-2">
                        <motion.button type="button" whileTap={{scale: 0.9}} className="p-2 text-gray-400 hover:text-white transition-colors rounded-full">
                            <Paperclip size={20} />
                        </motion.button>
                        <motion.button
                            type="button"
                            whileTap={{scale: 0.9}}
                            onClick={() => agent.isListening ? agent.stopListening() : agent.startListening()}
                            className={`p-2 rounded-full transition-colors ${agent.isListening ? 'text-red-500 bg-red-500/20 animate-pulse' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Mic size={20} />
                        </motion.button>
                        <motion.button
                            type="submit"
                            whileTap={{scale: 0.9}}
                            className="w-12 h-12 flex-shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center ml-2 transition-colors shadow-md"
                        >
                            <Send size={20} />
                        </motion.button>
                    </div>
                </form>

                {/* 2. LIJEVI OBLAK (Kontekst Kartice) */}
                {/* ⚡ Ključno: Apsolutno pozicioniran lijevo od pilule (right-full) i centriran vertikalno */}
                <div className="absolute right-full top-1/2 transform -translate-y-1/2">
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                variants={cloudVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                style={{
                                    // Trik: Negativna margina za preklapanje spoja ispod pilule
                                    marginRight: `-${CONNECTION_RADIUS}px`,
                                    borderRadius: `${CONNECTION_RADIUS}px`,
                                    transformOrigin: 'right center', // Rastezanje s desne strane fiksno
                                    // Ukloni desni border na mjestu spoja
                                    borderRightWidth: '0px',
                                    // Potpuna sjena okolo za iluziju jedinstvene komponente
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1), -10px 0 15px -3px rgb(0 0 0 / 0.1), 0 -10px 15px -3px rgb(0 0 0 / 0.1)'
                                }}
                                // Stilovi oblaka: h-56 (veća visina), z-0 (ispod pilule)
                                // overflow-hidden je ključan za animaciju širine  
                                className="contextual-cloud h-56 flex flex-col justify-center gap-3 z-0 overflow-hidden bg-gray-900 border border-white p-5 pr-10"
                                // Padding-right (pr-10) je povećan da kompenzira negativnu marginu (24px) i osigura prostor do spoja
                            >
                                <ContextCard context={broadenContext} position="broaden" onClick={handleContextSelect} />
                                <ContextCard context={activeContext} isActive={true} onClick={handleContextSelect} />
                                <ContextCard context={narrowContext} position="narrow" onClick={handleContextSelect} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                </motion.div>
            </div>
        </div>

      {/* Prikaz zadnje poruke (Input 10) */}
      {lastSubmittedCommand && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl text-center mt-4"
        >
          <div className="text-sm text-gray-500 mb-2">Zadnja poslana komanda u kontekstu: <span className="font-semibold">{currentContext.label}</span></div>
          <div className="text-white font-medium bg-gray-800/70 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 shadow-sm">
            "{lastSubmittedCommand}"
          </div>
        </motion.div>
      )}

      {/* Mock CSS Slika (Input 10) */}
      <motion.div
        key={currentContext.label + inputValue} // Key change forsira re-animaciju na promjenu konteksta/inputa
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl h-40 rounded-2xl shadow-lg border border-white/30 overflow-hidden mt-6"
        style={{
          background: getBackgroundImage()
        }}
      >
        <div className="w-full h-full flex items-center justify-center text-white/90 font-bold text-xl bg-black/40 backdrop-blur-sm text-center p-4">
          {inputValue ? `Analiziram: ${inputValue}` : 
           currentContext.type !== 'Sve' ? currentContext.label :
           'Aluminijska Industrija - Sve u jednom'}
        </div>
      </motion.div>
      </div>
    </>
  );
}