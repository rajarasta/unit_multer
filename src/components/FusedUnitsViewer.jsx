import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Link, Merge, Play, Pause, X, Eye, RotateCcw, ArrowRight, CheckCircle, Brain, Zap, AlertTriangle } from 'lucide-react';

const FusedUnitsViewer = ({ isOpen, onClose, units = [] }) => {
  const [fusedPairs, setFusedPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const findFusedPairs = () => {
      const connectedUnits = units.filter(unit => unit.isConnectedUnit && unit.connectedToUnit);
      const pairs = [];
      const processed = new Set();

      connectedUnits.forEach(unit => {
        if (processed.has(unit.id)) return;

        const connectedUnit = units.find(u => u.id === unit.connectedToUnit);
        if (connectedUnit && !processed.has(connectedUnit.id)) {
          pairs.push({
            id: `${unit.id}-${connectedUnit.id}`,
            sourceUnit: unit,
            targetUnit: connectedUnit,
            connectionColor: unit.connectionColor,
            status: determineFusionStatus(unit, connectedUnit),
            createdAt: Date.now(),
            lastProcessed: null,
            combinedResult: null
          });
          processed.add(unit.id);
          processed.add(connectedUnit.id);
        }
      });

      setFusedPairs(pairs);
    };

    findFusedPairs();
    const interval = setInterval(findFusedPairs, 1000);

    return () => clearInterval(interval);
  }, [isOpen, units]);

  const determineFusionStatus = (unit1, unit2) => {
    const hasProcessedContent = unit1.processingStatus?.hasProcessedContent || unit2.processingStatus?.hasProcessedContent;
    const isProcessing = unit1.reasoningState?.isActive || unit2.reasoningState?.isActive;
    const hasResults = unit1.reasoningState?.result || unit2.reasoningState?.result;

    if (isProcessing) return 'processing';
    if (hasResults) return 'completed';
    if (hasProcessedContent) return 'ready';
    return 'fused';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'fused': return <Link className="text-blue-500" size={16} />;
      case 'ready': return <Zap className="text-green-500" size={16} />;
      case 'processing': return <Brain className="text-purple-500 animate-pulse" size={16} />;
      case 'completed': return <CheckCircle className="text-green-600" size={16} />;
      default: return <Merge className="text-slate-400" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'fused': return 'border-blue-200 bg-blue-50';
      case 'ready': return 'border-green-200 bg-green-50';
      case 'processing': return 'border-purple-200 bg-purple-50';
      case 'completed': return 'border-green-200 bg-green-100';
      default: return 'border-slate-200 bg-slate-50';
    }
  };

  const startFusedProcessing = (pair) => {
    // Trigger processing on both units
    window.dispatchEvent(new CustomEvent('start-fused-processing', {
      detail: {
        sourceUnitId: pair.sourceUnit.id,
        targetUnitId: pair.targetUnit.id,
        fusionId: pair.id
      }
    }));
  };

  const UnitIcon = ({ unit, isTarget = false }) => (
    <motion.div
      className={`relative p-3 rounded-lg border-2 ${
        unit.unitType === 'empty' ? 'border-dashed border-slate-300 bg-slate-50' :
        unit.reasoningState?.isActive ? 'border-purple-300 bg-purple-50' :
        'border-slate-200 bg-white'
      }`}
      whileHover={{ scale: 1.05 }}
      style={{
        borderColor: unit.connectionColor ? `${unit.connectionColor}60` : undefined
      }}
    >
      <div className="text-center">
        <div className="text-xs font-medium text-slate-600 mb-1">Unit {unit.id}</div>
        <div className="text-xs text-slate-500">{unit.unitType || 'empty'}</div>
        {unit.reasoningState?.isActive && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
    </motion.div>
  );

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
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-[700px] max-h-[85vh] overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bot className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Fused Units Control Center</h2>
              <p className="text-sm text-slate-600">{fusedPairs.length} unit combinations active</p>
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
        <div className="p-4 overflow-y-auto max-h-[65vh]">
          {fusedPairs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Bot size={48} className="mx-auto mb-4 opacity-30" />
              <p>No fused units detected</p>
              <p className="text-sm mt-2">Connect units by dragging to create fusion pairs</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {fusedPairs.map((pair, index) => (
                <motion.div
                  key={pair.id}
                  className={`border-2 rounded-xl p-4 ${getStatusColor(pair.status)} cursor-pointer hover:shadow-md transition-all`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{
                    borderColor: pair.connectionColor ? `${pair.connectionColor}80` : undefined,
                    boxShadow: selectedPair?.id === pair.id ? `0 0 20px ${pair.connectionColor}40` : undefined
                  }}
                  onClick={() => setSelectedPair(selectedPair?.id === pair.id ? null : pair)}
                >
                  {/* Fusion Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(pair.status)}
                      <span className="font-medium text-slate-800">Fusion {pair.id}</span>
                      <span className="text-xs px-2 py-1 bg-white/60 rounded-full capitalize">
                        {pair.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {pair.status === 'ready' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startFusedProcessing(pair);
                          }}
                          className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          title="Start Fused Processing"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button
                        className="p-1.5 hover:bg-white/60 rounded transition-colors"
                        title="View Details"
                      >
                        <Eye size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>

                  {/* Units Display */}
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <UnitIcon unit={pair.sourceUnit} />

                    <motion.div
                      className="flex flex-col items-center"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <div
                        className="w-8 h-1 rounded-full mb-1"
                        style={{ backgroundColor: pair.connectionColor }}
                      />
                      <Merge size={16} className="text-slate-400" />
                      <div
                        className="w-8 h-1 rounded-full mt-1"
                        style={{ backgroundColor: pair.connectionColor }}
                      />
                    </motion.div>

                    <UnitIcon unit={pair.targetUnit} isTarget />
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedPair?.id === pair.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/60 pt-4 mt-4 space-y-3"
                      >
                        {/* Processing Pipeline */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">Processing Pipeline:</h4>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className={`p-2 rounded text-center ${
                              pair.status === 'fused' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              1. Fused
                            </div>
                            <div className={`p-2 rounded text-center ${
                              ['ready', 'processing', 'completed'].includes(pair.status) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              2. Ready
                            </div>
                            <div className={`p-2 rounded text-center ${
                              ['processing', 'completed'].includes(pair.status) ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              3. Processing
                            </div>
                          </div>
                        </div>

                        {/* Data Preview */}
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">Combined Data:</h4>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-2 bg-white/60 rounded">
                              <div className="font-medium text-slate-600">Source Unit:</div>
                              <div className="text-slate-500">
                                Type: {pair.sourceUnit.unitType}<br/>
                                Content: {pair.sourceUnit.content ? 'Yes' : 'No'}
                              </div>
                            </div>
                            <div className="p-2 bg-white/60 rounded">
                              <div className="font-medium text-slate-600">Target Unit:</div>
                              <div className="text-slate-500">
                                Type: {pair.targetUnit.unitType}<br/>
                                Content: {pair.targetUnit.content ? 'Yes' : 'No'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Results */}
                        {pair.combinedResult && (
                          <div>
                            <h4 className="text-sm font-medium text-slate-700 mb-2">Fusion Result:</h4>
                            <div className="p-3 bg-white/80 rounded text-xs">
                              <pre className="whitespace-pre-wrap text-slate-700">
                                {JSON.stringify(pair.combinedResult, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Auto-sync with connected units • Live updates
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors">
                Export Fusions
              </button>
              <button className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                Process All Ready
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FusedUnitsViewer;