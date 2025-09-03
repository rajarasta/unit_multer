import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Plus, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Image,
  FileText
} from 'lucide-react';
import { getShapeIcon } from './AluminumShapes';

const PositionCard = ({ 
  position, 
  index, 
  onAddToBatch, 
  onViewDetails, 
  getStatusColor 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const cardRef = useRef(null);

  const handleAddToBatch = () => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    onAddToBatch(position, 1);
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    onViewDetails(position);
  };

  const getStatusIcon = () => {
    switch (position.status) {
      case 'završeno':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'problem':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'u_radu':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const hasDocuments = position.documents && position.documents.length > 0;
  const hasImages = position.agbimEntries && position.agbimEntries.some(entry => 
    entry.attachments && entry.attachments.length > 0
  );

  const ShapeIcon = getShapeIcon(position.title, position.type);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`
        bg-white rounded-lg border shadow-sm cursor-pointer
        transition-all duration-200 hover:shadow-md
        ${isPressed ? 'scale-95' : isHovered ? 'scale-[1.02]' : 'scale-100'}
        ${isHovered ? 'border-blue-300' : 'border-gray-200'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleAddToBatch}
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        {/* Visual Shape Preview */}
        <div className="flex items-center justify-center mb-3 p-2 bg-gray-50 rounded-lg">
          <ShapeIcon size={48} className="text-blue-600" />
        </div>
        
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon()}
            <h3 className="font-medium text-gray-900 truncate">
              {position.title || 'Nepoznato'}
            </h3>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleViewDetails}
            className="p-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors shrink-0 ml-2"
            title="Dodatne informacije"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {position.description || position.descriptions?.short || 'Nema opisa'}
        </p>

        {/* Status Badge */}
        <div className={`
          inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
          ${getStatusColor(position.status)}
        `}>
          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
          {position.status || 'Nepoznato'}
        </div>
      </div>

      {/* Card Footer - Metrics */}
      <div className="px-4 py-3 border-t bg-gray-50/50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span>Kol: {position.qty || position.pieces?.length || '0'}</span>
            {hasDocuments && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>{position.documents.length}</span>
              </div>
            )}
            {hasImages && (
              <div className="flex items-center gap-1">
                <Image className="w-3 h-3" />
                <span>Slike</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <span className="text-xs font-medium">Klik → Šarža</span>
          </div>
        </div>
      </div>

      {/* Hover overlay for enhanced feedback */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 rounded-lg ring-2 ring-green-200 pointer-events-none"
        />
      )}
      
      {/* Add to batch indicator */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute top-2 left-2 px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium pointer-events-none"
        >
          + Dodaj u šaržu
        </motion.div>
      )}
    </motion.div>
  );
};

export default PositionCard;