// hooks/useRafThrottle.js
import { useRef, useCallback } from 'react';

export const useRafThrottle = (fn) => {
  const tickingRef = useRef(false);
  const lastArgsRef = useRef(null);
  
  return useCallback((...args) => {
    lastArgsRef.current = args;
    if (!tickingRef.current) {
      tickingRef.current = true;
      requestAnimationFrame(() => {
        tickingRef.current = false;
        fn(...(lastArgsRef.current || []));
      });
    }
  }, [fn]);
};