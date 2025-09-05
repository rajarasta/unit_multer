import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, Edit3, Bug, AlertCircle, X, CheckCircle2, 
  Settings, ChevronDown, Key, Cpu, Eye, Wrench, Play,
  Zap, Brain, Sparkles, Focus, Activity
} from 'lucide-react';

// Modern refactored components
import DocumentUploader, { InlineUploadButton } from '../../invoice/DocumentUploader';
import DocumentList from '../../invoice/DocumentList';
import DocumentAnalysisView from '../../invoice/DocumentAnalysisView';
import DebugPanel from '../../invoice/DebugPanel';
import ProgressBar from '../../shared/ProgressBar';
import ExportActions from '../../invoice/ExportActions';
import SettingsDropdown from '../../invoice/SettingsDropdown';
import QuickStats from '../../invoice/QuickStats';

// Custom hooks
import useInvoiceProcessing from '../../../hooks/useInvoiceProcessing';
import useClickOutside from '../../../hooks/useClickOutside';

// Services and utilities
import { invoiceLogger } from '../../../services/core/Logger';
import { AI_MODES, GOOGLE_MODELS, GOOGLE_MODEL_LABELS } from '../../../constants/aiModes';

// Kinetic Context Framework - Animation variants
const variants = {
  container: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.4, 
        staggerChildren: 0.1,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3, ease: "easeIn" }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  },
  spotlight: {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.8, ease: "easeOut" }
    },
    exit: { 
      scale: 1.2, 
      opacity: 0,
      transition: { duration: 0.4, ease: "easeIn" }
    }
  },
  focus: {
    initial: { opacity: 1, blur: 0 },
    animate: { 
      opacity: 0.7, 
      filter: "blur(2px)",
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  }
};

/**
 * InvoiceProcessorKinetic - Najmodernija implementacija invoice procesora
 * 
 * Koristi Kinetic Context Framework sa:
 * - Dynamic Focus System (spotlighting/backgrounding)
 * - AI Transparentnost sa vizualnim manipulacijom
 * - Ambient Awareness sa background aktivnostima
 * - Meaningful Motion sa physics-based animacije
 * - Contextual Adaptation za role-based UX
 * 
 * Implementira sve principe SOTA UI/UX designa iz CLAUDE.md
 */
export default function InvoiceProcessorKinetic() {
  // Custom hook enkapsulira sav state i logic
  const {
    // State
    documents,
    currentDocument,
    currentDocIndex,
    currentView,
    processing,
    progress,
    progressStep,
    error,
    editMode,
    showDebug,
    showSettingsDropdown,
    settings,
    
    // Computed
    pendingDocuments,
    hasDocuments,
    
    // Refs
    dropdownRef,
    
    // Actions
    handleFileUpload,
    processDocuments,
    updateDocumentField,
    removeDocument,
    selectDocument,
    updateSetting,
    exportCurrentToExcel,
    exportCurrentToJSON,
    saveToDatabase,
    testAIConnection,
    clearError,
    getDocumentStats,
    
    // UI actions
    setCurrentView,
    setEditMode,
    setShowDebug,
    setShowSettingsDropdown,
  } = useInvoiceProcessing();

  // Kinetic Context Framework state
  const [aiState, setAiState] = React.useState('idle'); // idle, thinking, acting, complete, error
  const [focusMode, setFocusMode] = React.useState(false);
  const [spotlightTarget, setSpotlightTarget] = React.useState(null);
  const [ambientActivity, setAmbientActivity] = React.useState(false);
  const processTrayRef = useRef(null);
  const mainContentRef = useRef(null);

  // Click outside handler za settings dropdown
  useClickOutside(dropdownRef, () => setShowSettingsDropdown(false), showSettingsDropdown);

  // Kinetic Context Framework - Dynamic Focus System
  const activateFocusMode = useCallback((targetSelector) => {
    setFocusMode(true);
    setSpotlightTarget(targetSelector);
    
    // Trigger background blur event for other elements
    window.dispatchEvent(new CustomEvent('bg:highlight', {
      detail: {
        selector: targetSelector,
        durationMs: 3000,
        radius: 300
      }
    }));
  }, []);

  const deactivateFocusMode = useCallback(() => {
    setFocusMode(false);
    setSpotlightTarget(null);
  }, []);

  // AI Transparentnost - Agent State Management
  useEffect(() => {
    if (processing) {
      setAiState('acting');
      setAmbientActivity(true);
      
      // Ambient background activity
      document.documentElement.style.setProperty('--ai-ambient-opacity', '0.15');
      document.documentElement.style.setProperty('--ai-accent-color', '#8b5cf6');
      
      // Start process tray
      if (processTrayRef.current) {
        processTrayRef.current.style.transform = 'translateY(0)';
      }
    } else {
      setAiState('idle');
      setAmbientActivity(false);
      
      // Reset ambient effects
      document.documentElement.style.setProperty('--ai-ambient-opacity', '0');
      
      // Hide process tray
      if (processTrayRef.current) {
        processTrayRef.current.style.transform = 'translateY(100%)';
      }
    }
  }, [processing]);

  // Log component mount
  React.useEffect(() => {
    invoiceLogger.info('InvoiceProcessorKinetic mounted');
    invoiceLogger.userAction('component_mount', { component: 'InvoiceProcessorKinetic' });
    
    return () => {
      invoiceLogger.info('InvoiceProcessorKinetic unmounted');
    };
  }, []);

  // Enhanced file upload with Kinetic feedback
  const handleFileUploadWithKinetic = React.useCallback(async (files) => {
    invoiceLogger.userAction('file_upload_initiated', { fileCount: files.length });
    invoiceLogger.time('file_upload');
    
    setAiState('thinking');
    activateFocusMode('[data-upload-zone]');
    
    try {
      const result = await handleFileUpload(files);
      invoiceLogger.timeEnd('file_upload', { uploadedCount: result.length });
      invoiceLogger.info('Files uploaded successfully', { count: result.length });
      setAiState('complete');
      setTimeout(() => setAiState('idle'), 1500);
    } catch (err) {
      invoiceLogger.error('File upload failed', err);
      setAiState('error');
      setTimeout(() => setAiState('idle'), 3000);
    } finally {
      setTimeout(deactivateFocusMode, 800);
    }
  }, [handleFileUpload, activateFocusMode, deactivateFocusMode]);

  // Enhanced document processing with visual manipulation
  const handleProcessWithKinetic = React.useCallback(async (docs) => {
    invoiceLogger.userAction('document_processing_initiated', { documentCount: docs.length });
    invoiceLogger.time('document_processing');
    
    setAiState('acting');
    activateFocusMode('[data-document-processing]');
    
    try {
      await processDocuments(docs);
      invoiceLogger.timeEnd('document_processing', { processedCount: docs.length });
      setAiState('complete');
      setTimeout(() => setAiState('idle'), 2000);
    } catch (err) {
      invoiceLogger.error('Document processing failed', err);
      setAiState('error');
      setTimeout(() => setAiState('idle'), 3000);
    } finally {
      setTimeout(deactivateFocusMode, 1200);
    }
  }, [processDocuments, activateFocusMode, deactivateFocusMode]);

  // AI State indicator colors and icons
  const getAiStateStyle = () => {
    switch (aiState) {
      case 'thinking':
        return { color: '#8b5cf6', icon: Brain, pulse: 'slow' };
      case 'acting':
        return { color: '#8b5cf6', icon: Zap, pulse: 'fast' };
      case 'complete':
        return { color: '#10b981', icon: CheckCircle2, pulse: 'none' };
      case 'error':
        return { color: '#ef4444', icon: AlertCircle, pulse: 'urgent' };
      default:
        return { color: '#6b7280', icon: Activity, pulse: false };
    }
  };

  const aiStateStyle = getAiStateStyle();
  const StateIcon = aiStateStyle.icon;

  return (
    <motion.div 
      className="h-screen flex flex-col bg-gray-50 text-gray-800 relative overflow-hidden"
      variants={variants.container}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Ambient Background Effects */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 transition-opacity duration-1000 ${
          ambientActivity ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: ambientActivity 
            ? `radial-gradient(circle at 30% 70%, ${aiStateStyle.color}15 0%, transparent 50%), 
               radial-gradient(circle at 70% 30%, ${aiStateStyle.color}10 0%, transparent 50%)`
            : 'none'
        }}
      />

      {/* Header sa AI State Indicator */}
      <motion.header 
        className={`bg-white/80 backdrop-blur-xl border-b px-6 py-4 shadow-sm flex items-center justify-between relative z-10 ${
          focusMode ? 'backdrop-blur-sm' : 'backdrop-blur-xl'
        }`}
        variants={variants.item}
        layout
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cloud className="w-6 h-6 text-blue-600" />
            {/* AI State Indicator */}
            <div className="absolute -top-1 -right-1">
              <StateIcon 
                className={`w-3 h-3 ${
                  aiStateStyle.pulse === 'fast' ? 'animate-pulse' : 
                  aiStateStyle.pulse === 'slow' ? 'animate-bounce' : ''
                }`}
                style={{ color: aiStateStyle.color }}
              />
            </div>
          </div>
          
          <h1 className="text-xl font-semibold">Invoice Processor</h1>
          <span className="text-sm text-gray-500">Kinetic Edition</span>
          
          {/* Kinetic Context breadcrumb */}
          <AnimatePresence mode="wait">
            {currentView === 'analysis' && hasDocuments && (
              <motion.button
                onClick={() => setCurrentView('upload')}
                className="ml-4 px-3 py-1 text-sm bg-gray-100/80 text-gray-700 rounded-lg hover:bg-gray-200/80 transition-all duration-200 backdrop-blur-sm"
                variants={variants.item}
                initial="initial"
                animate="animate"
                exit="exit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                ← Nazad na upload
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Upload Controls sa Kinetic feedback */}
          <AnimatePresence mode="wait">
            {currentView === 'upload' && (
              <motion.div
                variants={variants.item}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <InlineUploadButton 
                  onFileUpload={handleFileUploadWithKinetic}
                  isUploading={processing}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis Controls sa Spotlight effect */}
          <AnimatePresence mode="wait">
            {currentView === 'analysis' && pendingDocuments.length > 0 && !settings.simpleUI && (
              <motion.button
                onClick={() => handleProcessWithKinetic(pendingDocuments)}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-2 disabled:opacity-50 relative overflow-hidden"
                variants={variants.item}
                initial="initial"
                animate="animate"
                exit="exit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-document-processing
              >
                <Play className="w-4 h-4" />
                <span>Analiziraj sve ({pendingDocuments.length})</span>
                
                {/* Kinetic processing indicator */}
                {processing && (
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-blue-400/20"
                    animate={{ 
                      x: [-100, 300],
                      transition: { 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }
                    }}
                  />
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Action Buttons sa enhanced animations */}
          <AnimatePresence mode="wait">
            {currentDocument?.analysis && (
              <motion.div 
                className="flex items-center gap-2"
                variants={variants.item}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <motion.button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    editMode ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Edit3 className="w-4 h-4" />
                  {editMode ? 'Završi uređivanje' : 'Uredi podatke'}
                </motion.button>

                <motion.button
                  onClick={() => setShowDebug(!showDebug)}
                  className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    showDebug ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Bug className="w-4 h-4" />
                  Debug
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings Dropdown */}
          {!settings.simpleUI && (
            <SettingsDropdown
              ref={dropdownRef}
              settings={settings}
              onSettingUpdate={updateSetting}
              onTestConnection={testAIConnection}
              isOpen={showSettingsDropdown}
              onToggle={() => setShowSettingsDropdown(!showSettingsDropdown)}
              isProcessing={processing}
            />
          )}
        </div>
      </motion.header>

      {/* Enhanced Progress Bar sa Kinetic design */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ProgressBar 
              progress={progress}
              message={progressStep}
              variant="blue"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display sa Kinetic animations */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 p-4 mx-6 mt-4 rounded-lg flex items-center gap-3"
            variants={variants.item}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <p className="text-red-800 text-sm font-medium">Greška</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <motion.button 
              onClick={clearError} 
              className="text-red-600 hover:text-red-800"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content sa Focus Mode support */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document List Sidebar */}
        <AnimatePresence mode="wait">
          {currentView === 'analysis' && (
            <motion.div
              variants={variants.item}
              initial="initial"
              animate="animate"
              exit="exit"
              className={focusMode ? 'opacity-70 blur-sm' : ''}
            >
              <DocumentList
                documents={documents}
                currentIndex={currentDocIndex}
                onDocumentSelect={selectDocument}
                onDocumentRemove={removeDocument}
                onDocumentAnalyze={handleProcessWithKinetic}
                isProcessing={processing}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <motion.div 
          ref={mainContentRef}
          className={`flex-1 overflow-y-auto ${focusMode ? 'relative' : ''}`}
          variants={variants.item}
        >
          <AnimatePresence mode="wait">
            {currentView === 'upload' ? (
              /* Upload View sa Kinetic enhancements */
              <motion.div 
                className="h-full p-6"
                key="upload"
                variants={variants.item}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div data-upload-zone>
                  <DocumentUploader 
                    onFileUpload={handleFileUploadWithKinetic}
                    isUploading={processing}
                  />
                </div>
              </motion.div>
            ) : (
              /* Analysis View sa Dynamic Focus */
              <motion.div 
                className="p-6"
                key="analysis"
                variants={variants.item}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {currentDocument ? (
                  <div>
                    {/* Document Header sa Kinetic status */}
                    <motion.div 
                      className="flex items-center justify-between mb-6"
                      variants={variants.item}
                    >
                      <div>
                        <h2 className="text-xl font-semibold">{currentDocument.name}</h2>
                        <p className="text-sm text-gray-600">
                          {currentDocument.type} • {(currentDocument.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      
                      <AnimatePresence>
                        {currentDocument.analysis && (
                          <motion.div 
                            className="flex items-center gap-2"
                            variants={variants.spotlight}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                          >
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-700">Analizirano</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Document Content */}
                    {currentDocument.analysis ? (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Main Analysis - 8 columns */}
                        <motion.div 
                          className="lg:col-span-8 space-y-6"
                          variants={variants.item}
                        >
                          <DocumentAnalysisView
                            document={currentDocument}
                            editMode={editMode}
                            onFieldUpdate={updateDocumentField}
                            simple={settings.simpleUI}
                          />
                          
                          <ExportActions 
                            document={currentDocument}
                            onExportExcel={exportCurrentToExcel}
                            onExportJSON={exportCurrentToJSON}
                            onSaveToDatabase={saveToDatabase}
                          />
                        </motion.div>
                        
                        {/* Sidebar - 4 columns */}
                        <motion.div 
                          className="lg:col-span-4 space-y-6"
                          variants={variants.item}
                        >
                          <QuickStats document={currentDocument} />
                          
                          {/* Enhanced Document Preview sa Focus Mode */}
                          <motion.div 
                            className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-4 cursor-pointer"
                            whileHover={{ scale: 1.02, boxShadow: "0 10px 40px rgba(0,0,0,0.1)" }}
                            onClick={() => activateFocusMode('[data-document-preview]')}
                            data-document-preview
                          >
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Focus className="w-4 h-4" />
                              Pregled dokumenta
                            </h4>
                            <div className="aspect-[4/5] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                              <Cloud className="w-8 h-8" />
                            </div>
                            <div className="text-center text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Klik za Focus Mode
                            </div>
                          </motion.div>
                        </motion.div>
                      </div>
                    ) : (
                      /* Document not processed yet */
                      <motion.div 
                        className="flex flex-col items-center justify-center py-12"
                        variants={variants.item}
                      >
                        <AnimatePresence mode="wait">
                          {currentDocument.status === 'processing' ? (
                            <motion.div
                              key="processing"
                              variants={variants.item}
                              className="text-center"
                            >
                              <motion.div 
                                className="rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4 mx-auto"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              />
                              <p className="text-gray-500">Analizira dokument...</p>
                            </motion.div>
                          ) : currentDocument.status === 'error' ? (
                            <motion.div
                              key="error"
                              variants={variants.item}
                              className="text-center"
                            >
                              <AlertCircle className="w-8 h-8 mb-4 text-red-500 mx-auto" />
                              <p className="font-medium text-red-500">Greška u analizi</p>
                              <p className="text-sm text-gray-600">{currentDocument.error}</p>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="idle"
                              variants={variants.item}
                              className="text-center"
                            >
                              <Cloud className="w-8 h-8 mb-4 text-gray-400 mx-auto" />
                              <p className="text-gray-500 mb-4">Dokument nije analiziran</p>
                              <motion.button
                                onClick={() => handleProcessWithKinetic([currentDocument])}
                                disabled={processing}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Pokreni analizu
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>
                ) : !hasDocuments ? (
                  /* No documents */
                  <motion.div 
                    className="flex flex-col items-center justify-center h-full text-gray-500"
                    variants={variants.item}
                  >
                    <Cloud className="w-16 h-16 mb-4 text-gray-300" />
                    <h2 className="text-xl font-semibold mb-2">Nema dokumenata</h2>
                    <p className="text-gray-600">Vratite se na upload stranicu da dodate datoteke</p>
                  </motion.div>
                ) : (
                  /* Select document */
                  <motion.div 
                    className="flex flex-col items-center justify-center h-full text-gray-500"
                    variants={variants.item}
                  >
                    <Cloud className="w-16 h-16 mb-4 text-gray-300" />
                    <h2 className="text-xl font-semibold mb-2">Izaberite dokument</h2>
                    <p className="text-gray-600">Kliknite na dokument iz liste levo</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Process Tray - AI Agent Activity Display */}
      <motion.div
        ref={processTrayRef}
        className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 p-4 transform translateY-full transition-transform duration-500 z-50"
        style={{ 
          background: `linear-gradient(to right, ${aiStateStyle.color}10, transparent)`,
        }}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <StateIcon 
              className={`w-5 h-5 ${
                aiStateStyle.pulse === 'fast' ? 'animate-spin' : 
                aiStateStyle.pulse === 'slow' ? 'animate-bounce' : ''
              }`}
              style={{ color: aiStateStyle.color }}
            />
            <div>
              <p className="text-sm font-medium">AI Agent je aktivan</p>
              <p className="text-xs text-gray-600">{progressStep || 'Obrađuje dokumenta...'}</p>
            </div>
          </div>
          
          <motion.button
            onClick={() => {
              // Stop processing logic here
            }}
            className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Zaustavi Agent
          </motion.button>
        </div>
      </motion.div>

      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Debug Panel sa enhanced design */}
      <AnimatePresence>
        {showDebug && currentDocument && (
          <motion.div
            variants={variants.item}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <DebugPanel 
              document={currentDocument}
              additionalData={{
                settings,
                processing,
                progress,
                progressStep,
                stats: getDocumentStats(),
                aiState,
                focusMode,
                ambientActivity
              }}
              visible={showDebug}
              onClose={() => setShowDebug(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}