import React, { useState, useMemo } from 'react';

// Broj stupaca i redaka za mrežu animacije
const COLS = 10;
const ROWS = 9;
const NUM_TILES = COLS * ROWS;
// Trajanje animacije u milisekundama
const ANIMATION_DURATION = 2500;

// Definicija keyframe animacije s dubokom paralaksom i postupnim sjenama
const generateWaveKeyframes = () => {
  let keyframes = '';
  for (let i = 0; i < NUM_TILES; i++) {
    // Više nasumičnosti - svaka pločica potpuno jedinstvena
    const parallaxSpeed = 0.3 + Math.random() * 2; // 0.3x do 2.3x brzina
    
    // PUNO više Z dubine za "bloky" efekt
    const maxZ = (50 + Math.random() * 120) * parallaxSpeed; // 50-170px * parallax
    const midZ1 = (20 + Math.random() * 50) * parallaxSpeed;
    const midZ2 = (30 + Math.random() * 80) * parallaxSpeed;
    const midZ3 = (25 + Math.random() * 60) * parallaxSpeed;
    
    // Manje X/Y kretanje (smanjen intenzitet)
    const translateX = (Math.random() - 0.5) * 4 * parallaxSpeed; // samo -2 do 2px * parallax
    const translateY = (Math.random() - 0.5) * 3 * parallaxSpeed; // samo -1.5 do 1.5px * parallax
    
    // Manje rotacije (smanjen intenzitet)
    const rotX = (Math.random() - 0.5) * 15 * parallaxSpeed; // -7.5 do 7.5 stupnjeva
    const rotY = (Math.random() - 0.5) * 12 * parallaxSpeed;
    const rotZ = (Math.random() - 0.5) * 8;
    
    // Manje scale promjene (smanjen intenzitet)
    const scale1 = 0.95 + Math.random() * 0.15; // 0.95 - 1.1
    const scale2 = 0.9 + Math.random() * 0.25; // 0.9 - 1.15
    const scale3 = 0.97 + Math.random() * 0.1; // 0.97 - 1.07
    
    // Sjene - POSTUPNO od potpune nule do max
    const maxShadowY = 30 + Math.random() * 50; // 30-80px Y offset
    const maxShadowBlur = 40 + Math.random() * 60; // 40-100px blur
    const maxShadowSpread = 5 + Math.random() * 15; // 5-20px spread
    const shadowOpacity = 0.2 + Math.random() * 0.2; // 0.2-0.4 opacity
    
    keyframes += `
      @keyframes wave-${i} {
        0% {
          transform: 
            translateX(0) 
            translateY(0) 
            translateZ(0) 
            rotateX(0) 
            rotateY(0) 
            rotateZ(0) 
            scale(1);
          box-shadow: 0 0 0 0 rgba(0,0,0,0);
          opacity: 1;
        }
        15% {
          transform: 
            translateX(${translateX * 0.2}px) 
            translateY(${translateY * 0.2}px) 
            translateZ(${midZ1}px) 
            rotateX(${rotX * 0.3}deg) 
            rotateY(${rotY * 0.2}deg) 
            rotateZ(${rotZ * 0.15}deg) 
            scale(${scale1});
          box-shadow: 0 ${maxShadowY * 0.2}px ${maxShadowBlur * 0.15}px ${maxShadowSpread * 0.1}px rgba(0,0,0,${shadowOpacity * 0.15});
          opacity: ${0.95 + Math.random() * 0.05};
        }
        35% {
          transform: 
            translateX(${translateX * 0.5}px) 
            translateY(${translateY * 0.5}px) 
            translateZ(${midZ2}px) 
            rotateX(${rotX * 0.6}deg) 
            rotateY(${rotY * 0.5}deg) 
            rotateZ(${rotZ * 0.4}deg) 
            scale(${scale2 * 0.98});
          box-shadow: 0 ${maxShadowY * 0.5}px ${maxShadowBlur * 0.4}px ${maxShadowSpread * 0.3}px rgba(0,0,0,${shadowOpacity * 0.35});
          opacity: ${0.88 + Math.random() * 0.12};
        }
        50% {
          transform: 
            translateX(${translateX}px) 
            translateY(${translateY}px) 
            translateZ(${maxZ}px) 
            rotateX(${rotX}deg) 
            rotateY(${rotY}deg) 
            rotateZ(${rotZ}deg) 
            scale(${scale2});
          box-shadow: 0 ${maxShadowY}px ${maxShadowBlur}px ${maxShadowSpread}px rgba(0,0,0,${shadowOpacity});
          opacity: ${0.8 + Math.random() * 0.2};
        }
        65% {
          transform: 
            translateX(${translateX * 0.7}px) 
            translateY(${translateY * 0.7}px) 
            translateZ(${midZ3}px) 
            rotateX(${rotX * 0.7}deg) 
            rotateY(${rotY * 0.6}deg) 
            rotateZ(${rotZ * 0.5}deg) 
            scale(${scale3});
          box-shadow: 0 ${maxShadowY * 0.6}px ${maxShadowBlur * 0.5}px ${maxShadowSpread * 0.4}px rgba(0,0,0,${shadowOpacity * 0.4});
          opacity: ${0.87 + Math.random() * 0.13};
        }
        85% {
          transform: 
            translateX(${translateX * 0.3}px) 
            translateY(${translateY * 0.3}px) 
            translateZ(${midZ1 * 0.5}px) 
            rotateX(${rotX * 0.3}deg) 
            rotateY(${rotY * 0.25}deg) 
            rotateZ(${rotZ * 0.2}deg) 
            scale(${0.98 + Math.random() * 0.04});
          box-shadow: 0 ${maxShadowY * 0.15}px ${maxShadowBlur * 0.1}px ${maxShadowSpread * 0.05}px rgba(0,0,0,${shadowOpacity * 0.1});
          opacity: ${0.93 + Math.random() * 0.07};
        }
        100% {
          transform: 
            translateX(0) 
            translateY(0) 
            translateZ(0) 
            rotateX(0) 
            rotateY(0) 
            rotateZ(0) 
            scale(1);
          box-shadow: 0 0 0 0 rgba(0,0,0,0);
          opacity: 1;
        }
      }
    `;
  }
  return keyframes;
};

// Glavna komponenta aplikacije
export default function App() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Generiraj podatke za svaku pločicu - VIŠE NASUMIČNOSTI
  const tilesData = useMemo(() => {
    return Array.from({ length: NUM_TILES }, (_, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      
      // Potpuno random distribucija kašnjenja po cijelom polju
      const randomField = Math.random();
      const chaosDelay = Math.sin(randomField * Math.PI * 2) * 600 + Math.random() * 800;
      
      return {
        id: i,
        col,
        row,
        // Više varijacije u kašnjenju
        animationDelay: Math.abs(chaosDelay),
        // Više varijacije u trajanju
        animationDuration: 1200 + Math.random() * 1300, // 1.2-2.5 sekunde
        // Više razina dubine
        parallaxDepth: Math.random() * 8 + 1, // 1-9 razine dubine
        // Random timing funkcija
        easing: Math.random() > 0.5 
          ? 'cubic-bezier(0.4, 0, 0.6, 1)' 
          : 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      };
    });
  }, [animationKey]);

  // Funkcija koja se poziva na klik
  const handleClick = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setAnimationKey(prev => prev + 1); // Nova random animacija

    setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_DURATION + 300);
  };

  return (
    <>
      {/* Keyframe animacije - regeneriraju se svaki put */}
      <style key={animationKey}>{generateWaveKeyframes()}</style>
      
      {/* Vanjska komponenta */}
      <div className="w-full h-screen flex items-center justify-center overflow-hidden bg-slate-900">
        
        {/* Unutarnja komponenta */}
        <div
          onClick={handleClick}
          className="relative w-11/12 max-w-lg cursor-pointer"
          style={{ 
            aspectRatio: `${COLS / ROWS}`,
            perspective: '800px', // Bliža perspektiva za više dubine
            transformStyle: 'preserve-3d',
            transform: isAnimating 
              ? `rotateX(${Math.random() * 4 - 2}deg) rotateY(${Math.random() * 4 - 2}deg)` 
              : 'rotateX(0) rotateY(0)',
            transition: 'transform 2.5s ease-in-out'
          }}
        >
          {/* Tekstualni sadržaj */}
          <p
            className="absolute inset-0 flex items-center justify-center p-6 md:p-8 text-lg md:text-xl font-light text-center leading-relaxed z-50 text-white"
            style={{ 
              textShadow: '0 4px 30px rgba(0,0,0,0.9)',
              transform: `translateZ(${isAnimating ? 100 : 50}px)`,
              transition: 'all 1.5s ease-in-out'
            }}
          >
            Kliknite za duboku animaciju
          </p>

          {/* Mreža animiranih pločica */}
          <div 
            className="grid grid-cols-10 grid-rows-9 w-full h-full rounded-2xl overflow-hidden"
            style={{ 
              transformStyle: 'preserve-3d',
            }}
          >
            {tilesData.map((tile) => {
              // Dodatna nasumičnost za svaku pločicu
              const brightness = isAnimating ? 0.85 + Math.random() * 0.3 : 1;
              
              return (
                <div
                  key={tile.id}
                  className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700"
                  style={{
                    // Svaka pločica prikazuje dio gradijenta s random offsetom
                    backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
                    backgroundPosition: `${(100 / (COLS - 1)) * tile.col}% ${(100 / (ROWS - 1)) * tile.row}%`,
                    // Random animacija s više varijacija
                    animation: isAnimating
                      ? `wave-${tile.id} ${tile.animationDuration}ms ${tile.animationDelay}ms ${tile.easing} both`
                      : 'none',
                    // Različite početne Z pozicije za dubinu
                    transform: !isAnimating 
                      ? `translateZ(${tile.parallaxDepth}px)`
                      : 'none',
                    // POTPUNO BEZ SJENA u mirovanju
                    boxShadow: '0 0 0 0 rgba(0,0,0,0)',
                    // Random brightness
                    filter: isAnimating ? `brightness(${brightness})` : 'none',
                    // Lagani border za definiciju
                    border: '0.5px solid rgba(255,255,255,0.05)',
                  }}
                />
              );
            })}
          </div>

          {/* Dodatni sloj za efekt dubine - samo tijekom animacije */}
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: isAnimating 
                ? `radial-gradient(circle at ${30 + Math.random() * 40}% ${30 + Math.random() * 40}%, transparent 20%, rgba(0,0,0,0.4) 100%)`
                : 'none',
              opacity: isAnimating ? 0.6 : 0,
              transition: 'opacity 1s ease-in-out',
              transform: 'translateZ(80px)',
            }}
          />
        </div>
      </div>
    </>
  );
}