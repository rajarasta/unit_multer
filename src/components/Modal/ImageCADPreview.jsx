// components/Modals/ImageCADPreview.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, ZoomIn, ZoomOut, Maximize2, ExternalLink, 
  FileCode, FileText 
} from 'lucide-react';
import { dataURLtoBlob } from '../../utils/fileUtils';

export function ImageCADPreview({ file, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const isImage = file.type?.startsWith('image/');
  const isCAD = file.name?.toLowerCase().endsWith('.dwg') || 
                file.name?.toLowerCase().endsWith('.dxf') ||
                file.name?.toLowerCase().endsWith('.dwf');
  
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleOpen = () => {
    if (file.url && file.url !== '#') {
      if (file.url.startsWith('data:')) {
        const blob = dataURLtoBlob(file.url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } else {
        window.open(file.url, '_blank');
      }
    }
  };
  
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-medium">{file.name}</h3>
          <span className="text-white/60 text-sm">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(prev => Math.max(0.1, prev - 0.2))}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          
          <span className="text-white text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={() => setScale(prev => Math.min(5, prev + 0.2))}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          
          <button
            onClick={resetView}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white ml-2"
            title="Reset view"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleOpen}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white ml-4"
            title="Otvori u vanjskoj aplikaciji"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-hidden relative cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.1s'
          }}
        >
          {isImage ? (
            <img 
              src={file.url} 
              alt={file.name}
              className="max-w-none"
              draggable={false}
              style={{ userSelect: 'none' }}
            />
          ) : isCAD ? (
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <div className="flex flex-col items-center">
                <FileCode className="w-24 h-24 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
                <p className="text-sm text-slate-600 mb-4">CAD datoteka</p>
                <div className="bg-slate-100 rounded-lg p-4 mb-4">
                  <p className="text-xs text-slate-600">
                    Preview CAD datoteka trenutno nije podržan.
                    <br />
                    Kliknite "Otvori" za prikaz u vanjskoj aplikaciji.
                  </p>
                </div>
                <button
                  onClick={handleOpen}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Otvori u CAD aplikaciji
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <div className="flex flex-col items-center">
                <FileText className="w-24 h-24 text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
                <p className="text-sm text-slate-600">
                  Preview nije dostupan za ovaj tip datoteke
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3 bg-black/50 text-white/60 text-xs text-center">
        Koristi scroll za zoom, povuci za pomicanje • ESC za zatvaranje
      </div>
    </div>
  );
}