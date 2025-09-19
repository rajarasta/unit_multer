import React from 'react';
import { motion } from 'framer-motion';
import { Document, Page } from 'react-pdf';
import { FileX, FileText, RotateCcw, Link } from 'lucide-react';

const PdfView = ({
  fileUrl,
  pdfNumPages,
  pdfPageNumber,
  onDocumentLoadSuccess,
  getActionsByType,
  resetUnit,
  content,
  onConnectionDragStart
}) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <FileX size={16} className="text-red-600" />
          <span className="text-xs font-medium">PDF Document</span>
          {pdfNumPages && (
            <span className="text-xs text-slate-500">({pdfNumPages} pages)</span>
          )}
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
        <div className="w-1/2 h-full bg-slate-50 rounded border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-2">
          {fileUrl && (
            <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} className="max-w-full max-h-full">
              <Page pageNumber={pdfPageNumber} width={140} className="shadow-sm" />
            </Document>
          )}
        </div>

        <div className="w-1/2 p-2">
          <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1">
            <FileText size={12} className="text-red-500" />
            Actions
          </div>
          <div className="grid grid-cols-3 gap-2">
            {getActionsByType('pdf').map((action, index) => {
              const theme = (label => {
                const map = {
                  'Download': 'green', 'Split': 'orange', 'Extract': 'purple', 'Search': 'blue', 'Print': 'slate', 'View': 'slate',
                  'Process AI': 'purple', 'Cancel': 'orange'
                }; return map[label] || 'slate';
              })(action.label);
              const base = 'relative group flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 hover:scale-105 hover:shadow-md';
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={action.action}
                  title={action.label}
                  className={`${base} ${byTheme}`}
                >
                  <action.icon size={14} className="text-inherit mb-1" />
                  <span className="text-xs font-medium">{action.label}</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {action.label}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <p>Name: {content?.name}</p>
            <p>Size: {content ? (content.size / 1024).toFixed(1) : 0} KB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfView;
