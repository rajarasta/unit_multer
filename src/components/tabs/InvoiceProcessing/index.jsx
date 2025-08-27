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
  invoice: { label: 'Račun', icon: Receipt, color: '#121414ff', internal: false },
  delivery: { label: 'Otpremnica', icon: Truck, color: '#f59e0b', internal: true },
  transfer: { label: 'Međuskladišnica', icon: Archive, color: '#06b6d4', internal: true },
  receipt: { label: 'Primka', icon: PackageCheck, color: '#ec4899', internal: true },
  other: { label: 'Ostalo', icon: FileText, color: '#64748b', internal: false },
};

// NEW: AI Analysis Modes
const AI_MODES = {
    SPATIAL: 'spatial', // Uses coordinates (previous approach)
    VISION: 'vision',   // Uses images (new approach)
};

// Memory optimization profiles for different system configurations
const MEMORY_PROFILES = {
  HIGH_MEMORY: {
    name: 'Visoka memorija (16K tokena, 2.0x kvaliteta)',
    maxTokens: 16000,
    pdfScale: 2.0,
    maxPages: 5,
    description: 'Najbolja kvaliteta, zahtijeva 8GB+ VRAM/RAM'
  },
  BALANCED: {
    name: 'Uravnoteženo (8K tokena, 1.5x kvaliteta)',
    maxTokens: 8000,
    pdfScale: 1.5,
    maxPages: 3,
    description: 'Dobra kvaliteta, zahtijeva 4-6GB VRAM/RAM'
  },
  LOW_MEMORY: {
    name: 'Štednja memorije (4K tokena, 1.2x kvaliteta)',
    maxTokens: 4000,
    pdfScale: 1.2,
    maxPages: 2,
    description: 'Osnovna kvaliteta, zahtijeva 2-4GB VRAM/RAM'
  },
  MINIMAL: {
    name: 'Minimalno (2K tokena, 1.0x kvaliteta)',
    maxTokens: 2000,
    pdfScale: 1.0,
    maxPages: 1,
    description: 'Najniža kvaliteta, zahtijeva 1-2GB VRAM/RAM'
  }
};

const LM_STUDIO_CONFIG = {
  endpoint: 'http://10.39.35.136:1234/v1/chat/completions',
  temperature: 0.1,
  
  // Model for spatial analysis (Text-only)
  MODEL_SPATIAL: 'openai/gpt-oss-20b',

  // Model for vision analysis (VLM). User MUST load a VLM in LM Studio for this.
  // The name here is just for reference in the UI/logs.
  MODEL_VISION: 'VLM-Model (e.g., LLaVA/Qwen-VL)', 
};

// System Prompt for Spatial Coordinate Analysis (Renamed from LLM_SYSTEM_PROMPT)
const LLM_SYSTEM_PROMPT_SPATIAL = `
Ti si AI asistent specijaliziran za analizu hrvatskih poslovnih dokumenata iz PROSTORNIH KOORDINATA. 

### ŠTO PRIMAŠ KAO INPUT:
JSON objekt:
1. **elements**: Niz objekata s koordinatama (text, x, y, width, height, page)
2. **spatialText**: Tekst rekonstruiran iz koordinata (rezerva)

### KAKO ANALIZIRATI:
Koristi X,Y koordinate za razumijevanje strukture (retci i stupci). Identificiraj tablice grupiranjem elemenata po X i Y pozicijama.

### IZLAZNI JSON FORMAT (OBAVEZNO):
{
  "documentType": "string (quote|invoice|delivery|receipt|transfer)",
  "documentNumber": "string", 
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD | null",
  "currency": "string (EUR, BAM, HRK)",
  "supplier": { "name": "string", "address": "string", "oib": "string", "iban": "string" },
  "buyer": { "name": "string", "address": "string", "oib": "string" },
  "items": [
    {
      "position": "number", "code": "string", "description": "string", 
      "quantity": "number", "unit": "string", "unitPrice": "number",
      "discountPercent": "number", "totalPrice": "number"
    }
  ],
  "totals": { "subtotal": "number", "vatAmount": "number", "totalAmount": "number" }
}

### VAŽNE NAPOMENE:
- Hrvatski brojevi (1.234,56) → JSON brojevi (1234.56)
- Hrvatski datumi (15.01.2024) → ISO format (2024-01-15)
- OBVEZNO: Vrati ISKLJUČIVO JSON objekt.
`;

// NEW: System Prompt for Visual Analysis (VLM)
const LLM_SYSTEM_PROMPT_VISION = `
Ti si AI asistent (VLM) specijaliziran za vizualnu analizu hrvatskih poslovnih dokumenata (računi, ponude). 

### ŠTO PRIMAŠ KAO INPUT:
Jednu ili više slika (rendera) stranica dokumenta.

### KAKO ANALIZIRATI SLIKE:
1. **Vizualni Layout**: Analiziraj raspored elemenata, fontove i linije kako bi razumio strukturu.
2. **OCR i Kontekst**: Pročitaj tekst na slici i interpretiraj ga u kontekstu vizualnog rasporeda.
3. **Tablične Strukture**: Precizno identificiraj retke i stupce u tablicama, pazeći na poravnanje.

### IZLAZNI JSON FORMAT (OBAVEZNO):
{
  "documentType": "string (quote|invoice|delivery|receipt|transfer)",
  "documentNumber": "string",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD | null",
  "currency": "string (EUR, BAM, HRK)",
  "supplier": { "name": "string", "address": "string", "oib": "string", "iban": "string" },
  "buyer": { "name": "string", "address": "string", "oib": "string" },
  "items": [
    {
      "position": "number", "code": "string", "description": "string",
      "quantity": "number", "unit": "string", "unitPrice": "number",
      "discountPercent": "number", "totalPrice": "number"
    }
  ],
  "totals": { "subtotal": "number", "vatAmount": "number", "totalAmount": "number" }
}

### VAŽNE NAPOMENE:
- Hrvatski brojevi (1.234,56) → JSON brojevi (1234.56)
- Hrvatski datumi (15.01.2024) → ISO format (2024-01-15)
- OBVEZNO: Vrati ISKLJUČIVO JSON objekt. Bez markdowna (npr. \`\`\`json).
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
  errorTitle: 'Greška',
  selectProjectHint: 'Molimo odaberite projekt prije potvrde',
  readyConfirm: (n, project, pos) =>
    `Spremno za potvrdu ${n} dokument(a) za projekt: ${project}${pos ? ` • Pozicija: ${pos}` : ''}`,
  confirmAll: 'Potvrdi sve dokumente',
  projectAssignment: 'Dodjela projektu',
  projectLabel: 'Projekt *',
  positionLabel: 'Pozicija (opcionalno)',
  docAnalysis: 'Analiza dokumenta',
  edit: 'Uredi',
  save: 'Spremi',
  focusMode: 'Focus Mode',
  backToNormal: 'Natrag',
  docType: 'Tip dokumenta',
  preview: 'Pregled',
  clickForFocus: 'Klik za Focus Mode',
  quickAnalytics: 'Brza analiza',
  exportOptions: 'Export opcije',
  exportItems: 'Excel stavke',
  exportJsonCurrent: 'JSON (trenutni)',
  itemsCount: 'Broj stavki',
  totalValue: 'Ukupna vrijednost',
  vatAmount: 'Iznos PDV-a',
  confidence: 'Pouzdanost',
  documentNumber: 'Broj dokumenta',
  date: 'Datum',
  dueDate: 'Dospijeće',
  currency: 'Valuta',
  supplier: 'Dobavljač',
  buyer: 'Kupac',
  name: 'Naziv',
  oib: 'OIB / PDV ID',
  address: 'Adresa',
  iban: 'IBAN',
  items: (n) => `Stavke (${n})`,
  totals: 'Sažetak',
  subtotal: 'Osnovica (Neto)',
  vat: 'PDV',
  total: 'UKUPNO',
  confirmNewBatch: 'Želite li očistiti trenutni batch?',
  exportItemsXlsx: (num) => `stavke-${num || Date.now()}.xlsx`,
  exportDocJsonName: (num) => `dokument-${num || Date.now()}.json`,
};

/** ======================== UTILITIES ======================== */

// Robust number conversion (handles Croatian format: 1.234,56 -> 1234.56)
const toNumber = (s) => {
    if (typeof s === 'number') return s;
    if (!s) return null;
    
    let n = String(s).replace(/\s/g, '');

    // Handle formats like '1.234,56'
    if (n.includes('.') && n.includes(',')) {
        if (n.indexOf('.') < n.indexOf(',')) {
            // Dot is thousand separator, comma is decimal
            n = n.replace(/\./g, '').replace(',', '.');
        } else {
            // Comma is thousand separator, dot is decimal (e.g., English format)
             n = n.replace(/,/g, '');
        }
    } 
    // Handle format '1234,56'
    else if (n.includes(',')) {
        n = n.replace(',', '.');
    }

    const parsed = parseFloat(n);
    return isNaN(parsed) ? null : parsed;
};

// Utility to parse Croatian date formats (e.g., DD.MM.YYYY., DD.MM.YY) into YYYY-MM-DD
const parseCroatianDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    // Check if already ISO format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    const match = dateStr.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\.?/);
    if (match) {
      let day = match[1].padStart(2, '0');
      let month = match[2].padStart(2, '0');
      let year = match[3];
  
      if (year.length === 2) {
        // Assume 21st century for 2-digit years
        year = `20${year}`;
      }
      
      // Basic validation
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

// NEW: Utility to render a PDF page to a Base64 image
const renderPDFPageToImage = async (page, scale = 2.0) => {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };
    await page.render(renderContext).promise;

    // Convert canvas to JPEG data URL (Base64)
    // JPEG is generally better for invoices than PNG due to compression.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Clean up canvas to free memory
    canvas.width = 0;
    canvas.height = 0;
    
    return dataUrl;
};

// NEW: Memory cleanup utility
const cleanupDocumentMemory = (document) => {
  if (document && document.extractedData) {
    // Clear large image data from memory
    if (document.extractedData.images) {
      document.extractedData.images = [];
    }
    if (document.extractedData.tesseractData) {
      document.extractedData.tesseractData = null;
    }
  }
};

// NEW: Batch memory cleanup for all processed documents
const cleanupAllDocumentsMemory = (documents) => {
  documents.forEach(doc => {
    if (doc.status === 'processed' && doc.extractedData) {
      cleanupDocumentMemory(doc);
    }
  });
  // Force garbage collection hint
  if (window.gc) window.gc();
};


/** ======================== SPATIAL TEXT RECONSTRUCTION ======================== */
// Utility function to reconstruct text layout based on coordinates.

const reconstructSpatialText = (elements) => {
    if (!elements || elements.length === 0) return '';

    // Calculate average height to determine tolerances adaptively
    const validHeights = elements.filter(el => el.height > 0);
    if (validHeights.length === 0) return elements.map(el => el.text).join(' '); // Fallback if heights are missing

    const avgHeight = validHeights.reduce((sum, el) => sum + el.height, 0) / validHeights.length;
    
    // Tolerance for considering elements on the same line (Y-axis alignment)
    const alignmentTolerance = Math.max(5, avgHeight * 0.4); 

    // 1. Sort elements: Primarily by Y (top to bottom), secondarily by X (left to right)
    const sortedElements = [...elements].sort((a, b) => {
        // Check if they are on the same line within tolerance
        if (Math.abs(a.y - b.y) < alignmentTolerance) {
            return a.x - b.x;
        }
        return a.y - b.y;
    });

    let reconstructedText = '';
    let lastY = -1;
    let lastXEnd = -1;
    
    // 2. Iterate and build the text string
    sortedElements.forEach(el => {
        // Initialize if it's the first element
        if (lastY === -1) {
             reconstructedText += el.text;
             lastY = el.y;
             lastXEnd = el.x + el.width;
             return;
        }
        
        const yDiff = Math.abs(el.y - lastY);

        // Determine line breaks
        if (yDiff > alignmentTolerance) {
            // It's a new line.
            // If the difference is much larger than average height, consider it a new paragraph/section.
            if (yDiff > avgHeight * 2.5) {
                reconstructedText += '\n\n'; 
            } else {
                reconstructedText += '\n';
            }
        } else {
            // Same line, determine spacing
            const xDiff = el.x - lastXEnd;
            
            // If X difference is large, it likely represents a table column separation.
            // Use tabulators for significant gaps, which helps LLMs identify columns.
            // We use avgHeight as a proxy for expected spacing/character width.
            if (xDiff > avgHeight * 3) { 
               reconstructedText += '\t'; // Use tab for columns
            } else if (xDiff > 5) { // Standard space
                reconstructedText += ' ';
            }
            // If xDiff <= 5 (or negative), elements are very close or overlapping, don't add extra space.
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
  const [error, setError] = useState(null);
  const [llmStatus, setLlmStatus] = useState('checking');
  const [availableModels, setAvailableModels] = useState([]); // NEW: Available models from LM Studio

  // UI State
  const [viewMode, setViewMode] = useState('normal'); // normal, focus
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

  // Settings (UPDATED)
  const [settings, setSettings] = useState({
    autoAnalyze: true,
    useLLM: true,
    analysisMode: AI_MODES.VISION, // NEW: Default to Vision mode
    memoryProfile: 'BALANCED', // NEW: Memory optimization profile
    selectedModel: '', // NEW: User-selected model name
    ocrLanguage: 'hrv+eng',
    darkMode: false,
  });

  // Refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Current document
  const currentDocument = documents[currentDocIndex];

  // Initialize
  useEffect(() => {
    // Setting up PDF.js Worker using the dynamically imported version.
    if (!GlobalWorkerOptions.workerSrc) {
        GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.mjs`;
    }
    loadMockData();
  }, []);

  // Load mock data
  const loadMockData = useCallback(() => {
    setProjects([
      { id: 'PRJ-001', name: 'Neboder Centar', client: 'Invest Group d.o.o.'},
      { id: 'PRJ-002', name: 'Shopping Mall West', client: 'Mall Holdings'},
    ]);

    setPositions([
      { id: 'POS-001', name: 'CW-12 Fasada', project: 'PRJ-001' },
      { id: 'POS-002', name: 'D-45 Vrata', project: 'PRJ-001' },
    ]);
  }, []);

  // Fetch available models from LM Studio
  const fetchAvailableModels = useCallback(async () => {
    try {
      const modelsEndpoint = LM_STUDIO_CONFIG.endpoint.replace('/chat/completions', '/models');
      const response = await fetch(modelsEndpoint);
      
      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];
        setAvailableModels(models);
        
        // Auto-select first model if none selected
        if (!settings.selectedModel && models.length > 0) {
          setSettings(prev => ({
            ...prev,
            selectedModel: models[0].id
          }));
        }
      } else {
        console.warn('Could not fetch models from LM Studio');
        setAvailableModels([]);
      }
    } catch (error) {
      console.warn('Error fetching models:', error);
      setAvailableModels([]);
    }
  }, [settings.selectedModel]);

  // Check LLM status
  const checkLLMStatus = useCallback(async () => {
    if (!settings.useLLM) {
        setLlmStatus('disabled');
        return;
    }
    setLlmStatus('checking');
    try {
      const modelsEndpoint = LM_STUDIO_CONFIG.endpoint.replace('/chat/completions', '/models');
      const res = await fetch(modelsEndpoint, { mode: 'cors' });
      if (res.ok) {
        setLlmStatus('connected');
        // Also fetch available models when connection is successful
        fetchAvailableModels();
      } else {
        setLlmStatus('offline');
        console.warn("LLM connection failed (HTTP error). Falling back to regex analysis.");
      }
    } catch (err) {
      setLlmStatus('offline');
      console.error("Error connecting to LLM (Network error):", err);
    }
  }, [settings.useLLM, fetchAvailableModels]);

  useEffect(() => {
    checkLLMStatus();
  }, [settings.useLLM, checkLLMStatus]);


  // Progress management
  const updateProgress = useCallback((step, percent) => {
    setProgressStep(step);
    setProgress(percent);
  }, []);

    // Helper function for normalizing data
    const normalizeAnalysisData = useCallback((data, method, confidence) => {
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
      }, []);

  // Analyze with regex fallback
  const analyzeWithRegex = useCallback((text) => {
    updateProgress('Regex analiza...', 80);

    // (Basic Regex implementation - less critical now but useful as fallback)
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
        // ... other fields extracted via regex ...
      };

    // Normalize the extracted regex data
    return normalizeAnalysisData(analysis, 'Regex (Fallback)', 0.60);

  }, [updateProgress, normalizeAnalysisData]);

  // Analyze with LLM using spatial coordinate data (Renamed from analyzeWithLLM)
  const analyzeWithSpatial = useCallback(async (extractedData) => {
    updateProgress('LLM analiza (Koordinate + AI)...', 60);

    // Prepare spatial data for LLM
    const spatialData = {
      elements: extractedData.elements || [],
      spatialText: extractedData.spatialText || extractedData.rawText || '',
      metadata: {
        totalElements: extractedData.elements?.length || 0,
        pages: extractedData.metadata?.numPages || 1,
        fileName: extractedData.metadata?.fileName || 'unknown'
      }
    };

    // Limit elements to prevent token overflow (keep most important ones)
    if (spatialData.elements.length > 1000) {
      spatialData.elements = spatialData.elements.slice(0, 1000);
      spatialData.metadata.elementsLimited = true;
    }

    try {
      console.log('🚀 Sending Spatial request...');
      console.log('🤖 Model:', settings.selectedModel || LM_STUDIO_CONFIG.MODEL_SPATIAL);
      
      const response = await fetch(LM_STUDIO_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // For Spatial mode, we use the model name defined in config, or let LM Studio decide
          model: settings.selectedModel || LM_STUDIO_CONFIG.MODEL_SPATIAL, 
          messages: [
            { 
              role: 'system', 
              content: LLM_SYSTEM_PROMPT_SPATIAL
            },
            { 
              role: 'user', 
              content: `Analiziraj dokument koristeći prostorne koordinate:\n\n${JSON.stringify(spatialData, null, 2)}`
            },
          ],
          temperature: LM_STUDIO_CONFIG.temperature,
          max_tokens: MEMORY_PROFILES[settings.memoryProfile].maxTokens, 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Spatial LLM Error Response:', response.status, errorText);
        throw new Error(`Spatial LLM request failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const content = result?.choices?.[0]?.message?.content || '';
      
      try {
        const parsedData = JSON.parse(content);
        return normalizeAnalysisData(parsedData, 'LLM (Koordinate)', 0.95);

      } catch (e) {
        console.error('Spatial LLM returned invalid JSON:', e);
        // Manual extraction fallback
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
             try {
                const parsedData = JSON.parse(jsonMatch[0]);
                return normalizeAnalysisData(parsedData, 'LLM (Koordinate - Fallback)', 0.90);
            } catch (e2) {
                console.error('Manual extraction failed:', e2);
            }
        }
        throw new Error('Invalid Spatial LLM response format');
      }

    } catch (err) {
      console.error('Spatial LLM analysis failed:', err);
      updateProgress('Spatial LLM neuspješan. Pokrećem Regex analizu...', 75);
      // Fallback uses the spatially reconstructed text
      const fallbackText = spatialData.spatialText || spatialData.elements.map(el => el.text).join(' ');
      return analyzeWithRegex(fallbackText);
    }
  }, [updateProgress, analyzeWithRegex, normalizeAnalysisData]);

  // NEW: Analyze with VLM (Vision Language Model) using images
  const analyzeWithVLM = useCallback(async (extractedData) => {
    updateProgress('VLM analiza (Vizualno + AI)...', 60);

    if (!extractedData.images || extractedData.images.length === 0) {
        console.warn('VLM analysis requested but no images available. Falling back.');
        const fallbackText = extractedData.spatialText || extractedData.rawText;
        return analyzeWithRegex(fallbackText);
    }

    // Prepare the message content for the Vision API format
    const userContent = [
        {
            type: "text",
            text: "Analiziraj priložene slike dokumenta i ekstrahiraj podatke prema zadanom JSON formatu."
        }
    ];

    // Add images to the request
    extractedData.images.forEach((dataUrl, index) => {
        userContent.push({
            type: "image_url",
            image_url: {
                // The data URL must be in the format: data:image/jpeg;base64,{base64_string}
                url: dataUrl,
                detail: "high" // Use high detail for accurate OCR by the VLM
            }
        });
    });

    try {
      console.log('🚀 Sending VLM request...');
      console.log('🤖 Model:', settings.selectedModel || LM_STUDIO_CONFIG.MODEL_VISION);
      
      const response = await fetch(LM_STUDIO_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Include model field for VLM requests
          model: settings.selectedModel || LM_STUDIO_CONFIG.MODEL_VISION,
          messages: [
            {
              role: 'system',
              content: LLM_SYSTEM_PROMPT_VISION // Use the VLM prompt
            },
            {
              role: 'user',
              content: userContent // Use the structured vision content
            },
          ],
          temperature: LM_STUDIO_CONFIG.temperature,
          max_tokens: MEMORY_PROFILES[settings.memoryProfile].maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ VLM Error Response:', response.status, errorText);
        throw new Error(`VLM request failed with status ${response.status}. Ensure a VLM model (like LLaVA or Qwen-VL) is loaded in LM Studio.`);
      }

      const result = await response.json();
      const content = result?.choices?.[0]?.message?.content || '';

      try {
         // Clean potential markdown wrapping (e.g., ```json ... ```) which local models sometimes add
         let jsonContent = content.trim();
         if (jsonContent.startsWith("```json")) {
             jsonContent = jsonContent.substring(7);
         }
         if (jsonContent.endsWith("```")) {
             jsonContent = jsonContent.substring(0, jsonContent.length - 3);
         }

        const parsedData = JSON.parse(jsonContent);
        // High confidence for visual analysis
        return normalizeAnalysisData(parsedData, 'VLM (Vizualno)', 0.97);

      } catch (e) {
        // ... (JSON parsing fallback logic)
        console.error('VLM returned invalid JSON:', e);
         // Manual extraction fallback if cleaning didn't work
         const jsonMatch = content.match(/\{[\s\S]*\}/);
         if (jsonMatch) {
             try {
                const parsedData = JSON.parse(jsonMatch[0]);
                return normalizeAnalysisData(parsedData, 'VLM (Vizualno - Fallback)', 0.92);
            } catch (e2) {
                console.error('Manual extraction failed:', e2);
            }
         }
        throw new Error('Invalid VLM response format');
      }

    } catch (err) {
      console.error('VLM analysis failed:', err);
      updateProgress('VLM neuspješan. Pokrećem Regex analizu...', 75);
      // Fallback
      const fallbackText = extractedData.spatialText || extractedData.rawText;
      return analyzeWithRegex(fallbackText);
    }
  }, [updateProgress, analyzeWithRegex, normalizeAnalysisData]);


  // --- Data Extraction Functions (ENHANCED) ---

  // Extract from PDF (ENHANCED: Captures coordinates, spatial text, AND images)
  const extractFromPDF = useCallback(async (file) => {
    updateProgress('Čitanje PDF strukture, koordinata i rendera...', 5);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;

    const structuredData = {
      pages: [],
      elements: [],
      rawText: '',
      spatialText: '',
      images: [], // NEW: Stores Base64 images of pages
      metadata: { numPages: pdf.numPages, fileName: file.name },
    };

    // Limit the number of pages rendered for performance and token limits
    const MAX_PAGES_TO_RENDER = MEMORY_PROFILES[settings.memoryProfile].maxPages;
    const numPages = pdf.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      updateProgress(`PDF stranica ${pageNum}/${numPages}...`, 5 + (pageNum / numPages) * 20);
      const page = await pdf.getPage(pageNum);
      // Use scale 1 for normalized coordinates
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      
      const pageElements = [];
      let pageRawText = '';

      // 1. Text and Coordinate Extraction
      textContent.items.forEach(item => {
        if (!item.str || item.str.trim() === '') return;

        // PDF coordinates (transform[5]) are bottom-up. We convert to top-down for standard sorting.
        const x = item.transform[4];
        const y_bottom_up = item.transform[5];
        // Calculate top-down Y coordinate
        const y = viewport.height - y_bottom_up;

        const element = {
            text: item.str,
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            width: Math.round(item.width * 10) / 10,
            height: Math.round((item.height || Math.abs(item.transform[3])) * 10) / 10, 
            fontName: item.fontName,
            page: pageNum
        };

        pageElements.push(element);
        pageRawText += item.str + ' ';
      });

      // 2. Image Rendering (NEW)
      if (pageNum <= MAX_PAGES_TO_RENDER) {
        updateProgress(`Renderiranje stranice ${pageNum} (VLM)...`, 25 + (pageNum / numPages) * 20);
        try {
            const imageDataUrl = await renderPDFPageToImage(page, MEMORY_PROFILES[settings.memoryProfile].pdfScale); // Scale based on memory profile
            structuredData.images.push(imageDataUrl);
        } catch (renderError) {
            console.error(`Failed to render page ${pageNum}:`, renderError);
        }
      }


      structuredData.elements.push(...pageElements);
      structuredData.rawText += `\n--- PAGE ${pageNum} (Raw) ---\n` + pageRawText + '\n';
      structuredData.pages.push({ pageNumber: pageNum, elements: pageElements, text: pageRawText });
    }

    // Reconstruct text spatially
    updateProgress('Rekonstrukcija prostornog rasporeda teksta...', 50);
    structuredData.spatialText = reconstructSpatialText(structuredData.elements);

    return structuredData;
  }, [updateProgress]);

  // Extract from image using OCR (ENHANCED: Captures coordinates, spatial text, AND the image itself)
  const extractFromImage = useCallback(async (file) => {
    updateProgress('Priprema slike i OCR analiza...', 10);

    // NEW: Read the image file as Base64
    const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    try {
      const result = await Tesseract.recognize(file, settings.ocrLanguage, {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            updateProgress(`OCR: ${Math.round(info.progress * 100)}%`, 20 + info.progress * 30);
          }
        },
      });
      
      // Map Tesseract words (which include bounding boxes)
      const elements = result.data.words.map(word => ({
        text: word.text,
        x: Math.round(word.bbox.x0 * 10) / 10,
        y: Math.round(word.bbox.y0 * 10) / 10,
        width: Math.round((word.bbox.x1 - word.bbox.x0) * 10) / 10,
        height: Math.round((word.bbox.y1 - word.bbox.y0) * 10) / 10,
        confidence: word.confidence
      }));

      // Reconstruct text spatially
      updateProgress('Rekonstrukcija prostornog rasporeda teksta...', 55);
      const spatialText = reconstructSpatialText(elements);

      return {
        rawText: result.data.text,
        spatialText: spatialText,
        elements: elements,
        images: [imageDataUrl], // NEW: Include the image
        confidence: result.data.confidence,
        tesseractData: result.data
      };
    } catch (err) {
      console.error('OCR failed:', err);
      throw err;
    }
  }, [settings.ocrLanguage, updateProgress]);

  // Extract from spreadsheet (UPDATED)
  const extractFromSpreadsheet = useCallback(async (file) => {
    updateProgress('Čitanje Excel/CSV...', 30);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    // Convert to CSV format
    const data = XLSX.utils.sheet_to_csv(firstSheet);
    
    return {
      rawText: data,
      spatialText: data,
      elements: [],
      images: [], // NEW
      metadata: { fileName: file.name, sheets: workbook.SheetNames },
    };
  }, [updateProgress]);

    // Extract from text file (UPDATED)
    const extractFromText = useCallback(async (file) => {
        updateProgress('Čitanje teksta...', 40);
        const text = await file.text();
        return { rawText: text, spatialText: text, elements: [], images: [], metadata: { fileName: file.name } };
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


  // Create preview (ENHANCED: Reuses extracted images if available)
  const createPreview = useCallback(async (file, extractedData) => {
    try {
      // NEW: If images were already extracted (PDF render or image upload), use the first one
      if (extractedData && extractedData.images && extractedData.images.length > 0) {
        return { 
            type: file.type === 'application/pdf' ? 'pdf' : 'image', 
            dataUrl: extractedData.images[0], 
            pageCount: extractedData.metadata?.numPages 
        };
      }
        
      // Fallback for file types that don't extract images (e.g., Excel, Text)
      if (file.type === 'application/pdf') {
        // If PDF extraction failed or didn't yield images, try rendering again
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const dataUrl = await renderPDFPageToImage(page, MEMORY_PROFILES[settings.memoryProfile].pdfScale);
        return { type: 'pdf', dataUrl: dataUrl, pageCount: pdf.numPages };

      } else if (file.type.startsWith('image/')) {
        // If image extraction failed, try reading again
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ type: 'image', dataUrl: reader.result });
          reader.readAsDataURL(file);
        });
      }
      return { type: 'text', content: 'Pregled nije dostupan' };
    } catch (err) {
      console.error('Preview error:', err);
      return { type: 'text', content: 'Pregled nije uspio: ' + err.message };
    }
  }, []);

  // Main processing coordinator (UPDATED: Uses analysisMode setting)
  const processSingleFile = useCallback(async (file) => {
    // 1. Extract Raw Data (Includes coordinates, spatial text, AND images)
    const extractedData = await extractStructuredData(file);
    
    // 2. Analyze Data
    let analysis = {};
    if (settings.autoAnalyze) {
        const useLLM = settings.useLLM && llmStatus === 'connected';

        if (useLLM) {
            // Determine which analysis method to use based on settings and available data
            if (settings.analysisMode === AI_MODES.VISION && extractedData.images.length > 0) {
                // Use the new Vision approach
                analysis = await analyzeWithVLM(extractedData);
            } else {
                // Use the existing Spatial approach (or if Vision is selected but no images exist)
                if (settings.analysisMode === AI_MODES.VISION && extractedData.images.length === 0) {
                    console.warn("Vizualni mod odabran, ali nema slika (npr. Excel/Text). Prebacujem na prostornu analizu.");
                }
                analysis = await analyzeWithSpatial(extractedData);
            }
        } else {
            // Regex fallback
            const textToAnalyze = extractedData.spatialText || extractedData.rawText;
            analysis = analyzeWithRegex(textToAnalyze);
        }
    } else {
        analysis = { documentType: 'unknown', confidence: 0, analysisMethod: 'Disabled', items: [], totals: {} };
    }
    
    // 3. Create Preview (Pass extractedData to reuse images)
    const preview = await createPreview(file, extractedData);

    return {
      id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      rawData: extractedData, // rawData now holds the enhanced extraction results including images
      analysis,
      preview,
      status: 'processed',
      documentType: analysis.documentType || 'other',
    };
  }, [extractStructuredData, settings, llmStatus, analyzeWithSpatial, analyzeWithVLM, analyzeWithRegex, createPreview]);


  // Process multiple files (Main loop with error handling)
  const processMultipleFiles = useCallback(async (files) => {
    setProcessing(true);
    setError(null);
    const processedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updateProgress(`Obrađujem dokument ${i + 1}/${files.length}: ${file.name}`, Math.round((i / files.length) * 100));

      try {
        const doc = await processSingleFile(file);
        processedDocs.push(doc);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        // If processing fails (e.g., PDF.js error), create an error document object
        processedDocs.push({
          id: `DOC-ERR-${Date.now()}-${i}`,
          fileName: file.name,
          error: err.message,
          status: 'error',
          analysis: {},
          documentType: 'other',
          // UPDATED: Ensure images array exists
          rawData: { rawText: 'Nije moguće pročitati sadržaj zbog greške.', spatialText: '', elements: [], images: []},
          preview: { type: 'text', content: 'Pregled nije dostupan zbog greške.'}
        });
        setError(`Greška pri obradi datoteke: ${file.name}. Detalji: ${err.message}`);
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

  // Export functions
  const exportItemsToExcel = useCallback(() => {
    if (!currentDocument?.analysis?.items) return;
    
    const wb = XLSX.utils.book_new();
    const itemsData = currentDocument.analysis.items.map((item) => ({
      Pozicija: item.position || '',
      Šifra: item.code || '',
      Opis: item.description || '',
      Količina: item.quantity,
      Jedinica: item.unit || 'kom',
      'Jed. cijena (Neto)': item.unitPrice,
      'Popust (%)': item.discountPercent,
      'Ukupno (Neto)': item.totalPrice,
    }));
    
    const ws = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Stavke');
    XLSX.writeFile(wb, UI_TEXT.exportItemsXlsx(currentDocument.analysis.documentNumber));
  }, [currentDocument]);

  const exportCurrentToJSON = useCallback(() => {
    if (!currentDocument) return;
    downloadJSON(currentDocument.analysis, UI_TEXT.exportDocJsonName(currentDocument.analysis?.documentNumber));
  }, [currentDocument]);


  // Document update (Handles nested updates for Edit Mode)
  const updateCurrentDocument = useCallback((fieldPath, value) => {
    if (!currentDocument) return;
    
    const updateNested = (obj, path, val) => {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((o, key) => {
            if (o[key] === undefined || o[key] === null) {
                o[key] = {};
            }
            return o[key];
        }, obj);
        
        // Handle numeric fields specifically during edit updates
        if (path.includes('totals.') || path.includes('Price') || path.includes('Amount') || path.includes('quantity') || path.includes('Percent')) {
            // Allow empty string for user clearing input, otherwise parse
            target[lastKey] = val === '' ? null : toNumber(val);
        } else {
            target[lastKey] = val;
        }
    };

    setDocuments(prev =>
      prev.map((doc, idx) => {
        if (idx !== currentDocIndex) return doc;
        
        const updatedDoc = JSON.parse(JSON.stringify(doc)); // Deep copy
        
        // Ensure analysis object exists before attempting update
        if (!updatedDoc.analysis) {
            updatedDoc.analysis = {};
        }

        updateNested(updatedDoc.analysis, fieldPath, value);
        
        // Also update top-level type if changed
        if (fieldPath === 'documentType') {
            updatedDoc.documentType = value;
        }

        return updatedDoc;
      })
    );
  }, [currentDocument, currentDocIndex]);

  const updateDocumentType = useCallback((type) => {
    updateCurrentDocument('documentType', type);
  }, [updateCurrentDocument]);

  // Confirm documents (Mock save)
  const confirmAllDocuments = useCallback(() => {
    if (!selectedProject) {
      setError(UI_TEXT.selectProjectHint);
      return;
    }
    
    const confirmed = documents.map(doc => ({
      ...doc,
      project: selectedProject,
      position: selectedPosition,
      confirmedDate: new Date().toISOString(),
      status: 'confirmed',
    }));
    
    setConfirmedDocuments(prev => [...prev, ...confirmed]);
    setDocuments([]);
    setCurrentDocIndex(0);
    setSelectedProject(null);
    setSelectedPosition(null);
    alert(`${documents.length} dokumenata uspješno potvrđeno!`);
  }, [documents, selectedProject, selectedPosition]);

  // Start new batch
  const startNewBatch = useCallback(() => {
    if (documents.length > 0 && !window.confirm(UI_TEXT.confirmNewBatch)) {
        return;
    }
    setDocuments([]);
    setCurrentDocIndex(0);
    setError(null);
    setEditMode(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [documents.length]);

  // Handle file input
  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processMultipleFiles(files);
    }
  }, [processMultipleFiles]);

  // Handle Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processMultipleFiles(Array.from(e.dataTransfer.files));
        e.dataTransfer.clearData();
    }
  };

  // Define theme classes
  const theme = useMemo(() => ({
    bg: settings.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800',
    card: settings.darkMode ? 'bg-gray-800/80 border border-gray-700 shadow-lg backdrop-blur-xl' : 'bg-white/80 border border-gray-200/50 shadow-lg backdrop-blur-xl',
    input: settings.darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800',
    buttonGray: settings.darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200',
    textMuted: settings.darkMode ? 'text-gray-400' : 'text-gray-600',
  }), [settings.darkMode]);

  // Render
  return (
    <div className={`min-h-screen ${theme.bg}`} onDragOver={handleDragOver} onDrop={handleDrop}>
      <div className="max-w-[1600px] mx-auto p-4 lg:p-6">
        {/* Header */}
        <div className={`rounded-2xl p-6 mb-6 ${theme.card}`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {UI_TEXT.appTitle}
              </h1>
              
              <div className="flex items-center gap-4 mt-3">
                {/* LLM status */}
                <LlmStatusIndicator status={llmStatus} onRetry={checkLLMStatus} settings={settings} />

                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className={`text-sm ${theme.textMuted}`}>
                    {UI_TEXT.docsCount(documents.length, confirmedDocuments.length)}
                  </span>
                </div>

                <button onClick={() => setShowDebug(!showDebug)} className={`text-sm px-3 py-1 rounded-lg transition-colors ${theme.buttonGray}`}>
                  {UI_TEXT.btnShowDebug(showDebug)}
                </button>
                <button 
                  onClick={() => {
                    cleanupAllDocumentsMemory(documents);
                    console.log('Memory cleanup completed for', documents.length, 'documents');
                  }} 
                  className={`p-2 rounded-lg transition-colors ${theme.buttonGray}`}
                  title="Očisti memoriju (ukloni slike iz obrađenih dokumenata)"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => setShowSettings(true)} className={`p-2 rounded-lg transition-colors ${theme.buttonGray}`}>
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              {/* View Mode Toggle */}
              {documents.length > 0 && (
                <div className={`flex gap-1 rounded-xl p-1 ${settings.darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <button onClick={() => setViewMode('normal')} className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'normal' ? 'bg-blue-600 text-white shadow-md' : theme.textMuted}`}>
                        <Grid3x3 size={16} />
                    </button>
                    <button onClick={() => setViewMode('focus')} className={`px-3 py-2 rounded-lg text-sm ${viewMode === 'focus' ? 'bg-blue-600 text-white shadow-md' : theme.textMuted}`}>
                        <Focus size={16} />
                    </button>
                </div>
              )}

              {documents.length > 0 && (
                <button onClick={startNewBatch} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all">
                  <FilePlus className="w-4 h-4" />
                  {UI_TEXT.newBatch}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {processing && (
          <div className={`rounded-2xl p-6 mb-6 ${theme.card}`}>
            <div className="flex-1">
                <div className="mb-2 text-sm font-semibold">{progressStep} ({progress}%)</div>
                <div className={`h-3 rounded-full overflow-hidden ${settings.darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }}/>
                </div>
              </div>
          </div>
        )}

        {/* Upload Zone */}
        {(documents.length === 0 && !processing) && (
          <UploadZone 
            fileInputRef={fileInputRef} 
            cameraInputRef={cameraInputRef}
            handleFileInput={handleFileInput}
            theme={theme}
          />
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5" />
            <div className="flex-1 text-sm whitespace-pre-wrap">{error}</div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-200 rounded transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        {documents.length > 0 && currentDocument && (
          <>
            {/* Document Navigation */}
            {documents.length > 1 && (
                <DocumentNavigation 
                    documents={documents} 
                    currentDocIndex={currentDocIndex} 
                    setCurrentDocIndex={(idx) => {
                        setCurrentDocIndex(idx);
                        setEditMode(false); // Reset edit mode when switching documents
                    }}
                    theme={theme}
                />
            )}

            {/* View Modes */}
            {viewMode === 'focus' ? (
              <FocusModeView
                document={currentDocument}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
                onBack={() => setViewMode('normal')}
                onUpdateDocument={updateCurrentDocument}
                theme={theme}
              />
            ) : (
              /* Normal View */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                  {/* Project Assignment */}
                  <ProjectAssignment
                    projects={projects}
                    positions={positions}
                    selectedProject={selectedProject}
                    selectedPosition={selectedPosition}
                    onProjectChange={setSelectedProject}
                    onPositionChange={setSelectedPosition}
                    theme={theme}
                  />

                  {/* Document Analysis */}
                  <DocumentAnalysis
                    document={currentDocument}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onUpdateDocument={updateCurrentDocument}
                    onUpdateType={updateDocumentType}
                    theme={theme}
                  />

                  {/* Export & Actions */}
                  <ExportActions
                    documents={documents}
                    selectedProject={selectedProject}
                    selectedPosition={selectedPosition}
                    onExportItemsExcel={exportItemsToExcel}
                    onExportCurrentJSON={exportCurrentToJSON}
                    onConfirmAll={confirmAllDocuments}
                    theme={theme}
                  />
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Preview */}
                  {currentDocument.preview && (
                    <DocumentPreview
                      document={currentDocument}
                      showPreview={showPreview}
                      setShowPreview={setShowPreview}
                      onFocusMode={() => setViewMode('focus')}
                      theme={theme}
                    />
                  )}

                  {/* Quick Stats */}
                  <QuickStats document={currentDocument} theme={theme} />
                </div>
              </div>
            )}
          </>
        )}

        {/* Debug Panel (Updated) */}
        {showDebug && currentDocument && (
          <DebugPanel document={currentDocument} llmStatus={llmStatus} settings={settings} />
        )}

        {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel 
            settings={settings} 
            onSettingsChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}

/** ======================== SUB-COMPONENTS ======================== */

// Helper Component: LLM Status Indicator
const LlmStatusIndicator = ({ status, onRetry, settings }) => {
    const statusText = {
        connected: 'Online (AI Spreman)',
        offline: 'Offline (Koristi Regex)',
        checking: 'Provjera...',
        disabled: 'AI Onemogućen',
    };

    const statusColor = status === 'connected' ? 'text-green-600' : status === 'offline' ? 'text-red-600' : 'text-gray-600';
    const indicatorColor = status === 'connected' ? 'bg-green-500 shadow-green-500/50 animate-pulse' : status === 'offline' ? 'bg-red-500 shadow-red-500/50' : 'bg-gray-400';

    return (
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${indicatorColor}`} />
            <span className="text-sm font-medium text-gray-700">
                {UI_TEXT.lmStudio}:{' '}
                <span className={statusColor}>
                    {statusText[status] || status}
                </span>
            </span>
            {status === 'offline' && settings.useLLM && (
                <button onClick={onRetry} title="Ponovno provjeri status">
                    <RefreshCw className='w-3 h-3 text-blue-500 hover:text-blue-700'/>
                </button>
            )}
        </div>
    );
};

// Helper Component: Upload Zone
const UploadZone = ({ fileInputRef, cameraInputRef, handleFileInput, theme }) => (
    <div className={`rounded-2xl p-6 ${theme.card}`}>
        <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls,image/*"
            className="hidden"
            onChange={handleFileInput}
        />
        <div 
            onClick={() => fileInputRef.current?.click()} 
            className="border-2 border-dashed border-blue-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
        >
            <Upload className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3">{UI_TEXT.dropHereTitle}</h2>
            <p className={theme.textMuted}>{UI_TEXT.dropHereSub}</p>
        </div>
    </div>
);


// Reusable Input component for editable fields
const EditableField = ({ label, value, fieldPath, onChange, editMode, type = 'text', placeholder = 'N/A', theme, isNumeric=false }) => {
    
    // Format display value
    const displayValue = useMemo(() => {
        if (value === null || value === undefined) return placeholder;
        if (isNumeric) {
            const num = toNumber(value);
            return num === null ? placeholder : num.toFixed(2);
        }
        return value;
    }, [value, isNumeric, placeholder]);

    const handleChange = (e) => {
        onChange(fieldPath, e.target.value);
    };

    return (
      <div>
        <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>
          {label}
        </label>
        {editMode ? (
          <input
            type={type === 'date' ? 'date' : (isNumeric ? 'number' : 'text')}
            step={isNumeric ? "0.01" : undefined}
            // When editing numeric fields, show the raw number value
            value={value === null ? '' : String(value)} 
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${theme.input}`}
          />
        ) : (
          <div className={`p-3 bg-gray-100 rounded-lg font-medium ${isNumeric ? 'text-right' : ''} ${!value ? 'text-gray-400' : 'text-gray-800'}`}>
            {displayValue}
          </div>
        )}
      </div>
    );
};

function DocumentNavigation({ documents, currentDocIndex, setCurrentDocIndex, theme }) {
    return (
        <div className={`rounded-2xl p-4 mb-6 ${theme.card}`}>
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
            Dokumenti ({currentDocIndex + 1}/{documents.length})
            </h3>
            <div className="flex gap-2">
            <button
                onClick={() => setCurrentDocIndex(Math.max(0, currentDocIndex - 1))}
                disabled={currentDocIndex === 0}
                className={`p-2 rounded-lg disabled:opacity-50 transition-colors ${theme.buttonGray}`}
            >
                <ChevronLeft size={16} />
            </button>
            <button
                onClick={() => setCurrentDocIndex(Math.min(documents.length - 1, currentDocIndex + 1))}
                disabled={currentDocIndex === documents.length - 1}
                className={`p-2 rounded-lg disabled:opacity-50 transition-colors ${theme.buttonGray}`}
            >
                <ChevronRight size={16} />
            </button>
            </div>
        </div>
        
        {/* Document tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
            {documents.map((doc, idx) => {
            const typeInfo = DOCUMENT_TYPES[doc.documentType] || DOCUMENT_TYPES.other;
            const Icon = typeInfo.icon;
            return (
                <button
                key={doc.id}
                onClick={() => setCurrentDocIndex(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors border ${
                    idx === currentDocIndex 
                    ? 'border-blue-500 bg-blue-100 text-blue-700 shadow-sm' 
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                }`}
                >
                {doc.status === 'error' ? <AlertCircle size={14} className='text-red-500'/> : <Icon size={14} style={{ color: idx === currentDocIndex ? 'currentColor' : typeInfo.color }} />}
                <span className='truncate max-w-xs'>{doc.fileName}</span>
                </button>
            );
            })}
        </div>
    </div>
    );
}

function ProjectAssignment({ projects, positions, selectedProject, selectedPosition, onProjectChange, onPositionChange, theme }) {
    const availablePositions = useMemo(() => {
        if (!selectedProject) return [];
        return positions.filter(p => p.project === selectedProject.id);
    }, [positions, selectedProject]);

    useEffect(() => {
        if (selectedPosition && selectedProject && selectedPosition.project !== selectedProject.id) {
            onPositionChange(null);
        }
    }, [selectedProject, selectedPosition, onPositionChange]);

  return (
    <div className={`rounded-2xl p-6 ${theme.card}`}>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-600" />
          {UI_TEXT.projectAssignment}
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>{UI_TEXT.projectLabel}</label>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => onProjectChange(projects.find(p => p.id === e.target.value) || null)}
            className={`w-full px-4 py-2.5 border rounded-xl focus:ring-blue-500 focus:border-blue-500 transition ${theme.input}`}
          >
            <option value="">-- Odaberi projekt --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>{UI_TEXT.positionLabel}</label>
          <select
            value={selectedPosition?.id || ''}
            onChange={(e) => onPositionChange(positions.find(p => p.id === e.target.value) || null)}
            className={`w-full px-4 py-2.5 border rounded-xl focus:ring-blue-500 focus:border-blue-500 transition disabled:opacity-50 ${theme.input}`}
            disabled={!selectedProject}
          >
            <option value="">-- Bez pozicije --</option>
            {availablePositions.map(pos => (
                <option key={pos.id} value={pos.id}>{pos.name}</option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function DocumentAnalysis({ document, editMode, setEditMode, onUpdateDocument, onUpdateType, theme }) {
  if (document.status === 'error') {
    return (
        <div className={`rounded-2xl p-6 ${theme.card} border-l-4 border-red-500`}>
            <h2 className="text-xl font-semibold text-red-600 mb-4">Greška pri obradi</h2>
            <p>{document.error}</p>
        </div>
    );
  }
    
  if (!document?.analysis || Object.keys(document.analysis).length === 0) {
    return (
      <div className={`rounded-2xl p-6 ${theme.card}`}>
        <p className={theme.textMuted}>Analiza nije dovršena ili nije uspjela.</p>
      </div>
    );
  }

  const data = document.analysis;

  // UPDATED: Added VLM badge color
  const getMethodBadgeClass = (method) => {
    if (method.includes('VLM') || method.includes('Vizualno')) return 'bg-purple-100 text-purple-800';
    if (method.includes('LLM') || method.includes('Koordinate')) return 'bg-green-100 text-green-800';
    if (method.includes('Regex')) return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`rounded-2xl p-6 ${theme.card}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{UI_TEXT.docAnalysis}</h2>
        <div className="flex gap-3 items-center">
            {data.analysisMethod && (
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${getMethodBadgeClass(data.analysisMethod)}`}>
                    Metoda: {data.analysisMethod}
                </span>
            )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all shadow-sm ${
              editMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {editMode ? <CheckCircle2 size={16} /> : <Edit3 size={16} />}
            {editMode ? UI_TEXT.save : UI_TEXT.edit}
          </button>
        </div>
      </div>

      {/* Document Type Selector */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>{UI_TEXT.docType}</label>
        <select
          value={document.documentType || 'other'}
          onChange={(e) => onUpdateType(e.target.value)}
          className={`w-full px-4 py-2.5 border rounded-xl focus:ring-blue-500 focus:border-blue-500 transition ${theme.input}`}
        >
          {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
            <option key={key} value={key}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Analysis Details */}
      <DocumentAnalysisView document={document} editMode={editMode} onUpdate={onUpdateDocument} theme={theme} />
    </div>
  );
}

// View component for analysis data (Uses EditableField)
function DocumentAnalysisView({ document, editMode = false, onUpdate, theme }) {
  const data = document.analysis;
  const currency = data.currency || 'EUR';

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EditableField label={UI_TEXT.documentNumber} value={data.documentNumber} fieldPath="documentNumber" editMode={editMode} onChange={onUpdate} theme={theme} />
        <EditableField label={UI_TEXT.date} value={data.date} fieldPath="date" editMode={editMode} onChange={onUpdate} theme={theme} type="date" />
        <EditableField label={UI_TEXT.dueDate} value={data.dueDate} fieldPath="dueDate" editMode={editMode} onChange={onUpdate} theme={theme} type="date" />
        <EditableField label={UI_TEXT.currency} value={data.currency} fieldPath="currency" editMode={editMode} onChange={onUpdate} theme={theme} />
      </div>

      {/* Supplier & Buyer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-200">
          <h4 className="font-semibold mb-3 text-blue-800">{UI_TEXT.supplier}</h4>
          <EditableField label={UI_TEXT.name} value={data.supplier?.name} fieldPath="supplier.name" editMode={editMode} onChange={onUpdate} theme={theme} />
          <EditableField label={UI_TEXT.oib} value={data.supplier?.oib} fieldPath="supplier.oib" editMode={editMode} onChange={onUpdate} theme={theme} />
          <EditableField label={UI_TEXT.iban} value={data.supplier?.iban} fieldPath="supplier.iban" editMode={editMode} onChange={onUpdate} theme={theme} />
          <EditableField label={UI_TEXT.address} value={data.supplier?.address} fieldPath="supplier.address" editMode={editMode} onChange={onUpdate} theme={theme} />
        </div>

        <div className="bg-green-50 p-4 rounded-lg space-y-3 border border-green-200">
          <h4 className="font-semibold mb-3 text-green-800">{UI_TEXT.buyer}</h4>
          <EditableField label={UI_TEXT.name} value={data.buyer?.name} fieldPath="buyer.name" editMode={editMode} onChange={onUpdate} theme={theme} />
          <EditableField label={UI_TEXT.oib} value={data.buyer?.oib} fieldPath="buyer.oib" editMode={editMode} onChange={onUpdate} theme={theme} />
          <EditableField label={UI_TEXT.address} value={data.buyer?.address} fieldPath="buyer.address" editMode={editMode} onChange={onUpdate} theme={theme} />
        </div>
      </div>

      {/* Items Table (Display only) */}
      {data.items && data.items.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">{UI_TEXT.items(data.items.length)}</h4>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Šifra</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Kol.</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jed.</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Cijena (Neto)</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Popust %</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ukupno (Neto)</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.items.map((item, idx) => (
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
      {data.totals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
                {/* Placeholder */}
            </div>
            <div className="space-y-4">
                <EditableField
                    label={UI_TEXT.subtotal}
                    value={data.totals.subtotal}
                    fieldPath="totals.subtotal"
                    editMode={editMode}
                    onChange={onUpdate}
                    theme={theme}
                    isNumeric={true}
                />
                <EditableField
                    label={UI_TEXT.vat}
                    value={data.totals.vatAmount}
                    fieldPath="totals.vatAmount"
                    editMode={editMode}
                    onChange={onUpdate}
                    theme={theme}
                    isNumeric={true}
                />
                <div className="pt-2 border-t border-gray-300">
                    <div className="flex justify-between items-center p-3 bg-blue-600 text-white rounded-lg">
                        <span className="font-bold text-lg">{UI_TEXT.total}</span>
                        <span className="font-bold text-2xl">
                            {formatCurrency(data.totals.totalAmount, currency)}
                        </span>
                    </div>
                    {editMode && (
                         <div className="mt-2">
                            <input 
                                type="number"
                                step="0.01"
                                value={data.totals.totalAmount === null ? '' : String(data.totals.totalAmount)}
                                onChange={(e) => onUpdate('totals.totalAmount', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 ${theme.input}`}
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
}

function ExportActions({ 
  documents, 
  selectedProject, 
  selectedPosition,
  onExportItemsExcel, 
  onExportCurrentJSON,
  onConfirmAll,
  theme
}) {
  return (
    <div className={`rounded-2xl p-6 ${theme.card}`}>
      <div className="space-y-4">
        {/* Export Options */}
        <div>
          <h3 className="font-semibold mb-3">{UI_TEXT.exportOptions}</h3>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={onExportItemsExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm shadow-md"
            >
              <FileSpreadsheet size={16} />
              {UI_TEXT.exportItems}
            </button>
             <button 
              onClick={onExportCurrentJSON}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all text-sm shadow-md"
            >
              <FileCode size={16} />
              {UI_TEXT.exportJsonCurrent}
            </button>
          </div>
        </div>

        {/* Confirm All */}
        <div className="pt-4 border-t border-gray-200">
          {!selectedProject ? (
            <div className="flex items-center gap-2 text-amber-700 p-3 bg-amber-100 rounded-lg border border-amber-300 mb-3">
              <Info size={16} />
              <span className="text-sm">{UI_TEXT.selectProjectHint}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-700 p-3 bg-green-100 rounded-lg border border-green-300 mb-3">
              <CheckCircle2 size={16} />
              <span className="text-sm">
                {UI_TEXT.readyConfirm(
                  documents.length,
                  selectedProject.name,
                  selectedPosition?.name
                )}
              </span>
            </div>
          )}

          <button 
            onClick={onConfirmAll}
            disabled={!selectedProject}
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg ${
              selectedProject
                ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:opacity-95'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <BadgeCheck size={20} />
            {UI_TEXT.confirmAll}
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ document, showPreview, setShowPreview, onFocusMode, theme }) {
    if (document.status === 'error') return null;

  return (
    <div className={`rounded-2xl p-6 ${theme.card}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{UI_TEXT.preview}</h3>
        <div className='flex gap-2'>
            <button onClick={() => setShowPreview(!showPreview)} className={`p-2 rounded-lg transition-all ${theme.buttonGray}`}>
                {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {showPreview && (
                 <button onClick={onFocusMode} className={`p-2 rounded-lg transition-all ${theme.buttonGray}`} title="Focus Mode">
                    <Maximize2 size={16} />
                 </button>
            )}
        </div>
      </div>

      {showPreview && (
        <div 
          className="rounded-xl overflow-hidden border border-gray-200 bg-white cursor-pointer"
          onClick={onFocusMode}
        >
          {document.preview?.dataUrl ? (
            <img 
                src={document.preview.dataUrl} 
                alt="Document Preview" 
                className="w-full max-h-96 object-contain p-2"
            />
          ) : (
            <div className="p-4 text-center text-gray-500">{document.preview?.content || 'Nema pregleda'}</div>
          )}
          <div className="p-2 bg-gray-50 border-t text-center">
            <span className="text-xs text-gray-600">{UI_TEXT.clickForFocus}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStats({ document, theme }) {
  if (!document?.analysis || document.status === 'error') return null;
  const data = document.analysis;
  const currency = data.currency || 'EUR';

  // Determine confidence color
  const confidence = data.confidence || 0;
  let confidenceColor = 'red';
  if (confidence >= 0.9) confidenceColor = 'green';
  else if (confidence >= 0.7) confidenceColor = 'blue';
  else if (confidence >= 0.5) confidenceColor = 'amber';

  return (
    <div className={`rounded-2xl p-6 ${theme.card}`}>
      <h3 className="text-lg font-semibold mb-4">{UI_TEXT.quickAnalytics}</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">{UI_TEXT.itemsCount}</span>
          <span className="font-bold text-blue-800">{data.items?.length || 0}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <span className="text-sm text-green-700">{UI_TEXT.totalValue}</span>
          <span className="font-bold text-green-800">
            {formatCurrency(data.totals?.totalAmount, currency)}
          </span>
        </div>
        
        {data.confidence && (
          <div className={`p-3 bg-${confidenceColor}-50 rounded-lg`}>
            <div className="flex justify-between items-center mb-2">
                <span className={`text-sm text-${confidenceColor}-700`}>{UI_TEXT.confidence}</span>
                <span className={`font-bold text-${confidenceColor}-800`}>
                    {(data.confidence * 100).toFixed(0)}%
                </span>
            </div>
            <div className={`h-2 bg-${confidenceColor}-200 rounded-full`}>
                <div className={`h-full bg-${confidenceColor}-600`} style={{ width: `${data.confidence * 100}%` }}></div>
            </div>
            <p className="text-xs mt-1 text-gray-500">Metoda: {data.analysisMethod}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Focus Mode View (Full screen comparison)
function FocusModeView({ document, zoomLevel, setZoomLevel, onBack, onUpdateDocument, theme }) {
    const [editMode, setEditMode] = useState(false);

    // Handle error state in Focus Mode
    if (document.status === 'error') {
        return (
            <div className={`rounded-2xl shadow-lg p-6 ${theme.card}`}>
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-red-600">Greška u dokumentu</h2>
                    <button onClick={onBack} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${theme.buttonGray}`}>
                        <ArrowLeft size={16} />
                        {UI_TEXT.backToNormal}
                    </button>
                </div>
                <p>{document.error}</p>
            </div>
        );
    }


    return (
    <div className={`rounded-2xl shadow-lg p-6 ${theme.card}`}>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">Focus Mode - Detaljna provjera</h2>
        <div className='flex gap-3'>
            <button
                onClick={() => setEditMode(!editMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                editMode ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                }`}
            >
                {editMode ? <CheckCircle2 size={16} /> : <Edit3 size={16} />}
                {editMode ? UI_TEXT.save : UI_TEXT.edit}
            </button>
            <button onClick={onBack} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${theme.buttonGray}`}>
                <ArrowLeft size={16} />
                {UI_TEXT.backToNormal}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]">
        {/* Left side: Document Preview */}
        <div className="flex flex-col h-full border-r pr-6">
          <div className="flex justify-end items-center mb-4">
            <div className="flex gap-2">
              <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))} className={`p-2 rounded-lg ${theme.buttonGray}`}><ZoomOut size={16} /></button>
              <span className={`px-3 py-2 rounded-lg text-sm ${theme.buttonGray}`}>{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(Math.min(300, zoomLevel + 25))} className={`p-2 rounded-lg ${theme.buttonGray}`}><ZoomIn size={16} /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto border rounded-lg bg-gray-50 p-4">
            {document.preview?.dataUrl ? (
              <img
                src={document.preview.dataUrl}
                alt="Document"
                style={{ width: `${zoomLevel}%`, height: 'auto', maxWidth: 'none' }}
                className='shadow-md'
              />
            ) : (
                <div className="p-4 text-center text-gray-500">{document.preview?.content || 'Nema pregleda'}</div>
            )}
          </div>
        </div>

        {/* Right side: Data Analysis */}
        <div className="overflow-auto h-full">
          <DocumentAnalysisView document={document} editMode={editMode} onUpdate={onUpdateDocument} theme={theme} />
        </div>
      </div>
    </div>
  );
}


// Function to extract tabular data from elements using coordinates
const extractTables = (elements) => {
    if (!elements || elements.length === 0) return [];

    // Group elements by similar Y coordinates (rows)
    const alignmentTolerance = 10; // pixels
    const rows = [];
    
    elements.forEach(el => {
        const existingRow = rows.find(row => 
            Math.abs(row.y - el.y) < alignmentTolerance
        );
        
        if (existingRow) {
            existingRow.elements.push(el);
        } else {
            rows.push({
                y: el.y,
                elements: [el]
            });
        }
    });

    // Sort rows by Y position (top to bottom)
    rows.sort((a, b) => a.y - b.y);

    // Sort elements within each row by X position (left to right)
    rows.forEach(row => {
        row.elements.sort((a, b) => a.x - b.x);
    });

    // Identify table-like structures (rows with similar column patterns)
    const tables = [];
    let currentTable = null;
    
    rows.forEach((row, index) => {
        const columnCount = row.elements.length;
        const hasNumbers = row.elements.some(el => /\d/.test(el.text));
        const isSpaced = row.elements.length > 2; // Multiple columns suggest table
        
        if (isSpaced && columnCount >= 3) {
            if (!currentTable) {
                currentTable = {
                    startRow: index,
                    rows: [],
                    columnCount: columnCount
                };
                tables.push(currentTable);
            }
            
            currentTable.rows.push({
                y: row.y,
                cells: row.elements.map(el => ({
                    text: el.text,
                    x: el.x,
                    width: el.width
                }))
            });
        } else if (currentTable && currentTable.rows.length < 2) {
            // Remove single row "tables"
            tables.pop();
            currentTable = null;
        } else {
            currentTable = null;
        }
    });

    return tables;
};

// ENHANCED DebugPanel (UPDATED to show Vision input)
function DebugPanel({ document, llmStatus, settings }) {
    const [viewMode, setViewMode] = useState('input'); // input, spatial_text, tables, elements, system

    const isVisionMode = settings.analysisMode === AI_MODES.VISION;

    return (
      <div className="mt-6 bg-gray-900 text-green-400 rounded-xl p-6 font-mono shadow-xl">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold flex items-center gap-2">
                <FileCode className="w-5 h-5 text-yellow-400" />
                {UI_TEXT.debugTitle} (Način: {isVisionMode ? 'Vizualni' : 'Koordinate'})
            </h3>
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setViewMode('input')} className={`px-3 py-1 rounded text-sm ${viewMode === 'input' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>AI Input</button>
                <button onClick={() => setViewMode('spatial_text')} className={`px-3 py-1 rounded text-sm ${viewMode === 'spatial_text' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Rekonstruirani Tekst</button>
                <button onClick={() => setViewMode('tables')} className={`px-3 py-1 rounded text-sm ${viewMode === 'tables' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Tablični Sadržaj</button>
                <button onClick={() => setViewMode('elements')} className={`px-3 py-1 rounded text-sm ${viewMode === 'elements' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Sirovi Elementi</button>
                <button onClick={() => setViewMode('system')} className={`px-3 py-1 rounded text-sm ${viewMode === 'system' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>Sistem/Izlaz</button>
            </div>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg overflow-auto max-h-[60vh]">
            {/* NEW: Show Vision input or Spatial input based on settings */}
            {viewMode === 'input' && (
                <>
                {isVisionMode ? (
                    <>
                        <p className='text-sm mb-2 text-green-400'>Prikaz slika koje se šalju VLM-u.</p>
                        <div className="flex flex-wrap gap-4">
                            {document.rawData?.images?.map((imgSrc, idx) => (
                                <div key={idx} className="border border-gray-600 p-2 rounded">
                                    <p className="text-xs mb-1">Slika {idx + 1}</p>
                                    <img src={imgSrc} alt={`Page ${idx+1}`} className="max-w-xs h-auto" />
                                </div>
                            ))}
                            {document.rawData?.images?.length === 0 && <p>Nema dostupnih slika za VLM analizu.</p>}
                        </div>
                    </>
                ) : (
                    <>
                        <p className='text-sm mb-2 text-blue-400'>Prikaz JSON podataka s koordinatama koji se šalju LLM-u (Spatial Mode).</p>
                        <pre className="text-xs whitespace-pre-wrap">
                            {/* Show the exact JSON data sent to LLM */}
                            {JSON.stringify({
                                elements: document.rawData?.elements?.slice(0, 20) || [],
                                spatialText: document.rawData?.spatialText?.substring(0, 500) + '...' || 'Nema prostornog teksta.',
                                metadata: {
                                    totalElements: document.rawData?.elements?.length || 0,
                                    pages: document.rawData?.metadata?.numPages || 1,
                                    fileName: document.rawData?.metadata?.fileName || 'unknown'
                                }
                            }, null, 2)}
                            {document.rawData?.elements?.length > 20 && '\n\n... (prikazano je samo prvih 20 elemenata)'}
                        </pre>
                    </>
                )}
                </>
            )}
            {viewMode === 'spatial_text' && (
                <>
                <p className='text-sm mb-2 text-yellow-400'>Rekonstruirani tekst iz koordinata. Tabulatori označavaju stupce.</p>
                <pre className="text-xs whitespace-pre-wrap">
                    {/* Displaying the spatially reconstructed text */}
                    {document.rawData?.spatialText || 'Nema prostornog teksta.'}
                </pre>
                </>
            )}
            {viewMode === 'tables' && (
                <>
                <p className='text-sm mb-2 text-purple-400'>Izdvojene tablice iz koordinata - strukturirani prikaz redaka i stupaca.</p>
                <div className="space-y-4">
                    {(() => {
                        const tables = extractTables(document.rawData?.elements || []);
                        if (tables.length === 0) {
                            return <p className="text-gray-400">Nema pronađenih tablitičnih struktura.</p>;
                        }
                        
                        return tables.map((table, tableIndex) => (
                            <div key={tableIndex} className="border border-gray-600 rounded-lg p-3">
                                <h4 className="text-purple-300 font-bold mb-2">
                                    Tablica {tableIndex + 1} ({table.rows.length} redaka, ~{table.columnCount} stupaca)
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <tbody>
                                            {table.rows.map((row, rowIndex) => (
                                                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-700' : ''}>
                                                    {row.cells.map((cell, cellIndex) => (
                                                        <td key={cellIndex} className="border border-gray-600 px-2 py-1 max-w-xs truncate" title={cell.text}>
                                                            {cell.text}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="text-xs text-gray-400 mt-2">
                                    Y pozicije: {table.rows.map(r => Math.round(r.y)).join(', ')}
                                </div>
                            </div>
                        ));
                    })()}
                </div>
                </>
            )}
            {viewMode === 'elements' && (
                <>
                    <p className='text-sm mb-2 text-yellow-400'>Ukupno elemenata: {document.rawData?.elements?.length || 0}</p>
                    <pre className="text-xs whitespace-pre-wrap">
                        {/* Displaying the raw JSON array of elements with coordinates */}
                        {JSON.stringify(document.rawData?.elements?.slice(0, 500) || [], null, 2)}
                        {document.rawData?.elements?.length > 500 && '\n... (skraćeno na 500 elemenata)'}
                    </pre>
                </>
            )}
             {viewMode === 'system' && (
                <pre className="text-xs whitespace-pre-wrap">
                     {/* Displaying system status and final JSON output */}
                     {/* UPDATED: Show active mode and model */}
                     {JSON.stringify({
                        llmStatus,
                        analysisMode: settings.analysisMode,
                        selectedModel: settings.selectedModel,
                        modelReference: settings.analysisMode === AI_MODES.VISION ? LM_STUDIO_CONFIG.MODEL_VISION : LM_STUDIO_CONFIG.MODEL_SPATIAL,
                        fileName: document.fileName,
                        pdfjsVersion: pdfjsVersion,
                        status: document.status,
                        error: document.error || null,
                        analysisMethod: document.analysis?.analysisMethod || 'N/A',
                        confidence: document.analysis?.confidence ? (document.analysis.confidence * 100).toFixed(0) + '%' : 'N/A',
                        AnalysisOutput: document.analysis
                    }, null, 2)}
                </pre>
            )}
        </div>
      </div>
    );
  }

// ENHANCED SettingsPanel (UPDATED to include Analysis Mode selection)
function SettingsPanel({ settings, onSettingsChange, onClose }) {
    const updateSetting = (key, value) => {
        onSettingsChange({ ...settings, [key]: value });
    };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
        <div className={`w-96 h-full shadow-2xl p-6 overflow-y-auto ${settings.darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-lg">Postavke</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-6">
                {/* AI/Analysis Settings */}
                <div>
                    <h4 className="text-sm font-medium mb-3">Analiza i AI</h4>
                    <div className="space-y-4">
                        <label className="flex items-center justify-between text-sm">
                            Automatska analiza
                            <input
                                type="checkbox"
                                checked={settings.autoAnalyze}
                                onChange={(e) => updateSetting('autoAnalyze', e.target.checked)}
                            />
                        </label>
                        <label className="flex items-center justify-between text-sm">
                            Koristi Lokalni AI (LM Studio)
                            <input
                                type="checkbox"
                                checked={settings.useLLM}
                                onChange={(e) => updateSetting('useLLM', e.target.checked)}
                            />
                        </label>
                        
                        {/* NEW: Analysis Mode Selector */}
                        {settings.useLLM && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-2">
                                    Način AI analize
                                </label>
                                <select
                                    value={settings.analysisMode}
                                    onChange={(e) => updateSetting('analysisMode', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                >
                                    <option value={AI_MODES.VISION}>Vizualna analiza (VLM - Preporučeno)</option>
                                    <option value={AI_MODES.SPATIAL}>Analiza koordinata (LLM - Stari način)</option>
                                </select>
                                <p className='text-xs text-gray-500 mt-2'>
                                    {settings.analysisMode === AI_MODES.VISION
                                        ? `Potrebno je učitati VLM model (npr. Qwen-VL, LLaVA) u LM Studio.`
                                        : `Koristi LLM (npr. ${LM_STUDIO_CONFIG.MODEL_SPATIAL}) za analizu teksta i koordinata.`
                                    }
                                </p>
                            </div>
                        )}

                        {/* NEW: Memory Profile Selector */}
                        <div className='pt-3 border-t border-gray-200'>
                            <label className="text-sm font-medium block mb-2">
                                Profil memorije
                            </label>
                            <select
                                value={settings.memoryProfile}
                                onChange={(e) => updateSetting('memoryProfile', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            >
                                {Object.entries(MEMORY_PROFILES).map(([key, profile]) => (
                                    <option key={key} value={key}>
                                        {profile.name}
                                    </option>
                                ))}
                            </select>
                            <p className='text-xs text-gray-500 mt-2'>
                                {MEMORY_PROFILES[settings.memoryProfile].description}
                            </p>
                            <div className='text-xs text-blue-600 mt-1'>
                                <strong>Trenutno:</strong> {MEMORY_PROFILES[settings.memoryProfile].maxTokens} tokena, 
                                {MEMORY_PROFILES[settings.memoryProfile].maxPages} stranica, 
                                {MEMORY_PROFILES[settings.memoryProfile].pdfScale}x kvaliteta
                            </div>
                        </div>

                        {/* NEW: Model Selector */}
                        {settings.useLLM && llmStatus === 'connected' && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-2">
                                    Odaberi model
                                </label>
                                <select
                                    value={settings.selectedModel}
                                    onChange={(e) => updateSetting('selectedModel', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                >
                                    {availableModels.length === 0 ? (
                                        <option value="">Učitavanje modela...</option>
                                    ) : (
                                        availableModels.map((model) => (
                                            <option key={model.id} value={model.id}>
                                                {model.id}
                                            </option>
                                        ))
                                    )}
                                </select>
                                <p className='text-xs text-gray-500 mt-2'>
                                    {availableModels.length > 0 
                                        ? `${availableModels.length} modela dostupno u LM Studio`
                                        : 'Povezujem s LM Studio...'
                                    }
                                </p>
                                <button 
                                    onClick={fetchAvailableModels}
                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                >
                                    🔄 Osvježi listu modela
                                </button>
                            </div>
                        )}

                        {!settings.useLLM && (
                             <p className='text-xs text-gray-500'>Ako je AI isključeno ili offline, koristi se Regex (manje precizno).</p>
                        )}
                    </div>
                </div>

                {/* OCR Settings */}
                 <div>
                    <h4 className="text-sm font-medium mb-3">OCR (Skenirani dokumenti)</h4>
                    <label className="text-xs font-medium block mb-2">
                        OCR jezik
                    </label>
                    <select
                        value={settings.ocrLanguage}
                        onChange={(e) => updateSetting('ocrLanguage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                        <option value="hrv+eng">Hrvatski + Engleski</option>
                        <option value="hrv">Samo Hrvatski</option>
                        <option value="eng">Samo Engleski</option>
                    </select>
                </div>

                 {/* Display Settings */}
                 <div>
                    <h4 className="text-sm font-medium mb-3">Prikaz</h4>
                    <label className="flex items-center justify-between text-sm">
                        Tamna tema (Dark Mode)
                        <input
                            type="checkbox"
                            checked={settings.darkMode}
                            onChange={(e) => updateSetting('darkMode', e.target.checked)}
                        />
                    </label>
                </div>
            </div>
        </div>
    </div>
  );
}