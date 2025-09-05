import React from 'react';
import { FileText, Loader2, CheckCircle2, AlertCircle, X, Play } from 'lucide-react';

/**
 * DocumentList - Komponenta za prikaz liste dokumenata u sidebaru
 * 
 * Prikazuje status dokumenata, omogućava navigaciju i akcije
 * 
 * @param {Array} documents - Lista dokumenata
 * @param {number} currentIndex - Index trenutno selektovanog dokumenta
 * @param {Function} onDocumentSelect - Callback za selekciju dokumenta
 * @param {Function} onDocumentRemove - Callback za brisanje dokumenta
 * @param {Function} onDocumentAnalyze - Callback za analizu dokumenta
 * @param {boolean} isProcessing - Da li je u toku procesiranje
 */
export default function DocumentList({ 
  documents = [], 
  currentIndex = 0, 
  onDocumentSelect,
  onDocumentRemove,
  onDocumentAnalyze,
  isProcessing = false
}) {

  const getStatusIcon = (status) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-600" />;
      case 'analyzed':
        return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return <FileText className="w-3 h-3 text-gray-400" />;
    }
  };

  const getStatusColor = (status, isSelected) => {
    if (isSelected) {
      return 'border-blue-500 bg-blue-50';
    }
    
    switch (status) {
      case 'processing':
        return 'border-blue-300 bg-blue-50';
      case 'analyzed':
        return 'border-green-300 bg-green-50';
      case 'error':
        return 'border-red-300 bg-red-50';
      default:
        return 'border-gray-200 hover:bg-gray-50';
    }
  };

  const formatFileSize = (bytes) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  if (documents.length === 0) {
    return (
      <div className="w-80 border-r bg-white p-4 flex flex-col">
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Nema učitanih dokumenata</p>
          <p className="text-xs text-gray-400 mt-1">
            Dodajte datoteke da biste počeli
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-800">
          Dokumenti ({documents.length})
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {documents.filter(d => d.status === 'analyzed').length} analizirano
        </p>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {documents.map((doc, index) => {
          const isSelected = index === currentIndex;
          
          return (
            <div
              key={doc.id}
              className={`
                p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${getStatusColor(doc.status, isSelected)}
              `}
              onClick={() => onDocumentSelect?.(index)}
            >
              {/* Document Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate text-gray-900">
                    {doc.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(doc.size)} • {doc.type.split('/')[1]?.toUpperCase()}
                  </p>
                </div>
                
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onDocumentRemove?.(doc.id); 
                  }}
                  className="text-gray-400 hover:text-red-600 transition-colors p-1"
                  title="Ukloni dokument"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Status and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.status)}
                  <span className="text-xs text-gray-600 capitalize">
                    {doc.status === 'uploaded' && 'Spreman za analizu'}
                    {doc.status === 'processing' && 'Analizira...'}
                    {doc.status === 'analyzed' && 'Analizirano'}
                    {doc.status === 'error' && 'Greška'}
                  </span>
                </div>
                
                {/* Action Button */}
                {doc.status === 'uploaded' && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onDocumentAnalyze?.([doc]); 
                    }}
                    disabled={isProcessing}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    title="Pokreni analizu"
                  >
                    <Play className="w-3 h-3" />
                    Analiziraj
                  </button>
                )}
              </div>

              {/* Error Message */}
              {doc.error && (
                <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-700">
                  <p className="font-medium">Greška:</p>
                  <p className="truncate" title={doc.error}>
                    {doc.error}
                  </p>
                </div>
              )}

              {/* Analysis Preview */}
              {doc.analysis && (
                <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs">
                  <div className="grid grid-cols-2 gap-1">
                    {doc.analysis.documentNumber && (
                      <div>
                        <span className="text-gray-500">Broj:</span>
                        <span className="font-medium ml-1">
                          {doc.analysis.documentNumber}
                        </span>
                      </div>
                    )}
                    {doc.analysis.totals?.totalAmount && (
                      <div>
                        <span className="text-gray-500">Iznos:</span>
                        <span className="font-medium ml-1">
                          {doc.analysis.totals.totalAmount.toFixed(2)} {doc.analysis.currency || 'EUR'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {doc.analysis.supplier?.name && (
                    <div className="mt-1">
                      <span className="text-gray-500">Dobavljač:</span>
                      <span className="font-medium ml-1 truncate">
                        {doc.analysis.supplier.name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      {documents.some(d => d.status === 'uploaded') && (
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={() => onDocumentAnalyze?.(documents.filter(d => d.status === 'uploaded'))}
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Analiziraj sve ({documents.filter(d => d.status === 'uploaded').length})
          </button>
        </div>
      )}
    </div>
  );
}