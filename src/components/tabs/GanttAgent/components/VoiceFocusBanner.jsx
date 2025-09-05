import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceFocusBanner({ show, transcript }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ y: -24, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: -24, opacity: 0 }} 
          className="rounded-xl border bg-white p-4 shadow-sm mb-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase text-gray-500 tracking-wider mb-1">Gantt Voice Focus</div>
              <div className="font-medium mb-2">Agent aktivan za Gantt editiranje - glasovne naredbe se procesiraju direktno</div>
            </div>
            <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm">LIVE</span>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            <span className="font-mono">{transcript || "…"}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}