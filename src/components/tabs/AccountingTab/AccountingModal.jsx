import React, { useState } from 'react';
import { X, Calendar, FileText, ExternalLink, Download, Eye } from 'lucide-react';
import { getAccountingIcon, getStatusColor, getAmountColor } from './AccountingIcons';

const AccountingModal = ({ record, onClose }) => {
  const [activeTab, setActiveTab] = useState('details');
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

  const getDocumentIcon = (type) => {
    const icons = {
      PDF: '📄',
      XLSX: '📊',
      DOCX: '📝',
      default: '📁'
    };
    return icons[type] || icons.default;
  };

  const tabs = [
    { id: 'details', label: '📑 Detalji računa/troška' },
    { id: 'documents', label: '📂 Dokumenti' },
    { id: 'project', label: '🔗 Povezan projekt' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white">
                <IconComponent className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {record.title}
                </h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatDate(record.date)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Amount and Currency */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold mb-1 ${getAmountColor(record.type)}`}>
                    {formatAmount(record.amount, record.currency)}
                  </div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">
                    {record.type === 'invoice' ? 'Račun' : record.type === 'expense' ? 'Trošak' : 'Uplata'}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Datum izdavanja
                    </label>
                    <div className="flex items-center gap-2 text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(record.date)}
                    </div>
                  </div>

                  {record.dueDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Datum dospijeća
                      </label>
                      <div className="flex items-center gap-2 text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(record.dueDate)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valuta
                    </label>
                    <div className="text-gray-900 font-mono">
                      {record.currency}
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Dodatne informacije
                </h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">
                    <p>ID dokumenta: <span className="font-mono text-gray-900">{record.id}</span></p>
                    <p>Tip transakcije: <span className="capitalize text-gray-900">{record.type}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Povezani dokumenti ({record.documents?.length || 0})
              </h3>
              
              {record.documents && record.documents.length > 0 ? (
                <div className="space-y-3">
                  {record.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getDocumentIcon(doc.type)}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {doc.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {doc.type} dokument
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nema povezanih dokumenata</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'project' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Povezani projekt
              </h3>
              
              {record.relatedProjectId ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        Projekt {record.relatedProjectId}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Financijska stavka je povezana s ovim projektom
                      </div>
                    </div>
                    <button className="flex items-center gap-2 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors">
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm">Otvori projekt</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ExternalLink className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nema povezanog projekta</p>
                  <p className="text-sm mt-1">
                    Ova stavka nije povezana ni s jednim projektom
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountingModal;