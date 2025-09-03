import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Cloud, Upload, AlertCircle, CheckCircle2, Loader2,
  X, Send, FileSpreadsheet, Download, Bug, FileText
} from 'lucide-react';

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import CloudLLMService from '../../../services/CloudLLMService';
import { AI_MODES } from '../../../constants/aiModes';

// Configure pdf.js worker for the browser
if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

// Simple tag dictionary (labels/colors)
const DOCUMENT_TYPES = {
  request: { label: 'Zahtjev za ponudu', color: '#8b5cf6' },
  quote:   { label: 'Ponuda / Predračun', color: '#3b82f6' },
  invoice: { label: 'Račun', color: '#121414'  },
  delivery:{ label: 'Otpremnica', color: '#f59e0b' },
  transfer:{ label: 'Međuskladišnica', color: '#06b6d4' },
  receipt: { label: 'Primka', color: '#ec4899' },
  other:   { label: 'Ostalo', color: '#64748b' },
};

// ---- Helper UI chips -----------------
const StatusPill = ({ status }) => {
  const map = {
    uploaded: { text: 'Uploaded', class: 'text-gray-600' },
    processing: { text: 'Processing', class: 'text-blue-600' },
    analyzed: { text: 'Analyzed', class: 'text-green-700' },
    error: { text: 'Error', class: 'text-red-600' },
  };
  const s = map[status] || map.uploaded;
  return <span className={`text-xs ${s.class}`}>{s.text}</span>;
};

// ==================== MAIN ====================
export default function InvoiceProcessorV2Simple() {
  // ---- App state (simple skin) ----
  const [documents, setDocuments] = useState([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const [settings, setSettings] = useState({
    analysisMode: AI_MODES.CLOUD_GOOGLE_PDF,
    googleApiKey: '', // or use .env fallback
  });

  // "Project assignment" – feel free to wire real data later
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');

  const fileInputRef = useRef(null);
  const currentDocument = documents[currentDocIndex] || null;

  // ---------- Utils ----------
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

  const exportItemsToExcel = useCallback(() => {
    if (!currentDocument?.analysis?.items?.length) return;
    const wb = XLSX.utils.book_new();
    const rows = currentDocument.analysis.items.map((item) => ({
      Pozicija: item.position ?? '',
      Šifra: item.code ?? '',
      Opis: item.description ?? '',
      Količina: item.quantity ?? 0,
      'Jed. mjera': item.unit ?? '',
      'Jed. cijena': item.unitPrice ?? 0,
      'Popust (%)': item.discountPercent ?? 0,
      'Ukupno': item.totalPrice ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Stavke');
    XLSX.writeFile(wb, `stavke-${currentDocument.analysis.documentNumber || Date.now()}.xlsx`);
  }, [currentDocument]);

  const exportCurrentToJSON = useCallback(() => {
    if (!currentDocument?.analysis) return;
    downloadJSON(
      currentDocument.analysis,
      `dokument-${currentDocument.analysis?.documentNumber || Date.now()}.json`
    );
  }, [currentDocument]);

  // ---------- PDF preview (first page) ----------
  const renderPreviewPage = useCallback(async (doc) => {
    try {
      if (!doc || !doc.type?.includes('pdf')) return;
      // Already rendered?
      if (doc.previewUrl) return;

      const arrayBuffer = await doc.file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 1.4 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.9));
      const url = URL.createObjectURL(blob);

      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, previewUrl: url } : d));
    } catch (e) {
      // preview is not critical – ignore
      // console.warn('Preview render failed', e);
    }
  }, []);

  useEffect(() => {
    if (currentDocument && currentDocument.type?.includes('pdf')) {
      renderPreviewPage(currentDocument);
    }
  }, [currentDocument, renderPreviewPage]);

  // ---------- Cloud analysis ----------
  const analyzeWithCloudAI = useCallback(async (doc) => {
    const progressCallback = (message, percent) => {
      setProgressStep(message);
      setProgress(percent);
    };

    // For PDF mode we can just send the PDF; for vision we'd send page images (not needed here)
    const filesForAnalysis = [doc.file];
    const result = await CloudLLMService.analyzeDocumentGoogle({
      apiKey: settings.googleApiKey || null,
      model: "gemini-1.5-pro",
      files: filesForAnalysis,
      onProgress: progressCallback
    });

    return result.data;
  }, [settings.googleApiKey]);

  const processDocuments = useCallback(async (docs) => {
    setProcessing(true);
    setError(null);
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'processing' } : d));
      try {
        const analysis = await analyzeWithCloudAI(doc);
        setDocuments(prev => prev.map(d =>
          d.id === doc.id ? { ...d, status: 'analyzed', analysis, error: null } : d
        ));
      } catch (e) {
        setDocuments(prev => prev.map(d =>
          d.id === doc.id ? { ...d, status: 'error', error: e?.message || 'Greška' } : d
        ));
      }
    }
    setProcessing(false);
    setTimeout(() => { setProgress(0); setProgressStep(''); }, 1000);
  }, [analyzeWithCloudAI]);

  const handleFileUpload = useCallback((files) => {
    if (!files?.length) return;
    const newDocs = Array.from(files).map((file, i) => ({
      id: Date.now() + i,
      name: file.name,
      file,
      type: file.type,
      size: file.size,
      status: 'uploaded',
      analysis: null,
      error: null,
      previewUrl: null,
    }));
    setDocuments(prev => [...prev, ...newDocs]);
    // auto-analyze like v1 when user confirms, or analyze immediately?
    // Here: analyze immediately (feel free to change)
    processDocuments(newDocs);
  }, [processDocuments]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const removeDocument = useCallback((id) => {
    setDocuments(prev => {
      const toRemove = prev.find(d => d.id === id);
      if (toRemove?.previewUrl) URL.revokeObjectURL(toRemove.previewUrl);
      const next = prev.filter(d => d.id !== id);
      if (currentDocIndex >= next.length) {
        setCurrentDocIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  }, [currentDocIndex]);

  // ---------- Derived ----------
  const itemsCount = currentDocument?.analysis?.items?.length || 0;
  const totalAmount = currentDocument?.analysis?.totals?.totalAmount ?? null;
  const confidence = currentDocument?.analysis?.confidence ?? null;

  // ---------- UI ----------
  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-800">
      {/* HEADER */}
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cloud className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold">RUBILAKSE – Procesor Dokumenata</h1>
            <span className="text-xs text-gray-500">Google AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDebug(s => !s)}
              className="px-3 py-2 text-sm bg-white border rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <Bug className="w-4 h-4" />
              Prikaži Debug
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Novi Batch
            </button>
          </div>
        </div>
      </header>

      {/* PROGRESS */}
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

      {/* ERROR */}
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

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-6">
        {documents.length === 0 ? (
          // EMPTY – big dashed box like v1
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            className="border-2 border-dashed border-blue-300 rounded-2xl p-16 text-center bg-white/70"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-gray-800 mb-1">Povucite dokumente ovdje</h3>
            <p className="text-sm text-gray-500">ili kliknite za odabir • PDF, slike</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
            />
          </div>
        ) : (
          <>
            {/* Top file chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {documents.map((doc, idx) => (
                <div
                  key={doc.id}
                  className={`px-3 py-2 rounded-lg border flex items-center gap-3 cursor-pointer ${idx === currentDocIndex ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setCurrentDocIndex(idx)}
                >
                  <span className="text-sm font-medium truncate max-w-[180px]">{doc.name}</span>
                  {doc.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                  {doc.status === 'analyzed' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                  {doc.status === 'error' && <AlertCircle className="w-3 h-3 text-red-600" />}
                  <StatusPill status={doc.status} />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeDocument(doc.id); }}
                    className="ml-1 text-gray-400 hover:text-red-600"
                    title="Ukloni"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Main grid like v1: 8/12 + 4/12 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left column */}
              <div className="lg:col-span-8 space-y-6 min-w-0">
                {/* Project assignment */}
                <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-5">
                  <h3 className="font-semibold mb-4">Dodjela projektu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Projekt *</label>
                      <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-md bg-white"
                      >
                        <option value="">-- Odaberi projekt --</option>
                        <option value="PRJ-2025-0101">Stambena zgrada – Istok</option>
                        <option value="PRJ-2025-0102">Uredski Kompleks – Zapad</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Pozicija (opcionalno)</label>
                      <select
                        value={selectedPosition}
                        onChange={(e) => setSelectedPosition(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border rounded-md bg-white"
                      >
                        <option value="">-- Bez pozicije --</option>
                        <option value="PZ-01">PZ-01</option>
                        <option value="PZ-02">PZ-02</option>
                        <option value="ZP-01">ZP-01</option>
                        <option value="ZP-02">ZP-02</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Document analysis form (read-only v1 look) */}
                <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Analiza dokumenta</h3>
                    {currentDocument?.analysis?.documentType && (
                      <span
                        className="px-2 py-1 text-xs rounded"
                        style={{ background: `${DOCUMENT_TYPES[currentDocument.analysis.documentType]?.color || '#64748b'}20`,
                                 color: DOCUMENT_TYPES[currentDocument.analysis.documentType]?.color || '#64748b' }}
                      >
                        {DOCUMENT_TYPES[currentDocument.analysis.documentType]?.label || currentDocument.analysis.documentType}
                      </span>
                    )}
                  </div>

                  {/* Key fields */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="text-sm text-gray-600">Broj dokumenta</label>
                      <div className="mt-1 px-3 py-2 border rounded-md bg-gray-50">{currentDocument?.analysis?.documentNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Datum</label>
                      <div className="mt-1 px-3 py-2 border rounded-md bg-gray-50">{currentDocument?.analysis?.date || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Dospijeće</label>
                      <div className="mt-1 px-3 py-2 border rounded-md bg-gray-50">{currentDocument?.analysis?.dueDate || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Valuta</label>
                      <div className="mt-1 px-3 py-2 border rounded-md bg-gray-50">{currentDocument?.analysis?.currency || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="border rounded-xl p-4 bg-blue-50/50">
                      <h4 className="font-medium mb-2">Dobavljač</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div><span className="text-gray-600">Naziv:</span> {currentDocument?.analysis?.supplier?.name || 'N/A'}</div>
                        <div><span className="text-gray-600">OIB:</span> {currentDocument?.analysis?.supplier?.oib || 'N/A'}</div>
                        <div><span className="text-gray-600">IBAN:</span> {currentDocument?.analysis?.supplier?.iban || 'N/A'}</div>
                        <div><span className="text-gray-600">Adresa:</span> {currentDocument?.analysis?.supplier?.address || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="border rounded-xl p-4 bg-green-50/50">
                      <h4 className="font-medium mb-2">Kupac</h4>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div><span className="text-gray-600">Naziv:</span> {currentDocument?.analysis?.buyer?.name || 'N/A'}</div>
                        <div><span className="text-gray-600">OIB:</span> {currentDocument?.analysis?.buyer?.oib || 'N/A'}</div>
                        <div><span className="text-gray-600">Adresa:</span> {currentDocument?.analysis?.buyer?.address || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Items table */}
                  <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <h4 className="font-medium">Stavke ({itemsCount})</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">#</th>
                            <th className="px-4 py-2 text-left">Šifra</th>
                            <th className="px-4 py-2 text-left">Opis</th>
                            <th className="px-4 py-2 text-right">Količina</th>
                            <th className="px-4 py-2 text-right">Jed. cijena</th>
                            <th className="px-4 py-2 text-right">Ukupno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(currentDocument?.analysis?.items || []).map((item, i) => (
                            <tr key={i} className="border-b">
                              <td className="px-4 py-2">{item.position ?? (i + 1)}</td>
                              <td className="px-4 py-2">{item.code || ''}</td>
                              <td className="px-4 py-2">{item.description || ''}</td>
                              <td className="px-4 py-2 text-right">{item.quantity ?? 0}</td>
                              <td className="px-4 py-2 text-right">{(item.unitPrice ?? 0).toFixed?.(2) || Number(item.unitPrice || 0).toFixed(2)}</td>
                              <td className="px-4 py-2 text-right">{(item.totalPrice ?? 0).toFixed?.(2) || Number(item.totalPrice || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                          {itemsCount === 0 && (
                            <tr>
                              <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                                Nema stavki
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="text-sm text-gray-600">Osnovica (Neto)</label>
                      <div className="mt-1 px-3 py-2 border rounded-md bg-gray-50">
                        {currentDocument?.analysis?.totals?.subtotal?.toFixed?.(2) ??
                          (currentDocument?.analysis?.totals?.subtotal != null
                            ? Number(currentDocument.analysis.totals.subtotal).toFixed(2)
                            : 'N/A')}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">PDV</label>
                      <div className="mt-1 px-3 py-2 border rounded-md bg-gray-50">
                        {currentDocument?.analysis?.totals?.vatAmount?.toFixed?.(2) ??
                          (currentDocument?.analysis?.totals?.vatAmount != null
                            ? Number(currentDocument.analysis.totals.vatAmount).toFixed(2)
                            : 'N/A')}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 font-semibold">UKUPNO</label>
                      <div className="mt-1 px-3 py-2 border rounded-md bg-blue-600 text-white font-semibold">
                        {currentDocument?.analysis?.totals?.totalAmount?.toFixed?.(2) ??
                          (currentDocument?.analysis?.totals?.totalAmount != null
                            ? Number(currentDocument.analysis.totals.totalAmount).toFixed(2)
                            : 'N/A')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export actions */}
                <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-5">
                  <h3 className="font-semibold mb-4">Export opcije</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={exportItemsToExcel}
                      disabled={!itemsCount}
                      className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${itemsCount ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel stavke
                    </button>
                    <button
                      onClick={exportCurrentToJSON}
                      disabled={!currentDocument?.analysis}
                      className={`px-4 py-2 rounded-md text-white flex items-center gap-2 ${currentDocument?.analysis ? 'bg-violet-600 hover:bg-violet-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                      <FileText className="w-4 h-4" />
                      JSON (trenutni)
                    </button>
                    <button
                      onClick={() => {
                        if (!selectedProject) {
                          alert('Molimo odaberite projekt prije potvrde.');
                          return;
                        }
                        alert('Potvrđeno ✓ (demo – poveži s backendom zapisa)');
                      }}
                      className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Potvrdi sve dokumente
                    </button>
                  </div>
                  {!selectedProject && (
                    <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md">
                      ⚠️ Molimo odaberite projekt prije potvrde
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="lg:col-span-4 space-y-6 min-w-0">
                {/* Preview */}
                <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-5">
                  <h3 className="font-semibold mb-3">Pregled</h3>
                  <div className="border rounded-xl p-3 bg-gray-50">
                    {currentDocument?.previewUrl ? (
                      <>
                        <img
                          src={currentDocument.previewUrl}
                          alt="Pregled"
                          className="w-full max-h-[380px] object-contain rounded-lg"
                        />
                        <div className="text-center text-xs text-gray-500 mt-2">Klik za Focus Mode</div>
                      </>
                    ) : currentDocument?.type?.includes('image') ? (
                      <>
                        <img
                          src={URL.createObjectURL(currentDocument.file)}
                          alt="Pregled"
                          className="w-full max-h-[380px] object-contain rounded-lg"
                          onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                        />
                        <div className="text-center text-xs text-gray-500 mt-2">Klik za Focus Mode</div>
                      </>
                    ) : (
                      <div className="h-[380px] flex items-center justify-center text-gray-500">
                        Nema pregleda
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl rounded-2xl p-5">
                  <h3 className="font-semibold mb-3">Brza analiza</h3>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-600">Broj stavki</span>
                    <span className="font-semibold">{itemsCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-600">Ukupna vrijednost</span>
                    <span className="font-semibold">
                      {totalAmount != null ? (Number(totalAmount).toFixed(2) + ' ' + (currentDocument?.analysis?.currency || '')) : 'N/A'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Pouzdanost</span>
                      <span>{confidence != null ? Math.round(confidence * 100) : 60}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${confidence != null ? Math.round(confidence * 100) : 60}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Metoda: Cloud (Gemini)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden file input for "Novi Batch" */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(Array.from(e.target.files || []))}
            />
          </>
        )}
      </div>

      {/* DEBUG */}
      {showDebug && (
        <div className="border-t bg-gray-900 text-gray-100 p-4 text-sm overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Debug</span>
            <button onClick={() => setShowDebug(false)} className="text-gray-300 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <pre className="whitespace-pre-wrap">
{JSON.stringify({ documents, currentDocIndex, settings, selectedProject, selectedPosition }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}