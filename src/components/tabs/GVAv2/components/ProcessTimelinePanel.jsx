import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ProcessTimelinePanel({ processStages, clearStages }) {
  return (
    <div className="h-[600px] flex flex-col">
      {processStages.length > 0 && (
        <div className="panel rounded-2xl p-4 mb-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-primary flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Proces obrade
            </h3>
            <button onClick={clearStages} className="text-xs text-subtle hover:text-primary transition-colors">
              Očisti
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {processStages.length === 0 ? (
          <div className="p-4 h-full flex items-center justify-center">
            <div className="text-center text-subtle">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Nema aktivnih procesa</p>
              <p className="text-xs mt-1">Timeline će se prikazati kad pokrenete glasovnu naredbu</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {processStages.map((stage, index) => (
                <motion.div
                  key={stage.id}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, transition: { delay: index * 0.1 } }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  className={`relative p-3 rounded-lg border-2 transition-all duration-300 ${
                    stage.status === 'active' ? 'border-blue-200 bg-blue-50/50' : ''
                  } ${stage.status === 'completed' ? 'border-green-200 bg-green-50/50' : ''} ${
                    stage.status === 'failed' ? 'border-red-200 bg-red-50/50' : ''
                  } ${stage.status === 'idle' ? 'border-gray-200 bg-gray-50/30' : ''}`}
                >
                  {index < processStages.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-300" />
                  )}
                  <div className="absolute top-3 left-3">
                    {stage.status === 'active' && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                      />
                    )}
                    {stage.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-600" />}
                    {stage.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-600" />}
                    {stage.status === 'idle' && <div className="w-3 h-3 rounded-full border-2 border-gray-400" />}
                  </div>
                  <div className="ml-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{stage.icon}</span>
                      <h4 className={`font-medium text-sm ${
                        stage.status === 'active' ? 'text-blue-900' :
                        stage.status === 'completed' ? 'text-green-900' :
                        stage.status === 'failed' ? 'text-red-900' : 'text-gray-900'
                      }`}>
                        {stage.name}
                      </h4>
                    </div>
                    <p className={`text-xs mb-2 ${
                      stage.status === 'active' ? 'text-blue-700' :
                      stage.status === 'completed' ? 'text-green-700' :
                      stage.status === 'failed' ? 'text-red-700' : 'text-gray-600'
                    }`}>
                      {stage.description}
                    </p>
                    {stage.params && Object.keys(stage.params).length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-gray-600 mb-1">Parametri:</div>
                        <div className="space-y-1">
                          {Object.entries(stage.params).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-gray-500">{key}:</span>
                              <span className="text-gray-700 font-mono max-w-[100px] truncate">
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {stage.result && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-green-600 mb-1">Rezultat:</div>
                        <div className="text-xs text-green-700 font-mono">
                          {typeof stage.result === 'string' ? stage.result : JSON.stringify(stage.result, null, 2).substring(0, 50) + '...'}
                        </div>
                      </div>
                    )}
                    {stage.error && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-red-600 mb-1">Greška:</div>
                        <div className="text-xs text-red-700 font-mono">
                          {typeof stage.error === 'string' ? stage.error : JSON.stringify(stage.error, null, 2).substring(0, 50) + '...'}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                      <span>
                        {stage.timestamp && new Date(stage.timestamp).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {stage.completedAt && (
                        <span>({Math.round((new Date(stage.completedAt) - new Date(stage.timestamp)) / 1000)}s)</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

