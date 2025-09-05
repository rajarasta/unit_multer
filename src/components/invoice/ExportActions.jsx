import React from 'react';
import { FileSpreadsheet, FileCode, Database, Download } from 'lucide-react';

/**
 * ExportActions - Komponenta za export funkcionalnosti
 * 
 * @param {Object} document - Document sa analizom
 * @param {Function} onExportExcel - Callback za Excel export
 * @param {Function} onExportJSON - Callback za JSON export
 * @param {Function} onSaveToDatabase - Callback za spremanje u bazu
 */
export default function ExportActions({ 
  document, 
  onExportExcel, 
  onExportJSON, 
  onSaveToDatabase 
}) {
  if (!document?.analysis) return null;

  const exportOptions = [
    {
      label: 'Excel stavke',
      icon: FileSpreadsheet,
      onClick: onExportExcel,
      color: 'bg-green-600 hover:bg-green-700',
      description: 'Exportuj stavke u Excel format'
    },
    {
      label: 'JSON (trenutni)',
      icon: FileCode,
      onClick: onExportJSON,
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'Exportuj kompletan dokument u JSON format'
    },
    {
      label: 'Spremi u bazu',
      icon: Database,
      onClick: onSaveToDatabase,
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'Spremi dokument u bazu podataka'
    }
  ];

  return (
    <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800">Export opcije</h4>
        <Download className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {exportOptions.map((option, index) => {
          const IconComponent = option.icon;
          
          return (
            <button
              key={index}
              onClick={option.onClick}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-all 
                ${option.color} hover:shadow-lg transform hover:scale-105
              `}
              title={option.description}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-sm font-medium text-center">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Export Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-xs text-blue-700">
          <p className="font-medium mb-1">Export informacije:</p>
          <ul className="space-y-1">
            <li>• Excel: {document.analysis.items?.length || 0} stavki</li>
            <li>• JSON: Kompletan dokument sa analizom</li>
            <li>• Baza: Potvrda i arhiviranje</li>
          </ul>
        </div>
      </div>
    </div>
  );
}