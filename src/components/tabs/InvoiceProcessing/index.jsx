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

// AI Integration Service
import aiIntegrationService from '../../../services/aiIntegrationService';

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
/* 
 * CHANGE: 2025-09-01 - Added BACKEND analysis mode for complete memory optimization
 * WHY: Enable full preprocessing bypass by sending files to backend service
 * IMPACT: Prevents any browser-based PDF processing, ideal for low-memory devices
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #backend-mode #memory-optimization #preprocessing-bypass
 */
const AI_MODES = {
    SPATIAL: 'spatial', // Uses coordinates (previous approach)
    VISION: 'vision',   // Uses images (new approach)
    OPENWEBUI: 'openwebui', // Uses OpenWebUI integration
    LMSTUDIO_DIRECT: 'lmstudio_direct', // Direct file upload to LM Studio (bypass OCR)
    BACKEND: 'backend', // Send to backend service (complete preprocessing bypass)
    AGENT: 'agent', // Send to PDF Agent with tool-calling LLMs (FastAPI orchestrator)
    DIRECT_PROMPT: 'direct_prompt', // Direct file + prompt → JSON (no agent, no tools)
    STRUCTURED_TEXT: 'structured_text', // OCR/parsing + structured prompt → CUDA LLM (optimized)
};

// Memory optimization profiles for different system configurations
/* 
 * CHANGE: 2025-09-01 - Enhanced MEMORY_PROFILES with processing delays
 * WHY: Add memory recovery timing between file processing to prevent crashes
 * IMPACT: Optimizes batch processing for different memory constraints
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #memory-profiles #processing-delay #batch-optimization
 */
const MEMORY_PROFILES = {
  HIGH_MEMORY: {
    name: 'Visoka memorija (16K tokena, 2.0x kvaliteta)',
    maxTokens: 16000,
    pdfScale: 2.0,
    maxPages: 5,
    processingDelay: 1000, // 1 second - high memory can process faster
    description: 'Najbolja kvaliteta, zahtijeva 8GB+ VRAM/RAM'
  },
  BALANCED: {
    name: 'Uravnoteženo (8K tokena, 1.5x kvaliteta)',
    maxTokens: 8000,
    pdfScale: 1.5,
    maxPages: 3,
    processingDelay: 2000, // 2 seconds - standard delay
    description: 'Dobra kvaliteta, zahtijeva 4-6GB VRAM/RAM'
  },
  LOW_MEMORY: {
    name: 'Štednja memorije (4K tokena, 1.2x kvaliteta)',
    maxTokens: 4000,
    pdfScale: 1.2,
    maxPages: 2,
    processingDelay: 3000, // 3 seconds - more time for cleanup
    description: 'Osnovna kvaliteta, zahtijeva 2-4GB VRAM/RAM'
  },
  MINIMAL: {
    name: 'Minimalno (2K tokena, 1.0x kvaliteta)',
    maxTokens: 2000,
    pdfScale: 1.0,
    maxPages: 1,
    processingDelay: 5000, // 5 seconds - maximum recovery time
    description: 'Najniža kvaliteta, zahtijeva 1-2GB VRAM/RAM'
  }
};

/* 
 * CHANGE: 2025-09-01 - Enhanced LM Studio configuration with dynamic context assessment
 * WHY: Enable automatic model switching based on document size and complexity
 * IMPACT: Improves analysis quality by matching model capabilities to document requirements
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #dynamic-context #model-switching #lm-studio-optimization
 */
const LM_STUDIO_CONFIG = {
  endpoint: 'http://10.39.35.136:1234/v1/chat/completions',
  temperature: 0.01,
  
  // Legacy model references (for backwards compatibility)
  MODEL_SPATIAL: 'openai/gpt-oss-20b',
  MODEL_VISION: 'VLM-Model (e.g., LLaVA/Qwen-VL)',
};

/* 
 * CHANGE: 2025-09-01 - Added CUDA-optimized LLM configuration for structured text processing
 * WHY: Enable high-performance local LLM processing with CUDA acceleration and model aliases
 * IMPACT: Provides optimal configuration for RTX 4060 GPU with structured prompts
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #cuda-optimization #structured-text #model-alias #api-key
 */
const CUDA_LLM_CONFIG = {
  // Default endpoint for CUDA-optimized server (using existing llama.cpp server on port 8000)
  endpoint: 'http://127.0.0.1:8000/v1/chat/completions',
  
  // Model alias configuration (instead of full path)
  modelAlias: 'gpt-oss-20b',
  fullModelPath: 'E:\\Modeli\\gpt-oss-20b-MXFP4.gguf',
  
  // Security and performance settings
  apiKey: 'local-key',
  contextWindow: 16384, // Extended context for structured documents
  
  // CUDA optimization parameters
  gpuLayers: -1, // All layers on GPU
  //flashAttention: true, // Flash attention for speed
  batchThreads: 8, // Optimal for RTX 4060
  
  // Analysis-specific settings
  temperature: 0.1, // Low for structured analysis
  maxTokens: 1200,  // Sufficient for JSON responses
  
  // Server launch command template
  serverCommand: `python -m llama_cpp.server --model "{modelPath}" --model_alias {alias} --host 127.0.0.1 --port 8000 --api_key {apiKey} --n_ctx {contextWindow} --n_gpu_layers {gpuLayers} --flash_attn {flashAttn} --n_threads {threads}`,
};

/* 
 * CHUNK: Dynamic Model Selection Configuration
 * PURPOSE: Map document characteristics to optimal model configurations
 * COMPLEXITY: Medium - context estimation and model mapping logic
 * PERFORMANCE_NOTE: Enables automatic optimization based on document analysis
 */
const DYNAMIC_MODEL_CONFIG = {
  // Model tiers based on context window capabilities
  SMALL_CONTEXT: {
    name: 'Mali kontekst (4K-8K tokena)',
    contextWindow: 8192,
    recommendedModels: [
      'microsoft/Phi-3-mini-4k-instruct',
      'microsoft/Phi-3-mini-128k-instruct', 
      'google/gemma-2-2b-it'
    ],
    maxDocumentSize: 50000,  // characters
    maxPages: 2,
    description: 'Brzi modeli za jednostavne dokumente'
  },
  MEDIUM_CONTEXT: {
    name: 'Srednji kontekst (16K-32K tokena)',
    contextWindow: 32768,
    recommendedModels: [
      'microsoft/Phi-3-medium-14b-instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
      'meta-llama/Llama-3.2-3B-Instruct'
    ],
    maxDocumentSize: 150000, // characters
    maxPages: 5,
    description: 'Uravnoteženi modeli za standardne dokumente'
  },
  LARGE_CONTEXT: {
    name: 'Veliki kontekst (64K-128K tokena)',
    contextWindow: 131072,
    recommendedModels: [
      'microsoft/Phi-3-medium-128k-instruct',
      'mistralai/Mistral-Nemo-Instruct-2407',
      'meta-llama/Llama-3.1-8B-Instruct'
    ],
    maxDocumentSize: 500000, // characters
    maxPages: 15,
    description: 'Napredni modeli za složene i dugačke dokumente'
  },
  EXTRA_LARGE_CONTEXT: {
    name: 'Maksimalni kontekst (200K+ tokena)',
    contextWindow: 262144,
    recommendedModels: [
      'anthropic/claude-3-haiku-20240307',
      'google/gemini-1.5-flash',
      'qwen/Qwen2.5-14B-Instruct'
    ],
    maxDocumentSize: 1000000, // characters
    maxPages: 50,
    description: 'Najviši nivo za kompleksne multi-page dokumente'
  }
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

/*
 * CHANGE: 2025-09-01 - Optimized PDF rendering to use Blob instead of Base64
 * WHY: Prevent browser memory crashes with large PDFs - Base64 strings consume 3x more memory
 * IMPACT: Significantly reduces RAM usage, prevents browser crashes
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #memory-optimization #pdf-rendering #blob-storage #performance
 */

// OPTIMIZED: Render PDF page as Blob with Object URL for memory efficiency
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

    // MEMORY OPTIMIZATION: Use Blob instead of Base64
    return new Promise((resolve, reject) => {
        // Lower quality (0.8) for significant memory savings
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas to Blob conversion failed'));
                return;
            }
            
            const objectUrl = URL.createObjectURL(blob);
            
            // Immediately cleanup canvas to free memory
            canvas.width = 0;
            canvas.height = 0;
            
            resolve({ blob, objectUrl, width: viewport.width, height: viewport.height });
        }, 'image/jpeg', 0.8); // JPEG with 80% quality for smaller size
    });
};

// Helper: Convert Blob to Base64 when needed for LM Studio API
const blobToBase64 = async (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

/*
 * CHANGE: 2025-09-01 - Enhanced memory cleanup to handle Object URLs
 * WHY: Prevent memory leaks from Blob Object URLs and optimize cleanup
 * IMPACT: Properly releases browser memory allocated for Blob objects
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #memory-cleanup #object-url #blob-management
 */

// ENHANCED: Memory cleanup utility with Object URL cleanup
const cleanupDocumentMemory = (document) => {
  if (document && document.rawData) {
    // CRITICAL: Cleanup Object URLs to prevent memory leaks
    if (document.rawData.images && Array.isArray(document.rawData.images)) {
      document.rawData.images.forEach(imageData => {
        if (imageData && typeof imageData === 'object' && imageData.objectUrl) {
          // Release memory allocated by browser for this Object URL
          URL.revokeObjectURL(imageData.objectUrl);
        }
      });
      document.rawData.images = [];
    }
    
    // Clean up other memory-intensive data
    if (document.rawData.tesseractData) {
      document.rawData.tesseractData = null;
    }
    
    // Clean up preview Object URLs if they exist
    if (document.preview && document.preview.imageData && document.preview.imageData.objectUrl) {
      URL.revokeObjectURL(document.preview.imageData.objectUrl);
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

/* 
 * CHANGE: 2025-09-01 - Enhanced spatial text reconstruction with intelligent table detection
 * WHY: Fix garbled table data that LM Studio cannot parse properly
 * IMPACT: Dramatically improves invoice parsing accuracy for tabular data
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #table-reconstruction #spatial-text #invoice-parsing #data-extraction
 */
const reconstructSpatialText = (elements) => {
    if (!elements || elements.length === 0) return '';

    // Calculate average height to determine tolerances adaptively
    const validHeights = elements.filter(el => el.height > 0);
    if (validHeights.length === 0) return elements.map(el => el.text).join(' '); // Fallback if heights are missing

    const avgHeight = validHeights.reduce((sum, el) => sum + el.height, 0) / validHeights.length;
    
    /* 
     * CHUNK: Enhanced Table Detection and Reconstruction
     * PURPOSE: Identify tabular structures and reconstruct them properly
     * COMPLEXITY: Medium - table detection heuristics and column alignment
     */
    
    // Step 1: Group elements into rows based on Y-coordinate
    const alignmentTolerance = Math.max(5, avgHeight * 0.4);
    const rows = [];
    
    const sortedByY = [...elements].sort((a, b) => a.y - b.y);
    
    sortedByY.forEach(element => {
        // Find existing row within tolerance or create new one
        let targetRow = rows.find(row => 
            Math.abs(row.y - element.y) < alignmentTolerance
        );
        
        if (!targetRow) {
            targetRow = {
                y: element.y,
                elements: []
            };
            rows.push(targetRow);
        }
        
        targetRow.elements.push(element);
    });
    
    // Step 2: Sort elements within each row by X-coordinate
    rows.forEach(row => {
        row.elements.sort((a, b) => a.x - b.x);
    });
    
    // Step 3: Detect table structure
    const isTable = detectTableStructure(rows);
    
    if (isTable) {
        return reconstructTableText(rows);
    } else {
        // Fall back to basic spatial reconstruction
        return reconstructBasicSpatialText(elements, alignmentTolerance, avgHeight);
    }
};

/* 
 * CHUNK: Table Structure Detection
 * PURPOSE: Identify if the document contains tabular data
 * COMPLEXITY: Medium - pattern recognition heuristics
 */
const detectTableStructure = (rows) => {
    if (rows.length < 3) return false; // Need at least 3 rows for a table
    
    // Look for consistent column patterns
    const columnCounts = rows.map(row => row.elements.length);
    const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length;
    
    // Check if most rows have similar column counts (within 20% variation)
    const consistentRows = columnCounts.filter(count => 
        Math.abs(count - avgColumns) <= avgColumns * 0.3
    );
    
    // If 60%+ of rows have consistent columns, likely a table
    const tableConfidence = consistentRows.length / rows.length;
    
    // Additional checks for table indicators
    const hasNumbers = rows.some(row => 
        row.elements.some(el => /\d/.test(el.text))
    );
    
    const hasTableHeaders = rows.length > 0 && rows[0].elements.some(el =>
        /artikl|opis|količina|cijena|ukupno|r\.?b\.?|jm|bto|nto/i.test(el.text)
    );
    
    console.log('🔍 Table Detection:', {
        rowCount: rows.length,
        avgColumns: avgColumns.toFixed(1),
        tableConfidence: tableConfidence.toFixed(2),
        hasNumbers,
        hasTableHeaders,
        isTable: tableConfidence > 0.6 || hasTableHeaders
    });
    
    const isTableDetected = tableConfidence > 0.6 || hasTableHeaders;
    
    // If table detected, suggest Vision mode for better accuracy
    if (isTableDetected && typeof window !== 'undefined') {
        console.log('💡 Table detected - Vision mode is recommended for better accuracy');
        // Could potentially update UI to suggest Vision mode
    }
    
    return isTableDetected;
};

/* 
 * CHUNK: Enhanced Table Text Reconstruction
 * PURPOSE: Properly format tabular data with aligned columns
 * COMPLEXITY: High - column alignment and spacing logic
 */
const reconstructTableText = (rows) => {
    // Identify column positions by analyzing X-coordinates across all rows
    const allXPositions = new Set();
    rows.forEach(row => {
        row.elements.forEach(el => allXPositions.add(Math.round(el.x / 5) * 5)); // Round to nearest 5px
    });
    
    const columnPositions = Array.from(allXPositions).sort((a, b) => a - b);
    
    console.log('📊 Table Columns detected at X positions:', columnPositions);
    
    // Assign elements to columns
    const tableRows = rows.map(row => {
        const columns = new Array(columnPositions.length).fill('');
        
        row.elements.forEach(element => {
            // Find the closest column position
            const closestColumnIndex = columnPositions.reduce((bestIndex, pos, index) => {
                const currentDistance = Math.abs(element.x - pos);
                const bestDistance = Math.abs(element.x - columnPositions[bestIndex]);
                return currentDistance < bestDistance ? index : bestIndex;
            }, 0);
            
            // Append to column (in case multiple elements map to same column)
            if (columns[closestColumnIndex]) {
                columns[closestColumnIndex] += ' ' + element.text;
            } else {
                columns[closestColumnIndex] = element.text;
            }
        });
        
        return columns;
    });
    
    // Format as properly spaced table
    let reconstructedText = '';
    
    tableRows.forEach((row, rowIndex) => {
        const formattedRow = row.map((cell, colIndex) => {
            // Pad cells to reasonable width for readability
            const cellContent = (cell || '').trim();
            return cellContent.padEnd(Math.min(20, Math.max(8, cellContent.length + 2)));
        }).join('|');
        
        reconstructedText += formattedRow.trim() + '\n';
        
        // Add separator after header row
        if (rowIndex === 0 && tableRows.length > 1) {
            const separator = row.map(() => '--------').join('|');
            reconstructedText += separator + '\n';
        }
    });
    
    return reconstructedText.trim();
};

/* 
 * CHUNK: Basic Spatial Text Reconstruction (Fallback)
 * PURPOSE: Handle non-tabular content with original logic
 * COMPLEXITY: Low - original algorithm preserved
 */
const reconstructBasicSpatialText = (elements, alignmentTolerance, avgHeight) => { 

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

// Robust JSON extraction from VLM responses (handles malformed JSON)
const extractJSONFromVLMResponse = (content) => {
  const strategies = [
    // Strategy 1: Clean markdown wrapping
    () => {
      let cleaned = content.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.substring(7);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      return JSON.parse(cleaned.trim());
    },
    
    // Strategy 2: Extract first complete JSON object
    () => {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON object found');
    },
    
    // Strategy 3: Find JSON between specific markers
    () => {
      const startIndex = content.indexOf('{');
      const lastIndex = content.lastIndexOf('}');
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        const jsonStr = content.substring(startIndex, lastIndex + 1);
        return JSON.parse(jsonStr);
      }
      throw new Error('No valid JSON boundaries found');
    },
    
    // Strategy 4: Fix common JSON issues and retry
    () => {
      let fixed = content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .trim();
      
      const startIndex = fixed.indexOf('{');
      const lastIndex = fixed.lastIndexOf('}');
      if (startIndex !== -1 && lastIndex !== -1) {
        fixed = fixed.substring(startIndex, lastIndex + 1);
      }
      
      return JSON.parse(fixed);
    }
  ];
  
  for (let i = 0; i < strategies.length; i++) {
    try {
      const result = strategies[i]();
      console.log(`✅ JSON extraction successful using strategy ${i + 1}`);
      return result;
    } catch (e) {
      console.warn(`❌ Strategy ${i + 1} failed:`, e.message);
    }
  }
  
  console.error('🚨 All JSON extraction strategies failed');
  return null;
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
    // OpenWebUI integration settings
    openWebUIUrl: 'http://localhost:8080',
    openWebUIApiKey: '',
    useOpenWebUI: false, // Toggle for OpenWebUI integration
    // Backend server settings
    backendUrl: 'http://localhost:3001',
    lmStudioEndpoint: LM_STUDIO_CONFIG.endpoint,
    
    // LM Studio Model Parameters (All parameters you can control programmatically)
    modelParams: {
      // Core Generation Parameters
      temperature: 0.1,        // Randomness (0.0-2.0) - lower = more focused/deterministic
      max_tokens: 16000,        // Maximum tokens to generate
      top_p: 0.9,             // Nucleus sampling (0.0-1.0) - probability mass cutoff
      top_k: 50,              // Top-k sampling (1-100) - consider only top K tokens
      
      // Repetition Control
      repeat_penalty: 1.1,     // Repetition penalty (0.0-2.0) - higher = less repetition
      presence_penalty: 0.0,   // Presence penalty (-2.0 to 2.0) - penalize new tokens
      frequency_penalty: 0.0,  // Frequency penalty (-2.0 to 2.0) - penalize frequent tokens
      
      // Advanced Sampling
      min_p: 0.0,             // Minimum probability threshold (0.0-1.0)
      tfs_z: 1.0,             // Tail free sampling parameter (0.0-1.0)
      typical_p: 1.0,         // Typical sampling parameter (0.0-1.0)
      
      // Mirostat (Alternative to top_p/top_k)
      mirostat: 0,            // Mirostat mode (0=disabled, 1=mirostat, 2=mirostat2.0)
      mirostat_tau: 5.0,      // Mirostat target entropy/perplexity
      mirostat_eta: 0.1,      // Mirostat learning rate
      
      // Control & Output
      seed: 42,               // Random seed (-1 for random, fixed number for reproducible)
      stop: [],               // Stop sequences (array of strings to stop generation)
      stream: false,          // Whether to stream response (true/false)
      
      // Advanced Context Control
      n_predict: -1,          // Number of tokens to predict (-1 for unlimited)
      n_keep: 0,              // Number of tokens to keep from prompt (context preservation)
      n_probs: 0,             // Return probabilities for top N tokens (0=disabled)
      
      // Special Features
      ignore_eos: false,      // Ignore end of sequence token (continue past EOS)
      logit_bias: {},         // Logit bias adjustments (token_id: bias_value)
      grammar: '',            // Grammar constraints (BNF grammar string)
      json_schema: {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          artikl: { type: "string" },
          opis:   { type: "string" },
          kolicina: { type: "number" },
          cijena_bez_pdv: { type: "number" },
          pdv_posto: { type: "number" },
          ukupno_s_pdv: { type: "number" }
        },
        required: ["artikl","kolicina","cijena_bez_pdv"]
      }
    },
    suma_s_pdv: { type: "number" }
  },
  required: ["items"]
}
       // JSON schema for structured output
    }
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

  /* 
   * CHANGE: 2025-09-01 - Added dynamic context assessment for optimal model selection
   * WHY: Match document complexity with appropriate model context windows
   * IMPACT: Improves analysis quality and prevents context overflow errors
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #context-assessment #dynamic-model-selection #document-analysis
   * PERFORMANCE_NOTE: Calculates optimal model tier based on document characteristics
   */
  const assessDocumentContext = useCallback((extractedData, file) => {
    /* 
     * CHUNK: Document Complexity Assessment
     * PURPOSE: Calculate document size, complexity, and context requirements
     * COMPLEXITY: Medium - multiple metrics and scoring algorithm
     */
    
    // Basic metrics
    const textLength = (extractedData.spatialText || extractedData.rawText || '').length;
    const elementCount = extractedData.elements ? extractedData.elements.length : 0;
    const pageCount = extractedData.pages ? extractedData.pages.length : 1;
    const fileSize = file.size;
    
    // Complexity scoring factors
    let complexityScore = 0;
    
    // Text length factor (primary)
    if (textLength > 500000) complexityScore += 4;
    else if (textLength > 150000) complexityScore += 3;
    else if (textLength > 50000) complexityScore += 2;
    else complexityScore += 1;
    
    // Element count factor (tables, forms complexity)
    if (elementCount > 1000) complexityScore += 2;
    else if (elementCount > 500) complexityScore += 1;
    
    // Page count factor
    if (pageCount > 10) complexityScore += 2;
    else if (pageCount > 5) complexityScore += 1;
    
    // File size factor (PDF processing complexity)
    if (fileSize > 10 * 1024 * 1024) complexityScore += 2; // 10MB+
    else if (fileSize > 5 * 1024 * 1024) complexityScore += 1; // 5MB+
    
    /* 
     * CHUNK: Model Tier Selection Logic
     * PURPOSE: Map complexity score to appropriate model configuration
     * COMPLEXITY: Low - simple threshold mapping
     */
    let recommendedTier;
    if (complexityScore >= 8) {
      recommendedTier = 'EXTRA_LARGE_CONTEXT';
    } else if (complexityScore >= 6) {
      recommendedTier = 'LARGE_CONTEXT';
    } else if (complexityScore >= 4) {
      recommendedTier = 'MEDIUM_CONTEXT';
    } else {
      recommendedTier = 'SMALL_CONTEXT';
    }
    
    const tierConfig = DYNAMIC_MODEL_CONFIG[recommendedTier];
    
    // Estimate token usage (rough approximation: 4 chars per token)
    const estimatedTokens = Math.ceil(textLength / 4);
    const recommendedContextWindow = Math.max(estimatedTokens * 1.5, tierConfig.contextWindow);
    
    console.log('📊 Dynamic Context Assessment:', {
      file: file.name,
      textLength,
      elementCount,
      pageCount,
      fileSize: `${(fileSize / 1024 / 1024).toFixed(1)}MB`,
      complexityScore,
      recommendedTier,
      estimatedTokens,
      recommendedContextWindow,
      tierConfig: tierConfig.name
    });
    
    return {
      tier: recommendedTier,
      config: tierConfig,
      metrics: {
        textLength,
        elementCount,
        pageCount,
        fileSize,
        complexityScore,
        estimatedTokens,
        recommendedContextWindow
      }
    };
  }, []);

  /* 
   * CHANGE: 2025-09-01 - Added document chunking strategy for OOM prevention
   * WHY: Large documents cause LM Studio to run out of memory (OOM errors)
   * IMPACT: Enables processing of large invoices by splitting them into manageable chunks
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #chunking #oom-prevention #memory-management #large-documents
   */
  const chunkDocumentForAnalysis = useCallback((extractedData, contextWindow = 8000) => {
    const spatialText = extractedData.spatialText || extractedData.rawText || '';
    const elements = extractedData.elements || [];
    
    // Estimate token count (rough: 4 chars = 1 token)
    const estimatedTokens = spatialText.length / 4;
    const maxChunkTokens = Math.max(2000, contextWindow * 0.6); // Use 60% of context window for safety
    
    console.log('📄 Document Chunking Assessment:', {
      totalChars: spatialText.length,
      estimatedTokens: Math.ceil(estimatedTokens),
      contextWindow,
      maxChunkTokens,
      needsChunking: estimatedTokens > maxChunkTokens
    });
    
    // If document fits in context, return as-is
    if (estimatedTokens <= maxChunkTokens) {
      return [{
        id: 0,
        spatialText,
        elements,
        metadata: { ...extractedData.metadata, chunkIndex: 0, totalChunks: 1 }
      }];
    }
    
    /* 
     * CHUNK: Intelligent Document Splitting
     * PURPOSE: Split large documents while preserving table structure
     * COMPLEXITY: High - preserve semantic boundaries and table integrity
     */
    
    // Strategy 1: Split by pages if available
    if (extractedData.pages && extractedData.pages.length > 1) {
      const chunks = [];
      let currentChunk = { spatialText: '', elements: [], pageNumbers: [] };
      let currentTokens = 0;
      
      for (const page of extractedData.pages) {
        const pageTokens = (page.text || '').length / 4;
        
        if (currentTokens + pageTokens > maxChunkTokens && currentChunk.spatialText) {
          // Save current chunk and start new one
          chunks.push({
            id: chunks.length,
            spatialText: currentChunk.spatialText,
            elements: currentChunk.elements,
            metadata: { 
              ...extractedData.metadata, 
              chunkIndex: chunks.length, 
              totalChunks: 'calculating',
              pages: currentChunk.pageNumbers 
            }
          });
          currentChunk = { spatialText: '', elements: [], pageNumbers: [] };
          currentTokens = 0;
        }
        
        currentChunk.spatialText += (currentChunk.spatialText ? '\n\n--- PAGE ' + page.pageNumber + ' ---\n' : '') + page.text;
        currentChunk.elements.push(...(page.elements || []));
        currentChunk.pageNumbers.push(page.pageNumber);
        currentTokens += pageTokens;
      }
      
      // Add final chunk
      if (currentChunk.spatialText) {
        chunks.push({
          id: chunks.length,
          spatialText: currentChunk.spatialText,
          elements: currentChunk.elements,
          metadata: { 
            ...extractedData.metadata, 
            chunkIndex: chunks.length, 
            totalChunks: chunks.length + 1,
            pages: currentChunk.pageNumbers 
          }
        });
      }
      
      // Update total chunks count
      chunks.forEach(chunk => chunk.metadata.totalChunks = chunks.length);
      return chunks;
    }
    
    // Strategy 2: Split by character limit with smart boundaries
    const maxChunkChars = maxChunkTokens * 4;
    const chunks = [];
    let currentPos = 0;
    
    while (currentPos < spatialText.length) {
      const endPos = Math.min(currentPos + maxChunkChars, spatialText.length);
      
      // Find a good break point (prefer line breaks, avoid breaking mid-word)
      let actualEndPos = endPos;
      if (endPos < spatialText.length) {
        // Look for line break within last 200 chars
        const searchStart = Math.max(endPos - 200, currentPos);
        const lastLineBreak = spatialText.lastIndexOf('\n', endPos);
        if (lastLineBreak > searchStart) {
          actualEndPos = lastLineBreak + 1;
        } else {
          // Fall back to word boundary
          const lastSpace = spatialText.lastIndexOf(' ', endPos);
          if (lastSpace > searchStart) {
            actualEndPos = lastSpace + 1;
          }
        }
      }
      
      const chunkText = spatialText.slice(currentPos, actualEndPos);
      const chunkElements = elements.filter(el => {
        // Include elements that fall within this text chunk
        // This is approximate - better would be to track character positions
        return true; // For now, include all elements in each chunk
      });
      
      chunks.push({
        id: chunks.length,
        spatialText: chunkText,
        elements: chunkElements,
        metadata: { 
          ...extractedData.metadata, 
          chunkIndex: chunks.length,
          totalChunks: 'calculating',
          charRange: { start: currentPos, end: actualEndPos }
        }
      });
      
      currentPos = actualEndPos;
    }
    
    // Update total chunks count
    chunks.forEach(chunk => chunk.metadata.totalChunks = chunks.length);
    
    console.log(`📄 Document split into ${chunks.length} chunks for OOM prevention`);
    return chunks;
  }, []);

  /* 
   * CHANGE: 2025-09-01 - Added automatic model switching in LM Studio
   * WHY: Optimize model selection based on document context requirements
   * IMPACT: Prevents context overflow and improves analysis accuracy
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #lm-studio-api #model-switching #automatic-optimization
   * PERFORMANCE_NOTE: Manages model loading automatically based on document needs
   */
  const switchLMStudioModel = useCallback(async (contextAssessment) => {
    try {
      updateProgress(`Prepravlja model za ${contextAssessment.config.name.toLowerCase()}...`, 45);
      
      const { config, tier } = contextAssessment;
      
      // Get list of available models from LM Studio
      const modelsResponse = await fetch(`${LM_STUDIO_CONFIG.endpoint.replace('/v1/chat/completions', '/v1/models')}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!modelsResponse.ok) {
        console.warn('Could not fetch available models from LM Studio');
        return { success: false, message: 'LM Studio models API unavailable' };
      }
      
      const modelsData = await modelsResponse.json();
      const availableModels = modelsData.data || [];
      const availableModelIds = availableModels.map(model => model.id);
      
      console.log('🤖 Available LM Studio Models:', availableModelIds);
      
      /* 
       * CHUNK: Model Selection Algorithm
       * PURPOSE: Find best available model that matches context requirements
       * COMPLEXITY: Medium - priority-based selection with fallbacks
       */
      let selectedModel = null;
      
      // Try to find recommended models in order of preference
      for (const recommendedModel of config.recommendedModels) {
        if (availableModelIds.includes(recommendedModel)) {
          selectedModel = recommendedModel;
          break;
        }
      }
      
      // Fallback: find any model with sufficient context window
      if (!selectedModel) {
        for (const model of availableModels) {
          // Check if model has sufficient context (heuristic: look for context info in model name/description)
          const modelInfo = model.id.toLowerCase();
          if (tier === 'SMALL_CONTEXT' && (modelInfo.includes('4k') || modelInfo.includes('8k'))) {
            selectedModel = model.id;
            break;
          } else if (tier === 'MEDIUM_CONTEXT' && (modelInfo.includes('16k') || modelInfo.includes('32k'))) {
            selectedModel = model.id;
            break;
          } else if (tier === 'LARGE_CONTEXT' && (modelInfo.includes('64k') || modelInfo.includes('128k'))) {
            selectedModel = model.id;
            break;
          } else if (tier === 'EXTRA_LARGE_CONTEXT' && (modelInfo.includes('200k') || modelInfo.includes('1m'))) {
            selectedModel = model.id;
            break;
          }
        }
      }
      
      // Ultimate fallback: use the first available model
      if (!selectedModel && availableModels.length > 0) {
        selectedModel = availableModels[0].id;
      }
      
      if (!selectedModel) {
        return { 
          success: false, 
          message: 'Nema dostupnih modela u LM Studio',
          recommendation: 'Učitaj model u LM Studio aplikaciju'
        };
      }
      
      /* 
       * CHUNK: Model Loading Request
       * PURPOSE: Request LM Studio to load the selected model
       * COMPLEXITY: Low - simple API call with error handling
       * NOTE: LM Studio API doesn't have standard model loading endpoint, 
       *       so we'll just set the model for next request and provide user feedback
       */
      
      console.log(`🎯 Selected model: ${selectedModel} for ${tier} (${config.name})`);
      
      updateProgress(`Model odabran: ${selectedModel.split('/').pop()}`, 50);
      
      return {
        success: true,
        selectedModel,
        tier,
        config,
        message: `Optimalni model odabran: ${selectedModel}`,
        contextWindow: config.contextWindow,
        estimatedTokens: contextAssessment.metrics.estimatedTokens
      };
      
    } catch (error) {
      console.error('Model switching failed:', error);
      return { 
        success: false, 
        message: `Greška pri prebacivanju modela: ${error.message}`,
        fallbackModel: 'local-model' // Default LM Studio model identifier
      };
    }
  }, [updateProgress]);

  /* 
   * CHUNK: Individual Chunk Processing for OOM Prevention
   * PURPOSE: Process single document chunk with conservative memory limits
   * DEPENDENCIES: LM Studio API, settings, spatial text processing
   * OUTPUTS: Analysis result for single chunk with confidence scoring
   * COMPLEXITY: Medium - chunk-specific analysis with OOM detection
   */
  const processSpatialChunk = useCallback(async (chunk, chunkIndex, totalChunks) => {
    const spatialText = chunk.spatialText;
    const chunkInfo = `Dio ${chunkIndex}/${totalChunks}`;
    
    try {
      console.log(`🧩 Processing chunk ${chunkIndex}/${totalChunks}, tokens: ~${Math.round(spatialText.length / 4)}`);
      
      // Check if model is selected
      if (!settings.selectedModel) {
        console.error('⚠️ No model selected by user for chunk processing');
        return {
          items: [],
          confidence: 0.1,
          source: 'no-model-selected',
          chunkIndex: chunkIndex,
          error: 'Korisnik mora odabrati model u postavkama'
        };
      }
      
      console.log(`🤖 Using model: ${settings.selectedModel}`);
      
      const requestBody = {
        model: settings.selectedModel,
        messages: [
          {
            role: "system",
            content: `PROSTORNA ANALIZA DOKUMENATA - KAKO KORISTITI KOORDINATE

Analiziraj hrvatski poslovni dokument koristeći prostorne koordinate elemenata. ${chunkInfo}.

ŠTO SU PROSTORNI PODACI:
- Tekst je organiziran po pozicijama (x,y) na stranici
- Blizu elemente su povezani (opis + cijena, naziv + OIB)
- Tablice imaju jasnu strukturu redaka/kolona s koordinatama
- PDF elementi su sortirani po poziciji čitanja (lijevo-desno, gore-dolje)

KAKO ISKORISTITI KOORDINATE:
1. TRAŽI PAROVE - ako je "Ukupno:" na x:100,y:200, cijena će biti blizu na x:300,y:200
2. TABLICE - redci s istom y-koordinatom, kolone s istom x-koordinatom  
3. SEKCIJE - grupni slični y-koordinati (header, stavke, totali)
4. HIJERARHIJA - manji font/indent = detalji, veći = naslovi

VRATI JSON: {"documentType":"invoice|quote|delivery", "documentNumber":"", "date":"YYYY-MM-DD", "supplier":{"name":"", "oib":"", "address":"", "iban":""}, "buyer":{"name":"", "oib":"", "address":""}, "items":[{"position":1, "description":"", "quantity":1.0, "unit":"kom", "unitPrice":0.0, "totalPrice":0.0}], "totals":{"subtotal":0.0, "vatAmount":0.0, "totalAmount":0.0}}`
          },
          {
            role: "user", 
            content: `PROSTORNI PODACI DOKUMENTA ${chunkInfo}:

${spatialText}

ANALIZIRAJ koristeći prostorne koordinate za točnu ekstrakciju svih podataka. Vrati SAMO JSON objekt.`
          }
        ],
        // Use all custom model parameters from UI settings
        temperature: settings.modelParams.temperature,
        max_tokens: settings.modelParams.max_tokens,
        top_p: settings.modelParams.top_p,
        top_k: settings.modelParams.top_k,
        repeat_penalty: settings.modelParams.repeat_penalty,
        presence_penalty: settings.modelParams.presence_penalty,
        frequency_penalty: settings.modelParams.frequency_penalty,
        min_p: settings.modelParams.min_p,
        tfs_z: settings.modelParams.tfs_z,
        typical_p: settings.modelParams.typical_p,
        mirostat: settings.modelParams.mirostat,
        mirostat_tau: settings.modelParams.mirostat_tau,
        mirostat_eta: settings.modelParams.mirostat_eta,
        seed: settings.modelParams.seed,
        stop: settings.modelParams.stop,
        stream: settings.modelParams.stream,
        n_predict: settings.modelParams.n_predict,
        n_keep: settings.modelParams.n_keep,
        n_probs: settings.modelParams.n_probs,
        ignore_eos: settings.modelParams.ignore_eos,
        logit_bias: settings.modelParams.logit_bias,
        grammar: settings.modelParams.grammar,
        json_schema: settings.modelParams.json_schema
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(settings.lmStudioEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        
        // Detect OOM patterns in error response
        if (errorText.includes('out of memory') || errorText.includes('OOM') || errorText.includes('memory') || response.status === 500) {
          console.warn(`🚨 OOM detected in chunk ${chunkIndex}, falling back to regex`);
          return {
            items: [],
            confidence: 0.2,
            source: 'regex-fallback',
            chunkIndex: chunkIndex,
            oomDetected: true
          };
        }
        
        throw new Error(`LM Studio error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Debug: Log the full response to understand the structure
      console.log('🔍 LM Studio API Response:', JSON.stringify(data, null, 2));
      
      // Check if response has expected structure
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('❌ Unexpected API response structure:', data);
        
        // Check if it's an error response with a specific message
        if (data.error) {
          console.error('🚨 LM Studio API Error:', data.error);
          
          // If it's a memory/OOM related error, fall back gracefully
          if (data.error.message && (data.error.message.includes('memory') || data.error.message.includes('OOM'))) {
            console.warn(`🚨 OOM detected via error message in chunk ${chunkIndex}, falling back to regex`);
            return {
              items: [],
              confidence: 0.2,
              source: 'regex-fallback',
              chunkIndex: chunkIndex,
              oomDetected: true,
              errorMessage: data.error.message
            };
          }
        }
        
        // Generic fallback for other structural issues
        console.warn(`⚠️ Falling back to regex for chunk ${chunkIndex} due to API structure issue`);
        return {
          items: [],
          confidence: 0.1,
          source: 'regex-fallback',
          chunkIndex: chunkIndex,
          structureError: true,
          responseData: data
        };
      }
      
      let content = data.choices[0]?.message?.content || '';

      // Parse JSON response with robust extraction
      console.log(`🔍 Chunk ${chunkIndex} raw content length:`, content.length);
      
      let jsonString = '';
      let parsed = null;
      
      // Strategy 1: Try extracting JSON from code blocks
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim();
        console.log(`📋 Strategy 1 - Code block JSON for chunk ${chunkIndex}:`, jsonString.substring(0, 200) + '...');
      } else {
        // Strategy 2: Find the first complete JSON object
        const jsonMatch = content.match(/\{[\s\S]*?\}(?=\s*$|\s*\n\s*[^}])/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log(`📋 Strategy 2 - Pattern match JSON for chunk ${chunkIndex}:`, jsonString.substring(0, 200) + '...');
        }
      }
      
      // Strategy 3: If no clear match, try to find JSON boundaries manually
      if (!jsonString) {
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = content.substring(firstBrace, lastBrace + 1);
          console.log(`📋 Strategy 3 - Manual extraction for chunk ${chunkIndex}:`, jsonString.substring(0, 200) + '...');
        }
      }
      
      // Try to parse the extracted JSON
      if (jsonString) {
        try {
          // Clean up common JSON issues before parsing
          const cleanedJSON = jsonString
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Quote unquoted keys
            .replace(/:\s*'([^']*)'/g, ': "$1"') // Replace single quotes with double quotes
            .trim();
          
          parsed = JSON.parse(cleanedJSON);
          
          console.log(`✅ Successfully parsed JSON for chunk ${chunkIndex}`);
          return {
            ...parsed,
            confidence: 0.85,
            source: 'llm-chunk',
            chunkIndex: chunkIndex,
            totalChunks: totalChunks
          };
        } catch (parseError) {
          console.warn(`❌ JSON parse failed for chunk ${chunkIndex}:`, parseError);
          console.warn(`🔍 Problematic JSON string (first 500 chars):`, jsonString.substring(0, 500));
          
          // Try to extract data using regex as fallback
          console.log(`🔄 Attempting regex fallback for chunk ${chunkIndex}`);
          try {
            const spatialText = chunk.spatialText || content;
            const regexExtraction = analyzeWithRegex(spatialText);
            if (regexExtraction && (regexExtraction.items?.length > 0 || regexExtraction.totals?.totalAmount)) {
              console.log(`✅ Regex fallback successful for chunk ${chunkIndex}`);
              return {
                ...regexExtraction,
                confidence: 0.4,
                source: 'regex-fallback',
                chunkIndex: chunkIndex,
                totalChunks: totalChunks,
                originalError: parseError.message
              };
            }
          } catch (regexError) {
            console.warn(`❌ Regex fallback also failed for chunk ${chunkIndex}:`, regexError);
          }
        }
      }

      console.warn(`⚠️ All parsing strategies failed for chunk ${chunkIndex}, returning empty result`);
      return {
        items: [],
        confidence: 0.1,
        source: 'parse-failed',
        chunkIndex: chunkIndex,
        error: 'JSON parse failed, no regex fallback data found',
        rawContent: content.substring(0, 1000) // First 1000 chars for debugging
      };

    } catch (error) {
      console.error(`Chunk ${chunkIndex} processing error:`, error);
      
      // Check for OOM-related errors
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('out of memory') || errorMessage.includes('oom') || errorMessage.includes('memory')) {
        console.warn(`🚨 OOM error detected in chunk ${chunkIndex}`);
        return {
          items: [],
          confidence: 0.2,
          source: 'oom-fallback',
          chunkIndex: chunkIndex,
          oomDetected: true
        };
      }
      
      return {
        items: [],
        confidence: 0.1,
        source: 'error',
        chunkIndex: chunkIndex,
        error: error.message
      };
    }
  }, [settings, updateProgress, analyzeWithRegex]);

  /* 
   * CHUNK: Chunk Results Merger
   * PURPOSE: Combine results from multiple document chunks into unified result
   * DEPENDENCIES: Chunk processing results
   * OUTPUTS: Merged analysis result with aggregated confidence
   * COMPLEXITY: Medium - result consolidation and deduplication logic
   */
  const mergeChunkResults = useCallback((chunkResults, originalData) => {
    console.log('🔄 Merging results from', chunkResults.length, 'chunks');
    
    let allItems = [];
    let totalConfidence = 0;
    let oomDetected = false;
    let invoiceNumber = '';
    let date = '';
    let vendor = '';
    let totalAmount = 0;
    
    // Aggregate data from all chunks
    chunkResults.forEach((result, index) => {
      if (result.oomDetected) {
        oomDetected = true;
      }
      
      if (result.items && Array.isArray(result.items)) {
        allItems = [...allItems, ...result.items];
      }
      
      // Take metadata from the chunk with highest confidence
      if (result.confidence > totalConfidence) {
        invoiceNumber = result.invoiceNumber || invoiceNumber;
        date = result.date || date;
        vendor = result.vendor || vendor;
        totalAmount = result.totalAmount || totalAmount;
      }
      
      totalConfidence += result.confidence || 0;
    });
    
    // Calculate average confidence
    const avgConfidence = chunkResults.length > 0 ? totalConfidence / chunkResults.length : 0;
    
    // Deduplicate items based on description similarity
    const deduplicatedItems = [];
    allItems.forEach(item => {
      const existing = deduplicatedItems.find(existing => 
        existing.description && item.description && 
        existing.description.toLowerCase().includes(item.description.toLowerCase().substring(0, 20))
      );
      
      if (!existing) {
        deduplicatedItems.push(item);
      }
    });
    
    console.log(`📊 Merged ${allItems.length} items into ${deduplicatedItems.length} unique items`);
    
    const result = {
      invoiceNumber,
      date,
      vendor,
      items: deduplicatedItems,
      totalAmount,
      confidence: avgConfidence,
      source: oomDetected ? 'chunked-with-oom' : 'chunked-llm',
      chunksProcessed: chunkResults.length,
      oomDetected
    };
    
    if (oomDetected) {
      console.warn('🚨 OOM was detected during chunk processing - results may be incomplete');
    }
    
    return result;
  }, []);

  // Analyze with LLM using spatial coordinate data (Enhanced with chunking)
  const analyzeWithSpatial = useCallback(async (extractedData) => {
    updateProgress('LLM analiza (Koordinate + AI)...', 60);

    /* 
     * CHUNK: OOM Prevention with Document Chunking
     * PURPOSE: Split large documents to prevent LM Studio out-of-memory errors
     * COMPLEXITY: Medium - chunking logic with result merging
     */
    const contextWindow = settings._dynamicContextWindow || MEMORY_PROFILES[settings.memoryProfile].maxTokens;
    const documentChunks = chunkDocumentForAnalysis(extractedData, contextWindow);
    
    if (documentChunks.length > 1) {
      updateProgress(`Dokument je prevelik - dijeli se na ${documentChunks.length} dijelova...`, 65);
      console.log(`📄 Processing ${documentChunks.length} chunks to prevent OOM`);
      
      // Process each chunk separately and merge results
      const chunkResults = [];
      
      for (let i = 0; i < documentChunks.length; i++) {
        const chunk = documentChunks[i];
        updateProgress(`Obrađuje dio ${i + 1}/${documentChunks.length}...`, 65 + (i * 25 / documentChunks.length));
        
        try {
          const chunkResult = await processSpatialChunk(chunk, i + 1, documentChunks.length);
          chunkResults.push(chunkResult);
        } catch (chunkError) {
          console.error(`Error processing chunk ${i + 1}:`, chunkError);
          chunkResults.push({
            error: chunkError.message,
            chunkIndex: i,
            items: [],
            confidence: 0.1
          });
        }
      }
      
      // Merge results from all chunks
      return mergeChunkResults(chunkResults, extractedData);
    } else {
      // Single chunk - process normally
      return processSpatialChunk(documentChunks[0], 1, 1);
    }
  }, [updateProgress, settings, chunkDocumentForAnalysis, processSpatialChunk, mergeChunkResults]);

  // NEW: Analyze with VLM (Vision Language Model) using images
  const analyzeWithVLM = useCallback(async (extractedData) => {
    updateProgress('VLM analiza (Vizualno + AI)...', 60);

    // Check if model is selected
    if (!settings.selectedModel) {
      console.error('⚠️ No model selected by user for VLM analysis');
      updateProgress('Greška: Odaberite model u postavkama', 100);
      throw new Error('Korisnik mora odabrati model u postavkama za vizualnu analizu');
    }

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

    // Add images to the request - convert Blobs to Base64 for LM Studio API
    for (const imageData of extractedData.images) {
        try {
            const base64DataUrl = await blobToBase64(imageData.blob);
            userContent.push({
                type: "image_url",
                image_url: {
                    // The data URL must be in the format: data:image/jpeg;base64,{base64_string}
                    url: base64DataUrl,
                    detail: "high" // Use high detail for accurate OCR by the VLM
                }
            });
        } catch (blobError) {
            console.error('Failed to convert blob to base64:', blobError);
            // Skip this image if conversion fails
            continue;
        }
    }

    try {
      console.log('🚀 Sending VLM request...');
      console.log('🤖 Model:', settings.selectedModel);
      
      const response = await fetch(LM_STUDIO_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Use only user-selected model from dropdown (no automatic fallback)
          model: settings.selectedModel,
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
          // Use all custom model parameters from UI settings (Vision mode)
          temperature: settings.modelParams.temperature,
          max_tokens: settings.modelParams.max_tokens,
          top_p: settings.modelParams.top_p,
          top_k: settings.modelParams.top_k,
          repeat_penalty: settings.modelParams.repeat_penalty,
          presence_penalty: settings.modelParams.presence_penalty,
          frequency_penalty: settings.modelParams.frequency_penalty,
          min_p: settings.modelParams.min_p,
          tfs_z: settings.modelParams.tfs_z,
          typical_p: settings.modelParams.typical_p,
          mirostat: settings.modelParams.mirostat,
          mirostat_tau: settings.modelParams.mirostat_tau,
          mirostat_eta: settings.modelParams.mirostat_eta,
          seed: settings.modelParams.seed,
          stop: settings.modelParams.stop,
          stream: settings.modelParams.stream,
          n_predict: settings.modelParams.n_predict,
          n_keep: settings.modelParams.n_keep,
          n_probs: settings.modelParams.n_probs,
          ignore_eos: settings.modelParams.ignore_eos,
          logit_bias: settings.modelParams.logit_bias,
          grammar: settings.modelParams.grammar,
          json_schema: settings.modelParams.json_schema
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ VLM Error Response:', response.status, errorText);
        throw new Error(`VLM request failed with status ${response.status}. Ensure a VLM model (like LLaVA or Qwen-VL) is loaded in LM Studio.`);
      }

      const result = await response.json();
      
      // Debug: Log VLM response structure
      console.log('🔍 VLM API Response structure check:', {
        hasChoices: !!result.choices,
        choicesLength: result.choices?.length,
        hasError: !!result.error
      });
      
      // Check for error response
      if (result.error) {
        console.error('🚨 VLM API Error:', result.error);
        throw new Error(`VLM API Error: ${result.error.message || 'Unknown error'}`);
      }
      
      const content = result?.choices?.[0]?.message?.content || '';

      // Robust JSON extraction from VLM response
      const extractedJSON = extractJSONFromVLMResponse(content);
      if (extractedJSON) {
        return normalizeAnalysisData(extractedJSON, 'VLM (Vizualno)', 0.97);
      } else {
        console.error('🚨 VLM JSON extraction failed completely');
        console.log('📄 Raw VLM response (first 1000 chars):', content.substring(0, 1000) + '...');
        throw new Error('No valid JSON found in VLM response. Check console for raw output.');
      }

    } catch (err) {
      console.error('VLM analysis failed:', err);
      updateProgress('VLM neuspješan. Pokrećem Regex analizu...', 75);
      // Fallback
      const fallbackText = extractedData.spatialText || extractedData.rawText;
      return analyzeWithRegex(fallbackText);
    }
  }, [updateProgress, analyzeWithRegex, normalizeAnalysisData]);

  /*
   * CHUNK: OpenWebUI Schema Validation and Fixing
   * PURPOSE: Ensure OpenWebUI responses match exact app UI schema requirements
   * DEPENDENCIES: None - pure validation logic
   * OUTPUTS: Schema validation results and corrected data structures
   * COMPLEXITY: Medium - comprehensive field validation and data type fixing
   */
  const validateOpenWebUISchema = useCallback((data) => {
    const errors = [];
    
    // Check required top-level fields
    if (!data.documentType) errors.push('Missing documentType');
    if (!data.supplier || typeof data.supplier !== 'object') errors.push('Missing or invalid supplier object');
    if (!data.buyer || typeof data.buyer !== 'object') errors.push('Missing or invalid buyer object');  
    if (!data.items || !Array.isArray(data.items)) errors.push('Missing or invalid items array');
    if (!data.totals || typeof data.totals !== 'object') errors.push('Missing or invalid totals object');
    
    // Check numeric fields in totals
    if (data.totals) {
      ['subtotal', 'vatAmount', 'totalAmount'].forEach(field => {
        if (data.totals[field] !== null && typeof data.totals[field] !== 'number') {
          errors.push(`totals.${field} must be number or null, got ${typeof data.totals[field]}`);
        }
      });
    }
    
    // Check items structure
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item, index) => {
        ['quantity', 'unitPrice', 'discountPercent', 'totalPrice'].forEach(field => {
          if (item[field] !== null && typeof item[field] !== 'number') {
            errors.push(`items[${index}].${field} must be number, got ${typeof item[field]}`);
          }
        });
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }, []);

  const fixSchemaIssues = useCallback((data) => {
    const fixed = { ...data };
    
    // Ensure required objects exist
    if (!fixed.supplier || typeof fixed.supplier !== 'object') {
      fixed.supplier = { name: '', address: '', oib: '', iban: '' };
    }
    
    if (!fixed.buyer || typeof fixed.buyer !== 'object') {
      fixed.buyer = { name: '', address: '', oib: '' };
    }
    
    if (!fixed.totals || typeof fixed.totals !== 'object') {
      fixed.totals = { subtotal: 0, vatAmount: 0, totalAmount: 0 };
    }
    
    if (!fixed.items || !Array.isArray(fixed.items)) {
      fixed.items = [];
    }
    
    // Fix numeric fields in totals
    ['subtotal', 'vatAmount', 'totalAmount'].forEach(field => {
      if (fixed.totals[field] && typeof fixed.totals[field] === 'string') {
        // Convert Croatian decimal format to number
        const numStr = fixed.totals[field].replace(/\./g, '').replace(',', '.');
        fixed.totals[field] = parseFloat(numStr) || 0;
      } else if (fixed.totals[field] === null || fixed.totals[field] === undefined) {
        fixed.totals[field] = 0;
      }
    });
    
    // Fix numeric fields in items
    fixed.items.forEach((item, index) => {
      ['quantity', 'unitPrice', 'discountPercent', 'totalPrice'].forEach(field => {
        if (item[field] && typeof item[field] === 'string') {
          // Convert Croatian decimal format to number
          const numStr = item[field].replace(/\./g, '').replace(',', '.');
          item[field] = parseFloat(numStr) || 0;
        } else if (item[field] === null || item[field] === undefined) {
          item[field] = 0;
        }
      });
      
      // Ensure required string fields
      if (!item.description) item.description = '';
      if (!item.unit) item.unit = 'kom';
      if (typeof item.position !== 'number') item.position = index + 1;
    });
    
    // Set default values for missing fields
    if (!fixed.documentType) fixed.documentType = 'other';
    if (!fixed.documentNumber) fixed.documentNumber = 'OpenWebUI-' + Date.now().toString().slice(-6);
    if (!fixed.date) fixed.date = new Date().toISOString().split('T')[0];
    if (!fixed.currency) fixed.currency = 'EUR';
    
    console.log('🔧 Schema issues fixed:', fixed);
    return fixed;
  }, []);

  const attemptPartialExtraction = useCallback((rawResponse) => {
    // Try to extract key information even if JSON is malformed
    try {
      const lines = rawResponse.split('\n');
      const partialData = {
        documentType: 'other',
        documentNumber: '',
        date: new Date().toISOString().split('T')[0],
        supplier: { name: '', address: '', oib: '', iban: '' },
        buyer: { name: '', address: '', oib: '' },
        items: [],
        totals: { subtotal: 0, vatAmount: 0, totalAmount: 0 }
      };
      
      // Look for patterns in the response
      lines.forEach(line => {
        const lowerLine = line.toLowerCase();
        
        // Extract document number
        if (lowerLine.includes('documentnumber') || lowerLine.includes('broj')) {
          const match = line.match(/[:\"]([A-Z0-9\-\/]+)/);
          if (match) partialData.documentNumber = match[1];
        }
        
        // Extract supplier name
        if (lowerLine.includes('supplier') || lowerLine.includes('dobavljač')) {
          const match = line.match(/[:\"]([^\"]*)/);
          if (match && match[1].length > 2) partialData.supplier.name = match[1];
        }
        
        // Extract total amount
        if (lowerLine.includes('totalamount') || lowerLine.includes('ukupno')) {
          const match = line.match(/(\d+[,.]?\d*)/);
          if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            partialData.totals.totalAmount = amount;
            partialData.totals.subtotal = amount;
          }
        }
      });
      
      console.log('📋 Partial extraction result:', partialData);
      return partialData;
      
    } catch (error) {
      console.error('Partial extraction failed:', error);
      return null;
    }
  }, []);

  // NEW: Analyze with OpenWebUI integration
  const analyzeWithOpenWebUI = useCallback(async (extractedData) => {
    updateProgress('OpenWebUI analiza (Upload + AI)...', 60);

    try {
      // Configure OpenWebUI service
      aiIntegrationService.setOpenWebUIConfig(settings.openWebUIApiKey, settings.openWebUIUrl);

      // Create a temporary file from the extracted data
      const documentContent = `
INVOICE ANALYSIS REQUEST

Document Metadata:
- Filename: ${extractedData.metadata?.fileName || 'Unknown'}
- Pages: ${extractedData.metadata?.numPages || 1}

Extracted Text Content:
${extractedData.spatialText || extractedData.rawText || 'No text extracted'}

Spatial Elements (if available):
${JSON.stringify(extractedData.elements, null, 2)}

ANALYSIS INSTRUCTIONS:
Please analyze this Croatian business document (invoice, quote, delivery note, etc.) and return ONLY a JSON object with the following structure:

{
  "documentType": "string (quote|invoice|delivery|receipt|transfer|other)",
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

IMPORTANT:
- Convert Croatian numbers (1.234,56) to JSON numbers (1234.56)
- Convert Croatian dates (15.01.2024) to ISO format (2024-01-15)
- Return ONLY the JSON object, no additional text or markdown formatting
      `.trim();

      // Create a temporary file object
      const tempFile = new File([documentContent], `invoice-analysis-${Date.now()}.txt`, {
        type: 'text/plain'
      });

      // Upload and process with OpenWebUI
      const result = await aiIntegrationService.uploadToOpenWebUI(tempFile, (progressData) => {
        if (progressData.status === 'uploading') {
          updateProgress(`OpenWebUI upload: ${progressData.progress || 0}%...`, 65);
        } else if (progressData.status === 'completed') {
          updateProgress('OpenWebUI file uploaded successfully...', 80);
        }
      });

      if (result.success) {
        updateProgress('Document uploaded, starting AI analysis...', 75);
        
        // Now analyze the uploaded file with OpenWebUI  
        const analysisPrompt = `INSTRUKCIJE: Analiziraj ovaj hrvatski poslovni dokument i vrati TOČNO ovaj JSON format bez ikakvih dodatnih komentara ili markdown formatiranja.

### TRAŽENI JSON FORMAT (KOPIRATI TOČNO OVAKVU STRUKTURU):
{
  "documentType": "invoice",
  "documentNumber": "",
  "date": "2024-01-01", 
  "dueDate": null,
  "currency": "EUR",
  "supplier": {
    "name": "",
    "address": "",
    "oib": "",
    "iban": ""
  },
  "buyer": {
    "name": "",
    "address": "",
    "oib": ""
  },
  "items": [
    {
      "position": 1,
      "code": "",
      "description": "",
      "quantity": 1.0,
      "unit": "kom",
      "unitPrice": 0.0,
      "discountPercent": 0.0,
      "totalPrice": 0.0
    }
  ],
  "totals": {
    "subtotal": 0.0,
    "vatAmount": 0.0,
    "totalAmount": 0.0
  }
}

### PRAVILA ZA TIPOVE DOKUMENATA:
- Račun/Invoice → "invoice" 
- Ponuda/Quote → "quote"
- Otpremnica/Delivery → "delivery" 
- Potvrda/Receipt → "receipt"
- Ostalo → "other"

### PRAVILA ZA BROJEVE I DATUME:
- Hrvatska števila (1.234,56) → 1234.56 (JSON broj)
- Hrvatski datumi (15.01.2024) → "2024-01-15" (ISO format)
- Svi "Price" i "Amount" polja MORAJU biti brojevi, ne stringovi
- Svi "quantity" polja MORAJU biti brojevi, ne stringovi

### PRAVILA ZA PODATKE:
- Ako nema PDV-a, vatAmount: 0.0
- Ako nema popusta, discountPercent: 0.0  
- Ako nema datuma dospijeća, dueDate: null (ne string)
- Prazan OIB/IBAN ostavi prazan string ""

VRATI SAMO JSON OBJEKT - NIŠTA DRUGO!`;

        const analysisResult = await aiIntegrationService.analyzeUploadedFile(
          result.fileId, 
          analysisPrompt,
          settings.selectedModel, // Pass user-selected model
          (progressData) => {
            if (progressData.status === 'analyzing') {
              updateProgress('OpenWebUI analyzing document...', 85);
            } else if (progressData.status === 'completed') {
              updateProgress('Analysis completed!', 95);
            }
          }
        );

        if (analysisResult.success) {
          // Parse the JSON response from OpenWebUI with enhanced validation
          let parsedData;
          try {
            const content = analysisResult.analysisResult;
            console.log('🔍 OpenWebUI raw response:', content);
            
            // Multiple JSON extraction strategies
            let jsonString = null;
            
            // Strategy 1: Look for JSON in code blocks
            const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/i) || 
                                  content.match(/```\s*([\s\S]*?)\s*```/);
            if (codeBlockMatch) {
              jsonString = codeBlockMatch[1];
            } 
            
            // Strategy 2: Extract complete JSON object
            if (!jsonString) {
              const objectMatch = content.match(/\{[\s\S]*\}/);
              if (objectMatch) {
                jsonString = objectMatch[0];
              }
            }
            
            // Strategy 3: Clean and try entire content if it looks like JSON
            if (!jsonString && content.trim().startsWith('{')) {
              jsonString = content.trim();
            }
            
            if (!jsonString) {
              throw new Error('No JSON structure found in OpenWebUI response');
            }
            
            console.log('🔧 Extracting JSON string:', jsonString.substring(0, 200) + '...');
            
            // Parse the JSON
            parsedData = JSON.parse(jsonString);
            console.log('✅ Successfully parsed OpenWebUI JSON:', parsedData);
            
            // Validate required fields for UI compatibility
            const validation = validateOpenWebUISchema(parsedData);
            if (!validation.isValid) {
              console.warn('⚠️ Schema validation issues:', validation.errors);
              // Fix common schema issues
              parsedData = fixSchemaIssues(parsedData);
            }
            
            // Normalize and return the parsed data
            return normalizeAnalysisData(parsedData, 'OpenWebUI Analysis', 0.92);
            
          } catch (parseError) {
            console.error('❌ Failed to parse OpenWebUI JSON response:', parseError);
            console.log('📝 Raw response (first 500 chars):', analysisResult.analysisResult.substring(0, 500));
            
            // Enhanced fallback with partial data extraction
            const partialData = attemptPartialExtraction(analysisResult.analysisResult);
            if (partialData && Object.keys(partialData).length > 2) {
              console.log('🔄 Using partial data extraction:', partialData);
              return normalizeAnalysisData(partialData, 'OpenWebUI Partial', 0.75);
            }
            
            // Ultimate fallback to regex analysis
            updateProgress('OpenWebUI parsing completely failed, falling back to regex...', 95);
            return analyzeWithRegex(extractedData.spatialText || extractedData.rawText);
          }
        } else {
          throw new Error('OpenWebUI analysis failed');
        }
      } else {
        throw new Error('OpenWebUI upload failed');
      }

    } catch (err) {
      console.error('OpenWebUI analysis failed:', err);
      updateProgress('OpenWebUI neuspješan. Pokrećem Regex analizu...', 75);
      
      // Fallback to regex analysis
      const fallbackText = extractedData.spatialText || extractedData.rawText;
      return analyzeWithRegex(fallbackText);
    }
  }, [updateProgress, analyzeWithRegex, normalizeAnalysisData, settings]);

  // NEW: Direct LM Studio file processing (bypass OCR/scanning)
  const analyzeDirectlyWithLMStudio = useCallback(async (file) => {
    updateProgress('LM Studio direktna analiza (bez OCR)...', 60);

    try {
      // Use aiIntegrationService to process file directly with LM Studio
      aiIntegrationService.setLMStudioConfig('http://10.39.35.136:1234');

      const analysisPrompt = `
Analiziraj ovaj hrvatski poslovni dokument (račun, ponuda, otpremnica) i vrati SAMO JSON objekt:

{
  "documentType": "string (quote|invoice|delivery|receipt|transfer|other)",
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

VAŽNO:
- Hrvatski brojevi (1.234,56) → JSON brojevi (1234.56)
- Hrvatski datumi (15.01.2024) → ISO format (2024-01-15) 
- Vrati ISKLJUČIVO JSON objekt, bez markdown formatiranja
      `.trim();

      const result = await aiIntegrationService.processWithLMStudio(file, analysisPrompt, (progressData) => {
        if (progressData.status === 'reading') {
          updateProgress('Čitanje file sadržaja...', 65);
        } else if (progressData.status === 'processing') {
          updateProgress('LM Studio obrađuje dokument...', 75);
        } else if (progressData.status === 'completed') {
          updateProgress('LM Studio analiza završena!', 90);
        }
      }, settings.modelParams);

      if (result.success && result.response) {
        // Try to parse JSON from LM Studio response
        try {
          // Extract JSON from response (similar to existing logic)
          const jsonMatch = result.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedData = JSON.parse(jsonMatch[0]);
            return normalizeAnalysisData(parsedData, 'LM Studio Direct', 0.95);
          } else {
            throw new Error('No JSON found in LM Studio response');
          }
        } catch (parseError) {
          console.error('JSON parsing failed:', parseError);
          console.log('LM Studio response:', result.response);
          
          // Return a basic result with the raw response for user review
          return {
            ...normalizeAnalysisData({
              documentType: 'other',
              documentNumber: 'LMS-' + Date.now().toString().slice(-6),
              date: new Date().toISOString().split('T')[0],
              supplier: { name: 'LM Studio Processing', address: '', oib: '', iban: '' },
              buyer: { name: 'Check raw response', address: '', oib: '' },
              items: [],
              totals: { subtotal: 0, vatAmount: 0, totalAmount: 0 }
            }, 'LM Studio Direct (Raw)', 0.8),
            lmStudioRawResponse: result.response,
            lmStudioMessage: 'LM Studio processed the file but returned non-JSON response. Check raw response for details.'
          };
        }
      } else {
        throw new Error(result.error || 'LM Studio processing failed');
      }

    } catch (err) {
      console.error('Direct LM Studio analysis failed:', err);
      updateProgress('LM Studio direktna analiza neuspješna. Prebacujem na Regex...', 75);
      
      // Fallback: try to read file as text for regex analysis
      try {
        const text = await file.text();
        return analyzeWithRegex(text);
      } catch (textError) {
        // Ultimate fallback
        return normalizeAnalysisData({
          documentType: 'other',
          documentNumber: 'ERROR-' + Date.now().toString().slice(-6),
          date: new Date().toISOString().split('T')[0],
          supplier: { name: 'Processing failed', address: '', oib: '', iban: '' },
          buyer: { name: 'Direct LM Studio error', address: '', oib: '' },
          items: [],
          totals: { subtotal: 0, vatAmount: 0, totalAmount: 0 }
        }, 'Error Fallback', 0.1);
      }
    }
  }, [updateProgress, analyzeWithRegex, normalizeAnalysisData]);

  /* 
   * CHANGE: 2025-09-01 - Added analyzeWithBackend for complete memory optimization
   * WHY: Enable zero browser preprocessing by sending files to backend service
   * IMPACT: Prevents all PDF.js, canvas, and OCR memory usage - ideal for low-memory devices
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #backend-analysis #memory-optimization #preprocessing-bypass #server-processing
   * PERFORMANCE_NOTE: Completely offloads file processing to server backend
   */
  const analyzeWithBackend = useCallback(async (file) => {
    updateProgress('Šalje goli file na backend server za obradu...', 30);

    try {
      // Create FormData to send RAW file to backend - no browser preprocessing
      const formData = new FormData();
      formData.append('file', file); // Send file as-is without any processing
      formData.append('max_pages', '3'); // Basic parameter only
      
      /* 
       * CHUNK: Raw File Backend Communication
       * PURPOSE: Send unprocessed file directly to backend for complete server-side handling
       * COMPLEXITY: Low - minimal client processing, maximum server control
       * INTEGRATION_POINT: Agent server handles everything server-side
       */
      updateProgress('Backend server obrađuje goli file...', 60);
      
      // Use Agent server as raw file processor
      const BACKEND_URL = settings.agentUrl || 'http://127.0.0.1:7001';
      
      const response = await fetch(`${BACKEND_URL}/agent/analyze-file`, {
        method: 'POST',
        body: formData // Raw FormData, no headers manipulation
      });

      if (!response.ok) {
        throw new Error(`Backend server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      updateProgress('Backend analiza završena!', 90);

      if (result.success && result.analysis) {
        return normalizeAnalysisData(result.analysis, 'Backend Server', result.confidence || 0.9);
      } else {
        throw new Error(result.error || 'Backend processing failed');
      }

    } catch (err) {
      console.error('Backend analysis failed:', err);
      
      /* 
       * CHUNK: Enhanced Backend Error Handling
       * PURPOSE: Provide clear feedback about backend service availability
       * COMPLEXITY: Medium - different error types and user messaging
       */
      let errorMessage = 'Backend server nedostupan';
      let fallbackMessage = 'Prebacujem na Regex analizu...';
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = `Backend server (${settings.backendUrl || 'http://localhost:3001'}) nije pokrenut`;
        fallbackMessage = 'Koristim regex analizu umjesto backend servera';
      } else if (err.message.includes('404')) {
        errorMessage = 'Backend API endpoint ne postoji';
        fallbackMessage = 'Provjeriti backend implementaciju';
      } else if (err.message.includes('500')) {
        errorMessage = 'Backend server interna greška';
        fallbackMessage = 'Provjeriti backend logove';
      }
      
      updateProgress(`${errorMessage}. ${fallbackMessage}`, 75);
      
      // Fallback: try to read file as text for regex analysis (minimal memory usage)
      try {
        const text = await file.text();
        const regexResult = analyzeWithRegex(text);
        
        // Add backend error info to the result
        return {
          ...regexResult,
          backendError: errorMessage,
          analysisMethod: 'Regex Fallback (Backend Failed)',
          confidence: Math.max(0.1, regexResult.confidence - 0.2) // Reduce confidence due to fallback
        };
      } catch (textError) {
        // Ultimate fallback with clear backend service instructions
        return normalizeAnalysisData({
          documentType: 'other',
          documentNumber: 'BACKEND-ERR-' + Date.now().toString().slice(-6),
          date: new Date().toISOString().split('T')[0],
          supplier: { 
            name: 'Backend servis potreban', 
            address: 'Implementiraj backend na portu 3001', 
            oib: '', 
            iban: '' 
          },
          buyer: { 
            name: 'POST /api/analyze-document', 
            address: 'FormData: file, analysisType, language', 
            oib: '' 
          },
          items: [{
            position: 1,
            description: `Backend greška: ${errorMessage}`,
            quantity: 1,
            unit: 'info',
            unitPrice: 0,
            totalPrice: 0
          }],
          totals: { subtotal: 0, vatAmount: 0, totalAmount: 0 }
        }, 'Backend Service Required', 0.1);
      }
    }
  }, [updateProgress, analyzeWithRegex, normalizeAnalysisData, settings]);

  /* 
   * CHANGE: 2025-09-01 - Added PDF Agent integration with tool-calling orchestration
   * WHY: Enable autonomous AI agent decision-making for optimal PDF processing path
   * IMPACT: Agent automatically chooses between text extraction and vision analysis
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #pdf-agent #tool-calling #autonomous-processing #llm-orchestration
   */
  const analyzeWithAgent = useCallback(async (file) => {
    updateProgress('Šalje dokument na PDF Agent za autonomnu obradu...', 20);

    try {
      // Create FormData to send file to agent server
      const formData = new FormData();
      formData.append('file', file);
      formData.append('max_pages', '3'); // Default for most invoices
      
      updateProgress('Agent analizira dokument i bira najbolju strategiju...', 40);
      
      // Agent server URL (FastAPI on port 7001)
      const AGENT_URL = settings.agentUrl || 'http://127.0.0.1:7001';
      
      const response = await fetch(`${AGENT_URL}/agent/analyze-file`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Agent server error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      updateProgress('Agent analiza uspješno završena!', 90);

      // Agent already returns normalized, validated JSON
      if (result && result.documentType) {
        return normalizeAnalysisData(result, 'PDF Agent (Auto-Tool Selection)', 0.95);
      } else {
        throw new Error(result.error || 'Agent processing failed - invalid result format');
      }

    } catch (err) {
      console.error('🤖 PDF Agent analysis failed:', err);
      
      let errorMessage = 'PDF Agent nedostupan';
      let fallbackMessage = 'Prebacujem na lokalni LM Studio...';
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = `PDF Agent server (${settings.agentUrl || 'http://127.0.0.1:7001'}) nije pokrenut`;
        fallbackMessage = 'Pokrenuti: start_agent_stack.bat ili python agent_server.py';
      } else if (err.message.includes('Connection refused')) {
        errorMessage = 'Agent server ili lokalni LLM modeli nisu dostupni';
        fallbackMessage = 'Provjeriti TEXT LLM (port 8000) i VISION LLM (port 8001)';
      } else if (err.message.includes('500')) {
        errorMessage = 'Agent interna greška (vjerojajtno LLM problem)';
        fallbackMessage = 'Provjeriti agent_server.py logove';
      }
      
      updateProgress(`${errorMessage}. ${fallbackMessage}`, 75);
      
      // Fallback to direct LM Studio processing
      if (settings.fallbackToLMStudio !== false) {
        updateProgress('Fallback: pokušavam direktno s LM Studio...', 80);
        try {
          return await analyzeDirectlyWithLMStudio(file);
        } catch (fallbackErr) {
          console.error('Fallback to LM Studio also failed:', fallbackErr);
        }
      }
      
      // Ultimate fallback with clear agent setup instructions
      return normalizeAnalysisData({
        documentType: 'other',
        documentNumber: 'AGENT-ERR-' + Date.now().toString().slice(-6),
        date: new Date().toISOString().split('T')[0],
        supplier: { 
          name: 'PDF Agent setup potreban', 
          address: 'python agent_server.py (port 7001)', 
          oib: 'TEXT LLM na portu 8000', 
          iban: 'VISION LLM na portu 8001' 
        },
        buyer: { 
          name: 'start_agent_stack.bat', 
          address: 'ili individualno pokretanje servisa', 
          oib: '' 
        },
        items: [{
          position: 1,
          description: `Agent greška: ${errorMessage}`,
          quantity: 1,
          unit: 'setup',
          unitPrice: 0,
          totalPrice: 0
        }],
        totals: { subtotal: 0, vatAmount: 0, totalAmount: 0 }
      }, 'PDF Agent Setup Required', 0.1);
    }
  }, [updateProgress, analyzeDirectlyWithLMStudio, normalizeAnalysisData, settings]);

  /* 
   * CHANGE: 2025-09-01 - Added Direct Prompt mode for simple file + prompt → JSON
   * WHY: Bypass all agent orchestration, send raw file with system prompt for structured output
   * IMPACT: Minimal overhead, direct LLM communication, user controls prompt completely
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #direct-prompt #no-agent #simple-llm #structured-json
   */
  const analyzeWithDirectPrompt = useCallback(async (file) => {
    updateProgress('Šalje file direktno sa custom promptom za JSON odgovor...', 20);

    try {
      // Use selected LLM endpoint
      const endpoint = settings.lmStudioEndpoint || 'http://10.39.35.136:1234/v1/chat/completions';
      const selectedModel = settings.selectedModel || 'local-model';

      // Create system prompt for structured JSON output
      const systemPrompt = `You are a Croatian invoice/document analyzer. Extract information from the provided document and return ONLY a valid JSON object with this exact structure:

{
  "documentType": "invoice|quote|delivery_note",
  "documentNumber": "document number or null",
  "date": "YYYY-MM-DD or null", 
  "dueDate": "YYYY-MM-DD or null",
  "currency": "currency or null",
  "supplier": {
    "name": "supplier name or null",
    "address": "supplier address or null", 
    "oib": "supplier OIB or null",
    "iban": "supplier IBAN or null"
  },
  "buyer": {
    "name": "buyer name or null",
    "address": "buyer address or null",
    "oib": "buyer OIB or null", 
    "iban": "buyer IBAN or null"
  },
  "items": [
    {
      "position": 1,
      "code": "item code or null",
      "description": "item description", 
      "quantity": 1.0,
      "unit": "unit",
      "unitPrice": 0.0,
      "discountPercent": 0.0,
      "totalPrice": 0.0
    }
  ],
  "totals": {
    "subtotal": 0.0,
    "vatAmount": 0.0, 
    "totalAmount": 0.0
  }
}

Return ONLY the JSON object, no additional text or explanations.`;

      updateProgress('LLM obrađuje file sa strukturiranim promptom...', 50);

      // Read file content as text (works for PDF, TXT, etc.)
      const fileContent = await file.text();
      
      const payload = {
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: `Analyze this document and extract the information as JSON:\n\n${fileContent}`
          }
        ],
        temperature: 0.1, // Low temperature for structured output
        max_tokens: 2000,
        response_format: { type: "json_object" } // Force JSON output if supported
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.lmStudioApiKey || 'not-needed'}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      updateProgress('Direct prompt analiza završena!', 90);

      const llmResponse = result.choices?.[0]?.message?.content;
      if (!llmResponse) {
        throw new Error('No response from LLM');
      }

      // Parse JSON response
      let parsedData;
      try {
        parsedData = JSON.parse(llmResponse);
      } catch (parseError) {
        // Try to extract JSON from response if wrapped in text
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('LLM response is not valid JSON');
        }
      }

      return normalizeAnalysisData(parsedData, 'Direct Prompt LLM', 0.85);

    } catch (err) {
      console.error('💬 Direct prompt analysis failed:', err);
      
      let errorMessage = 'Direct prompt analiza neuspješna';
      let fallbackMessage = 'Prebacujem na regex analizu...';
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage = `LLM server (${settings.lmStudioEndpoint}) nije dostupan`;
        fallbackMessage = 'Provjeriti LLM server connection';
      } else if (err.message.includes('not valid JSON')) {
        errorMessage = 'LLM nije vratio valjan JSON format';
        fallbackMessage = 'Možda treba prilagoditi prompt ili model';
      }
      
      updateProgress(`❌ ${errorMessage}. ${fallbackMessage}`, 100);
      
      // NO FALLBACK - Let the error be visible for debugging
      throw new Error(`Direct Prompt Analysis Failed: ${errorMessage}`);
    }
  }, [updateProgress, settings]);

  // NEW: Batch Document Comparison with LM Studio
  const compareBatchDocumentsWithLMStudio = useCallback(async (files) => {
    updateProgress('LM Studio batch poređenje dokumenata...', 60);

    try {
      aiIntegrationService.setLMStudioConfig('http://10.39.35.136:1234');

      // Combine all files into one analysis request
      const documentsContent = await Promise.all(files.map(async (file, index) => {
        const content = await file.text().catch(() => 'Unable to read file content');
        return `
=== DOKUMENT ${index + 1}: ${file.name} ===
${content}
=== KRAJ DOKUMENTA ${index + 1} ===
`;
      }));

      const combinedContent = documentsContent.join('\n\n');

      const comparisonPrompt = `
Analiziraj i poredi ove ${files.length} hrvatska poslovna dokumenta. Vrati SAMO JSON objekt:

{
  "comparisonSummary": "string - Kratki sažetak glavnih razlika",
  "documentAnalysis": [
    {
      "documentIndex": 1,
      "filename": "string",
      "documentType": "string (quote|invoice|delivery|receipt|transfer|other)",
      "documentNumber": "string",
      "date": "YYYY-MM-DD",
      "supplier": "string",
      "totalAmount": "number",
      "keyFindings": "string - Važne napomene o ovom dokumentu"
    }
  ],
  "priceComparison": {
    "lowestAmount": "number",
    "highestAmount": "number",
    "averageAmount": "number",
    "priceVariation": "string - Opis varijacije cijena"
  },
  "supplierAnalysis": {
    "uniqueSuppliers": ["string array"],
    "mostFrequent": "string",
    "supplierComparison": "string - Poređenje dobavljača"
  },
  "recommendations": [
    "string - Preporuke na osnovu analize"
  ],
  "anomalies": [
    "string - Neobične ili sumnjive stavke"
  ]
}

VAŽNO:
- Analiziraj sve dokumente detaljno
- Fokusiraj se na razlike u cijenama, dobavljačima, uslovima
- Identificiraj anomalije ili nelogičnosti
- Vrati ISKLJUČIVO JSON objekt
      `.trim();

      // Create a temporary file for batch analysis
      const batchFile = new File([`${comparisonPrompt}\n\n${combinedContent}`], 
        `batch-comparison-${Date.now()}.txt`, { type: 'text/plain' });

      const result = await aiIntegrationService.processWithLMStudio(batchFile, 
        "Poredi ove dokumente i vrati detaljnu analizu:", (progressData) => {
        if (progressData.status === 'reading') {
          updateProgress('Čitanje batch dokumenata...', 70);
        } else if (progressData.status === 'processing') {
          updateProgress('LM Studio poredi dokumente...', 85);
        } else if (progressData.status === 'completed') {
          updateProgress('Batch analiza završena!', 95);
        }
      }, settings.modelParams);

      if (result.success && result.response) {
        try {
          const jsonMatch = result.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const comparisonData = JSON.parse(jsonMatch[0]);
            
            return {
              success: true,
              type: 'batch_comparison',
              analysisMethod: 'LM Studio Batch Comparison',
              confidence: 0.92,
              fileCount: files.length,
              files: files.map(f => f.name),
              comparison: comparisonData,
              rawResponse: result.response,
              processedAt: new Date().toISOString()
            };
          } else {
            throw new Error('No JSON found in batch comparison response');
          }
        } catch (parseError) {
          console.error('Batch comparison JSON parsing failed:', parseError);
          return {
            success: false,
            type: 'batch_comparison',
            error: 'JSON parsing failed',
            rawResponse: result.response,
            fileCount: files.length,
            files: files.map(f => f.name)
          };
        }
      } else {
        throw new Error(result.error || 'Batch comparison failed');
      }

    } catch (err) {
      console.error('Batch comparison with LM Studio failed:', err);
      return {
        success: false,
        type: 'batch_comparison',
        error: err.message,
        fileCount: files.length,
        files: files.map(f => f.name)
      };
    }
  }, [updateProgress]);


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
            const imageData = await renderPDFPageToImage(page, MEMORY_PROFILES[settings.memoryProfile].pdfScale); // Returns {blob, objectUrl, width, height}
            structuredData.images.push(imageData);
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

    /* 
     * CHANGE: 2025-09-01 - Added aggressive PDF.js resource cleanup
     * WHY: Prevent memory accumulation when processing multiple PDF files
     * IMPACT: Reduces memory usage by properly disposing PDF objects and pages
     * AUTHOR: Claude Code Assistant
     * SEARCH_TAGS: #memory-optimization #pdf-cleanup #resource-management
     * PERFORMANCE_NOTE: pdf.destroy() releases internal buffers and workers
     */
    try {
      // Clean up PDF.js resources to prevent memory leaks
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        if (page && typeof page.cleanup === 'function') {
          page.cleanup(); // Clean up individual page resources
        }
      }
      
      // Destroy the main PDF document to release all associated memory
      if (pdf && typeof pdf.destroy === 'function') {
        await pdf.destroy();
        console.log('✅ PDF.js resources cleaned up successfully');
      }
    } catch (cleanupError) {
      console.warn('⚠️  PDF cleanup encountered minor issue:', cleanupError.message);
      // Don't throw - cleanup issues shouldn't prevent document processing
    }

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
        const firstImage = extractedData.images[0];
        return { 
            type: file.type === 'application/pdf' ? 'pdf' : 'image', 
            dataUrl: firstImage.objectUrl || firstImage, // Use objectUrl for Blob data, fallback to direct URL
            pageCount: extractedData.metadata?.numPages 
        };
      }
        
      // Fallback for file types that don't extract images (e.g., Excel, Text)
      if (file.type === 'application/pdf') {
        // If PDF extraction failed or didn't yield images, try rendering again
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const imageData = await renderPDFPageToImage(page, MEMORY_PROFILES[settings.memoryProfile].pdfScale);
        return { type: 'pdf', dataUrl: imageData.objectUrl, imageData: imageData, pageCount: pdf.numPages };

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
    // SPECIAL CASE: Direct LM Studio mode bypasses extraction completely
    if (settings.analysisMode === AI_MODES.LMSTUDIO_DIRECT) {
        updateProgress('LM Studio direktni mod - preskačem OCR/skeniranje...', 10);
        
        const analysis = await analyzeDirectlyWithLMStudio(file);
        const preview = await createPreview(file);
        
        return {
          id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          rawData: { 
            directMode: true, 
            originalFile: file.name,
            bypassedOCR: true,
            metadata: { fileName: file.name, numPages: 'Unknown', processingMode: 'Direct LM Studio' }
          },
          analysis,
          preview,
          status: 'processed',
          documentType: analysis.documentType || 'other',
        };
    }

    // 1. Extract Raw Data (Includes coordinates, spatial text, AND images)
    const extractedData = await extractStructuredData(file);
    
    /* 
     * CHANGE: 2025-09-01 - Added dynamic context assessment and model optimization
     * WHY: Automatically match optimal model to document complexity
     * IMPACT: Prevents context overflow and improves analysis quality
     * AUTHOR: Claude Code Assistant
     * SEARCH_TAGS: #dynamic-optimization #context-assessment #model-switching
     */
    
    // 1.5. Assess Document Context and Optimize Model Selection
    let contextAssessment = null;
    let modelSwitchResult = null;
    // User has complete control over analysis mode - no suggestions or automatic changes
    
    if (settings.autoAnalyze && settings.useLLM && llmStatus === 'connected') {
        // Quick table detection to potentially recommend Vision mode
        if (extractedData.elements && extractedData.elements.length > 0) {
            const quickTableCheck = extractedData.spatialText && 
                /artikl|opis|količina|cijena|ukupno|r\.?b\.?|jm|bto|nto/i.test(extractedData.spatialText);
            
            if (quickTableCheck && settings.analysisMode === AI_MODES.SPATIAL && extractedData.images?.length > 0) {
                console.log('📊 Table detected in SPATIAL mode - korisnik je odabrao prostornu analizu');
                // Poštujemo korisnikov izbor - nema automatskog prebacivanja
            }
        }
        
        // All modes use manually selected model from dropdown
        console.log('🎯 Using user-selected model:', settings.selectedModel || 'NONE SELECTED');
        
        if (!settings.selectedModel) {
            console.warn('⚠️ No model selected by user');
        }
    }
    
    // 2. Analyze Data
    let analysis = {};
    if (settings.autoAnalyze) {
        const useLLM = settings.useLLM && llmStatus === 'connected';

        if (useLLM) {
            /* 
             * CHANGE: 2025-09-01 - Added BACKEND mode to analysis logic
             * WHY: Enable complete preprocessing bypass through server-side processing
             * IMPACT: Provides zero-memory browser option for resource-constrained devices
             * AUTHOR: Claude Code Assistant
             * SEARCH_TAGS: #backend-mode #analysis-routing #memory-bypass
             */
            // Debug: Log selected analysis mode for troubleshooting
            console.log(`🎯 Analysis Mode Selected: ${settings.analysisMode}`);
            console.log(`🔧 Available Modes:`, AI_MODES);
            
            // Determine which analysis method to use based on settings and available data
            if (settings.analysisMode === AI_MODES.DIRECT_PROMPT) {
                // Direct file + prompt → JSON (no agent, no tools)
                analysis = await analyzeWithDirectPrompt(file);
            } else if (settings.analysisMode === AI_MODES.AGENT) {
                // Use PDF Agent with tool-calling orchestration
                analysis = await analyzeWithAgent(file);
            } else if (settings.analysisMode === AI_MODES.BACKEND) {
                // Use Backend server (complete preprocessing bypass)
                analysis = await analyzeWithBackend(file);
            } else if (settings.analysisMode === AI_MODES.OPENWEBUI) {
                // Use OpenWebUI integration
                analysis = await analyzeWithOpenWebUI(extractedData);
            } else if (settings.analysisMode === AI_MODES.STRUCTURED_TEXT) {
                // Use CUDA-optimized structured text extraction + LLM
                console.log(`🚀 CUDA Mode Activated! Using STRUCTURED_TEXT with endpoint: ${settings.cudaLlmEndpoint || CUDA_LLM_CONFIG.endpoint}`);
                analysis = await analyzeWithStructuredText(file);
            } else if (settings.analysisMode === AI_MODES.VISION && extractedData.images.length > 0) {
                // Use user's selected Vision approach
                analysis = await analyzeWithVLM(extractedData);
            } else {
                // Use the existing Spatial approach (or if Vision is selected but no images exist)
                console.log(`⚠️ Using SPATIAL analysis (default fallback) with mode: ${settings.analysisMode}`);
                console.log(`📡 Spatial will use endpoint: ${settings.lmStudioEndpoint || 'http://10.39.35.136:1234'}`);
                console.log(`💡 To use CUDA server, select 'Strukturirani tekst + CUDA LLM (optimiziran)' in dropdown!`);
                
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
    
    // No automatic mode switching - user has full control
    
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
  }, [extractStructuredData, settings, llmStatus, analyzeWithSpatial, analyzeWithVLM, analyzeWithOpenWebUI, analyzeDirectlyWithLMStudio, analyzeWithBackend, analyzeWithAgent, analyzeWithDirectPrompt, analyzeWithRegex, createPreview, assessDocumentContext]);

  /* 
   * CHANGE: 2025-09-01 - Added analyzeWithStructuredText function for CUDA-optimized processing
   * WHY: Enable high-performance structured text extraction + LLM analysis with CUDA acceleration
   * IMPACT: Combines existing OCR/parsing with optimized CUDA LLM for best performance
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #structured-text #cuda-optimization #text-extraction #model-alias
   */
  const analyzeWithStructuredText = useCallback(async (file) => {
    updateProgress('Extracting structured text...', 10);

    try {
      // Use existing PDF extraction logic
      const structuredData = await extractStructuredData(file);
      updateProgress('Structured text extracted, sending to CUDA LLM...', 40);

      // Prepare structured prompt with extracted text and coordinates
      const structuredTextPrompt = `
STRUCTURED DOCUMENT ANALYSIS
============================

RAW TEXT CONTENT:
${structuredData.rawText}

COORDINATE-BASED ELEMENTS (X, Y positions):
${structuredData.elements.map(el => 
  `[${el.x}, ${el.y}] ${el.text} (page ${el.page})`
).join('\n')}

DOCUMENT STATISTICS:
- Total pages: ${structuredData.images.length}
- Text elements: ${structuredData.elements.length}
- Estimated complexity: ${structuredData.elements.length > 100 ? 'High' : structuredData.elements.length > 50 ? 'Medium' : 'Low'}

ANALYSIS INSTRUCTIONS:
Extract the key business information from this Croatian document and return ONLY a valid JSON object.
Use the coordinate information to understand document structure and layout.
Focus on accuracy for Croatian business documents (invoices, quotes, delivery notes).
      `;

      // Create system prompt for Croatian business documents
      const systemPrompt = `You are a Croatian business document expert with advanced OCR interpretation skills.
Use the structured text and coordinate information to extract precise business data.
Always return valid JSON with the exact structure provided.
Pay attention to coordinate positions to understand document layout and field relationships.`;

      // Prepare CUDA LLM request using user settings or defaults
      const endpoint = settings.cudaLlmEndpoint || CUDA_LLM_CONFIG.endpoint;
      const modelAlias = settings.cudaModelAlias || CUDA_LLM_CONFIG.modelAlias;
      const apiKey = settings.cudaApiKey || CUDA_LLM_CONFIG.apiKey;
      
      const payload = {
        model: modelAlias,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: structuredTextPrompt }
        ],
        temperature: CUDA_LLM_CONFIG.temperature,
        max_tokens: CUDA_LLM_CONFIG.maxTokens,
        response_format: { type: 'json_object' }
      };

      updateProgress('Sending to CUDA-optimized LLM...', 60);

      // Send to CUDA LLM server
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`CUDA LLM server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      updateProgress('Processing CUDA LLM response...', 80);

      // Extract and parse JSON response
      let analysisResult;
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from CUDA LLM');
      }

      // Try to parse JSON response with multiple fallback strategies
      try {
        analysisResult = JSON.parse(content);
      } catch (parseError) {
        console.warn('⚠️ Direct JSON parse failed, trying extraction strategies...', parseError.message);
        
        // Strategy 1: Extract JSON from code blocks
        const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          try {
            analysisResult = JSON.parse(codeBlockMatch[1]);
          } catch (codeBlockError) {
            console.warn('Code block JSON parsing failed:', codeBlockError.message);
          }
        }
        
        // Strategy 2: Find JSON object boundaries
        if (!analysisResult) {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              // Try to clean common JSON issues before parsing
              let cleanedJson = jsonMatch[0]
                .replace(/,(\s*[}\]])/g, '$1')                       // Remove trailing commas
                .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')  // Quote unquoted keys
                .replace(/:\s*'([^']*)'/g, ': "$1"')               // Fix single quotes
                .replace(/,\s*}/g, '}')                            // Remove trailing comma before }
                .replace(/,\s*]/g, ']');                           // Remove trailing comma before ]
              
              analysisResult = JSON.parse(cleanedJson);
            } catch (cleanError) {
              console.warn('Cleaned JSON parsing failed:', cleanError.message);
            }
          }
        }
        
        // Strategy 3: Try to find first and last braces for object extraction
        if (!analysisResult) {
          const firstBrace = content.indexOf('{');
          const lastBrace = content.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
              const extractedJson = content.substring(firstBrace, lastBrace + 1);
              let cleanedJson = extractedJson
                .replace(/,(\s*[}\]])/g, '$1')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
              
              analysisResult = JSON.parse(cleanedJson);
            } catch (extractError) {
              console.warn('Extracted JSON parsing failed:', extractError.message);
            }
          }
        }
        
        // If all strategies failed, throw error
        if (!analysisResult) {
          console.error('All JSON parsing strategies failed. Raw content:', content);
          throw new Error(`No valid JSON found in response. Original error: ${parseError.message}`);
        }
      }

      updateProgress('Analysis complete!', 100);

      // Normalize and return result
      return {
        ...normalizeAnalysisData(analysisResult, 'CUDA Structured Text', 0.9),
        processingMethod: 'CUDA-optimized structured text extraction',
        extractionStats: {
          pages: structuredData.images.length,
          textElements: structuredData.elements.length,
          modelUsed: modelAlias,
          contextWindow: CUDA_LLM_CONFIG.contextWindow
        }
      };

    } catch (err) {
      console.error('💡 Structured text analysis failed:', err);
      
      let errorMessage = 'CUDA structured text analysis failed';
      let fallbackMessage = 'Switching to spatial analysis...';
      
      if (err.message.includes('Failed to fetch') || err.message.includes('ERR_CONNECTION_REFUSED')) {
        const usedEndpoint = settings.cudaLlmEndpoint || CUDA_LLM_CONFIG.endpoint;
        errorMessage = `🚨 CUDA LLM server (${usedEndpoint}) not running or unreachable`;
        fallbackMessage = '🔧 Run start_cuda_llm.bat to launch CUDA server, or check endpoint configuration';
      } else if (err.message.includes('not valid JSON') || err.message.includes('No valid JSON')) {
        errorMessage = '🔍 CUDA LLM returned malformed JSON';
        fallbackMessage = '⚙️ Try adjusting prompt temperature or model parameters';
      } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage = '🔐 CUDA LLM authentication failed';
        fallbackMessage = '🗝️ Check API key configuration (default: local-key)';
      } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        errorMessage = '⚠️ CUDA LLM server internal error';
        fallbackMessage = '🔄 Restart CUDA server or check model loading status';
      }
      
      updateProgress(`❌ ${errorMessage}. ${fallbackMessage}`, 100);
      
      // NO FALLBACK - Let the error be visible for debugging
      throw new Error(`CUDA Structured Text Analysis Failed: ${errorMessage}`);
    }
  }, [extractStructuredData, updateProgress, normalizeAnalysisData, settings]);

  // Process multiple files (Main loop with error handling)
  /* 
   * CHANGE: 2025-09-01 - Enhanced processMultipleFiles with sequential processing and memory management
   * WHY: Prevent browser memory crashes when processing multiple large files
   * IMPACT: Adds delays between files to allow garbage collection and memory cleanup
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #memory-optimization #sequential-processing #garbage-collection
   * PERFORMANCE_NOTE: 2-second delay allows browser to free memory between files
   */
  const processMultipleFiles = useCallback(async (files) => {
    setProcessing(true);
    setError(null);
    const processedDocs = [];
    
    /* 
     * CHUNK: Memory Profile Configuration
     * PURPOSE: Adapt processing delays based on memory profile settings
     * COMPLEXITY: Low - simple lookup
     */
    const currentProfile = MEMORY_PROFILES[settings.memoryProfile];
    const PROCESSING_DELAY = currentProfile.processingDelay || 2000; // Default 2 seconds between files
    
    console.log(`🔄 Starting sequential processing of ${files.length} files with ${PROCESSING_DELAY}ms delays (${settings.memoryProfile} profile)`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      updateProgress(`Obrađujem dokument ${i + 1}/${files.length}: ${file.name}`, Math.round((i / files.length) * 100));

      try {
        /* 
         * CHUNK: Single File Processing with Memory Cleanup
         * PURPOSE: Process file and immediately clean up resources
         * COMPLEXITY: Medium - includes error handling and cleanup
         */
        const doc = await processSingleFile(file);
        processedDocs.push(doc);
        
        // Force memory cleanup after each file
        if (typeof cleanupDocumentMemory === 'function') {
          cleanupDocumentMemory();
        }
        
        console.log(`✅ Processed file ${i + 1}/${files.length}: ${file.name}`);
        
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
      
      /* 
       * CHUNK: Inter-File Memory Recovery Delay
       * PURPOSE: Allow browser garbage collection between file processing
       * COMPLEXITY: Low - simple timing control
       * MEMORY_MANAGEMENT: Critical for preventing cumulative memory usage
       */
      if (i < files.length - 1) { // Don't delay after the last file
        updateProgress(`Pauza za čišćenje memorije... (${i + 2}/${files.length} sljedeći)`, Math.round(((i + 0.5) / files.length) * 100));
        
        // Force immediate garbage collection if available (Chrome DevTools)
        if (typeof window !== 'undefined' && window.gc) {
          try {
            window.gc();
            console.log('🧹 Manual garbage collection triggered');
          } catch (gcError) {
            console.log('🤷 Manual garbage collection not available');
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
        console.log(`⏰ Memory recovery delay completed (${PROCESSING_DELAY}ms)`);
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

  // NEW: Handle batch comparison
  const handleBatchComparison = useCallback(async () => {
    if (documents.length < 2) {
      alert('Potrebno je najmanje 2 dokumenta za poređenje.');
      return;
    }

    if (settings.analysisMode !== AI_MODES.LMSTUDIO_DIRECT) {
      const confirmSwitch = window.confirm(
        'Batch poređenje radi najbolje s "LM Studio direktno" modom. ' +
        'Želite li promeniti mod analize?'
      );
      if (confirmSwitch) {
        setSettings(prev => ({ ...prev, analysisMode: AI_MODES.LMSTUDIO_DIRECT }));
      }
      return;
    }

    setProcessing(true);
    setError(null);
    
    try {
      updateProgress('Priprema dokumenata za batch poređenje...', 10);
      
      // Create temporary files from current documents
      const tempFiles = await Promise.all(documents.map(async (doc, index) => {
        let content = '';
        
        if (doc.rawData && doc.rawData.directMode) {
          // For direct mode documents, try to recreate content
          content = `Document: ${doc.fileName}
Type: ${doc.analysis.documentType}
Number: ${doc.analysis.documentNumber}
Date: ${doc.analysis.date}
Supplier: ${doc.analysis.supplier?.name || 'Unknown'}
Total: ${doc.analysis.totals?.totalAmount || 0}

Items:
${doc.analysis.items?.map(item => `- ${item.description}: ${item.quantity} x ${item.unitPrice}`).join('\n') || 'No items'}`;
        } else if (doc.rawData) {
          // Use extracted text content
          content = doc.rawData.spatialText || doc.rawData.rawText || `No text content available for ${doc.fileName}`;
        } else {
          content = `No content available for ${doc.fileName}`;
        }

        return new File([content], doc.fileName, { type: 'text/plain' });
      }));

      const comparisonResult = await compareBatchDocumentsWithLMStudio(tempFiles);
      
      if (comparisonResult.success) {
        // Add the comparison result as a special document
        const comparisonDoc = {
          id: `COMPARISON-${Date.now()}`,
          fileName: `Batch_Comparison_${comparisonResult.fileCount}_docs.json`,
          fileType: 'application/json',
          fileSize: JSON.stringify(comparisonResult).length,
          uploadDate: new Date().toISOString(),
          rawData: { comparisonResult: true, ...comparisonResult },
          analysis: {
            documentType: 'comparison',
            source: 'Batch Comparison',
            confidence: comparisonResult.confidence || 0.9,
            comparedFiles: comparisonResult.files,
            ...comparisonResult.comparison
          },
          preview: { type: 'json', content: JSON.stringify(comparisonResult.comparison, null, 2) },
          status: 'processed',
          documentType: 'comparison'
        };

        setDocuments(prev => [comparisonDoc, ...prev]);
        setCurrentDocIndex(0); // Switch to the comparison result
        updateProgress('Batch poređenje završeno!', 100);
        
        setTimeout(() => {
          setProcessing(false);
          setProgress(0);
        }, 1000);
        
      } else {
        throw new Error(comparisonResult.error || 'Batch comparison failed');
      }
      
    } catch (err) {
      console.error('Batch comparison error:', err);
      setError(`Batch poređenje neuspješno: ${err.message}`);
      setProcessing(false);
      setProgress(0);
    }
  }, [documents, settings.analysisMode, compareBatchDocumentsWithLMStudio, updateProgress]);

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
                    onBatchComparison={handleBatchComparison}
                    processing={processing}
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
            llmStatus={llmStatus}
            availableModels={availableModels}
            fetchAvailableModels={fetchAvailableModels}
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

  /* 
   * CHANGE: 2025-09-01 - Enhanced badge colors for chunked analysis and OOM recovery
   * WHY: Provide visual feedback about document processing method and memory optimization
   * IMPACT: Users can immediately see if chunking was used due to document size
   * AUTHOR: Claude Code Assistant
   * SEARCH_TAGS: #ui-badges #chunking-feedback #oom-recovery #analysis-method
   */
  const getMethodBadgeClass = (method) => {
    if (method.includes('Chunked') || method.includes('parts')) return 'bg-blue-100 text-blue-800 border border-blue-300';
    if (method.includes('OOM') || method.includes('Memory')) return 'bg-red-100 text-red-800 border border-red-300';
    if (method.includes('Backend')) return 'bg-indigo-100 text-indigo-800';
    if (method.includes('VLM') || method.includes('Vizualno')) return 'bg-purple-100 text-purple-800';
    if (method.includes('LLM') || method.includes('Koordinate')) return 'bg-green-100 text-green-800';
    if (method.includes('OpenWebUI')) return 'bg-cyan-100 text-cyan-800';
    if (method.includes('LM Studio Direct')) return 'bg-orange-100 text-orange-800';
    if (method.includes('Regex') || method.includes('Fallback')) return 'bg-amber-100 text-amber-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`rounded-2xl p-6 ${theme.card}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{UI_TEXT.docAnalysis}</h2>
        <div className="flex gap-3 items-center">
            {data.analysisMethod && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${getMethodBadgeClass(data.analysisMethod)}`}>
                      Metoda: {data.analysisMethod}
                  </span>
                  {data.chunkingInfo && (
                    <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border">
                      <span>📄</span>
                      <span>{data.chunkingInfo.totalChunks} dijelova</span>
                      <span className="text-blue-400">|</span>
                      <span>{data.chunkingInfo.totalItems} stavki</span>
                    </div>
                  )}
                  {data.autoModeSwitch && (
                    <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full border">
                      <span>🎯</span>
                      <span>Auto → {data.autoModeSwitch.suggested}</span>
                    </div>
                  )}
                </div>
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
  onBatchComparison,
  processing,
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
            
            {/* NEW: Batch Comparison Button */}
            <button 
              onClick={onBatchComparison}
              disabled={documents.length < 2 || processing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm shadow-md ${
                documents.length >= 2 && !processing
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
              title={documents.length < 2 ? 'Potrebno je najmanje 2 dokumenta' : 'Poredi sve dokumente s LM Studio'}
            >
              <Grid3x3 size={16} />
              Batch poređenje ({documents.length})
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
function SettingsPanel({ settings, onSettingsChange, onClose, llmStatus, availableModels, fetchAvailableModels }) {
    const updateSetting = (key, value) => {
        // Support nested properties like 'modelParams.temperature'
        if (key.includes('.')) {
            const [parentKey, childKey] = key.split('.');
            onSettingsChange({ 
                ...settings, 
                [parentKey]: { 
                    ...settings[parentKey], 
                    [childKey]: value 
                } 
            });
        } else {
            onSettingsChange({ ...settings, [key]: value });
        }
    };

    const updateMultipleModelParams = (params) => {
        onSettingsChange({
            ...settings,
            modelParams: {
                ...settings.modelParams,
                ...params
            }
        });
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
                                    <option value={AI_MODES.STRUCTURED_TEXT}>🚀 CUDA LLM (127.0.0.1:8000) - Strukturirani tekst</option>
                                    <option value={AI_MODES.DIRECT_PROMPT}>💬 Direct Prompt (korisni endpoint)</option>
                                    <option value={AI_MODES.AGENT}>🤖 PDF Agent (7001 → 8000+8002)</option>
                                    <option value={AI_MODES.VISION}>👁️ VLM (10.39.35.136:1234) - Vizualna analiza</option>
                                    <option value={AI_MODES.SPATIAL}>📐 Spatial (10.39.35.136:1234) - Koordinate</option>
                                    <option value={AI_MODES.OPENWEBUI}>🌐 OpenWebUI (localhost:8080) - RAG</option>
                                    <option value={AI_MODES.LMSTUDIO_DIRECT}>📤 LM Studio (10.39.35.136:1234) - Direktno</option>
                                    <option value={AI_MODES.BACKEND}>⚙️ Backend (3001) - Server obrada</option>
                                </select>
                                <p className='text-xs text-gray-500 mt-2'>
                                    {settings.analysisMode === AI_MODES.STRUCTURED_TEXT
                                        ? `⚡ OCR/parsing + CUDA-optimiziran LLM: koristi postojeće text extraction funkcije i šalje strukturirani tekst s koordinatama na lokalni CUDA LLM (model alias gpt-oss-20b, port 8000).`
                                        : settings.analysisMode === AI_MODES.DIRECT_PROMPT
                                        ? `💬 Jednostavno: šalje file + system prompt direktno na LLM za structured JSON. Bez agenta, bez tools - samo prompt → odgovor.`
                                        : settings.analysisMode === AI_MODES.AGENT
                                        ? `🤖 PDF Agent autonomno bira između text i vision analize. Potrebno: TEXT LLM (port 8000) + VISION LLM (port 8002) + Agent server (port 7001).`
                                        : settings.analysisMode === AI_MODES.VISION
                                        ? `🎯 Koristi odabrani model iz liste. VLM model (npr. Qwen-VL, LLaVA) u LM Studio.`
                                        : settings.analysisMode === AI_MODES.OPENWEBUI
                                        ? `🎯 Koristi odabrani model iz liste. Šalje dokument u OpenWebUI za RAG analizu.`
                                        : settings.analysisMode === AI_MODES.LMSTUDIO_DIRECT
                                        ? `🎯 Koristi odabrani model iz liste. Direktno šalje file u LM Studio - preskače OCR.`
                                        : settings.analysisMode === AI_MODES.BACKEND
                                        ? `📤 Šalje goli file direktno na server - zero browser obrada. Agent server obrađuje sve.`
                                        : `🎯 Koristi odabrani model iz liste. Analiza koordinata s prostornim podacima.`
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

                        {/* NEW: Backend URL Configuration (shown when BACKEND mode is selected) */}
                        {settings.analysisMode === AI_MODES.BACKEND && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-2">
                                    Backend Server URL
                                </label>
                                <input
                                    type="text"
                                    value={settings.backendUrl || 'http://localhost:3001'}
                                    onChange={(e) => updateSetting('backendUrl', e.target.value)}
                                    placeholder="http://localhost:3001"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                                <p className='text-xs text-gray-500 mt-2'>
                                    URL backend servera koji implementira POST /api/analyze-document endpoint.
                                    Backend trebao bi vratiti JSON s analysis objektom koji sadrži dokument podatke.
                                </p>
                                <div className='text-xs text-amber-600 mt-1'>
                                    <strong>Napomena:</strong> Backend servis trenutno ne postoji - implementiraj na portu 3001 ili promijeni URL.
                                </div>
                            </div>
                        )}

                        {/* NEW: CUDA LLM Configuration (shown when STRUCTURED_TEXT mode is selected) */}
                        {settings.analysisMode === AI_MODES.STRUCTURED_TEXT && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-2">
                                    ⚡ CUDA LLM Konfiguracija
                                </label>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">Server URL</label>
                                        <input
                                            type="text"
                                            value={settings.cudaLlmEndpoint || CUDA_LLM_CONFIG.endpoint}
                                            onChange={(e) => updateSetting('cudaLlmEndpoint', e.target.value)}
                                            placeholder="http://127.0.0.1:8000/v1/chat/completions"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">Model Alias</label>
                                        <input
                                            type="text"
                                            value={settings.cudaModelAlias || CUDA_LLM_CONFIG.modelAlias}
                                            onChange={(e) => updateSetting('cudaModelAlias', e.target.value)}
                                            placeholder="gpt-oss-20b"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs text-gray-600 block mb-1">API Key</label>
                                        <input
                                            type="password"
                                            value={settings.cudaApiKey || CUDA_LLM_CONFIG.apiKey}
                                            onChange={(e) => updateSetting('cudaApiKey', e.target.value)}
                                            placeholder="local-key"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                                
                                <p className='text-xs text-gray-500 mt-2'>
                                    CUDA LLM server konfiguracija. Pokretaj sa: <code className="bg-gray-100 px-1 rounded">start_cuda_llm.bat</code>
                                </p>
                                <div className='text-xs text-blue-600 mt-1'>
                                    <strong>Performanse:</strong> Koristi postojeći OCR/parsing + CUDA-ubrzani LLM za optimalne rezultate.
                                </div>
                                
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                    <strong>🚀 CUDA Setup:</strong>
                                    <ol className="list-decimal list-inside mt-1 space-y-1 text-gray-600">
                                        <li>Pokreni <code>start_cuda_llm.bat</code> (instalira CUDA wheel i pokreće server)</li>
                                        <li>Server će se pokrenuti na portu 8000 s modelom alias "gpt-oss-20b"</li>
                                        <li>Provjeri da model path u .bat file-u odgovara vašem modelu</li>
                                        <li>GPU layers: -1 (svi layeri na GPU), Context: 16K tokena</li>
                                    </ol>
                                </div>
                            </div>
                        )}

                        {/* NEW: PDF Agent Settings */}
                        {settings.analysisMode === AI_MODES.AGENT && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-2">
                                    🤖 PDF Agent Konfiguracija
                                </label>
                                
                                <div className="space-y-3">
                                    {/* Agent Server URL */}
                                    <div>
                                        <label className="text-xs font-medium block mb-1">Agent Server URL</label>
                                        <input
                                            type="text"
                                            value={settings.agentUrl || 'http://127.0.0.1:7001'}
                                            onChange={(e) => updateSetting('agentUrl', e.target.value)}
                                            placeholder="http://127.0.0.1:7001"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <p className='text-xs text-gray-500 mt-1'>FastAPI agent server (port 7001)</p>
                                    </div>

                                    {/* Setup Instructions */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs">
                                        <div className="font-medium text-blue-800 mb-2">📋 Setup Instrukcije:</div>
                                        <div className="space-y-1 text-blue-700">
                                            <div><strong>1. Pokreni agent stack:</strong> start_agent_stack.bat</div>
                                            <div><strong>2. TEXT LLM:</strong> http://127.0.0.1:8000</div>
                                            <div><strong>3. VISION LLM:</strong> http://127.0.0.1:8001</div>
                                            <div><strong>4. Agent API:</strong> http://127.0.0.1:7001</div>
                                        </div>
                                    </div>

                                    {/* Fallback Option */}
                                    <div>
                                        <label className="flex items-center space-x-2 text-xs">
                                            <input
                                                type="checkbox"
                                                checked={settings.fallbackToLMStudio !== false}
                                                onChange={(e) => updateSetting('fallbackToLMStudio', e.target.checked)}
                                                className="rounded border-gray-300"
                                            />
                                            <span>Fallback na LM Studio ako agent nije dostupan</span>
                                        </label>
                                    </div>
                                </div>

                                <div className='text-xs text-amber-600 mt-2'>
                                    <strong>Napomena:</strong> Agent autonomno bira između text i vision analize na osnovu sadržaja dokumenta.
                                </div>
                            </div>
                        )}

                        {/* NEW: Dynamic Model Optimization Info */}
                        {settings.useLLM && [AI_MODES.SPATIAL, AI_MODES.VISION, AI_MODES.LMSTUDIO_DIRECT].includes(settings.analysisMode) && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-2">
                                    🎯 Ručni odabir modela
                                </label>
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                                    <div className="font-medium text-green-800 mb-2">
                                        Ručni odabir modela - potpuna kontrola korisnika
                                    </div>
                                    <div className="space-y-2 text-xs text-green-700">
                                        <div className="font-medium">Odaberite model koji želite koristiti:</div>
                                        <div>• Veći modeli = bolja kvaliteta analize</div>
                                        <div>• Manji modeli = brža obrada</div>
                                        <div>• Svi modeli koriste vaše postavke parametara</div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-green-200 text-xs text-green-600">
                                        <strong>Dostupni modeli u LM Studio:</strong>
                                        <div className="mt-1 space-y-1">
                                            {Object.entries(DYNAMIC_MODEL_CONFIG).map(([key, config]) => (
                                                <details key={key} className="cursor-pointer">
                                                    <summary className="font-medium">{config.name}</summary>
                                                    <ul className="ml-4 mt-1 space-y-1">
                                                        {config.recommendedModels.map((model, idx) => (
                                                            <li key={idx} className="text-xs">• {model}</li>
                                                        ))}
                                                    </ul>
                                                </details>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NEW: Model Selector */}
                        {settings.useLLM && llmStatus === 'connected' && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-2">
                                    🎯 Odaberi model (obavezno za sve modove)
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
                                <p className="text-xs mt-1 text-blue-600">
                                    🎯 Svi modovi koriste točno model koji odaberete iz liste - nema automatskog odabira
                                </p>
                                <button 
                                    onClick={fetchAvailableModels}
                                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                >
                                    🔄 Osvježi listu modela
                                </button>
                            </div>
                        )}

                        {/* NEW: LM Studio Model Parameters Section */}
                        {settings.useLLM && llmStatus === 'connected' && (
                            <div className='pt-3 border-t border-gray-200'>
                                <label className="text-sm font-medium block mb-3">
                                    🎛️ Parametri modela (LM Studio kontrole)
                                </label>
                                
                                <div className="space-y-4">
                                    {/* Core Generation Parameters */}
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <h4 className="text-xs font-medium text-blue-800 mb-2">Osnovno generiranje</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-600">Temperature (0.0-2.0)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="2"
                                                    step="0.1"
                                                    value={settings.modelParams.temperature}
                                                    onChange={(e) => updateSetting('modelParams.temperature', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Kreativnost (0.1=fokusirano, 1.0=kreativno)</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Max Tokens</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="8000"
                                                    step="100"
                                                    value={settings.modelParams.max_tokens}
                                                    onChange={(e) => updateSetting('modelParams.max_tokens', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Maksimalno tokena za odgovor</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Top P (0.0-1.0)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={settings.modelParams.top_p}
                                                    onChange={(e) => updateSetting('modelParams.top_p', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Nucleus sampling (0.9=uobičajeno)</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Top K</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="100"
                                                    step="1"
                                                    value={settings.modelParams.top_k}
                                                    onChange={(e) => updateSetting('modelParams.top_k', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Top-k sampling (40-50=dobro)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Repetition Control */}
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <h4 className="text-xs font-medium text-green-800 mb-2">Kontrola ponavljanja</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-600">Repeat Penalty (0.0-2.0)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="2"
                                                    step="0.1"
                                                    value={settings.modelParams.repeat_penalty}
                                                    onChange={(e) => updateSetting('modelParams.repeat_penalty', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">1.1=malo, 1.3=puno</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Presence Penalty (-2 to 2)</label>
                                                <input
                                                    type="number"
                                                    min="-2"
                                                    max="2"
                                                    step="0.1"
                                                    value={settings.modelParams.presence_penalty}
                                                    onChange={(e) => updateSetting('modelParams.presence_penalty', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Kazniti nove tokene</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Frequency Penalty (-2 to 2)</label>
                                                <input
                                                    type="number"
                                                    min="-2"
                                                    max="2"
                                                    step="0.1"
                                                    value={settings.modelParams.frequency_penalty}
                                                    onChange={(e) => updateSetting('modelParams.frequency_penalty', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Kazniti česte tokene</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Sampling */}
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <h4 className="text-xs font-medium text-purple-800 mb-2">Napredno uzorkovanje</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-600">Min P (0.0-1.0)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1"
                                                    step="0.01"
                                                    value={settings.modelParams.min_p}
                                                    onChange={(e) => updateSetting('modelParams.min_p', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Minimalna vjerojatnost</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Seed (-1 = random)</label>
                                                <input
                                                    type="number"
                                                    min="-1"
                                                    max="999999999"
                                                    step="1"
                                                    value={settings.modelParams.seed}
                                                    onChange={(e) => updateSetting('modelParams.seed', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">-1=random, broj=reproducible</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mirostat */}
                                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                        <h4 className="text-xs font-medium text-orange-800 mb-2">Mirostat (alternativa za Top P/K)</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-600">Mirostat Mode</label>
                                                <select
                                                    value={settings.modelParams.mirostat}
                                                    onChange={(e) => updateSetting('modelParams.mirostat', parseInt(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                >
                                                    <option value={0}>Onemogućeno</option>
                                                    <option value={1}>Mirostat v1</option>
                                                    <option value={2}>Mirostat v2</option>
                                                </select>
                                                <p className="text-xs text-gray-500">0=off, 1/2=aktivno</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Tau (entropija)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    step="0.5"
                                                    value={settings.modelParams.mirostat_tau}
                                                    onChange={(e) => updateSetting('modelParams.mirostat_tau', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Target entropija (5.0=dobro)</p>
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-600">Eta (learning rate)</label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    max="1"
                                                    step="0.01"
                                                    value={settings.modelParams.mirostat_eta}
                                                    onChange={(e) => updateSetting('modelParams.mirostat_eta', parseFloat(e.target.value))}
                                                    className="w-full px-2 py-1 text-xs border rounded"
                                                />
                                                <p className="text-xs text-gray-500">Learning rate (0.1=dobro)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Presets */}
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                        <h4 className="text-xs font-medium text-gray-800 mb-2">Brzi presets</h4>
                                        <div className="flex gap-2 flex-wrap">
                                            <button
                                                onClick={() => updateMultipleModelParams({
                                                    temperature: 0.1, 
                                                    top_p: 0.9, 
                                                    repeat_penalty: 1.1
                                                })}
                                                className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                            >
                                                🎯 Precizno (faktual)
                                            </button>
                                            <button
                                                onClick={() => updateMultipleModelParams({
                                                    temperature: 0.7, 
                                                    top_p: 0.95, 
                                                    repeat_penalty: 1.05
                                                })}
                                                className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                                            >
                                                ⚖️ Balansirano
                                            </button>
                                            <button
                                                onClick={() => updateMultipleModelParams({
                                                    temperature: 1.2, 
                                                    top_p: 0.98, 
                                                    repeat_penalty: 1.0
                                                })}
                                                className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                                            >
                                                🎨 Kreativno
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!settings.useLLM && (
                             <p className='text-xs text-gray-500'>Ako je AI isključeno ili offline, koristi se Regex (manje precizno).</p>
                        )}
                    </div>
                </div>

                {/* OpenWebUI Settings */}
                {settings.analysisMode === AI_MODES.OPENWEBUI && (
                    <div>
                        <h4 className="text-sm font-medium mb-3">OpenWebUI integracija</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium block mb-2">
                                    OpenWebUI URL
                                </label>
                                <input
                                    type="text"
                                    value={settings.openWebUIUrl}
                                    onChange={(e) => updateSetting('openWebUIUrl', e.target.value)}
                                    placeholder="http://localhost:8080"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium block mb-2">
                                    API ključ
                                </label>
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <input
                                        type="password"
                                        value={settings.openWebUIApiKey}
                                        onChange={(e) => updateSetting('openWebUIApiKey', e.target.value)}
                                        placeholder="Vaš OpenWebUI API ključ"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        autoComplete="off"
                                    />
                                </form>
                                <p className='text-xs text-gray-500 mt-1'>
                                    Generirajte u OpenWebUI: Settings → Account → API Keys
                                </p>
                            </div>

                            <div>
                                <button 
                                    onClick={async () => {
                                        try {
                                            aiIntegrationService.setOpenWebUIConfig(settings.openWebUIApiKey, settings.openWebUIUrl);
                                            const result = await aiIntegrationService.testAPIKey();
                                            if (result.valid) {
                                                alert('✅ OpenWebUI konekcija uspješna!');
                                            } else {
                                                alert(`❌ Konekcija neuspješna: ${result.status} ${result.statusText || result.error}`);
                                            }
                                        } catch (error) {
                                            alert(`❌ Greška: ${error.message}`);
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                                >
                                    Testiraj konekciju
                                </button>
                            </div>

                            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                <p className="text-sm font-medium text-blue-800 mb-1">Kako funkcioniše:</p>
                                <ul className="text-xs text-blue-700 space-y-1">
                                    <li>1. Dokument se šalje u OpenWebUI</li>
                                    <li>2. Kreira se file za RAG analizu</li>
                                    <li>3. Idite u OpenWebUI chat i koristite # za pristup</li>
                                    <li>4. Analizirajte dokument s AI modelom</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

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