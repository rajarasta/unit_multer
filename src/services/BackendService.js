/**
 * Frontend Backend Service Client
 * Provides easy access to unified backend services for all tabs
 */

import CloudLLMService from './CloudLLMService.js';

class BackendService {
  constructor() {
    // Voice server (3000) remains under /api via Vite proxy
    // File-writer (3001) is now exposed under /fw via Vite proxy
    this.fileWriterURL = '/fw';
    this.documentRegistryURL = 'http://localhost:3002';
  }

  // AI Services
  async processWithGemini(data, apiKey = null) {
    return CloudLLMService.processMultimodalDocument(data, apiKey);
  }

  async analyzeDocumentGoogle(options) {
    return CloudLLMService.analyzeDocumentGoogle(options);
  }

  async testGoogleAIConnection(apiKey, model) {
    return CloudLLMService.testGoogleAIConnection(apiKey, model);
  }

  async processWithOpenAI(endpoint, data) {
    const response = await fetch(`${this.fileWriterURL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  // Document Services
  async smartDocumentProcessing(formData) {
    const response = await fetch(`${this.documentRegistryURL}/api/agent/smart-document`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Document processing error: ${response.status}`);
    }
    
    return response.json();
  }

  async multimodalProcessing(data) {
    // Handle both FormData and regular data objects
    const isFormData = data instanceof FormData;
    const requestOptions = {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    };

    if (!isFormData) {
      requestOptions.headers = {
        'Content-Type': 'application/json',
      };
    }

    const response = await fetch(`${this.documentRegistryURL}/api/agent/multimodal`, requestOptions);
    
    if (!response.ok) {
      throw new Error(`Multimodal processing error: ${response.status}`);
    }
    
    return response.json();
  }

  // Voice Services
  async transcribeAudio(formData) {
    const response = await fetch(`${this.fileWriterURL}/transcribe`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Transcription error: ${response.status}`);
    }
    
    return response.json();
  }

  async draftProcessing(data) {
    const response = await fetch(`${this.fileWriterURL}/llm/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Draft processing error: ${response.status}`);
    }
    
    return response.json();
  }

  async confirmProcessing(data) {
    const response = await fetch(`${this.fileWriterURL}/llm/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Confirm processing error: ${response.status}`);
    }
    
    return response.json();
  }

  // File Services
  async uploadFile(formData) {
    const response = await fetch(`${this.fileWriterURL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`File upload error: ${response.status}`);
    }
    
    return response.json();
  }

  async saveFile(data) {
    const response = await fetch(`${this.fileWriterURL}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`File save error: ${response.status}`);
    }
    
    return response.json();
  }

  // Document Registry Services
  async searchDocuments(query) {
    const response = await fetch(`${this.documentRegistryURL}/api/documents/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`Document search error: ${response.status}`);
    }
    
    return response.json();
  }

  async getDocuments() {
    const response = await fetch(`${this.documentRegistryURL}/api/documents`);
    
    if (!response.ok) {
      throw new Error(`Get documents error: ${response.status}`);
    }
    
    return response.json();
  }

  // Utility method for handling errors consistently
  handleError(error, context = 'Backend operation') {
    console.error(`${context} failed:`, error);
    throw error;
  }
}

// Create and export singleton instance
const backendService = new BackendService();
export default backendService;
