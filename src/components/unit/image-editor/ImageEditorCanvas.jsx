import React, { useRef, useCallback, useState } from 'react';

const ImageEditorCanvas = ({
  imageElement,
  circles,
  selectedCircleId,
  onStartDrawing,
  onContinueDrawing,
  onStopDrawing,
  getDisplayCoordinates,
  isDrawing,
  tool
}) => {
  const svgRef = useRef(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    onStartDrawing(e.clientX, e.clientY, svgRef.current);
  }, [onStartDrawing]);

  const handlePointerMove = useCallback((e) => {
    e.preventDefault();

    // Update mouse position for cursor tracking
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }

    if (isDrawing) {
      onContinueDrawing(e.clientX, e.clientY, svgRef.current);
    }
  }, [isDrawing, onContinueDrawing]);

  const handlePointerEnter = useCallback(() => {
    setIsMouseOver(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    setIsMouseOver(false);
  }, []);

  const handlePointerUp = useCallback((e) => {
    e.preventDefault();
    onStopDrawing();
  }, [onStopDrawing]);

  if (!imageElement) return null;

  return (
    <div className="absolute inset-0 z-10">
      <svg
        ref={svgRef}
        className={`w-full h-full ${tool === 'circle' ? 'cursor-crosshair' : 'cursor-pointer'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        style={{ touchAction: 'none' }}
      >
        {circles.map(circle => {
          const { x, y } = getDisplayCoordinates(circle.cx, circle.cy, svgRef.current);
          const imageRect = imageElement.getBoundingClientRect();
          const svgRect = svgRef.current?.getBoundingClientRect();

          if (!svgRect) return null;

          const scale = imageRect.width / imageElement.naturalWidth;
          const displayRadius = circle.r * scale;

          return (
            <g key={circle.id}>
              <circle
                cx={x}
                cy={y}
                r={displayRadius}
                stroke={circle.stroke}
                strokeWidth={circle.strokeWidth}
                fill={circle.fill}
                opacity={circle.opacity}
                className={selectedCircleId === circle.id ? 'drop-shadow-lg' : ''}
              />
              {selectedCircleId === circle.id && (
                <circle
                  cx={x}
                  cy={y}
                  r={displayRadius + 5}
                  stroke="#2563eb"
                  strokeWidth="2"
                  fill="transparent"
                  strokeDasharray="5,5"
                  opacity="0.7"
                />
              )}
            </g>
          );
        })}

        {/* Mouse cursor indicator */}
        {isMouseOver && (
          <>
            {/* Crosshair lines */}
            <line
              x1={mousePosition.x}
              y1={0}
              x2={mousePosition.x}
              y2="100%"
              stroke="#ff0000"
              strokeWidth="1"
              opacity="0.5"
              strokeDasharray="5,5"
            />
            <line
              x1={0}
              y1={mousePosition.y}
              x2="100%"
              y2={mousePosition.y}
              stroke="#ff0000"
              strokeWidth="1"
              opacity="0.5"
              strokeDasharray="5,5"
            />

            {/* Cursor dot */}
            <circle
              cx={mousePosition.x}
              cy={mousePosition.y}
              r="4"
              fill="#ff0000"
              opacity="0.7"
            />

            {/* Tool indicator */}
            <text
              x={mousePosition.x + 10}
              y={mousePosition.y - 10}
              fill="#000000"
              fontSize="12"
              fontWeight="bold"
            >
              {tool === 'circle' ? '⭕' : '👆'}
            </text>
          </>
        )}
      </svg>
    </div>
  );
};

export default ImageEditorCanvas;