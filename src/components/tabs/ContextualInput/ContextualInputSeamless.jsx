import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic } from 'lucide-react';
import styles from './ContextualInputEnhanced.module.css';

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
      return [null, allContexts['Sve'], allContexts['PRJ-01']];
    case 'Projekt':
      return [allContexts['Sve'], currentContext, allContexts['PRJ-01-PZ-06']];
    case 'Pozicija':
       return [findById(currentContext.parent), currentContext, allContexts['PROC-MONTAZA']];
    case 'Proces':
      return [findById(currentContext.parent), currentContext, null];
    default:
      return [null, currentContext, null];
  }
};

// Komponenta Kontekst Kartice
const ContextCard = ({ context, isActive, onClick, position }) => {
    if (!context) return null;

    const getCardClass = () => {
        let baseClass = styles.contextCard;
        if (isActive) baseClass += ` ${styles.active}`;
        if (position === 'broaden') baseClass += ` ${styles.broaden}`;
        if (position === 'narrow') baseClass += ` ${styles.narrow}`;
        return baseClass;
    };

    return (
        <button
            onClick={() => onClick(context)}
            className={getCardClass()}
        >
            <div className={styles.contextType}>{context.type}</div>
            <div className={styles.contextLabel}>{context.label}</div>
        </button>
    );
};

// Glavna komponenta
export default function ContextualInputSeamless({ 
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

  // Focus/Blur handlers
  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsExpanded(false);
    }, 150);
  };

  // Odabir konteksta
  const handleContextSelect = useCallback((newContext) => {
    if (newContext) {
      setCurrentContext(newContext);
    }
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Slanje komande
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setLastSubmittedCommand(inputValue);
    onCommandSubmit(inputValue, currentContext);
    setIsExpanded(true);
    setInputValue('');
  };

  // Mock pozadinske slike
  const getBackgroundImage = () => {
    const searchTerm = inputValue.toLowerCase();
    const contextType = currentContext.type.toLowerCase();

    if (searchTerm.includes('staklo') || contextType.includes('staklo')) {
        return 'linear-gradient(to right, #2c3e50, #4ca1af)';
    }
    if (searchTerm.includes('montaž') || contextType.includes('proces')) {
        return 'linear-gradient(to right, #0f2027, #203a43, #2c5364)';
    }
    if (contextType === 'projekt') {
        return 'linear-gradient(135deg, #a8c0ff, #3f2b96)';
    }
    return 'linear-gradient(45deg, #949494 0%, #e0e0e0 50%, #949494 100%)';
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 p-4 pt-24">
        
        {/* GLAVNI KONTEJNER - BEŠAVAN SPOJ */}
        <div className={styles.contextualContainer}>
            
            {/* KONTEKSTNI OBLAK - LIJEVO */}
            <div className={`${styles.contextualCloud} ${isExpanded ? styles.expanded : ''}`}>
                <ContextCard context={broadenContext} position="broaden" onClick={handleContextSelect} />
                <ContextCard context={activeContext} isActive={true} onClick={handleContextSelect} />
                <ContextCard context={narrowContext} position="narrow" onClick={handleContextSelect} />
            </div>

            {/* INPUT PILULA - DESNO */}
            <div className={`${styles.inputPill} ${isExpanded ? styles.expanded : ''}`}>
                <form onSubmit={handleSubmit} className="flex-grow flex items-center h-full">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="Postavite upit ili pretražite..."
                        className={`${styles.inputField} ${isExpanded ? styles.expanded : ''}`}
                    />

                    {/* BUTTON GRUPA */}
                    <div className={styles.buttonGroup}>
                        <button 
                            type="button" 
                            className={styles.iconButton}
                        >
                            <Paperclip size={20} />
                        </button>
                        <button
                            type="button"
                            onClick={() => agent.isListening ? agent.stopListening() : agent.startListening()}
                            className={`${styles.iconButton} ${agent.isListening ? styles.listening : ''}`}
                        >
                            <Mic size={20} />
                        </button>
                        <button
                            type="submit"
                            className={styles.sendButton}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>

        {/* ZADNJA KOMANDA */}
        {lastSubmittedCommand && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={styles.lastCommand}
            >
                <div className={styles.lastCommandLabel}>
                    Zadnja poslana komanda u kontekstu: <span style={{fontWeight: 600}}>{currentContext.label}</span>
                </div>
                <div className={styles.lastCommandText}>
                    "{lastSubmittedCommand}"
                </div>
            </motion.div>
        )}

        {/* MOCK SLIKA */}
        <motion.div
            key={currentContext.label + inputValue}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className={styles.mockImage}
            style={{
                background: getBackgroundImage()
            }}
        >
            <div className={styles.mockImageContent}>
                {inputValue ? `Analiziram: ${inputValue}` : 
                 currentContext.type !== 'Sve' ? currentContext.label :
                 'Aluminijska Industrija - Sve u jednom'}
            </div>
        </motion.div>
    </div>
  );
}