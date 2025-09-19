import React from 'react';
import { motion } from 'framer-motion';
import { Table as TableIcon, RotateCcw, Link } from 'lucide-react';

const TableView = ({ content, getActionsByType, resetUnit, onConnectionDragStart }) => {
  const isFile = typeof File !== 'undefined' && content instanceof File;
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <TableIcon size={16} className="text-purple-600" />
          <span className="text-xs font-medium">Table</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Connection Button */}
          <button
            onMouseDown={onConnectionDragStart}
            title="Connect Unit"
            className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
          >
            <Link size={14} />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Connect Unit
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
            </div>
          </button>

          {/* Reset Button */}
          <button
            onClick={resetUnit}
            title="Reset Unit"
            className="relative group text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
          >
            <RotateCcw size={14} />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Reset Unit
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
            </div>
          </button>
        </div>
      </div>
      <div className="flex gap-2 h-full">
        <div className="w-2/3 bg-slate-50 rounded p-2">
          {isFile ? (
            <div className="text-xs text-slate-600">
              <p>File: {content.name}</p>
              <p>Type: Spreadsheet</p>
              <p>Size: {(content.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="text-xs font-mono whitespace-pre-wrap">{content}</div>
          )}
        </div>

        <div className="w-1/3 p-1">
          <div className="text-xs font-medium text-slate-600 mb-2">Actions</div>
          <div className="space-y-1">
            {getActionsByType('table').map((action, index) => {
              const theme = (label => {
                const map = { 'Analyze':'purple', 'Export':'green', 'Edit':'blue', 'View':'slate', 'Process AI':'purple', 'Cancel':'orange' };
                return map[label] || 'slate';
              })(action.label);
              const base = 'w-full flex items-center space-x-2 p-1 rounded border transition-colors group';
              const byTheme = {
                slate: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
                purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
                orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
              }[theme];
              return (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={action.action}
                  className={`${base} ${byTheme}`}
                >
                  <action.icon size={12} className="text-inherit" />
                  <span className="text-xs">{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableView;
