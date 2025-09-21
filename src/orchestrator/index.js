// Main orchestrator entry point - exports for integration

// Core orchestration
export { runChatOrchestrator, processUserMessage } from './chat/run-chat.js';

// Tool system
export { 
  TOOL_REGISTRY, 
  registryToOpenAITools, 
  dispatchToolCall,
  getAvailableTools,
  getToolSpec,
  validateToolExists
} from './tools/index.js';

// Type system
export { 
  signature, 
  isValidBlobRef,
  isValidDataFacet,
  isValidExecutionEnvelope,
  isValidStep,
  isValidPlan,
  createExecutionContext,
  createTraceEvent
} from './shared/types.js';

// HTTP server integration
export {
  handleChatRequest,
  handlePlanRequest, 
  handleToolsRequest,
  handleStatusRequest,
  setupOrchestratorRoutes,
  createOrchestratorServer
} from './server/http.js';

// Testing utilities
export { runAllTests, createTestEnvelope } from './test/example.js';

// Individual tools (for direct usage)
export { ocr_pdf } from './tools/ocr_pdf.js';
export { extract_table } from './tools/extract_table.js';
export { vlm_describe } from './tools/vlm_describe.js';
export { dwg_parser } from './tools/dwg_parser.js';
export { summarize_docs } from './tools/summarize_docs.js';

// Version info
export const ORCHESTRATOR_VERSION = "1.0.0";
export const SUPPORTED_ENVELOPE_VERSION = "env/1";
export const SUPPORTED_TRACE_VERSION = "trace/1";

// Default configuration
export const DEFAULT_CONFIG = {
  model: "gpt-3.5-turbo",
  maxTokens: 512,
  temperature: 0.1,
  client: {
    baseURL: "http://localhost:8000/v1",
    apiKey: "unused"
  },
  timeouts: {
    tool_execution_ms: 30000,
    llm_response_ms: 15000
  }
};

// Quick setup helper for React components
export const createOrchestratorClient = (config = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  return {
    async chat(messages, options = {}) {
      return await runChatOrchestrator(messages, { ...mergedConfig, ...options });
    },
    
    async processMessage(content, options = {}) {
      return await processUserMessage(content, { ...mergedConfig, ...options });
    },
    
    getAvailableTools() {
      // Import the actual function from tools module
      return Object.keys(TOOL_REGISTRY);
    },
    
    getToolSpecs() {
      return registryToOpenAITools();
    }
  };
};

// Browser environment setup
if (typeof window !== 'undefined') {
  // Import the function dynamically to avoid dependency issues
  const setupBrowserGlobals = async () => {
    const { processUserMessage: userMsgProcessor } = await import('./chat/run-chat.js');
    const { getAvailableTools: getTools } = await import('./tools/index.js');
    
    window.Orchestrator = {
      createOrchestratorClient,
      processUserMessage: userMsgProcessor,
      getAvailableTools: getTools,
      runAllTests: () => import('./test/example.js').then(m => m.runAllTests()),
      version: ORCHESTRATOR_VERSION
    };
  };
  
  setupBrowserGlobals().catch(console.error);
  
  console.log(`🤖 Orchestrator ${ORCHESTRATOR_VERSION} loaded in browser`);
  console.log('Available at: window.Orchestrator');
}