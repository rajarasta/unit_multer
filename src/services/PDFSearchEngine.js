import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

// Configure PDF.js worker
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

class PDFSearchEngine {
  constructor() {
    this.pdfCache = new Map();
    this.searchIndex = new Map();
    this.extractedContent = new Map();
    this.isInitialized = false;
  }

  // Initialize PDF search engine s PDF fajlovima iz backend/Računi
  async initialize() {
    if (this.isInitialized) return;
    
    const pdfFiles = [
      'Ponuda 2569.pdf',
      'Ponuda 2202 (1).pdf', 
      '1508-ags.pdf',
      'AGS 320.pdf',
      'Predračun br. 3623.PDF',
      'DOK020725-110147.pdf',
      'PONUDA BR. 1171 AGS (1).pdf',
      '5603-AGS (1).pdf',
      'AGS 320 (1).pdf',
      'Ponuda 2202 (3).pdf',
      'PONUDA BR. 1171 AGS.pdf',
      'P-NAL25-04365.pdf',
      'PO 718-2024 AGS.pdf',
      'AGS 25-02-04 E.pdf',
      'AGS  PONUDA 1960.pdf',
      'Material Analysis - 2040 - 13.2.2025..pdf',
      'P-NAL25-02237 AGS.pdf',
      'Promar Harmo.pdf',
      'Snimka zaslona 2025-08-26 172159.pdf',
      'testni.pdf'
    ];

    console.log('🔍 Initializing PDF Search Engine...');
    
    // Preload i index svih PDF-ova
    const loadPromises = pdfFiles.map(filename => this.loadAndIndexPDF(filename));
    
    try {
      await Promise.allSettled(loadPromises);
      this.isInitialized = true;
      console.log('✅ PDF Search Engine initialized!', {
        totalFiles: pdfFiles.length,
        loadedFiles: this.pdfCache.size,
        indexedPages: this.searchIndex.size
      });
    } catch (error) {
      console.error('❌ PDF Search Engine initialization failed:', error);
    }
  }

  // Učitaj i indeksiraj PDF fajl
  async loadAndIndexPDF(filename) {
    try {
      const pdfUrl = `/src/backend/Računi/${encodeURIComponent(filename)}`;
      console.log(`📄 Loading PDF: ${filename}`);
      
      const pdf = await getDocument(pdfUrl).promise;
      this.pdfCache.set(filename, pdf);
      
      const pages = [];
      const fullText = [];
      
      // Izvuci tekst sa svih stranica
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1.0 });
          
          // Kombinuj sav tekst sa stranice
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ')
            .trim();
          
          if (pageText) {
            const pageData = {
              pageNumber: pageNum,
              text: pageText,
              textContent: textContent,
              viewport: viewport,
              filename: filename,
              searchableText: pageText.toLowerCase(),
              extractedAt: Date.now()
            };
            
            pages.push(pageData);
            fullText.push(pageText);
            
            // Indeksiraj stranicu za pretraživanje
            const pageKey = `${filename}:${pageNum}`;
            this.searchIndex.set(pageKey, pageData);
          }
        } catch (pageError) {
          console.warn(`⚠️ Error processing page ${pageNum} of ${filename}:`, pageError);
        }
      }
      
      // Sačuvaj kompletni sadržaj dokumenta
      this.extractedContent.set(filename, {
        filename: filename,
        totalPages: pdf.numPages,
        pages: pages,
        fullText: fullText.join('\n'),
        extractedAt: Date.now(),
        fileSize: pdf._pdfInfo?.length || 0
      });
      
      console.log(`✅ Indexed ${filename}: ${pages.length} pages, ${fullText.join('').length} characters`);
      
    } catch (error) {
      console.error(`❌ Failed to load PDF ${filename}:`, error);
    }
  }

  // Glasovno pretraživanje PDF-ova
  async voiceSearch(transcript) {
    console.log('🎤 Voice search query:', transcript);
    
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const searchQuery = transcript.toLowerCase().trim();
    if (!searchQuery) return [];
    
    const results = [];
    const searchTerms = searchQuery.split(' ').filter(term => term.length > 2);
    
    // Pretražuj kroz sve indeksirane stranice
    for (const [pageKey, pageData] of this.searchIndex) {
      const relevanceScore = this.calculateRelevance(pageData.searchableText, searchTerms);
      
      if (relevanceScore > 0) {
        const matchingContext = this.extractMatchingContext(pageData.text, searchTerms);
        
        results.push({
          id: pageKey,
          filename: pageData.filename,
          pageNumber: pageData.pageNumber,
          relevanceScore: relevanceScore,
          matchingText: matchingContext,
          fullPageText: pageData.text,
          textContent: pageData.textContent,
          viewport: pageData.viewport,
          searchQuery: searchQuery,
          matchedTerms: searchTerms.filter(term => 
            pageData.searchableText.includes(term)
          )
        });
      }
    }
    
    // Sortiraj po relevantnosti
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    console.log(`🔍 Voice search completed: ${results.length} results for "${transcript}"`);
    return results.slice(0, 20); // Ograniči na top 20 rezultata
  }

  // Tekstualno pretraživanje
  async textSearch(query) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.voiceSearch(query); // Koristi istu logiku
  }

  // Izračunaj relevantnost stranice za pretraživanje
  calculateRelevance(pageText, searchTerms) {
    let score = 0;
    const text = pageText.toLowerCase();
    
    searchTerms.forEach(term => {
      const termCount = (text.match(new RegExp(term, 'g')) || []).length;
      score += termCount * term.length; // Duži termini imaju veću težinu
    });
    
    return score;
  }

  // Izvuci kontekst oko pronađenih termina
  extractMatchingContext(text, searchTerms, contextLength = 100) {
    const contexts = [];
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(.{0,${contextLength}})(${term})(.{0,${contextLength}})`, 'gi');
      const matches = [...text.matchAll(regex)];
      
      matches.forEach(match => {
        contexts.push({
          before: match[1],
          match: match[2], 
          after: match[3],
          fullContext: match[0]
        });
      });
    });
    
    return contexts.slice(0, 3); // Top 3 konteksta
  }

  // Dobij PDF dokument po filename-u
  async getPDF(filename) {
    if (!this.pdfCache.has(filename)) {
      await this.loadAndIndexPDF(filename);
    }
    return this.pdfCache.get(filename);
  }

  // Dobij stranicu PDF-a
  async getPDFPage(filename, pageNumber) {
    const pdf = await this.getPDF(filename);
    if (!pdf) return null;
    
    try {
      return await pdf.getPage(pageNumber);
    } catch (error) {
      console.error('Error getting PDF page:', error);
      return null;
    }
  }

  // Dobij sve PDF fajlove koji su ucitani
  getLoadedPDFs() {
    return Array.from(this.extractedContent.keys()).map(filename => {
      const content = this.extractedContent.get(filename);
      return {
        filename: filename,
        totalPages: content.totalPages,
        extractedAt: content.extractedAt,
        fileSize: content.fileSize,
        hasContent: content.pages.length > 0
      };
    });
  }

  // Dobij statistike search engine-a
  getStats() {
    return {
      totalPDFs: this.pdfCache.size,
      totalPages: this.searchIndex.size,
      isInitialized: this.isInitialized,
      memoryUsage: {
        pdfCache: this.pdfCache.size,
        searchIndex: this.searchIndex.size,
        extractedContent: this.extractedContent.size
      }
    };
  }

  // Očisti cache
  clearCache() {
    this.pdfCache.clear();
    this.searchIndex.clear();
    this.extractedContent.clear();
    this.isInitialized = false;
    console.log('🧹 PDF Search Engine cache cleared');
  }
}

// Singleton instance
const pdfSearchEngine = new PDFSearchEngine();

export default pdfSearchEngine;