import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Move, Settings, Eye, Zap } from 'lucide-react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { animateEnter, animateModeMorph, createHoverAnimation } from '../utils/motion';
import { useAudioAnimation } from '../hooks/useAudio';
import ContentDisplay from './ContentDisplay';

const DROPDOWN_OPTIONS = ['Local1', 'Local2', 'Web1', 'Web2', 'Tekst', 'Slika', 'Tablica', 'Crtež'];
const MODEL_OPTIONS = ['Model A', 'Model B', 'Model C'];

const SearchUnit = ({ 
  config = {}, 
  input = {}, 
  response, 
  onInputChange = () => {}, 
  onResponseUpdate = () => {}, 
  onSubmit = () => {},
  onUnitize = () => {}
}) => {
  // Defensive defaults for config
  const safeConfig = {
    id: 'default-unit',
    unitName: 'unit',
    contentType: 'default',
    dropdownValue: 'tekst',
    mode: 'input',
    prompt: 'Enter query...',
    ...config
  };

  const { updateUnit } = useWorkspaceStore() || { updateUnit: () => {} };
  const { click = () => {}, modeSwitch = () => {}, playWithAnimation = () => {} } = useAudioAnimation() || {};
  
  const [inputValue, setInputValue] = useState(safeConfig.prompt || '');
  const [selectedSource, setSelectedSource] = useState(safeConfig.dropdownValue || 'tekst');
  const [selectedModel, setSelectedModel] = useState('Model A');
  const [isHovered, setIsHovered] = useState(false);
  
  const unitRef = useRef(null);
  const contentRef = useRef(null);

  const handleInputValueChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    onInputChange?.(config.id, 'value', value);
  };

  const handleSourceChange = (e) => {
    const value = e.target.value;
    setSelectedSource(value);
    onInputChange?.(config.id, 'aiSource', value);
  };

  const handleModelChange = (e) => {
    const value = e.target.value;
    setSelectedModel(value);
    onInputChange?.(config.id, 'model', value);
  };

  // Initialize animations and effects
  useEffect(() => {
    if (unitRef.current && animateEnter && createHoverAnimation) {
      try {
        animateEnter(unitRef.current, { delay: Math.random() * 0.3 });
        createHoverAnimation(unitRef.current);
      } catch (error) {
        console.warn('Animation initialization failed for unit:', safeConfig.id, error);
      }
    }
  }, [safeConfig.id]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    try {
      if (playWithAnimation && typeof playWithAnimation === 'function') {
        playWithAnimation('mode_switch', () => {
          if (animateModeMorph && contentRef.current) {
            animateModeMorph(contentRef.current, 'input', 'display');
          }
          if (updateUnit && safeConfig.id) {
            updateUnit(safeConfig.id, { mode: 'display', prompt: inputValue });
          }
        });
      }
      
      if (onSubmit && typeof onSubmit === 'function') {
        onSubmit(safeConfig.id);
      }
    } catch (error) {
      console.error('Submit failed for unit:', safeConfig.id, error);
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', safeConfig.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const connector = e.currentTarget.querySelector('.connector-btn');
    if (connector && e.target !== e.currentTarget) {
      connector.classList.add('dragging-over');
    }
  };

  const handleDragLeave = (e) => {
    const connector = e.currentTarget.querySelector('.connector-btn');
    if (connector) {
      connector.classList.remove('dragging-over');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const connector = e.currentTarget.querySelector('.connector-btn');
    if (connector) {
      connector.classList.remove('dragging-over');
    }
    
    const sourceUnitId = e.dataTransfer.getData('text/plain');
    const targetUnitId = safeConfig.id;
    
    if (sourceUnitId && targetUnitId && sourceUnitId !== targetUnitId) {
      try {
        if (onUnitize && typeof onUnitize === 'function') {
          onUnitize(sourceUnitId, targetUnitId);
        }
      } catch (error) {
        console.error('Unitize failed:', error);
      }
    }
  };

  return (
    <div 
      ref={unitRef}
      className="relative w-full h-full bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm transition-all duration-300 hover:shadow-lg group"
      id={safeConfig.id}
      data-grid-item={safeConfig.id}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Advanced Header with Drag Handle */}
      <div className="drag-handle flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 cursor-move hover:from-indigo-50 hover:to-indigo-100 transition-colors">
        <div className="flex items-center space-x-3">
          <Move size={14} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getModeColor(safeConfig.mode)}`} />
            <span className="text-sm font-semibold text-gray-700">{safeConfig.contentType}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {safeConfig.mode === 'display' && (
            <div
              className="connector-btn w-4 h-4 rounded-full bg-indigo-600 cursor-grab transition-all duration-200 hover:scale-110 shadow-md hover:shadow-lg animate-pulse"
              draggable="true"
              onDragStart={handleDragStart}
              title="Drag to fuse with other units"
            />
          )}
          <div className="text-xs text-gray-400 font-mono">
            {config.unitName}
          </div>
        </div>
      </div>

      {/* AI Source Controls - Enhanced */}
      <div className={`absolute top-14 left-3 z-20 flex items-center space-x-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
        <div className="relative">
          <select
            value={selectedSource}
            onChange={handleSourceChange}
            onClick={click}
            className="text-xs rounded-lg border-gray-300 bg-white/90 backdrop-blur shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent py-1.5 px-2 pr-6"
          >
            {DROPDOWN_OPTIONS.map(option => (
              <option key={option} value={option.toLowerCase()}>
                {option}
              </option>
            ))}
          </select>
          <Zap size={10} className="absolute right-1 top-1/2 transform -translate-y-1/2 text-indigo-500 pointer-events-none" />
        </div>
        
        <div className="relative">
          <select
            value={selectedModel}
            onChange={handleModelChange}
            onClick={click}
            className="text-xs rounded-lg border-gray-300 bg-white/90 backdrop-blur shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent py-1.5 px-2 pr-6"
          >
            {MODEL_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <Settings size={10} className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Content Area - Enhanced */}
      <div ref={contentRef} className="flex-grow w-full h-full flex items-center justify-center pt-8 px-4">
        {config.mode === 'input' ? (
          <div className="w-full max-w-lg">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex items-center bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus-within:border-indigo-500 focus-within:shadow-indigo-100">
                
                <button 
                  type="button"
                  className="p-3 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-all"
                  onClick={click}
                >
                  <Paperclip size={16} />
                </button>
                
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputValueChange}
                  placeholder="Unesite upit za AI..."
                  className="flex-grow bg-transparent border-0 focus:ring-0 text-gray-900 mx-3 text-sm outline-none placeholder-gray-400"
                />
                
                <button 
                  type="button"
                  className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  onClick={click}
                >
                  <Mic size={16} />
                </button>
                
                <button 
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="p-3 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full focus:outline-none transition-all duration-200 hover:scale-105 active:scale-95 shadow-md"
                >
                  <Send size={16} />
                </button>
              </div>
              
              {/* AI Status Indicator */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <Eye size={10} />
                  <span>Ready for AI processing</span>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <ContentDisplay 
            contentType={config.contentType}
            config={config}
          />
        )}
      </div>

      {/* Status Footer */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-gray-400">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(config.mode)}`} />
          <span>{config.mode === 'input' ? 'Awaiting input' : 'AI processed'}</span>
        </div>
        <span>Pictures and design from internet</span>
      </div>
    </div>
  );
};

// Utility functions
const getModeColor = (mode) => {
  return mode === 'input' 
    ? 'bg-amber-400 animate-pulse' 
    : 'bg-green-500';
};

const getStatusColor = (mode) => {
  return mode === 'input' 
    ? 'bg-amber-400' 
    : 'bg-green-500';
};

export default SearchUnit;