// hooks/useViewport.js
import { useState, useEffect, useCallback } from 'react';
import { useRafThrottle } from './useRafThrottle';

export const useViewport = (chartRef) => {
  const [viewport, setViewport] = useState({ 
    left: 0, 
    top: 0, 
    width: 1000, 
    height: 600 
  });

  const scrollHandler = useCallback(() => {
    const el = chartRef.current;
    if (!el) return;
    setViewport({ 
      left: el.scrollLeft, 
      top: el.scrollTop, 
      width: el.clientWidth, 
      height: el.clientHeight 
    });
  }, [chartRef]);

  const onScrollRaf = useRafThrottle(scrollHandler);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    
    scrollHandler();
    el.addEventListener('scroll', onScrollRaf, { passive: true });
    window.addEventListener('resize', onScrollRaf);
    
    return () => {
      el.removeEventListener('scroll', onScrollRaf);
      window.removeEventListener('resize', onScrollRaf);
    };
  }, [onScrollRaf, scrollHandler, chartRef]);

  return viewport;
};