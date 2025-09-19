import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, RotateCcw, Grid3x3, Link, Edit3 } from 'lucide-react';
import ImageEditorCanvas from '../image-editor/ImageEditorCanvas';
import ImageEditorToolbar from '../image-editor/ImageEditorToolbar';
import useImageEditor from '../image-editor/useImageEditor';

const ImageView = ({ fileUrl, content, getActionsByType, resetUnit, onConnectionDragStart, setContent, setFileUrl, dynamicButtonStates, unitId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [editedContent, setEditedContent] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const imageRef = useRef(null);

  const editor = useImageEditor(imageRef.current);

  const handleEditClick = () => {
    setIsEditing(true);
    editor.reset();
  };

  const handleSaveChanges = async () => {
    try {
      const blob = await editor.exportToBlob();
      if (blob) {
        const fileName = content?.name ?
          content.name.replace(/\.[^/.]+$/, '_edited.png') :
          'edited_image.png';

        const editedFile = new File([blob], fileName, { type: 'image/png' });

        if (setContent) setContent(editedFile);
        if (setFileUrl) {
          if (fileUrl && fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl);
          }
          setFileUrl(URL.createObjectURL(editedFile));
        }

        setEditedContent(editedFile);
        setHasUnsavedChanges(false);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving edited image:', error);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setHasUnsavedChanges(false);
    editor.reset();
  };

  const handleExportPNG = async () => {
    try {
      const blob = await editor.exportToBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = content?.name ?
          content.name.replace(/\.[^/.]+$/, '_annotated.png') :
          'annotated_image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting image:', error);
    }
  };

  useEffect(() => {
    if (editor.circles.length > 0 && !hasUnsavedChanges) {
      setHasUnsavedChanges(true);
    }
  }, [editor.circles, hasUnsavedChanges]);

  // Emit circle annotations updates for combined processing
  useEffect(() => {
    if (unitId && editor.circles) {
      window.dispatchEvent(new CustomEvent('unit-image-annotations-updated', {
        detail: {
          unitId: unitId,
          circles: editor.circles
        }
      }));
    }
  }, [unitId, editor.circles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditing) return;

      if (e.key === 'Escape') {
        handleCancelEdit();
      } else if (e.key === 'Delete' && editor.selectedCircleId) {
        editor.deleteCircle(editor.selectedCircleId);
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          editor.undo();
        } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          editor.redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, editor]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <ImageIcon size={16} className="text-green-600" />
          <span className="text-xs font-medium">Image</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Connection Button */}
          <button
            onMouseDown={onConnectionDragStart}
            title="Connect Unit"
            className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
          >
            <Link size={14} />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Connect Unit
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
            </div>
          </button>

          {/* Reset Button */}
          <button
            onClick={resetUnit}
            title="Reset Unit"
            className="relative group text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
          >
            <RotateCcw size={14} />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Reset Unit
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-2 min-h-0">
        <div className={`${isEditing ? 'w-full h-full' : 'w-2/3'} bg-slate-50 rounded border-2 border-dashed border-slate-200 relative transition-all duration-300 overflow-hidden flex items-center justify-center p-2`}>
          {fileUrl && (
            <div className={`${isEditing ? 'w-full h-full' : 'w-full max-h-40 aspect-video'} overflow-hidden flex items-center justify-center`}>
              <img
                ref={imageRef}
                src={fileUrl}
                alt="Uploaded"
                className={`${isEditing ? 'max-w-full max-h-full object-contain' : 'w-full h-full object-cover cursor-zoom-in'} rounded shadow-sm`}
                loading="lazy"
                draggable={false}
                onClick={() => { if (!isEditing) setIsExpanded(true); }}
                onLoad={() => {
                  if (isEditing) {
                    editor.reset();
                  }
                }}
              />
              <AnimatePresence>
                {isEditing && (
                  <>
                    <ImageEditorCanvas
                      imageElement={imageRef.current}
                      circles={editor.circles}
                      selectedCircleId={editor.selectedCircleId}
                      onStartDrawing={editor.startDrawing}
                      onContinueDrawing={editor.continueDrawing}
                      onStopDrawing={editor.stopDrawing}
                      getDisplayCoordinates={editor.getDisplayCoordinates}
                      isDrawing={editor.isDrawing}
                      tool={editor.tool}
                    />
                    <ImageEditorToolbar
                      tool={editor.tool}
                      setTool={editor.setTool}
                      strokeColor={editor.strokeColor}
                      setStrokeColor={editor.setStrokeColor}
                      strokeWidth={editor.strokeWidth}
                      setStrokeWidth={editor.setStrokeWidth}
                      selectedCircleId={editor.selectedCircleId}
                      onDelete={editor.deleteCircle}
                      onUndo={editor.undo}
                      onRedo={editor.redo}
                      canUndo={editor.canUndo}
                      canRedo={editor.canRedo}
                      onSave={handleSaveChanges}
                      onCancel={handleCancelEdit}
                      onExport={handleExportPNG}
                    />
                  </>
                )}
              </AnimatePresence>
              {hasUnsavedChanges && !isEditing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium"
                >
                  Unsaved changes
                </motion.div>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="w-1/3 p-2">
          <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1">
            <Grid3x3 size={12} className="text-blue-500" />
            Actions
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Edit Button - Special handling */}
            {!isEditing && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
                onClick={handleEditClick}
                title="Edit Image"
                className="action-btn light-sweep relative group flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <Edit3 size={16} className="text-inherit mb-1" />
                <span className="text-xs font-medium">Edit</span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Edit Image
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                </div>
              </motion.button>
            )}

            {/* Send Edited Button - Show when edited content exists */}
            {editedContent && !isEditing && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                onClick={() => {
                  const processAction = getActionsByType('image').find(a => a.label === 'Process AI');
                  if (processAction) processAction.action();
                }}
                title="Process Edited"
                className="action-btn light-sweep relative group flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
              >
                <ImageIcon size={16} className="text-inherit mb-1" />
                <span className="text-xs font-medium">Send Edited</span>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Process Edited Image
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                </div>
              </motion.button>
            )}

            {/* Regular Actions - Filter out Edit if it exists */}
            {getActionsByType('image').filter(action => action.label !== 'Edit').map((action, index) => {
              const theme = (label => {
                const map = { 'Download':'green', 'Share':'slate', 'Edit':'blue', 'Crop':'orange', 'Filter':'purple', 'View':'slate', 'Process AI':'purple', 'Cancel':'orange' };
                return map[label] || 'slate';
              })(action.label);
              const base = 'relative group flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200';
              const byTheme = {
                slate: 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
                green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
                purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
                orange: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
              }[theme];

              // Add dynamic button state classes
              const buttonState = dynamicButtonStates?.[action.label];
              const stateClass = buttonState ? `action-btn-${buttonState}` : '';

              const actionIndex = editedContent ? index + 2 : index + 1;
              return (
                <motion.button
                  key={`${action.label}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: actionIndex * 0.1 }}
                  onClick={action.action}
                  title={action.label}
                  className={`action-btn light-sweep ${base} ${byTheme} ${stateClass}`}
                >
                  <action.icon size={16} className="text-inherit mb-1" />
                  <span className="text-xs font-medium">{action.label}</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    {action.label}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-slate-500 space-y-0.5">
            <p>Name: {content?.name}</p>
            <p>Size: {content ? (content.size / 1024).toFixed(1) : 0} KB</p>
            <p>Type: {content?.type}</p>
          </div>
          </div>
        )}
      </div>
      {/* Lightbox for full image */}
      <AnimatePresence>
        {isExpanded && !isEditing && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
          >
            <img src={fileUrl} alt="Full" className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-zoom-out" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageView;
