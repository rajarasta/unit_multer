import React, { useState } from 'react';

export default function AtomButton() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setIsExpanded(!isExpanded);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  };

  // 5x5 grid = 25 ćelija
  const cells = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const index = row * 5 + col;
      const isCenter = row === 2 && col === 2;
      
      // Delay baziran na udaljenosti od centra
      const distance = Math.abs(row - 2) + Math.abs(col - 2);
      const delay = distance * 50;
      
      cells.push({
        id: index,
        row,
        col,
        isCenter,
        delay,
        angle: Math.atan2(row - 2, col - 2) * (180 / Math.PI),
      });
    }
  }

  return (
    <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
      {/* Kontejner */}
      <div 
        className="relative"
        style={{
          width: isExpanded ? '150px' : '30px',
          height: isExpanded ? '150px' : '30px',
          transition: 'all 0.5s ease-in-out',
        }}
      >
        {/* Atom button u collapsed stanju */}
        {!isExpanded && (
          <button
            onClick={handleClick}
            className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full cursor-pointer overflow-hidden shadow-lg hover:shadow-2xl transition-shadow"
            style={{
              width: '30px',
              height: '30px',
            }}
          >
            {/* Jezgra */}
            <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full"
              style={{
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 4px rgba(255,255,255,0.8)',
              }}
            />
            
            {/* Elektroni - 6 za ugljik */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-cyan-300 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `
                    translate(-50%, -50%) 
                    rotate(${angle}deg) 
                    translateX(${i < 2 ? 6 : 10}px)
                  `,
                  animation: `orbit${i < 2 ? 1 : 2} ${1.5 + i * 0.1}s linear infinite`,
                }}
              />
            ))}
            
            {/* Orbitalni prstenovi */}
            <div className="absolute inset-0">
              <div className="absolute inset-1 border border-cyan-300/30 rounded-full animate-pulse" />
              <div className="absolute inset-0.5 border border-cyan-400/20 rounded-full animate-pulse" 
                style={{ animationDelay: '0.5s' }}
              />
            </div>
          </button>
        )}

        {/* Grid ćelije u expanded stanju */}
        {cells.map((cell) => (
          <div
            key={cell.id}
            className="absolute"
            style={{
              width: '30px',
              height: '30px',
              left: isExpanded ? `${cell.col * 30}px` : '0px',
              top: isExpanded ? `${cell.row * 30}px` : '0px',
              transform: isExpanded 
                ? 'scale(1) rotate(0deg)' 
                : `scale(0) rotate(${cell.angle}deg)`,
              opacity: isExpanded ? 1 : 0,
              transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${cell.delay}ms`,
              zIndex: cell.isCenter ? 10 : 1,
            }}
          >
            <div 
              className={`
                w-full h-full rounded-lg cursor-pointer
                ${cell.isCenter 
                  ? 'bg-gradient-to-br from-orange-500 to-red-600' 
                  : 'bg-gradient-to-br from-blue-400 to-purple-500'
                }
              `}
              onClick={handleClick}
              style={{
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: cell.isCenter 
                  ? '0 0 20px rgba(255,100,0,0.5)' 
                  : '0 2px 10px rgba(0,0,0,0.3)',
                animation: isExpanded 
                  ? `float ${2 + Math.random()}s ease-in-out infinite ${Math.random() * 2}s`
                  : 'none',
              }}
            >
              {/* Mini atom struktura u svakoj ćeliji */}
              {cell.isCenter ? (
                // Jezgra ćelija
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-xs font-bold">C</div>
                  </div>
                  <div className="absolute top-1/2 left-1/2 w-4 h-4"
                    style={{
                      transform: 'translate(-50%, -50%)',
                      background: 'radial-gradient(circle, rgba(255,255,255,0.8), transparent)',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />
                </>
              ) : (
                // Elektron ćelije
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-cyan-300 rounded-full"
                    style={{
                      boxShadow: '0 0 6px rgba(0,255,255,0.6)',
                      animation: `electronPulse ${1 + Math.random()}s ease-in-out infinite`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instrukcije */}
      <div className="absolute bottom-4 left-4 text-white/60 text-sm">
        {isExpanded ? 'Klikni bilo koju ćeliju za zatvaranje' : 'Klikni atom za ekspanziju'}
      </div>

      {/* Animacije */}
      <style jsx>{`
        @keyframes orbit1 {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(6px); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateX(6px); }
        }
        
        @keyframes orbit2 {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(10px); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateX(10px); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        
        @keyframes electronPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}