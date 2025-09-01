/*
 * CHANGE: 2025-09-01 - Created AI integration service for OpenWebUI and LM Studio
 * WHY: Enable file upload from app interface to local AI systems for document processing
 * IMPACT: Allows users to upload documents directly from aluminum store UI to AI systems
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #ai-integration #file-upload #openwebui #lm-studio
 */

/*
 * CHUNK: AI Integration Service
 * PURPOSE: Handles communication with OpenWebUI and LM Studio APIs
 * DEPENDENCIES: fetch API, FormData
 * OUTPUTS: Upload results, processing status, error handling
 * COMPLEXITY: Medium - API communication with error handling
 * REFACTOR_CANDIDATE: No - focused service implementation
 */

class AIIntegrationService {
  constructor() {
    // Default configurations - can be overridden via environment variables
    this.openWebUIConfig = {
      baseUrl: 'http://localhost:8080',
      apiKey: null, // Will be set by user
      timeout: 30000
    };
    
    this.lmStudioConfig = {
      baseUrl: 'http://10.39.35.136:1234', // Default LM Studio port
      timeout: 30000
    };
  }

  /*
   * CHUNK: OpenWebUI Configuration
   * PURPOSE: Set API key and base URL for OpenWebUI
   * DEPENDENCIES: None
   * OUTPUTS: Updated configuration
   * COMPLEXITY: Low
   */
  setOpenWebUIConfig(apiKey, baseUrl = 'http://localhost:8080') {
    this.openWebUIConfig.apiKey = apiKey;
    this.openWebUIConfig.baseUrl = baseUrl;
  }

  /*
   * CHUNK: LM Studio Configuration  
   * PURPOSE: Set base URL for LM Studio
   * DEPENDENCIES: None
   * OUTPUTS: Updated configuration
   * COMPLEXITY: Low
   */
  setLMStudioConfig(baseUrl = 'http://10.39.35.136:1234') {
    this.lmStudioConfig.baseUrl = baseUrl;
  }

  /*
   * CHUNK: OpenWebUI File Upload
   * PURPOSE: Upload file to OpenWebUI for RAG processing
   * DEPENDENCIES: FormData, fetch API, OpenWebUI API key
   * OUTPUTS: Upload result with file ID or error
   * COMPLEXITY: Medium - multipart form handling with authentication
   * PERFORMANCE_NOTE: Uses FormData for efficient file transfer
   */
  async uploadToOpenWebUI(file, onProgress = null) {
    if (!this.openWebUIConfig.apiKey) {
      throw new Error('OpenWebUI API key not configured. Use setOpenWebUIConfig() first.');
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const headers = {
        'Authorization': `Bearer ${this.openWebUIConfig.apiKey}`,
        'Accept': 'application/json'
      };
      
      console.log('Upload attempt with headers:', {
        baseUrl: this.openWebUIConfig.baseUrl,
        apiKey: this.openWebUIConfig.apiKey ? `${this.openWebUIConfig.apiKey.substring(0, 4)}...` : 'NOT SET',
        headers: headers
      });

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.openWebUIConfig.timeout);

      if (onProgress) {
        onProgress({ status: 'uploading', progress: 0 });
      }

      // Try multiple possible endpoints for different OpenWebUI versions
      let response;
      const endpoints = [
        `/api/v1/files/`,
        `/api/v1/files/upload/`,
        `/api/files/`,
        `/api/files/upload/`,
        `/rag/api/v1/document/upload`
      ];

      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await fetch(`${this.openWebUIConfig.baseUrl}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
            signal: controller.signal
          });
          
          if (response.ok) {
            break; // Success, exit loop
          } else if (response.status !== 405 && response.status !== 404) {
            // If it's not "method not allowed" or "not found", it might be the right endpoint with different error
            break;
          }
        } catch (error) {
          lastError = error;
          continue; // Try next endpoint
        }
      }
      
      if (!response) {
        throw lastError || new Error('All upload endpoints failed');
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenWebUI upload error details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          errorData
        });
        throw new Error(`OpenWebUI upload failed: ${response.status} ${response.statusText}. ${errorData.detail || errorData.message || ''}`);
      }

      const result = await response.json();

      if (onProgress) {
        onProgress({ status: 'completed', progress: 100, result });
      }

      // Check if the upload was successful but processing failed
      let processingWarning = null;
      if (result.id && result.filename) {
        // File was uploaded but might have processing issues
        // This is common with PDFs that are image-based or have complex formatting
        processingWarning = "File uploaded successfully. If it's a PDF with images or complex formatting, OpenWebUI might have trouble extracting text content.";
      }

      return {
        success: true,
        service: 'openwebui',
        fileId: result.id,
        filename: result.filename,
        size: result.size,
        uploadDate: new Date().toISOString(),
        warning: processingWarning,
        result
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Upload timeout - file too large or connection slow');
      }
      
      if (onProgress) {
        onProgress({ status: 'error', error: error.message });
      }
      
      throw error;
    }
  }

  /*
   * CHUNK: Raw LM Studio File Upload
   * PURPOSE: Upload file directly to LM Studio without any preprocessing
   * DEPENDENCIES: FormData, LM Studio files endpoint
   * OUTPUTS: Raw LM Studio file upload response
   * COMPLEXITY: Low - direct file upload
   */
  async uploadRawToLMStudio(file, onProgress = null) {
    try {
      if (onProgress) {
        onProgress({ status: 'uploading', progress: 0 });
      }

      const formData = new FormData();
      formData.append('file', file);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.lmStudioConfig.timeout);

      // Try LM Studio files endpoint (if available)
      const response = await fetch(`${this.lmStudioConfig.baseUrl}/v1/files`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        
        if (onProgress) {
          onProgress({ status: 'completed', progress: 100, result });
        }

        return {
          success: true,
          service: 'lmstudio-raw',
          fileId: result.id || 'raw-upload',
          filename: file.name,
          uploadDate: new Date().toISOString(),
          result
        };
      } else {
        throw new Error(`LM Studio raw upload failed: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Upload timeout');
      }
      
      if (onProgress) {
        onProgress({ status: 'error', error: error.message });
      }
      
      // Fallback to content processing if raw upload fails
      console.warn('Raw upload failed, falling back to content processing:', error.message);
      return this.processWithLMStudio(file, "Analyze this file:", onProgress);
    }
  }

  /*
   * CHUNK: LM Studio File Content Processing
   * PURPOSE: Send file content to LM Studio as chat message for processing
   * DEPENDENCIES: FileReader API, LM Studio chat completions endpoint
   * OUTPUTS: AI processing result
   * COMPLEXITY: Medium - file reading and chat API integration
   * BUG_PREVENTION: Handles large files by chunking content if needed
   */
  async processWithLMStudio(file, prompt = "Please analyze this document:", onProgress = null, modelParams = {}) {
    try {
      if (onProgress) {
        onProgress({ status: 'reading', progress: 25 });
      }

      // Read file content
      const fileContent = await this.readFileContent(file);
      
      if (onProgress) {
        onProgress({ status: 'processing', progress: 50 });
      }

      // Prepare chat completion request with custom parameters
      const requestBody = {
        model: modelParams.selectedModel || "local-model", // Use selected model or default
        messages: [
          {
            role: "user",
            content: `${prompt}\n\nDocument Content:\n${fileContent}`
          }
        ],
        // Core parameters
        temperature: modelParams.temperature !== undefined ? modelParams.temperature : 0.7,
        max_tokens: modelParams.max_tokens !== undefined ? modelParams.max_tokens : 2000,
        top_p: modelParams.top_p !== undefined ? modelParams.top_p : 0.95,
        top_k: modelParams.top_k !== undefined ? modelParams.top_k : 50,
        repeat_penalty: modelParams.repeat_penalty !== undefined ? modelParams.repeat_penalty : 1.1,
        
        // Advanced sampling parameters
        frequency_penalty: modelParams.frequency_penalty !== undefined ? modelParams.frequency_penalty : 0.0,
        presence_penalty: modelParams.presence_penalty !== undefined ? modelParams.presence_penalty : 0.0,
        stop: modelParams.stop || [],
        
        // Mirostat parameters
        mirostat: modelParams.mirostat !== undefined ? modelParams.mirostat : 0,
        mirostat_eta: modelParams.mirostat_eta !== undefined ? modelParams.mirostat_eta : 0.1,
        mirostat_tau: modelParams.mirostat_tau !== undefined ? modelParams.mirostat_tau : 5.0,
        
        // Context and memory parameters
        num_ctx: modelParams.num_ctx !== undefined ? modelParams.num_ctx : 2048,
        num_predict: modelParams.num_predict !== undefined ? modelParams.num_predict : -1,
        num_keep: modelParams.num_keep !== undefined ? modelParams.num_keep : 0,
        
        // Token penalties
        repeat_last_n: modelParams.repeat_last_n !== undefined ? modelParams.repeat_last_n : 64,
        tfs_z: modelParams.tfs_z !== undefined ? modelParams.tfs_z : 1.0,
        typical_p: modelParams.typical_p !== undefined ? modelParams.typical_p : 1.0,
        
        // Generation control
        seed: modelParams.seed !== undefined ? modelParams.seed : -1,
        num_thread: modelParams.num_thread !== undefined ? modelParams.num_thread : 0
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.lmStudioConfig.timeout);

      const response = await fetch(`${this.lmStudioConfig.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LM Studio processing failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
      }

      const result = await response.json();

      if (onProgress) {
        onProgress({ status: 'completed', progress: 100, result });
      }

      return {
        success: true,
        service: 'lmstudio',
        filename: file.name,
        processedAt: new Date().toISOString(),
        response: result.choices[0]?.message?.content || '',
        usage: result.usage,
        result
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Processing timeout - document too large or model slow');
      }
      
      if (onProgress) {
        onProgress({ status: 'error', error: error.message });
      }
      
      throw error;
    }
  }

  /*
   * CHUNK: File Content Reader
   * PURPOSE: Convert file to text content for processing
   * DEPENDENCIES: FileReader API
   * OUTPUTS: String content of file
   * COMPLEXITY: Low - standard file reading
   * MEMORY_MANAGEMENT: Handles large files with size limits
   */
  async readFileContent(file) {
    return new Promise((resolve, reject) => {
      // Check file size (limit to 10MB for text processing)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        reject(new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file content'));
      };
      
      // Read as text for most document types
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        reader.readAsText(file);
      } else {
        // For other types, read as data URL and extract text if possible
        reader.readAsText(file);
      }
    });
  }

  /*
   * CHUNK: Batch File Processing
   * PURPOSE: Process multiple files sequentially
   * DEPENDENCIES: Individual upload/process methods
   * OUTPUTS: Array of results
   * COMPLEXITY: Medium - batch processing with error handling
   */
  async processBatch(files, service = 'openwebui', options = {}) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        if (options.onFileProgress) {
          options.onFileProgress({ 
            fileIndex: i, 
            totalFiles: files.length, 
            currentFile: file.name,
            status: 'processing'
          });
        }

        let result;
        if (service === 'openwebui') {
          result = await this.uploadToOpenWebUI(file, options.onProgress);
        } else if (service === 'lmstudio') {
          result = await this.processWithLMStudio(file, options.prompt, options.onProgress);
        } else {
          throw new Error(`Unknown service: ${service}`);
        }

        results.push({ file: file.name, success: true, ...result });

      } catch (error) {
        results.push({ 
          file: file.name, 
          success: false, 
          error: error.message 
        });
      }
    }

    if (options.onFileProgress) {
      options.onFileProgress({ 
        fileIndex: files.length, 
        totalFiles: files.length, 
        status: 'completed',
        results
      });
    }

    return results;
  }

  /*
   * CHUNK: OpenWebUI Endpoint Discovery
   * PURPOSE: Test different API endpoints to find the correct upload path
   * DEPENDENCIES: fetch API
   * OUTPUTS: Available endpoints and their response codes
   * COMPLEXITY: Medium - multiple endpoint testing
   */
  async discoverOpenWebUIEndpoints() {
    const testEndpoints = [
      '/api/v1/files/',
      '/api/v1/files/upload/',
      '/api/files/',
      '/api/files/upload/',
      '/rag/api/v1/document/upload',
      '/api/v1/documents/',
      '/api/v1/documents/upload/',
      '/api/v1/models',
      '/api/health'
    ];

    const results = {};
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${this.openWebUIConfig.baseUrl}${endpoint}`, {
          method: 'GET',
          headers: this.openWebUIConfig.apiKey ? {
            'Authorization': `Bearer ${this.openWebUIConfig.apiKey}`,
            'Accept': 'application/json'
          } : { 'Accept': 'application/json' }
        });
        
        results[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          method: 'GET'
        };

        // Also test POST if GET works or returns method not allowed
        if (response.status === 200 || response.status === 405) {
          try {
            const postResponse = await fetch(`${this.openWebUIConfig.baseUrl}${endpoint}`, {
              method: 'POST',
              headers: this.openWebUIConfig.apiKey ? {
                'Authorization': `Bearer ${this.openWebUIConfig.apiKey}`,
                'Accept': 'application/json'
              } : { 'Accept': 'application/json' }
            });
            
            results[`${endpoint} (POST)`] = {
              status: postResponse.status,
              statusText: postResponse.statusText,
              method: 'POST'
            };
          } catch (error) {
            results[`${endpoint} (POST)`] = { error: error.message, method: 'POST' };
          }
        }
        
      } catch (error) {
        results[endpoint] = { error: error.message, method: 'GET' };
      }
    }

    return results;
  }

  /*
   * CHUNK: API Key Test
   * PURPOSE: Test if API key is valid by making a simple authenticated request
   * DEPENDENCIES: fetch API
   * OUTPUTS: Authentication status
   * COMPLEXITY: Low - simple auth test
   */
  async testAPIKey() {
    try {
      const response = await fetch(`${this.openWebUIConfig.baseUrl}/api/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.openWebUIConfig.apiKey}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('API Key test response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return {
        valid: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      console.error('API Key test error:', error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /*
   * CHUNK: Service Health Check
   * PURPOSE: Verify if AI services are running and accessible
   * DEPENDENCIES: fetch API
   * OUTPUTS: Service availability status
   * COMPLEXITY: Low - simple connectivity check
   */
  async checkServiceHealth() {
    const results = {
      openwebui: { available: false, error: null },
      lmstudio: { available: false, error: null }
    };

    // Check OpenWebUI
    try {
      const response = await fetch(`${this.openWebUIConfig.baseUrl}/api/v1/models`, {
        method: 'GET',
        headers: this.openWebUIConfig.apiKey ? {
          'Authorization': `Bearer ${this.openWebUIConfig.apiKey}`
        } : {}
      });
      results.openwebui.available = response.ok;
      if (!response.ok) {
        results.openwebui.error = `HTTP ${response.status}`;
      }
    } catch (error) {
      results.openwebui.error = error.message;
    }

    // Check LM Studio
    try {
      const response = await fetch(`${this.lmStudioConfig.baseUrl}/v1/models`);
      results.lmstudio.available = response.ok;
      if (!response.ok) {
        results.lmstudio.error = `HTTP ${response.status}`;
      }
    } catch (error) {
      results.lmstudio.error = error.message;
    }

    return results;
  }

  /*
   * CHUNK: OpenWebUI Chat Analysis
   * PURPOSE: Send chat message to analyze uploaded file and return structured data
   * DEPENDENCIES: OpenWebUI API key, uploaded file ID
   * OUTPUTS: Structured analysis result from OpenWebUI
   * COMPLEXITY: Medium - chat API integration with file reference
   */
  async analyzeUploadedFile(fileId, analysisPrompt, selectedModel = null, onProgress = null) {
    if (!this.openWebUIConfig.apiKey) {
      throw new Error('OpenWebUI API key not configured. Use setOpenWebUIConfig() first.');
    }

    try {
      if (onProgress) {
        onProgress({ status: 'analyzing', progress: 50 });
      }

      // Always use user-selected model for OpenWebUI (no automatic selection)
      let modelToUse = selectedModel;
      
      if (!selectedModel) {
        throw new Error('No model selected. Please select a model from the dropdown in settings before using OpenWebUI analysis.');
      }
      
      console.log('✅ Using user-selected OpenWebUI model:', selectedModel);

      // Prepare chat completion request that references the uploaded file
      const requestBody = {
        model: modelToUse,
        messages: [
          {
            role: "user",
            content: `#${fileId}\n\n${analysisPrompt}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        stream: false
      };

      const headers = {
        'Authorization': `Bearer ${this.openWebUIConfig.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      console.log('🤖 Sending analysis request to OpenWebUI...', {
        fileId,
        baseUrl: this.openWebUIConfig.baseUrl
      });

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.openWebUIConfig.timeout);

      const response = await fetch(`${this.openWebUIConfig.baseUrl}/api/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenWebUI analysis error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData
        });
        throw new Error(`OpenWebUI analysis failed: ${response.status} ${response.statusText}. ${errorData.detail || errorData.message || ''}`);
      }

      const data = await response.json();
      const analysisResult = data.choices[0]?.message?.content || '';

      if (onProgress) {
        onProgress({ status: 'completed', progress: 100, result: analysisResult });
      }

      return {
        success: true,
        service: 'openwebui-analysis',
        fileId: fileId,
        analysisResult: analysisResult,
        processedAt: new Date().toISOString(),
        rawResponse: data
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Analysis timeout - OpenWebUI took too long to respond');
      }
      
      if (onProgress) {
        onProgress({ status: 'error', error: error.message });
      }
      
      throw error;
    }
  }

  /*
   * CHUNK: OpenWebUI Models Discovery
   * PURPOSE: Fetch list of available models in OpenWebUI for debugging
   * DEPENDENCIES: OpenWebUI API key
   * OUTPUTS: List of available models with metadata
   * COMPLEXITY: Low - simple API call
   */
  async getAvailableModels() {
    if (!this.openWebUIConfig.apiKey) {
      throw new Error('OpenWebUI API key not configured. Use setOpenWebUIConfig() first.');
    }

    try {
      const response = await fetch(`${this.openWebUIConfig.baseUrl}/api/v1/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.openWebUIConfig.apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const models = data.data || data.models || [];
      
      console.log('📋 OpenWebUI Models:', models);
      
      return {
        success: true,
        models: models,
        count: models.length,
        modelNames: models.map(m => m.id || m.name || m)
      };

    } catch (error) {
      console.error('❌ Failed to fetch OpenWebUI models:', error);
      return {
        success: false,
        error: error.message,
        models: [],
        count: 0,
        modelNames: []
      };
    }
  }
}

/*
 * INTEGRATION_POINT: Singleton pattern for global access
 * EXTERNAL_DEPENDENCIES: None - pure JavaScript service
 * PROP_INTERFACE: Configuration methods and processing functions
 * STATE_CONTRACT: Stateless service with configuration storage
 * VERSION_COMPATIBILITY: Modern browsers with fetch API support
 */
const aiIntegrationService = new AIIntegrationService();

export default aiIntegrationService;
export { AIIntegrationService };