import React from 'react';
import { FileText, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { invoiceDataService } from '../../services/invoice/InvoiceDataService';

/**
 * QuickStats - Komponenta za brzu analizu dokumenta
 * 
 * @param {Object} document - Document sa analizom
 */
export default function QuickStats({ document }) {
  if (!document?.analysis) {
    return (
      <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-4">
        <h4 className="font-semibold mb-3">Brza analiza</h4>
        <div className="text-center py-8 text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Nema analize</p>
        </div>
      </div>
    );
  }

  const stats = invoiceDataService.getDocumentStats(document);
  
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-500';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-500';
    return 'text-red-600 bg-red-500';
  };

  const formatCurrency = (value) => {
    return invoiceDataService.formatCurrency(value, stats.currency);
  };

  return (
    <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Brza analiza</h4>
        {stats.hasErrors && (
          <AlertCircle className="w-5 h-5 text-red-500" title="Ima greške" />
        )}
        {!stats.hasErrors && !stats.hasWarnings && (
          <CheckCircle className="w-5 h-5 text-green-500" title="Sve je u redu" />
        )}
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">
            {stats.itemCount}
          </div>
          <div className="text-xs text-gray-500">Stavki</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.totalValue?.toFixed(0) || '0'}
          </div>
          <div className="text-xs text-gray-500">
            {stats.currency}
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-3 pt-2 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Ukupna vrijednost</span>
          <span className="font-medium">
            {formatCurrency(stats.totalValue)}
          </span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Broj stavki</span>
          <span className="font-medium">{stats.itemCount}</span>
        </div>
        
        {/* Confidence Score */}
        <div>
          <div className="flex justify-between items-center text-sm mb-1">
            <span className="text-gray-600">Pouzdanost</span>
            <span className={`font-medium ${getConfidenceColor(stats.confidence).split(' ')[0]}`}>
              {Math.round(stats.confidence * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getConfidenceColor(stats.confidence).split(' ')[1]}`}
              style={{ width: `${Math.round(stats.confidence * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Validation Issues */}
      {(stats.errors?.length > 0 || stats.warnings?.length > 0) && (
        <div className="pt-3 border-t border-gray-200">
          <h5 className="text-sm font-medium mb-2 text-gray-700">Problemi:</h5>
          
          {stats.errors?.length > 0 && (
            <div className="mb-2">
              <div className="text-xs text-red-600 font-medium mb-1">
                Greške ({stats.errors.length}):
              </div>
              <div className="space-y-1">
                {stats.errors.slice(0, 2).map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    {error}
                  </div>
                ))}
                {stats.errors.length > 2 && (
                  <div className="text-xs text-red-500">
                    +{stats.errors.length - 2} više...
                  </div>
                )}
              </div>
            </div>
          )}
          
          {stats.warnings?.length > 0 && (
            <div>
              <div className="text-xs text-yellow-600 font-medium mb-1">
                Upozorenja ({stats.warnings.length}):
              </div>
              <div className="space-y-1">
                {stats.warnings.slice(0, 2).map((warning, index) => (
                  <div key={index} className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    {warning}
                  </div>
                ))}
                {stats.warnings.length > 2 && (
                  <div className="text-xs text-yellow-500">
                    +{stats.warnings.length - 2} više...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Type Indicator */}
      {document.analysis.documentType && (
        <div className="pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Tip dokumenta:</div>
          <div className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
            {document.analysis.documentType.toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}