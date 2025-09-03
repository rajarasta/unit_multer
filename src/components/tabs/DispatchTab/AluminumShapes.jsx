import React from 'react';

export const AluminumShapes = {
  // Osnovni profili
  LProfile: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path 
          d="M20 20 L20 80 L30 80 L30 30 L80 30 L80 20 Z" 
          fill="currentColor" 
          className="text-gray-600"
        />
        <path 
          d="M22 22 L22 78 L28 78 L28 32 L78 32 L78 22 Z" 
          fill="currentColor" 
          className="text-gray-300"
        />
      </svg>
    </div>
  ),

  TProfile: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path 
          d="M20 20 L20 30 L45 30 L45 80 L55 80 L55 30 L80 30 L80 20 Z" 
          fill="currentColor" 
          className="text-gray-600"
        />
        <path 
          d="M22 22 L22 28 L47 28 L47 78 L53 78 L53 28 L78 28 L78 22 Z" 
          fill="currentColor" 
          className="text-gray-300"
        />
      </svg>
    </div>
  ),

  UProfile: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path 
          d="M20 20 L20 80 L30 80 L30 30 L70 30 L70 80 L80 80 L80 20 Z" 
          fill="currentColor" 
          className="text-gray-600"
        />
        <path 
          d="M22 22 L22 78 L28 78 L28 32 L72 32 L72 78 L78 78 L78 22 Z" 
          fill="currentColor" 
          className="text-gray-300"
        />
      </svg>
    </div>
  ),

  // Prozor
  Window: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Okvir prozora */}
        <rect x="15" y="25" width="70" height="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-600"/>
        <rect x="18" y="28" width="64" height="44" fill="currentColor" className="text-blue-50"/>
        
        {/* Staklo */}
        <rect x="20" y="30" width="28" height="40" fill="currentColor" className="text-blue-100" opacity="0.7"/>
        <rect x="52" y="30" width="28" height="40" fill="currentColor" className="text-blue-100" opacity="0.7"/>
        
        {/* Središnji profil */}
        <rect x="47" y="28" width="6" height="44" fill="currentColor" className="text-blue-600"/>
        
        {/* Kvaka */}
        <circle cx="75" cy="50" r="2" fill="currentColor" className="text-gray-600"/>
      </svg>
    </div>
  ),

  // Vrata
  Door: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Okvir vrata */}
        <rect x="20" y="15" width="50" height="70" fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-600"/>
        <rect x="23" y="18" width="44" height="64" fill="currentColor" className="text-amber-50"/>
        
        {/* Paneli vrata */}
        <rect x="25" y="20" width="40" height="25" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-400"/>
        <rect x="25" y="50" width="40" height="25" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-400"/>
        
        {/* Kvaka */}
        <circle cx="60" cy="55" r="2" fill="currentColor" className="text-gray-600"/>
        <rect x="58" y="53" width="6" height="2" fill="currentColor" className="text-gray-600"/>
      </svg>
    </div>
  ),

  // Roletna
  Roller: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Kutija roletne */}
        <rect x="15" y="20" width="70" height="15" fill="currentColor" className="text-gray-600" rx="2"/>
        <rect x="17" y="22" width="66" height="11" fill="currentColor" className="text-gray-400" rx="1"/>
        
        {/* Lamele */}
        {[0,1,2,3,4,5,6,7].map(i => (
          <rect key={i} x="18" y={38 + i*6} width="64" height="4" fill="currentColor" className="text-gray-500" rx="1"/>
        ))}
        
        {/* Vodilice */}
        <rect x="15" y="35" width="4" height="50" fill="currentColor" className="text-gray-700"/>
        <rect x="81" y="35" width="4" height="50" fill="currentColor" className="text-gray-700"/>
      </svg>
    </div>
  ),

  // Balkonska ograda
  Railing: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Donji i gornji profil */}
        <rect x="10" y="65" width="80" height="4" fill="currentColor" className="text-gray-600"/>
        <rect x="10" y="35" width="80" height="4" fill="currentColor" className="text-gray-600"/>
        
        {/* Vertikalne šipke */}
        {[20, 30, 40, 50, 60, 70, 80].map(x => (
          <rect key={x} x={x} y="39" width="2" height="26" fill="currentColor" className="text-gray-500"/>
        ))}
        
        {/* Staklo */}
        <rect x="12" y="40" width="76" height="24" fill="currentColor" className="text-blue-100" opacity="0.3"/>
      </svg>
    </div>
  ),

  // Fasadni panel
  FacadePanel: ({ size = 40, className = "" }) => (
    <div className={`inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="15" y="20" width="70" height="60" fill="currentColor" className="text-gray-600"/>
        <rect x="17" y="22" width="66" height="56" fill="currentColor" className="text-gray-400"/>
        
        {/* Rebra */}
        {[0,1,2,3,4].map(i => (
          <rect key={i} x="15" y={25 + i*12} width="70" height="2" fill="currentColor" className="text-gray-500"/>
        ))}
      </svg>
    </div>
  )
};

// Funkcija za dobivanje ikone na osnovu naziva pozicije
export const getShapeIcon = (positionTitle = '', positionType = '') => {
  const title = positionTitle.toLowerCase();
  const type = positionType.toLowerCase();
  
  if (title.includes('prozor') || title.includes('window') || type.includes('window')) {
    return AluminumShapes.Window;
  }
  
  if (title.includes('vrata') || title.includes('door') || type.includes('door')) {
    return AluminumShapes.Door;
  }
  
  if (title.includes('roletna') || title.includes('roller') || title.includes('blind')) {
    return AluminumShapes.Roller;
  }
  
  if (title.includes('ograda') || title.includes('railing') || title.includes('balkon')) {
    return AluminumShapes.Railing;
  }
  
  if (title.includes('fasada') || title.includes('panel') || title.includes('facade')) {
    return AluminumShapes.FacadePanel;
  }
  
  if (title.includes('profil l') || title.includes('l-profil') || type.includes('l-profile')) {
    return AluminumShapes.LProfile;
  }
  
  if (title.includes('profil t') || title.includes('t-profil') || type.includes('t-profile')) {
    return AluminumShapes.TProfile;
  }
  
  if (title.includes('profil u') || title.includes('u-profil') || type.includes('u-profile')) {
    return AluminumShapes.UProfile;
  }
  
  // Default fallback
  return AluminumShapes.Window;
};