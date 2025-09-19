import React from 'react';
import { motion } from 'framer-motion';
import { Document, Page } from 'react-pdf';
import { FileX, FileText, RotateCcw } from 'lucide-react';

const PdfView = ({
  fileUrl,
  pdfNumPages,
  pdfPageNumber,
  onDocumentLoadSuccess,
  getActionsByType,
  resetUnit,
  content
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
        <div className="w-1/2 bg-slate-50 rounded border-2 border-dashed border-slate-200 flex items-center justify-center">
          {fileUrl && (
            <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} className="max-w-full max-h-full">
              <Page pageNumber={pdfPageNumber} width={120} className="shadow-sm" />
            </Document>
          )}
        </div>

        <div className="w-1/2 p-2">
          <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1">
            <FileText size={12} className="text-red-500" />
            Actions
          </div>
          <div className="grid grid-cols-3 gap-2">
            {getActionsByType('pdf').map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.action}
                title={action.label}
                className="relative group flex flex-col items-center justify-center p-2 rounded-lg bg-white/60 hover:bg-red-50/80 border border-white/50 hover:border-red-200/50 transition-all duration-200 hover:scale-105 hover:shadow-md backdrop-blur-sm"
              >
                <action.icon size={14} className="text-slate-600 group-hover:text-red-600 transition-colors mb-1" />
                <span className="text-xs text-slate-500 group-hover:text-red-700 font-medium">
                  {action.label}
                </span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  {action.label}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                </div>
              </motion.button>
            ))}
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

