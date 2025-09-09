/**
 * IRIS3 Header Component
 * Contains microphone, transfer button, and glow settings
 * Local to IRIS3 tab - UI only, no business logic
 */

import React from 'react';
import { Mic, MicOff, Send, Command, Palette, Sliders } from 'lucide-react';
import { cycleTheme } from '../../../../theme/manager';

const Header = ({
  // Voice controls
  isListening = false,
  onToggleListening = () => {},
  
  // Transfer functionality  
  canTransfer = false,
  onTransfer = () => {},
  
  // Glow settings
  glowEnabled = true,
  glowIntensity = 1,
  glowDurationMs = 200,
  showGlowSettings = false,
  onToggleGlowSettings = () => {},
  onGlowEnabledChange = () => {},
  onGlowIntensityChange = () => {},
  onGlowDurationChange = () => {}
}) => {
  return (
    <header className="flex justify-between items-center p-4 px-8">
      <div className="flex items-center gap-4">
        <Command className="text-accent w-6 h-6"/>
        <h1 className="text-xl font-bold text-primary">IRI S3 Workspace</h1>
        <span className="input-bg px-3 py-1 rounded-full text-sm text-secondary border border-theme">
          Intelligent Resource Integration
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Microphone Button */}
        <button 
          onClick={onToggleListening}
          className={`panel p-2 rounded-full text-white transition shadow-md ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-accent hover:bg-accent/80'
          }`}
          title={isListening ? 'Zaustavi slušanje' : 'Započni slušanje'}
        >
          {isListening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        
        {/* Transfer Button */}
        <button 
          onClick={onTransfer}
          className={`panel p-2 rounded-full transition shadow-md ${
            canTransfer
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-400 text-gray-600 cursor-not-allowed'
          }`}
          title={canTransfer ? 'Prenesi analizu' : 'Nema podataka za prenos'}
          disabled={!canTransfer}
        >
          <Send size={18} />
        </button>
        
        {/* Glow Settings */}
        <div className="relative">
          <button 
            onClick={onToggleGlowSettings}
            className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" 
            title="Glow postavke"
          >
            <Sliders size={18}/>
          </button>
          
          {showGlowSettings && (
            <div className="absolute right-0 mt-2 w-64 panel p-3 border border-theme rounded-xl shadow-xl z-40">
              <div className="text-sm font-semibold text-primary mb-2">Ambient Glow</div>
              
              <label className="flex items-center justify-between text-sm mb-2">
                <span className="text-secondary">Uključen</span>
                <input 
                  type="checkbox" 
                  checked={glowEnabled} 
                  onChange={(e) => onGlowEnabledChange(e.target.checked)} 
                />
              </label>
              
              <div className="mb-2">
                <div className="text-xs text-secondary mb-1">
                  Intenzitet: <span className="font-mono">{glowIntensity.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={glowIntensity} 
                  onChange={(e) => onGlowIntensityChange(parseFloat(e.target.value))} 
                  className="w-full" 
                />
              </div>
              
              <div className="mb-2">
                <div className="text-xs text-secondary mb-1">
                  Trajanje: <span className="font-mono">{glowDurationMs}ms</span>
                </div>
                <input 
                  type="range" 
                  min="100" 
                  max="800" 
                  step="25" 
                  value={glowDurationMs} 
                  onChange={(e) => onGlowDurationChange(parseInt(e.target.value))} 
                  className="w-full" 
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Theme Toggle */}
        <button 
          onClick={() => cycleTheme()} 
          className="panel p-2 rounded-full text-subtle hover:text-primary transition shadow-md" 
          title="Promijeni stil"
        >
          <Palette size={20}/>
        </button>
      </div>
    </header>
  );
};

export default Header;