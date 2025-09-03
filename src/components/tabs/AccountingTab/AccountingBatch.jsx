import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Trash2, FileText, CreditCard } from 'lucide-react';
import { getAccountingIcon, getStatusColor, getAmountColor } from './AccountingIcons';

const AccountingBatch = ({ items, onUpdateItems, onClose }) => {
  const [processing, setProcessing] = useState(false);
  const [selectedAction, setSelectedAction] = useState('confirm');

  const formatAmount = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getTotalAmount = () => {
    return items.reduce((total, item) => total + item.amount, 0);
  };

  const getActionsByType = () => {
    const invoices = items.filter(item => item.type === 'invoice').length;
    const expenses = items.filter(item => item.type === 'expense').length;
    const payments = items.filter(item => item.type === 'payment').length;

    return { invoices, expenses, payments };
  };

  const removeItem = (itemId) => {
    onUpdateItems(items.filter(item => item.id !== itemId));
  };

  const processItems = async () => {
    setProcessing(true);
    
    // Simulacija API poziva za batch operaciju
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Ovdje bi bila logika za obradu batch stavki
    console.log(`Processing ${items.length} items with action: ${selectedAction}`);
    
    setProcessing(false);
    onUpdateItems([]); // Očisti batch nakon obrade
  };

  const { invoices, expenses, payments } = getActionsByType();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl border-l border-gray-200 z-40 flex flex-col">
      {/* Header */}
      <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">
              Batch obrada
            </h3>
            <p className="text-sm text-blue-600">
              {items.length} stavk{items.length === 1 ? 'a' : items.length < 5 ? 'e' : 'i'} odabrano
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 border-b border-gray-200">
        <div className="space-y-2 text-sm">
          {invoices > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">📄 Računi:</span>
              <span className="font-medium">{invoices}</span>
            </div>
          )}
          {expenses > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">💸 Troškovi:</span>
              <span className="font-medium">{expenses}</span>
            </div>
          )}
          {payments > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">💳 Uplate:</span>
              <span className="font-medium">{payments}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-2 flex items-center justify-between font-semibold">
            <span>Ukupno:</span>
            <span className="text-lg">{formatAmount(getTotalAmount())}</span>
          </div>
        </div>
      </div>

      {/* Action Selection */}
      <div className="p-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Akcija:
        </label>
        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="confirm">✅ Potvrdi sve stavke</option>
          <option value="process">⚡ Obradi plaćanje</option>
          <option value="export">📊 Izvezi u Excel</option>
          <option value="archive">📁 Arhiviraj stavke</option>
          <option value="delete">🗑️ Obriši sve</option>
        </select>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {items.map(item => {
            const IconComponent = getAccountingIcon(item.type);
            return (
              <div
                key={item.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <IconComponent className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatAmount(item.amount, item.currency)}
                      </div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors ml-2"
                  >
                    <Trash2 className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          {/* Warning for certain actions */}
          {selectedAction === 'delete' && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Ova akcija je nepovratna!</span>
            </div>
          )}
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
              disabled={processing}
            >
              Odustani
            </button>
            <button
              onClick={processItems}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Obrađujem...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Izvrši
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingBatch;