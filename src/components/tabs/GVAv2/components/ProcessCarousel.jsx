import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProcessCarousel({ processStages, clearStages, isHidden = false, onStageClick }) {
  if (!processStages || processStages.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center">
        <div className="text-center text-subtle">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nema aktivnih procesa</p>
        </div>
      </div>
    );
  }

  // Function colors based on stage type/function
  const getFunctionColor = (stage) => {
    const stageName = (stage.name || '').toLowerCase();
    const stageDesc = (stage.description || '').toLowerCase();
    
    if (stageName.includes('llm') || stageDesc.includes('llm') || stageDesc.includes('gemini') || stageDesc.includes('openai')) {
      return 'purple'; // LLM calls
    }
    if (stageName.includes('parser') || stageDesc.includes('parser') || stageDesc.includes('parsiranje')) {
      return 'blue'; // Parser operations
    }
    if (stageName.includes('dokument') || stageDesc.includes('dokument') || stageDesc.includes('pdf')) {
      return 'orange'; // Document operations
    }
    if (stageName.includes('analiza') || stageDesc.includes('analiza') || stageDesc.includes('processing')) {
      return 'green'; // Analysis
    }
    if (stageName.includes('validation') || stageDesc.includes('validacija') || stageDesc.includes('provjera')) {
      return 'red'; // Validation
    }
    if (stageName.includes('voice') || stageDesc.includes('voice') || stageDesc.includes('glasov')) {
      return 'cyan'; // Voice operations
    }
    
    return 'gray'; // Default/unknown
  };

  // Card layout - no overlap, side by side, limited by container width
  const getCardStackStyles = (stage, index, totalStages) => {
    const cardWidth = 160;
    const cardGap = 8; // Small gap between cards
    const containerWidth = 400; // Available container width (adjust as needed)
    
    // Calculate how many cards can fit
    const maxVisibleCards = Math.floor((containerWidth + cardGap) / (cardWidth + cardGap));
    
    // Show only the most recent cards that fit in container
    const visibleStartIndex = Math.max(0, totalStages - maxVisibleCards);
    const isVisible = index >= visibleStartIndex;
    
    if (!isVisible) {
      return { x: -500, zIndex: 1, opacity: 0, scale: 1.0 }; // Hidden off-screen
    }
    
    // Position cards from left to right, newest on the right
    const visibleIndex = index - visibleStartIndex;
    const xOffset = visibleIndex * (cardWidth + cardGap);
    
    // Z-index: newest (rightmost) should have highest z-index
    const zIndex = totalStages - (totalStages - 1 - index);
    
    // All visible cards have full opacity, newest slightly more prominent
    const opacity = index === totalStages - 1 ? 0.95 : 0.85;
    
    return {
      x: xOffset,
      zIndex: zIndex,
      opacity: opacity,
      scale: 1.0
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
          />
        );
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
      default:
        return <div className="w-3 h-3 rounded-full border-2 border-gray-400" />;
    }
  };

  // Get color classes based on function type
  const getColorClasses = (color) => {
    const colorMap = {
      purple: { bg: 'bg-purple-50/70', border: 'border-purple-200', accent: 'border-l-purple-500' },
      blue: { bg: 'bg-blue-50/70', border: 'border-blue-200', accent: 'border-l-blue-500' },
      orange: { bg: 'bg-orange-50/70', border: 'border-orange-200', accent: 'border-l-orange-500' },
      green: { bg: 'bg-green-50/70', border: 'border-green-200', accent: 'border-l-green-500' },
      red: { bg: 'bg-red-50/70', border: 'border-red-200', accent: 'border-l-red-500' },
      cyan: { bg: 'bg-cyan-50/70', border: 'border-cyan-200', accent: 'border-l-cyan-500' },
      gray: { bg: 'bg-gray-50/70', border: 'border-gray-200', accent: 'border-l-gray-400' }
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className={`h-full relative transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-primary flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          Proces obrade
        </h3>
        <button onClick={clearStages} className="text-xs text-subtle hover:text-primary transition-colors">
          Očisti
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-start min-h-[180px] pl-4 overflow-hidden">
        <AnimatePresence>
          {processStages.map((stage, index) => {
            const stackStyles = getCardStackStyles(stage, index, processStages.length);
            const functionColor = getFunctionColor(stage);
            const colorClasses = getColorClasses(functionColor);
            
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ 
                  opacity: stackStyles.opacity,
                  x: stackStyles.x, // Direct position from left
                  scale: stackStyles.scale,
                  zIndex: stackStyles.zIndex
                }}
                exit={{ opacity: 0, x: -50, scale: 0.8 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`absolute w-[160px] h-[160px] rounded-xl border-2 border-l-4 p-3 transition-all cursor-pointer hover:shadow-lg ${colorClasses.bg} ${colorClasses.border} ${colorClasses.accent}`}
                style={{
                  zIndex: stackStyles.zIndex,
                  boxShadow: index === processStages.length - 1 ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.1)'
                }}
                onClick={() => onStageClick && onStageClick(stage)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{stage.icon}</span>
                      {getStatusIcon(stage.status)}
                    </div>
                    {stage.document && stage.document.thumbnail && (
                      <div className="w-6 h-6 rounded overflow-hidden bg-gray-100">
                        <img 
                          src={stage.document.thumbnail} 
                          alt="Doc"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h4 className="font-semibold text-xs mb-1 text-gray-800 line-clamp-1">
                      {stage.name}
                    </h4>
                    <p className="text-xs leading-snug text-gray-600 line-clamp-3">
                      {stage.description}
                    </p>
                  </div>
                  {stage.document && (
                    <div className="mt-1 text-[10px] text-gray-500 border-t border-gray-200/50 pt-1">
                      📄 {stage.document.name || 'Doc'}
                    </div>
                  )}
                  
                  {/* Function type indicator */}
                  <div className="absolute top-1 right-1">
                    <div className={`w-2 h-2 rounded-full ${
                      functionColor === 'purple' ? 'bg-purple-500' :
                      functionColor === 'blue' ? 'bg-blue-500' :
                      functionColor === 'orange' ? 'bg-orange-500' :
                      functionColor === 'green' ? 'bg-green-500' :
                      functionColor === 'red' ? 'bg-red-500' :
                      functionColor === 'cyan' ? 'bg-cyan-500' : 'bg-gray-500'
                    }`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Stack indicator */}
        {processStages.length > 1 && (
          <div className="absolute bottom-1 left-1 text-xs text-gray-500">
            {processStages.length} kartica
          </div>
        )}
      </div>
    </div>
  );
}