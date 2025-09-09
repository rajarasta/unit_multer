import React from 'react';

const LayoutSelector = ({ activeLayout = '2x2', layouts = [], onLayoutChange = () => {} }) => {
  // Defensive defaults
  const defaultLayouts = ['1', '2x2', '3x3', '3x2', '2x3', '4x4', '6x6'];
  const safeLayouts = layouts?.length > 0 ? layouts : defaultLayouts;
  const safeActiveLayout = activeLayout || '2x2';
  
  return (
    <div className="flex flex-col h-full p-2">      
      <div className="flex flex-col space-y-1 flex-1">
        {safeLayouts.map(layout => (
          <button
            key={layout}
            onClick={() => onLayoutChange(layout)}
            className={`layout-btn w-full text-xs p-1 rounded text-center font-medium transition-all 
              ${layout === safeActiveLayout 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
              }`}
            title={`Layout ${layout}`}
          >
            {layout}
          </button>
        ))}
      </div>

      {/* Compact Fusion Card */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <div 
          id="fusion-card" 
          className="w-full h-8 bg-gray-50 rounded flex items-center justify-center cursor-pointer hover:bg-indigo-50 transition-colors group"
          title="Fusion"
        >
          <div className="fusion-icon relative w-4 h-4 transition-transform duration-300 group-hover:rotate-45">
            <div className="absolute top-0 left-0 w-3 h-3 border-2 border-indigo-600 rounded-full transition-all duration-300" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-2 border-indigo-300 rounded-full transition-all duration-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutSelector;