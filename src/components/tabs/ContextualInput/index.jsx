import React, { useState } from 'react';
import ContextualInput from './ContextualInput';
import ContextualInputEnhanced from './ContextualInputEnhanced';
import ContextualInputUnified from './ContextualInputUnified';
import ContextualInputGooey from './ContextualInputGooey';
import ContextualInputProtrusion from './ContextualInputProtrusion';

const ContextualInputTab = () => {
  const [activeVersion, setActiveVersion] = useState('protrusion');
  
  const mockAgent = {
    isListening: false,
    startListening: () => console.log('Started listening'),
    stopListening: () => console.log('Stopped listening')
  };

  const handleCommandSubmit = (command, context) => {
    console.log('Command submitted:', { command, context });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-6 border-b border-theme">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Contextual Input</h1>
            <p className="text-secondary mt-2">Advanced contextual AI input system with dynamic context switching</p>
          </div>
          
          <div className="flex bg-background/50 rounded-lg p-1">
            <button
              onClick={() => setActiveVersion('original')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeVersion === 'original' 
                  ? 'bg-accent text-white' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setActiveVersion('enhanced')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeVersion === 'enhanced' 
                  ? 'bg-accent text-white' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Enhanced
            </button>
            <button
              onClick={() => setActiveVersion('unified')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeVersion === 'unified' 
                  ? 'bg-accent text-white' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => setActiveVersion('gooey')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeVersion === 'gooey' 
                  ? 'bg-accent text-white' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Gooey
            </button>
            <button
              onClick={() => setActiveVersion('protrusion')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeVersion === 'protrusion' 
                  ? 'bg-accent text-white' 
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Protrusion
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-4xl space-y-8">
          {activeVersion === 'original' ? (
            <ContextualInput 
              agent={mockAgent}
              onCommandSubmit={handleCommandSubmit}
            />
          ) : activeVersion === 'enhanced' ? (
            <ContextualInputEnhanced 
              agent={mockAgent}
              onCommandSubmit={handleCommandSubmit}
            />
          ) : activeVersion === 'unified' ? (
            <ContextualInputUnified 
              agent={mockAgent}
              onCommandSubmit={handleCommandSubmit}
            />
          ) : activeVersion === 'gooey' ? (
            <ContextualInputGooey 
              agent={mockAgent}
              onCommandSubmit={handleCommandSubmit}
            />
          ) : (
            <ContextualInputProtrusion 
              agent={mockAgent}
              onCommandSubmit={handleCommandSubmit}
            />
          )}
          
          <div className="text-center text-secondary">
            <h3 className="text-lg font-semibold mb-2">
              {activeVersion === 'original' ? 'Original Version' : 
               activeVersion === 'enhanced' ? 'Enhanced Version' : 
               activeVersion === 'unified' ? 'Unified Version' :
               activeVersion === 'gooey' ? 'Gooey Version' :
               'Protrusion Version'}
            </h3>
            <p className="text-sm">
              {activeVersion === 'original' 
                ? 'Click on the context button to expand/narrow the search scope with side buttons'
                : activeVersion === 'enhanced'
                ? 'Click on the context button to reveal the contextual cloud with 3-level navigation'
                : activeVersion === 'unified'
                ? 'Focus the input to reveal seamless unified contextual picker with :focus-within CSS animation'
                : activeVersion === 'gooey'
                ? 'Focus the input to reveal organic gooey morphing effect with SVG filter blur and sharp white border ring'
                : 'Focus the input to reveal shape morphing with left-side protrusion "mini cube" growing out using SVG path animation'
              }
            </p>
            <p className="text-xs mt-2">Use voice commands or type your query</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextualInputTab;