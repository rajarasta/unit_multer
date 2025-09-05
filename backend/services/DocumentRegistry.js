const fs = require('fs');
const path = require('path');

/**
 * Document Registry Service
 * Manages available documents for AI processing
 */
class DocumentRegistry {
  constructor(documentsPath = 'src/backend/Računi') {
    this.documentsPath = documentsPath;
    this.documents = [];
    this.lastScan = null;
    this.scanDocuments();
  }

  /**
   * Scan documents folder and build registry
   */
  scanDocuments() {
    try {
      const fullPath = path.resolve(this.documentsPath);
      const files = fs.readdirSync(fullPath);
      
      this.documents = files
        .filter(file => file.match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx|txt)$/i))
        .map((filename, index) => {
          const filepath = path.join(fullPath, filename);
          const stats = fs.statSync(filepath);
          
          return {
            id: `doc_${index + 1}`,
            filename: filename,
            path: filepath,
            size: stats.size,
            lastModified: stats.mtime,
            type: this.getDocumentType(filename),
            searchTerms: this.generateSearchTerms(filename)
          };
        });

      this.lastScan = new Date();
      console.log(`📚 Document Registry: Scanned ${this.documents.length} documents`);
      
    } catch (error) {
      console.error('❌ Document Registry scan error:', error);
      this.documents = [];
    }
  }

  /**
   * Get document type based on extension
   */
  getDocumentType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const typeMap = {
      pdf: 'document',
      jpg: 'image',
      jpeg: 'image', 
      png: 'image',
      doc: 'document',
      docx: 'document',
      xls: 'spreadsheet',
      xlsx: 'spreadsheet',
      txt: 'text'
    };
    return typeMap[ext] || 'unknown';
  }

  /**
   * Generate search terms from filename
   */
  generateSearchTerms(filename) {
    // Remove extension and normalize
    const base = filename.replace(/\.[^/.]+$/, '');
    
    // Split by common separators and extract meaningful terms
    const terms = base
      .split(/[\s\-_\(\)\[\]\.]+/)
      .filter(term => term.length > 2)
      .map(term => term.toLowerCase());
    
    // Add full filename (without extension) as primary term
    terms.unshift(base.toLowerCase());
    
    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Get all documents for LLM context
   */
  getDocumentList() {
    return this.documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      type: doc.type,
      size: `${(doc.size / 1024).toFixed(1)}KB`,
      searchTerms: doc.searchTerms.join(', ')
    }));
  }

  /**
   * Find document by filename or search terms
   */
  findDocument(query) {
    const searchQuery = query.toLowerCase().trim();
    
    // Direct filename match (highest priority)
    let match = this.documents.find(doc => 
      doc.filename.toLowerCase() === searchQuery ||
      doc.filename.toLowerCase().includes(searchQuery)
    );
    
    if (match) return match;
    
    // Search terms match
    match = this.documents.find(doc => 
      doc.searchTerms.some(term => 
        term.includes(searchQuery) || searchQuery.includes(term)
      )
    );
    
    return match || null;
  }

  /**
   * Get document by ID
   */
  getDocumentById(id) {
    return this.documents.find(doc => doc.id === id) || null;
  }

  /**
   * Get document content for processing
   */
  getDocumentForProcessing(id) {
    const doc = this.getDocumentById(id);
    if (!doc) return null;
    
    try {
      // For now, return document metadata and path
      // Later we can add actual content extraction
      return {
        ...doc,
        content: fs.readFileSync(doc.path), // Binary content
        available: fs.existsSync(doc.path)
      };
    } catch (error) {
      console.error(`❌ Error reading document ${id}:`, error);
      return null;
    }
  }

  /**
   * Get summary for LLM prompt
   */
  getLLMDocumentContext() {
    const context = {
      totalDocuments: this.documents.length,
      documentList: this.documents.map(doc => ({
        id: doc.id,
        name: doc.filename,
        type: doc.type
      })),
      lastScanned: this.lastScan?.toISOString()
    };
    
    return context;
  }

  /**
   * Refresh document list
   */
  refresh() {
    this.scanDocuments();
    return this.documents.length;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      total: this.documents.length,
      types: {},
      totalSize: 0
    };
    
    this.documents.forEach(doc => {
      stats.types[doc.type] = (stats.types[doc.type] || 0) + 1;
      stats.totalSize += doc.size;
    });
    
    stats.totalSizeMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    
    return stats;
  }
}

// Export singleton instance
const documentRegistry = new DocumentRegistry();
module.exports = documentRegistry;