import { useState, useRef, useCallback } from 'react';

const useImageEditor = (imageElement) => {
  const [circles, setCircles] = useState([]);
  const [selectedCircleId, setSelectedCircleId] = useState(null);
  const [tool, setTool] = useState('circle');
  const [strokeColor, setStrokeColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const nextIdRef = useRef(1);
  const drawingStateRef = useRef(null);

  const getImageCoordinates = useCallback((clientX, clientY, svgElement) => {
    if (!imageElement || !svgElement) return { x: 0, y: 0 };

    const svgRect = svgElement.getBoundingClientRect();
    const imageRect = imageElement.getBoundingClientRect();

    const svgX = clientX - svgRect.left;
    const svgY = clientY - svgRect.top;

    const scaleX = imageElement.naturalWidth / imageRect.width;
    const scaleY = imageElement.naturalHeight / imageRect.height;

    const imageOffsetX = (svgRect.width - imageRect.width) / 2;
    const imageOffsetY = (svgRect.height - imageRect.height) / 2;

    const imageX = (svgX - imageOffsetX) * scaleX;
    const imageY = (svgY - imageOffsetY) * scaleY;

    return { x: imageX, y: imageY };
  }, [imageElement]);

  const getDisplayCoordinates = useCallback((imageX, imageY, svgElement) => {
    if (!imageElement || !svgElement) return { x: 0, y: 0 };

    const svgRect = svgElement.getBoundingClientRect();
    const imageRect = imageElement.getBoundingClientRect();

    const scaleX = imageRect.width / imageElement.naturalWidth;
    const scaleY = imageRect.height / imageElement.naturalHeight;

    const imageOffsetX = (svgRect.width - imageRect.width) / 2;
    const imageOffsetY = (svgRect.height - imageRect.height) / 2;

    const displayX = imageX * scaleX + imageOffsetX;
    const displayY = imageY * scaleY + imageOffsetY;

    return { x: displayX, y: displayY };
  }, [imageElement]);

  const saveToHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...circles]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [circles, history, historyIndex]);

  const addCircle = useCallback((cx, cy, r) => {
    const newCircle = {
      id: nextIdRef.current++,
      cx,
      cy,
      r,
      stroke: strokeColor,
      strokeWidth,
      fill: 'transparent',
      opacity: 1
    };

    setCircles(prev => [...prev, newCircle]);
    saveToHistory();
    return newCircle.id;
  }, [strokeColor, strokeWidth, saveToHistory]);

  const updateCircle = useCallback((id, updates) => {
    setCircles(prev => prev.map(circle =>
      circle.id === id ? { ...circle, ...updates } : circle
    ));
  }, []);

  const deleteCircle = useCallback((id) => {
    setCircles(prev => prev.filter(circle => circle.id !== id));
    setSelectedCircleId(null);
    saveToHistory();
  }, [saveToHistory]);

  const findCircleAt = useCallback((x, y) => {
    for (let i = circles.length - 1; i >= 0; i--) {
      const circle = circles[i];
      const distance = Math.sqrt((x - circle.cx) ** 2 + (y - circle.cy) ** 2);
      if (distance <= circle.r + circle.strokeWidth) {
        return circle.id;
      }
    }
    return null;
  }, [circles]);

  const startDrawing = useCallback((clientX, clientY, svgElement) => {
    const { x, y } = getImageCoordinates(clientX, clientY, svgElement);

    if (tool === 'circle') {
      setIsDrawing(true);
      drawingStateRef.current = { startX: x, startY: y, circleId: null };
    } else if (tool === 'select') {
      const circleId = findCircleAt(x, y);
      setSelectedCircleId(circleId);
      if (circleId) {
        const circle = circles.find(c => c.id === circleId);
        drawingStateRef.current = {
          startX: x,
          startY: y,
          circleId,
          originalCx: circle.cx,
          originalCy: circle.cy,
          originalR: circle.r
        };
        setIsDrawing(true);
      }
    }
  }, [tool, getImageCoordinates, findCircleAt, circles]);

  const continueDrawing = useCallback((clientX, clientY, svgElement) => {
    if (!isDrawing || !drawingStateRef.current) return;

    const { x, y } = getImageCoordinates(clientX, clientY, svgElement);
    const state = drawingStateRef.current;

    if (tool === 'circle') {
      const r = Math.sqrt((x - state.startX) ** 2 + (y - state.startY) ** 2);

      if (state.circleId) {
        updateCircle(state.circleId, {
          cx: state.startX,
          cy: state.startY,
          r
        });
      } else {
        const circleId = addCircle(state.startX, state.startY, r);
        state.circleId = circleId;
      }
    } else if (tool === 'select' && state.circleId) {
      const deltaX = x - state.startX;
      const deltaY = y - state.startY;

      updateCircle(state.circleId, {
        cx: state.originalCx + deltaX,
        cy: state.originalCy + deltaY
      });
    }
  }, [isDrawing, tool, getImageCoordinates, updateCircle, addCircle]);

  const stopDrawing = useCallback(() => {
    if (isDrawing && tool === 'circle') {
      saveToHistory();
    }
    setIsDrawing(false);
    drawingStateRef.current = null;
  }, [isDrawing, tool, saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCircles(history[historyIndex - 1]);
      setSelectedCircleId(null);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCircles(history[historyIndex + 1]);
      setSelectedCircleId(null);
    }
  }, [historyIndex, history]);

  const exportToBlob = useCallback(async () => {
    if (!imageElement) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;

    ctx.drawImage(imageElement, 0, 0);

    circles.forEach(circle => {
      ctx.strokeStyle = circle.stroke;
      ctx.lineWidth = circle.strokeWidth;
      ctx.fillStyle = circle.fill;
      ctx.globalAlpha = circle.opacity;

      ctx.beginPath();
      ctx.arc(circle.cx, circle.cy, circle.r, 0, 2 * Math.PI);

      if (circle.fill !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
    });

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png', 1.0);
    });
  }, [imageElement, circles]);

  const reset = useCallback(() => {
    setCircles([]);
    setSelectedCircleId(null);
    setHistory([]);
    setHistoryIndex(-1);
    setIsDrawing(false);
    drawingStateRef.current = null;
    nextIdRef.current = 1;
  }, []);

  return {
    circles,
    selectedCircleId,
    tool,
    setTool,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    isDrawing,
    startDrawing,
    continueDrawing,
    stopDrawing,
    deleteCircle,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    exportToBlob,
    reset,
    getDisplayCoordinates
  };
};

export default useImageEditor;