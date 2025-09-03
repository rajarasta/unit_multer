import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Grid3x3
} from 'lucide-react';

const FacadeCard = ({ 
  position, 
  index, 
  onAddToBatch, 
  onViewDetails, 
  getStatusColor 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedPieces, setSelectedPieces] = useState(new Set());
  const cardRef = useRef(null);

  // Generate 4x4 facade pieces with realistic building layout - STABLE DATA
  const generateFacadeLayout = useCallback(() => {
    const layout = [];
    
    // Define facade layout: doors bottom (row 3), windows rows 1-2, panels fill
    const facadePattern = [
      ['panel', 'panel', 'window', 'window'],      // Row 0 (top)
      ['panel', 'window', 'window', 'panel'],      // Row 1  
      ['window', 'panel', 'panel', 'window'],      // Row 2
      ['panel', 'door', 'door', 'panel']           // Row 3 (bottom)
    ];
    
    // Fixed statuses based on position for consistency
    const fixedStatuses = [
      'completed', 'in_progress', 'ready', 'completed',     // Row 0
      'ready', 'completed', 'problem', 'in_progress',       // Row 1
      'in_progress', 'ready', 'completed', 'ready',         // Row 2
      'completed', 'ready', 'ready', 'problem'              // Row 3
    ];
    
    // Fixed shipped status - some specific elements are shipped
    const shippedElements = [1, 5, 11]; // Element indexes that are shipped
    
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const index = row * 4 + col;
        const elementType = facadePattern[row][col];
        
        layout.push({
          id: `${position.id}_${elementType}_${row}_${col}`,
          row,
          col,
          index: index + 1,
          elementType,
          gridPosition: `R${row + 1}C${col + 1}`, // Backend tracking: R1C1, R1C2, etc.
          dimensions: getElementDimensions(elementType),
          material: getElementMaterial(elementType),
          status: fixedStatuses[index],
          shipped: shippedElements.includes(index),
          description: getElementDescription(elementType, row + 1, col + 1)
        });
      }
    }
    
    return layout;
  }, [position.id]); // Only regenerate if position ID changes

  const getElementDimensions = (type) => {
    switch (type) {
      case 'window': return '120x80cm';
      case 'door': return '90x210cm';  
      case 'panel': return '150x100cm';
      default: return '150x100cm';
    }
  };

  const getElementMaterial = (type) => {
    switch (type) {
      case 'window': return 'ALU profil + staklo';
      case 'door': return 'ALU + sigurnosni panel';
      case 'panel': return 'Kompozit ALU panel';
      default: return 'Kompozit ALU';
    }
  };

  const getElementDescription = (type, row, col) => {
    switch (type) {
      case 'window': return `Prozor ${row}.${col}`;
      case 'door': return `Vrata ${row}.${col}`;
      case 'panel': return `Panel ${row}.${col}`;
      default: return `Element ${row}.${col}`;
    }
  };

  const facadePieces = useMemo(() => generateFacadeLayout(), [generateFacadeLayout]);

  const handlePieceClick = (pieceIndex, e) => {
    e.stopPropagation();
    setSelectedPieces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pieceIndex)) {
        newSet.delete(pieceIndex);
      } else {
        newSet.add(pieceIndex);
      }
      return newSet;
    });
  };

  const handleAddSelectedToBatch = (e) => {
    e.stopPropagation();
    if (selectedPieces.size > 0) {
      // Add individual pieces to batch
      selectedPieces.forEach(pieceIndex => {
        const piece = facadePieces[pieceIndex];
        onAddToBatch({
          ...position,
          id: piece.id,
          title: `${position.title} - ${piece.description}`,
          qty: 1,
          pieceData: piece
        }, 1);
      });
      setSelectedPieces(new Set());
    }
  };

  const handleIndividualElementAdd = (piece, e) => {
    e.stopPropagation();
    if (!piece.shipped) {
      onAddToBatch({
        ...position,
        id: piece.id,
        title: `${position.title} - ${piece.description}`,
        qty: 1,
        pieceData: piece
      }, 1);
    }
  };

  const handleAddAllToBatch = () => {
    const availablePieces = facadePieces.filter(p => !p.shipped);
    availablePieces.forEach(piece => {
      onAddToBatch({
        ...position,
        id: piece.id,
        title: `${position.title} - Element ${piece.index}`,
        qty: 1,
        pieceData: piece
      }, 1);
    });
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    onViewDetails(position);
  };

  const getPieceColor = (piece) => {
    const pieceIndex = facadePieces.indexOf(piece);
    
    // Priority 1: Shipped elements (sivo)
    if (piece.shipped) {
      return 'bg-slate-300 border-slate-400 text-slate-600';
    }
    
    // Priority 2: Selected for shipment (elegantno plavo)
    if (selectedPieces.has(pieceIndex)) {
      return 'bg-sky-200 border-sky-400 text-sky-800 shadow-md ring-2 ring-sky-300';
    }
    
    // Priority 3: Production status (pastelne boje)
    switch (piece.status) {
      case 'completed': 
        return 'bg-emerald-100 border-emerald-300 text-emerald-700'; // Spremno za otpremu
      case 'in_progress': 
        return 'bg-amber-100 border-amber-300 text-amber-700'; // U proizvodnji  
      case 'ready': 
        return 'bg-teal-100 border-teal-300 text-teal-700'; // Gotovo
      case 'problem': 
        return 'bg-rose-100 border-rose-300 text-rose-700'; // Problem
      default: 
        return 'bg-gray-100 border-gray-300 text-gray-600'; // Nepoznato
    }
  };

  const renderElementIcon = (piece) => {
    const iconClass = "w-full h-full flex items-center justify-center text-xs font-medium";
    
    switch (piece.elementType) {
      case 'window':
        return (
          <div className={iconClass}>
            {/* Window icon with frame and cross */}
            <div className="relative w-8 h-6 border-2 border-current rounded-sm">
              <div className="absolute inset-1 border border-current"></div>
              <div className="absolute top-1/2 left-0 right-0 border-t border-current transform -translate-y-px"></div>
              <div className="absolute left-1/2 top-1 bottom-1 border-l border-current transform -translate-x-px"></div>
            </div>
          </div>
        );
      
      case 'door':
        return (
          <div className={iconClass}>
            {/* Door icon with handle */}
            <div className="relative w-6 h-8 border-2 border-current rounded-sm bg-current bg-opacity-10">
              <div className="absolute right-1 top-1/2 w-1 h-1 bg-current rounded-full transform -translate-y-1/2"></div>
            </div>
          </div>
        );
      
      case 'panel':
        return (
          <div className={iconClass}>
            {/* Panel icon - solid rectangle */}
            <div className="w-8 h-6 border-2 border-current rounded-sm bg-current bg-opacity-20">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-4 h-0.5 bg-current opacity-60"></div>
              </div>
            </div>
          </div>
        );
      
      default:
        return <span className="text-xs">{piece.index}</span>;
    }
  };

  const availableCount = facadePieces.filter(p => !p.shipped).length;
  const shippedCount = facadePieces.filter(p => p.shipped).length;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="col-span-2 row-span-2 bg-white rounded-lg border shadow-sm hover:shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleAddAllToBatch}
    >
      {/* Header */}
      <div className="p-4 pb-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Grid3x3 className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {position.title}
              </h3>
              <p className="text-xs text-gray-600">16 elemenata fasade</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleViewDetails}
            className="p-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors shrink-0"
            title="Dodatne informacije"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Status legend - pastelne boje */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-200 border border-emerald-300 rounded"></div>
            <span>Spremno</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-200 border border-amber-300 rounded"></div>
            <span>U radu</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-rose-200 border border-rose-300 rounded"></div>
            <span>Problem</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-sky-200 border border-sky-400 rounded ring-1 ring-sky-300"></div>
            <span>Za otpremu</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-slate-300 border border-slate-400 rounded"></div>
            <span>Otpremljeno</span>
          </span>
        </div>
      </div>

      {/* 4x4 Facade Grid */}
      <div className="p-3 pb-16 flex-1">
        <div className="grid grid-cols-4 gap-1 h-full min-h-[280px]">
          {facadePieces.map((piece, pieceIndex) => (
            <motion.div
              key={piece.id}
              className={`
                border-2 rounded cursor-pointer transition-all duration-200 relative
                flex items-center justify-center text-xs font-medium
                ${getPieceColor(piece)}
                ${piece.shipped ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              `}
              onClick={(e) => !piece.shipped && handlePieceClick(pieceIndex, e)}
              onDoubleClick={(e) => handleIndividualElementAdd(piece, e)}
              whileHover={!piece.shipped ? { scale: 1.05 } : {}}
              whileTap={!piece.shipped ? { scale: 0.95 } : {}}
              title={`${piece.description} (${piece.gridPosition}) - ${piece.status}${piece.shipped ? ' (otpremljeno)' : ''}\nDva klika = dodaj u šaržu`}
            >
              {piece.shipped ? (
                <span className="font-bold text-lg">✓</span>
              ) : (
                renderElementIcon(piece)
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white/90 to-transparent">
        <div className="flex justify-between items-center">
          <div className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
            ${getStatusColor(position.status)}
          `}>
            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
            {position.status || 'Nepoznato'}
          </div>

          <div className="flex gap-2">
            {selectedPieces.size > 0 && (
              <button
                onClick={handleAddSelectedToBatch}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 transition-colors"
              >
                Dodaj {selectedPieces.size}
              </button>
            )}
            <button
              onClick={handleViewDetails}
              className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Eye className="w-3 h-3" />
              Detalji
            </button>
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-blue-500 bg-opacity-10 pointer-events-none rounded-lg"
          />
        )}
      </AnimatePresence>

      {/* Selection Hint */}
      {isHovered && selectedPieces.size === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute top-16 left-3 right-3 text-center bg-blue-600 text-white text-xs py-2 px-2 rounded pointer-events-none z-10"
        >
          <div>Klik kartica = svi elementi • Klik element = selekcija</div>
          <div className="mt-1 opacity-80">Dvostruki klik element = direktno u šaržu</div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default FacadeCard;