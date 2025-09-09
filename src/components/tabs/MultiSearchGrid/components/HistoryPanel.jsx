import React, { useState, useEffect } from 'react';
import { History, Undo2, Redo2, Clock, X, Eye, Trash2, Bookmark } from 'lucide-react';
import { useWorkspaceStore, useWorkspaceHistory } from '../store/useWorkspaceStore';
import { useAudio } from '../hooks/useAudio';
import { animateEnter, animateExit } from '../utils/motion';

const HistoryPanel = ({ isOpen, onClose }) => {
  const { showHistory, toggleHistory } = useWorkspaceStore();
  const { undo, redo, canUndo, canRedo, historyLength, futureLength } = useWorkspaceHistory();
  const { undo: undoSound, redo: redoSound, click } = useAudio();
  
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);

  // Mock history items for visualization - in real implementation, 
  // this would come from the temporal store's pastStates
  useEffect(() => {
    const mockHistoryItems = [
      {
        id: 1,
        timestamp: Date.now() - 300000, // 5 minutes ago
        action: 'Layout Change',
        description: 'Applied Focus Mode layout',
        layoutType: 'focus',
        confidence: 0.92
      },
      {
        id: 2,
        timestamp: Date.now() - 180000, // 3 minutes ago
        action: 'Unit Fusion',
        description: 'Fused Picture + Chat units',
        layoutType: 'fusion',
        confidence: 0.87
      },
      {
        id: 3,
        timestamp: Date.now() - 60000, // 1 minute ago
        action: 'AI Optimization',
        description: 'Smart layout for comparison task',
        layoutType: 'comparison',
        confidence: 0.94
      },
      {
        id: 4,
        timestamp: Date.now() - 30000, // 30 seconds ago
        action: 'Manual Adjustment',
        description: 'Resized unit-1 for better visibility',
        layoutType: 'manual',
        confidence: null
      }
    ];

    setHistoryItems(mockHistoryItems);
  }, [historyLength]);

  const handleUndo = () => {
    if (canUndo) {
      undoSound();
      undo();
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redoSound();
      redo();
    }
  };

  const formatTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'Layout Change':
        return <Bookmark size={14} className="text-indigo-500" />;
      case 'Unit Fusion':
        return <div className="w-3 h-3 bg-purple-500 rounded-full" />;
      case 'AI Optimization':
        return <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />;
      case 'Manual Adjustment':
        return <Eye size={14} className="text-gray-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (!confidence) return 'text-gray-400';
    if (confidence >= 0.9) return 'text-green-500';
    if (confidence >= 0.8) return 'text-yellow-500';
    return 'text-orange-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <History size={20} className="text-indigo-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">History Panel</h3>
            <p className="text-sm text-gray-500">
              {historyLength} states • {canUndo ? 'Can undo' : 'Nothing to undo'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              canUndo
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
          
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              canRedo
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Redo2 size={16} />
            <span>Redo</span>
          </button>
        </div>

        <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
          {futureLength} future states
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {historyItems.length === 0 ? (
            <div className="text-center py-12">
              <History size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No history available</p>
              <p className="text-sm text-gray-400 mt-2">
                Make some changes to see them here
              </p>
            </div>
          ) : (
            historyItems.map((item, index) => (
              <div
                key={item.id}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md cursor-pointer ${
                  selectedHistoryIndex === index
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
                onClick={() => {
                  click();
                  setSelectedHistoryIndex(index);
                }}
              >
                {/* Timeline connector */}
                {index < historyItems.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
                )}

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(item.action)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {item.action}
                      </h4>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.layoutType === 'focus' ? 'bg-blue-100 text-blue-800' :
                          item.layoutType === 'fusion' ? 'bg-purple-100 text-purple-800' :
                          item.layoutType === 'comparison' ? 'bg-green-100 text-green-800' :
                          item.layoutType === 'manual' ? 'bg-gray-100 text-gray-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.layoutType}
                        </span>
                      </div>
                      
                      {item.confidence && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-400">AI:</span>
                          <span className={`text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick action buttons on hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Implement revert to this state
                    }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Revert to this state"
                  >
                    <Undo2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{historyLength}</div>
            <div className="text-xs text-gray-500">Total Actions</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-indigo-600">{canUndo ? '1' : '0'}</div>
            <div className="text-xs text-gray-500">Can Undo</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-emerald-600">{futureLength}</div>
            <div className="text-xs text-gray-500">Can Redo</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;