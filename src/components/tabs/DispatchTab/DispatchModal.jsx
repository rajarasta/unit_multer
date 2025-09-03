import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Package, 
  Plus, 
  Minus,
  FileText,
  Image,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const DispatchModal = ({ 
  position, 
  onClose, 
  onAddToBatch, 
  project 
}) => {
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('details');

  if (!position) return null;

  const pieces = position.pieces || [];
  const documents = position.documents || [];
  const agbimEntries = position.agbimEntries || [];
  const maxQuantity = position.qty || pieces.length || 1;

  const handleAddToBatch = () => {
    onAddToBatch(position, selectedQuantity);
    onClose();
  };

  const renderDetailsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label className="font-medium text-gray-700">Naziv pozicije</label>
          <p className="text-gray-900 mt-1">{position.title}</p>
        </div>
        <div>
          <label className="font-medium text-gray-700">Status</label>
          <p className="text-gray-900 mt-1">{position.status || 'Nepoznato'}</p>
        </div>
        <div>
          <label className="font-medium text-gray-700">Planirana količina</label>
          <p className="text-gray-900 mt-1">{maxQuantity} kom</p>
        </div>
        <div>
          <label className="font-medium text-gray-700">Dostupno komada</label>
          <p className="text-gray-900 mt-1">{pieces.length} kom</p>
        </div>
      </div>
      
      {position.description && (
        <div>
          <label className="font-medium text-gray-700">Opis</label>
          <p className="text-gray-600 mt-1 text-sm leading-relaxed">
            {position.description}
          </p>
        </div>
      )}

      {position.descriptions?.detailed && (
        <div>
          <label className="font-medium text-gray-700">Detaljni opis</label>
          <p className="text-gray-600 mt-1 text-sm leading-relaxed">
            {position.descriptions.detailed}
          </p>
        </div>
      )}
    </div>
  );

  const renderPiecesTab = () => (
    <div className="space-y-3">
      {pieces.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Nema definiranih komada</p>
        </div>
      ) : (
        pieces.map((piece, index) => (
          <div key={piece.id || index} className="border rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-sm">
                  Komad #{index + 1} {piece.name && `- ${piece.name}`}
                </h4>
                {piece.dimensions && (
                  <p className="text-xs text-gray-600 mt-1">
                    Dimenzije: {piece.dimensions}
                  </p>
                )}
                {piece.material && (
                  <p className="text-xs text-gray-600">
                    Materijal: {piece.material}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {piece.status === 'completed' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : piece.status === 'problem' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <Package className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderDocumentsTab = () => (
    <div className="space-y-3">
      {documents.length === 0 && agbimEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>Nema dokumenata</p>
        </div>
      ) : (
        <>
          {documents.map((doc, index) => (
            <div key={index} className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-sm">{doc.name || `Dokument ${index + 1}`}</h4>
                  <p className="text-xs text-gray-600">{doc.type || 'Nepoznat tip'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-1 hover:bg-white rounded transition-colors" title="Pregled">
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
                <button className="p-1 hover:bg-white rounded transition-colors" title="Preuzmi">
                  <Download className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          ))}

          {agbimEntries.map((entry, index) => (
            entry.attachments?.map((attachment, attIndex) => (
              <div key={`agbim-${index}-${attIndex}`} className="border rounded-lg p-3 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image className="w-5 h-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-sm">
                      {attachment.filename || `AGBIM ${index + 1}-${attIndex + 1}`}
                    </h4>
                    <p className="text-xs text-gray-600">AGBIM prilog</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-1 hover:bg-white rounded transition-colors" title="Pregled">
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))
          ))}
        </>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {position.title}
              </h2>
              <p className="text-sm text-gray-600">
                {project?.name} • Pozicija ID: {position.id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex px-6">
            {[
              { id: 'details', label: 'Detalji', icon: Package },
              { id: 'pieces', label: 'Komadi', icon: Package },
              { id: 'documents', label: 'Dokumenti', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'pieces' && renderPiecesTab()}
          {activeTab === 'documents' && renderDocumentsTab()}
        </div>

        {/* Modal Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">
                Količina za otpremu:
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={maxQuantity}
                  value={selectedQuantity}
                  onChange={(e) => setSelectedQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center border rounded px-2 py-1 text-sm"
                />
                <button
                  onClick={() => setSelectedQuantity(Math.min(maxQuantity, selectedQuantity + 1))}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">od {maxQuantity}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Zatvori
              </button>
              <button
                onClick={handleAddToBatch}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Dodaj u šaržu
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DispatchModal;