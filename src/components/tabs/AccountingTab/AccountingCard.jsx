import React from 'react';
import { Plus, Calendar, FileText, ExternalLink } from 'lucide-react';
import { getAccountingIcon, getStatusColor, getAmountColor, getAccountingIconEmoji } from './AccountingIcons';

const AccountingCard = ({ record, onSelect, onAddToBatch }) => {
  const IconComponent = getAccountingIcon(record.type);
  
  const formatAmount = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('hr-HR');
  };

  const isOverdue = (status, dueDate) => {
    if (status === 'plaćeno' || status === 'obrađeno') return false;
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const overdue = isOverdue(record.status, record.dueDate);
  const daysOverdue = getDaysOverdue(record.dueDate);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors">
              <IconComponent className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm">
                {record.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {formatDate(record.date)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToBatch();
              }}
              className="p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Dodaj u batch"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-3">
          <div className={`text-lg font-semibold ${getAmountColor(record.type)}`}>
            {formatAmount(record.amount, record.currency)}
          </div>
        </div>

        {/* Status and Due Date */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
            {record.status}
          </span>
          
          {record.dueDate && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {overdue ? (
                  <span className="text-red-600 font-medium">
                    {daysOverdue}d kasni
                  </span>
                ) : (
                  formatDate(record.dueDate)
                )}
              </span>
            </div>
          )}
        </div>

        {/* Documents */}
        {record.documents && record.documents.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
            <FileText className="w-3 h-3" />
            <span>{record.documents.length} dokument{record.documents.length === 1 ? '' : 'a'}</span>
          </div>
        )}

        {/* Related Project */}
        {record.relatedProjectId && (
          <div className="text-xs text-blue-600 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <span>Projekt {record.relatedProjectId}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100">
        <button
          onClick={onSelect}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
        >
          Prikaži detalje →
        </button>
      </div>
    </div>
  );
};

export default AccountingCard;