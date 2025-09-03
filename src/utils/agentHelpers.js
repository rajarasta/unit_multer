// Agent API helper functions
// Provides simple interface for PDF Agent integration

/**
 * CHANGE: 2025-09-01 - Created PDF Agent helper utilities
 * WHY: Centralize agent API communication and provide reusable functions
 * IMPACT: Enables easy integration of PDF Agent across different components
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #agent-helpers #pdf-processing #api-integration
 */

const DEFAULT_AGENT_URL = 'http://127.0.0.1:7001';

/**
 * Analyze file using PDF Agent with autonomous tool selection
 * @param {File} file - File object to analyze
 * @param {Object} options - Configuration options
 * @param {string} options.agentUrl - Agent server URL
 * @param {number} options.maxPages - Maximum pages to process (default: 3)
 * @param {Function} options.onProgress - Progress callback function
 * @returns {Promise<Object>} Analysis result
 */
export async function agentAnalyzeFile(file, options = {}) {
  const {
    agentUrl = DEFAULT_AGENT_URL,
    maxPages = 3,
    onProgress
  } = options;

  if (onProgress) onProgress('Priprema file za agent analizu...', 10);

  try {
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('max_pages', maxPages.toString());

    if (onProgress) onProgress('Šalje file na PDF Agent server...', 30);

    // Send to agent server
    const response = await fetch(`${agentUrl}/agent/analyze-file`, {
      method: 'POST',
      body: formData
    });

    if (onProgress) onProgress('Agent obrađuje dokument...', 60);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Agent server error (${response.status}): ${errorText}`);
    }

    const result = await response.json();

    if (onProgress) onProgress('Agent analiza završena!', 100);

    // Check if we got a valid result
    if (!result || typeof result !== 'object') {
      throw new Error('Agent returned invalid result format');
    }

    if (result.error) {
      throw new Error(result.error);
    }

    return result;

  } catch (error) {
    console.error('🤖 PDF Agent analysis failed:', error);
    
    // Re-throw with more context
    if (error.message.includes('Failed to fetch') || error.message.includes('ECONNREFUSED')) {
      throw new Error(`PDF Agent server nedostupan na ${agentUrl}. Pokrenuti: start_agent_stack.bat`);
    }
    
    throw error;
  }
}

/**
 * Check if PDF Agent server is available and healthy
 * @param {string} agentUrl - Agent server URL
 * @returns {Promise<boolean>} True if agent is available
 */
export async function checkAgentHealth(agentUrl = DEFAULT_AGENT_URL) {
  try {
    // Try to reach the FastAPI docs endpoint
    const response = await fetch(`${agentUrl}/docs`, {
      method: 'GET',
      timeout: 5000
    });
    
    return response.ok;
  } catch (error) {
    console.warn('Agent health check failed:', error);
    return false;
  }
}

/**
 * Get agent server status with detailed information
 * @param {string} agentUrl - Agent server URL  
 * @returns {Promise<Object>} Status information
 */
export async function getAgentStatus(agentUrl = DEFAULT_AGENT_URL) {
  const status = {
    agentServer: false,
    textLLM: false,
    visionLLM: false,
    errors: []
  };

  try {
    // Check agent server
    status.agentServer = await checkAgentHealth(agentUrl);
    if (!status.agentServer) {
      status.errors.push(`Agent server nedostupan na ${agentUrl}`);
    }

    // TODO: Add checks for TEXT LLM (port 8000) and VISION LLM (port 8001)
    // This would require the agent server to provide a health endpoint
    // that checks its downstream dependencies

  } catch (error) {
    status.errors.push(`Status check failed: ${error.message}`);
  }

  return status;
}

/**
 * Format agent error for user display
 * @param {Error} error - Error object from agent operation
 * @returns {Object} Formatted error with user-friendly message and actions
 */
export function formatAgentError(error) {
  const message = error.message || 'Unknown agent error';
  
  if (message.includes('Failed to fetch') || message.includes('ECONNREFUSED')) {
    return {
      title: 'PDF Agent Nedostupan',
      message: 'Agent server nije pokrenut',
      actions: [
        'Pokrenuti: start_agent_stack.bat',
        'Ili individualno: python agent_server.py',
        'Provjeriti da li su LLM serveri pokrenuti (portovi 8000 i 8001)'
      ],
      severity: 'error'
    };
  }
  
  if (message.includes('500') || message.includes('Internal Server Error')) {
    return {
      title: 'Agent Server Greška',
      message: 'Interna greška u agent serveru',
      actions: [
        'Provjeriti agent_server.py logove',
        'Provjeriti da li su LLM modeli dostupni',
        'Restartovati agent stack'
      ],
      severity: 'error'
    };
  }
  
  if (message.includes('timeout')) {
    return {
      title: 'Agent Timeout',
      message: 'Agent je predugo obrađivao dokument',
      actions: [
        'Pokušati s manjim dokumentom',
        'Provjeriti performanse LLM servera',
        'Povećati timeout u konfiguraciji'
      ],
      severity: 'warning'
    };
  }
  
  return {
    title: 'Agent Greška',
    message: message,
    actions: [
      'Provjeriti agent server logove',
      'Kontaktirati support ako problem persists'
    ],
    severity: 'error'
  };
}

export default {
  agentAnalyzeFile,
  checkAgentHealth, 
  getAgentStatus,
  formatAgentError
};