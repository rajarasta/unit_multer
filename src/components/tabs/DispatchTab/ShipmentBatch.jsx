import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Minus, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Truck,
  FileText,
  Package
} from 'lucide-react';

const ShipmentBatch = ({ 
  items = [], 
  onUpdateItems, 
  onClose, 
  onConfirm, 
  project 
}) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const updateItemQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }
    
    onUpdateItems(items.map(item => 
      item.id === itemId 
        ? { ...item, quantity: newQuantity, status: getItemStatus(item.position, newQuantity) }
        : item
    ));
  };

  const removeItem = (itemId) => {
    onUpdateItems(items.filter(item => item.id !== itemId));
  };

  const getItemStatus = (position, quantity) => {
    const plannedQty = position.qty || position.pieces?.length || 0;
    if (quantity === plannedQty) return 'exact';
    if (quantity < plannedQty) return 'partial';
    if (quantity > plannedQty) return 'excess';
    return 'ready';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'exact':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'partial':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'excess':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exact':
        return <CheckCircle className="w-4 h-4" />;
      case 'partial':
      case 'excess':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const hasWarnings = () => {
    return items.some(item => ['partial', 'excess'].includes(item.status));
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-80 bg-white border-l shadow-lg flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Šarža za otpremu</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {project?.name} • {getTotalItems()} komada
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence>
          {items.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Šarža je prazna</p>
              <p className="text-sm">Kliknite + na karticama za dodavanje</p>
            </div>
          ) : (
            items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="border-b p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {item.position.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                      {item.position.description || 'Nema opisa'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors ml-2"
                    title="Ukloni iz šarže"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-medium min-w-[2rem] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-gray-500 ml-2">
                    od {item.plannedQty}
                  </span>
                </div>

                {/* Status Badge */}
                <div className={`
                  inline-flex items-center gap-1 px-2 py-1 rounded text-xs
                  ${getStatusColor(item.status)}
                `}>
                  {getStatusIcon(item.status)}
                  <span className="font-medium">
                    {item.status === 'exact' && 'Točno'}
                    {item.status === 'partial' && 'Djelomično'}
                    {item.status === 'excess' && 'Više od planiranog'}
                    {item.status === 'ready' && 'Spremno'}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      {items.length > 0 && (
        <div className="border-t bg-gray-50 p-4">
          {hasWarnings() && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-medium">Upozorenje</span>
              </div>
              <p className="mt-1">
                Količine se razlikuju od planiranih. Provjerite prije potvrde.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={isConfirming}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                  Potvrđujem...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Potvrdi otpremu
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors text-sm"
            >
              Zatvori
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ShipmentBatch;