import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, ArrowBigUp, ArrowBigDown, ChevronsRight, ChevronsLeft, X } from 'lucide-react';

const calculateNextContexts = (currentContext) => {
  switch (currentContext.type) {
    case 'Sve':
      return {
        broaden: null,
        narrow: { type: 'Projekt', label: 'Projekt: Stambena Zgrada – Istok', id: 'PRJ-01' },
      };
    case 'Projekt':
      return {
        broaden: { type: 'Sve', label: 'Globalni Kontekst' },
        narrow: { type: 'Pozicija', label: 'Pozicija: PZ6 - Staklo', id: 'PRJ-01-PZ-06', parentId: currentContext.id },
      };
    case 'Pozicija':
      return {
        broaden: { type: 'Projekt', label: 'Projekt: Stambena Zgrada – Istok', id: 'PRJ-01' },
        narrow: { type: 'Proces', label: 'Proces: Montaža', id: 'PROC-MONTAZA', parentId: currentContext.id },
      };
    case 'Proces':
       return {
        broaden: { type: 'Pozicija', label: 'Pozicija: PZ6 - Staklo', id: 'PRJ-01-PZ-06' },
        narrow: null,
      };
    default:
      return { broaden: null, narrow: null };
  }
};

const SuggestionButton = ({ type, context, onClick }) => {
  if (!context) return <div className="w-48" />;
  
  const isBroaden = type === 'broaden';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(context)}
      className={`w-48 h-24 rounded-2xl p-3 flex flex-col justify-between text-left shadow-lg border transition-colors
                 ${isBroaden ? 'bg-sky-500/10 border-sky-500/20 hover:bg-sky-500/20' : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'}`}
    >
      <div className="flex items-center justify-between text-secondary">
        <span className="text-xs font-semibold uppercase">{isBroaden ? 'PROŠIRI' : 'SUZI'}</span>
        {isBroaden ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
      </div>
      <div>
        <div className="text-xs text-secondary">{context.type}</div>
        <div className="font-semibold text-primary truncate">{context.label}</div>
      </div>
    </motion.button>
  );
};

export default function ContextualInput({ agent, onCommandSubmit, initialContext = { type: 'Sve', label: 'Globalni Kontekst' } }) {
  const [inputValue, setInputValue] = useState('');
  const [context, setContext] = useState(initialContext);
  const [suggestions, setSuggestions] = useState(null);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

  const handleContextClick = useCallback(() => {
    if (isSuggestionsVisible) {
      setIsSuggestionsVisible(false);
    } else {
      const nextContexts = calculateNextContexts(context);
      setSuggestions(nextContexts);
      setIsSuggestionsVisible(true);
    }
  }, [context, isSuggestionsVisible]);

  const handleSuggestionClick = useCallback((newContext) => {
    setContext(newContext);
    setIsSuggestionsVisible(false);
    setSuggestions(null);
    console.log('Novi kontekst odabran:', newContext);
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    onCommandSubmit(inputValue, context);
    setInputValue('');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <AnimatePresence>
        {isSuggestionsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 w-[400px] mb-4 flex justify-center items-center gap-4"
          >
            <SuggestionButton type="broaden" context={suggestions?.broaden} onClick={handleSuggestionClick} />
            <SuggestionButton type="narrow" context={suggestions?.narrow} onClick={handleSuggestionClick} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 bg-background/60 backdrop-blur-md border border-theme rounded-full shadow-xl p-2 flex items-center gap-2">
        <div className="flex items-center pl-2">
          <motion.button whileTap={{scale: 0.9}} className="p-2 text-secondary hover:text-primary transition-colors rounded-full">
            <Paperclip size={20} />
          </motion.button>
          <motion.button 
            whileTap={{scale: 0.9}} 
            onClick={() => agent.isListening ? agent.stopListening() : agent.startListening()}
            className={`p-2 rounded-full transition-colors ${agent.isListening ? 'text-red-500 animate-pulse' : 'text-secondary hover:text-primary'}`}
          >
            <Mic size={20} />
          </motion.button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-grow flex items-center gap-2 bg-black/10 rounded-full">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Postavite upit ili pretražite..."
              className="flex-grow h-12 pl-4 bg-transparent focus:outline-none text-primary placeholder:text-secondary"
            />
            <motion.div
                layout
                className="flex-shrink-0 mr-2"
            >
                <motion.button
                  layout="position"
                  type="button"
                  onClick={handleContextClick}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`h-10 px-4 rounded-full flex items-center justify-center gap-2 text-sm font-medium border transition-colors
                             ${isSuggestionsVisible ? 'bg-accent text-white border-accent' : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'}`}
                >
                  <span>{context.label}</span>
                  <motion.div animate={{ rotate: isSuggestionsVisible ? 180 : 0 }}>
                    {isSuggestionsVisible ? <X size={16} /> : '▼'}
                  </motion.div>
                </motion.button>
            </motion.div>
        </form>

        <motion.button 
            onClick={handleSubmit}
            whileTap={{scale: 0.9}} 
            className="w-12 h-12 flex-shrink-0 rounded-full bg-accent text-white flex items-center justify-center"
        >
          <Send size={20} />
        </motion.button>
      </div>
    </div>
  );
}