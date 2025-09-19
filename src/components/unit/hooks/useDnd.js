import { useState, useCallback } from 'react';

export default function useDnd(onInput) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    setIsDragOver(false);
    if (files && files.length > 0 && onInput) {
      onInput(files[0]);
    }
  }, [onInput]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUnitDropTarget = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  return {
    isDragOver,
    setIsDragOver,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleUnitDropTarget
  };
}

