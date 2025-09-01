// HoverContext.jsx - Context for hover meta communication
import { createContext, useContext, useState } from 'react';

const HoverContext = createContext(null);

export function HoverProvider({ children }) {
  const [hoverMeta, setHoverMeta] = useState(null); // {entity,...} or null
  return (
    <HoverContext.Provider value={{ hoverMeta, setHoverMeta }}>
      {children}
    </HoverContext.Provider>
  );
}

export const useHover = () => {
  const context = useContext(HoverContext);
  if (!context) {
    throw new Error('useHover must be used within a HoverProvider');
  }
  return context;
};