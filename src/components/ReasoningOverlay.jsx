import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, AlertTriangle, CheckCircle, Loader, Sparkles } from 'lucide-react';
import { formatDuration, formatConfidence, truncateText } from '../utils/helpers';

const ReasoningOverlay = ({
  isActive,
  reasoningData,
  onCancel,
  position = 'absolute',
  className = ''
}) => {
  const [localSteps, setLocalSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [startTime] = useState(Date.now());

  // Update local state when reasoning data changes
  useEffect(() => {
    if (reasoningData) {
      if (reasoningData.steps) {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`${position} inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm ${className}`}
      onClick={handleOverlayClick}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/50 p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle className="text-green-500" size={20} />
            ) : hasError ? (
              <AlertTriangle className="text-red-500" size={20} />
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="text-purple-500" size={20} />
              </motion.div>
            )}
            <h3 className="text-lg font-semibold text-slate-800">
              {isCompleted ? 'Analiza završena' : hasError ? 'Greška u analizi' : 'AI Reasoning'}
            </h3>
          </div>

          <button
            onClick={handleCancelClick}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress Bar */}
        {!hasError && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Korak {currentStep} od {localSteps.length || '...'}</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-2 rounded-full ${
                  isCompleted ? 'bg-green-500' : 'bg-purple-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Current Step or Result */}
        <div className="min-h-[120px] flex flex-col justify-center">
          {hasError ? (
            <div className="text-center text-red-600">
              <AlertTriangle size={32} className="mx-auto mb-2" />
              <p className="text-sm">
                {reasoningData?.error || 'Došlo je do greške tijekom analize'}
              </p>
            </div>
          ) : isCompleted && reasoningData?.result ? (
            <div className="space-y-3">
              <div className="text-center">
                <Sparkles className="text-green-500 mx-auto mb-2" size={32} />
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Analiza uspješno završena
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                  Sažetak
                </div>
                <p className="text-sm text-slate-700">
                  {truncateText(reasoningData.result.summary, 150)}
                </p>

                {reasoningData.result.confidence && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Pouzdanost:</span>
                    <span className="font-medium text-green-600">
                      {formatConfidence(reasoningData.result.confidence)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Trajanje:</span>
                  <span className="font-medium text-slate-600">
                    {formatDuration(Date.now() - startTime)}
                  </span>
                </div>
              </div>
            </div>
          ) : currentStepData ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="mt-1"
                >
                  <Loader className="text-purple-500" size={16} />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {currentStepData.content}
                  </p>
                  {currentStepData.confidence && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${currentStepData.confidence * 100}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-1 bg-purple-500 rounded-full"
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatConfidence(currentStepData.confidence)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step History */}
              {localSteps.length > 1 && currentStep > 1 && (
                <div className="bg-slate-50 rounded-lg p-2 max-h-24 overflow-y-auto">
                  <div className="text-xs font-medium text-slate-600 mb-1">
                    Prethodne obrade:
                  </div>
                  <div className="space-y-1">
                    {localSteps.slice(0, currentStep - 1).map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="text-green-500 flex-shrink-0" size={10} />
                        <span className="text-slate-600 truncate">
                          {truncateText(step.content, 40)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain size={32} className="mx-auto mb-2 text-purple-400" />
              </motion.div>
              <p className="text-sm">Pokretanje AI analize...</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          {!isCompleted && !hasError && (
            <button
              onClick={handleCancelClick}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Prekini
            </button>
          )}

          {(isCompleted || hasError) && (
            <button
              onClick={handleCancelClick}
              className="px-4 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
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