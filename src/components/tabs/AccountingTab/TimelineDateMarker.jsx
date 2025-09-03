import React from 'react';
import { Calendar } from 'lucide-react';

const TimelineDateMarker = ({ date, isToday = false, position = 'left' }) => {
  const formatDateFull = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateShort = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Danas';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Jučer';
    }
    
    return formatDateFull(dateString);
  };

  return (
    <div className="absolute left-0 flex items-center">
      {/* Date Label */}
      <div className={`
        bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm
        ${isToday ? 'border-blue-500 bg-blue-50' : ''}
        -ml-2 z-20 min-w-[120px]
      `}>
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${isToday ? 'text-blue-600' : 'text-gray-500'}`} />
          <div>
            <div className={`text-sm font-medium ${isToday ? 'text-blue-900' : 'text-gray-900'}`}>
              {getDateLabel(date)}
            </div>
            <div className={`text-xs ${isToday ? 'text-blue-600' : 'text-gray-500'}`}>
              {formatDateShort(date)}
            </div>
          </div>
        </div>
        
        {/* Arrow pointing to timeline */}
        <div className={`
          absolute right-0 top-1/2 transform translate-x-full -translate-y-1/2
          w-0 h-0 border-l-[8px] border-t-[8px] border-b-[8px]
          border-t-transparent border-b-transparent
          ${isToday ? 'border-l-blue-200' : 'border-l-gray-200'}
        `}></div>
      </div>
    </div>
  );
};

export default TimelineDateMarker;