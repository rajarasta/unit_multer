// src/components/TargetArea.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Wrench } from 'lucide-react';

const TargetCard = ({ item, probability, onDrop, type }) => {
  const glowIntensity = probability || 0;
  const isHighlyRelevant = glowIntensity > 0.75;
  const isRelevant = glowIntensity > 0.3;

  // Boja sjaja: Plava (Blue/Fluent Accent) za srednju, Zelena (Emerald) za visoku relevantnost
  const highlightColor = isHighlyRelevant ? 'rgba(16, 185, 129' : 'rgba(59, 130, 246';

  // Stilovi za Glow efekt (Ambijentalni sjaj i obrub)
  const glowStyle = {
    // Ambient Glow (Inset)
    boxShadow: isRelevant ? `0 0 35px ${highlightColor}, ${glowIntensity * 0.25}) inset` : 'none',
    // Border Glow
    border: isRelevant ? `1px solid ${highlightColor}, ${glowIntensity * 0.9})` : '1px solid transparent',
  };

  // Stanje hover-a za drag zone
  const [isHoveredDuringDrag, setIsHoveredDuringDrag] = React.useState(false);

  // Funkcije za detekciju drag zone hover-a
  const handlePointerEnter = () => {
    if (document.body.classList.contains('app-dragging')) {
      setIsHoveredDuringDrag(true);
    }
  };

  const handlePointerLeave = () => {
    setIsHoveredDuringDrag(false);
  };

  // Funkcija za detekciju drop-a (kada korisnik otpusti miša dok vuče)
  const handlePointerUp = () => {
    // Provjeravamo da li je drag bio aktivan (preko globalne klase postavljene u Karuselu)
    if (document.body.classList.contains('app-dragging') && isHoveredDuringDrag) {
       onDrop(item.id);
    }
    setIsHoveredDuringDrag(false);
  };

  // Boja za "CSS Generated World" elemente
  const visualColor = item.projectColor || item.color || (type === 'project' ? '#8b5cf6' : '#94a3b8');

  // Dinamički stilovi s dodatnim hover efektom za drag
  const dynamicStyle = {
    ...glowStyle,
    ...(isHoveredDuringDrag && {
      transform: 'scale(1.08)',
      boxShadow: `0 0 50px ${highlightColor}, ${Math.min(glowIntensity + 0.3, 1)}) inset, 0 10px 30px rgba(0,0,0,0.3)`,
      border: `2px solid ${highlightColor}, ${Math.min(glowIntensity + 0.2, 1)})`,
    })
  };

  return (
    <motion.div
      // Koristimo 'panel' za stakleni efekt (iz theme.css) i dodajemo dinamičke stilove
      className={`panel p-4 rounded-xl m-2 transition-all duration-200 relative overflow-hidden w-64 flex-shrink-0 cursor-default ${isHoveredDuringDrag ? 'z-30' : ''}`}
      style={dynamicStyle}
      // Animacija pulsiranja (suptilno skaliranje) za visoko relevantne stavke
      animate={isHighlyRelevant ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={isHighlyRelevant ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.2 }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      whileHover={{ scale: 1.05 }}
    >
        {/* "CSS Generated World" - Stilizirani ambijentalni background */}
        <div className='absolute inset-0 opacity-15 mix-blend-mode-screen pointer-events-none'>
            <div className={`absolute -top-10 -left-10 w-28 h-28 rounded-full filter blur-2xl`} style={{backgroundColor: visualColor}}/>
            <div className={`absolute -bottom-15 -right-15 w-32 h-32 rounded-full filter blur-3xl opacity-70`} style={{backgroundColor: visualColor}}/>
        </div>

      <div className="relative z-10">
        <div className='flex items-center gap-3 mb-2'>
            {type === 'project' ? <Building2 size={20} className='text-theme-heading'/> : <Wrench size={18} className='text-theme-subtle'/>}
            <h4 className="text-theme-heading font-semibold truncate">
            {item.name}
            </h4>
        </div>

        {item.summary && (
            <p className="text-theme-subtle text-sm">{item.summary}</p>
        )}
        {item.projectName && (
            <p className="text-xs mt-1 font-medium opacity-80" style={{color: item.projectColor}}>{item.projectName}</p>
        )}

        {/* Prikaz vjerojatnosti (Koristi 'nav-badge' stilove iz theme.css) */}
        {isRelevant && (
          <span className={`absolute top-3 right-3 text-xs font-bold nav-badge ${isHighlyRelevant ? 'nav-badge--emerald nav-badge--pulse' : 'nav-badge--sky'}`}>
            {(glowIntensity * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </motion.div>
  );
};

const TargetArea = ({ title, items, activeProbabilities, onDrop, type }) => {
  return (
    <div className='h-full flex flex-col'>
      <h2 className="text-2xl font-bold text-theme-heading mb-4 ml-2">{title}</h2>
      <div className="flex overflow-x-auto pb-4">
        {items.map((item) => (
          <TargetCard
            key={item.id}
            item={item}
            probability={activeProbabilities ? activeProbabilities[item.id] : 0}
            onDrop={onDrop}
            type={type}
          />
        ))}
      </div>
    </div>
  );
};

export default TargetArea;