import React, { useState, useMemo } from 'react';
import { Bug, ChevronDown, ChevronRight, Copy, Download } from 'lucide-react';

/**
 * DebugPanel - Komponenta za prikaz debug informacija
 * 
 * Prikazuje detaljne informacije o dokumentu, analizi i processing-u
 * Omogućava export debug podataka i copy-paste funkcionalnosti
 * 
 * @param {Object} document - Document object za debug
 * @param {Object} additionalData - Dodatni debug podaci
 * @param {boolean} visible - Da li je panel vidljiv
 * @param {Function} onClose - Callback za zatvaranje
 */
export default function DebugPanel({ 
  document, 
  additionalData = {},
  visible = true,
  onClose
}) {
  const [viewMode, setViewMode] = useState('analysis');
  const [expandedSections, setExpandedSections] = useState(new Set(['basic']));
  
  if (!document || !visible) return null;

  // Prepare debug data
  const debugData = useMemo(() => {
    const data = {
      basic: {
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        status: document.status,
        uploadTime: document.uploadTime,
        processingTime: document.processingTime,
        error: document.error
      },
      analysis: document.analysis || null,
      raw: document,
      additional: additionalData,
      system: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        memory: getMemoryInfo(),
        performance: getPerformanceInfo()
      }
    };
    
    return data;
  }, [document, additionalData]);

  // Toggle section expansion
  const toggleSection = (section) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Copy to clipboard
  const copyToClipboard = (data) => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
      console.log('Debug data copied to clipboard');
    });
  };

  // Download debug data
  const downloadDebugData = () => {
    const jsonString = JSON.stringify(debugData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-${document.name}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderJsonTree = (data, depth = 0) => {
    if (data === null || data === undefined) {
      return <span className="text-gray-500 italic">null</span>;
    }
    
    if (typeof data !== 'object') {
      return (
        <span className={`${
          typeof data === 'string' ? 'text-green-400' : 
          typeof data === 'number' ? 'text-blue-400' : 
          typeof data === 'boolean' ? 'text-yellow-400' : 
          'text-gray-300'
        }`}>
          {JSON.stringify(data)}
        </span>
      );
    }
    
    if (Array.isArray(data)) {
      return (
        <div style={{ marginLeft: `${depth * 12}px` }}>
          <span className="text-gray-400">[</span>
          {data.map((item, index) => (
            <div key={index} className="ml-3">
              <span className="text-gray-500">{index}:</span> {renderJsonTree(item, depth + 1)}
              {index < data.length - 1 && <span className="text-gray-400">,</span>}
            </div>
          ))}
          <span className="text-gray-400">]</span>
        </div>
      );
    }
    
    return (
      <div style={{ marginLeft: `${depth * 12}px` }}>
        <span className="text-gray-400">{'{'}</span>
        {Object.entries(data).map(([key, value], index, entries) => (
          <div key={key} className="ml-3">
            <span className="text-purple-400">"{key}"</span>
            <span className="text-gray-400">: </span>
            {renderJsonTree(value, depth + 1)}
            {index < entries.length - 1 && <span className="text-gray-400">,</span>}
          </div>
        ))}
        <span className="text-gray-400">{'}'}</span>
      </div>
    );
  };

  const DebugSection = ({ title, data, sectionKey }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <div className="border border-gray-700 rounded-lg mb-3">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-800 hover:bg-gray-750 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? 
              <ChevronDown className="w-4 h-4" /> : 
              <ChevronRight className="w-4 h-4" />
            }
            <span className="font-medium text-white">{title}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(data);
            }}
            className="p-1 hover:bg-gray-600 rounded transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-3 h-3" />
          </button>
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-black rounded-b-lg max-h-96 overflow-auto">
            <pre className="text-xs font-mono text-green-400">
              {renderJsonTree(data)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 text-green-400 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-white font-bold flex items-center gap-2 text-xl">
            <Bug className="w-6 h-6 text-yellow-400" />
            Debug Panel - {document.name}
          </h3>
          
          <div className="flex items-center gap-3">
            {/* View Mode Selector */}
            <div className="flex bg-gray-800 rounded-lg overflow-hidden">
              {['analysis', 'raw', 'system'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 text-xs capitalize transition-colors ${
                    viewMode === mode 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            
            {/* Actions */}
            <button
              onClick={downloadDebugData}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              title="Download debug data"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {viewMode === 'analysis' && (
            <div className="space-y-4">
              <DebugSection title="Basic Info" data={debugData.basic} sectionKey="basic" />
              <DebugSection title="Analysis Results" data={debugData.analysis} sectionKey="analysis" />
              {Object.keys(debugData.additional).length > 0 && (
                <DebugSection title="Additional Data" data={debugData.additional} sectionKey="additional" />
              )}
            </div>
          )}
          
          {viewMode === 'raw' && (
            <div className="space-y-4">
              <DebugSection title="Raw Document Data" data={debugData.raw} sectionKey="raw" />
            </div>
          )}
          
          {viewMode === 'system' && (
            <div className="space-y-4">
              <DebugSection title="System Information" data={debugData.system} sectionKey="system" />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800 text-xs text-gray-400">
          <div className="flex justify-between items-center">
            <span>Debug session: {new Date().toLocaleString()}</span>
            <span>Document ID: {document.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getMemoryInfo() {
  if (performance.memory) {
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
    };
  }
  return null;
}

function getPerformanceInfo() {
  const navigation = performance.getEntriesByType('navigation')[0];
  return {
    loadTime: navigation ? Math.round(navigation.loadEventEnd - navigation.fetchStart) + 'ms' : null,
    domContentLoaded: navigation ? Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart) + 'ms' : null,
    resources: performance.getEntriesByType('resource').length
  };
}