// src/components/InvoiceProcesser.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  FileText, Upload, AlertCircle, CheckCircle2, Loader2,
  RefreshCw, Edit3, Database, X, ArrowLeft, ZoomIn, ZoomOut,
  Building, Package, BadgeCheck, Target, ChevronLeft, ChevronRight,
  Eye, EyeOff, FileSpreadsheet, Layers, Focus, FilePlus, Receipt,
  Truck, Archive, PackageCheck, Settings, Grid3x3, MessageSquare,
  Download, Camera, Search, Filter, Maximize2, Save, History,
  FileCode, ExternalLink, Trash2, Plus, Info, ChevronDown, Copy
} from 'lucide-react';

// PDF.js and Tesseract imports
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Tesseract from 'tesseract.js';
import * as XLSX from 'xlsx';

/** ======================== CONSTANTS ======================== */
const DOCUMENT_TYPES = {
  request: { label: 'Zahtjev za ponudu', icon: FileText, color: '#8b5cf6', internal: false },
  quote: { label: 'Ponuda', icon: FileText, color: '#3b82f6', internal: false },
  invoice: { label: 'Račun', icon: Receipt, color: '#10b981', internal: false },
  proforma: { label: 'Predračun', icon: FileText, color: '#f97316', internal: false },
  delivery: { label: 'Otpremnica', icon: Truck, color: '#f59e0b', internal: true },
  transfer: { label: 'Međuskladišnica', icon: Archive, color: '#06b6d4', internal: true },
  receipt: { label: 'Primka', icon: PackageCheck, color: '#ec4899', internal: true },
};

const INTERNAL_DOCS = ['delivery', 'transfer', 'receipt'];

const LM_STUDIO_CONFIG = {
  endpoint: 'http://localhost:1234/v1/chat/completions',
  model: 'local-model',
  temperature: 0.05,
  max_tokens: 6000,
};

// Croatian specific patterns
const CROATIAN_PATTERNS = {
  // Document types
  documentTypes: {
    'račun': 'invoice',
    'r-1': 'invoice',
    'racun': 'invoice',
    'ponuda': 'quote',
    'predračun': 'proforma',
    'predracun': 'proforma',
    'otpremnica': 'delivery',
    'primka': 'receipt',
    'zahtjev': 'request'
  },
  
  // Common Croatian company suffixes
  companySuffixes: ['d.o.o.', 'd.d.', 'j.d.o.o.', 'obrt', 'vl.'],
  
  // Date formats
  dateFormats: [
    /(\d{1,2})[.\s]+(\d{1,2})[.\s]+(\d{4})/,  // DD.MM.YYYY
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,       // DD-MM-YYYY or DD/MM/YYYY
    /(\d{4})[.-](\d{1,2})[.-](\d{1,2})/,       // YYYY-MM-DD
  ],
  
  // Number formats (Croatian uses comma for decimal, dot for thousands)
  numberPattern: /\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?/,
  
  // VAT rates in Croatia
  vatRates: [25, 13, 5, 0],
  
  // Common field labels
  labels: {
    documentNumber: ['broj', 'br.', 'broj računa', 'broj dokumenta', 'račun br.', 'račun broj'],
    date: ['datum', 'datum izdavanja', 'datum računa', 'datum dokumenta'],
    dueDate: ['datum dospijeća', 'dospijeće', 'valuta', 'rok plaćanja', 'datum valute'],
    supplier: ['prodavatelj', 'izdavatelj', 'dobavljač', 'pošiljatelj', 'tvrtka'],
    buyer: ['kupac', 'naručitelj', 'primatelj', 'platitelj'],
    oib: ['oib', 'porezni broj', 'mb'],
    address: ['adresa', 'sjedište', 'ulica'],
    items: ['stavke', 'artikli', 'proizvodi', 'roba', 'usluge'],
    quantity: ['količina', 'kol.', 'kom', 'komada'],
    price: ['cijena', 'jed. cijena', 'jedinična cijena', 'cijena bez pdv'],
    total: ['ukupno', 'iznos', 'sveukupno', 'za platiti', 'total'],
    subtotal: ['osnovica', 'neto', 'bez pdv', 'porezna osnovica'],
    vat: ['pdv', 'porez', 'porez na dodanu vrijednost'],
    iban: ['iban', 'žiro račun', 'žr', 'broj računa'],
    reference: ['poziv na broj', 'model', 'poziv'],
  }
};

const UI_TEXT = {
  appTitle: 'RUBILAKSE - Hrvatski čitač dokumenata',
  lmStudio: 'LM Studio',
  docsCount: (d, c) => `${d} dokumenata | ${c} potvrđenih`,
  btnShowDebug: (show) => (show ? 'Sakrij' : 'Prikaži') + ' Debug',
  newBatch: 'Novi batch',
  dropHereTitle: 'Povucite dokumente ovdje',
  dropHereSub: 'ili kliknite za odabir • PDF, Excel, CSV, slike • Više datoteka',
  debugTitle: 'Debug informacije',
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
  backToNormal: 'Natrag na normalni prikaz',
  docType: 'Tip dokumenta',
  preview: 'Pregled',
  clickForFocus: 'Klik za Focus Mode',
  quickAnalytics: 'Brza analiza',
  recentDocs: 'Zadnji dokumenti',
  exportOptions: 'Export opcije',
  exportItems: 'Excel stavke',
  exportFull: 'Excel potpuno',
  exportDocTxt: 'Dokument (TXT)',
  exportJsonCurrent: 'JSON (trenutni)',
  exportJsonAll: 'JSON (svi)',
  itemsCount: 'Broj stavki',
  totalValue: 'Ukupna vrijednost',
  vatAmount: 'Iznos PDV-a',
  confidence: 'Pouzdanost',
  basicInfo: 'Osnovni podaci',
  documentNumber: 'Broj dokumenta',
  date: 'Datum',
  dueDate: 'Dospijeće',
  supplier: 'Dobavljač',
  buyer: 'Kupac',
  name: 'Naziv',
  oib: 'OIB',
  address: 'Adresa',
  items: (n) => `Stavke (${n})`,
  totals: 'Sažetak',
  subtotal: 'Osnovica',
  vat: 'PDV',
  total: 'UKUPNO',
  createDocs: 'Kreiraj interne dokumente',
  createSave: 'Kreiraj & Spremi',
  cancel: 'Odustani',
  deliveryInfo: 'Podaci o otpremi',
  transferInfo: 'Transfer informacije',
  receiptInfo: 'Primka informacije',
  deliveryAddress: 'Adresa dostave',
  deliveryMethod: 'Način dostave',
  fromWarehouse: 'Iz skladišta',
  toWarehouse: 'U skladište',
  reason: 'Razlog',
  receivedBy: 'Zaprimio',
  condition: 'Stanje',
  conditionOk: 'U redu',
  conditionDamaged: 'Oštećeno',
  conditionIncomplete: 'Nepotpuno',
  docNo: 'Broj dokumenta',
  createdNotice: (label) => `${label} uspješno kreiran i spremljen!`,
  confirmNewBatch: 'Želite li početi s novim batch-om dokumenata?',
  exportItemsXlsx: (num) => `stavke-${num || Date.now()}.xlsx`,
  exportDocXlsx: (num) => `dokument-${num || Date.now()}.xlsx`,
  exportDocTxtName: (num) => `dokument-${num || Date.now()}.txt`,
  exportDocJsonName: (num) => `dokument-${num || Date.now()}.json`,
  exportAllJsonName: () => `svi-dokumenti-${Date.now()}.json`,
  iban: 'IBAN',
  reference: 'Poziv na broj',
  paymentMethod: 'Način plaćanja',
  operator: 'Operater',
  fiscalNumber: 'Fiskalni broj',
  jir: 'JIR',
  zki: 'ZKI',
};

/** ======================== UTILITIES ======================== */
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
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

const downloadTXT = (text, fileName) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

// Parse Croatian number format (1.234,56 -> 1234.56)
const parseCroatianNumber = (str) => {
  if (!str) return 0;
  // Remove all spaces and convert Croatian format to standard
  const cleaned = String(str)
    .replace(/\s/g, '')
    .replace(/\./g, '')  // Remove thousand separators
    .replace(',', '.');  // Convert decimal comma to dot
  
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
};

// Parse Croatian date format (DD.MM.YYYY -> YYYY-MM-DD)
const parseCroatianDate = (str) => {
  if (!str) return null;
  
  // Try different date patterns
  for (const pattern of CROATIAN_PATTERNS.dateFormats) {
    const match = str.match(pattern);
    if (match) {
      if (match[0].includes('-') && match[1].length === 4) {
        // YYYY-MM-DD format
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      } else {
        // DD.MM.YYYY or DD/MM/YYYY format
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        return `${year}-${month}-${day}`;
      }
    }
  }
  
  return null;
};

// Extract OIB (Croatian tax ID - always 11 digits)
const extractOIB = (text) => {
  const oibPattern = /\b\d{11}\b/g;
  const matches = text.match(oibPattern);
  if (matches) {
    // Return the first valid OIB (11 digits that don't start with 0)
    return matches.find(m => !m.startsWith('0')) || matches[0];
  }
  return null;
};

// Extract IBAN
const extractIBAN = (text) => {
  const ibanPattern = /HR\d{2}\s?\d{4}\s?\d{3}\s?\d{4}\s?\d{4}\s?\d{3}/gi;
  const match = text.match(ibanPattern);
  return match ? match[0].replace(/\s/g, '') : null;
};

// Detect document type from text
const detectDocumentType = (text) => {
  const lowerText = text.toLowerCase();
  
  for (const [keyword, type] of Object.entries(CROATIAN_PATTERNS.documentTypes)) {
    if (lowerText.includes(keyword)) {
      return type;
    }
  }
  
  // Additional checks
  if (lowerText.includes('r-1') || lowerText.includes('račun')) return 'invoice';
  if (lowerText.includes('ponuda')) return 'quote';
  if (lowerText.includes('predračun')) return 'proforma';
  
  return 'invoice'; // default
};

// Extract company info (name, OIB, address)
const extractCompanyInfo = (text, isSupplier = true) => {
  const lines = text.split('\n');
  const info = {
    name: null,
    oib: null,
    address: null,
    iban: null,
  };
  
  // Find company section
  const keywords = isSupplier 
    ? ['prodavatelj', 'izdavatelj', 'dobavljač', 'pošiljatelj']
    : ['kupac', 'naručitelj', 'primatelj', 'platitelj'];
  
  let inSection = false;
  let sectionLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    // Check if we're entering the section
    if (keywords.some(k => lowerLine.includes(k))) {
      inSection = true;
      continue;
    }
    
    // If in section, collect lines until we hit another section or empty lines
    if (inSection) {
      if (lowerLine.includes('kupac') || lowerLine.includes('prodavatelj') || 
          lowerLine.includes('stavke') || lowerLine.includes('r.br') || 
          (line.trim() === '' && sectionLines.length > 2)) {
        break;
      }
      if (line.trim()) {
        sectionLines.push(line);
      }
    }
  }
  
  // Parse collected lines
  if (sectionLines.length > 0) {
    // First non-empty line is usually the company name
    info.name = sectionLines[0].trim();
    
    // Look for OIB in the section
    for (const line of sectionLines) {
      if (line.toLowerCase().includes('oib')) {
        const oib = extractOIB(line);
        if (oib) {
          info.oib = oib;
        }
      }
      // Address is usually after company name and before OIB
      if (!line.toLowerCase().includes('oib') && !line.includes(info.name) && line.length > 10) {
        if (!info.address) {
          info.address = line.trim();
        }
      }
    }
  }
  
  // Fallback: search in entire text with more specific patterns
  if (!info.oib) {
    const oibMatch = text.match(/OIB[:\s]+(\d{11})/i);
    if (oibMatch) {
      info.oib = oibMatch[1];
    }
  }
  
  return info;
};

// Extract invoice items from text
const extractItems = (text) => {
  const items = [];
  const lines = text.split('\n');
  
  // Find the start of items table
  let tableStart = -1;
  let tableEnd = lines.length;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('r.br') || line.includes('rbr') || line.includes('naziv') || 
        line.includes('opis') || line.includes('artikl')) {
      tableStart = i + 1;
      break;
    }
  }
  
  // Find the end of items table
  for (let i = tableStart; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes('ukupno') || line.includes('osnovica') || line.includes('pdv') || 
        line.includes('sveukupno') || line.includes('napomena')) {
      tableEnd = i;
      break;
    }
  }
  
  // Parse items
  if (tableStart > 0) {
    for (let i = tableStart; i < tableEnd; i++) {
      const line = lines[i].trim();
      if (!line || line.length < 5) continue;
      
      // Try to parse item line
      // Common patterns:
      // 1. Broj | Opis | Količina | JM | Cijena | Iznos
      // 2. Opis Količina Cijena Ukupno
      
      // Pattern 1: Line starts with number (item number)
      const itemPattern1 = /^(\d+\.?)\s+(.+?)\s+(\d+[.,]?\d*)\s+(\w+)\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)/;
      const match1 = line.match(itemPattern1);
      
      if (match1) {
        items.push({
          position: parseInt(match1[1]),
          description: match1[2].trim(),
          quantity: parseCroatianNumber(match1[3]),
          unit: match1[4],
          unitPrice: parseCroatianNumber(match1[5]),
          totalPrice: parseCroatianNumber(match1[6]),
        });
        continue;
      }
      
      // Pattern 2: Line without item number
      const itemPattern2 = /^(.+?)\s+(\d+[.,]?\d*)\s+(\w{1,5})\s+(\d+[.,]\d+)\s+(\d+[.,]\d+)/;
      const match2 = line.match(itemPattern2);
      
      if (match2) {
        items.push({
          position: items.length + 1,
          description: match2[1].trim(),
          quantity: parseCroatianNumber(match2[2]),
          unit: match2[3],
          unitPrice: parseCroatianNumber(match2[4]),
          totalPrice: parseCroatianNumber(match2[5]),
        });
        continue;
      }
      
      // Pattern 3: Simplified (description, quantity, price)
      const itemPattern3 = /^(.+?)\s+(\d+[.,]?\d*)\s+(\d+[.,]\d+)$/;
      const match3 = line.match(itemPattern3);
      
      if (match3) {
        const qty = parseCroatianNumber(match3[2]);
        const total = parseCroatianNumber(match3[3]);
        items.push({
          position: items.length + 1,
          description: match3[1].trim(),
          quantity: qty,
          unit: 'kom',
          unitPrice: qty > 0 ? total / qty : total,
          totalPrice: total,
        });
      }
    }
  }
  
  return items;
};

// Extract totals from invoice
const extractTotals = (text) => {
  const totals = {
    subtotal: 0,
    vatAmount: 0,
    totalAmount: 0,
    vatRate: 25, // Default Croatian VAT
  };
  
  // Extract subtotal (osnovica)
  const subtotalPatterns = [
    /osnovica[:\s]+(\d+[.,]\d+)/i,
    /porezna\s+osnovica[:\s]+(\d+[.,]\d+)/i,
    /neto[:\s]+(\d+[.,]\d+)/i,
    /bez\s+pdv[:\s]+(\d+[.,]\d+)/i,
  ];
  
  for (const pattern of subtotalPatterns) {
    const match = text.match(pattern);
    if (match) {
      totals.subtotal = parseCroatianNumber(match[1]);
      break;
    }
  }
  
  // Extract VAT amount
  const vatPatterns = [
    /pdv[:\s]+(\d+[.,]\d+)/i,
    /porez[:\s]+(\d+[.,]\d+)/i,
    /pdv\s+25%[:\s]+(\d+[.,]\d+)/i,
  ];
  
  for (const pattern of vatPatterns) {
    const match = text.match(pattern);
    if (match) {
      totals.vatAmount = parseCroatianNumber(match[1]);
      break;
    }
  }
  
  // Extract total amount
  const totalPatterns = [
    /ukupno\s+za\s+platiti[:\s]+(\d+[.,]\d+)/i,
    /sveukupno[:\s]+(\d+[.,]\d+)/i,
    /ukupno[:\s]+(\d+[.,]\d+)/i,
    /za\s+platiti[:\s]+(\d+[.,]\d+)/i,
    /total[:\s]+(\d+[.,]\d+)/i,
  ];
  
  for (const pattern of totalPatterns) {
    const match = text.match(pattern);
    if (match) {
      totals.totalAmount = parseCroatianNumber(match[1]);
      break;
    }
  }
  
  // If we don't have all values, try to calculate missing ones
  if (totals.subtotal && totals.vatAmount && !totals.totalAmount) {
    totals.totalAmount = totals.subtotal + totals.vatAmount;
  } else if (totals.subtotal && totals.totalAmount && !totals.vatAmount) {
    totals.vatAmount = totals.totalAmount - totals.subtotal;
  } else if (totals.vatAmount && totals.totalAmount && !totals.subtotal) {
    totals.subtotal = totals.totalAmount - totals.vatAmount;
  }
  
  // Calculate VAT rate if possible
  if (totals.subtotal && totals.vatAmount) {
    totals.vatRate = Math.round((totals.vatAmount / totals.subtotal) * 100);
  }
  
  return totals;
};

// Mock images for items
const mockImages = {
  PROFIL: 'https://images.unsplash.com/photo-1565191999001-551c187427bb?w=200&h=200&fit=crop',
  STAKLO: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  BRTVA: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=200&h=200&fit=crop',
  VIJAK: 'https://images.unsplash.com/photo-1609205807107-e8ec7120f9de?w=200&h=200&fit=crop',
  KLIJEŠTA: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=200&h=200&fit=crop',
  DEFAULT: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
};

const getItemImage = (description) => {
  if (!description) return mockImages.DEFAULT;
  const upper = description.toUpperCase();
  if (upper.includes('PROFIL') || upper.includes('ALU')) return mockImages.PROFIL;
  if (upper.includes('STAKLO') || upper.includes('GLASS')) return mockImages.STAKLO;
  if (upper.includes('BRTVA') || upper.includes('SEAL')) return mockImages.BRTVA;
  if (upper.includes('VIJAK') || upper.includes('SCREW')) return mockImages.VIJAK;
  if (upper.includes('KLIJEŠTA') || upper.includes('CLIP')) return mockImages.KLIJEŠTA;
  return mockImages.DEFAULT;
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

  // UI State
  const [viewMode, setViewMode] = useState('normal'); // normal, focus, creation
  const [editMode, setEditMode] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showDebug, setShowDebug] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Project & Position
  const [projects, setProjects] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [confirmedDocuments, setConfirmedDocuments] = useState([]);

  // Creation
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [creationType, setCreationType] = useState(null);
  const [creationData, setCreationData] = useState(null);

  // Search & Filters
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Settings
  const [settings, setSettings] = useState({
    autoAnalyze: true,
    showThumbnails: true,
    compactView: false,
    darkMode: false,
    language: 'hr',
    exportFormat: 'json',
    ocrLanguage: 'hrv+eng',
    confidenceThreshold: 0.7,
    useLLM: false, // Default to false since LLM might not be available
  });

  // Refs
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Current document
  const currentDocument = documents[currentDocIndex];

  // Initialize
  useEffect(() => {
    GlobalWorkerOptions.workerSrc = pdfWorker;
    loadMockData();
    checkLLMStatus();
  }, []);

  // Load mock data
  const loadMockData = useCallback(() => {
    setProjects([
      { id: 'PRJ-001', name: 'Neboder Centar', client: 'Invest Group d.o.o.', location: 'Zagreb' },
      { id: 'PRJ-002', name: 'Shopping Mall West', client: 'Mall Holdings', location: 'Split' },
      { id: 'PRJ-003', name: 'Office Park Nova', client: 'Business Park d.o.o.', location: 'Rijeka' },
      { id: 'PRJ-004', name: 'Hotel Adriatic', client: 'Tourism Group', location: 'Dubrovnik' },
      { id: 'PRJ-005', name: 'Residential Complex', client: 'Urban Development', location: 'Osijek' },
    ]);

    setPositions([
      { id: 'POS-001', name: 'CW-12', floor: 1, project: 'PRJ-001', type: 'curtain_wall' },
      { id: 'POS-002', name: 'D-45', floor: 2, project: 'PRJ-001', type: 'door' },
      { id: 'POS-003', name: 'W-78', floor: 3, project: 'PRJ-002', type: 'window' },
      { id: 'POS-004', name: 'P-90', floor: 1, project: 'PRJ-003', type: 'partition' },
      { id: 'POS-005', name: 'F-123', floor: 4, project: 'PRJ-001', type: 'facade' },
    ]);
  }, []);

  // Check LLM status
  const checkLLMStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:1234/v1/models');
      setLlmStatus(res.ok ? 'connected' : 'offline');
    } catch {
      setLlmStatus('offline');
    }
  }, []);

  // Progress management
  const updateProgress = useCallback((step, percent) => {
    setProgressStep(step);
    setProgress(percent);
  }, []);

  // Process multiple files
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
        processedDocs.push({
          id: `DOC-${Date.now()}-${i}`,
          fileName: file.name,
          error: err.message,
          status: 'error',
        });
      }
    }

    setDocuments(processedDocs);
    setCurrentDocIndex(0);
    setProcessing(false);
    updateProgress('Završeno!', 100);

    setTimeout(() => {
      setProgress(0);
      setProgressStep('');
    }, 2000);
  }, [updateProgress]);

  // Process single file
  const processSingleFile = useCallback(async (file) => {
    const extractedData = await extractStructuredData(file);
    const analysis = await analyzeWithLLM(extractedData);
    const preview = await createPreview(file);

    return {
      id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      uploadDate: new Date().toISOString(),
      rawData: extractedData,
      analysis,
      preview,
      status: 'processed',
      documentType: analysis.documentType || 'invoice',
    };
  }, []);

  // Extract structured data from files
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
      throw new Error(`Greška pri čitanju datoteke: ${err.message}`);
    }
  }, []);

  // Extract from PDF
  const extractFromPDF = useCallback(async (file) => {
    updateProgress('Čitanje PDF strukture...', 30);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;

    const structuredData = {
      pages: [],
      textBlocks: [],
      coordinates: [],
      rawText: '',
      metadata: { numPages: pdf.numPages, fileName: file.name },
    };

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      updateProgress(`PDF stranica ${pageNum}/${pdf.numPages}...`, 30 + (pageNum / pdf.numPages) * 20);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items.map(item => item.str).join(' ');
      structuredData.rawText += pageText + '\n\n';
      structuredData.pages.push({ pageNumber: pageNum, text: pageText });
      
      // Store text with position info for better parsing
      structuredData.textBlocks.push(...textContent.items.map(item => ({
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
      })));
    }

    return structuredData;
  }, [updateProgress]);

  // Extract from image using OCR
  const extractFromImage = useCallback(async (file) => {
    updateProgress('OCR analiza slike...', 40);
    try {
      const result = await Tesseract.recognize(file, settings.ocrLanguage, {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            updateProgress(`OCR: ${Math.round(info.progress * 100)}%`, 40 + info.progress * 30);
          }
        },
      });
      
      return {
        rawText: result.data.text,
        confidence: result.data.confidence,
        words: result.data.words,
        lines: result.data.lines,
      };
    } catch (err) {
      console.error('OCR failed:', err);
      return { rawText: '', error: err.message };
    }
  }, [settings.ocrLanguage, updateProgress]);

  // Extract from spreadsheet
  const extractFromSpreadsheet = useCallback(async (file) => {
    updateProgress('Čitanje Excel/CSV...', 40);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    // Try to parse as invoice if it looks like one
    let structuredText = '';
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
    
    // Build text representation
    data.forEach(row => {
      structuredText += row.join('\t') + '\n';
    });
    
    return {
      rawText: structuredText,
      rows: data,
      jsonData,
      metadata: { fileName: file.name, sheets: workbook.SheetNames },
    };
  }, [updateProgress]);

  // Extract from text file
  const extractFromText = useCallback(async (file) => {
    updateProgress('Čitanje teksta...', 40);
    const text = await file.text();
    return { rawText: text, metadata: { fileName: file.name } };
  }, [updateProgress]);

  // Analyze with LLM
  const analyzeWithLLM = useCallback(async (extractedData) => {
    if (llmStatus !== 'connected' || !settings.useLLM) {
      return analyzeWithRegex(extractedData);
    }

    updateProgress('LLM analiza u tijeku...', 70);

    try {
      const systemPrompt = `Ti si ekspert za analizu hrvatskih poslovnih dokumenata. 
      Izvuci sljedeće podatke iz dokumenta i vrati ih kao JSON:
      - documentType: tip dokumenta (invoice, quote, proforma, delivery, receipt)
      - documentNumber: broj dokumenta
      - date: datum (format YYYY-MM-DD)
      - dueDate: datum dospijeća (format YYYY-MM-DD)
      - supplier: {name, oib, address, iban}
      - buyer: {name, oib, address}
      - items: [{position, code, description, quantity, unit, unitPrice, totalPrice}]
      - totals: {subtotal, vatAmount, totalAmount, vatRate}
      - paymentInfo: {iban, reference, method}
      - additionalInfo: {operator, fiscalNumber, jir, zki}
      
      Brojeve formatiraj kao decimalne brojeve (npr. 1234.56).
      Datume formatiraj kao YYYY-MM-DD.`;
      
      const response = await fetch(LM_STUDIO_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LM_STUDIO_CONFIG.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Analiziraj sljedeći dokument:\n\n${extractedData.rawText}` },
          ],
          temperature: LM_STUDIO_CONFIG.temperature,
          max_tokens: LM_STUDIO_CONFIG.max_tokens,
        }),
      });

      const result = await response.json();
      const content = result?.choices?[0]?.message?.content || '';
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsed.confidence = 0.9; // High confidence for LLM results
          return parsed;
        }
      } catch (e) {
        console.error('JSON parse error:', e);
      }

      throw new Error('Invalid LLM response format');
    } catch (err) {
      console.error('LLM failed:', err);
      return analyzeWithRegex(extractedData);
    }
  }, [llmStatus, settings.useLLM, updateProgress]);

  // Enhanced regex analysis for Croatian documents
  const analyzeWithRegex = useCallback((extractedData) => {
    updateProgress('Analiza dokumenta...', 80);
    
    const text = extractedData.rawText || '';
    if (!text) {
      return {
        documentType: 'invoice',
        confidence: 0,
        error: 'No text extracted',
      };
    }
    
    // Detect document type
    const documentType = detectDocumentType(text);
    
    // Extract document number
    let documentNumber = null;
    const docNumPatterns = [
      /Račun\s+br[.:]?\s*([A-Z0-9\-\/]+)/i,
      /Broj\s+računa[:\s]+([A-Z0-9\-\/]+)/i,
      /Broj[:\s]+([A-Z0-9\-\/]+)/i,
      /R-1[:\s]+([A-Z0-9\-\/]+)/i,
      /Invoice\s+No[.:]?\s*([A-Z0-9\-\/]+)/i,
    ];
    
    for (const pattern of docNumPatterns) {
      const match = text.match(pattern);
      if (match) {
        documentNumber = match[1].trim();
        break;
      }
    }
    
    // Extract dates
    const date = parseCroatianDate(text.match(/Datum[:\s]+([^\n]+)/i)?.[1] || '');
    const dueDate = parseCroatianDate(text.match(/(?:Dospijeće|Valuta|Rok plaćanja)[:\s]+([^\n]+)/i)?.[1] || '');
    
    // Extract company info
    const supplier = extractCompanyInfo(text, true);
    const buyer = extractCompanyInfo(text, false);
    
    // Extract IBAN and payment reference
    const iban = extractIBAN(text);
    const referenceMatch = text.match(/Poziv\s+na\s+broj[:\s]+([^\n]+)/i);
    const reference = referenceMatch ? referenceMatch[1].trim() : null;
    
    // Extract payment method
    const paymentMatch = text.match(/Način\s+plaćanja[:\s]+([^\n]+)/i);
    const paymentMethod = paymentMatch ? paymentMatch[1].trim() : null;
    
    // Extract items
    const items = extractItems(text);
    
    // Extract totals
    const totals = extractTotals(text);
    
    // Extract additional fiscal info
    const fiscalMatch = text.match(/Fiskalni\s+broj\s+računa[:\s]+(\d+\/\d+\/\d+)/i);
    const jirMatch = text.match(/JIR[:\s]+([A-Za-z0-9\-]+)/i);
    const zkiMatch = text.match(/ZKI[:\s]+([A-Za-z0-9\-]+)/i);
    const operatorMatch = text.match(/Operater[:\s]+([^\n]+)/i);
    
    return {
      documentType,
      confidence: 0.75,
      documentNumber,
      date,
      dueDate,
      supplier,
      buyer,
      items,
      totals,
      paymentInfo: {
        iban,
        reference,
        method: paymentMethod,
      },
      additionalInfo: {
        operator: operatorMatch ? operatorMatch[1].trim() : null,
        fiscalNumber: fiscalMatch ? fiscalMatch[1] : null,
        jir: jirMatch ? jirMatch[1] : null,
        zki: zkiMatch ? zkiMatch[1] : null,
      },
    };
  }, [updateProgress]);

  // Create preview
  const createPreview = useCallback(async (file) => {
    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;

        return { type: 'pdf', dataUrl: canvas.toDataURL(), pageCount: pdf.numPages };
      } else if (file.type.startsWith('image/')) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ type: 'image', dataUrl: reader.result });
          reader.readAsDataURL(file);
        });
      }
      return { type: 'text', content: 'Pregled nije dostupan' };
    } catch (err) {
      console.error('Preview error:', err);
      return { type: 'text', content: 'Pregled nije uspeo' };
    }
  }, []);

  // Export functions
  const exportItemsToExcel = useCallback(() => {
    if (!currentDocument?.analysis?.items) return;
    
    const wb = XLSX.utils.book_new();
    const itemsData = currentDocument.analysis.items.map((item) => ({
      Pozicija: item.position || '',
      Šifra: item.code || '',
      Opis: item.description || '',
      Količina: item.quantity || 0,
      Jedinica: item.unit || 'kom',
      'Jed. cijena': item.unitPrice || 0,
      Ukupno: item.totalPrice || 0,
      Materijal: item.material || '',
      Dimenzije: item.dimensions || '',
      Boja: item.color || '',
      Napomene: item.notes || '',
    }));
    
    const ws = XLSX.utils.json_to_sheet(itemsData);
    
    // Auto-size columns
    const cols = Object.keys(itemsData[0] || {}).map(key => ({
      wch: Math.max(key.length, ...itemsData.map(row => String(row[key]).length))
    }));
    ws['!cols'] = cols;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Stavke');
    XLSX.writeFile(wb, UI_TEXT.exportItemsXlsx(currentDocument.analysis.documentNumber));
  }, [currentDocument]);

  const exportFullToExcel = useCallback(() => {
    if (!currentDocument?.analysis) return;
    
    const wb = XLSX.utils.book_new();
    const data = currentDocument.analysis;

    // Items sheet
    const itemsSheet = XLSX.utils.json_to_sheet(
      (data.items || []).map((item) => ({
        Pozicija: item.position || '',
        Šifra: item.code || '',
        Opis: item.description || '',
        Količina: item.quantity || 0,
        Jedinica: item.unit || 'kom',
        'Jed. cijena': item.unitPrice || 0,
        Ukupno: item.totalPrice || 0,
      }))
    );
    XLSX.utils.book_append_sheet(wb, itemsSheet, 'Stavke');

    // Header sheet
    const headerSheet = XLSX.utils.json_to_sheet([{
      'Tip dokumenta': DOCUMENT_TYPES[data.documentType]?.label || '',
      'Broj dokumenta': data.documentNumber || '',
      Datum: data.date || '',
      Dospijeće: data.dueDate || '',
      Dobavljač: data.supplier?.name || '',
      'OIB dobavljača': data.supplier?.oib || '',
      'Adresa dobavljača': data.supplier?.address || '',
      Kupac: data.buyer?.name || '',
      'OIB kupca': data.buyer?.oib || '',
      IBAN: data.paymentInfo?.iban || '',
      'Poziv na broj': data.paymentInfo?.reference || '',
      Osnovica: data.totals?.subtotal || 0,
      PDV: data.totals?.vatAmount || 0,
      Ukupno: data.totals?.totalAmount || 0,
    }]);
    XLSX.utils.book_append_sheet(wb, headerSheet, 'Zaglavlje');
    
    XLSX.writeFile(wb, UI_TEXT.exportDocXlsx(data.documentNumber));
  }, [currentDocument]);

  const exportToTXT = useCallback(() => {
    if (!currentDocument?.analysis) return;
    
    const data = currentDocument.analysis;
    let content = `DOKUMENT: ${DOCUMENT_TYPES[data.documentType]?.label || 'Nepoznato'}\n\n`;
    content += `Broj: ${data.documentNumber || 'N/A'}\n`;
    content += `Datum: ${data.date || 'N/A'}\n`;
    content += `Dospijeće: ${data.dueDate || 'N/A'}\n\n`;

    content += `DOBAVLJAČ:\n${data.supplier?.name || 'N/A'}\n`;
    content += `OIB: ${data.supplier?.oib || 'N/A'}\n`;
    content += `Adresa: ${data.supplier?.address || 'N/A'}\n\n`;
    
    content += `KUPAC:\n${data.buyer?.name || 'N/A'}\n`;
    content += `OIB: ${data.buyer?.oib || 'N/A'}\n\n`;
    
    if (data.paymentInfo?.iban) {
      content += `PODACI ZA PLAĆANJE:\n`;
      content += `IBAN: ${data.paymentInfo.iban}\n`;
      content += `Poziv na broj: ${data.paymentInfo.reference || 'N/A'}\n`;
      content += `Način plaćanja: ${data.paymentInfo.method || 'N/A'}\n\n`;
    }

    content += `STAVKE:\n`;
    content += `${'Poz.'.padEnd(5)} ${'Šifra'.padEnd(15)} ${'Opis'.padEnd(40)} `;
    content += `${'Kol.'.padEnd(8)} ${'Cijena'.padEnd(12)} ${'Ukupno'.padEnd(12)}\n`;
    content += `${'-'.repeat(95)}\n`;
    
    (data.items || []).forEach((item) => {
      content += `${String(item.position || '').padEnd(5)} `;
      content += `${String(item.code || '').padEnd(15)} `;
      content += `${String(item.description || '').substring(0, 40).padEnd(40)} `;
      content += `${String(item.quantity || '0').padEnd(8)} `;
      content += `${String((item.unitPrice || 0).toFixed(2)).padEnd(12)} `;
      content += `${String((item.totalPrice || 0).toFixed(2)).padEnd(12)}\n`;
    });
    
    content += `\n${'-'.repeat(95)}\n`;
    content += `Osnovica: ${(data.totals?.subtotal || 0).toFixed(2)} EUR\n`;
    content += `PDV (${data.totals?.vatRate || 25}%): ${(data.totals?.vatAmount || 0).toFixed(2)} EUR\n`;
    content += `SVEUKUPNO: ${(data.totals?.totalAmount || 0).toFixed(2)} EUR\n`;

    downloadTXT(content, UI_TEXT.exportDocTxtName(data.documentNumber));
  }, [currentDocument]);

  const exportCurrentToJSON = useCallback(() => {
    if (!currentDocument) return;
    
    const payload = {
      id: currentDocument.id,
      fileName: currentDocument.fileName,
      fileType: currentDocument.fileType,
      uploadDate: currentDocument.uploadDate,
      analysis: currentDocument.analysis,
      documentType: currentDocument.documentType,
      preview: currentDocument.preview?.type || null,
    };
    
    downloadJSON(payload, UI_TEXT.exportDocJsonName(currentDocument.analysis?.documentNumber));
  }, [currentDocument]);

  const exportAllToJSON = useCallback(() => {
    const payload = documents.map(d => ({
      id: d.id,
      fileName: d.fileName,
      type: d.documentType,
      analysis: d.analysis,
      total: d.analysis?.totals?.totalAmount || 0,
    }));
    
    downloadJSON(payload, UI_TEXT.exportAllJsonName());
  }, [documents]);

  // Document update
  const updateCurrentDocument = useCallback((field, value) => {
    if (!currentDocument) return;
    setDocuments(prev =>
      prev.map((doc, idx) => 
        idx === currentDocIndex 
          ? { ...doc, analysis: { ...doc.analysis, [field]: value } } 
          : doc
      )
    );
  }, [currentDocument, currentDocIndex]);

  const updateDocumentType = useCallback((type) => {
    updateCurrentDocument('documentType', type);
  }, [updateCurrentDocument]);

  // Confirm documents
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
    alert(`${documents.length} dokumenata uspješno potvrđeno i pridruženo projektu!`);
  }, [documents, selectedProject, selectedPosition]);

  // Start new batch
  const startNewBatch = useCallback(() => {
    if (confirm(UI_TEXT.confirmNewBatch)) {
      setDocuments([]);
      setCurrentDocIndex(0);
      setSelectedProject(null);
      setSelectedPosition(null);
      setError(null);
      setProgress(0);
      setProgressStep('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  // Create internal document
  const createInternalDocument = useCallback((type, sourceData) => {
    const template = {
      documentType: type,
      documentNumber: `${type.toUpperCase()}-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      issueDate: new Date().toISOString().split('T')[0],
      supplier: { 
        name: 'Naša tvrtka d.o.o.', 
        oib: '12345678901', 
        address: 'Ulica 123, 10000 Zagreb' 
      },
      buyer: sourceData && sourceData.buyer ? sourceData.buyer : { name: 'Kupac', oib: '', address: '' },
      items: sourceData && sourceData.items ? sourceData.items : [],
      totals: sourceData && sourceData.totals ? sourceData.totals : { subtotal: 0, vatAmount: 0, totalAmount: 0 },
      status: 'draft',
      createdFrom: sourceData && sourceData.documentNumber ? sourceData.documentNumber : null,
    };

    if (type === 'delivery') {
      template.delivery = {
        address: (sourceData && sourceData.delivery && sourceData.delivery.address) 
          ? sourceData.delivery.address 
          : (sourceData && sourceData.buyer && sourceData.buyer.address) 
            ? sourceData.buyer.address 
            : '',
        date: new Date().toISOString().split('T')[0],
        method: 'Kamionski prijevoz',
      };
    } else if (type === 'transfer') {
      template.transfer = {
        fromWarehouse: 'Glavno skladište',
        toWarehouse: 'Gradilište',
        reason: 'Transfer materijala na gradilište',
      };
    } else if (type === 'receipt') {
      template.receipt = {
        receivedBy: 'Skladište',
        inspectedBy: 'Kontrolor kvalitete',
        condition: 'U redu',
      };
    }
    
    return template;
  }, []);

  // Save created document
  const saveCreatedDocument = useCallback((docData) => {
    const newDoc = {
      id: `CREATED-${Date.now()}`,
      ...docData,
      createdDate: new Date().toISOString(),
      project: selectedProject,
      position: selectedPosition,
    };
    
    setConfirmedDocuments(prev => [...prev, newDoc]);
    setShowCreationModal(false);
    setCreationType(null);
    setCreationData(null);
    alert(UI_TEXT.createdNotice(DOCUMENT_TYPES[docData.documentType]?.label || 'Dokument'));
  }, [selectedProject, selectedPosition]);

  // Handle file input
  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processMultipleFiles(files);
    }
  }, [processMultipleFiles]);

  // Handle camera capture
  const handleCameraCapture = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      processMultipleFiles(files);
    }
  }, [processMultipleFiles]);

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add('drag-over');
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove('drag-over');
    }
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processMultipleFiles(files);
    }
  }, [processMultipleFiles]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    
    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.fileName.toLowerCase().includes(query) ||
        doc.analysis?.documentNumber?.toLowerCase().includes(query) ||
        doc.analysis?.supplier?.name?.toLowerCase().includes(query) ||
        doc.analysis?.buyer?.name?.toLowerCase().includes(query)
      );
    }
    
    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === typeFilter);
    }
    
    return filtered;
  }, [documents, searchText, typeFilter]);

  // Render
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {UI_TEXT.appTitle}
              </h1>
              
              <div className="flex items-center gap-4 mt-3">
                {/* LLM status */}
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    llmStatus === 'connected' 
                      ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                      : 'bg-red-500 shadow-lg shadow-red-500/50'
                  } animate-pulse`} />
                  <span className="text-sm font-medium text-gray-700">
                    {UI_TEXT.lmStudio}: {' '}
                    <span className={llmStatus === 'connected' ? 'text-green-600' : 'text-red-600'}>
                      {llmStatus === 'connected' ? 'Online' : 'Offline (koristi se lokalna analiza)'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    {UI_TEXT.docsCount(documents.length, confirmedDocuments.length)}
                  </span>
                </div>

                <button 
                  onClick={() => setShowDebug(!showDebug)} 
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {UI_TEXT.btnShowDebug(showDebug)}
                </button>

                <button 
                  onClick={() => setShowSettings(!showSettings)} 
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              {/* View Mode */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[
                  { key: 'normal', label: 'Normal', icon: Grid3x3 },
                  { key: 'focus', label: 'Focus', icon: Focus },
                  { key: 'creation', label: 'Create', icon: FilePlus },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setViewMode(m.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      viewMode === m.key 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <m.icon size={16} />
                    {m.label}
                  </button>
                ))}
              </div>

              {documents.length > 0 && (
                <button 
                  onClick={startNewBatch} 
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  {UI_TEXT.newBatch}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {processing && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">{progress}%</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">{progressStep}</span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Zone */}
        {documents.length === 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.xlsx,.xls,.txt,.json,image/*"
              className="hidden"
              onChange={handleFileInput}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCameraCapture}
            />
            <div 
              ref={dropZoneRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="border-2 border-dashed border-purple-300 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/30 transition-all group"
              style={{
                transition: 'all 0.3s ease',
              }}
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 via-blue-100 to-cyan-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Upload className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">{UI_TEXT.dropHereTitle}</h2>
              <p className="text-gray-600 mb-4">{UI_TEXT.dropHereSub}</p>
              <div className="flex justify-center gap-4 text-sm text-gray-500">
                <span>📄 PDF</span>
                <span>📊 Excel</span>
                <span>🖼️ Slike</span>
                <span>📋 CSV</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-4 h-4 inline mr-2" />
                Slikaj dokument
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-900">{UI_TEXT.errorTitle}</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="p-1 hover:bg-red-100 rounded transition-colors"
            >
              <X size={16} className="text-red-500" />
            </button>
          </div>
        )}

        {/* Main Content */}
        {documents.length > 0 && currentDocument && (
          <>
            {/* Document Navigation */}
            {documents.length > 1 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-gray-200/50 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">
                    Dokumenti ({currentDocIndex + 1}/{documents.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentDocIndex(Math.max(0, currentDocIndex - 1))}
                      disabled={currentDocIndex === 0}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentDocIndex(Math.min(documents.length - 1, currentDocIndex + 1))}
                      disabled={currentDocIndex === documents.length - 1}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Document tabs */}
                <div className="flex gap-2 overflow-x-auto">
                  {documents.map((doc, idx) => (
                    <button
                      key={doc.id}
                      onClick={() => setCurrentDocIndex(idx)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                        idx === currentDocIndex 
                          ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FileText size={14} />
                      {doc.fileName}
                      {doc.status === 'error' && (
                        <AlertCircle size={14} className="text-red-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* View Modes */}
            {viewMode === 'focus' ? (
              <FocusModeView
                document={currentDocument}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
                onBack={() => setViewMode('normal')}
              />
            ) : viewMode === 'creation' ? (
              <CreationView
                documents={documents}
                onBack={() => setViewMode('normal')}
                onCreateDocument={createInternalDocument}
                onSaveDocument={saveCreatedDocument}
              />
            ) : (
              /* Normal View */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Project Assignment */}
                  <ProjectAssignment
                    projects={projects}
                    positions={positions}
                    selectedProject={selectedProject}
                    selectedPosition={selectedPosition}
                    onProjectChange={setSelectedProject}
                    onPositionChange={setSelectedPosition}
                  />

                  {/* Document Analysis */}
                  <DocumentAnalysis
                    document={currentDocument}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    onUpdateDocument={updateCurrentDocument}
                    onUpdateType={updateDocumentType}
                    onFocusMode={() => setViewMode('focus')}
                  />

                  {/* Export & Actions */}
                  <ExportActions
                    currentDocument={currentDocument}
                    documents={documents}
                    selectedProject={selectedProject}
                    selectedPosition={selectedPosition}
                    onExportItemsExcel={exportItemsToExcel}
                    onExportFullExcel={exportFullToExcel}
                    onExportTXT={exportToTXT}
                    onExportCurrentJSON={exportCurrentToJSON}
                    onExportAllJSON={exportAllToJSON}
                    onConfirmAll={confirmAllDocuments}
                    onCreateInternal={(type) => {
                      setCreationType(type);
                      setCreationData(createInternalDocument(type, currentDocument.analysis));
                      setShowCreationModal(true);
                    }}
                  />
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                  {/* Preview */}
                  {currentDocument.preview?.dataUrl && (
                    <DocumentPreview
                      document={currentDocument}
                      showPreview={showPreview}
                      setShowPreview={setShowPreview}
                      onFocusMode={() => setViewMode('focus')}
                    />
                  )}

                  {/* Quick Stats */}
                  <QuickStats document={currentDocument} />

                  {/* Recent Documents */}
                  {confirmedDocuments.length > 0 && (
                    <RecentDocuments documents={confirmedDocuments} />
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Creation Modal */}
        {showCreationModal && creationData && (
          <DocumentCreationModal
            type={creationType}
            data={creationData}
            onSave={saveCreatedDocument}
            onClose={() => {
              setShowCreationModal(false);
              setCreationType(null);
              setCreationData(null);
            }}
          />
        )}

        {/* Confirmed Documents Grid */}
        {confirmedDocuments.length > 0 && (
          <ConfirmedDocumentsGrid documents={confirmedDocuments} />
        )}

        {/* Debug Panel */}
        {showDebug && currentDocument && (
          <DebugPanel document={currentDocument} llmStatus={llmStatus} />
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

      <style jsx>{`
        .drag-over {
          border-color: #7c3aed !important;
          background-color: rgba(124, 58, 237, 0.05) !important;
        }
      `}</style>
    </div>
  );
}

/** ======================== SUB-COMPONENTS ======================== */

function ProjectAssignment({ projects, positions, selectedProject, selectedPosition, onProjectChange, onPositionChange }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">
        <span className="inline-flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-600" />
          {UI_TEXT.projectAssignment}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {UI_TEXT.projectLabel}
          </label>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => onProjectChange(projects.find(p => p.id === e.target.value))}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Odaberi projekt --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.client})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {UI_TEXT.positionLabel}
          </label>
          <select
            value={selectedPosition?.id || ''}
            onChange={(e) => onPositionChange(positions.find(p => p.id === e.target.value))}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Bez pozicije --</option>
            {positions
              .filter(p => !selectedProject || p.project === selectedProject.id)
              .map(pos => (
                <option key={pos.id} value={pos.id}>
                  {pos.name} (Kat {pos.floor})
                </option>
              ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function DocumentAnalysis({ document, editMode, setEditMode, onUpdateDocument, onUpdateType, onFocusMode }) {
  if (!document?.analysis) {
    return (
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
        <p className="text-gray-500">Nema podataka analize</p>
      </div>
    );
  }

  const data = document.analysis;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{UI_TEXT.docAnalysis}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              editMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {editMode ? <CheckCircle2 size={16} /> : <Edit3 size={16} />}
            {editMode ? UI_TEXT.save : UI_TEXT.edit}
          </button>
          <button
            onClick={onFocusMode}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Focus size={16} />
            {UI_TEXT.focusMode}
          </button>
        </div>
      </div>

      {/* Document Type Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-1">
          {UI_TEXT.docType}
        </label>
        <select
          value={document.documentType || 'invoice'}
          onChange={(e) => onUpdateType(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
            <option key={key} value={key}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Analysis Details */}
      <DocumentAnalysisView document={document} editMode={editMode} onUpdate={onUpdateDocument} />
    </div>
  );
}

function DocumentAnalysisView({ document, editMode = false, onUpdate }) {
  if (!document?.analysis) return <div>Nema podataka analize</div>;
  const data = document.analysis;

  // Function to copy text to clipboard
  const copyToClipboard = (text) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        // Optional: Show a toast notification
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {UI_TEXT.documentNumber}
          </label>
          <div className="p-3 bg-gray-50 rounded-lg font-medium flex items-center justify-between">
            <span>{data.documentNumber || 'N/A'}</span>
            {data.documentNumber && (
              <button
                onClick={() => copyToClipboard(data.documentNumber)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Copy size={14} />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {UI_TEXT.date}
          </label>
          <div className="p-3 bg-gray-50 rounded-lg">
            {data.date || 'N/A'}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            {UI_TEXT.dueDate}
          </label>
          <div className="p-3 bg-gray-50 rounded-lg">
            {data.dueDate || 'N/A'}
          </div>
        </div>
      </div>

      {/* Supplier & Buyer */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-3">{UI_TEXT.supplier}</h4>
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <div>
              <span className="text-xs text-gray-600">{UI_TEXT.name}:</span>
              <div className="font-medium">{data.supplier?.name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-xs text-gray-600">{UI_TEXT.oib}:</span>
              <div className="font-mono text-sm flex items-center gap-2">
                {data.supplier?.oib || 'N/A'}
                {data.supplier?.oib && (
                  <button
                    onClick={() => copyToClipboard(data.supplier.oib)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-600">{UI_TEXT.address}:</span>
              <div className="text-sm">{data.supplier?.address || 'N/A'}</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">{UI_TEXT.buyer}</h4>
          <div className="bg-green-50 p-4 rounded-lg space-y-2">
            <div>
              <span className="text-xs text-gray-600">{UI_TEXT.name}:</span>
              <div className="font-medium">{data.buyer?.name || 'N/A'}</div>
            </div>
            <div>
              <span className="text-xs text-gray-600">{UI_TEXT.oib}:</span>
              <div className="font-mono text-sm flex items-center gap-2">
                {data.buyer?.oib || 'N/A'}
                {data.buyer?.oib && (
                  <button
                    onClick={() => copyToClipboard(data.buyer.oib)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-600">{UI_TEXT.address}:</span>
              <div className="text-sm">{data.buyer?.address || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {data.paymentInfo && (data.paymentInfo.iban || data.paymentInfo.reference) && (
        <div>
          <h4 className="font-semibold mb-3">Podaci za plaćanje</h4>
          <div className="bg-purple-50 p-4 rounded-lg space-y-2">
            {data.paymentInfo.iban && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-600">{UI_TEXT.iban}:</span>
                  <div className="font-mono text-sm">{data.paymentInfo.iban}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(data.paymentInfo.iban)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
            {data.paymentInfo.reference && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-600">{UI_TEXT.reference}:</span>
                  <div className="font-mono text-sm">{data.paymentInfo.reference}</div>
                </div>
                <button
                  onClick={() => copyToClipboard(data.paymentInfo.reference)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy size={14} />
                </button>
              </div>
            )}
            {data.paymentInfo.method && (
              <div>
                <span className="text-xs text-gray-600">{UI_TEXT.paymentMethod}:</span>
                <div className="text-sm">{data.paymentInfo.method}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items Table */}
      {data.items && data.items.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">{UI_TEXT.items(data.items.length)}</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Šifra</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Opis</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Kol.</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Jed.</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Jed. cijena</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Ukupno</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.items.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium">{item.position || idx + 1}</td>
                    <td className="px-3 py-2 text-sm font-mono">{item.code || '-'}</td>
                    <td className="px-3 py-2 text-sm">{item.description}</td>
                    <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-sm text-center">{item.unit || 'kom'}</td>
                    <td className="px-3 py-2 text-sm text-right">{(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm text-right font-medium">{(item.totalPrice || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.items.length > 10 && (
              <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                ... i još {data.items.length - 10} stavki
              </div>
            )}
          </div>
        </div>
      )}

      {/* Totals */}
      {data.totals && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold mb-3">{UI_TEXT.totals}</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>{UI_TEXT.subtotal}:</span>
              <span className="font-medium">{(data.totals.subtotal || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span>{UI_TEXT.vat} ({data.totals.vatRate || 25}%):</span>
              <span className="font-medium">{(data.totals.vatAmount || 0).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-300">
              <span className="font-semibold">{UI_TEXT.total}:</span>
              <span className="font-bold text-lg text-blue-600">
                {(data.totals.totalAmount || 0).toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Fiscal Info */}
      {data.additionalInfo && (data.additionalInfo.jir || data.additionalInfo.zki) && (
        <div className="p-4 bg-amber-50 rounded-lg">
          <h4 className="font-semibold mb-3">Fiskalni podaci</h4>
          <div className="space-y-2 text-sm">
            {data.additionalInfo.operator && (
              <div>
                <span className="text-gray-600">{UI_TEXT.operator}:</span> {data.additionalInfo.operator}
              </div>
            )}
            {data.additionalInfo.fiscalNumber && (
              <div>
                <span className="text-gray-600">{UI_TEXT.fiscalNumber}:</span> {data.additionalInfo.fiscalNumber}
              </div>
            )}
            {data.additionalInfo.jir && (
              <div>
                <span className="text-gray-600">{UI_TEXT.jir}:</span> {data.additionalInfo.jir}
              </div>
            )}
            {data.additionalInfo.zki && (
              <div>
                <span className="text-gray-600">{UI_TEXT.zki}:</span> {data.additionalInfo.zki}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportActions({ 
  currentDocument, 
  documents, 
  selectedProject, 
  selectedPosition,
  onExportItemsExcel, 
  onExportFullExcel, 
  onExportTXT, 
  onExportCurrentJSON, 
  onExportAllJSON,
  onConfirmAll,
  onCreateInternal 
}) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
      <div className="space-y-4">
        {/* Export Options */}
        <div>
          <h3 className="font-semibold mb-3">{UI_TEXT.exportOptions}</h3>
          <div className="grid grid-cols-5 gap-3">
            <button 
              onClick={onExportItemsExcel}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
            >
              <FileSpreadsheet size={16} />
              {UI_TEXT.exportItems}
            </button>
            <button 
              onClick={onExportFullExcel}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <Layers size={16} />
              {UI_TEXT.exportFull}
            </button>
            <button 
              onClick={onExportTXT}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
            >
              <FileText size={16} />
              {UI_TEXT.exportDocTxt}
            </button>
            <button 
              onClick={onExportCurrentJSON}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <FileText size={16} />
              {UI_TEXT.exportJsonCurrent}
            </button>
            <button 
              onClick={onExportAllJSON}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <FileText size={16} />
              {UI_TEXT.exportJsonAll}
            </button>
          </div>
        </div>

        {/* Internal Document Creation */}
        <div>
          <h3 className="font-semibold mb-3">{UI_TEXT.createDocs}</h3>
          <div className="grid grid-cols-3 gap-3">
            {INTERNAL_DOCS.map(type => {
              const typeInfo = DOCUMENT_TYPES[type];
              const Icon = typeInfo.icon;
              return (
                <button
                  key={type}
                  onClick={() => onCreateInternal(type)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all border"
                  style={{ 
                    borderColor: `${typeInfo.color}40`,
                    backgroundColor: `${typeInfo.color}20`,
                    color: typeInfo.color
                  }}
                >
                  <Icon size={16} />
                  {typeInfo.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Confirm All */}
        <div className="pt-4 border-t">
          {!selectedProject ? (
            <div className="flex items-center gap-2 text-amber-700 p-3 bg-amber-50 rounded-lg border border-amber-200 mb-3">
              <AlertCircle size={16} />
              <span className="text-sm">{UI_TEXT.selectProjectHint}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-700 p-3 bg-green-50 rounded-lg border border-green-200 mb-3">
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
            className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
              selectedProject
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg'
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

function DocumentPreview({ document, showPreview, setShowPreview, onFocusMode }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{UI_TEXT.preview}</h3>
        <button 
          onClick={() => setShowPreview(!showPreview)} 
          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
        >
          {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showPreview && (
        <div 
          className="rounded-xl overflow-hidden border border-gray-200 bg-white cursor-pointer"
          onClick={onFocusMode}
        >
          <img 
            src={document.preview.dataUrl} 
            alt="Document Preview" 
            className="w-full max-h-48 object-contain"
          />
          <div className="p-2 bg-gray-50 border-t text-center">
            <span className="text-xs text-gray-600">{UI_TEXT.clickForFocus}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStats({ document }) {
  if (!document?.analysis) return null;
  const data = document.analysis;

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{UI_TEXT.quickAnalytics}</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-blue-700">{UI_TEXT.itemsCount}</span>
          <span className="font-bold text-blue-800">{data.items?.length || 0}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <span className="text-sm text-green-700">{UI_TEXT.totalValue}</span>
          <span className="font-bold text-green-800">
            {(data.totals?.totalAmount || 0).toFixed(2)} €
          </span>
        </div>
        <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
          <span className="text-sm text-amber-700">{UI_TEXT.vatAmount}</span>
          <span className="font-bold text-amber-800">
            {(data.totals?.vatAmount || 0).toFixed(2)} €
          </span>
        </div>
        {data.confidence && (
          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
            <span className="text-sm text-purple-700">{UI_TEXT.confidence}</span>
            <span className="font-bold text-purple-800">
              {(data.confidence * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentDocuments({ documents }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">{UI_TEXT.recentDocs}</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {documents.slice(-5).reverse().map(doc => {
          const typeInfo = DOCUMENT_TYPES[doc.documentType] || DOCUMENT_TYPES.invoice;
          const Icon = typeInfo.icon;
          
          return (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <Icon size={16} style={{ color: typeInfo.color }} />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {doc.analysis?.documentNumber || doc.fileName}
                </div>
                <div className="text-xs text-gray-600">
                  {new Date(doc.confirmedDate).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {(doc.analysis?.totals?.totalAmount || 0).toFixed(2)} €
                </div>
                {doc.project && (
                  <div className="text-xs text-blue-600">{doc.project.name}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FocusModeView({ document, zoomLevel, setZoomLevel, onBack }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Focus Mode - Analiza dokumenta</h2>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          {UI_TEXT.backToNormal}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-8 h-[80vh]">
        <div className="border-r pr-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Pregled dokumenta</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ZoomOut size={16} />
              </button>
              <span className="px-3 py-2 bg-gray-100 rounded-lg text-sm">{zoomLevel}%</span>
              <button 
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <div className="h-full overflow-auto border rounded-lg">
            {document.preview?.dataUrl && (
              <img
                src={document.preview.dataUrl}
                alt="Document"
                style={{ width: `${zoomLevel}%`, height: 'auto' }}
              />
            )}
          </div>
        </div>

        <div className="overflow-auto">
          <h3 className="font-semibold mb-4">Izvučeni podaci</h3>
          <DocumentAnalysisView document={document} />
        </div>
      </div>
    </div>
  );
}

function CreationView({ documents, onBack, onCreateDocument, onSaveDocument }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Kreiranje internih dokumenata</h2>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Natrag
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {INTERNAL_DOCS.map(type => {
          const typeInfo = DOCUMENT_TYPES[type];
          const Icon = typeInfo.icon;
          
          return (
            <div 
              key={type}
              className="p-6 border-2 rounded-xl hover:shadow-lg transition-all cursor-pointer"
              style={{ borderColor: `${typeInfo.color}40` }}
              onClick={() => {
                const doc = onCreateDocument(type, documents[0]?.analysis);
                onSaveDocument(doc);
              }}
            >
              <div className="flex flex-col items-center text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${typeInfo.color}20` }}
                >
                  <Icon size={32} style={{ color: typeInfo.color }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{typeInfo.label}</h3>
                <p className="text-sm text-gray-600">
                  Kreiraj {typeInfo.label.toLowerCase()} iz postojećeg dokumenta
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentCreationModal({ type, data, onSave, onClose }) {
  const [editableData, setEditableData] = useState(data);
  const typeInfo = DOCUMENT_TYPES[type];
  const Icon = typeInfo.icon;

  const updateField = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Icon size={24} style={{ color: typeInfo.color }} />
              <h3 className="text-xl font-semibold">Kreiraj {typeInfo.label}</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {UI_TEXT.docNo}
              </label>
              <input
                type="text"
                value={editableData.documentNumber}
                onChange={(e) => updateField('documentNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {UI_TEXT.date}
              </label>
              <input
                type="date"
                value={editableData.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {type === 'delivery' && (
            <div className="p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold mb-3">{UI_TEXT.deliveryInfo}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {UI_TEXT.deliveryAddress}
                  </label>
                  <input
                    type="text"
                    value={editableData.delivery?.address || ''}
                    onChange={(e) => updateField('delivery', { 
                      ...editableData.delivery, 
                      address: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {UI_TEXT.deliveryMethod}
                  </label>
                  <input
                    type="text"
                    value={editableData.delivery?.method || ''}
                    onChange={(e) => updateField('delivery', { 
                      ...editableData.delivery, 
                      method: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'transfer' && (
            <div className="p-4 bg-cyan-50 rounded-lg">
              <h4 className="font-semibold mb-3">{UI_TEXT.transferInfo}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {UI_TEXT.fromWarehouse}
                  </label>
                  <input
                    type="text"
                    value={editableData.transfer?.fromWarehouse || ''}
                    onChange={(e) => updateField('transfer', { 
                      ...editableData.transfer, 
                      fromWarehouse: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {UI_TEXT.toWarehouse}
                  </label>
                  <input
                    type="text"
                    value={editableData.transfer?.toWarehouse || ''}
                    onChange={(e) => updateField('transfer', { 
                      ...editableData.transfer, 
                      toWarehouse: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {UI_TEXT.reason}
                  </label>
                  <input
                    type="text"
                    value={editableData.transfer?.reason || ''}
                    onChange={(e) => updateField('transfer', { 
                      ...editableData.transfer, 
                      reason: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'receipt' && (
            <div className="p-4 bg-pink-50 rounded-lg">
              <h4 className="font-semibold mb-3">{UI_TEXT.receiptInfo}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {UI_TEXT.receivedBy}
                  </label>
                  <input
                    type="text"
                    value={editableData.receipt?.receivedBy || ''}
                    onChange={(e) => updateField('receipt', { 
                      ...editableData.receipt, 
                      receivedBy: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {UI_TEXT.condition}
                  </label>
                  <select
                    value={editableData.receipt?.condition || ''}
                    onChange={(e) => updateField('receipt', { 
                      ...editableData.receipt, 
                      condition: e.target.value 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Odaberi --</option>
                    <option value={UI_TEXT.conditionOk}>{UI_TEXT.conditionOk}</option>
                    <option value={UI_TEXT.conditionDamaged}>{UI_TEXT.conditionDamaged}</option>
                    <option value={UI_TEXT.conditionIncomplete}>{UI_TEXT.conditionIncomplete}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Items summary */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Sažetak stavki</h4>
            <p className="text-sm text-gray-600">
              {editableData.items?.length || 0} stavki • 
              Ukupno: {(editableData.totals?.totalAmount || 0).toFixed(2)} €
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {UI_TEXT.cancel}
          </button>
          <button 
            onClick={() => onSave(editableData)}
            className="px-6 py-2 text-white rounded-lg transition-all"
            style={{ backgroundColor: typeInfo.color }}
          >
            {UI_TEXT.createSave}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmedDocumentsGrid({ documents }) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-gray-200/50 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          Potvrđeni dokumenti ({documents.length})
        </h3>
        <div className="flex gap-2 text-sm text-gray-600">
          <span>{documents.filter(d => d.project).length} s projektima</span>
          <span>•</span>
          <span>{documents.filter(d => d.position).length} s pozicijama</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map(doc => {
          const typeInfo = DOCUMENT_TYPES[doc.documentType] || DOCUMENT_TYPES.invoice;
          const Icon = typeInfo.icon;
          
          return (
            <div key={doc.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-all bg-white">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${typeInfo.color}20` }}
                >
                  <Icon size={24} style={{ color: typeInfo.color }} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-2">
                    {doc.analysis?.documentNumber || doc.fileName}
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    {typeInfo.label} • {new Date(doc.confirmedDate).toLocaleDateString()}
                  </p>
                  <div className="space-y-2">
                    {doc.project && (
                      <div className="flex items-center gap-2">
                        <Building className="w-3 h-3 text-blue-500" />
                        <span className="text-xs text-blue-700 font-medium">{doc.project.name}</span>
                      </div>
                    )}
                    {doc.position && (
                      <div className="flex items-center gap-2">
                        <Target className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-700 font-medium">{doc.position.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Package className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        {doc.analysis?.items?.length || 0} stavki • 
                        {(doc.analysis?.totals?.totalAmount || 0).toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DebugPanel({ document, llmStatus }) {
  return (
    <div className="mt-6 bg-gray-900 text-green-400 rounded-xl p-6 font-mono">
      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        {UI_TEXT.debugTitle}
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-yellow-400 font-semibold mb-2">Rezultati analize</h4>
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
            {JSON.stringify({
              fileName: document.fileName,
              confidence: document.analysis?.confidence || 'N/A',
              itemsDetected: document.analysis?.items?.length || 0,
              totalValue: document.analysis?.totals?.totalAmount || 0,
              llmStatus,
              documentType: document.analysis?.documentType,
              fileSize: formatBytes(document.fileSize),
              parsedData: {
                documentNumber: document.analysis?.documentNumber,
                supplier: document.analysis?.supplier?.name,
                buyer: document.analysis?.buyer?.name,
                date: document.analysis?.date,
                iban: document.analysis?.paymentInfo?.iban,
                vatRate: document.analysis?.totals?.vatRate || 25,
              },
            }, null, 2)}
          </pre>
        </div>
        <div>
          <h4 className="text-yellow-400 font-semibold mb-2">Sirovi tekst (uzorak)</h4>
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap bg-gray-800 p-3 rounded">
            {document.rawData?.rawText?.substring(0, 1500)}
            {document.rawData?.rawText?.length > 1500 && '\n... (skraćeno)'}
          </pre>
        </div>
      </div>
      
      {/* Additional debug info */}
      {document.analysis && (
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-gray-800 p-3 rounded">
            <h5 className="text-cyan-400 text-xs mb-2">Izvučeni podaci</h5>
            <div className="text-xs space-y-1">
              <div>📄 Tip: {document.documentType}</div>
              <div>🔢 Broj: {document.analysis.documentNumber || 'N/A'}</div>
              <div>📅 Datum: {document.analysis.date || 'N/A'}</div>
              <div>🏢 OIB Dobavljača: {document.analysis.supplier?.oib || 'N/A'}</div>
              <div>🏛️ OIB Kupca: {document.analysis.buyer?.oib || 'N/A'}</div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <h5 className="text-cyan-400 text-xs mb-2">Financijski podaci</h5>
            <div className="text-xs space-y-1">
              <div>💶 Osnovica: {(document.analysis.totals?.subtotal || 0).toFixed(2)}</div>
              <div>📊 PDV: {(document.analysis.totals?.vatAmount || 0).toFixed(2)}</div>
              <div>💰 Ukupno: {(document.analysis.totals?.totalAmount || 0).toFixed(2)}</div>
              <div>📈 PDV stopa: {document.analysis.totals?.vatRate || 25}%</div>
              <div>📦 Stavki: {document.analysis.items?.length || 0}</div>
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <h5 className="text-cyan-400 text-xs mb-2">Plaćanje</h5>
            <div className="text-xs space-y-1">
              <div>🏦 IBAN: {document.analysis.paymentInfo?.iban ? '✓' : '✗'}</div>
              <div>📝 Poziv: {document.analysis.paymentInfo?.reference || 'N/A'}</div>
              <div>💳 Način: {document.analysis.paymentInfo?.method || 'N/A'}</div>
              <div>🖨️ JIR: {document.analysis.additionalInfo?.jir ? '✓' : '✗'}</div>
              <div>🔐 ZKI: {document.analysis.additionalInfo?.zki ? '✓' : '✗'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPanel({ settings, onSettingsChange, onClose }) {
  return (
    <div className="fixed right-4 top-20 z-50 w-80 bg-white rounded-xl shadow-2xl border">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Postavke</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Analiza
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={settings.autoAnalyze}
                  onChange={(e) => onSettingsChange({ ...settings, autoAnalyze: e.target.checked })}
                  className="rounded"
                />
                Automatska analiza
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={settings.useLLM}
                  onChange={(e) => onSettingsChange({ ...settings, useLLM: e.target.checked })}
                  className="rounded"
                />
                Koristi LLM (kad je dostupan)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={settings.showThumbnails}
                  onChange={(e) => onSettingsChange({ ...settings, showThumbnails: e.target.checked })}
                  className="rounded"
                />
                Prikaži sličice
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              OCR jezik
            </label>
            <select
              value={settings.ocrLanguage}
              onChange={(e) => onSettingsChange({ ...settings, ocrLanguage: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="hrv+eng">Hrvatski + Engleski</option>
              <option value="hrv">Samo Hrvatski</option>
              <option value="eng">Samo Engleski</option>
              <option value="deu">Njemački</option>
              <option value="ita">Talijanski</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Prag pouzdanosti: {(settings.confidenceThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={(e) => onSettingsChange({ ...settings, confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Format exporta
            </label>
            <select
              value={settings.exportFormat}
              onChange={(e) => onSettingsChange({ ...settings, exportFormat: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
            >
              <option value="json">JSON</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-2">
              Prikaz
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={settings.compactView}
                  onChange={(e) => onSettingsChange({ ...settings, compactView: e.target.checked })}
                  className="rounded"
                />
                Kompaktni prikaz
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => onSettingsChange({ ...settings, darkMode: e.target.checked })}
                  className="rounded"
                />
                Tamna tema
              </label>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-500">
              Verzija: 2.0.0 | Hrvatski čitač dokumenata
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}