import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, CheckCircle, XCircle, AlertTriangle, Play, Pause, X, Eye, RotateCcw } from 'lucide-react';

const ProcessingStatusViewer = ({ isOpen, onClose, units = [] }) => {
  const [processingUnits, setProcessingUnits] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const updateProcessingUnits = () => {
      const activeUnits = units.filter(unit =>
        unit.processingStatus?.processing !== 'proc_not_processed' ||
        unit.reasoningState?.isActive
      );
      setProcessingUnits(activeUnits);
    };

    updateProcessingUnits();
    const interval = setInterval(updateProcessingUnits, 500);

    return () => clearInterval(interval);
  }, [isOpen, units]);

  const getStatusIcon = (unit) => {
    if (unit.reasoningState?.isActive) {
      switch (unit.reasoningState.status) {
        case 'processing': return <Brain className="text-purple-500 animate-pulse" size={16} />;
        case 'completed': return <CheckCircle className="text-green-500" size={16} />;
        case 'error': return <XCircle className="text-red-500" size={16} />;
        case 'cancelled': return <AlertTriangle className="text-orange-500" size={16} />;
        default: return <Clock className="text-blue-500" size={16} />;
      }
    }
    return <Clock className="text-slate-400" size={16} />;
  };

  const getStatusColor = (unit) => {
    if (unit.reasoningState?.isActive) {
      switch (unit.reasoningState.status) {
        case 'processing': return 'border-purple-200 bg-purple-50';
        case 'completed': return 'border-green-200 bg-green-50';
        case 'error': return 'border-red-200 bg-red-50';
        case 'cancelled': return 'border-orange-200 bg-orange-50';
        default: return 'border-blue-200 bg-blue-50';
      }
    }
    return 'border-slate-200 bg-slate-50';
  };

  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[600px] max-h-[80vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Processing Status Monitor</h2>
              <p className="text-sm text-slate-600">{processingUnits.length} units in processing pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {processingUnits.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Brain size={48} className="mx-auto mb-4 opacity-30" />
              <p>No units currently processing</p>
              <p className="text-sm mt-2">Units will appear here when AI processing starts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {processingUnits.map((unit, index) => (
                <motion.div
                  key={unit.id}
                  className={`border rounded-lg p-4 ${getStatusColor(unit)}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(unit)}
                        <span className="font-medium text-slate-800">Unit {unit.id}</span>
                      </div>
                      <span className="text-xs px-2 py-1 bg-white/60 rounded-full">
                        {unit.unitType || 'unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-1 hover:bg-white/60 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} className="text-slate-600" />
                      </button>
                      {unit.reasoningState?.isActive && (
                        <button
                          className="p-1 hover:bg-white/60 rounded transition-colors"
                          title="Cancel Processing"
                        >
                          <X size={14} className="text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Processing Steps */}
                  {unit.reasoningState?.steps && unit.reasoningState.steps.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-slate-600 mb-2">Processing Steps:</h4>
                      {unit.reasoningState.steps.map((step, stepIndex) => (
                        <motion.div
                          key={stepIndex}
                          className={`flex items-center gap-2 text-xs p-2 rounded ${
                            stepIndex <= unit.reasoningState.currentStep
                              ? 'bg-white/80 text-slate-700'
                              : 'bg-white/40 text-slate-500'
                          }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: stepIndex * 0.05 }}
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            stepIndex < unit.reasoningState.currentStep
                              ? 'bg-green-500'
                              : stepIndex === unit.reasoningState.currentStep
                                ? 'bg-purple-500 animate-pulse'
                                : 'bg-slate-300'
                          }`} />
                          <span>{step.description || step.stage || `Step ${stepIndex + 1}`}</span>
                          {step.timestamp && (
                            <span className="text-slate-400 ml-auto">
                              {new Date(step.timestamp).toLocaleTimeString()}
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Results Preview */}
                  {unit.reasoningState?.result && (
                    <div className="mt-3 p-2 bg-white/60 rounded text-xs">
                      <h4 className="font-medium text-slate-600 mb-1">Result Preview:</h4>
                      <p className="text-slate-700 line-clamp-2">
                        {typeof unit.reasoningState.result === 'string'
                          ? unit.reasoningState.result
                          : JSON.stringify(unit.reasoningState.result).substring(0, 100) + '...'
                        }
                      </p>
                    </div>
                  )}

                  {/* Error Display */}
                  {unit.reasoningState?.error && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <h4 className="font-medium text-red-600 mb-1">Error:</h4>
                      <p className="text-red-700">{unit.reasoningState.error}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Live monitoring • Updates every 500ms
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                Export Logs
              </button>
              <button className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                Refresh All
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProcessingStatusViewer;