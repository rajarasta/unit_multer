import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const ConnectedContainer = ({
  sourceUnit,
  targetUnit,
  connectionColor,
  onDisconnect,
  children
}) => {
  return (
    <motion.div
      className="relative bg-white/50 backdrop-blur-sm rounded-xl border-2 p-4"
      style={{
        borderColor: connectionColor,
        boxShadow: `0 0 30px ${connectionColor}40, 0 0 60px ${connectionColor}20`
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: [
          `0 0 30px ${connectionColor}40, 0 0 60px ${connectionColor}20`,
          `0 0 40px ${connectionColor}60, 0 0 80px ${connectionColor}30`,
          `0 0 30px ${connectionColor}40, 0 0 60px ${connectionColor}20`
        ]
      }}
      transition={{
        scale: { duration: 0.3 },
        boxShadow: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }}
      layout
    >
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-1 z-0"
        style={{
          background: `linear-gradient(90deg, ${connectionColor}60, ${connectionColor}80, ${connectionColor}60)`,
          width: 'calc(100% - 2rem)',
          boxShadow: `0 0 10px ${connectionColor}60`
        }}
      />

      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/80 rounded-full px-3 py-1 text-xs font-medium z-10">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: connectionColor }} />
        <span className="text-slate-600">
          Units {sourceUnit.id} → {targetUnit.id}
        </span>
        <button
          onClick={onDisconnect}
          className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1"
          title="Disconnect units"
        >
          <X size={12} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10 mt-6">
        {children}
      </div>

      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-slate-500 bg-white/60 rounded px-2 py-1">
        Connected • Ready for processing
      </div>
    </motion.div>
  );
};

export default ConnectedContainer;

