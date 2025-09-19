import React from 'react';
import {
  Circle,
  MousePointer,
  Palette,
  Minus,
  Plus,
  Undo,
  Redo,
  Trash2,
  Save,
  X,
  Download
} from 'lucide-react';

const ImageEditorToolbar = ({
  tool,
  setTool,
  strokeColor,
  setStrokeColor,
  strokeWidth,
  setStrokeWidth,
  selectedCircleId,
  onDelete,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onCancel,
  onExport
}) => {
  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00',
    '#ff00ff', '#00ffff', '#ff8000', '#8000ff',
    '#000000', '#ffffff', '#808080', '#800000'
  ];

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-20">
      <div className="flex flex-col gap-3">
        {/* Tools */}
        <div className="flex gap-2">
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              tool === 'circle'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Draw Circle"
          >
            <Circle size={16} />
          </button>
          <button
            onClick={() => setTool('select')}
            className={`p-2 rounded-lg transition-all duration-200 ${
              tool === 'select'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Select/Move"
          >
            <MousePointer size={16} />
          </button>
        </div>

        {/* Colors */}
        <div className="flex flex-wrap gap-1 max-w-[120px]">
          {colors.map(color => (
            <button
              key={color}
              onClick={() => setStrokeColor(color)}
              className={`w-6 h-6 rounded border-2 transition-all duration-200 ${
                strokeColor === color
                  ? 'border-slate-800 scale-110'
                  : 'border-slate-300 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={`Color: ${color}`}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
            className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Decrease Stroke Width"
          >
            <Minus size={12} />
          </button>
          <span className="text-xs font-medium w-6 text-center">{strokeWidth}</span>
          <button
            onClick={() => setStrokeWidth(Math.min(10, strokeWidth + 1))}
            className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            title="Increase Stroke Width"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-2 rounded-lg transition-all duration-200 ${
              canUndo
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-50 text-slate-400 cursor-not-allowed'
            }`}
            title="Undo"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-2 rounded-lg transition-all duration-200 ${
              canRedo
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-slate-50 text-slate-400 cursor-not-allowed'
            }`}
            title="Redo"
          >
            <Redo size={16} />
          </button>
          {selectedCircleId && (
            <button
              onClick={() => onDelete(selectedCircleId)}
              className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
              title="Delete Selected"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Save/Export/Cancel */}
        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={onExport}
            className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            title="Export as PNG"
          >
            <Download size={16} />
          </button>
          <button
            onClick={onSave}
            className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            title="Save Changes"
          >
            <Save size={16} />
          </button>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorToolbar;