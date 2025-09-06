class DocumentService {
  constructor() {
    this.allowedFolders = [
      'src/backend/Računi/',
      'src/backend/'
    ];
    this.supportedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx'];
    this.baseUrl = 'http://localhost:3002/api';
  }

  // ===== NEW PDF DOCUMENT METHODS =====

  /**
   * Get list of available PDF documents from backend folder
   * @returns {Promise<Array>} List of available documents
   */
  async getAvailableDocuments() {
    try {
      const response = await fetch(`${this.baseUrl}/documents/list`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch documents');
      }
      
      return data.documents;
    } catch (error) {
      console.error('❌ DocumentService.getAvailableDocuments:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a specific document
   * @param {string} filename - Document name (without .pdf extension)
   * @returns {Promise<Object>} Document metadata
   */
  async getDocumentInfo(filename) {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${filename}/info`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Document "${filename}" not found`);
      }
      
      return data.document;
    } catch (error) {
      console.error(`❌ DocumentService.getDocumentInfo(${filename}):`, error);
      throw error;
    }
  }

  /**
   * Extract specific page from PDF document
   * @param {string} filename - Document name (without .pdf extension)
   * @param {number} pageNumber - Page number to extract (1-based)
   * @returns {Promise<Object>} Page data with URL
   */
  async extractPage(filename, pageNumber) {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${filename}/pages/${pageNumber}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || `Failed to extract page ${pageNumber} from "${filename}"`);
      }
      
      return data.page;
    } catch (error) {
      console.error(`❌ DocumentService.extractPage(${filename}, ${pageNumber}):`, error);
      throw error;
    }
  }

  /**
   * Find closest match for document name (fuzzy search)
   * @param {string} searchName - Name to search for
   * @param {Array} availableDocs - List of available documents
   * @returns {string|null} Closest matching document name
   */
  findClosestMatch(searchName, availableDocs) {
    if (!searchName || !availableDocs?.length) return null;
    
    const search = searchName.toLowerCase();
    
    // Exact match
    const exactMatch = availableDocs.find(doc => 
      doc.filename.toLowerCase() === search
    );
    if (exactMatch) return exactMatch.filename;
    
    // Partial match
    const partialMatch = availableDocs.find(doc => 
      doc.filename.toLowerCase().includes(search) || 
      search.includes(doc.filename.toLowerCase())
    );
    if (partialMatch) return partialMatch.filename;
    
    // Levenshtein distance for fuzzy matching
    let bestMatch = null;
    let bestDistance = Infinity;
    
    availableDocs.forEach(doc => {
      const distance = this.levenshteinDistance(search, doc.filename.toLowerCase());
      if (distance < bestDistance && distance <= 3) { // Max 3 character difference
        bestDistance = distance;
        bestMatch = doc.filename;
      }
    });
    
    return bestMatch;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  // ===== EXISTING METHODS =====

  async listDocuments(folderPath = 'src/backend/Računi/') {
    try {
      // Check if folder is allowed
      if (!this.allowedFolders.some(allowed => folderPath.startsWith(allowed))) {
        throw new Error('Folder access denied: ' + folderPath);
      }

      // For browser environment, we'll maintain a static registry
      // In production, this would query the server
      const documents = [
        { 
          name: '1508-ags.pdf', 
          path: 'src/backend/Računi/1508-ags.pdf',
          size: 458687,
          type: 'pdf',
          lastModified: '2025-08-26T14:09:00Z'
        },
        { 
          name: 'AGS 320.pdf', 
          path: 'src/backend/Računi/AGS 320.pdf',
          size: 951319,
          type: 'pdf',
          lastModified: '2025-08-26T14:15:00Z'
        },
        { 
          name: 'Material Analysis - 2040 - 13.2.2025..pdf', 
          path: 'src/backend/Računi/Material Analysis - 2040 - 13.2.2025..pdf',
          size: 1369596,
          type: 'pdf',
          lastModified: '2025-08-26T14:36:00Z'
        },
        {
          name: 'slika1.png',
          path: 'src/backend/slika1.png',
          size: 439474,
          type: 'png',
          lastModified: '2025-09-05T11:10:00Z'
        }
      ];

      return documents.filter(doc => 
        this.supportedExtensions.some(ext => doc.name.toLowerCase().endsWith(ext))
      );
    } catch (error) {
      console.error('DocumentService.listDocuments error:', error);
      return [];
    }
  }

  async getDocumentContent(documentPath) {
    try {
      // Security check
      if (!this.allowedFolders.some(allowed => documentPath.startsWith(allowed))) {
        throw new Error('Document access denied: ' + documentPath);
      }

      // For browser environment, we'll use the static assets
      // In production, this would be served by the backend
      const response = await fetch(`/${documentPath}`);
      if (!response.ok) {
        throw new Error(`Document not found: ${documentPath}`);
      }

      return {
        url: `/${documentPath}`,
        blob: await response.blob(),
        contentType: response.headers.get('content-type'),
        size: parseInt(response.headers.get('content-length') || '0')
      };
    } catch (error) {
      console.error('DocumentService.getDocumentContent error:', error);
      throw error;
    }
  }

  async searchDocuments(query, folderPath = 'src/backend/Računi/') {
    try {
      const documents = await this.listDocuments(folderPath);
      const queryLower = query.toLowerCase();
      
      return documents.filter(doc =>
        doc.name.toLowerCase().includes(queryLower) ||
        doc.path.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      console.error('DocumentService.searchDocuments error:', error);
      return [];
    }
  }

  isDocumentAllowed(documentPath) {
    return this.allowedFolders.some(allowed => documentPath.startsWith(allowed)) &&
           this.supportedExtensions.some(ext => documentPath.toLowerCase().endsWith(ext));
  }

  getDocumentType(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      case 'doc':
      case 'docx':
        return 'document';
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      default:
        return 'unknown';
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export default new DocumentService();