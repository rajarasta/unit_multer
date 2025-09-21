import { useState, useCallback } from 'react';

const useUnitStates = () => {
  const [unitStates, setUnitStates] = useState({
    1: { type: 'empty', content: null },
    2: { type: 'empty', content: null },
    3: { type: 'empty', content: null },
    4: { type: 'empty', content: null }
  });

  const handleContentChange = useCallback((unitId, type, content) => {
    setUnitStates(prev => ({
      ...prev,
      [unitId]: { type, content }
    }));
  }, []);

  const getUnitsActivityState = useCallback(() => {
    const units = Object.values(unitStates);
    const hasContent = units.some(u => u.type !== 'empty');
    const hasProcessing = units.some(u => u.isProcessing);
    const hasConnections = units.some(u => u.isConnected);

    if (hasProcessing) return 'processing';
    if (hasConnections) return 'connected';
    if (hasContent) return 'active';
    return 'idle';
  }, [unitStates]);

  const extractTextFromUnit = useCallback((u) => {
    if (!u) return '';
    if (typeof u.content === 'string') return u.content;
    if (u && u.content && typeof u.content === 'object' && 'name' in u.content) {
      return `[${u.type}] File: ${u.content.name}`;
    }
    return u?.type ? `[${u.type}]` : '';
  }, []);

  return {
    unitStates,
    setUnitStates,
    handleContentChange,
    getUnitsActivityState,
    extractTextFromUnit
  };
};

export default useUnitStates;