// src/components/InvoiceProcesser.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileText, Upload, AlertCircle, CheckCircle2, Loader2,
  RefreshCw, Edit3, Database, X, ArrowLeft, ZoomIn, ZoomOut,
  Building, Package, BadgeCheck, Target, ChevronLeft, ChevronRight,
  Eye, EyeOff, FileSpreadsheet, Layers, Focus, FilePlus, Receipt,
  Truck, Archive, PackageCheck, Settings, Grid3x3,
  FileCode, Maximize2, Info, Camera
} from 'lucide-react';

// PDF.js and Tesseract imports
import { getDocument, GlobalWorkerOptions, version as pdfjsVersion } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

/** ======================== CONSTANTS ======================== */

const DOCUMENT_TYPES = {
    request: { label: 'Zahtjev za ponudu', icon: FileText, color: '#8b5cf6', internal: false },
    quote: { label: 'Ponuda / Predračun', icon: FileText, color: '#3b82f6', internal: false },
    invoice: { label: 'Račun', icon: Receipt, color: '#10b981', internal: false },
    delivery: { label: 'Otpremnica', icon: Truck, color: '#f59e0b', internal: true },
    transfer: { label: 'Međuskladišnica', icon: Archive, color: '#06b6d4', internal: true },
    receipt: { label: 'Primka', icon: PackageCheck, color: '#ec4899', internal: true },
    other: { label: 'Ostalo', icon: FileText, color: '#64748b', internal: false },
  };
  
  const LM_STUDIO_CONFIG = {
    endpoint: 'http://localhost:1234/v1/chat/completions',
    model: 'local-model',
    temperature: 0.01,
    max_tokens: 8000,
  };
  
  // System Prompt emphasizing spatial awareness
  const LLM_SYSTEM_PROMPT = `
Ti si AI asistent specijaliziran za analizu hrvatskih poslovnih dokumenata. Tvoj input je tekst rekonstruiran na temelju prostornog rasporeda (koristeći razmake i TABULATORE za stupce). Tvoj zadatak je izvući strukturirane podatke i vratiti ih ISKLJUČIVO u preciznom JSON formatu. Koristi JSON mode.

### PROSTORNA SVIJEST (SPATIAL AWARENESS):
Ulazni tekst zadržava vizualni raspored originalnog dokumenta. Koristi TABULATORE (\\t) kao jasne indikatore stupaca u tablicama.

### KRITIČNE UPUTE:
1.  **Formatiranje Brojeva:** Ulazni podaci koriste hrvatski format (npr. 1.234,56). U JSON izlazu SVI brojevi MORAJU biti tipa 'number' (npr. 1234.56).
2.  **Formatiranje Datuma:** Svi datumi moraju biti u ISO formatu: YYYY-MM-DD.
3.  **Stavke (Items):** Analiziraj tablice koristeći prostorni raspored i tabulatore. Spoji opise iz više redaka ako su vizualno grupirani.

### JSON SHEMA (Strogo se pridržavati):
{
  "documentType": "string (enum: quote, invoice, delivery, etc.)",
  "documentNumber": "string",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD | null",
  "currency": "string (e.g., EUR, BAM)",
  "supplier": { "name": "string", "address": "string | null", "oib": "string | null", "iban": "string | null" },
  "buyer": { "name": "string", "address": "string | null", "oib": "string | null" },
  "items": [
    {
      "position": "integer",
      "code": "string | null",
      "description": "string",
      "quantity": "number",
      "unit": "string",
      "unitPrice": "number",
      "discountPercent": "number | null",
      "totalPrice": "number"
    }
  ],
  "totals": {
    "subtotal": "number",
    "vatAmount": "number",
    "totalAmount": "number"
  }
}
`;

const UI_TEXT = {
    appTitle: 'RUBILAKSE - Procesor Dokumenata',
    lmStudio: 'LM Studio AI',
    docsCount: (d, c) => `${d} u obradi | ${c} potvrđenih`,
    btnShowDebug: (show) => (show ? 'Sakrij' : 'Prikaži') + ' Debug',
    newBatch: 'Novi Batch',
    dropHereTitle: 'Povucite dokumente ovdje',
    dropHereSub: 'ili kliknite za odabir • PDF, Excel, CSV, slike',
    debugTitle: 'Debug Informacije i Prostorni Podaci',
    errorTitle: 'Greška / Upozorenje',
    selectProjectHint: 'Molimo odaberite projekt prije potvrde',
    readyConfirm: (n, project, pos) =>
      `Spremno za potvrdu ${n} dokument(a) za projekt: ${project}${pos ? ` • Pozicija: ${pos}` : ''}`,
    confirmAll: 'Potvrdi sve dokumente',
    // ... (Other UI texts remain the same)
};


/** ======================== UTILITIES ======================== */

// (toNumber, parseCroatianDate, formatCurrency, downloadJSON remain the same)
const toNumber = (s) => {
    if (typeof s === 'number') return s;
    if (!s) return null;
    
    let n = String(s).replace(/\s/g, '');

    if (n.includes('.') && n.includes(',')) {
        if (n.indexOf('.') < n.indexOf(',')) {
            n = n.replace(/\./g, '').replace(',', '.');
        } else {
             n = n.replace(/,/g, '');
        }
    } 
    else if (n.includes(',')) {
        n = n.replace(',', '.');
    }

    const parsed = parseFloat(n);
    return isNaN(parsed) ? null : parsed;
};

const parseCroatianDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    const match = dateStr.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\.?/);
    if (match) {
      let day = match[1].padStart(2, '0');
      let month = match[2].padStart(2, '0');
      let year = match[3];
  
      if (year.length === 2) {
        year = `20${year}`;
      }
      
      if (parseInt(year) > 1900 && parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
          return `${year}-${month}-${day}`;
      }
    }
    return null;
};

const formatCurrency = (value, currency = 'EUR') => {
    const numValue = toNumber(value);
    if (numValue === null) return 'N/A';
    
    try {
        return new Intl.NumberFormat('hr-HR', { style: 'currency', currency: currency }).format(numValue);
    } catch (e) {
        return `${numValue.toFixed(2)} ${currency}`;
    }
};


const downloadJSON = (payload, fileName) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

/** ======================== IMAGE PREPROCESSING ======================== */
// NEW: Utility function to preprocess images (Grayscale, Thresholding) for better OCR results.

const preprocessImage = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Scale up the image. Tesseract generally prefers higher resolution (around 300 DPI).
                const scaleFactor = 2.5; 
                canvas.width = img.width * scaleFactor;
                canvas.height = img.height * scaleFactor;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // 1. Grayscale conversion (Luminance formula)
                for (let i = 0; i < data.length; i += 4) {
                    const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    data[i] = brightness;
                    data[i + 1] = brightness;
                    data[i + 2] = brightness;
                }

                // 2. Binarization (Thresholding)
                // A simple threshold (e.g., 140) often works well for standard documents and helps remove background noise.
                const threshold = 140; 
                for (let i = 0; i < data.length; i += 4) {
                    const value = data[i] > threshold ? 255 : 0;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }
                
                ctx.putImageData(imageData, 0, 0);
                // Resolve with the processed canvas, which Tesseract accepts directly
                resolve(canvas);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


/** ======================== SPATIAL TEXT RECONSTRUCTION ======================== */

const reconstructSpatialText = (elements) => {
    if (!elements || elements.length === 0) return '';

    const validHeights = elements.filter(el => el.height > 0);
    if (validHeights.length === 0) return elements.map(el => el.text).join(' ');

    const avgHeight = validHeights.reduce((sum, el) => sum + el.height, 0) / validHeights.length;
    
    const alignmentTolerance = Math.max(5, avgHeight * 0.4); 

    const sortedElements = [...elements].sort((a, b) => {
        if (Math.abs(a.y - b.y) < alignmentTolerance) {
            return a.x - b.x;
        }
        return a.y - b.y;
    });

    let reconstructedText = '';
    let lastY = -1;
    let lastXEnd = -1;
    
    sortedElements.forEach(el => {
        if (lastY === -1) {
             reconstructedText += el.text;
             lastY = el.y;
             lastXEnd = el.x + el.width;
             return;
        }
        
        const yDiff = Math.abs(el.y - lastY);

        if (yDiff > alignmentTolerance) {
            if (yDiff > avgHeight * 2.5) {
                reconstructedText += '\n\n'; 
            } else {
                reconstructedText += '\n';
            }
        } else {
            const xDiff = el.x - lastXEnd;
            
            // Use tabulators for significant gaps (columns)
            if (xDiff > avgHeight * 3) { 
               reconstructedText += '\t'; 
            } else if (xDiff > 5) {
                reconstructedText += ' ';
            }
        }

        reconstructedText += el.text;
        lastY = el.y;
        lastXEnd = el.x + el.width;
    });

    return reconstructedText.trim();
};


/** ======================== MAIN COMPONENT ======================== */
export default function InvoiceProcesser() {
  // Core State
  const [documents, setDocuments] = useState([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState(null); // Used for errors AND warnings
  const [llmStatus, setLlmStatus] = useState('checking');

  // UI State
  const [viewMode, setViewMode] = useState('normal');
  const [editMode, setEditMode] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Project & Position (Mock Data)
  const [projects, setProjects] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [confirmedDocuments, setConfirmedDocuments] = useState([]);

  // Settings
  const [settings, setSettings] = useState({
    autoAnalyze: true,
    useLLM: true,
    ocrLanguage: 'hrv+eng',
    darkMode: false,
  });

  // Refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const currentDocument = documents[currentDocIndex];

  // Initialize
  useEffect(() => {
    if (!GlobalWorkerOptions.workerSrc) {
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.mjs`;
    }
    loadMockData();
  }, []);

  // NEW: Effect to manage error/warning state based on the current document
  useEffect(() => {
    if (currentDocument) {
        if (currentDocument.status === 'error') {
            // If the document itself failed processing critically
            setError(currentDocument.error);
        } else if (currentDocument.rawData?.warning) {
            // If the document has a non-critical warning (e.g., low OCR confidence)
            setError(currentDocument.rawData.warning);
        } else {
            // Clear error/warning if the current document is fine, but only if processing is finished
            if (!processing) {
                 // We check if the existing error is a persistent one (like LLM connection issue) before clearing it entirely.
                 // For this implementation, we clear it, assuming document-specific errors are most relevant.
                 setError(null);
            }
        }
    }
  }, [currentDocument, processing]);

  // Load mock data
  const loadMockData = useCallback(() => {
    // (Mock data initialization remains the same)
    setProjects([
        { id: 'PRJ-001', name: 'Neboder Centar', client: 'Invest Group d.o.o.'},
      ]);
      setPositions([
        { id: 'POS-001', name: 'CW-12 Fasada', project: 'PRJ-001' },
      ]);
  }, []);

  // Check LLM status
  const checkLLMStatus = useCallback(async () => {
    if (!settings.useLLM) {
        setLlmStatus('disabled');
        return;
    }
    setLlmStatus('checking');
    try {
      const modelsEndpoint = LM_STUDIO_CONFIG.endpoint.replace('/chat/completions', '/models');
      // Using mode: 'cors' is essential for communication with localhost servers
      const res = await fetch(modelsEndpoint, { mode: 'cors' });
      if (res.ok) {
        setLlmStatus('connected');
      } else {
        setLlmStatus('offline');
        console.warn("LLM connection failed (HTTP error). Check LM Studio logs.");
      }
    } catch (err) {
      // This typically catches network errors or CORS policy blocks
      setLlmStatus('offline');
      console.error("Error connecting to LLM (Network/CORS error):", err);
    }
  }, [settings.useLLM]);

  useEffect(() => {
    checkLLMStatus();
  }, [settings.useLLM, checkLLMStatus]);


  // Progress management
  const updateProgress = useCallback((step, percent) => {
    setProgressStep(step);
    setProgress(percent);
  }, []);

    // Helper function for normalizing data
    const normalizeAnalysisData = (data, method, confidence) => {
        // (Normalization logic remains the same)
        if (!data) return { analysisMethod: method, confidence: 0, items: [], totals: {} };

        if (data.totals) {
            data.totals.subtotal = toNumber(data.totals.subtotal);
            data.totals.vatAmount = toNumber(data.totals.vatAmount);
            data.totals.totalAmount = toNumber(data.totals.totalAmount);
        } else {
            data.totals = {};
        }

        if (data.items) {
            data.items.forEach(item => {
                item.quantity = toNumber(item.quantity);
                item.unitPrice = toNumber(item.unitPrice);
                item.discountPercent = toNumber(item.discountPercent);
                item.totalPrice = toNumber(item.totalPrice);
            });
        } else {
            data.items = [];
        }
        
        data.date = parseCroatianDate(data.date);
        data.dueDate = parseCroatianDate(data.dueDate);
    
        data.confidence = confidence;
        data.analysisMethod = method;
        return data;
      };

  // Analyze with regex fallback
  const analyzeWithRegex = useCallback((text) => {
    updateProgress('Regex analiza...', 80);

    // (Basic Regex implementation)
    const extract = (pattern, flags = 'i') => {
        const match = text.match(new RegExp(pattern, flags));
        return match ? (match[1] || match[0]).trim() : null;
      };
  
      let docType = 'invoice';
      const lower = text.toLowerCase();
      if (lower.includes('ponuda') || lower.includes('predračun')) docType = 'quote';

      const analysis = {
        documentType: docType,
        documentNumber: extract(/(?:Ponuda br\.|Račun br\.|br\.)[\s:]*([A-Z0-9\-\/]+)/i),
      };

    // Confidence lowered if input text was short
    const confidence = text.length < 50 ? 0.30 : 0.60;
    return normalizeAnalysisData(analysis, 'Regex (Fallback)', confidence);

  }, [updateProgress]);

  // Analyze with LLM (ENHANCED: Input validation and robust error handling)
  const analyzeWithLLM = useCallback(async (extractedData) => {
    const textToAnalyze = extractedData.spatialText || extractedData.rawText;
    
    // NEW: Check if input text is suspiciously short (likely extraction/OCR failure)
    if (textToAnalyze.length < 50) {
        console.warn("Input text for LLM is very short (<50 chars). Likely extraction failure. Skipping LLM.");
        
        // Set a specific error if no warning was already provided during extraction
        if (!extractedData.warning) {
            setError("Greška: Ekstrakcija teksta nije uspjela (premalo sadržaja). Provjerite kvalitetu dokumenta/slike.");
        }

        updateProgress('Tekst prekratak. Pokrećem Regex analizu...', 75);
        return analyzeWithRegex(textToAnalyze);
    }

    updateProgress('LLM analiza (Prostorna)...', 60);

    const payload = {
        model: LM_STUDIO_CONFIG.model,
        messages: [
          { 
            role: 'system', 
            content: LLM_SYSTEM_PROMPT
          },
          { 
            role: 'user', 
            content: `Analiziraj sljedeći dokument:\n\n${textToAnalyze.substring(0, 25000)}` 
          },
        ],
        temperature: LM_STUDIO_CONFIG.temperature,
        max_tokens: LM_STUDIO_CONFIG.max_tokens,
        response_format: { type: "json_object" }, 
      };

    try {
      // The fetch call itself might fail due to network errors or CORS blocks.
      const response = await fetch(LM_STUDIO_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors', // Explicitly requesting CORS
        body: JSON.stringify(payload),
      });

      // Check if the HTTP response status is OK (200-299)
      if (!response.ok) {
        // This handles HTTP errors (like 404, 500)
        const errorText = await response.text().catch(() => 'N/A');
        console.error(`LLM request failed. Status: ${response.status}. Details: ${errorText}`);
        throw new Error(`LLM HTTP greška: ${response.status}.`);
      }

      const result = await response.json();
      const content = result?.choices?.[0]?.message?.content || '';
      
      try {
        const parsedData = JSON.parse(content);
        return normalizeAnalysisData(parsedData, 'LLM (Spatial)', 0.98);

      } catch (e) {
        // (JSON Parsing fallback logic)
        console.error('LLM returned invalid JSON:', e, content);
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
             try {
                const parsedData = JSON.parse(jsonMatch[0]);
                return normalizeAnalysisData(parsedData, 'LLM (Spatial Fallback)', 0.85);
            } catch (e2) {
                console.error('Manual extraction failed:', e2);
            }
        }
        throw new Error('Greška: Neispravan format LLM odgovora (JSON nije pronađen).');
      }

    } catch (err) {
      // This catches network errors, CORS errors (TypeError), and errors thrown above.
      console.error('LLM analysis failed:', err);
      
      let errorMessage = err.message;
      // Detect potential CORS issue (often manifests as a TypeError in fetch)
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        errorMessage = "Greška: Mrežni problem ili CORS. Provjerite je li LM Studio pokrenut i je li 'Allow CORS' omogućen u postavkama servera.";
      }

      // Set the error state to display it in the UI
      setError(`${errorMessage} Prelazim na Regex analizu.`);

      updateProgress('LLM neuspješan. Pokrećem Regex analizu...', 75);
      return analyzeWithRegex(textToAnalyze);
    }
  }, [updateProgress, analyzeWithRegex]);


  // --- Data Extraction Functions (ENHANCED) ---

  // Extract from PDF
  const extractFromPDF = useCallback(async (file) => {
    // (PDF extraction logic remains the same as the previous iteration, using spatial reconstruction)
    updateProgress('Čitanje PDF strukture i koordinata...', 10);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;

    const structuredData = {
      pages: [],
      elements: [], 
      rawText: '',
      spatialText: '',
      warning: null,
      metadata: { numPages: pdf.numPages, fileName: file.name },
    };

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        // ... (Element extraction logic)
    }

    updateProgress('Rekonstrukcija prostornog rasporeda teksta...', 45);
    structuredData.spatialText = reconstructSpatialText(structuredData.elements);

    return structuredData;
  }, [updateProgress]);

  // Extract from image using OCR (ENHANCED: Preprocessing + Robust Worker implementation)
  const extractFromImage = useCallback(async (file) => {
    updateProgress('Predobrada slike (Optimizacija za OCR)...', 5);
    
    let inputForTesseract;
    try {
        // 1. Use the new preprocessing utility
        inputForTesseract = await preprocessImage(file);
    } catch (err) {
        console.warn("Image preprocessing failed, using original image:", err);
        inputForTesseract = file; // Fallback to original file
    }

    updateProgress('Inicijalizacija OCR engine-a (Tesseract)...', 10);
    
    // Use Tesseract Worker API for better control
    let worker;
    try {
        // 2. Create and Initialize Worker (OEM 1 = LSTM/Neural Nets)
        worker = await Tesseract.createWorker(settings.ocrLanguage, 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    updateProgress(`OCR: ${Math.round(m.progress * 100)}%`, 20 + m.progress * 70);
                } else {
                    const statusText = m.status.charAt(0).toUpperCase() + m.status.slice(1);
                    updateProgress(`${statusText}...`, 10 + (m.progress * 10));
                }
            },
            errorHandler: (e) => {
                console.error("Tesseract Worker Error:", e);
                throw new Error("OCR Engine failure.");
            }
        });

        // 3. Set Parameters (PSM.AUTO is robust default)
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO, 
        });

        // 4. Recognize (using the preprocessed image/canvas)
        updateProgress('OCR analiza slike i koordinata...', 20);
        const result = await worker.recognize(inputForTesseract);
        
        // 5. Process Results
        const elements = result.data.words.map(word => ({
            text: word.text,
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0,
            confidence: word.confidence
        }));

        updateProgress('Rekonstrukcija prostornog rasporeda teksta...', 90);
        const spatialText = reconstructSpatialText(elements);

        // 6. Confidence Check
        const confidence = result.data.confidence;
        let warning = null;
        if (confidence < 65) {
            warning = `UPOZORENJE: Niska pouzdanost OCR-a (${confidence.toFixed(0)}%). Rezultati mogu biti netočni unatoč optimizaciji slike.`;
        }

        return {
            rawText: result.data.text,
            spatialText: spatialText,
            elements: elements,
            confidence: confidence,
            warning: warning, // Pass the warning up
            tesseractData: result.data
        };

    } catch (err) {
      console.error('OCR process failed:', err);
      throw err;
    } finally {
        // 7. Terminate Worker (Crucial for resource management)
        if (worker) {
            await worker.terminate();
        }
    }
  }, [settings.ocrLanguage, updateProgress]);

  // Extract from spreadsheet
  const extractFromSpreadsheet = useCallback(async (file) => {
    // (Spreadsheet extraction remains the same)
    updateProgress('Čitanje Excel/CSV...', 30);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_csv(firstSheet);
    
    return {
      rawText: data,
      spatialText: data,
      elements: [],
      warning: null,
      metadata: { fileName: file.name, sheets: workbook.SheetNames },
    };
  }, [updateProgress]);

    // Extract from text file
    const extractFromText = useCallback(async (file) => {
        updateProgress('Čitanje teksta...', 40);
        const text = await file.text();
        return { rawText: text, spatialText: text, elements: [], warning: null, metadata: { fileName: file.name } };
      }, [updateProgress]);

  // Main extraction dispatcher
  const extractStructuredData = useCallback(async (file) => {
    try {
      if (file.type === 'application/pdf') {
        return await extractFromPDF(file);
      } else if (file.type.startsWith('image/')) {
        return await extractFromImage(file);
      } else if (file.type.includes('sheet') || file.name.match(/\.(xlsx?|csv)$/i)) {
        return await extractFromSpreadsheet(file);
      } else {
        return await extractFromText(file);
      }
    } catch (err) {
      throw new Error(`${err.message}`);
    }
  }, [extractFromPDF, extractFromImage, extractFromSpreadsheet, extractFromText]);


  // Create preview
  const createPreview = useCallback(async (file) => {
    // (Preview logic remains the same)
    try {
        if (file.type === 'application/pdf') {
          // ... PDF preview generation ...
        } else if (file.type.startsWith('image/')) {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ type: 'image', dataUrl: reader.result });
            reader.readAsDataURL(file);
          });
        }
        return { type: 'text', content: 'Pregled nije dostupan' };
      } catch (err) {
        return { type: 'text', content: 'Pregled nije uspio: ' + err.message };
      }
  }, []);

  // Main processing coordinator
  const processSingleFile = useCallback(async (file) => {
    // 1. Extract Raw Data
    const extractedData = await extractStructuredData(file);
    
    // Note: Warnings are now stored in extractedData.warning and handled by the useEffect hook.

    // 2. Analyze Data
    let analysis = {};
    if (settings.autoAnalyze) {
        const useLLM = settings.useLLM && llmStatus === 'connected';
        if (useLLM) {
            // analyzeWithLLM handles input validation internally
            analysis = await analyzeWithLLM(extractedData);
        } else {
            const textToAnalyze = extractedData.spatialText || extractedData.rawText;
            analysis = analyzeWithRegex(textToAnalyze);
        }
    } else {
        analysis = { documentType: 'unknown', confidence: 0, analysisMethod: 'Disabled', items: [], totals: {} };
    }
    
    // 3. Create Preview
    const preview = await createPreview(file);

    return {
      id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name,
      fileType: file.type,
      rawData: extractedData,
      analysis,
      preview,
      status: 'processed',
      documentType: analysis.documentType || 'other',
    };
  }, [extractStructuredData, settings, llmStatus, analyzeWithLLM, analyzeWithRegex, createPreview]);


  // Process multiple files (Main loop with error handling)
  const processMultipleFiles = useCallback(async (files) => {
    setProcessing(true);
    setError(null); // Clear previous errors/warnings at the start of a new batch
    const processedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updateProgress(`Obrađujem dokument ${i + 1}/${files.length}: ${file.name}`, Math.round((i / files.length) * 100));

      try {
        const doc = await processSingleFile(file);
        processedDocs.push(doc);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        processedDocs.push({
          id: `DOC-ERR-${Date.now()}-${i}`,
          fileName: file.name,
          error: `Kritična greška pri obradi: ${err.message}`, // Mark as critical error
          status: 'error',
          analysis: {},
          documentType: 'other',
          rawData: { rawText: 'Nije moguće pročitati sadržaj.', spatialText: '', elements: [], warning: null},
          preview: { type: 'text', content: 'Pregled nije dostupan.'}
        });
        // Set global error state for critical failures
        setError(`Kritična greška pri obradi datoteke: ${file.name}. Detalji: ${err.message}`);
      }
    }

    setDocuments(processedDocs);
    setCurrentDocIndex(0);
    setProcessing(false);
    updateProgress('Završeno!', 100);

    setTimeout(() => {
      setProgress(0);
      setProgressStep('');
    }, 1200);
  }, [updateProgress, processSingleFile]); 


  // --- Handlers and Other Logic ---

  // (Handlers, Theme definition, and Render structure remain largely the same, focusing on integrating the new error/warning display)

  // Define theme classes
  const theme = useMemo(() => ({
    bg: settings.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800',
    card: settings.darkMode ? 'bg-gray-800/80 border border-gray-700 shadow-lg backdrop-blur-xl' : 'bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl',
    input: settings.darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800',
    buttonGray: settings.darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200',
    textMuted: settings.darkMode ? 'text-gray-400' : 'text-gray-600',
  }), [settings.darkMode]);

  // Render (Only showing relevant parts, specifically the Error/Warning Display)
  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        {/* Header, Progress Bar, Upload Zone (Omitted for brevity) */}
        
        {/* Error/Warning Display (Updated styling) */}
        {error && (
          <div className={`px-4 py-3 rounded-xl mb-6 flex items-start gap-3 ${
              // If the message contains "Kritična greška" or "Greška:", treat it as a hard error (red), otherwise as a warning (amber).
              error.includes("Kritična greška") || error.includes("Greška:") ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-amber-100 border border-amber-400 text-amber-700'
          }`}>
            <AlertCircle size={20} className="mt-0.5" />
            <div className="flex-1 text-sm whitespace-pre-wrap">
                <h4 className="font-semibold mb-1">{UI_TEXT.errorTitle}</h4>
                {error}
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:opacity-70 rounded transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Content Area (Omitted for brevity) */}
        
        {/* Debug Panel (Updated) */}
        {showDebug && currentDocument && (
          <DebugPanel document={currentDocument} llmStatus={llmStatus} />
        )}

        {/* Settings Panel (Omitted for brevity) */}
      </div>
    </div>
  );
}

// NOTE: Due to the extreme length of the full code, the definitions for sub-components 
// (LlmStatusIndicator, UploadZone, EditableField, DocumentNavigation, ProjectAssignment, 
// DocumentAnalysis, DocumentAnalysisView, ExportActions, DocumentPreview, QuickStats, 
// FocusModeView, DebugPanel, SettingsPanel) are omitted here. Please ensure they are included 
// in your final file. The implementations provided in the previous response (Turn 5) are compatible, 
// with minor updates needed in DocumentNavigation and QuickStats to display the new OCR warnings/confidence scores.