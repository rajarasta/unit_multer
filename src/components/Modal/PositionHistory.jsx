// components/Modals/PositionHistory.jsx
import React, { useMemo } from 'react';
import { X, History } from 'lucide-react';
import { EVENT_TYPES } from '../../constants/statuses';
import { croatianDateTime } from '../../utils/dateUtils';

export function PositionHistory({ position, history, onClose }) {
  const positionHistory = useMemo(() => {
    return history
      .filter(event => event.opis?.includes(position))
      .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
  }, [history, position]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Povijest pozicije: {position}</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {positionHistory.length} događaja
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {positionHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nema povijesti za ovu poziciju</p>
            </div>
          ) : (
            <div className="space-y-3">
              {positionHistory.map((event, idx) => {
                const eventType = EVENT_TYPES[event.type] || EVENT_TYPES['ručno'];
                return (
                  <div key={event.id || idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-3 h-3 rounded-full border-2 border-white z-10"
                        style={{ backgroundColor: eventType.bg }}
                      />
                      {idx < positionHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 -mt-1" />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: eventType.bg }}
                              >
                                {eventType.text}
                              </span>
                              <span className="text-xs text-slate-500">
                                {croatianDateTime(event.timestamp || event.date)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-700">
                              {event.naslov}
                            </p>
                            {event.opis && (
                              <p className="text-xs text-slate-600 mt-1">{event.opis}</p>
                            )}
                            {event.author && (
                              <p className="text-xs text-slate-400 mt-2">
                                Od: {event.author}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
