// Tool registry and OpenAI-compatible interface
import { ocr_pdf } from './ocr_pdf.js';
import { extract_table } from './extract_table.js';
import { vlm_describe } from './vlm_describe.js';
import { dwg_parser } from './dwg_parser.js';
import { summarize_docs } from './summarize_docs.js';

export const TOOL_REGISTRY = {
  ocr_pdf,
  extract_table,
  vlm_describe,
  dwg_parser,
  summarize_docs
};

// Convert our tool registry to OpenAI tools format
export function registryToOpenAITools() {
  return Object.values(TOOL_REGISTRY).map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.schema
    }
  }));
}

// Dispatch tool calls to appropriate handlers
export async function dispatchToolCall(call, ctx) {
  const { id, function: func } = call;
  const { name, arguments: argsString } = func;
  
  console.log(`🔧 Dispatching tool call: ${name}`);
  
  const spec = TOOL_REGISTRY[name];
  if (!spec) {
    throw new Error(`Unknown tool: ${name}`);
  }
  
  let parsed;
  try {
    parsed = JSON.parse(argsString || "{}");
  } catch (error) {
    throw new Error(`Invalid JSON arguments for ${name}: ${error.message}`);
  }
  
  // Validate arguments
  spec.validate(parsed);
  
  // Execute tool
  const result = await spec.execute(parsed, ctx);
  
  // Return in OpenAI tool message format
  return {
    role: "tool",
    tool_call_id: id,
    content: JSON.stringify(result)
  };
}

// Get list of available tool names
export function getAvailableTools() {
  return Object.keys(TOOL_REGISTRY);
}

// Get tool specification by name
export function getToolSpec(name) {
  return TOOL_REGISTRY[name];
}

// Validate tool exists
export function validateToolExists(name) {
  if (!TOOL_REGISTRY[name]) {
    throw new Error(`Tool '${name}' not found. Available tools: ${Object.keys(TOOL_REGISTRY).join(', ')}`);
  }
  return true;
}