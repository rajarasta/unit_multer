import React, { useState } from 'react';

// Trajanje animacije u milisekundama
const ANIMATION_DURATION = 2000;

export default function App() {
  const [theme, setTheme] = useState('day');
  const [isAnimating, setIsAnimating] = useState(false);
  const [filterSeed, setFilterSeed] = useState(1);

  const themes = {
    day: {
      outerBgClass: 'bg-slate-900',
      innerBg: 'bg-gradient-to-br from-orange-300 via-pink-400 to-sky-400',
      textColor: 'text-white',
      text: 'Svijetlo. Toplina. Energija dana nosi sve pred sobom.',
    },
    night: {
      outerBgClass: 'bg-slate-900',
      innerBg: 'bg-gradient-to-br from-indigo-800 via-purple-700 to-blue-900',
      textColor: 'text-white',
      text: 'Tišina. Mir. Zvijezde ispisuju priče na tamnom platnu.',
    },
  };

  const handleThemeChange = () => {
    if (isAnimating) return;

    setIsAnimating(true);
    setFilterSeed(Math.random() * 1000);
    
    const nextTheme = theme === 'day' ? 'night' : 'day';
    
    setTimeout(() => {
      setTheme(nextTheme);
    }, ANIMATION_DURATION / 2);
    
    setTimeout(() => {
      setIsAnimating(false);
    }, ANIMATION_DURATION);
  };

  const currentTheme = themes[theme];

  return (
    <div
      className={`w-full h-screen flex items-center justify-center font-sans overflow-hidden ${currentTheme.outerBgClass}`}
    >
      <div
        onClick={handleThemeChange}
        className="relative w-11/12 max-w-2xl cursor-pointer rounded-2xl shadow-2xl"
        style={{ 
          aspectRatio: '16 / 9',
        }}
      >
        {/* SVG s multiple filterima za kaotične valove */}
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            {/* Filter 1: Sitni brzi valovi */}
            <filter id="micro-waves">
              <feTurbulence 
                type="fractalNoise" 
                baseFrequency="0.15 0.2" 
                numOctaves="4" 
                seed={filterSeed}
                result="turbulence1"
              >
                <animate 
                  attributeName="baseFrequency" 
                  dur="0.5s" 
                  values="0.15 0.2;0.25 0.3;0.15 0.2" 
                  repeatCount="indefinite" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
                <animate 
                  attributeName="seed" 
                  dur={`${ANIMATION_DURATION}ms`} 
                  values={`${filterSeed};${filterSeed + 500};${filterSeed}`}
                  repeatCount="1" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
              </feTurbulence>
              
              <feDisplacementMap 
                in="SourceGraphic" 
                in2="turbulence1" 
                scale="0"
                xChannelSelector="R"
                yChannelSelector="G"
              >
                <animate 
                  attributeName="scale" 
                  dur={`${ANIMATION_DURATION}ms`} 
                  values="0;15;8;20;5;12;0" 
                  repeatCount="1" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
              </feDisplacementMap>
            </filter>

            {/* Filter 2: Srednji interferentni valovi */}
            <filter id="interference-waves">
              <feTurbulence 
                type="turbulence" 
                baseFrequency="0.08 0.12" 
                numOctaves="3" 
                seed={filterSeed + 100}
                result="turbulence2"
              >
                <animate 
                  attributeName="baseFrequency" 
                  dur="0.8s" 
                  values="0.08 0.12;0.18 0.22;0.08 0.12" 
                  repeatCount="indefinite" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
              </feTurbulence>
              
              <feDiffuseLighting 
                in="turbulence2" 
                lightingColor="white" 
                surfaceScale="0"
                result="light"
              >
                <feDistantLight azimuth="45" elevation="60" />
                <animate 
                  attributeName="surfaceScale" 
                  dur={`${ANIMATION_DURATION}ms`} 
                  values="0;5;15;8;20;10;0" 
                  repeatCount="1" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
              </feDiffuseLighting>
              
              <feComposite 
                in="SourceGraphic" 
                in2="light" 
                operator="arithmetic" 
                k1="0" 
                k2="0.5" 
                k3="0.5" 
                k4="0" 
                result="lit"
              />
              
              <feDisplacementMap 
                in="lit" 
                in2="turbulence2" 
                scale="0"
              >
                <animate 
                  attributeName="scale" 
                  dur={`${ANIMATION_DURATION}ms`} 
                  values="0;25;10;30;15;20;0" 
                  repeatCount="1" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
              </feDisplacementMap>
            </filter>

            {/* Filter 3: Buzz vibracija */}
            <filter id="buzz-filter">
              <feTurbulence 
                type="fractalNoise" 
                baseFrequency="0.5 0.5" 
                numOctaves="1" 
                seed={filterSeed + 200}
                result="turbulence3"
              >
                <animate 
                  attributeName="seed" 
                  dur="0.05s" 
                  values={`${filterSeed};${filterSeed + 10};${filterSeed}`}
                  repeatCount="indefinite" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
              </feTurbulence>
              
              <feDisplacementMap 
                in="SourceGraphic" 
                in2="turbulence3" 
                scale="0"
              >
                <animate 
                  attributeName="scale" 
                  dur="0.1s" 
                  values="0;2;0" 
                  repeatCount="indefinite" 
                  begin={isAnimating ? '0s' : 'indefinite'}
                />
              </feDisplacementMap>
            </filter>

            {/* Clip path za zaobljene rubove */}
            <clipPath id="rounded-clip">
              <rect width="100%" height="100%" rx="16" />
            </clipPath>
            
            {/* Gradient maske za dodatnu dubinu */}
            <radialGradient id="depth-gradient">
              <stop offset="0%" stopColor="white" stopOpacity="1"/>
              <stop offset="70%" stopColor="white" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="white" stopOpacity="0.6"/>
            </radialGradient>
          </defs>

          {/* Glavni sloj s micro valovima */}
          <g 
            clipPath="url(#rounded-clip)"
            style={{ 
              filter: isAnimating ? 'url(#micro-waves)' : 'none',
            }}
          >
            <foreignObject width="100%" height="100%">
              <div className="w-full h-full relative">
                <div
                  className={`w-full h-full transition-all duration-1000 ${currentTheme.innerBg}`}
                />
              </div>
            </foreignObject>
          </g>

          {/* Interferentni sloj */}
          <g 
            clipPath="url(#rounded-clip)"
            style={{ 
              filter: isAnimating ? 'url(#interference-waves)' : 'none',
              opacity: isAnimating ? 0.8 : 0,
              transition: 'opacity 0.5s ease-in-out',
            }}
          >
            <foreignObject width="100%" height="100%">
              <div className="w-full h-full">
                <div
                  className="w-full h-full"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, rgba(255,100,200,0.3), transparent 40%), radial-gradient(circle at 70% 70%, rgba(100,200,255,0.3), transparent 40%)',
                  }}
                />
              </div>
            </foreignObject>
          </g>

          {/* Buzz vibracija sloj */}
          <g 
            clipPath="url(#rounded-clip)"
            style={{ 
              filter: isAnimating ? 'url(#buzz-filter)' : 'none',
              opacity: isAnimating ? 0.5 : 0,
              transition: 'opacity 0.3s ease-in-out',
              mixBlendMode: 'screen',
            }}
          >
            <foreignObject width="100%" height="100%">
              <div className="w-full h-full">
                <div
                  className="w-full h-full"
                  style={{
                    background: 'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)',
                  }}
                />
              </div>
            </foreignObject>
          </g>

          {/* Tekstualni sloj - izvan filtera da ostane čitljiv */}
          <foreignObject width="100%" height="100%" clipPath="url(#rounded-clip)">
            <div className="w-full h-full relative pointer-events-none">
              <p className={`
                absolute inset-0 flex items-center justify-center 
                p-8 md:p-12 text-xl md:text-2xl font-light text-center leading-relaxed 
                transition-all duration-500
                ${currentTheme.textColor}
              `}
              style={{
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                transform: isAnimating ? 'scale(1.02)' : 'scale(1)',
                animation: isAnimating ? 'textBuzz 0.1s linear infinite' : 'none',
              }}
              >
                {isAnimating ? 'BZZZZZ...' : currentTheme.text}
              </p>
            </div>
          </foreignObject>
        </svg>

        {/* CSS animacija za tekst */}
        <style jsx>{`
          @keyframes textBuzz {
            0%, 100% { transform: translateX(0) translateY(0) scale(1.02); }
            25% { transform: translateX(-0.5px) translateY(0.5px) scale(1.02); }
            50% { transform: translateX(0.5px) translateY(-0.5px) scale(1.02); }
            75% { transform: translateX(-0.5px) translateY(-0.5px) scale(1.02); }
          }
        `}</style>
      </div>
    </div>
  );
}