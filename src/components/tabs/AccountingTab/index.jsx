import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, Search, Filter, Plus, Download, RefreshCw, Grid3X3, List, Clock } from 'lucide-react';
import { demoAccounting } from './DemoAccounting';
import AccountingCard from './AccountingCard';
import AccountingListCard from './AccountingListCard';
import AccountingTimelineCard from './AccountingTimelineCard';
import AccountingModal from './AccountingModal';
import AccountingBatch from './AccountingBatch';
import AccountingLegend from './AccountingLegend';

const AccountingTab = () => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [batchItems, setBatchItems] = useState([]);
  const [showBatch, setShowBatch] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list' | 'timeline'

  useEffect(() => {
    setRecords(demoAccounting);
  }, []);

  useEffect(() => {
    setShowBatch(batchItems.length > 0);
  }, [batchItems]);

  const filteredRecords = records.filter(r => {
    const matchesSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || r.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleAddToBatch = useCallback((record) => {
    if (!batchItems.find(item => item.id === record.id)) {
      setBatchItems(prev => [...prev, record]);
    }
  }, [batchItems]);

  const getTotalAmount = () => {
    return filteredRecords.reduce((total, record) => total + record.amount, 0);
  };

  const getStatusCounts = () => {
    const counts = {
      all: filteredRecords.length,
      'plaćeno': filteredRecords.filter(r => r.status === 'plaćeno').length,
      'neplaćeno': filteredRecords.filter(r => r.status === 'neplaćeno').length,
      'dospjelo': filteredRecords.filter(r => r.status === 'dospjelo').length,
      'u tijeku': filteredRecords.filter(r => r.status === 'u tijeku').length,
      'obrađeno': filteredRecords.filter(r => r.status === 'obrađeno').length
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  const refreshData = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRecords([...demoAccounting]);
    setLoading(false);
  };

  // Timeline helper functions
  const sortRecordsChronologically = (records) => {
    return [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const groupRecordsByDate = (records) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const groups = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };

    records.forEach(record => {
      const recordDate = new Date(record.date);
      const recordDateString = recordDate.toDateString();
      
      if (recordDateString === today.toDateString()) {
        groups.today.push(record);
      } else if (recordDateString === yesterday.toDateString()) {
        groups.yesterday.push(record);
      } else if (recordDate >= thisWeekStart && recordDate < today) {
        groups.thisWeek.push(record);
      } else if (recordDate >= thisMonthStart && recordDate < thisWeekStart) {
        groups.thisMonth.push(record);
      } else {
        groups.older.push(record);
      }
    });

    return groups;
  };

  const getGroupLabel = (groupKey) => {
    switch (groupKey) {
      case 'today': return 'Danas';
      case 'yesterday': return 'Jučer';
      case 'thisWeek': return 'Ovaj tjedan';
      case 'thisMonth': return 'Ovaj mjesec';
      case 'older': return 'Starije';
      default: return '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Wallet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Accounting</h1>
              <p className="text-sm text-gray-500">
                Upravljanje financijskim dokumentima i transakcijama
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">Ukupno</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Intl.NumberFormat('hr-HR', {
                  style: 'currency',
                  currency: 'EUR'
                }).format(getTotalAmount())}
              </div>
            </div>
            
            <div className="border-l border-gray-200 pl-3 flex items-center gap-2">
              <button
                onClick={refreshData}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                title="Osvježi podatke"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Izvezi podatke">
                <Download className="w-5 h-5" />
              </button>
              
              <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                Novi dokument
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Traži račun, trošak ili uplatu..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 text-sm transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-500 hover:text-gray-700'
                }`}
                title="Prikaz liste"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 text-sm transition-colors ${
                  viewMode === 'timeline' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-500 hover:text-gray-700'
                }`}
                title="Kronološki prikaz"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 text-sm transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-500 hover:text-gray-700'
                }`}
                title="Prikaz mreže"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Sve stavke ({statusCounts.all})</option>
                <option value="plaćeno">✅ Plaćeno ({statusCounts.plaćeno})</option>
                <option value="neplaćeno">❌ Neplaćeno ({statusCounts.neplaćeno})</option>
                <option value="dospjelo">🔴 Dospjelo ({statusCounts.dospjelo})</option>
                <option value="u tijeku">🟡 U tijeku ({statusCounts['u tijeku']})</option>
                <option value="obrađeno">✅ Obrađeno ({statusCounts.obrađeno})</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">📄 Računi:</span>
              <span className="font-medium">{filteredRecords.filter(r => r.type === 'invoice').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">💸 Troškovi:</span>
              <span className="font-medium">{filteredRecords.filter(r => r.type === 'expense').length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">💳 Uplate:</span>
              <span className="font-medium">{filteredRecords.filter(r => r.type === 'payment').length}</span>
            </div>
          </div>
          
          {batchItems.length > 0 && (
            <div className="flex items-center gap-2 text-blue-600">
              <span>Odabrano: {batchItems.length}</span>
              <button
                onClick={() => setBatchItems([])}
                className="text-xs hover:underline"
              >
                Očisti sve
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Records Grid */}
      <div className={`flex-1 overflow-y-auto p-6 ${showBatch ? 'mr-96' : ''} transition-all duration-300`}>
        {filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search || filter !== 'all' ? 'Nema rezultata' : 'Nema financijskih dokumenata'}
            </h3>
            <p className="text-gray-500 mb-6">
              {search || filter !== 'all' 
                ? 'Pokušajte s drugim pojmovima pretraživanja'
                : 'Počnite dodavanjem novog računa ili troška'
              }
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Dodaj novi dokument
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3">
            {filteredRecords.map(record => (
              <AccountingListCard
                key={record.id}
                record={record}
                onSelect={() => setSelectedRecord(record)}
                onAddToBatch={() => handleAddToBatch(record)}
              />
            ))}
          </div>
        ) : viewMode === 'timeline' ? (
          <div className="max-w-5xl mx-auto relative">
            {(() => {
              const sortedRecords = sortRecordsChronologically(filteredRecords);
              let previousDate = null;
              const today = new Date().toDateString();
              
              return sortedRecords.map((record, index) => {
                const recordDate = new Date(record.date).toDateString();
                const showDateMarker = recordDate !== previousDate;
                const isToday = recordDate === today;
                
                previousDate = recordDate;
                
                return (
                  <AccountingTimelineCard
                    key={record.id}
                    record={record}
                    onSelect={() => setSelectedRecord(record)}
                    onAddToBatch={() => handleAddToBatch(record)}
                    isFirst={index === 0}
                    showDateMarker={showDateMarker}
                    isToday={isToday}
                  />
                );
              });
            })()}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRecords.map(record => (
              <AccountingCard
                key={record.id}
                record={record}
                onSelect={() => setSelectedRecord(record)}
                onAddToBatch={() => handleAddToBatch(record)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Batch */}
      {showBatch && (
        <AccountingBatch
          items={batchItems}
          onUpdateItems={setBatchItems}
          onClose={() => setShowBatch(false)}
        />
      )}

      {/* Modal Details */}
      {selectedRecord && (
        <AccountingModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      {/* Legend */}
      <AccountingLegend />
    </div>
  );
};

export default AccountingTab;