import React, { useState, useEffect } from 'react';

// Grid dimenzije
const COLS = 20;
const ROWS = 12;
const CELL_SIZE = 100 / COLS; // postotak

export default function App() {
  const [isAnimating, setIsAnimating] = useState(true);
  const [animationKey, setAnimationKey] = useState(0);
  const [startCorner, setStartCorner] = useState('top-left');

  // Pokreni animaciju na mount (refresh)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [animationKey]);

  // Izračunaj delay za svaku ćeliju ovisno o kutu
  const calculateDelay = (row, col) => {
    const corners = {
      'top-left': row + col,
      'top-right': row + (COLS - col),
      'bottom-left': (ROWS - row) + col,
      'bottom-right': (ROWS - row) + (COLS - col),
      'center': Math.abs(row - ROWS/2) + Math.abs(col - COLS/2),
    };
    
    // Normaliziraj delay (0-1 sekunda)
    const maxDistance = ROWS + COLS;
    return (corners[startCorner] / maxDistance) * 1000;
  };

  const handleClick = () => {
    // Promijeni kut i pokreni animaciju
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
    const currentIndex = corners.indexOf(startCorner);
    const nextCorner = corners[(currentIndex + 1) % corners.length];
    
    setStartCorner(nextCorner);
    setIsAnimating(true);
    setAnimationKey(prev => prev + 1);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, 3000);
  };

  // Generiraj grid ćelije
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      const delay = calculateDelay(row, col);
      
      // Random faktori za svaku ćeliju
      const randomHeight = 30 + Math.random() * 70;
      const randomRotation = Math.random() * 360;
      const randomScale = 0.8 + Math.random() * 0.4;
      const randomDuration = 800 + Math.random() * 400;
      
      cells.push({
        id: index,
        row,
        col,
        delay,
        randomHeight,
        randomRotation,
        randomScale,
        randomDuration,
        hue: (row * 15 + col * 15) % 360,
      });
    }
  }

  return (
    <div className="w-full h-screen bg-slate-900 overflow-hidden relative">
      {/* Info panel */}
      <div className="absolute top-4 left-4 text-white z-50 bg-black/50 p-3 rounded">
        <p className="text-sm">Početak: {startCorner}</p>
        <p className="text-xs opacity-70 mt-1">Klikni za promjenu kuta</p>
      </div>

      {/* Grid kontejner */}
      <div 
        className="absolute inset-0 cursor-pointer"
        onClick={handleClick}
        style={{
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        }}
      >
        {cells.map((cell) => (
          <div
            key={`${animationKey}-${cell.id}`}
            className="absolute"
            style={{
              left: `${cell.col * CELL_SIZE}%`,
              top: `${cell.row * CELL_SIZE}%`,
              width: `${CELL_SIZE}%`,
              height: `${100 / ROWS}%`,
              transformStyle: 'preserve-3d',
              animation: isAnimating 
                ? `waveCell 
                   ${cell.randomDuration}ms 
                   ${cell.delay}ms 
                   cubic-bezier(0.4, 0, 0.2, 1) 
                   forwards`
                : 'none',
            }}
          >
            {/* Osnovna ćelija */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, 
                  hsl(${cell.hue}, 70%, 50%), 
                  hsl(${cell.hue + 30}, 60%, 40%))`,
                border: '0.5px solid rgba(255,255,255,0.1)',
                transform: isAnimating ? 'translateZ(0)' : 'translateZ(0)',
                opacity: isAnimating ? 1 : 0.3,
                transition: 'opacity 0.5s ease-out',
              }}
            />
            
            {/* 3D sloj koji se podiže */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(circle at center, 
                  rgba(255,255,255,0.8), 
                  rgba(255,255,255,0.2))`,
                opacity: 0,
                animation: isAnimating 
                  ? `flash ${cell.randomDuration}ms ${cell.delay}ms ease-out`
                  : 'none',
              }}
            />
          </div>
        ))}

        {/* Diagonal wave line vizualizacija */}
        {isAnimating && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `conic-gradient(
                from ${startCorner === 'center' ? '0deg' : '45deg'} 
                at ${
                  startCorner === 'top-left' ? '0% 0%' :
                  startCorner === 'top-right' ? '100% 0%' :
                  startCorner === 'bottom-left' ? '0% 100%' :
                  startCorner === 'bottom-right' ? '100% 100%' :
                  '50% 50%'
                },
                transparent 0deg,
                rgba(255,255,255,0.1) 90deg,
                transparent 180deg
              )`,
              animation: 'rotate 3s linear',
              mixBlendMode: 'screen',
            }}
          />
        )}

        {/* Tekst preko svega */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 
            className="text-white text-4xl font-light"
            style={{
              textShadow: '0 4px 20px rgba(0,0,0,0.8)',
              opacity: isAnimating ? 0 : 1,
              transform: isAnimating ? 'scale(0.9)' : 'scale(1)',
              transition: 'all 1s ease-out',
            }}
          >
            Klikni za novi val
          </h1>
        </div>
      </div>

      {/* Keyframe animacije */}
      <style jsx>{`
        @keyframes waveCell {
          0% {
            transform: 
              translateZ(0) 
              rotateX(0) 
              rotateY(0) 
              rotateZ(0) 
              scale(0);
            opacity: 0;
          }
          30% {
            transform: 
              translateZ(${20 + Math.random() * 40}px) 
              rotateX(${-10 + Math.random() * 20}deg) 
              rotateY(${-10 + Math.random() * 20}deg) 
              rotateZ(${-5 + Math.random() * 10}deg) 
              scale(1.2);
            opacity: 1;
          }
          60% {
            transform: 
              translateZ(${40 + Math.random() * 60}px) 
              rotateX(${-15 + Math.random() * 30}deg) 
              rotateY(${-15 + Math.random() * 30}deg) 
              rotateZ(${-10 + Math.random() * 20}deg) 
              scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: 
              translateZ(0) 
              rotateX(0) 
              rotateY(0) 
              rotateZ(0) 
              scale(1);
            opacity: 0.3;
          }
        }

        @keyframes flash {
          0%, 100% {
            opacity: 0;
          }
          30%, 50% {
            opacity: 0.6;
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg) scale(0);
          }
          to {
            transform: rotate(360deg) scale(3);
          }
        }
      `}</style>
    </div>
  );
}