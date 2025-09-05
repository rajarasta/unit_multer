/**
 * Unified Backend Service Interface
 * Centralizes all backend service calls for tabs to use
 * Provides consistent API interface for all backend operations
 */

class UnifiedBackendService {
  constructor() {
    this.baseURL = '';
    this.fileWriterURL = 'http://localhost:3001';
    this.documentRegistryURL = 'http://localhost:3002';
  }

  // AI Services
  async processWithGemini(data, apiKey = null) {
    const CloudLLMService = await import('../../src/services/CloudLLMService.js');
    return CloudLLMService.processMultimodalDocument(data, apiKey);
  }

  async processWithOpenAI(endpoint, data) {
    const response = await fetch(`${this.fileWriterURL}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // Document Services
  async smartDocumentProcessing(formData) {
    const response = await fetch(`${this.documentRegistryURL}/api/agent/smart-document`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }

  async multimodalProcessing(data) {
    const response = await fetch(`${this.documentRegistryURL}/api/agent/multimodal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // Voice Services
  async transcribeAudio(formData) {
    const response = await fetch(`${this.fileWriterURL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }

  async draftProcessing(data) {
    const response = await fetch(`${this.fileWriterURL}/api/llm/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async confirmProcessing(data) {
    const response = await fetch(`${this.fileWriterURL}/api/llm/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // File Services
  async uploadFile(formData) {
    const response = await fetch(`${this.fileWriterURL}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }

  async saveFile(data) {
    const response = await fetch(`${this.fileWriterURL}/api/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // Document Registry Services
  async searchDocuments(query) {
    const response = await fetch(`${this.documentRegistryURL}/api/documents/search?q=${encodeURIComponent(query)}`);
    return response.json();
  }

  async getDocuments() {
    const response = await fetch(`${this.documentRegistryURL}/api/documents`);
    return response.json();
  }

  // Error handling wrapper
  async handleRequest(requestFn) {
    try {
      const result = await requestFn();
      if (!result.ok && result.status) {
        throw new Error(`HTTP ${result.status}: ${result.statusText}`);
      }
      return result;
    } catch (error) {
      console.error('Backend service error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const backendService = new UnifiedBackendService();

export default backendService;