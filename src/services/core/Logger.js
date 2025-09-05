/**
 * Logger - Sveobuhvatan logging sistem za aplikaciju
 * 
 * Omogućava strukturirano logovanje sa različitim nivoima,
 * performance monitoring, error tracking i debug funkcionalnosti
 * 
 * @class Logger
 */
class Logger {
  constructor(module, level = 'info') {
    this.module = module;
    this.level = level;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    
    // Log levels (lower number = higher priority)
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    // Colors za console output
    this.colors = {
      error: '#ff4757',
      warn: '#ffa726', 
      info: '#42a5f5',
      debug: '#66bb6a',
      trace: '#ab47bc'
    };
    
    // Performance timers
    this.timers = new Map();
  }

  /**
   * Provjeri da li je log level aktivan
   * @param {string} level - Log level
   * @returns {boolean}
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  /**
   * Format log message sa metadata
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {Object} context - Additional context
   * @returns {Object} Formatted log entry
   */
  formatLogEntry(level, message, context = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      context,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    };
  }

  /**
   * Log error sa stack trace i context
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @param {Object} context - Dodatni kontekst
   */
  error(message, error = null, context = {}) {
    if (!this.shouldLog('error')) return;

    const logEntry = this.formatLogEntry('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null
    });

    // Console output za development
    if (this.isDevelopment) {
      console.group(`🔴 [${this.module}] ERROR: ${message}`);
      console.log('Time:', logEntry.timestamp);
      console.log('Context:', context);
      if (error) {
        console.error('Error:', error);
      }
      console.log('Memory:', this.getMemoryUsage());
      console.groupEnd();
    }
    
    // Send to error tracking service (production)
    this.sendToErrorService(logEntry);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  warn(message, context = {}) {
    if (!this.shouldLog('warn')) return;

    const logEntry = this.formatLogEntry('warn', message, context);

    if (this.isDevelopment) {
      console.warn(`⚠️ [${this.module}] WARN: ${message}`, context);
    }
    
    this.sendToLogService(logEntry);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {Object} context - Additional context
   */
  info(message, context = {}) {
    if (!this.shouldLog('info')) return;

    const logEntry = this.formatLogEntry('info', message, context);

    if (this.isDevelopment) {
      console.log(`ℹ️ [${this.module}] INFO: ${message}`, context);
    }
    
    this.sendToLogService(logEntry);
  }

  /**
   * Log debug message (samo u development)
   * @param {string} message - Debug message
   * @param {Object} context - Additional context
   */
  debug(message, context = {}) {
    if (!this.shouldLog('debug') || !this.isDevelopment) return;

    console.log(`🐛 [${this.module}] DEBUG: ${message}`, context);
  }

  /**
   * Log trace message (detaljni debug)
   * @param {string} message - Trace message
   * @param {Object} context - Additional context
   */
  trace(message, context = {}) {
    if (!this.shouldLog('trace') || !this.isDevelopment) return;

    console.trace(`🔍 [${this.module}] TRACE: ${message}`, context);
  }

  /**
   * Start performance timer
   * @param {string} name - Timer name
   */
  time(name) {
    this.timers.set(name, performance.now());
    this.debug(`Timer started: ${name}`);
  }

  /**
   * End performance timer i log rezultat
   * @param {string} name - Timer name
   * @param {Object} context - Additional metrics
   */
  timeEnd(name, context = {}) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      this.warn(`Timer "${name}" not found`);
      return;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    const logEntry = this.formatLogEntry('info', `Performance: ${name}`, {
      duration: Math.round(duration * 100) / 100, // Round to 2 decimals
      ...context,
      memory: this.getMemoryUsage()
    });

    if (this.isDevelopment) {
      console.group(`⚡ [${this.module}] PERFORMANCE: ${name}`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.log('Context:', context);
      console.log('Memory:', this.getMemoryUsage());
      console.groupEnd();
    }

    // Track performance metrics
    this.sendToAnalytics('performance', logEntry.context);
    
    return duration;
  }

  /**
   * Log user interactions
   * @param {string} action - User action
   * @param {Object} data - Action data
   */
  userAction(action, data = {}) {
    const logEntry = this.formatLogEntry('info', `User Action: ${action}`, {
      action,
      ...data
    });

    if (this.isDevelopment) {
      console.log(`👆 [${this.module}] USER ACTION: ${action}`, data);
    }
    
    this.sendToAnalytics('user_action', logEntry.context);
  }

  /**
   * Log AI operations detaljno
   * @param {string} aiService - AI service name (Google, OpenAI, etc.)
   * @param {string} operation - Operation type
   * @param {Object} request - Request data
   * @param {Object} response - Response data
   * @param {number} duration - Operation duration
   */
  aiOperation(aiService, operation, request, response, duration = 0) {
    const logEntry = this.formatLogEntry('info', `AI Operation: ${aiService} - ${operation}`, {
      aiService,
      operation,
      duration,
      request: this.sanitizeAIData(request),
      response: this.sanitizeAIData(response),
      tokens: response?.usage || null,
      cost: this.estimateAICost(aiService, response?.usage)
    });

    if (this.isDevelopment) {
      console.group(`🤖 [${this.module}] AI: ${aiService} - ${operation}`);
      console.log('Duration:', duration + 'ms');
      console.log('Request:', logEntry.context.request);
      console.log('Response:', logEntry.context.response);
      console.log('Tokens:', logEntry.context.tokens);
      if (logEntry.context.cost) {
        console.log('Estimated Cost:', logEntry.context.cost);
      }
      console.groupEnd();
    }

    this.sendToAnalytics('ai_operation', logEntry.context);
  }

  /**
   * Log file operations
   * @param {string} operation - File operation (upload, download, process)
   * @param {string} fileName - File name
   * @param {Object} metadata - File metadata
   */
  fileOperation(operation, fileName, metadata = {}) {
    this.info(`File ${operation}: ${fileName}`, {
      operation,
      fileName,
      size: metadata.size,
      type: metadata.type,
      ...metadata
    });
  }

  /**
   * Get current memory usage
   * @returns {Object} Memory usage info
   */
  getMemoryUsage() {
    if (typeof window !== 'undefined' && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      };
    }
    return null;
  }

  /**
   * Sanitize AI data za logging (ukloni sensitive info)
   * @param {Object} data - Data za sanitizaciju
   * @returns {Object} Sanitized data
   */
  sanitizeAIData(data) {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Ukloni API keys
    if (sanitized.apiKey) {
      sanitized.apiKey = '***HIDDEN***';
    }
    
    // Skrati file data
    if (sanitized.files && Array.isArray(sanitized.files)) {
      sanitized.files = sanitized.files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      }));
    }
    
    // Skrati response data ako je prevelik
    if (sanitized.data && JSON.stringify(sanitized.data).length > 1000) {
      sanitized.data = '[LARGE_DATA_TRUNCATED]';
    }
    
    return sanitized;
  }

  /**
   * Estimate AI operation cost (samo grubo)
   * @param {string} aiService - AI service name
   * @param {Object} usage - Token usage info
   * @returns {string|null} Estimated cost
   */
  estimateAICost(aiService, usage) {
    if (!usage) return null;
    
    // Grubo estimate - ovo bi trebalo biti konfiguratorno
    const costs = {
      'google': {
        input: 0.00025, // per 1K tokens
        output: 0.0005
      },
      'openai': {
        input: 0.003,
        output: 0.006
      }
    };
    
    const serviceCosts = costs[aiService.toLowerCase()];
    if (!serviceCosts) return null;
    
    const inputCost = (usage.prompt_tokens || 0) / 1000 * serviceCosts.input;
    const outputCost = (usage.completion_tokens || 0) / 1000 * serviceCosts.output;
    const totalCost = inputCost + outputCost;
    
    return `$${totalCost.toFixed(4)}`;
  }

  /**
   * Send log to error tracking service
   * @param {Object} logEntry - Log entry
   */
  sendToErrorService(logEntry) {
    // TODO: Implementiraj integraciju sa Sentry, LogRocket, etc.
    if (!this.isDevelopment) {
      console.log('Would send to error service:', logEntry);
    }
  }

  /**
   * Send log to logging service
   * @param {Object} logEntry - Log entry
   */
  sendToLogService(logEntry) {
    // TODO: Implementiraj integraciju sa centralizovanim logging servisom
    if (!this.isDevelopment) {
      console.log('Would send to log service:', logEntry);
    }
  }

  /**
   * Send analytics event
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   */
  sendToAnalytics(eventType, eventData) {
    // TODO: Implementiraj integraciju sa analytics servisom
    if (!this.isDevelopment) {
      console.log('Would send analytics:', { eventType, eventData });
    }
  }
}

// Create module-specific logger instances
export const invoiceLogger = new Logger('InvoiceProcessor');
export const aiLogger = new Logger('AIService');
export const fileLogger = new Logger('FileService');
export const uiLogger = new Logger('UI');
export const systemLogger = new Logger('System');

// Export Logger class za kreiranje custom logger-a
export { Logger };

// Export default logger
export default invoiceLogger;