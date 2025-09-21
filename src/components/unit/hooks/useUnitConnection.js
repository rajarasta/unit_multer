import { useState, useCallback, useEffect, useRef } from 'react';

const useUnitConnection = (id, unitType, content, fileUrl) => {
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [dragCurrentPosition, setDragCurrentPosition] = useState(null);
  const [dragTargetUnit, setDragTargetUnit] = useState(null);

  // Enhanced connection management
  const [isConnectedUnit, setIsConnectedUnit] = useState(false);
  const [connectedToUnit, setConnectedToUnit] = useState(null); // ID of connected unit
  const [connectionColor, setConnectionColor] = useState(null); // Shared glow color

  const unitRef = useRef(null);

  // Connection Button Drag Functions
  const handleConnectionDragStart = useCallback((e) => {
    e.stopPropagation();
    if (unitType === 'empty') return;

    const rect = unitRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startPos = {
      x: e.clientX,
      y: e.clientY,
      unitX: rect.left + rect.width / 2,
      unitY: rect.top + rect.height / 2
    };

    setDragStartPosition(startPos);
    setDragCurrentPosition(startPos);
    setIsDraggingConnection(true);

    // Trigger global drag state
    window.dispatchEvent(new CustomEvent('unit-connection-drag-start', {
      detail: { sourceUnitId: id, sourceData: { type: unitType, content, fileUrl } }
    }));
  }, [id, unitType, content, fileUrl]);

  const handleConnectionDragMove = useCallback((e) => {
    if (!isDraggingConnection) return;

    setDragCurrentPosition({
      x: e.clientX,
      y: e.clientY
    });
  }, [isDraggingConnection]);

  const handleConnectionDragEnd = useCallback((e) => {
    if (!isDraggingConnection) return;

    // Check if we're over a valid drop target
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    const targetUnit = elementBelow?.closest('[data-unit-id]');

    if (targetUnit) {
      const targetId = targetUnit.getAttribute('data-unit-id');
      if (targetId !== id) {
        // Generate unique connection color
        const colors = [
          'rgb(59, 130, 246)', // blue
          'rgb(139, 92, 246)', // purple
          'rgb(34, 197, 94)',  // green
          'rgb(251, 146, 60)', // orange
          'rgb(236, 72, 153)', // pink
          'rgb(14, 165, 233)'  // sky
        ];
        const connectionColor = colors[Math.floor(Math.random() * colors.length)];

        // Connect both units with same color
        setIsConnectedUnit(true);
        setConnectedToUnit(targetId);
        setConnectionColor(connectionColor);

        // Get Unit positions for container calculation
        const sourceRect = unitRef.current?.getBoundingClientRect();
        const targetRect = targetUnit.getBoundingClientRect();

        // Trigger global connection event to create connected container
        window.dispatchEvent(new CustomEvent('units-create-connected-container', {
          detail: {
            sourceUnitId: id,
            targetUnitId: targetId,
            connectionColor,
            sourcePosition: {
              x: sourceRect.left,
              y: sourceRect.top,
              width: sourceRect.width,
              height: sourceRect.height
            },
            targetPosition: {
              x: targetRect.left,
              y: targetRect.top,
              width: targetRect.width,
              height: targetRect.height
            }
          }
        }));

        // Also trigger individual unit connection for internal state
        window.dispatchEvent(new CustomEvent('unit-connected', {
          detail: {
            sourceUnitId: id,
            targetUnitId: targetId,
            connectionColor
          }
        }));
      }
    }

    // Reset drag state
    setIsDraggingConnection(false);
    setDragStartPosition(null);
    setDragCurrentPosition(null);

    window.dispatchEvent(new CustomEvent('unit-connection-drag-end'));
  }, [isDraggingConnection, id]);

  // Listen for connection events from other units
  useEffect(() => {
    const handleConnection = (event) => {
      const { sourceUnitId, targetUnitId, connectionColor } = event.detail;
      if (targetUnitId === id) {
        setIsConnectedUnit(true);
        setConnectedToUnit(sourceUnitId);
        setConnectionColor(connectionColor);
      }
    };

    window.addEventListener('unit-connected', handleConnection);
    return () => window.removeEventListener('unit-connected', handleConnection);
  }, [id]);

  // Reset connection
  const resetConnection = useCallback(() => {
    setIsConnectedUnit(false);
    setConnectedToUnit(null);
    setConnectionColor(null);

    // Notify connected unit to also reset
    if (connectedToUnit) {
      window.dispatchEvent(new CustomEvent('unit-disconnected', {
        detail: { unitId: connectedToUnit }
      }));
    }
  }, [connectedToUnit]);

  // Listen for disconnection events
  useEffect(() => {
    const handleDisconnection = (event) => {
      const { unitId } = event.detail;
      if (unitId === id) {
        setIsConnectedUnit(false);
        setConnectedToUnit(null);
        setConnectionColor(null);
      }
    };

    window.addEventListener('unit-disconnected', handleDisconnection);
    return () => window.removeEventListener('unit-disconnected', handleDisconnection);
  }, [id]);

  // Global event listeners for connection drag tracking
  useEffect(() => {
    if (isDraggingConnection) {
      const handleGlobalMouseMove = (e) => handleConnectionDragMove(e);
      const handleGlobalMouseUp = (e) => handleConnectionDragEnd(e);

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDraggingConnection, handleConnectionDragMove, handleConnectionDragEnd]);

  return {
    // Drag state
    isDraggingConnection,
    dragStartPosition,
    dragCurrentPosition,
    dragTargetUnit,

    // Connection state
    isConnectedUnit,
    connectedToUnit,
    connectionColor,

    // Handlers
    handleConnectionDragStart,
    resetConnection,

    // Ref
    unitRef
  };
};

export default useUnitConnection;