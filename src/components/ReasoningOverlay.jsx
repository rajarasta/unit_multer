import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, AlertTriangle, CheckCircle, Loader, Sparkles, Cpu, Network, Database, Zap } from 'lucide-react';
import { formatDuration, formatConfidence, truncateText } from '../utils/helpers';

const ReasoningOverlay = ({
  isActive,
  reasoningData,
  onCancel,
  position = 'absolute',
  className = '',
  userInput = '',
  unitBounds = null
}) => {
  const [localSteps, setLocalSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [startTime] = useState(Date.now());
  const [currentText, setCurrentText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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

  const handleOverlayClick = useCallback((e) => {
    // Only cancel if clicking on overlay background, not content
    if (e.target === e.currentTarget) {
      onCancel?.();
    }
  }, [onCancel]);

  const handleCancelClick = useCallback((e) => {
    e.stopPropagation();
    onCancel?.();
  }, [onCancel]);

  const progress = localSteps.length > 0 ? currentStep / localSteps.length : 0;
  const currentStepData = localSteps[currentStep - 1];

  if (!isActive) return null;

  // Calculate positioning based on unitBounds
  const overlayStyle = unitBounds ? {
    position: 'fixed',
    top: unitBounds.top - unitBounds.height - 20, // Position above the unit with 20px gap
    left: unitBounds.left,
    width: unitBounds.width,
    height: unitBounds.height,
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
      transition={{ duration: 0.2 }}
      style={overlayStyle}
      className={className}
      onClick={handleOverlayClick}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: unitBounds ? -20 : 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: unitBounds ? -20 : 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-4 w-full h-full"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          boxShadow: '0 25px 45px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1) inset'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle className="text-green-400" size={16} />
            ) : hasError ? (
              <AlertTriangle className="text-red-400" size={16} />
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="text-purple-400" size={16} />
              </motion.div>
            )}
            <div>
              <h3 className="text-sm font-bold text-white">
                {isCompleted ? 'Analiza završena' : hasError ? 'Greška u analizi' : 'AI Large Language Model'}
              </h3>
            </div>
          </div>

          <button
            onClick={handleCancelClick}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress Bar */}
        {!hasError && localSteps.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-white/80 mb-1">
              <span>Faza {currentStep}/{localSteps.length}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={`h-1 rounded-full ${
                  isCompleted ? 'bg-green-400' : 'bg-purple-400'
                }`}
                style={{
                  background: isCompleted
                    ? 'linear-gradient(90deg, #34d399, #10b981)'
                    : 'linear-gradient(90deg, #a855f7, #8b5cf6)'
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {hasError ? (
            <div className="text-center text-red-400">
              <AlertTriangle size={20} className="mx-auto mb-2" />
              <p className="text-white/80 text-xs">
                {reasoningData?.error || 'Greška u analizi'}
              </p>
            </div>
          ) : isCompleted ? (
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, ease: "backOut" }}
              >
                <Sparkles className="text-green-400 mx-auto" size={20} />
              </motion.div>
              <p className="text-sm font-medium text-white">
                Reasoning završen!
              </p>
              <div className="bg-white/10 rounded-lg p-2 border border-white/20">
                <div className="text-xs text-white/70">
                  {localSteps.length} faza • {formatDuration(Date.now() - startTime)}
                </div>
              </div>
            </div>
          ) : currentStep > 0 && localSteps[currentStep - 1] ? (
            <div className="space-y-2">
              {/* Current Step Icon and Content */}
              <div className="flex items-start gap-2">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.5, ease: "backOut" }}
                  className="p-1 bg-white/10 rounded-lg border border-white/20 flex-shrink-0"
                >
                  {React.createElement((localSteps[currentStep - 1].icon || Brain), {
                    size: 14,
                    className: "text-purple-400"
                  })}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-white font-mono text-xs leading-relaxed whitespace-pre-wrap"
                    style={{
                      fontFamily: 'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Monaco, Consolas, monospace',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word'
                    }}
                  >
                    {currentText}
                    {isTyping && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="text-purple-400"
                      >
                        |
                      </motion.span>
                    )}
                  </div>
                </div>
              </div>

              {/* Previous Steps History */}
              {currentStep > 1 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-white/60 uppercase tracking-wide">
                    Prethodne:
                  </div>
                  <div className="space-y-1 max-h-16 overflow-y-auto">
                    {localSteps.slice(0, currentStep - 1).map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-1 text-xs"
                      >
                        <CheckCircle className="text-green-400 flex-shrink-0" size={8} />
                        <span className="text-white/60 truncate">
                          {step.text.split('\n')[0].substring(0, 30)}...
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <motion.div
                animate={{
                  rotate: 360,
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <Brain size={24} className="mx-auto mb-2 text-purple-400" />
              </motion.div>
              <p className="text-white/80 text-sm font-medium">Pripremam AI...</p>
              <p className="text-white/60 text-xs mt-1">Aktiviram neuronsku mrežu</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-2 flex justify-end">
          {!isCompleted && !hasError && (
            <button
              onClick={handleCancelClick}
              className="px-3 py-1 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 border border-white/20"
            >
              Prekini
            </button>
          )}

          {(isCompleted || hasError) && (
            <button
              onClick={handleCancelClick}
              className="px-3 py-1 text-xs bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all duration-200"
            >
              Zatvori
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ReasoningOverlay;
