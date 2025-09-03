import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Receipt, TrendingDown, CreditCard, FileText } from 'lucide-react';

const AccountingLegend = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const legendItems = [
    {
      icon: Receipt,
      emoji: '📄',
      label: 'Računi',
      description: 'Računi izdani kupcima ili primljeni od dobavljača',
      statuses: ['neplaćeno', 'plaćeno', 'dospjelo', 'u tijeku']
    },
    {
      icon: TrendingDown,
      emoji: '💸',
      label: 'Troškovi',
      description: 'Operativni troškovi, materijali, plaće i ostali izdaci',
      statuses: ['neplaćeno', 'plaćeno', 'dospjelo']
    },
    {
      icon: CreditCard,
      emoji: '💳',
      label: 'Uplate',
      description: 'Primljene uplate od kupaca ili izvršene uplate dobavljačima',
      statuses: ['obrađeno', 'u tijeku']
    },
    {
      icon: FileText,
      emoji: '📊',
      label: 'Izvještaji',
      description: 'Financijski izvještaji, analize i pregledi',
      statuses: ['završeno', 'u tijeku']
    }
  ];

  const statusColors = {
    'plaćeno': 'bg-green-100 text-green-800',
    'neplaćeno': 'bg-gray-100 text-gray-800',
    'dospjelo': 'bg-red-100 text-red-800',
    'u tijeku': 'bg-yellow-100 text-yellow-800',
    'obrađeno': 'bg-blue-100 text-blue-800',
    'završeno': 'bg-purple-100 text-purple-800'
  };

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Legenda tipova</span>
            <div className="flex items-center gap-1">
              <span>📄</span>
              <span>💸</span>
              <span>💳</span>
              <span>📊</span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="p-4 space-y-4 max-w-md">
              <div className="text-xs text-gray-600 mb-3">
                Tipovi financijskih dokumenata u sustavu:
              </div>

              {legendItems.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.emoji}</span>
                    <item.icon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900 text-sm">
                      {item.label}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 ml-8 mb-2">
                    {item.description}
                  </div>

                  <div className="flex flex-wrap gap-1 ml-8">
                    {item.statuses.map(status => (
                      <span
                        key={status}
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
                      >
                        {status}
                      </span>
                    ))}
                  </div>

                  {index < legendItems.length - 1 && (
                    <div className="border-b border-gray-200 pt-2"></div>
                  )}
                </div>
              ))}

              {/* Additional Info */}
              <div className="border-t border-gray-300 pt-3 mt-4">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>💰 <strong>Iznosi:</strong> Zeleno = prihod, Crveno = rashod</div>
                  <div>📅 <strong>Datumi:</strong> Crveno = prekoračen rok</div>
                  <div>🔗 <strong>Linkovi:</strong> Povezano s projektima</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountingLegend;