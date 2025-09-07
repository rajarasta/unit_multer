import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, AlertCircle, FileText, BrainCircuit, MessageSquare, Mic, Search, CheckSquare } from 'lucide-react';

// === NOVI, POBOLJŠANI DIZAJN KARTICE ===
const StageCard = ({ stage, onStageClick }) => {
  
  // Detaljnija logika za ikone i boje teme
  const getStageAppearance = (stage) => {
    const name = (stage.name || '').toLowerCase();
    const desc = (stage.description || '').toLowerCase();

    if (name.includes('llm') || desc.includes('llm') || desc.includes('gemini') || desc.includes('openai')) {
      return { icon: <BrainCircuit className="w-6 h-6 text-purple-500" />, color: 'purple' };
    }
    if (name.includes('parsiranje') || desc.includes('parser')) {
      return { icon: <MessageSquare className="w-6 h-6 text-blue-500" />, color: 'blue' };
    }
    if (name.includes('dokument') || desc.includes('pdf')) {
      return { icon: <FileText className="w-6 h-6 text-orange-500" />, color: 'orange' };
    }
    if (name.includes('glasov') || desc.includes('voice')) {
      return { icon: <Mic className="w-6 h-6 text-cyan-500" />, color: 'cyan' };
    }
    if (name.includes('validacija') || desc.includes('provjera')) {
      return { icon: <CheckSquare className="w-6 h-6 text-red-500" />, color: 'red' };
    }
    if (name.includes('istra') || desc.includes('research')) {
      return { icon: <Search className="w-6 h-6 text-indigo-500" />, color: 'indigo' };
    }
    
    // Default
    return { icon: <Clock className="w-6 h-6 text-gray-500" />, color: 'gray' };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-400" />;
    }
  };
  
  const getColorClasses = (color) => {
    const colorMap = {
      purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', shadow: 'hover:shadow-purple-500/20' },
      blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', shadow: 'hover:shadow-blue-500/20' },
      orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', shadow: 'hover:shadow-orange-500/20' },
      green: { bg: 'bg-green-500/10', border: 'border-green-500/20', shadow: 'hover:shadow-green-500/20' },
      red: { bg: 'bg-red-500/10', border: 'border-red-500/20', shadow: 'hover:shadow-red-500/20' },
      cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', shadow: 'hover:shadow-cyan-500/20' },
      indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', shadow: 'hover:shadow-indigo-500/20' },
      gray: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', shadow: 'hover:shadow-gray-500/20' },
    };
    return colorMap[color] || colorMap.gray;
  };

  const { icon, color } = getStageAppearance(stage);
  const colorClasses = getColorClasses(color);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className={`relative flex-shrink-0 w-[220px] h-[160px] rounded-2xl border p-4 flex flex-col justify-between
                 cursor-pointer transition-all duration-300 backdrop-blur-sm hover:-translate-y-1 shadow-lg ${colorClasses.bg} ${colorClasses.border} ${colorClasses.shadow}`}
      onClick={() => onStageClick && onStageClick(stage)}
    >
      <div className="flex items-start justify-between">
        {icon}
        {stage.document?.thumbnail && (
          <img 
            src={stage.document.thumbnail} 
            alt="Doc thumbnail"
            className="w-10 h-10 object-cover rounded-md border border-white/20"
          />
        )}
      </div>

      <div className="flex-1 flex flex-col justify-end mt-2">
        <h4 className="font-semibold text-sm mb-1 text-primary line-clamp-2">
          {stage.name}
        </h4>
        <p className="text-xs leading-snug text-secondary line-clamp-2">
          {stage.description}
        </p>
      </div>

      <div className="absolute top-3 right-3 flex items-center gap-2">
        {getStatusIcon(stage.status)}
      </div>
    </motion.div>
  );
};


export default function ProcessCarousel({ processStages, clearStages, isHidden = false, onStageClick }) {
  const scrollContainerRef = useRef(null);

  // Automatski skrolaj na kraj (desno) kada se doda nova kartica
  useEffect(() => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        left: scrollWidth - clientWidth,
        behavior: 'smooth'
      });
    }
  }, [processStages]);

  if (!processStages || processStages.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center panel border border-dashed rounded-2xl">
        <div className="text-center text-subtle">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Agent čeka na zadatke...</p>
          <p className="text-xs opacity-60">Procesi će biti prikazani ovdje.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col transition-opacity duration-300 ${isHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-semibold text-primary flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4" />
          Tijek obrade ({processStages.length})
        </h3>
        <button onClick={clearStages} className="text-xs text-subtle hover:text-primary transition-colors">
          Očisti sve
        </button>
      </div>

      {/* Horizontalni kontejner sa skrolanjem */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center gap-4 py-2 pr-4 overflow-x-auto"
        // Stil za skrivanje scrollbara, ali zadržavanje funkcionalnosti
        style={{ scrollbarWidth: 'none', 'msOverflowStyle': 'none', WebkitScrollbar: { display: 'none' } }}
      >
        <AnimatePresence>
          {processStages.map((stage) => (
            <StageCard key={stage.id} stage={stage} onStageClick={onStageClick} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}