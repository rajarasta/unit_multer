import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, AlertTriangle, CheckCircle, Loader, Sparkles, Cpu, Network, Database, Zap, Copy, Check } from 'lucide-react';
import { formatDuration, formatConfidence, truncateText } from '../utils/helpers';

const ReasoningOverlay = ({
  isActive,
  reasoningData,
  onCancel,
  position = 'absolute',
  className = '',
  userInput = '',
  unitBounds = null,
  readOnlyMode = false,
  result = null,
  onDoubleClick = null
}) => {
  const [localSteps, setLocalSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [startTime] = useState(Date.now());
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Copy/paste and readonly mode states
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showFullResult, setShowFullResult] = useState(false);

  // Predefined reasoning simulation steps
  const getReasoningSteps = (input) => {
    return [
      {
        icon: Loader,
        text: "INICIJALIZACIJA...",
        delay: 50
      },
      {
        icon: Database,
        text: `PRIMLJEN NOVI UPIT: "${input}"`,
        delay: 100
      },
      {
        icon: Brain,
        text: "**FAZA 1: DEKONSTRUKCIJA I ANALIZA UPITA**\nIDENTIFICIRANI KLJUČNI POJMOVI iz upita.\nODREĐENA NAMJERA KORISNIKA: Razumijevanje konteksta i zahtjeva.\nSTATUS: ZAHTJEV RAZUMIJEM.",
        delay: 80
      },
      {
        icon: Network,
        text: "**FAZA 2: AKTIVACIJA NEURONSKE MREŽE I PRETRAGA PODATAKA**\nPRISTUPAM BAZI PODATAKA... Pretražujem milijarde tekstualnih jedinica.\nFILTRIRAM PODATKE POVEZANE S KLJUČNIM POJMOVIMA.\nUSPOREĐUJEM STILOVE I STRUKTURE KOJE ODGOVARAJU TEMI.",
        delay: 70
      },
      {
        icon: Cpu,
        text: "**FAZA 3: SINTEZA I GENERIRANJE ODGOVORA (PREDVIĐANJE RIJEČI)**\nZAPOČINJEM S GENERIRANJEM... Biram riječi s visokom vjerojatnošću.\nFORMIRAM STRUKTURE I PAZIM NA LOGIKU.\nPROVJERA KONZISTENTNOSTI I KVALITETE.",
        delay: 60
      },
      {
        icon: CheckCircle,
        text: "**FAZA 4: FINALIZACIJA I ISPORUKA ODGOVORA**\nFORMATIRAM TEKST ZA KORISNIČKO SUČELJE.\nSPREMAN ZA ISPORUKU.\nSTATUS: ZAVRŠENO.",
        delay: 40
      }
    ];
  };

  // Typewriter effect
  const typeWriterEffect = useCallback((text, callback) => {
    setIsTyping(true);
    setCurrentText('');

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setCurrentText(prev => prev + text[index]);
        index++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        if (callback) callback();
      }
    }, 30); // 30ms between characters

    return () => clearInterval(timer);
  }, []);

  // Start built-in simulation only if no external reasoning stream is provided
  useEffect(() => {
    const hasExternalStream = Boolean(reasoningData && Array.isArray(reasoningData.steps) && reasoningData.steps.length > 0);
    const isExternalProcessing = Boolean(reasoningData && reasoningData.status === 'processing');
    if (isActive && userInput && !hasExternalStream && !isExternalProcessing) {
      const steps = getReasoningSteps(userInput);
      setLocalSteps(steps);
      setCurrentStep(0);
      setIsCompleted(false);
      setHasError(false);

      // Start the simulation with initial delay
      setTimeout(() => {
        let stepIndex = 0;

        const processNextStep = () => {
          if (stepIndex < steps.length) {
            setCurrentStep(stepIndex + 1);
            typeWriterEffect(steps[stepIndex].text, () => {
              setTimeout(() => {
                stepIndex++;
                if (stepIndex < steps.length) {
                  processNextStep();
                } else {
                  setIsCompleted(true);
                }
              }, 1500); // Pause between steps
            });
          }
        };

        processNextStep();
      }, 1000); // Initial 1 second delay
    }
  }, [isActive, userInput, typeWriterEffect, reasoningData]);

  // Update local state when external reasoning data streams in
  useEffect(() => {
    if (reasoningData) {
      if (Array.isArray(reasoningData.steps)) {
        setLocalSteps(reasoningData.steps);
      }

      if (reasoningData.step) {
        setCurrentStep(reasoningData.step);
      }

      if (reasoningData.status === 'completed') {
        setIsCompleted(true);
      }

      if (reasoningData.status === 'error') {
        setHasError(true);
      }
    }
  }, [reasoningData]);

  // Type out the latest streamed step content
  useEffect(() => {
    if (isActive && localSteps && currentStep > 0 && localSteps[currentStep - 1] && localSteps[currentStep - 1].text) {
      typeWriterEffect(localSteps[currentStep - 1].text);
    }
  }, [isActive, localSteps, currentStep, typeWriterEffect]);

  // Reset state when overlay becomes active
  useEffect(() => {
    if (isActive) {
      setLocalSteps([]);
      setCurrentStep(0);
      setIsCompleted(false);
      setHasError(false);
    }
  }, [isActive]);

  const handleCancelClick = useCallback((e) => {
    e.stopPropagation();
    onCancel?.();
  }, [onCancel]);

  // Copy functionality
  const handleCopyText = useCallback(async (textToCopy = null) => {
    const text = textToCopy || currentText || result || '';
    if (text && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    }
  }, [currentText, result]);

  // Double-click handler for dismissing overlay
  const handleOverlayDoubleClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      if (onDoubleClick) {
        onDoubleClick();
      } else if (readOnlyMode) {
        setShowFullResult(false);
      }
    }
  }, [onDoubleClick, readOnlyMode]);

  // Enhanced overlay click with double-click support
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      if (!readOnlyMode) {
        onCancel?.();
      }
    }
  }, [onCancel, readOnlyMode]);

  const progress = localSteps.length > 0 ? currentStep / localSteps.length : 0;
  const currentStepData = localSteps[currentStep - 1];

  if (!isActive) return null;

  // Calculate positioning with 10% padding towards inside
  const overlayStyle = unitBounds ? {
    position: 'fixed',
    top: unitBounds.top + (unitBounds.height * 0.1), // 10% padding from top inside
    left: unitBounds.left + (unitBounds.width * 0.1), // 10% padding from left inside
    width: unitBounds.width * 0.8, // Unit width - 20% (10% from each side)
    height: unitBounds.height * 0.8, // Unit height - 20% (10% from each side)
    zIndex: 1000
  } : {
    position: position,
    inset: 0,
    zIndex: 50
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={overlayStyle}
      className={`${className} relative`}
      onClick={handleOverlayClick}
      onDoubleClick={handleOverlayDoubleClick}
    >
      {/* Poluprozirno staklo pozadina */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-lg border border-white/20" />

      {/* Typewriter tekst direktno na staklu */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="text-center max-w-full">
          {readOnlyMode && result ? (
            // Readonly result display na staklu
            <div
              className="text-black text-lg font-mono leading-relaxed cursor-text select-text"
              onMouseUp={() => {
                const selection = window.getSelection();
                setSelectedText(selection.toString());
              }}
            >
              {showFullResult ? result : (result.length > 200 ? `${result.substring(0, 200)}...` : result)}
            </div>
          ) : currentStep > 0 && localSteps[currentStep - 1] ? (
            // Typewriter efekat na staklu
            <div className="text-black text-xl font-mono leading-relaxed">
              {currentText}
              {isTyping && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="text-black ml-1"
                >
                  |
                </motion.span>
              )}
            </div>
          ) : (
            // Loading tekst
            <div className="text-black text-lg font-mono">
              Inicijalizujem AI obradu...
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="text-black ml-1"
              >
                |
              </motion.span>
            </div>
          )}
        </div>
      </div>

      {/* Minimalni copy button u uglu (samo ako treba) */}
      {(isCompleted || readOnlyMode || result) && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          whileHover={{ opacity: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            handleCopyText();
          }}
          className="absolute top-4 right-4 p-2 bg-black/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-black/20 transition-all"
          title="Copy to clipboard"
        >
          {copySuccess ? (
            <Check size={16} className="text-green-700" />
          ) : (
            <Copy size={16} className="text-black" />
          )}
        </motion.button>
      )}
    </motion.div>
  );
};

export default ReasoningOverlay;
