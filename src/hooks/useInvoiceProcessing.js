import { useState, useCallback, useRef } from 'react';
import { invoiceProcessingService } from '../services/invoice/InvoiceProcessingService';
import { invoiceDataService } from '../services/invoice/InvoiceDataService';
import { AI_MODES, GOOGLE_MODELS } from '../constants/aiModes';

/**
 * useInvoiceProcessing - Custom hook za upravljanje invoice processing state-om
 * 
 * Centralizira svu logiku oko:
 * - Document management (upload, remove, select)
 * - AI processing i analiza
 * - Settings management
 * - Progress tracking
 * - Error handling
 * 
 * @returns {Object} Hook state i funkcije
 */
export default function useInvoiceProcessing() {
  // Core state
  const [documents, setDocuments] = useState([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [currentView, setCurrentView] = useState('upload'); // 'upload' | 'analysis'
  
  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState(null);
  
  // UI state
  const [editMode, setEditMode] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    simpleUI: true,
    autoAnalyze: true,
    analysisMode: AI_MODES.CLOUD_GOOGLE_PDF,
    googleApiKey: '',
    selectedModel: GOOGLE_MODELS.GEMINI_15_PRO,
  });

  // Refs
  const dropdownRef = useRef(null);
  
  // Derived state
  const currentDocument = documents[currentDocIndex] || null;
  const pendingDocuments = documents.filter(d => d.status === 'uploaded');
  const analyzedDocuments = documents.filter(d => d.status === 'analyzed');
  const hasDocuments = documents.length > 0;

  /**
   * File upload handler
   * Validira files i kreira document objekte
   */
  const handleFileUpload = useCallback(async (files) => {
    if (!files?.length) return;

    try {
      setError(null);
      
      // Validiraj files
      const validFiles = invoiceProcessingService.validateFiles(files);
      
      if (validFiles.length === 0) {
        throw new Error('Nema validnih datoteka za upload');
      }

      // Kreiraj document objekte
      const newDocuments = validFiles.map((file, i) => 
        invoiceProcessingService.createDocumentFromFile(file, i)
      );

      // Dodaj u state
      setDocuments(prev => [...prev, ...newDocuments]);
      setCurrentView('analysis');
      
      // Auto analiza ako je uključena
      if (settings.autoAnalyze && newDocuments.length > 0) {
        processDocuments(newDocuments);
      }

      return newDocuments;
      
    } catch (err) {
      console.error('File upload error:', err);
      setError(err.message);
      return [];
    }
  }, [settings.autoAnalyze]);

  /**
   * Proces batch dokumenata
   */
  const processDocuments = useCallback(async (documentsToProcess = pendingDocuments) => {
    if (!documentsToProcess?.length) return;

    setProcessing(true);
    setError(null);
    setProgress(0);

    try {
      await invoiceProcessingService.processBatchDocuments(
        documentsToProcess,
        settings,
        // Progress callback
        (message, percent) => {
          setProgressStep(message);
          setProgress(percent);
        },
        // Document update callback
        (documentId, updates) => {
          setDocuments(prev => prev.map(doc => 
            doc.id === documentId 
              ? { ...doc, ...updates }
              : doc
          ));
        }
      );
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message);
    } finally {
      setProcessing(false);
      // Clear progress after delay
      setTimeout(() => {
        setProgress(0);
        setProgressStep('');
      }, 2000);
    }
  }, [pendingDocuments, settings]);

  /**
   * Update document field
   */
  const updateDocumentField = useCallback((fieldPath, value) => {
    if (!currentDocument) return;
    
    setDocuments(prev => prev.map(doc => {
      if (doc.id === currentDocument.id) {
        return invoiceDataService.updateDocumentField(doc, fieldPath, value);
      }
      return doc;
    }));
  }, [currentDocument]);

  /**
   * Remove document
   */
  const removeDocument = useCallback((documentId) => {
    setDocuments(prev => {
      const newDocs = prev.filter(d => d.id !== documentId);
      
      // Adjust current index if needed
      if (currentDocIndex >= newDocs.length) {
        setCurrentDocIndex(Math.max(0, newDocs.length - 1));
      }
      
      return newDocs;
    });
  }, [currentDocIndex]);

  /**
   * Select document
   */
  const selectDocument = useCallback((index) => {
    if (index >= 0 && index < documents.length) {
      setCurrentDocIndex(index);
    }
  }, [documents.length]);

  /**
   * Update settings
   */
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Export functions
   */
  const exportCurrentToExcel = useCallback(() => {
    if (!currentDocument?.analysis) {
      setError('Nema podataka za export');
      return;
    }

    try {
      invoiceDataService.exportItemsToExcel(currentDocument);
    } catch (err) {
      setError(err.message);
    }
  }, [currentDocument]);

  const exportCurrentToJSON = useCallback(() => {
    if (!currentDocument?.analysis) {
      setError('Nema podataka za export');
      return;
    }

    try {
      invoiceDataService.exportDocumentToJSON(currentDocument);
    } catch (err) {
      setError(err.message);
    }
  }, [currentDocument]);

  /**
   * Save to database
   */
  const saveToDatabase = useCallback(async () => {
    if (!currentDocument?.analysis) {
      setError('Nema podataka za spremanje');
      return;
    }

    try {
      const result = await invoiceDataService.saveToDatabase(currentDocument);
      
      // Update document sa saved flag
      setDocuments(prev => prev.map(doc => 
        doc.id === currentDocument.id 
          ? { 
              ...doc, 
              saved: true, 
              savedDate: new Date().toISOString(),
              savedData: result.savedData 
            }
          : doc
      ));

      // Show success (možda dodati toast notification)
      console.log('Document saved successfully:', result);
      
    } catch (err) {
      setError(err.message);
    }
  }, [currentDocument]);

  /**
   * Test AI connection
   */
  const testAIConnection = useCallback(async () => {
    const apiKey = settings.googleApiKey || import.meta.env.VITE_GOOGLE_AI_API_KEY;
    
    if (!apiKey) {
      setError('API ključ nije definiran');
      return;
    }

    setProgressStep('Testira konekciju...');
    
    try {
      const result = await invoiceProcessingService.testAIConnection(apiKey, settings.selectedModel);
      
      if (result.success) {
        alert(`✅ ${result.message}\nOdgovor: ${result.response}`);
      } else {
        setError(result.message);
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setProgressStep('');
    }
  }, [settings.googleApiKey, settings.selectedModel]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset all state
   */
  const resetState = useCallback(() => {
    setDocuments([]);
    setCurrentDocIndex(0);
    setCurrentView('upload');
    setProcessing(false);
    setProgress(0);
    setProgressStep('');
    setError(null);
    setEditMode(false);
    setShowDebug(false);
    setShowSettingsDropdown(false);
  }, []);

  /**
   * Get document stats
   */
  const getDocumentStats = useCallback((document = currentDocument) => {
    if (!document) return null;
    return invoiceDataService.getDocumentStats(document);
  }, [currentDocument]);

  // Return hook interface
  return {
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
    
    // Computed state
    pendingDocuments,
    analyzedDocuments,
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
    resetState,
    getDocumentStats,
    
    // UI actions
    setCurrentView,
    setEditMode,
    setShowDebug,
    setShowSettingsDropdown,
  };
}