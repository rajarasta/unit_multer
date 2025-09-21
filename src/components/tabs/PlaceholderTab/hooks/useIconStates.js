import { useState, useEffect, useCallback } from 'react';

const useIconStates = () => {
  // Multi-phase icon states for dynamic functionality
  const [iconStates, setIconStates] = useState({});
  const [clickCounts, setClickCounts] = useState({});
  const [focusedUnitId, setFocusedUnitId] = useState(null);

  // Fusion icon states for multi-unit processing
  const [fusionIconStates, setFusionIconStates] = useState({});
  const [fusionClickCounts, setFusionClickCounts] = useState({});
  const [focusedFusionId, setFocusedFusionId] = useState(null);

  // Multi-phase icon management event handlers
  useEffect(() => {
    const handleUnitProcessed = (event) => {
      const { unitId, unitType, content, hasProcessedContent } = event.detail;
      if (hasProcessedContent) {
        setIconStates(prev => ({
          ...prev,
          [unitId]: 'unprocessed'
        }));
        setClickCounts(prev => ({
          ...prev,
          [unitId]: 0
        }));
      }
    };

    const handleUnitReset = (event) => {
      const { unitId } = event.detail;
      setIconStates(prev => {
        const newStates = { ...prev };
        delete newStates[unitId];
        return newStates;
      });
      setClickCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[unitId];
        return newCounts;
      });
      if (focusedUnitId === unitId) {
        setFocusedUnitId(null);
      }
    };

    const handleReasoningStart = (event) => {
      const { unitId } = event.detail;
      setIconStates(prev => ({
        ...prev,
        [unitId]: 'processing'
      }));
    };

    const handleReasoningComplete = (event) => {
      const { unitId, success } = event.detail;
      setIconStates(prev => ({
        ...prev,
        [unitId]: success ? 'completed' : 'error'
      }));
    };

    const handleReasoningError = (event) => {
      const { unitId } = event.detail;
      setIconStates(prev => ({
        ...prev,
        [unitId]: 'error'
      }));
    };

    // Fusion icon processing event handlers
    const handleFusionProcessingStart = (event) => {
      const { fusionId } = event.detail;
      setFusionIconStates(prev => ({
        ...prev,
        [fusionId]: 'processing'
      }));
    };

    const handleFusionProcessingComplete = (event) => {
      const { fusionId, success } = event.detail;
      setFusionIconStates(prev => ({
        ...prev,
        [fusionId]: success ? 'completed' : 'error'
      }));
    };

    const handleFusionProcessingError = (event) => {
      const { fusionId } = event.detail;
      setFusionIconStates(prev => ({
        ...prev,
        [fusionId]: 'error'
      }));
    };

    const handleFusionReset = (event) => {
      const { fusionId } = event.detail;
      setFusionIconStates(prev => {
        const newStates = { ...prev };
        delete newStates[fusionId];
        return newStates;
      });
      setFusionClickCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[fusionId];
        return newCounts;
      });
      if (focusedFusionId === fusionId) {
        setFocusedFusionId(null);
      }
    };

    // Event listeners
    window.addEventListener('unit-processed', handleUnitProcessed);
    window.addEventListener('unit-reset', handleUnitReset);
    window.addEventListener('reasoning-started', handleReasoningStart);
    window.addEventListener('reasoning-completed', handleReasoningComplete);
    window.addEventListener('reasoning-error', handleReasoningError);
    window.addEventListener('fusion-processing-start', handleFusionProcessingStart);
    window.addEventListener('fusion-processing-complete', handleFusionProcessingComplete);
    window.addEventListener('fusion-processing-error', handleFusionProcessingError);
    window.addEventListener('fusion-reset', handleFusionReset);

    return () => {
      window.removeEventListener('unit-processed', handleUnitProcessed);
      window.removeEventListener('unit-reset', handleUnitReset);
      window.removeEventListener('reasoning-started', handleReasoningStart);
      window.removeEventListener('reasoning-completed', handleReasoningComplete);
      window.removeEventListener('reasoning-error', handleReasoningError);
      window.removeEventListener('fusion-processing-start', handleFusionProcessingStart);
      window.removeEventListener('fusion-processing-complete', handleFusionProcessingComplete);
      window.removeEventListener('fusion-processing-error', handleFusionProcessingError);
      window.removeEventListener('fusion-reset', handleFusionReset);
    };
  }, [focusedUnitId, focusedFusionId]);

  // Helper functions for icon state management
  const updateIconState = useCallback((unitId, state) => {
    setIconStates(prev => ({
      ...prev,
      [unitId]: state
    }));
  }, []);

  const updateClickCount = useCallback((unitId, count) => {
    setClickCounts(prev => ({
      ...prev,
      [unitId]: count
    }));
  }, []);

  const updateFusionIconState = useCallback((fusionId, state) => {
    setFusionIconStates(prev => ({
      ...prev,
      [fusionId]: state
    }));
  }, []);

  const updateFusionClickCount = useCallback((fusionId, count) => {
    setFusionClickCounts(prev => ({
      ...prev,
      [fusionId]: count
    }));
  }, []);

  return {
    // Individual unit icon states
    iconStates,
    clickCounts,
    focusedUnitId,
    setFocusedUnitId,
    updateIconState,
    updateClickCount,

    // Fusion icon states
    fusionIconStates,
    fusionClickCounts,
    focusedFusionId,
    setFocusedFusionId,
    updateFusionIconState,
    updateFusionClickCount
  };
};

export default useIconStates;