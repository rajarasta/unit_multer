import React, { useState, useCallback } from 'react';
import LayoutSelector from './components/LayoutSelector';
import ResponsiveGridLayout from './components/ResponsiveGridLayout';
import HistoryPanel from './components/HistoryPanel';
import { useWorkspaceStore } from './store/useWorkspaceStore';
import { useAIAssistant } from './hooks/useAIAssistant';
import { useAudio } from './hooks/useAudio';
import { History, Zap, Volume2, VolumeX, Brain, Sparkles } from 'lucide-react';

const LAYOUT_CONFIGS = {
  '1': { rows: 1, cols: 1, total: 1 },
  '2x2': { rows: 2, cols: 2, total: 4 },
  '3x3': { rows: 3, cols: 3, total: 9 },
  '3x2': { rows: 3, cols: 2, total: 6 },
  '2x3': { rows: 2, cols: 3, total: 6 },
  '4x4': { rows: 4, cols: 4, total: 16 },
  '6x6': { rows: 6, cols: 6, total: 36 }
};

const DEFAULT_2X2_UNITS = [
  { 
    id: 'unit-1', 
    unitName: 'unit1', 
    contentType: 'picture', 
    dropdownValue: 'slika', 
    mode: 'input', 
    prompt: 'Fantastičan dvorac na oblacima, digital art' 
  },
  { 
    id: 'unit-2', 
    unitName: 'unit2', 
    contentType: 'chat', 
    dropdownValue: 'tekst', 
    mode: 'input', 
    prompt: 'Napiši Python skriptu za web scraping' 
  },
  { 
    id: 'unit-3', 
    unitName: 'unit3', 
    contentType: 'table', 
    dropdownValue: 'tablica', 
    mode: 'input', 
    prompt: 'Prikaži prodaju po regijama za Q3' 
  },
  { 
    id: 'unit-4', 
    unitName: 'unit4', 
    contentType: 'drawing', 
    dropdownValue: 'crtež', 
    mode: 'input', 
    prompt: 'Nacrtaj shemu mjenjača s 5 brzina' 
  }
];

const MultiSearchGrid = () => {
  const {
    showHistory,
    toggleHistory,
    audioEnabled,
    toggleAudio,
    isAIMode,
    toggleAIMode
  } = useWorkspaceStore();
  
  const { optimizeLayout, quickLayouts, getSuggestions, isProcessing } = useAIAssistant();
  const { ambient } = useAudio();
  
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // AI Mode effects
  React.useEffect(() => {
    if (isAIMode) {
      ambient.start();
    } else {
      ambient.stop();
    }
  }, [isAIMode, ambient]);

  const handleAIOptimize = useCallback(async (goal) => {
    await optimizeLayout(goal, { intensity: 'normal' });
  }, [optimizeLayout]);

  const handleHistoryToggle = useCallback(() => {
    setShowHistoryPanel(!showHistoryPanel);
  }, [showHistoryPanel]);

  return (
    <div className="flex h-full bg-gray-50 relative">
      {/* Main Workspace - Responsive Grid */}
      <div className="flex-1 relative">
        <ResponsiveGridLayout />

        {/* AI Show Controls - Floating */}
        <div className="absolute top-4 right-4 z-30 flex items-center space-x-2">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
              audioEnabled 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
            title={audioEnabled ? 'Disable audio' : 'Enable audio'}
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button
            onClick={toggleAIMode}
            className={`p-3 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
              isAIMode 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
            title={isAIMode ? 'Exit AI Mode' : 'Enter AI Mode'}
          >
            {isAIMode ? <Brain size={20} /> : <Sparkles size={20} />}
          </button>

          <button
            onClick={handleHistoryToggle}
            className={`p-3 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 ${
              showHistoryPanel 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
            title="Toggle history panel"
          >
            <History size={20} />
          </button>

          {isAIMode && (
            <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-3 py-2 rounded-lg shadow-sm">
              <Brain size={16} />
              <span className="text-sm font-medium">AI Mode</span>
              {isProcessing && (
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* AI Quick Actions - Bottom Right */}
        {isAIMode && (
          <div className="absolute bottom-4 right-4 z-30 flex flex-col space-y-2">
            {getSuggestions().map((suggestion, index) => (
              <button
                key={suggestion.action}
                onClick={() => handleAIOptimize(suggestion.label)}
                disabled={isProcessing}
                className="bg-white/90 hover:bg-white shadow-lg rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:text-purple-700 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="font-semibold">{suggestion.label}</div>
                <div className="text-xs text-gray-500 mt-1">{suggestion.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Layout Selector - Sidebar */}
      <div className="w-20 bg-white border-l border-gray-200 shadow-xl flex flex-col">
        <LayoutSelector 
          onLayoutChange={(layout) => quickLayouts[layout]?.()}
        />
      </div>

      {/* History Panel */}
      <HistoryPanel 
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
      />
    </div>
  );
};

export default MultiSearchGrid;