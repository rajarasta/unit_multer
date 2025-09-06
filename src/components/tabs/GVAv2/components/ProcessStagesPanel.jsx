import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, ChevronRight } from 'lucide-react';

export default function ProcessStagesPanel({ processStages = [] }) {
  return (
    <AnimatePresence>
      {processStages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-full left-0 right-0 mb-4 px-8"
        >
          <div className="panel rounded-xl p-4 shadow-xl">
            <div className="flex justify-center gap-4 overflow-x-auto">
              {processStages.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 flex-shrink-0">
                  <div className={`flex items-center gap-3 p-2 rounded-lg input-bg ${s.status === 'active' ? 'ring-2 ring-accent' : ''}`}>
                    <span className="text-md">{s.icon}</span>
                    <span className="text-sm font-medium text-primary">{s.name}</span>
                    {s.status === 'active' && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full"
                      />
                    )}
                    {s.status === 'completed' && (<CheckCircle className="w-4 h-4 text-green-500" />)}
                  </div>
                  {i < processStages.length - 1 && (<ChevronRight className="text-subtle w-4 h-4" />)}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

