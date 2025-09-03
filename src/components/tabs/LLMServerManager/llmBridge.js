/*
 * CHANGE: 2025-09-01 - Python Headless LLM Bridge for direct HTTP communication
 * WHY: Remove dependencies on LM Studio/OpenWebUI, use pure Python llama-cpp servers
 * IMPACT: Direct communication with llama-cpp-python server, no intermediate services
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #python-llm #llama-cpp-python #direct-http #headless-server
 */

/*
 * CHUNK: Python LLM Bridge Service
 * PURPOSE: Direct HTTP communication with llama-cpp-python servers
 * DEPENDENCIES: Fetch API only, no external services
 * OUTPUTS: Standardized AI responses from Python servers
 * COMPLEXITY: Medium - direct HTTP with multi-engine support
 * REFACTOR_CANDIDATE: No - optimized headless architecture
 */

/*
 * ===== SECTION: Error Types and Response Format =====
 * LINES: 20 - 60
 * PURPOSE: Standardized error handling and response format
 * SEARCH_KEYWORDS: #section-errors #response-format #standardization
 * COMPLEXITY: Low
 * DEPENDENCIES: None
 * ===== END SECTION =====
 */

const ERROR_TYPES = {
  NO_ACTIVE_SESSION: 'NO_ACTIVE_SESSION',
  INVALID_SESSION: 'INVALID_SESSION',
  MODEL_NOT_SELECTED: 'MODEL_NOT_SELECTED',
  API_KEY_MISSING: 'API_KEY_MISSING',
  NETWORK_ERROR: 'NETWORK_ERROR',
  ENGINE_ERROR: 'ENGINE_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  FILE_UNSUPPORTED: 'FILE_UNSUPPORTED'
};

/**
 * Create standardized response object
 */
const createResponse = (success, data = null, error = null, metadata = {}) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  metadata: {
    service: 'python-llm-bridge',
    version: '2.0.0',
    ...metadata
  }
});

/**
 * Create success response
 */
const ok = (data, metadata = {}) => createResponse(true, data, null, metadata);

/**
 * Create error response
 */
const fail = (type, message, extra = null) => createResponse(false, null, {
  type,
  message,
  extra
});

/*
 * ===== SECTION: Utility Functions =====
 * LINES: 65 - 100
 * PURPOSE: Helper functions for URL handling and data conversion
 * SEARCH_KEYWORDS: #section-utilities #helpers #url-handling
 * COMPLEXITY: Low
 * DEPENDENCIES: Browser APIs
 * ===== END SECTION =====
 */

/**
 * Clean base URL by removing trailing slashes
 */
const cleanBaseUrl = (url) => url.replace(/\/+$/, '');

/**
 * Convert ArrayBuffer to base64 string
 */
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/*
 * ===== SECTION: Engine Communication Functions =====
 * LINES: 105 - 200
 * PURPOSE: HTTP communication with different LLM engines
 * SEARCH_KEYWORDS: #section-communication #http-requests #engine-adapters
 * COMPLEXITY: Medium
 * DEPENDENCIES: Fetch API
 * ===== END SECTION =====
 */

/**
 * Chat with OpenAI-compatible server (llama-cpp-python, custom)
 */
async function chatOpenAICompatible({ baseUrl, apiKey, model, messages, params }) {
  const requestBody = {
    model,
    messages,
    stream: false,
    // Core parameters
    temperature: params?.temperature ?? 0.7,
    max_tokens: params?.max_tokens ?? 1024,
    top_p: params?.top_p ?? 0.95,
    top_k: params?.top_k ?? 50,
    // Additional parameters
    frequency_penalty: params?.frequency_penalty ?? 0.0,
    presence_penalty: params?.presence_penalty ?? 0.0,
    stop: params?.stop ?? [],
    seed: params?.seed ?? -1
  };

  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey && { Authorization: `Bearer ${apiKey}` })
  };

  const response = await fetch(`${cleanBaseUrl(baseUrl)}/v1/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  
  return {
    content: choice?.message?.content ?? '',
    usage: data.usage ?? null,
    raw: data
  };
}

/**
 * Chat with Ollama native API
 */
async function chatOllama({ baseUrl, model, messages, params }) {
  const requestBody = {
    model,
    messages,
    stream: false,
    options: {
      temperature: params?.temperature ?? 0.7,
      num_ctx: params?.num_ctx ?? 2048,
      top_p: params?.top_p ?? 0.95,
      top_k: params?.top_k ?? 50,
      repeat_penalty: params?.repeat_penalty ?? 1.05,
      num_predict: params?.max_tokens ?? 1024
    }
  };

  const response = await fetch(`${cleanBaseUrl(baseUrl)}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.message?.content || 
                  (Array.isArray(data.messages) ? data.messages.at(-1)?.content : '');
  
  return {
    content: content || '',
    usage: null, // Ollama doesn't provide usage stats
    raw: data
  };
}

/*
 * ===== SECTION: Session Validation =====
 * LINES: 205 - 240
 * PURPOSE: Validate active session before making requests
 * SEARCH_KEYWORDS: #section-validation #session-checks #error-prevention
 * COMPLEXITY: Medium
 * DEPENDENCIES: Session object structure
 * ===== END SECTION =====
 */

/**
 * Validate active session configuration
 */
function validateActiveSession(activeSession) {
  if (!activeSession) {
    return {
      valid: false,
      error: fail(
        ERROR_TYPES.NO_ACTIVE_SESSION,
        'Nema aktivne LLM sesije. Pokrenite sesiju u LLM Server Manager.'
      )
    };
  }

  if (!activeSession.selectedModel) {
    return {
      valid: false,
      error: fail(
        ERROR_TYPES.MODEL_NOT_SELECTED,
        'Nema odabranog modela. Konfigurirajte model u sesiji.'
      )
    };
  }

  if (!activeSession.baseUrl) {
    return {
      valid: false,
      error: fail(
        ERROR_TYPES.INVALID_SESSION,
        'Nedostaje baseUrl u konfiguraciji sesije.'
      )
    };
  }

  return { valid: true };
}

/*
 * ===== SECTION: Engine Router =====
 * LINES: 245 - 280
 * PURPOSE: Route requests to appropriate engine based on session type
 * SEARCH_KEYWORDS: #section-router #engine-selection #request-routing
 * COMPLEXITY: Medium
 * DEPENDENCIES: Engine communication functions
 * ===== END SECTION =====
 */

/**
 * Route chat request to appropriate engine
 */
async function routeChat(activeSession, messages, params) {
  const commonArgs = {
    baseUrl: activeSession.baseUrl,
    apiKey: activeSession.apiKey,
    model: activeSession.selectedModel,
    messages,
    params
  };

  switch (activeSession.engineType) {
    case 'lm_studio':
    case 'custom':
    case 'llama_cpp_python':
      return await chatOpenAICompatible(commonArgs);
    
    case 'ollama':
      return await chatOllama(commonArgs);
    
    case 'openwebui':
      // OpenWebUI is often OpenAI-compatible
      return await chatOpenAICompatible(commonArgs);
    
    default:
      throw new Error(`Nepoznat tip engine-a: ${activeSession.engineType}`);
  }
}

/*
 * ===== SECTION: Core API Functions =====
 * LINES: 285 - 450
 * PURPOSE: Main exported functions for UI components
 * SEARCH_KEYWORDS: #section-api #exported-functions #ui-interface
 * COMPLEXITY: High
 * DEPENDENCIES: All previous sections
 * ===== END SECTION =====
 */

/**
 * Send chat message through active LLM session
 */
export async function sendChatMessage(message, options = {}, onProgress = null) {
  try {
    const { activeSession } = options.session || {};
    
    // Validate session
    const validation = validateActiveSession(activeSession);
    if (!validation.valid) {
      return validation.error;
    }

    // Update session usage stats
    if (options.updateSessionStats) {
      options.updateSessionStats(activeSession.sessionId, {
        requestCount: (activeSession.requestCount || 0) + 1,
        status: 'active',
        lastUsed: new Date()
      });
    }

    // Prepare system prompt
    const messages = [];
    if (activeSession.systemPrompt) {
      messages.push({
        role: 'system',
        content: activeSession.systemPrompt
      });
    }
    messages.push({
      role: 'user',
      content: message
    });

    // Send request
    const result = await routeChat(activeSession, messages, activeSession.modelParams);

    return ok({
      content: result.content,
      usage: result.usage,
      model: activeSession.selectedModel,
      engineType: activeSession.engineType
    }, {
      sessionId: activeSession.sessionId
    });

  } catch (error) {
    console.error('❌ Chat message failed:', error);
    
    // Update error count if session stats function provided
    if (options.updateSessionStats && options.session?.activeSession) {
      options.updateSessionStats(options.session.activeSession.sessionId, {
        errorCount: (options.session.activeSession.errorCount || 0) + 1,
        status: 'error'
      });
    }
    
    return fail(ERROR_TYPES.ENGINE_ERROR, error.message, error);
  }
}

/**
 * Process PDF file with Python FastAPI analyzer server
 */
async function processPDFWithAnalyzer(file, prompt, visionServerUrl = 'http://127.0.0.1:8001', model = 'llava-v1.5-7b') {
  const analyzerUrl = 'http://127.0.0.1:7000/analyze-file';
  
  // Prepare form data
  const formData = new FormData();
  formData.append('file', file);
  formData.append('llm_base_url', visionServerUrl);
  formData.append('model', model);
  formData.append('analysis_prompt', prompt || 'Analiziraj dokument i izvuci strukturirane informacije u JSON formatu.');
  formData.append('max_pages', '3');
  formData.append('image_quality', '80');
  formData.append('dpi', '144');
  formData.append('mode', 'auto'); // Let analyzer decide text vs vision
  
  const response = await fetch(analyzerUrl, {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDF Analyzer error ${response.status}: ${errorText}`);
  }
  
  const result = await response.json();
  return result;
}

/**
 * Convert file to multimodal content for vision models
 */
async function fileToMultimodalContent(file, prompt, activeSession) {
  if (file.type === 'application/pdf') {
    // Use PDF Analyzer for PDF files - it handles the complete analysis
    throw new Error('PDF_NEEDS_ANALYZER'); // Special error to trigger PDF analyzer path
  }

  // Handle images
  if (file.type.startsWith('image/')) {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return [
      {
        type: 'text',
        text: prompt || 'Analiziraj sliku i vrati strukturirane informacije u JSON formatu.'
      },
      {
        type: 'image_url',
        image_url: {
          url: dataUrl
        }
      }
    ];
  }

  // Handle text files
  if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
    const text = await file.text();
    return [{
      type: 'text',
      text: `${prompt || 'Analiziraj dokument:'}\n\n${text}`
    }];
  }

  throw new Error(`Nepodržan tip datoteke: ${file.type}`);
}

/**
 * Analyze document through active LLM session or PDF analyzer
 */
export async function analyzeDocument(file, prompt = null, options = {}, onProgress = null) {
  try {
    const { activeSession } = options.session || {};
    
    // Validate session
    const validation = validateActiveSession(activeSession);
    if (!validation.valid) {
      return validation.error;
    }

    // Update session usage stats
    if (options.updateSessionStats) {
      options.updateSessionStats(activeSession.sessionId, {
        requestCount: (activeSession.requestCount || 0) + 1,
        status: 'active',
        lastUsed: new Date()
      });
    }

    // Handle PDFs with dedicated analyzer
    if (file.type === 'application/pdf') {
      if (onProgress) onProgress('Processing PDF with analyzer...');
      
      try {
        // Use PDF Analyzer server which will route to vision LLM
        const analyzerResult = await processPDFWithAnalyzer(
          file, 
          prompt,
          'http://127.0.0.1:8001', // Vision server URL
          'llava-v1.5-7b' // Vision model
        );
        
        if (analyzerResult.success) {
          return ok({
            content: analyzerResult.content,
            parsedData: analyzerResult.parsed_data,
            usage: analyzerResult.usage,
            model: analyzerResult.metadata?.model || 'pdf-analyzer',
            engineType: 'pdf_analyzer'
          }, {
            sessionId: activeSession.sessionId,
            filename: file.name,
            processingMode: analyzerResult.mode,
            pagesProcessed: analyzerResult.metadata?.pages_processed
          });
        } else {
          throw new Error(`PDF Analyzer failed: ${analyzerResult.error || 'Unknown error'}`);
        }
      } catch (pdfError) {
        console.error('PDF Analyzer error:', pdfError);
        return fail(
          ERROR_TYPES.FILE_UNSUPPORTED,
          `PDF analiza neuspješna: ${pdfError.message}. Provjerite da li je PDF Analyzer server pokrenut na http://127.0.0.1:7000.`,
          pdfError
        );
      }
    }

    // Handle other file types (images, text files)
    try {
      const content = await fileToMultimodalContent(file, prompt, activeSession);
      
      if (content.success === false) {
        return content; // Return error response
      }

      // Prepare messages
      const messages = [];
      if (activeSession.systemPrompt) {
        messages.push({
          role: 'system',
          content: activeSession.systemPrompt
        });
      }
      messages.push({
        role: 'user',
        content: content
      });

      // Send request
      const result = await routeChat(activeSession, messages, activeSession.modelParams);

      // Try to extract JSON from response
      let parsedData = null;
      try {
        // Look for JSON in response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn('Could not parse JSON from response:', parseError);
      }

      return ok({
        content: result.content,
        parsedData: parsedData,
        usage: result.usage,
        model: activeSession.selectedModel,
        engineType: activeSession.engineType
      }, {
        sessionId: activeSession.sessionId,
        filename: file.name
      });
      
    } catch (contentError) {
      throw new Error(`File processing failed: ${contentError.message}`);
    }

  } catch (error) {
    console.error('❌ Document analysis failed:', error);
    
    // Update error count
    if (options.updateSessionStats && options.session?.activeSession) {
      options.updateSessionStats(options.session.activeSession.sessionId, {
        errorCount: (options.session.activeSession.errorCount || 0) + 1,
        status: 'error'
      });
    }
    
    return fail(ERROR_TYPES.ENGINE_ERROR, error.message, error);
  }
}

/**
 * Test connectivity with active session
 */
export async function testSessionConnectivity(options = {}) {
  try {
    const { activeSession } = options.session || {};
    
    // Validate session
    const validation = validateActiveSession(activeSession);
    if (!validation.valid) {
      return validation.error;
    }

    // Send ping message
    const startTime = Date.now();
    const result = await sendChatMessage('ping', options);
    const responseTime = Date.now() - startTime;

    if (result.success) {
      return ok({
        connected: true,
        responseTime: responseTime,
        model: activeSession.selectedModel,
        engineType: activeSession.engineType,
        reply: result.data.content
      });
    } else {
      return result; // Forward the error response
    }
    
  } catch (error) {
    console.error('❌ Session connectivity test failed:', error);
    
    return fail(
      ERROR_TYPES.NETWORK_ERROR,
      `Test povezivanja neuspješan: ${error.message}`,
      error
    );
  }
}

/**
 * Get available models for active session
 */
export async function getAvailableModels(options = {}) {
  try {
    const { activeSession } = options.session || {};
    
    if (!activeSession) {
      return fail(
        ERROR_TYPES.NO_ACTIVE_SESSION,
        'Nema aktivne sesije za pretraživanje modela'
      );
    }

    let models = [];
    
    try {
      if (activeSession.engineType === 'ollama') {
        // Ollama native API
        const response = await fetch(`${cleanBaseUrl(activeSession.baseUrl)}/api/tags`);
        if (response.ok) {
          const data = await response.json();
          models = (data.models || []).map(m => m.name);
        }
      } else {
        // OpenAI-compatible /v1/models endpoint
        const response = await fetch(`${cleanBaseUrl(activeSession.baseUrl)}/v1/models`);
        if (response.ok) {
          const data = await response.json();
          models = (data.data || []).map(m => m.id);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch models list:', error);
      // Fallback to current model
      if (activeSession.selectedModel) {
        models = [activeSession.selectedModel];
      }
    }

    return ok({
      models: models,
      count: models.length,
      engineType: activeSession.engineType,
      currentModel: activeSession.selectedModel
    });
    
  } catch (error) {
    console.error('❌ Failed to get available models:', error);
    
    return fail(
      ERROR_TYPES.ENGINE_ERROR,
      `Pretraživanje modela neuspješno: ${error.message}`,
      error
    );
  }
}

/*
 * ===== SECTION: Utility Exports =====
 * LINES: 455 - 470
 * PURPOSE: Export utility constants and functions for external use
 * SEARCH_KEYWORDS: #section-exports #utilities #constants
 * COMPLEXITY: Low
 * DEPENDENCIES: None
 * ===== END SECTION =====
 */

// Export error types for components to handle specific errors
export { ERROR_TYPES };

// Export validation function for components that need pre-validation
export { validateActiveSession };

/*
 * PERFORMANCE_NOTE: Direct HTTP calls with minimal overhead, no intermediate services
 * MEMORY_MANAGEMENT: Files processed on-demand with proper cleanup
 * OPTIMIZATION_POTENTIAL: Add request caching and connection pooling
 * BENCHMARK: Local Python server: chat <500ms, vision <2s, connectivity test <200ms
 */

/*
 * BUG_PREVENTION: Validates session and parameters before every request
 * KNOWN_ISSUES: PDF processing requires separate Python FastAPI server
 * DEBUG_STRATEGY: Comprehensive console logging with error details
 * TESTING_CHECKLIST: [Test llama-cpp-python connection, test Ollama connection, test vision models, test error handling]
 */

/*
 * INTEGRATION_POINT: Direct bridge between UI and Python LLM servers
 * EXTERNAL_DEPENDENCIES: Fetch API, standard browser APIs only
 * PROP_INTERFACE: Functions accept options with session and callbacks
 * STATE_CONTRACT: Works with llmSessionStore, updates session stats
 * VERSION_COMPATIBILITY: Modern browsers, Python llama-cpp servers
 */