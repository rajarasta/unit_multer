import React from 'react';
import { Plus, Calendar, ExternalLink, ChevronRight } from 'lucide-react';
import { getAccountingIcon, getStatusColor, getAmountColor } from './AccountingIcons';
import DocumentThumbnail from './DocumentThumbnail';

const AccountingListCard = ({ record, onSelect, onAddToBatch }) => {
  const IconComponent = getAccountingIcon(record.type);
  
  const formatAmount = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nije određeno';
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
    <div className="bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 group">
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Type Icon */}
          <div className="flex-shrink-0">
            <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors">
              <IconComponent className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          {/* Document Thumbnails */}
          <div className="flex-shrink-0">
            {record.documents && record.documents.length > 0 ? (
              <div className="flex items-center gap-1">
                {record.documents.slice(0, 3).map((doc, index) => (
                  <DocumentThumbnail 
                    key={index}
                    type={doc.type} 
                    name={doc.name}
                    size="sm"
                  />
                ))}
                {record.documents.length > 3 && (
                  <div className="w-8 h-10 rounded border-2 border-gray-300 bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                    +{record.documents.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <div className="w-8 h-10 rounded border-2 border-gray-200 bg-gray-50 flex items-center justify-center">
                <div className="w-4 h-4 bg-gray-300 rounded opacity-50"></div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="font-medium text-gray-900 truncate mb-1">
                  {record.title}
                </h3>
                
                {/* Meta Info Row */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(record.date)}</span>
                  </div>
                  
                  {record.relatedProjectId && (
                    <div className="flex items-center gap-1 text-blue-600">
                      <ExternalLink className="w-3 h-3" />
                      <span className="text-xs">{record.relatedProjectId}</span>
                    </div>
                  )}

                  {record.documents && record.documents.length > 0 && (
                    <span className="text-xs">
                      {record.documents.length} dok.
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right ml-4">
                <div className={`text-lg font-semibold ${getAmountColor(record.type)}`}>
                  {formatAmount(record.amount, record.currency)}
                </div>
              </div>
            </div>
          </div>

          {/* Status & Due Date */}
          <div className="flex-shrink-0 text-right">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                {record.status}
              </span>
            </div>
            
            {record.dueDate && (
              <div className="text-xs text-gray-500">
                {overdue ? (
                  <span className="text-red-600 font-medium">
                    {daysOverdue}d kasni
                  </span>
                ) : (
                  <>Dospjeva: {formatDate(record.dueDate)}</>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex items-center gap-2">
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
            
            <button
              onClick={onSelect}
              className="p-1 rounded hover:bg-blue-100 transition-colors text-gray-400 hover:text-blue-600"
              title="Prikaži detalje"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingListCard;