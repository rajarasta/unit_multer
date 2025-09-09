import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

const initialLayout = [
  { i: 'unit-1', x: 0, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
  { i: 'unit-2', x: 6, y: 0, w: 6, h: 8, minW: 3, minH: 4 },
  { i: 'unit-3', x: 0, y: 8, w: 6, h: 8, minW: 3, minH: 4 },
  { i: 'unit-4', x: 6, y: 8, w: 6, h: 8, minW: 3, minH: 4 }
];

const initialUnits = {
  'unit-1': {
    id: 'unit-1',
    unitName: 'unit1',
    contentType: 'picture',
    dropdownValue: 'slika',
    mode: 'input',
    prompt: 'Fantastičan dvorac na oblacima, digital art',
    aiSource: 'slika',
    model: 'Model A'
  },
  'unit-2': {
    id: 'unit-2',
    unitName: 'unit2',
    contentType: 'chat',
    dropdownValue: 'tekst',
    mode: 'input',
    prompt: 'Napiši Python skriptu za web scraping',
    aiSource: 'tekst',
    model: 'Model B'
  },
  'unit-3': {
    id: 'unit-3',
    unitName: 'unit3',
    contentType: 'table',
    dropdownValue: 'tablica',
    mode: 'input',
    prompt: 'Prikaži prodaju po regijama za Q3',
    aiSource: 'local1',
    model: 'Model A'
  },
  'unit-4': {
    id: 'unit-4',
    unitName: 'unit4',
    contentType: 'drawing',
    dropdownValue: 'crtež',
    mode: 'input',
    prompt: 'Nacrtaj shemu mjenjača s 5 brzina',
    aiSource: 'web1',
    model: 'Model C'
  }
};

const initialBreakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const initialCols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 };

export const useWorkspaceStore = create(
  persist(
    temporal(
      (set, get) => ({
        // Grid Layout State
        layout: initialLayout,
        layouts: { lg: initialLayout },
        breakpoints: initialBreakpoints,
        cols: initialCols,
        currentBreakpoint: 'lg',
        
        // Units State
        units: initialUnits,
        
        // Fusion State
        isUnitized: false,
        unitizedState: {
          fused: [],
          remaining: []
        },
        
        // AI Show State
        isAIMode: false,
        showHistory: false,
        audioEnabled: true,
        
        // Actions
        setLayout: (newLayout, breakpoint = 'lg') => {
          set((state) => ({
            layout: breakpoint === state.currentBreakpoint ? newLayout : state.layout,
            layouts: {
              ...state.layouts,
              [breakpoint]: newLayout
            }
          }));
        },
        
        setLayouts: (newLayouts) => set({ layouts: newLayouts }),
        
        setCurrentBreakpoint: (breakpoint) => set({ currentBreakpoint: breakpoint }),
        
        updateUnit: (unitId, updates) => {
          set((state) => ({
            units: {
              ...state.units,
              [unitId]: {
                ...state.units[unitId],
                ...updates
              }
            }
          }));
        },
        
        updateUnitMode: (unitId, mode) => {
          get().updateUnit(unitId, { mode });
        },
        
        addUnit: (unit, layoutItem) => {
          set((state) => ({
            units: { ...state.units, [unit.id]: unit },
            layout: [...state.layout, layoutItem],
            layouts: {
              ...state.layouts,
              [state.currentBreakpoint]: [...state.layouts[state.currentBreakpoint], layoutItem]
            }
          }));
        },
        
        removeUnit: (unitId) => {
          set((state) => {
            const newUnits = { ...state.units };
            delete newUnits[unitId];
            
            return {
              units: newUnits,
              layout: state.layout.filter(item => item.i !== unitId),
              layouts: Object.fromEntries(
                Object.entries(state.layouts).map(([bp, layout]) => [
                  bp,
                  layout.filter(item => item.i !== unitId)
                ])
              )
            };
          });
        },
        
        // Fusion Actions
        unitize: (sourceId, targetId) => {
          set((state) => {
            if (targetId === 'unitizer-component') {
              // Adding third unit to existing fusion
              const newUnit = state.unitizedState.remaining.find(u => u.id === sourceId);
              if (newUnit) {
                return {
                  unitizedState: {
                    fused: [...state.unitizedState.fused, newUnit],
                    remaining: state.unitizedState.remaining.filter(u => u.id !== sourceId)
                  }
                };
              }
            } else {
              // Creating first fusion from 2 units
              const fusedIds = [sourceId, targetId];
              return {
                isUnitized: true,
                unitizedState: {
                  fused: Object.values(state.units).filter(u => fusedIds.includes(u.id)),
                  remaining: Object.values(state.units).filter(u => !fusedIds.includes(u.id))
                }
              };
            }
            return state;
          });
        },
        
        resetFusion: () => {
          set({
            isUnitized: false,
            unitizedState: { fused: [], remaining: [] }
          });
        },
        
        // AI Show Actions
        toggleAIMode: () => set((state) => ({ isAIMode: !state.isAIMode })),
        
        toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),
        
        toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),
        
        // AI Layout Optimization
        applyAILayout: (newLayout, description = 'AI Optimization') => {
          // This will be called with FLIP animation from the motion system
          set((state) => ({
            layout: newLayout,
            layouts: {
              ...state.layouts,
              [state.currentBreakpoint]: newLayout
            }
          }));
        },
        
        // Preset Layouts
        applyPresetLayout: (presetName) => {
          const presets = {
            'focus': [
              { i: 'unit-1', x: 0, y: 0, w: 12, h: 12 }, // Full focus
            ],
            'split': [
              { i: 'unit-1', x: 0, y: 0, w: 6, h: 16 },
              { i: 'unit-2', x: 6, y: 0, w: 6, h: 16 },
            ],
            'dashboard': [
              { i: 'unit-1', x: 0, y: 0, w: 8, h: 8 },
              { i: 'unit-2', x: 8, y: 0, w: 4, h: 8 },
              { i: 'unit-3', x: 0, y: 8, w: 4, h: 8 },
              { i: 'unit-4', x: 4, y: 8, w: 8, h: 8 },
            ],
            'mosaic': [
              { i: 'unit-1', x: 0, y: 0, w: 3, h: 8 },
              { i: 'unit-2', x: 3, y: 0, w: 3, h: 8 },
              { i: 'unit-3', x: 6, y: 0, w: 3, h: 8 },
              { i: 'unit-4', x: 9, y: 0, w: 3, h: 8 },
            ]
          };
          
          const newLayout = presets[presetName] || presets.dashboard;
          get().applyAILayout(newLayout, `Applied ${presetName} preset`);
        }
      }),
      {
        limit: 50, // Keep last 50 history states
        equality: (pastState, currentState) => 
          JSON.stringify(pastState.layout) === JSON.stringify(currentState.layout) &&
          JSON.stringify(pastState.units) === JSON.stringify(currentState.units)
      }
    ),
    {
      name: 'ai-show-workspace-storage',
      partialize: (state) => ({
        layout: state.layout,
        layouts: state.layouts,
        units: state.units,
        isUnitized: state.isUnitized,
        unitizedState: state.unitizedState,
        audioEnabled: state.audioEnabled
      })
    }
  )
);

export const useWorkspaceHistory = () => {
  const { undo, redo, futureStates, pastStates, clear } = useWorkspaceStore.temporal.getState();
  
  return {
    undo,
    redo,
    clear,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
    historyLength: pastStates.length,
    futureLength: futureStates.length
  };
};