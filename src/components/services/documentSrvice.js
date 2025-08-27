// services/documentService.js
import { dataURLtoBlob } from '../utils/fileUtils';

export const documentService = {
  // Process file upload
  processFile: async (file, position = null) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const document = {
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          url: e.target.result,
          isImage: file.type.startsWith('image/'),
          isCAD: file.name?.toLowerCase().endsWith('.dwg') || 
                 file.name?.toLowerCase().endsWith('.dxf'),
          urgency: 'normal',
          position: position,
          uploadDate: new Date().toISOString()
        };
        resolve(document);
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Process multiple files
  processMultipleFiles: async (files, position = null) => {
    const promises = Array.from(files).map(file => 
      documentService.processFile(file, position)
    );
    return Promise.all(promises);
  },

  // Open document in browser or external app
  openDocument: (doc) => {
    if (doc.url && doc.url !== '#') {
      if (doc.url.startsWith('data:')) {
        const blob = dataURLtoBlob(doc.url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } else {
        window.open(doc.url, '_blank');
      }
    }
  },

  // Filter documents
  filterDocuments: (documents, filters) => {
    const { filter, searchDoc, urgencyFilter } = filters;
    
    return documents.filter(doc => {
      // Type filter
      if (filter !== 'all') {
        const docType = doc.type?.startsWith('image/') ? 'image' :
                       (doc.isCAD) ? 'cad' :
                       doc.name?.toLowerCase().endsWith('.pdf') ? 'pdf' :
                       'document';
        if (docType !== filter) return false;
      }
      
      // Urgency filter
      if (urgencyFilter !== 'all' && doc.urgency !== urgencyFilter) return false;
      
      // Search filter
      if (searchDoc && !doc.name.toLowerCase().includes(searchDoc.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  },

  // Group documents by position
  groupDocumentsByPosition: (documents) => {
    const grouped = new Map();
    
    documents.forEach(doc => {
      const key = doc.position || 'Bez pozicije';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    });
    
    return Array.from(grouped.entries()).sort((a, b) => 
      a[0].localeCompare(b[0])
    );
  },

  // Get document statistics
  getDocumentStats: (documents) => {
    const stats = {
      total: documents.length,
      byType: {
        images: 0,
        cad: 0,
        pdf: 0,
        other: 0
      },
      byUrgency: {
        normal: 0,
        important: 0,
        urgent: 0
      },
      totalSize: 0
    };

    documents.forEach(doc => {
      // Count by type
      if (doc.type?.startsWith('image/')) stats.byType.images++;
      else if (doc.isCAD) stats.byType.cad++;
      else if (doc.name?.toLowerCase().endsWith('.pdf')) stats.byType.pdf++;
      else stats.byType.other++;

      // Count by urgency
      const urgency = doc.urgency || 'normal';
      if (stats.byUrgency[urgency] !== undefined) {
        stats.byUrgency[urgency]++;
      }

      // Total size
      stats.totalSize += doc.size || 0;
    });

    return stats;
  }
};