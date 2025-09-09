import React, { useEffect, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import SearchUnit from './SearchUnit';
import UnitizerComponent from './UnitizerComponent';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { applyLayoutWithFlip, animateStaggerIn } from '../utils/motion';
import { useAudio } from '../hooks/useAudio';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const SearchGrid = ({ 
  layout,
  layoutConfig,
  inputs, 
  responses,
  isUnitized,
  unitizedState,
  unitConfigs2x2,
  onInputChange, 
  onResponseUpdate,
  onUnitSubmit,
  onUnitize
}) => {
  const renderGrid = () => {
    if (layout === '2x2' && isUnitized) {
      if (unitizedState.fused.length === 3) {
        // 1x1 grid for 3-unit fusion
        return (
          <div className="w-full h-full">
            <UnitizerComponent 
              fusedUnits={unitizedState.fused}
              onUnitize={onUnitize}
            />
          </div>
        );
      } else {
        // 2x1 grid for 2-unit fusion + remaining units
        return (
          <div className="grid grid-cols-2 grid-rows-1 gap-2 h-full">
            {/* Remaining units container */}
            <div className="flex flex-col gap-2">
              {unitizedState.remaining.map(config => (
                <SearchUnit
                  key={config.id}
                  config={config}
                  input={inputs[config.id]}
                  response={responses[config.id]}
                  onInputChange={onInputChange}
                  onResponseUpdate={onResponseUpdate}
                  onSubmit={onUnitSubmit}
                  onUnitize={onUnitize}
                />
              ))}
            </div>
            {/* Unitizer component */}
            <UnitizerComponent 
              fusedUnits={unitizedState.fused}
              onUnitize={onUnitize}
            />
          </div>
        );
      }
    } else {
      // Standard grid layout
      const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${layoutConfig.cols}, 1fr)`,
        gridTemplateRows: `repeat(${layoutConfig.rows}, 1fr)`,
        gap: '0.5rem',
        height: '100%',
        overflow: 'auto',
        scrollBehavior: 'smooth'
      };

      let units = [];
      
      if (layout === '2x2') {
        units = unitConfigs2x2;
      } else {
        // Generate default units for other layouts
        for (let i = 0; i < layoutConfig.total; i++) {
          units.push({
            id: `input-pill-${i}`,
            unitName: `unit${i + 1}`,
            contentType: 'default',
            dropdownValue: 'tekst',
            mode: 'input',
            prompt: 'Unesite upit...'
          });
        }
      }

      return (
        <div style={gridStyle}>
          {units.map(config => (
            <SearchUnit
              key={config.id}
              config={config}
              input={inputs[config.id]}
              response={responses[config.id]}
              onInputChange={onInputChange}
              onResponseUpdate={onResponseUpdate}
              onSubmit={onUnitSubmit}
              onUnitize={onUnitize}
            />
          ))}
        </div>
      );
    }
  };

  return (
    <div className="w-full h-full transition-all duration-300 ease-in-out overflow-auto">
      {renderGrid()}
    </div>
  );
};

export default SearchGrid;