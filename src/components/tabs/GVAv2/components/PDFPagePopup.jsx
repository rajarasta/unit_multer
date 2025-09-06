import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, VolumeX } from 'lucide-react';

export default function PDFPagePopup({ 
  isOpen, 
  onClose, 
  pdfUrl, 
  pageNumber = 1, 
  documentName,
  isListening = false,
  onStartListening,
  onStopListening 
}) {
  const [blurPx, setBlurPx] = useState(100);
  const [transitionMs, setTransitionMs] = useState(2000);
  const voiceRecognitionRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    
    // Animated blur effect on open
    setBlurPx(100);
    setTransitionMs(2000);
    const t1 = setTimeout(() => {
      setBlurPx(90);
      const t2 = setTimeout(() => {
        setBlurPx(0);
        setTransitionMs(0);
        if (onStartListening) onStartListening();
        return () => clearTimeout(t2);
      }, 20);
      return () => clearTimeout(t2);
    }, 20);
    return () => clearTimeout(t1);
  }, [isOpen, onStartListening]);

  // Voice control for closing popup
  useEffect(() => {
    if (!isOpen || !isListening) return;

    const handleVoiceCommand = (event) => {
      const text = event.detail?.text?.toLowerCase?.() || '';
      
      // Croatian voice commands for closing
      if (/\b(zatvori|zatvorit|izađi|izađu|gotovo|završi|prekini)\b/.test(text)) {
        if (onStopListening) onStopListening();
        onClose();
      }
    };

    window.addEventListener('voice:command', handleVoiceCommand);
    return () => window.removeEventListener('voice:command', handleVoiceCommand);
  }, [isOpen, isListening, onClose, onStopListening]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative z-10 max-w-[90vw] max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-900">
                {documentName || 'PDF Dokument'}
              </h3>
              {pageNumber && (
                <span className="text-sm text-gray-600 px-2 py-1 bg-gray-200 rounded">
                  Stranica {pageNumber}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Voice control indicator */}
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                isListening ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {isListening ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                {isListening ? 'Slušam...' : 'Glas'}
              </div>
              
              <button 
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Zatvori (ili reci 'zatvori')"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* PDF Content */}
          <div className="p-4">
            {pdfUrl ? (
              <div className="flex items-center justify-center">
                <img 
                  src={pdfUrl} 
                  alt={`PDF stranica ${pageNumber}`}
                  style={{ 
                    filter: `blur(${blurPx}px)`, 
                    transition: `filter ${transitionMs}ms ease` 
                  }} 
                  className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                    📄
                  </div>
                  <p>PDF sadržaj se učitava...</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer with voice instructions */}
          <div className="px-4 pb-4">
            <div className="text-xs text-gray-500 text-center bg-gray-50 p-2 rounded">
              💬 Reci <strong>"zatvori"</strong> za zatvaranje ili klikni X
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}