import React from 'react';
import { motion } from 'framer-motion';

// Date helper functions (should be imported from utils if extracted)
const diffDays = (a, b) => {
  const d1 = new Date(`${a}T00:00:00`);
  const d2 = new Date(`${b}T00:00:00`);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

export default function MiniGanttActiveLine({ dateRange, line }) {
  if (!line || !dateRange?.from || !dateRange?.to) return null;
  
  const totalDays = Math.max(1, diffDays(dateRange.from, dateRange.to) + 1);
  const startIdx = Math.max(0, diffDays(dateRange.from, line.start));
  const endIdx = Math.max(0, diffDays(dateRange.from, line.end));
  const span = Math.max(1, endIdx - startIdx + 1);
  const leftPct = (startIdx / totalDays) * 100;
  const widthPct = (span / totalDays) * 100;
  const isConfirmed = !!line.confirmed;

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        <span>{dateRange.from}</span>
        <span>{dateRange.to}</span>
      </div>
      <div className="relative h-6 rounded-full bg-slate-100 border overflow-hidden">
        <motion.div
          initial={{ opacity: 0.95 }}
          animate={{
            opacity: [0.95, 1, 0.95],
            boxShadow: isConfirmed
              ? ["0 0 0px rgba(0,0,0,0)", "0 0 8px rgba(16,185,129,0.45)", "0 0 0px rgba(0,0,0,0)"]
              : ["0 0 0px rgba(0,0,0,0)", "0 0 14px rgba(56,189,248,0.6)", "0 0 0px rgba(0,0,0,0)"]
          }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute h-full rounded-full ${isConfirmed ? 'bg-emerald-500' : 'bg-sky-500'} text-white flex items-center justify-center`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        >
          <span className="text-[10px] px-2">{line.start.slice(5)} → {line.end.slice(5)}</span>
        </motion.div>
      </div>
    </div>
  );
}