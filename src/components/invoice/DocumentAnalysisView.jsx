import React from 'react';
import EditableField from './EditableField';
import { DOCUMENT_TYPES } from '../../constants/documentTypes';

/**
 * DocumentAnalysisView - Prikaz rezultata analize dokumenta
 * 
 * Prikazuje strukturirane podatke iz analize sa mogućnošću uređivanja
 * 
 * @param {Object} document - Dokument sa analizom
 * @param {boolean} editMode - Da li je omogućeno uređivanje
 * @param {Function} onFieldUpdate - Callback za update polja
 * @param {boolean} simple - Simple UI mode
 */
export default function DocumentAnalysisView({ 
  document, 
  editMode = false, 
  onFieldUpdate,
  simple = true 
}) {
  if (!document?.analysis) return null;
  
  const analysis = document.analysis;
  const currency = analysis.currency || 'EUR';

  const formatCurrency = (value, curr = currency) => {
    if (!value && value !== 0) return 'N/A';
    return `${Number(value).toFixed(2)} ${curr}`;
  };

  return (
    <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-6 space-y-6">
      {/* Document Type Selector (Simple Mode) */}
      {simple && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-3">Podaci dokumenta</h3>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              Tip dokumenta
            </label>
            <select
              value={analysis.documentType || 'invoice'}
              onChange={(e) => onFieldUpdate?.('documentType', e.target.value)}
              disabled={!editMode}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-100"
            >
              {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Basic Document Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EditableField 
          label="Broj dokumenta" 
          value={analysis.documentNumber} 
          fieldPath="documentNumber" 
          editMode={editMode} 
          onChange={onFieldUpdate} 
        />
        <EditableField 
          label="Datum" 
          value={analysis.date} 
          fieldPath="date" 
          editMode={editMode} 
          onChange={onFieldUpdate} 
          type="date" 
        />
        <EditableField 
          label="Datum dospijeća" 
          value={analysis.dueDate} 
          fieldPath="dueDate" 
          editMode={editMode} 
          onChange={onFieldUpdate} 
          type="date" 
        />
        <EditableField 
          label="Valuta" 
          value={analysis.currency} 
          fieldPath="currency" 
          editMode={editMode} 
          onChange={onFieldUpdate} 
        />
      </div>

      {/* Supplier & Buyer Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Supplier */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-200">
          <h4 className="font-semibold mb-3 text-blue-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Dobavljač
          </h4>
          <EditableField 
            label="Naziv" 
            value={analysis.supplier?.name} 
            fieldPath="supplier.name" 
            editMode={editMode} 
            onChange={onFieldUpdate} 
          />
          <EditableField 
            label="OIB" 
            value={analysis.supplier?.oib} 
            fieldPath="supplier.oib" 
            editMode={editMode} 
            onChange={onFieldUpdate} 
          />
          <EditableField 
            label="IBAN" 
            value={analysis.supplier?.iban} 
            fieldPath="supplier.iban" 
            editMode={editMode} 
            onChange={onFieldUpdate} 
          />
          <EditableField 
            label="Adresa" 
            value={analysis.supplier?.address} 
            fieldPath="supplier.address" 
            editMode={editMode} 
            onChange={onFieldUpdate} 
          />
        </div>

        {/* Buyer */}
        <div className="bg-green-50 p-4 rounded-lg space-y-3 border border-green-200">
          <h4 className="font-semibold mb-3 text-green-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            Kupac
          </h4>
          <EditableField 
            label="Naziv" 
            value={analysis.buyer?.name} 
            fieldPath="buyer.name" 
            editMode={editMode} 
            onChange={onFieldUpdate} 
          />
          <EditableField 
            label="OIB" 
            value={analysis.buyer?.oib} 
            fieldPath="buyer.oib" 
            editMode={editMode} 
            onChange={onFieldUpdate} 
          />
          <EditableField 
            label="Adresa" 
            value={analysis.buyer?.address} 
            fieldPath="buyer.address" 
            editMode={editMode} 
            onChange={onFieldUpdate} 
          />
        </div>
      </div>

      {/* Items Table */}
      {analysis.items && analysis.items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Stavke ({analysis.items.length})</h4>
            {editMode && (
              <button className="text-sm text-blue-600 hover:text-blue-700">
                + Dodaj stavku
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Šifra</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opis</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Količina</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jed.</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cijena</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Popust %</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ukupno</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysis.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      {item.position || idx + 1}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-gray-600">
                      {item.code || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={item.description}>
                        {item.description}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {item.quantity?.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {item.unit || 'kom'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-600">
                      {item.discountPercent?.toFixed(2) || '0.00'}%
                    </td>
                    <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals Section */}
      {analysis.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
          <div>
            {/* Placeholder for additional info */}
          </div>
          
          <div className="space-y-4">
            <EditableField
              label="Osnovica"
              value={analysis.totals.subtotal}
              fieldPath="totals.subtotal"
              editMode={editMode}
              onChange={onFieldUpdate}
              isNumeric={true}
            />
            <EditableField
              label="PDV"
              value={analysis.totals.vatAmount}
              fieldPath="totals.vatAmount"
              editMode={editMode}
              onChange={onFieldUpdate}
              isNumeric={true}
            />
            
            {/* Total Amount - Highlighted */}
            <div className="pt-2 border-t border-gray-300">
              <div className="flex justify-between items-center p-4 bg-blue-600 text-white rounded-lg shadow-md">
                <span className="font-bold text-lg">UKUPNO</span>
                <span className="font-bold text-2xl">
                  {formatCurrency(analysis.totals.totalAmount)}
                </span>
              </div>
              
              {editMode && (
                <div className="mt-3">
                  <input 
                    type="number"
                    step="0.01"
                    value={analysis.totals.totalAmount === null ? '' : String(analysis.totals.totalAmount)}
                    onChange={(e) => onFieldUpdate?.('totals.totalAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ručni unos ukupnog iznosa"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}