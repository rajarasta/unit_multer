// HTTP server wrapper for orchestrator - Express.js style for Node.js backend
// This would be integrated into your existing server.js or file-writer.cjs

import { runChatOrchestrator } from '../chat/run-chat.js';
import { isValidExecutionEnvelope, signature } from '../shared/types.js';

// Plan table for deterministic routing (simplified version)
const PLAN_TABLE = {
  "document|extract": {
    meta: {
      goal: "Extract text from document",
      policy: { no_chain_of_thought: true }
    },
    steps: [
      {
        id: "step_ocr",
        kind: "call_tool",
        tool: "ocr_pdf",
        args: { file_url: "$input.ref.uri", language: "hr" },
        into: "$doc_text"
      }
    ]
  },
  
  "table|extract": {
    meta: {
      goal: "Extract table data from Excel",
      policy: { no_chain_of_thought: true }
    },
    steps: [
      {
        id: "step_extract",
        kind: "call_tool", 
        tool: "extract_table",
        args: { file_url: "$input.ref.uri", sheet_name: "Sheet1" },
        into: "$table_data"
      }
    ]
  },
  
  "image|describe": {
    meta: {
      goal: "Generate image description",
      policy: { no_chain_of_thought: true }
    },
    steps: [
      {
        id: "step_vlm",
        kind: "call_tool",
        tool: "vlm_describe", 
        args: { image_url: "$input.ref.uri", detail_level: "medium" },
        into: "$image_description"
      }
    ]
  },
  
  "dwg|parse": {
    meta: {
      goal: "Parse DWG components",
      policy: { no_chain_of_thought: true }
    },
    steps: [
      {
        id: "step_dwg",
        kind: "call_tool",
        tool: "dwg_parser",
        args: { file_url: "$input.ref.uri", export_format: "json" },
        into: "$dwg_components"
      }
    ]
  },
  
  "table+dwg|compare": {
    meta: {
      goal: "Compare table data with DWG components",
      policy: { no_chain_of_thought: true }
    },
    steps: [
      {
        id: "step_extract_table",
        kind: "call_tool",
        tool: "extract_table",
        args: { file_url: "$table_input.ref.uri", sheet_name: "Sheet1" },
        into: "$table_data"
      },
      {
        id: "step_parse_dwg",
        kind: "call_tool",
        tool: "dwg_parser", 
        args: { file_url: "$dwg_input.ref.uri", export_format: "json" },
        into: "$dwg_components",
        depends_on: ["step_extract_table"]
      },
      {
        id: "step_compare",
        kind: "call_llm",
        model: "gpt-3.5-turbo",
        prompt: "Usporedi podatke iz tablice ($table_data) s komponentama iz DWG-a ($dwg_components). Napiši kratki izvještaj o sličnostima i razlikama.",
        inputs: ["$table_data", "$dwg_components"],
        into: "$comparison_report",
        depends_on: ["step_extract_table", "step_parse_dwg"]
      }
    ]
  }
};

// HTTP handlers that would be added to your Express app

// POST /api/orchestrator/chat - Main chat interface
export const handleChatRequest = async (req, res) => {
  try {
    const { messages, options = {} } = req.body;
    
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages must be an array" });
    }
    
    console.log(`📨 Chat request: ${messages.length} messages`);
    
    const result = await runChatOrchestrator(messages, {
      model: options.model || "gpt-3.5-turbo",
      maxTokens: options.maxTokens || 512,
      temperature: options.temperature || 0.1,
      client: {
        baseURL: process.env.ORCHESTRATOR_BASE_URL || "http://localhost:8000/v1",
        apiKey: process.env.ORCHESTRATOR_API_KEY || "unused"
      }
    });
    
    res.json(result);
    
  } catch (error) {
    console.error("❌ Chat request failed:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
};

// POST /api/orchestrator/plan - Deterministic planning interface
export const handlePlanRequest = async (req, res) => {
  try {
    const envelope = req.body;
    
    if (!isValidExecutionEnvelope(envelope)) {
      return res.status(400).json({ error: "Invalid ExecutionEnvelope format" });
    }
    
    const sig = signature(envelope.inputs, envelope.declared_intent);
    console.log(`📋 Plan request: signature=${sig}`);
    
    const plan = PLAN_TABLE[sig];
    if (!plan) {
      return res.status(404).json({ 
        error: "No plan found for signature",
        signature: sig,
        available_signatures: Object.keys(PLAN_TABLE)
      });
    }
    
    res.json({
      signature: sig,
      plan: plan,
      envelope: envelope
    });
    
  } catch (error) {
    console.error("❌ Plan request failed:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
};

// GET /api/orchestrator/tools - List available tools
export const handleToolsRequest = async (req, res) => {
  try {
    const { registryToOpenAITools, getAvailableTools } = await import('../tools/index.js');
    
    res.json({
      tools: getAvailableTools(),
      openai_format: registryToOpenAITools(),
      signatures: Object.keys(PLAN_TABLE)
    });
    
  } catch (error) {
    console.error("❌ Tools request failed:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
};

// GET /api/orchestrator/status - Health check
export const handleStatusRequest = async (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    available_tools: Object.keys(PLAN_TABLE).length
  });
};

// Example integration with existing Express app
export const setupOrchestratorRoutes = (app) => {
  app.post('/api/orchestrator/chat', handleChatRequest);
  app.post('/api/orchestrator/plan', handlePlanRequest);
  app.get('/api/orchestrator/tools', handleToolsRequest);
  app.get('/api/orchestrator/status', handleStatusRequest);
  
  console.log("🔧 Orchestrator routes registered");
};

// Standalone server example
export const createOrchestratorServer = async (port = 8787) => {
  // This would need express import in real Node.js environment
  const express = (await import('express')).default;
  const app = express();
  
  app.use(express.json({ limit: '5mb' }));
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });
  
  setupOrchestratorRoutes(app);
  
  app.listen(port, () => {
    console.log(`🚀 Orchestrator server running on http://localhost:${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`  POST /api/orchestrator/chat`);
    console.log(`  POST /api/orchestrator/plan`);
    console.log(`  GET  /api/orchestrator/tools`);
    console.log(`  GET  /api/orchestrator/status`);
  });
  
  return app;
};