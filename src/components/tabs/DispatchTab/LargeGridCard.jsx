import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Eye, 
  Grid3x3
} from 'lucide-react';

const LargeGridCard = ({ 
  position, 
  index, 
  onAddToBatch, 
  onViewDetails, 
  getStatusColor 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedPieces, setSelectedPieces] = useState(new Set());
  const cardRef = useRef(null);

  // Generate 20x2 grid (40 elements total) with realistic distribution
  const generateLargeGrid = useCallback(() => {
    const layout = [];
    
    // Define element types distribution
    const elementTypes = ['panel', 'window', 'door', 'vent', 'junction'];
    const typeDistribution = [
      // Row 0 (top) - 20 elements  
      'panel', 'window', 'panel', 'window', 'panel', 'door', 'panel', 'window', 
      'panel', 'vent', 'panel', 'window', 'panel', 'window', 'panel', 'door',
      'panel', 'window', 'panel', 'junction',
      
      // Row 1 (bottom) - 20 elements
      'window', 'panel', 'window', 'panel', 'junction', 'panel', 'window', 'panel',
      'window', 'panel', 'door', 'panel', 'window', 'panel', 'vent', 'panel', 
      'window', 'panel', 'window', 'panel'
    ];
    
    // Fixed statuses for consistency - mixed realistic distribution
    const fixedStatuses = [
      // Row 0
      'completed', 'in_progress', 'ready', 'completed', 'ready', 'problem', 'completed', 'in_progress',
      'ready', 'completed', 'in_progress', 'ready', 'completed', 'problem', 'ready', 'in_progress',
      'completed', 'ready', 'in_progress', 'completed',
      // Row 1  
      'ready', 'completed', 'in_progress', 'ready', 'completed', 'problem', 'ready', 'completed',
      'in_progress', 'ready', 'completed', 'in_progress', 'ready', 'completed', 'problem', 'in_progress',
      'ready', 'completed', 'in_progress', 'ready'
    ];
    
    // Some elements are shipped - scattered distribution
    const shippedElements = [2, 7, 12, 15, 23, 28, 33, 37];
    
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 20; col++) {
        const index = row * 20 + col;
        const elementType = typeDistribution[index];
        
        layout.push({
          id: `${position.id}_${elementType}_${row}_${col}`,
          row,
          col,
          index: index + 1,
          elementType,
          gridPosition: `R${row + 1}C${col + 1}`,
          dimensions: getElementDimensions(elementType),
          material: getElementMaterial(elementType),
          status: fixedStatuses[index],
          shipped: shippedElements.includes(index),
          description: getElementDescription(elementType, row + 1, col + 1)
        });
      }
    }
    
    return layout;
  }, [position.id]);

  const getElementDimensions = (type) => {
    switch (type) {
      case 'window': return '100x80cm';
      case 'door': return '90x210cm';  
      case 'panel': return '120x100cm';
      case 'vent': return '60x40cm';
      case 'junction': return '80x80cm';
      default: return '100x100cm';
    }
  };

  const getElementMaterial = (type) => {
    switch (type) {
      case 'window': return 'ALU profil + staklo';
      case 'door': return 'ALU + sigurnosni panel';
      case 'panel': return 'Kompozit ALU panel';
      case 'vent': return 'Ventilacijski okvir';
      case 'junction': return 'Spojni element';
      default: return 'Kompozit ALU';
    }
  };

  const getElementDescription = (type, row, col) => {
    switch (type) {
      case 'window': return `Prozor ${row}.${col}`;
      case 'door': return `Vrata ${row}.${col}`;
      case 'panel': return `Panel ${row}.${col}`;
      case 'vent': return `Ventil ${row}.${col}`;
      case 'junction': return `Spoj ${row}.${col}`;
      default: return `Element ${row}.${col}`;
    }
  };

  const gridPieces = useMemo(() => generateLargeGrid(), [generateLargeGrid]);

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
      selectedPieces.forEach(pieceIndex => {
        const piece = gridPieces[pieceIndex];
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
    const availablePieces = gridPieces.filter(p => !p.shipped);
    availablePieces.forEach(piece => {
      onAddToBatch({
        ...position,
        id: piece.id,
        title: `${position.title} - ${piece.description}`,
        qty: 1,
        pieceData: piece
      }, 1);
    });
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    onViewDetails(position);
  };

  const getPieceColorWithGlow = (piece) => {
    const pieceIndex = gridPieces.indexOf(piece);
    
    // Priority 1: Shipped elements
    if (piece.shipped) {
      return {
        bg: 'bg-slate-300 border-slate-400 text-slate-600',
        glow: 'shadow-inner'
      };
    }
    
    // Priority 2: Selected for shipment 
    if (selectedPieces.has(pieceIndex)) {
      return {
        bg: 'bg-sky-200 border-sky-400 text-sky-800',
        glow: 'shadow-lg shadow-sky-400/50 ring-2 ring-sky-300'
      };
    }
    
    // Priority 3: Production status with inward glow
    switch (piece.status) {
      case 'completed': 
        return {
          bg: 'bg-emerald-100 border-emerald-300 text-emerald-700',
          glow: 'shadow-inner shadow-emerald-400/30'
        };
      case 'in_progress': 
        return {
          bg: 'bg-amber-100 border-amber-300 text-amber-700',
          glow: 'shadow-inner shadow-amber-400/30'
        };
      case 'ready': 
        return {
          bg: 'bg-teal-100 border-teal-300 text-teal-700',
          glow: 'shadow-inner shadow-teal-400/30'
        };
      case 'problem': 
        return {
          bg: 'bg-rose-100 border-rose-300 text-rose-700',
          glow: 'shadow-inner shadow-rose-400/30'
        };
      default: 
        return {
          bg: 'bg-gray-100 border-gray-300 text-gray-600',
          glow: 'shadow-inner shadow-gray-400/20'
        };
    }
  };

  const renderElementIcon = (piece) => {
    const iconClass = "w-full h-full flex items-center justify-center text-xs font-semibold";
    
    switch (piece.elementType) {
      case 'window':
        return (
          <div className={iconClass}>
            <div className="relative w-6 h-4 border border-current rounded-sm">
              <div className="absolute inset-0.5 border border-current opacity-60"></div>
              <div className="absolute top-1/2 left-0 right-0 border-t border-current transform -translate-y-px"></div>
              <div className="absolute left-1/2 top-0.5 bottom-0.5 border-l border-current transform -translate-x-px"></div>
            </div>
          </div>
        );
      
      case 'door':
        return (
          <div className={iconClass}>
            <div className="relative w-4 h-6 border border-current rounded-sm bg-current bg-opacity-10">
              <div className="absolute right-0.5 top-1/2 w-0.5 h-0.5 bg-current rounded-full transform -translate-y-1/2"></div>
            </div>
          </div>
        );
      
      case 'panel':
        return (
          <div className={iconClass}>
            <div className="w-6 h-4 border border-current rounded-sm bg-current bg-opacity-15">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-3 h-px bg-current opacity-50"></div>
              </div>
            </div>
          </div>
        );

      case 'vent':
        return (
          <div className={iconClass}>
            <div className="w-5 h-3 border border-current rounded-sm">
              <div className="flex flex-col h-full justify-center">
                <div className="w-full border-t border-current opacity-60"></div>
                <div className="w-full border-t border-current opacity-60"></div>
                <div className="w-full border-t border-current opacity-60"></div>
              </div>
            </div>
          </div>
        );

      case 'junction':
        return (
          <div className={iconClass}>
            <div className="w-4 h-4 border border-current rounded bg-current bg-opacity-20">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-1 h-1 bg-current rounded-full"></div>
              </div>
            </div>
          </div>
        );
      
      default:
        return <span className="text-xs">{piece.index}</span>;
    }
  };

  const availableCount = gridPieces.filter(p => !p.shipped).length;
  const shippedCount = gridPieces.filter(p => p.shipped).length;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="col-span-4 row-span-2 bg-white rounded-lg border shadow-sm hover:shadow-lg transition-all duration-200 relative overflow-hidden flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleAddAllToBatch}
    >
      {/* Header */}
      <div className="p-4 pb-2 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Grid3x3 className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {position.title}
              </h3>
              <p className="text-xs text-gray-600">40 elemenata (20x2 grid)</p>
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

        {/* Status legend - kompaktna verzija */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-200 border border-emerald-300 rounded shadow-inner shadow-emerald-400/30"></div>
            <span>Spremno</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-amber-200 border border-amber-300 rounded shadow-inner shadow-amber-400/30"></div>
            <span>U radu</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-rose-200 border border-rose-300 rounded shadow-inner shadow-rose-400/30"></div>
            <span>Problem</span>
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-sky-200 border border-sky-400 rounded ring-1 ring-sky-300"></div>
            <span>Za otpremu</span>
          </span>
        </div>
      </div>

      {/* 20x2 Grid */}
      <div className="p-3 pb-16 flex-1">
        <div className="grid gap-1 h-full min-h-[120px]" style={{ gridTemplateColumns: 'repeat(20, minmax(0, 1fr))' }}>
          {gridPieces.map((piece, pieceIndex) => {
            const colorData = getPieceColorWithGlow(piece);
            return (
              <motion.div
                key={piece.id}
                className={`
                  border-2 rounded cursor-pointer transition-all duration-200 relative
                  flex items-center justify-center text-xs font-medium
                  ${colorData.bg} ${colorData.glow}
                  ${piece.shipped ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
                onClick={(e) => !piece.shipped && handlePieceClick(pieceIndex, e)}
                onDoubleClick={(e) => handleIndividualElementAdd(piece, e)}
                whileHover={!piece.shipped ? { scale: 1.1 } : {}}
                whileTap={!piece.shipped ? { scale: 0.95 } : {}}
                title={`${piece.description} (${piece.gridPosition}) - ${piece.status}${piece.shipped ? ' (otpremljeno)' : ''}\nDva klika = dodaj u šaržu`}
              >
                {piece.shipped ? (
                  <span className="font-bold text-sm">✓</span>
                ) : (
                  renderElementIcon(piece)
                )}
              </motion.div>
            );
          })}
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
            className="absolute inset-0 bg-indigo-500 bg-opacity-5 pointer-events-none rounded-lg"
          />
        )}
      </AnimatePresence>

      {/* Selection Hint */}
      {isHovered && selectedPieces.size === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute top-16 left-3 right-3 text-center bg-indigo-600 text-white text-xs py-2 px-2 rounded pointer-events-none z-10"
        >
          <div>Klik kartica = svi elementi • Klik element = selekcija</div>
          <div className="mt-1 opacity-80">Dvostruki klik element = direktno u šaržu</div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default LargeGridCard;