import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import backendService from '../BackendService';
import { AI_MODES, GOOGLE_MODELS } from '../../constants/aiModes';

/**
 * InvoiceProcessingService - Centralizirani servis za procesiranje računa
 * 
 * Odgovornosti:
 * - PDF rendering i obrada
 * - AI analiza dokumenata (Google Cloud)
 * - Batch procesiranje
 * - Progress tracking
 * - Error handling
 * 
 * @class InvoiceProcessingService
 */
class InvoiceProcessingService {
  constructor() {
    this.initializePDFWorker();
  }

  /**
   * Inicijalizuje PDF.js worker
   * @private
   */
  initializePDFWorker() {
    if (typeof window !== 'undefined' && !GlobalWorkerOptions.workerSrc) {
      GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    }
  }

  /**
   * Renderuje PDF stranice u slike
   * @param {Object} document - Dokument objekt
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Dokument sa renderiranim stranicama
   */
  async renderPdfPages(document, onProgress) {
    if (!document.type.includes('pdf')) return document;

    onProgress?.(`Renderira ${document.name}...`, 0);

    try {
      const arrayBuffer = await document.file.arrayBuffer();
      const pdf = await getDocument({ data: arrayBuffer }).promise;
      const renderedPages = [];
      const numPagesToRender = Math.min(pdf.numPages, 5);

      for (let i = 1; i <= numPagesToRender; i++) {
        onProgress?.(`Renderira stranicu ${i}/${numPagesToRender}`, (i / numPagesToRender) * 100);
        
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
        renderedPages.push(new File([blob], `${document.name}_page_${i}.png`, { type: 'image/png' }));
      }

      return { ...document, renderedPages };
    } catch (error) {
      console.error("PDF rendering failed:", error);
      throw new Error(`Greška pri renderiranju PDF-a: ${error.message}`);
    }
  }

  /**
   * Analizira dokument koristeći Google AI
   * @param {Object} document - Dokument za analizu
   * @param {Object} settings - AI settings
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Rezultat analize
   */
  async analyzeWithAI(document, settings, onProgress) {
    let documentToAnalyze = document;
    let filesForAnalysis;

    // Određi tip analize na osnovu settings
    if (settings.analysisMode === AI_MODES.CLOUD_GOOGLE_VISION) {
      if (!documentToAnalyze.renderedPages || documentToAnalyze.renderedPages.length === 0) {
        documentToAnalyze = await this.renderPdfPages(documentToAnalyze, onProgress);
      }
      filesForAnalysis = documentToAnalyze.renderedPages;
    } else {
      filesForAnalysis = [documentToAnalyze.file];
    }

    if (!filesForAnalysis || filesForAnalysis.length === 0) {
      throw new Error("Nema datoteka za analizu. Renderiranje PDF-a možda nije uspjelo.");
    }

    const progressCallback = (message, percent) => {
      onProgress?.(message, percent);
    };

    const result = await backendService.analyzeDocumentGoogle({
      apiKey: settings.googleApiKey || null,
      model: settings.selectedModel,
      files: filesForAnalysis,
      onProgress: progressCallback
    });

    return result.data;
  }

  /**
   * Obrađuje batch dokumenata
   * @param {Array} documents - Lista dokumenata
   * @param {Object} settings - AI settings
   * @param {Function} onProgress - Progress callback
   * @param {Function} onDocumentUpdate - Callback za update dokumenta
   * @returns {Promise<void>}
   */
  async processBatchDocuments(documents, settings, onProgress, onDocumentUpdate) {
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      onProgress?.(`Obrađuje ${doc.name} (${i + 1}/${documents.length})`, (i / documents.length) * 100);
      
      // Označi dokument kao 'processing'
      onDocumentUpdate?.(doc.id, { status: 'processing' });

      try {
        const analysis = await this.analyzeWithAI(doc, settings, (message, percent) => {
          onProgress?.(`${doc.name}: ${message}`, ((i + percent / 100) / documents.length) * 100);
        });

        // Označava dokument kao analiziran
        onDocumentUpdate?.(doc.id, { 
          status: 'analyzed', 
          analysis, 
          error: null 
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Označava dokument kao error
        onDocumentUpdate?.(doc.id, { 
          status: 'error', 
          error: errorMessage 
        });
      }
    }

    onProgress?.('Završeno', 100);
  }

  /**
   * Validira file za upload
   * @param {FileList} files - Files za validaciju
   * @returns {Array} Validni files
   */
  validateFiles(files) {
    if (!files?.length) return [];

    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    return Array.from(files).filter(file => {
      if (!validTypes.includes(file.type)) {
        console.warn(`Invalid file type: ${file.type} for ${file.name}`);
        return false;
      }
      
      if (file.size > maxSize) {
        console.warn(`File too large: ${file.size} bytes for ${file.name}`);
        return false;
      }

      return true;
    });
  }

  /**
   * Kreira document objekt od file-a
   * @param {File} file - File objekt
   * @param {number} index - Index u listi
   * @returns {Object} Document objekt
   */
  createDocumentFromFile(file, index = 0) {
    return {
      id: Date.now() + index,
      name: file.name,
      file,
      type: file.type,
      size: file.size,
      status: 'uploaded',
      analysis: null,
      error: null,
      renderedPages: []
    };
  }

  /**
   * Test Google AI konekcije
   * @param {string} apiKey - API key
   * @param {string} model - Model name
   * @returns {Promise<Object>} Test rezultat
   */
  async testAIConnection(apiKey, model) {
    try {
      const result = await backendService.testGoogleAIConnection(apiKey, model);
      return { success: true, message: result.message, response: result.testResponse };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
export const invoiceProcessingService = new InvoiceProcessingService();
export default invoiceProcessingService;