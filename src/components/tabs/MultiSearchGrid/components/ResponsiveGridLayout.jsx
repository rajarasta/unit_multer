import React, { useEffect, useRef, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { applyLayoutWithFlip, animateStaggerIn, createHoverAnimation } from '../utils/motion';
import { useAudio } from '../hooks/useAudio';
import SearchUnit from './SearchUnit';
import UnitizerComponent from './UnitizerComponent';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const MainWorkspace = () => {
  const {
    layouts,
    units,
    setLayout,
    setLayouts,
    setCurrentBreakpoint,
    currentBreakpoint,
    breakpoints,
    cols,
    isUnitized,
    unitizedState
  } = useWorkspaceStore();

  const { layoutChange, dragStart, dragEnd } = useAudio();
  const gridRef = useRef(null);
  const unitsRef = useRef({});

  // Initialize grid entrance animations
  useEffect(() => {
    // Defensive check - ensure gridRef exists and has DOM methods
    if (gridRef.current && typeof gridRef.current.querySelectorAll === 'function') {
      const gridItems = gridRef.current.querySelectorAll('[data-grid-item]');
      if (gridItems && gridItems.length > 0) {
        try {
          animateStaggerIn(Array.from(gridItems), {
            stagger: 0.1,
            duration: 0.6
          });

          // Setup hover animations for each unit
          gridItems.forEach(item => {
            if (item && createHoverAnimation) {
              createHoverAnimation(item);
            }
          });
        } catch (error) {
          console.warn('Animation initialization failed:', error);
        }
      }
    }
  }, [layouts]);

  // Handle layout changes with FLIP animation
  const handleLayoutChange = useCallback((newLayout, allLayouts) => {
    // Defensive checks
    if (!newLayout || !setLayout || !setLayouts) {
      console.warn('Layout change aborted - missing required parameters');
      return;
    }

    const updateFunction = () => {
      try {
        setLayout(newLayout, currentBreakpoint || 'lg');
        if (allLayouts) {
          setLayouts(allLayouts);
        }
      } catch (error) {
        console.error('Layout update failed:', error);
      }
    };

    // Apply FLIP animation for smooth transitions
    if (applyLayoutWithFlip) {
      applyLayoutWithFlip(updateFunction, {
        duration: 0.8,
        ease: "power3.inOut",
        stagger: 0.05
      }).catch(error => {
        console.warn('FLIP animation failed, applying update directly:', error);
        updateFunction();
      });
    } else {
      updateFunction();
    }

    // Audio feedback
    if (layoutChange && typeof layoutChange === 'function') {
      try {
        layoutChange();
      } catch (error) {
        console.warn('Audio feedback failed:', error);
      }
    }
  }, [currentBreakpoint, setLayout, setLayouts, layoutChange, applyLayoutWithFlip]);

  // Handle breakpoint changes
  const handleBreakpointChange = useCallback((breakpoint, cols) => {
    if (setCurrentBreakpoint && breakpoint) {
      try {
        setCurrentBreakpoint(breakpoint);
      } catch (error) {
        console.error('Breakpoint change failed:', error);
      }
    }
  }, [setCurrentBreakpoint]);

  // Handle drag events with audio feedback
  const handleDragStart = useCallback(() => {
    if (dragStart && typeof dragStart === 'function') {
      try {
        dragStart();
      } catch (error) {
        console.warn('Drag start audio failed:', error);
      }
    }
  }, [dragStart]);

  const handleDragStop = useCallback(() => {
    if (dragEnd && typeof dragEnd === 'function') {
      try {
        dragEnd();
      } catch (error) {
        console.warn('Drag end audio failed:', error);
      }
    }
  }, [dragEnd]);

  // Render unitized layout or standard grid
  const renderContent = () => {
    if (isUnitized) {
      return renderUnitizedLayout();
    }
    return renderStandardGrid();
  };

  const renderUnitizedLayout = () => {
    if (unitizedState.fused.length === 3) {
      // Full fusion - single component
      return (
        <div className="w-full h-full p-4">
          <div
            data-grid-item="unitizer-fusion"
            className="w-full h-full bg-white shadow-lg rounded-xl overflow-hidden"
          >
            <UnitizerComponent 
              fusedUnits={unitizedState.fused}
              onUnitize={() => {}} // Handle unitization
            />
          </div>
        </div>
      );
    } else {
      // Partial fusion - 2x1 layout
      return (
        <div className="grid grid-cols-2 gap-4 h-full p-4">
          <div className="flex flex-col gap-4">
            {unitizedState.remaining.map(unit => (
              <div
                key={unit.id}
                data-grid-item={unit.id}
                className="flex-1 bg-white shadow-lg rounded-xl overflow-hidden"
                ref={el => unitsRef.current[unit.id] = el}
              >
                <SearchUnit config={unit} />
              </div>
            ))}
          </div>
          <div
            data-grid-item="unitizer-partial"
            className="bg-white shadow-lg rounded-xl overflow-hidden"
          >
            <UnitizerComponent 
              fusedUnits={unitizedState.fused}
              onUnitize={() => {}} // Handle unitization
            />
          </div>
        </div>
      );
    }
  };

  const renderStandardGrid = () => {
    const currentLayout = layouts[currentBreakpoint] || layouts.lg || [];
    
    return (
      <ResponsiveGridLayout
        ref={gridRef}
        className="layout"
        layouts={layouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={30}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        draggableHandle=".drag-handle"
        resizeHandles={['se']}
        // Event handlers with audio feedback
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        // Performance optimizations
        useCSSTransforms={true}
        measureBeforeMount={false}
        // Responsive settings
        compactType="vertical"
        preventCollision={false}
      >
        {currentLayout.map((item) => {
          const unit = units[item.i];
          if (!unit) return null;

          return (
            <div
              key={item.i}
              data-grid-item={item.i}
              className="bg-white shadow-lg rounded-xl overflow-hidden transition-shadow duration-300 hover:shadow-xl"
              ref={el => unitsRef.current[item.i] = el}
            >
              <SearchUnit config={unit} />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    );
  };

  return (
    <div className="w-full h-full bg-gray-50 overflow-hidden">
      {renderContent()}
    </div>
  );
};

export default MainWorkspace;