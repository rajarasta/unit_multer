import { eventService } from './eventService';

class ExportService {
  constructor() {
    this.documentTemplates = {
      dispatch: {
        name: 'Otpremnica',
        type: 'PDF',
        fields: ['date', 'project', 'items', 'quantities', 'recipient']
      },
      transport: {
        name: 'Transportni nalog',
        type: 'PDF',
        fields: ['date', 'project', 'items', 'destination', 'driver']
      },
      warehouse: {
        name: 'Međuskladišnica',
        type: 'PDF',
        fields: ['date', 'project', 'items', 'source', 'destination']
      }
    };
  }

  async generateDispatchDocuments({ project, items, timestamp }) {
    try {
      const documents = [];
      
      const dispatchDoc = await this.generateDocument('dispatch', {
        project,
        items,
        timestamp,
        documentNumber: this.generateDocumentNumber('OTPR'),
        title: `Otpremnica - ${project.name}`
      });
      documents.push(dispatchDoc);

      const transportDoc = await this.generateDocument('transport', {
        project,
        items,
        timestamp,
        documentNumber: this.generateDocumentNumber('TRAN'),
        title: `Transportni nalog - ${project.name}`
      });
      documents.push(transportDoc);

      const warehouseDoc = await this.generateDocument('warehouse', {
        project,
        items,
        timestamp,
        documentNumber: this.generateDocumentNumber('SKLA'),
        title: `Međuskladišnica - ${project.name}`
      });
      documents.push(warehouseDoc);

      eventService.emit('export:documents-generated', {
        projectId: project.id,
        documents,
        type: 'dispatch'
      });

      return documents;
    } catch (error) {
      console.error('Error generating dispatch documents:', error);
      eventService.emit('export:error', { error, type: 'dispatch' });
      throw error;
    }
  }

  async generateDocument(type, data) {
    const template = this.documentTemplates[type];
    if (!template) {
      throw new Error(`Unknown document type: ${type}`);
    }

    await this.simulateDocumentGeneration();

    return {
      id: this.generateId(),
      type: template.type,
      name: template.name,
      title: data.title,
      documentNumber: data.documentNumber,
      projectId: data.project.id,
      projectName: data.project.name,
      items: data.items.map(item => ({
        positionId: item.positionId,
        positionTitle: item.position.title,
        quantity: item.quantity,
        plannedQty: item.plannedQty,
        status: item.status
      })),
      createdAt: data.timestamp,
      size: Math.floor(Math.random() * 500) + 100 + 'KB',
      downloadUrl: `/api/documents/download/${this.generateId()}`,
      previewUrl: `/api/documents/preview/${this.generateId()}`
    };
  }

  async exportToExcel(data, filename = 'export.xlsx') {
    try {
      const workbook = this.createWorkbook(data);
      
      eventService.emit('export:excel-generated', {
        filename,
        data: workbook
      });

      return {
        filename,
        size: this.estimateFileSize(data),
        downloadUrl: `/api/export/excel/${this.generateId()}`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      eventService.emit('export:error', { error, type: 'excel' });
      throw error;
    }
  }

  async exportToJSON(data, filename = 'export.json') {
    try {
      const jsonData = JSON.stringify(data, null, 2);
      
      eventService.emit('export:json-generated', {
        filename,
        data: jsonData
      });

      return {
        filename,
        size: new Blob([jsonData]).size + ' bytes',
        content: jsonData,
        downloadUrl: `data:application/json;charset=utf-8,${encodeURIComponent(jsonData)}`,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      eventService.emit('export:error', { error, type: 'json' });
      throw error;
    }
  }

  generateDocumentNumber(prefix) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    return `${prefix}-${year}${month}${day}-${sequence}`;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  async simulateDocumentGeneration() {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  }

  createWorkbook(data) {
    return {
      sheets: [{
        name: 'Otprema',
        data: data.items || [],
        columns: ['Position', 'Quantity', 'Status', 'Notes']
      }],
      metadata: {
        title: 'Dispatch Export',
        created: new Date().toISOString(),
        project: data.project?.name
      }
    };
  }

  estimateFileSize(data) {
    const jsonSize = JSON.stringify(data).length;
    return Math.floor(jsonSize * 1.2) + ' bytes';
  }

  downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const exportService = new ExportService();