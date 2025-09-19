import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, RotateCcw, Link } from 'lucide-react';

const TextView = ({ content, onChange, getActionsByType, resetUnit, onConnectionDragStart }) => {
  const textareaRef = useRef(null);

  // Auto-focus when component mounts (when text is first entered)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Position cursor at the end of existing text
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  // Listen for focus requests from the system
  useEffect(() => {
    const handleFocusRequest = (event) => {
      const { unitType } = event.detail;
      if (unitType === 'text' && textareaRef.current) {
        textareaRef.current.focus();
        // Position cursor at the end
        const length = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(length, length);
      }
    };

    window.addEventListener('unit-text-focus-request', handleFocusRequest);
    return () => window.removeEventListener('unit-text-focus-request', handleFocusRequest);
  }, []);
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <FileText size={16} className="text-blue-600" />
          <span className="text-xs font-medium">Text</span>
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

      <div className="flex-1 flex gap-2">
        <div className="w-2/3 bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-slate-300 hover:bg-slate-100/50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white transition-all duration-200 shadow-sm">
          <textarea
            ref={textareaRef}
            value={content || ''}
            onChange={(e) => onChange(e.target.value)}
            className="unit-text-input w-full h-full resize-none border-none outline-none bg-transparent text-sm text-slate-800 cursor-text"
            placeholder="Enter your text..."
          />
        </div>
        <div className="w-1/3 p-1">
          <div className="text-xs font-medium text-slate-600 mb-2">Actions</div>
          <div className="space-y-1">
            {getActionsByType('text').map((action, index) => {
              const theme = (label => {
                const map = {
                  'Edit': 'blue', 'Format': 'blue', 'Find': 'blue',
                  'Copy': 'slate', 'Export': 'green',
                  'Process AI': 'purple', 'Cancel': 'orange', 'Big Process': 'green'
                };
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
              const btnClass = `${base} ${byTheme}`;
              return (
                <motion.button
                  key={`${action.label}-${index}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={action.action}
                  className={btnClass}
                >
                  <action.icon size={12} className="text-inherit" />
                  <span className="text-xs">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <p>Words: {content ? content.split(/\s+/).filter(w => w.length > 0).length : 0}</p>
            <p>Characters: {content ? content.length : 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextView;

