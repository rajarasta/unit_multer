import React from 'react';
import { Clock, Calendar, ExternalLink, Plus } from 'lucide-react';
import { getAccountingIcon, getStatusColor, getAmountColor } from './AccountingIcons';
import DocumentThumbnail from './DocumentThumbnail';
import TimelineDateMarker from './TimelineDateMarker';

const AccountingTimelineCard = ({ record, onSelect, onAddToBatch, isFirst = false, showDateSeparator = false, dateLabel = '', showDateMarker = false, isToday = false }) => {
  const IconComponent = getAccountingIcon(record.type);
  
  const formatAmount = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nije određeno';
    return new Date(dateString).toLocaleDateString('hr-HR');
  };

  const getTimelineColor = (type, status) => {
    if (status === 'plaćeno' || status === 'obrađeno') {
      return 'bg-green-500 border-green-300';
    }
    if (status === 'dospjelo') {
      return 'bg-red-500 border-red-300';
    }
    if (status === 'u tijeku') {
      return 'bg-yellow-500 border-yellow-300';
    }
    
    // Color by type as fallback
    switch (type) {
      case 'invoice':
        return 'bg-blue-500 border-blue-300';
      case 'expense':
        return 'bg-orange-500 border-orange-300';
      case 'payment':
        return 'bg-emerald-500 border-emerald-300';
      default:
        return 'bg-gray-500 border-gray-300';
    }
  };

  const getEventLabel = (type, status) => {
    if (type === 'invoice') {
      return status === 'plaćeno' ? 'Račun plaćen' : 'Račun izdan';
    }
    if (type === 'expense') {
      return status === 'plaćeno' ? 'Trošak plaćen' : 'Trošak evidentiran';
    }
    if (type === 'payment') {
      return 'Uplata obrađena';
    }
    return 'Financijska transakcija';
  };

  return (
    <div className="relative">
      {/* Date Separator */}
      {showDateSeparator && (
        <div className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4 py-2 mb-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            <span>{dateLabel}</span>
          </div>
        </div>
      )}

      {/* Timeline Item */}
      <div className="relative flex items-start gap-4 pb-6">
        {/* Date Marker (shows exact date for each event) */}
        {showDateMarker && (
          <TimelineDateMarker 
            date={record.date}
            isToday={isToday}
          />
        )}

        {/* Timeline Line & Dot */}
        <div className="relative flex flex-col items-center ml-32">
          {/* Connecting Line (not for first item) */}
          {!isFirst && (
            <div className="absolute -top-6 w-0.5 h-6 bg-gray-300"></div>
          )}
          
          {/* Timeline Dot */}
          <div className={`relative z-10 w-5 h-5 rounded-full border-2 ${getTimelineColor(record.type, record.status)} flex-shrink-0 shadow-sm`}>
            <div className="absolute -inset-1 rounded-full bg-current opacity-20 animate-pulse"></div>
          </div>
          
          {/* Continuing Line */}
          <div className="w-0.5 h-full bg-gray-300 flex-grow"></div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Type Icon */}
                <div className="p-1.5 rounded-md bg-gray-50 group-hover:bg-blue-50 transition-colors">
                  <IconComponent className="w-4 h-4 text-gray-600" />
                </div>
                
                {/* Title and Event Label */}
                <div>
                  <h3 className="font-medium text-gray-900 text-sm leading-tight">
                    {record.title}
                  </h3>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {getEventLabel(record.type, record.status)}
                  </div>
                </div>
              </div>

              {/* Time */}
              <div className="text-right text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(record.date)}</span>
              </div>
            </div>

            {/* Main Content Row */}
            <div className="flex items-center gap-4">
              {/* Document Thumbnails */}
              <div className="flex-shrink-0">
                {record.documents && record.documents.length > 0 ? (
                  <div className="flex items-center gap-1">
                    {record.documents.slice(0, 2).map((doc, index) => (
                      <DocumentThumbnail 
                        key={index}
                        type={doc.type} 
                        name={doc.name}
                        size="sm"
                      />
                    ))}
                    {record.documents.length > 2 && (
                      <div className="w-6 h-8 rounded border border-gray-300 bg-gray-50 flex items-center justify-center text-xs font-medium text-gray-600">
                        +{record.documents.length - 2}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-6 h-8 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                    <div className="w-3 h-3 bg-gray-300 rounded opacity-30"></div>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 text-sm">
                  {/* Status */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                  
                  {/* Project Link */}
                  {record.relatedProjectId && (
                    <div className="flex items-center gap-1 text-blue-600 text-xs">
                      <ExternalLink className="w-3 h-3" />
                      <span>{record.relatedProjectId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className={`text-right font-semibold ${getAmountColor(record.type)}`}>
                {formatAmount(record.amount, record.currency)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToBatch();
                  }}
                  className="p-1 rounded hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Dodaj u batch"
                >
                  <Plus className="w-3 h-3 text-gray-400" />
                </button>
                
                <button
                  onClick={onSelect}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium px-2 py-1 rounded hover:bg-blue-50"
                >
                  Detalji
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingTimelineCard;