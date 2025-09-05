import * as XLSX from 'xlsx';

/**
 * InvoiceDataService - Servis za manipulaciju podataka računa
 * 
 * Odgovornosti:
 * - CRUD operacije na dokumentima
 * - Export funkcionalnosti (Excel, JSON)
 * - Data validacija i formatiranje
 * - Database operations
 * 
 * @class InvoiceDataService
 */
class InvoiceDataService {
  /**
   * Update nested field u document analizi
   * @param {Object} document - Document objekt
   * @param {string} fieldPath - Putanja do polja (dot notation)
   * @param {*} value - Nova vrijednost
   * @returns {Object} Updated document
   */
  updateDocumentField(document, fieldPath, value) {
    if (!document) return document;
    
    const updated = { ...document };
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

  /**
   * Format currency value za prikaz
   * @param {number} value - Numerička vrijednost
   * @param {string} currency - Valuta (default 'EUR')
   * @returns {string} Formatirani prikaz
   */
  formatCurrency(value, currency = 'EUR') {
    if (!value && value !== 0) return 'N/A';
    return `${Number(value).toFixed(2)} ${currency}`;
  }

  /**
   * Export items u Excel format
   * @param {Object} document - Document sa analizom
   * @returns {void} Downloads Excel file
   */
  exportItemsToExcel(document) {
    if (!document?.analysis?.items) {
      throw new Error('Nema stavki za export');
    }
    
    const wb = XLSX.utils.book_new();
    const itemsData = document.analysis.items.map((item) => ({
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
    XLSX.writeFile(wb, `stavke-${document.analysis.documentNumber || Date.now()}.xlsx`);
  }

  /**
   * Export document u JSON format
   * @param {Object} document - Document sa analizom
   * @returns {void} Downloads JSON file
   */
  exportDocumentToJSON(document) {
    if (!document?.analysis) {
      throw new Error('Nema analize za export');
    }

    const blob = new Blob([JSON.stringify(document.analysis, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dokument-${document.analysis?.documentNumber || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Sprema document u bazu podataka
   * @param {Object} document - Document sa analizom
   * @returns {Promise<Object>} Save rezultat
   */
  async saveToDatabase(document) {
    if (!document?.analysis) {
      throw new Error('Nema podataka za spremanje');
    }

    try {
      const analysisData = {
        ...document.analysis,
        fileName: document.name,
        processedDate: new Date().toISOString(),
        id: document.id
      };

      // TODO: Implementiraj stvarni API poziv za spremanje
      console.log('Spremam u bazu podataka:', analysisData);
      
      return {
        success: true,
        message: `Dokument "${document.name}" uspješno spremljen u bazu!`,
        savedData: analysisData
      };

    } catch (error) {
      console.error('Greška pri spremanju:', error);
      throw new Error('Greška pri spremanju u bazu podataka');
    }
  }

  /**
   * Validira invoice data
   * @param {Object} analysis - Invoice analiza
   * @returns {Object} Validacija rezultat
   */
  validateInvoiceData(analysis) {
    const errors = [];
    const warnings = [];

    // Provjeri osnovne podatke
    if (!analysis.documentNumber) {
      errors.push('Broj dokumenta je obavezan');
    }

    if (!analysis.date) {
      warnings.push('Datum dokumenta nije specificiran');
    }

    if (!analysis.supplier?.name) {
      errors.push('Naziv dobavljača je obavezan');
    }

    if (!analysis.totals?.totalAmount) {
      errors.push('Ukupan iznos mora biti specificiran');
    }

    // Provjeri stavke
    if (analysis.items && analysis.items.length > 0) {
      analysis.items.forEach((item, index) => {
        if (!item.description) {
          warnings.push(`Stavka ${index + 1}: Nema opisa`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Stavka ${index + 1}: Neispravna količina`);
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`Stavka ${index + 1}: Neispravna jedinična cijena`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: this.calculateConfidence(analysis, errors, warnings)
    };
  }

  /**
   * Kalkulira confidence score na osnovu podataka
   * @param {Object} analysis - Invoice analiza
   * @param {Array} errors - Lista grešaka
   * @param {Array} warnings - Lista upozorenja
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(analysis, errors, warnings) {
    let score = 1.0;
    
    // Umanji score za greške
    score -= errors.length * 0.2;
    
    // Umanji score za upozorenja
    score -= warnings.length * 0.1;
    
    // Provjeri kompletnost podataka
    const completenessFactors = [
      analysis.documentNumber,
      analysis.date,
      analysis.supplier?.name,
      analysis.buyer?.name,
      analysis.totals?.totalAmount,
      analysis.items?.length > 0
    ];
    
    const completeness = completenessFactors.filter(Boolean).length / completenessFactors.length;
    score *= completeness;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Kreira quick stats za document
   * @param {Object} document - Document sa analizom
   * @returns {Object} Stats objekt
   */
  getDocumentStats(document) {
    if (!document?.analysis) {
      return {
        itemCount: 0,
        totalValue: 0,
        confidence: 0,
        currency: 'EUR'
      };
    }

    const analysis = document.analysis;
    const validation = this.validateInvoiceData(analysis);

    return {
      itemCount: analysis.items?.length || 0,
      totalValue: analysis.totals?.totalAmount || 0,
      confidence: validation.confidence,
      currency: analysis.currency || 'EUR',
      hasErrors: validation.errors.length > 0,
      hasWarnings: validation.warnings.length > 0,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  /**
   * Filter documents po kriterijima
   * @param {Array} documents - Lista dokumenata
   * @param {Object} criteria - Filter kriteriji
   * @returns {Array} Filtered documents
   */
  filterDocuments(documents, criteria = {}) {
    return documents.filter(doc => {
      // Filter po status-u
      if (criteria.status && doc.status !== criteria.status) {
        return false;
      }

      // Filter po tipu
      if (criteria.documentType && doc.analysis?.documentType !== criteria.documentType) {
        return false;
      }

      // Filter po datumu
      if (criteria.dateFrom && doc.analysis?.date) {
        const docDate = new Date(doc.analysis.date);
        const fromDate = new Date(criteria.dateFrom);
        if (docDate < fromDate) return false;
      }

      if (criteria.dateTo && doc.analysis?.date) {
        const docDate = new Date(doc.analysis.date);
        const toDate = new Date(criteria.dateTo);
        if (docDate > toDate) return false;
      }

      // Search u nazivu i sadržaju
      if (criteria.search) {
        const searchTerm = criteria.search.toLowerCase();
        const searchableText = [
          doc.name,
          doc.analysis?.supplier?.name,
          doc.analysis?.buyer?.name,
          doc.analysis?.documentNumber
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }
}

// Export singleton instance
export const invoiceDataService = new InvoiceDataService();
export default invoiceDataService;