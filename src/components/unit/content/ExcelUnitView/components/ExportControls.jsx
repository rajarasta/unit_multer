import React from 'react';
import { FileSpreadsheet, Zap, Printer, FileDown } from 'lucide-react';

const ExportControls = ({
  parsedData,
  normalizedData,
  normalizedXlsxUrl,
  isNormalizing,
  onNormalize,
  handleExportExcel,
  handleExportPDF,
  handlePrint
}) => {
  return (
    <div className="flex items-center gap-1">
      {/* Normalize Button */}
      <button
        onClick={onNormalize}
        disabled={isNormalizing || !parsedData}
        className={`px-2 py-0.5 text-xs rounded transition-colors ${
          isNormalizing
            ? 'bg-orange-100 text-orange-600 cursor-not-allowed'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
        title="Normalize Excel data to standard BoQ format"
      >
        <Zap size={10} className="inline mr-1" />
        {isNormalizing ? 'Normalizing...' : 'Normalize'}
      </button>

      {/* Export Buttons */}
      <div className="mx-1 h-3 w-px bg-slate-300"></div>

      <button
        onClick={handleExportExcel}
        disabled={!parsedData}
        className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export to styled Excel with metadata"
      >
        <FileSpreadsheet size={10} className="inline mr-1" />
        Excel
      </button>

      <button
        onClick={handleExportPDF}
        disabled={!parsedData}
        className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export to PDF with styling"
      >
        <FileDown size={10} className="inline mr-1" />
        PDF
      </button>

      <button
        onClick={handlePrint}
        disabled={!parsedData}
        className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Print Excel data with styling"
      >
        <Printer size={10} className="inline mr-1" />
        Print
      </button>

      {/* Download normalized XLSX */}
      {normalizedXlsxUrl && (
        <a
          href={normalizedXlsxUrl}
          download={`${parsedData?.fileName?.replace(/\.\w+$/, '') || 'file'}-normalized.xlsx`}
          className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
          title="Download normalized XLSX file"
        >
          📥 Download
        </a>
      )}
    </div>
  );
};

export default ExportControls;