import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ProcessStagesPanel({ processStages = [], clearStages }) {
  return (
    <AnimatePresence>
      {processStages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6"
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Proces obrade</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                <AnimatePresence>
                  {processStages.map((stage, index) => (
                    <motion.div
                      key={stage.id}
                      initial={{ opacity: 0, scale: 0.8, x: 20 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        x: 0,
                        transition: { delay: index * 0.1 },
                      }}
                      exit={{ opacity: 0, scale: 0.8, x: -20 }}
                      className={`
                          flex-shrink-0 p-3 rounded-lg border-2 min-w-[200px] relative
                          ${stage.status === 'active' ? 'border-blue-200 bg-blue-50' : ''}
                          ${stage.status === 'completed' ? 'border-green-200 bg-green-50' : ''}
                          ${stage.status === 'failed' ? 'border-red-200 bg-red-50' : ''}
                        `}
                    >
                      <div className="absolute top-2 right-2">
                        {stage.status === 'active' && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                          />
                        )}
                        {stage.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {stage.status === 'failed' && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>

                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{stage.icon}</span>
                          <h4
                            className={`font-medium text-sm ${
                              stage.status === 'active'
                                ? 'text-blue-900'
                                : stage.status === 'completed'
                                ? 'text-green-900'
                                : stage.status === 'failed'
                                ? 'text-red-900'
                                : 'text-gray-900'
                            }`}
                          >
                            {stage.name}
                          </h4>
                        </div>
                        <p
                          className={`text-xs ${
                            stage.status === 'active'
                              ? 'text-blue-700'
                              : stage.status === 'completed'
                              ? 'text-green-700'
                              : stage.status === 'failed'
                              ? 'text-red-700'
                              : 'text-gray-600'
                          }`}
                        >
                          {stage.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                          {new Date(stage.timestamp).toLocaleTimeString('hr-HR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        {stage.completedAt && (
                          <span>
                            ({Math.round((new Date(stage.completedAt) - new Date(stage.timestamp)) / 1000)}s)
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {processStages.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={clearStages}
                    className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Očisti proces
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}