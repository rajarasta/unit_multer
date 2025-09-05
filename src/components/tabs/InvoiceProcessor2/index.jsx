import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  FileText, Upload, AlertCircle, CheckCircle2, Loader2,
  X, Settings, ChevronDown, Key, Cpu, Eye, Wrench, Cloud,
  Edit3, FileSpreadsheet, FileCode, Download, Database, Bug, Plus, Play
} from 'lucide-react';

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import backendService from '../../../services/BackendService';
import { AI_MODES, GOOGLE_MODELS, GOOGLE_MODEL_LABELS } from '../../../constants/aiModes';

// Konfiguracija za pdf.js worker kako bi radio u pregledniku
if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

// Konstante za prikaz tipova dokumenata
const DOCUMENT_TYPES = {
  request: { label: 'Zahtjev za ponudu', icon: FileText, color: '#8b5cf6' },
  quote: { label: 'Ponuda / Predračun', icon: FileText, color: '#3b82f6' },
  invoice: { label: 'Račun', icon: FileText, color: '#121414ff' },
  delivery: { label: 'Otpremnica', icon: FileText, color: '#f59e0b' },
  transfer: { label: 'Međuskladišnica', icon: FileText, color: '#06b6d4' },
  receipt: { label: 'Primka', icon: FileText, color: '#ec4899' },
  other: { label: 'Ostalo', icon: FileText, color: '#64748b' },
};

export default function InvoiceProcessor2() {
  const [documents, setDocuments] = useState([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState(null);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [currentView, setCurrentView] = useState('upload'); // 'upload' or 'analysis'

  const [settings, setSettings] = useState({
    simpleUI: true,
    autoAnalyze: true,
    analysisMode: AI_MODES.CLOUD_GOOGLE_PDF,
    googleApiKey: '',
    selectedModel: GOOGLE_MODELS.GEMINI_15_PRO,
  });

  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const currentDocument = documents[currentDocIndex] || null;
  const simple = settings.simpleUI;

  // Helper functions
  const downloadJSON = (data, fileName) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value, currency = 'EUR') => {
    if (!value && value !== 0) return 'N/A';
    return `${Number(value).toFixed(2)} ${currency}`;
  };

  // Export functions
  const exportItemsToExcel = useCallback(() => {
    if (!currentDocument?.analysis?.items) return;
    
    const wb = XLSX.utils.book_new();
    const itemsData = currentDocument.analysis.items.map((item) => ({
      Pozicija: item.position || '',
      Šifra: item.code || '',
      Opis: item.description || '',
      Količina: item.quantity,
      'Jed. mjera': item.unit,
      'Jed. cijena': item.unitPrice,
      'Popust (%)': item.discountPercent,
      'Ukupno': item.totalPrice,
    }));
    
    const ws = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Stavke');
    XLSX.writeFile(wb, `stavke-${currentDocument.analysis.documentNumber || Date.now()}.xlsx`);
  }, [currentDocument]);

  const exportCurrentToJSON = useCallback(() => {
    if (!currentDocument?.analysis) return;
    downloadJSON(currentDocument.analysis, `dokument-${currentDocument.analysis?.documentNumber || Date.now()}.json`);
  }, [currentDocument]);

  // Document update function
  const updateDocumentData = useCallback((fieldPath, value) => {
    if (!currentDocument) return;
    
    setDocuments(prev => prev.map(doc => {
      if (doc.id === currentDocument.id) {
        const updated = { ...doc };
        const pathArray = fieldPath.split('.');
        let current = updated.analysis;
        
        // Navigate to the nested property
        for (let i = 0; i < pathArray.length - 1; i++) {
          if (!current[pathArray[i]]) {
            current[pathArray[i]] = {};
          }
          current = current[pathArray[i]];
        }
        
        // Set the final value
        current[pathArray[pathArray.length - 1]] = value;
        
        return updated;
      }
      return doc;
    }));
  }, [currentDocument]);

  // Efekt za zatvaranje dropdown izbornika kada se klikne izvan njega
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettingsDropdown(false);
      }
    }
    if (showSettingsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  /**
   * Renderira stranice PDF-a u slike (File objekte).
   * Vraća ažurirani objekt dokumenta s renderiranim stranicama.
   */
  const renderPdfPages = useCallback(async (doc) => {
    if (!doc.type.includes('pdf')) return doc;

    setProgressStep(`Renderira ${doc.name}...`);
    try {
      const arrayBuffer = await doc.file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const renderedPages = [];
      const numPagesToRender = Math.min(pdf.numPages, 5);

      for (let i = 1; i <= numPagesToRender; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
        renderedPages.push(new File([blob], `${doc.name}_page_${i}.png`, { type: 'image/png' }));
      }

      const updatedDoc = { ...doc, renderedPages };
      setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
      return updatedDoc;
    } catch (renderError) {
      console.error("PDF rendering failed:", renderError);
      throw new Error(`Greška pri renderiranju PDF-a: ${renderError.message}`);
    }
  }, []);

  /**
   * Glavna funkcija za analizu dokumenta koristeći CloudLLMService.
   */
  const analyzeWithCloudAI = useCallback(async (doc) => {
    const progressCallback = (message, percent) => {
      setProgressStep(message);
      setProgress(percent);
    };

    let documentToAnalyze = doc;
    let filesForAnalysis;

    if (settings.analysisMode === AI_MODES.CLOUD_GOOGLE_VISION) {
      if (!documentToAnalyze.renderedPages || documentToAnalyze.renderedPages.length === 0) {
        documentToAnalyze = await renderPdfPages(documentToAnalyze);
      }
      filesForAnalysis = documentToAnalyze.renderedPages;
    } else {
      filesForAnalysis = [documentToAnalyze.file];
    }
    
    if (!filesForAnalysis || filesForAnalysis.length === 0) {
      throw new Error("Nema datoteka za analizu. Renderiranje PDF-a možda nije uspjelo.");
    }
    
    const result = await backendService.analyzeDocumentGoogle({
      apiKey: settings.googleApiKey || null,
      model: settings.selectedModel,
      files: filesForAnalysis,
      onProgress: progressCallback
    });

    return result.data;
  }, [settings.analysisMode, settings.googleApiKey, settings.selectedModel, renderPdfPages]);

  /**
   * Obrađuje niz dokumenata jedan po jedan.
   */
  const processDocuments = useCallback(async (documentsToProcess) => {
    setProcessing(true);
    setError(null);

    for (let i = 0; i < documentsToProcess.length; i++) {
      const doc = documentsToProcess[i];
      setProgressStep(`Obrađuje ${doc.name} (${i + 1}/${documentsToProcess.length})`);
      
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'processing' } : d));

      try {
        const analysis = await analyzeWithCloudAI(doc);
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'analyzed', analysis, error: null } : d
        ));
      } catch (analysisError) {
        const errorMessage = analysisError instanceof Error ? analysisError.message : String(analysisError);
        setDocuments(prev => prev.map(d => 
          d.id === doc.id ? { ...d, status: 'error', error: errorMessage } : d
        ));
      }
    }

    setProcessing(false);
    setTimeout(() => { setProgress(0); setProgressStep(''); }, 2000);
  }, [analyzeWithCloudAI]);

  /**
   * Upravlja učitavanjem novih datoteka i pokreće analizu ako je uključena.
   */
  const handleFileUpload = useCallback(async (files) => {
    if (!files?.length) return;

    setError(null);
    const newDocuments = Array.from(files).map((file, i) => ({
      id: Date.now() + i,
      name: file.name,
      file,
      type: file.type,
      size: file.size,
      status: 'uploaded',
      analysis: null,
      error: null,
      renderedPages: []
    }));

    setDocuments(prev => [...prev, ...newDocuments]);
    setCurrentView('analysis'); // Switch to analysis view
    
    if (settings.autoAnalyze) {
      processDocuments(newDocuments);
    }
  }, [settings.autoAnalyze, processDocuments]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const removeDocument = useCallback((id) => {
    setDocuments(prev => {
      const newDocs = prev.filter(d => d.id !== id);
      if (currentDocIndex >= newDocs.length) {
        setCurrentDocIndex(Math.max(0, newDocs.length - 1));
      }
      return newDocs;
    });
  }, [currentDocIndex]);

  const saveToDatabase = useCallback(() => {
    if (!currentDocument?.analysis) {
      alert('Nema podataka za spremanje');
      return;
    }

    try {
      const analysisData = {
        ...currentDocument.analysis,
        fileName: currentDocument.name,
        processedDate: new Date().toISOString(),
        id: currentDocument.id
      };

      console.log('Spremam u bazu podataka:', analysisData);
      
      alert(`Dokument "${currentDocument.name}" uspješno spremljen u bazu!`);
      
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === currentDocument.id 
            ? { ...doc, saved: true, savedDate: new Date().toISOString() }
            : doc
        )
      );

    } catch (error) {
      console.error('Greška pri spremanju:', error);
      alert('Greška pri spremanju u bazu podataka');
    }
  }, [currentDocument]);

  /**
   * EditableField komponenta za uređivanje podataka
   */
  const EditableField = ({ label, value, fieldPath, onChange, editMode, type = 'text', placeholder = 'N/A', isNumeric = false }) => {
    const displayValue = React.useMemo(() => {
      if (value === null || value === undefined) return placeholder;
      if (isNumeric) {
        const num = Number(value);
        return isNaN(num) ? placeholder : num.toFixed(2);
      }
      return value;
    }, [value, isNumeric, placeholder]);

    const handleChange = (e) => {
      onChange(fieldPath, e.target.value);
    };

    return (
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">
          {label}
        </label>
        {editMode ? (
          <input
            type={type === 'date' ? 'date' : (isNumeric ? 'number' : 'text')}
            step={isNumeric ? "0.01" : undefined}
            value={value === null ? '' : String(value)} 
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        ) : (
          <div className={`p-3 bg-gray-100 rounded-lg font-medium ${isNumeric ? 'text-right' : ''} ${!value ? 'text-gray-400' : 'text-gray-800'}`}>
            {displayValue}
          </div>
        )}
      </div>
    );
  };

  /**
   * DebugPanel komponenta za prikaz debug informacija
   */
  const DebugPanel = ({ document }) => {
    const [viewMode, setViewMode] = useState('analysis');
    
    if (!document) return null;

    return (
      <div className="mt-6 bg-gray-900 text-green-400 rounded-xl p-6 font-mono shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Bug className="w-5 h-5 text-yellow-400" />
            Debug Panel
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('analysis')}
              className={`px-3 py-1 rounded text-xs ${viewMode === 'analysis' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Analysis
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded text-xs ${viewMode === 'raw' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Raw Data
            </button>
          </div>
        </div>
        
        <div className="bg-black rounded-lg p-4 max-h-96 overflow-auto">
          <pre className="text-xs whitespace-pre-wrap">
            {viewMode === 'analysis' 
              ? JSON.stringify(document.analysis, null, 2)
              : JSON.stringify(document, null, 2)
            }
          </pre>
        </div>
      </div>
    );
  };

  /**
   * ExportActions komponenta za export funkcionalnosti
   */
  const ExportActions = ({ document, onExportItemsExcel, onExportCurrentJSON, onSaveToDatabase, simple }) => {
    if (!document?.analysis) return null;

    return (
      <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-4">
        <h4 className="font-semibold mb-3">Export opcije</h4>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={onExportItemsExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm shadow-md"
          >
            <FileSpreadsheet size={16} />
            Excel stavke
          </button>
          <button 
            onClick={onExportCurrentJSON}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-sm shadow-md"
          >
            <FileCode size={16} />
            JSON (trenutni)
          </button>
          <button 
            onClick={onSaveToDatabase}
            disabled={!simple}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all text-sm shadow-md"
          >
            <Database size={16} />
            Potvrdi sve
          </button>
          {!simple && (
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all text-sm shadow-md"
            >
              Batch poređenje
            </button>
          )}
        </div>
      </div>
    );
  };

  /**
   * Prikazuje rezultate analize za odabrani dokument s mogućnošću uređivanja.
   */
  const DocumentAnalysisView = ({ document, simple }) => {
    if (!document?.analysis) return null;
    const analysis = document.analysis;
    const currency = analysis.currency || 'EUR';

    return (
      <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-6 space-y-6">
        {/* Header with document type selector for simple UI */}
        {simple && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-3">Podaci dokumenta</h3>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Tip dokumenta</label>
              <select
                value={analysis.documentType || 'invoice'}
                onChange={(e) => updateDocumentData('documentType', e.target.value)}
                disabled={!editMode}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {/* Basic Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <EditableField 
            label="Broj dokumenta" 
            value={analysis.documentNumber} 
            fieldPath="documentNumber" 
            editMode={editMode} 
            onChange={updateDocumentData} 
          />
          <EditableField 
            label="Datum" 
            value={analysis.date} 
            fieldPath="date" 
            editMode={editMode} 
            onChange={updateDocumentData} 
            type="date" 
          />
          <EditableField 
            label="Datum dospijeća" 
            value={analysis.dueDate} 
            fieldPath="dueDate" 
            editMode={editMode} 
            onChange={updateDocumentData} 
            type="date" 
          />
          <EditableField 
            label="Valuta" 
            value={analysis.currency} 
            fieldPath="currency" 
            editMode={editMode} 
            onChange={updateDocumentData} 
          />
        </div>

        {/* Supplier & Buyer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-200">
            <h4 className="font-semibold mb-3 text-blue-800">Dobavljač</h4>
            <EditableField 
              label="Naziv" 
              value={analysis.supplier?.name} 
              fieldPath="supplier.name" 
              editMode={editMode} 
              onChange={updateDocumentData} 
            />
            <EditableField 
              label="OIB" 
              value={analysis.supplier?.oib} 
              fieldPath="supplier.oib" 
              editMode={editMode} 
              onChange={updateDocumentData} 
            />
            <EditableField 
              label="IBAN" 
              value={analysis.supplier?.iban} 
              fieldPath="supplier.iban" 
              editMode={editMode} 
              onChange={updateDocumentData} 
            />
            <EditableField 
              label="Adresa" 
              value={analysis.supplier?.address} 
              fieldPath="supplier.address" 
              editMode={editMode} 
              onChange={updateDocumentData} 
            />
          </div>

          <div className="bg-green-50 p-4 rounded-lg space-y-3 border border-green-200">
            <h4 className="font-semibold mb-3 text-green-800">Kupac</h4>
            <EditableField 
              label="Naziv" 
              value={analysis.buyer?.name} 
              fieldPath="buyer.name" 
              editMode={editMode} 
              onChange={updateDocumentData} 
            />
            <EditableField 
              label="OIB" 
              value={analysis.buyer?.oib} 
              fieldPath="buyer.oib" 
              editMode={editMode} 
              onChange={updateDocumentData} 
            />
            <EditableField 
              label="Adresa" 
              value={analysis.buyer?.address} 
              fieldPath="buyer.address" 
              editMode={editMode} 
              onChange={updateDocumentData} 
            />
          </div>
        </div>

        {/* Items Table - only show in simple mode if needed */}
        {analysis.items && analysis.items.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Stavke ({analysis.items.length})</h4>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Šifra</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kol.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jed.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cijena</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Popust %</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ukupno</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysis.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-medium">{item.position || idx + 1}</td>
                      <td className="px-3 py-2 text-sm font-mono">{item.code || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm max-w-xl whitespace-pre-wrap">{item.description}</td>
                      <td className="px-3 py-2 text-sm text-right">{item.quantity?.toFixed(3)}</td>
                      <td className="px-3 py-2 text-sm">{item.unit || 'kom'}</td>
                      <td className="px-3 py-2 text-sm text-right">{formatCurrency(item.unitPrice, currency)}</td>
                      <td className="px-3 py-2 text-sm text-right">{item.discountPercent?.toFixed(2) || '0.00'}</td>
                      <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(item.totalPrice, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals */}
        {analysis.totals && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              {/* Placeholder */}
            </div>
            <div className="space-y-4">
              <EditableField
                label="Osnovica"
                value={analysis.totals.subtotal}
                fieldPath="totals.subtotal"
                editMode={editMode}
                onChange={updateDocumentData}
                isNumeric={true}
              />
              <EditableField
                label="PDV"
                value={analysis.totals.vatAmount}
                fieldPath="totals.vatAmount"
                editMode={editMode}
                onChange={updateDocumentData}
                isNumeric={true}
              />
              <div className="pt-2 border-t border-gray-300">
                <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-lg">
                  <span className="font-bold text-lg">UKUPNO</span>
                  <span className="font-bold text-2xl">
                    {formatCurrency(analysis.totals.totalAmount, currency)}
                  </span>
                </div>
                {editMode && (
                  <div className="mt-2">
                    <input 
                      type="number"
                      step="0.01"
                      value={analysis.totals.totalAmount === null ? '' : String(analysis.totals.totalAmount)}
                      onChange={(e) => updateDocumentData('totals.totalAmount', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500"
                      placeholder="Ručni unos ukupnog iznosa"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-800">
      <div className="bg-white border-b px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cloud className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold">Invoice Processor</h1>
          <span className="text-sm text-gray-500">Google AI Edition</span>
          
          {currentView === 'analysis' && documents.length > 0 && (
            <button
              onClick={() => setCurrentView('upload')}
              className="ml-4 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              ← Nazad na upload
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* File Upload Controls - Visible in upload view */}
          {currentView === 'upload' && (
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Dodaj datoteke
              </button>
            </div>
          )}

          {/* Analysis Controls - Visible in analysis view */}
          {currentView === 'analysis' && documents.some(d => d.status === 'uploaded') && !simple && (
            <button
              onClick={() => processDocuments(documents.filter(d => d.status === 'uploaded'))}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Analiziraj sve
            </button>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentDocument?.analysis && (
              <>
                <button
                  onClick={() => setEditMode(prev => !prev)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    editMode ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  {editMode ? 'Završi uređivanje' : 'Uredi podatke'}
                </button>

                <button
                  onClick={() => setShowDebug(prev => !prev)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    showDebug ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Bug className="w-4 h-4" />
                  Debug
                </button>
              </>
            )}
          </div>

          {!simple && (
            <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowSettingsDropdown(prev => !prev)}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 min-w-[200px]"
            >
              <Settings className="w-4 h-4" />
              <span className="truncate flex-1 text-left">{GOOGLE_MODEL_LABELS[settings.selectedModel] || settings.selectedModel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSettingsDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-medium">Google AI API</h4>
                  </div>
                  <input
                    type="password"
                    value={settings.googleApiKey}
                    onChange={(e) => updateSetting('googleApiKey', e.target.value)}
                    placeholder={import.meta.env.VITE_GOOGLE_AI_API_KEY ? "Koristi se .env ključ" : "Unesite API ključ"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  {!settings.googleApiKey && !import.meta.env.VITE_GOOGLE_AI_API_KEY && (
                    <p className="text-xs text-red-600 mt-1">API ključ je potreban za analizu</p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-medium">AI Model</h4>
                  </div>
                  <select
                    value={settings.selectedModel}
                    onChange={(e) => updateSetting('selectedModel', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {Object.entries(GOOGLE_MODEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-medium">Način analize</h4>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        name="analysisMode"
                        value={AI_MODES.CLOUD_GOOGLE_PDF}
                        checked={settings.analysisMode === AI_MODES.CLOUD_GOOGLE_PDF}
                        onChange={(e) => updateSetting('analysisMode', e.target.value)}
                        className="mr-2"
                      />
                      📄 PDF Analiza
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        name="analysisMode"
                        value={AI_MODES.CLOUD_GOOGLE_VISION}
                        checked={settings.analysisMode === AI_MODES.CLOUD_GOOGLE_VISION}
                        onChange={(e) => updateSetting('analysisMode', e.target.value)}
                        className="mr-2"
                      />
                      👁️ Vision Analiza
                    </label>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="w-4 h-4 text-gray-600" />
                    <h4 className="text-sm font-medium">Obrada</h4>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm">
                      Automatska analiza
                      <input
                        type="checkbox"
                        checked={settings.autoAnalyze}
                        onChange={(e) => updateSetting('autoAnalyze', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <button
                    onClick={async () => {
                      const apiKey = settings.googleApiKey || import.meta.env.VITE_GOOGLE_AI_API_KEY;
                      if (!apiKey) {
                        alert('API ključ nije definiran.');
                        return;
                      }
                      
                      setProgressStep('Testira konekciju...');
                      try {
                        const result = await backendService.testGoogleAIConnection(apiKey, settings.selectedModel);
                        alert(`✅ ${result.message}\nOdgovor: ${result.testResponse}`);
                      } catch (error) {
                        alert(`❌ ${error.message}`);
                      } finally {
                        setProgressStep('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    Test konekcije
                  </button>
                </div>
              </div>
            </div>
            )}
            </div>
          )}
        </div>
      </div>

      {processing && (
        <div className="bg-blue-50 border-b px-6 py-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">{progressStep}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 mx-6 mt-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <p className="text-red-800 text-sm font-medium">Greška</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {currentView === 'analysis' && (
          <div className="w-80 border-r bg-white p-4 overflow-y-auto flex flex-col">
            <div className="space-y-2 flex-1">
            {documents.map((doc, index) => (
              <div
                key={doc.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  index === currentDocIndex ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setCurrentDocIndex(index)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium truncate flex-1">{doc.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeDocument(doc.id); }}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {doc.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                    {doc.status === 'analyzed' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                    {doc.status === 'error' && <AlertCircle className="w-3 h-3 text-red-600" />}
                    <span className="text-xs text-gray-600 capitalize">{doc.status}</span>
                  </div>
                  
                  {doc.status === 'uploaded' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); processDocuments([doc]); }}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                    >
                      Analiziraj
                    </button>
                  )}
                </div>

                {doc.error && (
                  <p className="text-xs text-red-600 mt-1 truncate">{doc.error}</p>
                )}
              </div>
            ))}

            {documents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nema učitanih dokumenata</p>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          {currentView === 'upload' ? (
            /* Upload View - Full screen upload area */
            <div 
              className="flex flex-col items-center justify-center h-full text-gray-500 border-2 border-dashed border-gray-300 rounded-xl mx-6 my-6"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
            >
              <Upload className="w-16 h-16 mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold mb-2">Kliknite ili povucite datoteke</h2>
              <p className="text-gray-600 mb-4">PDF ili slike</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Odaberite datoteke
              </button>
            </div>
          ) : (
            /* Analysis View - Document analysis interface */
            <div className="p-6">
              {currentDocument ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">{currentDocument.name}</h2>
                      <p className="text-sm text-gray-600">
                        {currentDocument.type} • {(currentDocument.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    
                    {currentDocument.analysis && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-700">Analizirano</span>
                      </div>
                    )}
                  </div>

                  {currentDocument.analysis ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Column - 8/12 */}
                      <div className="lg:col-span-8 space-y-6 min-w-0">
                        <DocumentAnalysisView document={currentDocument} simple={simple} />
                        <ExportActions 
                          document={currentDocument}
                          onExportItemsExcel={exportItemsToExcel}
                          onExportCurrentJSON={exportCurrentToJSON}
                          onSaveToDatabase={saveToDatabase}
                          simple={simple}
                        />
                      </div>
                      
                      {/* Right Column - 4/12 */}
                      <div className="lg:col-span-4 space-y-6 min-w-0">
                        {/* Quick Stats */}
                        {currentDocument.analysis && (
                          <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-4">
                            <h4 className="font-semibold mb-3">Brza analiza</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Broj stavki</span>
                                <span className="font-medium">{currentDocument.analysis.items?.length || 0}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Ukupna vrijednost</span>
                                <span className="font-medium">{formatCurrency(currentDocument.analysis.totals?.totalAmount, currentDocument.analysis.currency)}</span>
                              </div>
                              <div>
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-gray-600">Pouzdanost</span>
                                  <span className="font-medium">{Math.round((currentDocument.analysis.confidence || 0.85) * 100)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ width: `${Math.round((currentDocument.analysis.confidence || 0.85) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Document Preview Placeholder */}
                        <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-4">
                          <h4 className="font-semibold mb-3">Pregled dokumenta</h4>
                          <div className="aspect-[4/5] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                            <FileText className="w-8 h-8" />
                          </div>
                          <div className="text-center text-xs text-gray-500 mt-2">Klik za Focus Mode</div>
                        </div>
                      </div>
                    </div>
                  ) : currentDocument.status === 'processing' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-4" />
                      <p>Analizira dokument...</p>
                    </div>
                  ) : currentDocument.status === 'error' ? (
                    <div className="flex flex-col items-center justify-center py-12 text-red-500">
                      <AlertCircle className="w-8 h-8 mb-4" />
                      <p className="font-medium">Greška u analizi</p>
                      <p className="text-sm text-gray-600">{currentDocument.error}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <FileText className="w-8 h-8 mb-4" />
                      <p>Dokument nije analiziran</p>
                      <button
                        onClick={() => processDocuments([currentDocument])}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Pokreni analizu
                      </button>
                    </div>
                  )}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText className="w-16 h-16 mb-4 text-gray-300" />
                  <h2 className="text-xl font-semibold mb-2">Nema dokumenata</h2>
                  <p className="text-gray-600">Vratite se na upload stranicu da dodate datoteke</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText className="w-16 h-16 mb-4 text-gray-300" />
                  <h2 className="text-xl font-semibold mb-2">Izaberite dokument</h2>
                  <p className="text-gray-600">Kliknite na dokument iz liste levo</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && currentDocument && (
        <DebugPanel document={currentDocument} />
      )}
    </div>
  );
}