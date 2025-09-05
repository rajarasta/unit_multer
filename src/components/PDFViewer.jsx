import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  Download, 
  FileText, 
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X
} from 'lucide-react';
import pdfSearchEngine from '../services/PDFSearchEngine';

const PDFPageViewer = ({ filename, pageNumber, searchTerms = [], onClose }) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(1.0);
  const [pageText, setPageText] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    renderPage();
  }, [filename, pageNumber, scale]);

  const renderPage = async () => {
    if (!canvasRef.current || !filename || !pageNumber) return;
    
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🖼️ Rendering PDF page: ${filename}, page ${pageNumber}, scale ${scale}`);
      
      const page = await pdfSearchEngine.getPDFPage(filename, pageNumber);
      if (!page) {
        setError('Failed to load PDF page');
        return;
      }

      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      
      // Extract text content for highlighting
      const textContent = await page.getTextContent();
      const pageTextContent = textContent.items.map(item => item.str).join(' ');
      setPageText(pageTextContent);

      console.log('✅ PDF page rendered successfully');
    } catch (error) {
      console.error('❌ Error rendering PDF page:', error);
      setError('Error rendering PDF page: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">{filename}</h3>
              <p className="text-xs text-gray-600">Stranica {pageNumber}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300">
              <button
                onClick={zoomOut}
                className="p-1.5 hover:bg-gray-100 rounded-l-lg transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <span className="px-2 text-sm text-gray-700 border-x border-gray-300">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                className="p-1.5 hover:bg-gray-100 rounded-r-lg transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative overflow-auto max-h-[calc(90vh-120px)]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-gray-600">Učitavam stranicu...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-2">❌</div>
              <p className="text-gray-600">{error}</p>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`max-w-full h-auto ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
          />
        </div>

        {/* Search Terms Highlights */}
        {searchTerms.length > 0 && pageText && (
          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Search className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-800">
                Pronađeni termini: {searchTerms.join(', ')}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const PDFSearchResultCard = ({ result, onViewPage, searchQuery }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const highlightText = (text, terms) => {
    if (!terms || terms.length === 0) return text;
    
    let highlightedText = text;
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(
        regex, 
        '<mark class="bg-yellow-200 px-1 rounded">$1</mark>'
      );
    });
    
    return highlightedText;
  };

  const getFileIcon = (filename) => {
    if (filename.toLowerCase().includes('ponuda')) return '💰';
    if (filename.toLowerCase().includes('ags')) return '🏢';
    if (filename.toLowerCase().includes('račun')) return '📄';
    return '📋';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFileIcon(result.filename)}</span>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {result.filename.replace('.pdf', '')}
              </h3>
              <p className="text-xs text-gray-500">
                Stranica {result.pageNumber} • Relevantnost: {Math.round(result.relevanceScore)}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onViewPage(result.filename, result.pageNumber)}
              className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              Pogledaj
            </button>
          </div>
        </div>

        {/* Matching Context */}
        {result.matchingText && result.matchingText.length > 0 && (
          <div className="space-y-2">
            {result.matchingText.slice(0, isExpanded ? result.matchingText.length : 2).map((context, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                <div 
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(context.fullContext, result.matchedTerms)
                  }}
                />
              </div>
            ))}
            
            {result.matchingText.length > 2 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-600 text-xs hover:underline"
              >
                {isExpanded ? 'Prikaži manje' : `Prikaži još ${result.matchingText.length - 2} konteksta`}
              </button>
            )}
          </div>
        )}

        {/* Matched Terms */}
        {result.matchedTerms && result.matchedTerms.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Pronađeni termini:</span>
              {result.matchedTerms.map(term => (
                <span 
                  key={term} 
                  className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full"
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export { PDFPageViewer, PDFSearchResultCard };