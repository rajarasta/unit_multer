/**
 * SchemaRenderer Component
 * Renders CSS-based schemas for different Schüco product types
 * Dynamically displays vrata, prozor, or fasada based on LLM analysis
 */

import React from 'react';

const VrataSchema = ({ systemName }) => (
  <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4">
    <div className="relative">
      {/* Door frame */}
      <div className="w-32 h-40 border-4 border-gray-700 bg-gray-200 rounded-sm relative">
        {/* Door handle */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-gray-800 rounded-full"></div>
        {/* Door panels */}
        <div className="absolute top-2 left-2 right-2 h-16 border border-gray-500 bg-gray-100"></div>
        <div className="absolute bottom-2 left-2 right-2 h-16 border border-gray-500 bg-gray-100"></div>
        {/* Hinges */}
        <div className="absolute left-0 top-4 w-1 h-3 bg-gray-800"></div>
        <div className="absolute left-0 bottom-4 w-1 h-3 bg-gray-800"></div>
      </div>
      <div className="text-center mt-2 text-xs font-medium text-gray-700">
        {systemName} - Aluminijska Vrata
      </div>
    </div>
  </div>
);

const ProzorSchema = ({ systemName }) => (
  <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4">
    <div className="relative">
      {/* Window frame */}
      <div className="w-32 h-28 border-4 border-gray-700 bg-blue-50 rounded-sm relative">
        {/* Window cross */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700 transform -translate-y-1/2"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-700 transform -translate-x-1/2"></div>
        {/* Window handles */}
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1 h-3 bg-gray-800"></div>
        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-1 h-3 bg-gray-800"></div>
        {/* Glass reflection effect */}
        <div className="absolute top-2 left-2 w-6 h-4 bg-white opacity-30 rounded"></div>
      </div>
      <div className="text-center mt-2 text-xs font-medium text-gray-700">
        {systemName} - Aluminijski Prozor
      </div>
    </div>
  </div>
);

const FasadaSchema = ({ systemName }) => (
  <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4">
    <div className="relative">
      {/* Facade system */}
      <div className="w-32 h-40 border-2 border-gray-600 bg-gray-300 rounded-sm relative">
        {/* Horizontal elements */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gray-700"></div>
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-700"></div>
        <div className="absolute top-16 left-0 right-0 h-0.5 bg-gray-700"></div>
        <div className="absolute top-24 left-0 right-0 h-0.5 bg-gray-700"></div>
        <div className="absolute top-32 left-0 right-0 h-0.5 bg-gray-700"></div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700"></div>
        
        {/* Vertical elements */}
        <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-gray-700"></div>
        <div className="absolute top-0 bottom-0 left-8 w-0.5 bg-gray-600"></div>
        <div className="absolute top-0 bottom-0 left-16 w-0.5 bg-gray-600"></div>
        <div className="absolute top-0 bottom-0 left-24 w-0.5 bg-gray-600"></div>
        <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-gray-700"></div>
        
        {/* Glass panels with different tints */}
        <div className="absolute top-1 left-1 w-7 h-7 bg-blue-100 opacity-70"></div>
        <div className="absolute top-9 left-1 w-7 h-7 bg-blue-50 opacity-70"></div>
        <div className="absolute top-17 left-1 w-7 h-7 bg-blue-100 opacity-70"></div>
        
        <div className="absolute top-1 left-9 w-7 h-7 bg-blue-50 opacity-70"></div>
        <div className="absolute top-9 left-9 w-7 h-7 bg-blue-100 opacity-70"></div>
        <div className="absolute top-17 left-9 w-7 h-7 bg-blue-50 opacity-70"></div>
      </div>
      <div className="text-center mt-2 text-xs font-medium text-gray-700">
        {systemName} - Fasadni Sistem
      </div>
    </div>
  </div>
);

const SchemaRenderer = ({ productType, systemName = 'Schüco System' }) => {
  const renderSchema = () => {
    switch (productType?.toLowerCase()) {
      case 'vrata':
      case 'door':
        return <VrataSchema systemName={systemName} />;
      case 'prozor':
      case 'window':
        return <ProzorSchema systemName={systemName} />;
      case 'fasada':
      case 'facade':
        return <FasadaSchema systemName={systemName} />;
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 border-2 border-dashed border-gray-400 rounded flex items-center justify-center">
                <span className="text-2xl text-gray-400">?</span>
              </div>
              <div className="text-xs font-medium text-gray-500">
                {systemName}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Tip proizvoda nije prepoznat
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full">
      {renderSchema()}
    </div>
  );
};

export default SchemaRenderer;