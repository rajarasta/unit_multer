import { FileText } from 'lucide-react';

/**
 * Document Types Definition
 * Tipovi dokumenata koji se mogu procesirati u invoice processor-u
 */
export const DOCUMENT_TYPES = {
  request: { 
    label: 'Zahtjev za ponudu', 
    icon: FileText, 
    color: '#8b5cf6',
    description: 'Request for quotation'
  },
  quote: { 
    label: 'Ponuda / Predračun', 
    icon: FileText, 
    color: '#3b82f6',
    description: 'Quotation or proforma invoice'
  },
  invoice: { 
    label: 'Račun', 
    icon: FileText, 
    color: '#121414ff',
    description: 'Final invoice'
  },
  delivery: { 
    label: 'Otpremnica', 
    icon: FileText, 
    color: '#f59e0b',
    description: 'Delivery note'
  },
  transfer: { 
    label: 'Međuskladišnica', 
    icon: FileText, 
    color: '#06b6d4',
    description: 'Inter-warehouse transfer'
  },
  receipt: { 
    label: 'Primka', 
    icon: FileText, 
    color: '#ec4899',
    description: 'Goods receipt'
  },
  other: { 
    label: 'Ostalo', 
    icon: FileText, 
    color: '#64748b',
    description: 'Other document types'
  },
};

/**
 * Get document type info
 * @param {string} type - Document type key
 * @returns {Object} Document type configuration
 */
export function getDocumentTypeInfo(type) {
  return DOCUMENT_TYPES[type] || DOCUMENT_TYPES.other;
}

/**
 * Get all document type options for select dropdown
 * @returns {Array} Options array
 */
export function getDocumentTypeOptions() {
  return Object.entries(DOCUMENT_TYPES).map(([key, config]) => ({
    value: key,
    label: config.label,
    color: config.color
  }));
}