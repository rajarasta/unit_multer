import { eventService } from './eventService';

class DocumentService {
  constructor() {
    this.cache = new Map();
    this.supportedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'doc', 'docx'];
  }

  async loadDocument(url) {
    try {
      if (this.cache.has(url)) {
        return this.cache.get(url);
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load document: ${response.status}`);
      }

      const blob = await response.blob();
      const document = {
        url,
        blob,
        size: blob.size,
        type: blob.type,
        name: this.extractFilename(url),
        loadedAt: new Date().toISOString()
      };

      this.cache.set(url, document);
      
      eventService.emit('document:loaded', document);
      
      return document;
    } catch (error) {
      console.error('Error loading document:', error);
      eventService.emit('document:error', { url, error });
      throw error;
    }
  }

  async previewDocument(document) {
    try {
      const previewData = {
        id: this.generateId(),
        originalDocument: document,
        previewUrl: URL.createObjectURL(document.blob),
        previewType: this.getPreviewType(document.type),
        createdAt: new Date().toISOString()
      };

      eventService.emit('document:preview-generated', previewData);
      
      return previewData;
    } catch (error) {
      console.error('Error generating document preview:', error);
      eventService.emit('document:preview-error', { document, error });
      throw error;
    }
  }

  getPreviewType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    return 'download';
  }

  isPreviewable(document) {
    const type = document.type || this.getMimeTypeFromExtension(document.name);
    return type.startsWith('image/') || 
           type === 'application/pdf' || 
           type.startsWith('text/');
  }

  getMimeTypeFromExtension(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  extractFilename(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || 'document';
    } catch {
      return url.split('/').pop() || 'document';
    }
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async downloadDocument(document, filename) {
    try {
      const url = URL.createObjectURL(document.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || document.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      eventService.emit('document:downloaded', { document, filename });
    } catch (error) {
      console.error('Error downloading document:', error);
      eventService.emit('document:download-error', { document, error });
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
    eventService.emit('document:cache-cleared');
  }

  getCacheSize() {
    let totalSize = 0;
    for (const doc of this.cache.values()) {
      totalSize += doc.size;
    }
    return totalSize;
  }
}

export const documentService = new DocumentService();