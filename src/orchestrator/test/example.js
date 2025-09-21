// Example usage and testing of the orchestrator system

import { runChatOrchestrator, processUserMessage } from '../chat/run-chat.js';
import { registryToOpenAITools, getAvailableTools } from '../tools/index.js';
import { signature, isValidExecutionEnvelope } from '../shared/types.js';

// Test ExecutionEnvelope creation
export function createTestEnvelope() {
  const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) 
    ? crypto.randomUUID() 
    : `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
  return {
    v: "env/1",
    request_id: generateId(),
    user_id: "test_user",
    created_at: new Date().toISOString(),
    inputs: [
      {
        type: "table",
        ref: {
          uri: "file:///test/data/ponuda.xlsx",
          kind: "table",
          mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
      },
      {
        type: "dwg",
        ref: {
          uri: "file:///test/data/plan.dwg",
          kind: "dwg",
          mime: "application/x-dwg"
        }
      }
    ],
    declared_intent: "compare",
    constraints: {
      max_cost_eur: 10.0,
      latency_ms: 30000,
      privacy: "local-only"
    }
  };
}

// Test signature generation
export function testSignatures() {
  console.log("🧪 Testing signature generation:");
  
  const envelope = createTestEnvelope();
  const sig = signature(envelope.inputs, envelope.declared_intent);
  console.log(`  Signature: ${sig}`);
  console.log(`  Valid envelope: ${isValidExecutionEnvelope(envelope)}`);
  
  // Test various input combinations
  const testCases = [
    { inputs: [{ type: "document" }], intent: "extract", expected: "document|extract" },
    { inputs: [{ type: "image" }], intent: "describe", expected: "image|describe" },
    { inputs: [{ type: "table" }, { type: "dwg" }], intent: "compare", expected: "dwg+table|compare" },
    { inputs: [{ type: "document" }, { type: "image" }], intent: "summarize", expected: "document+image|summarize" }
  ];
  
  testCases.forEach(({ inputs, intent, expected }) => {
    const result = signature(inputs, intent);
    console.log(`  ${JSON.stringify(inputs)} + "${intent}" = "${result}" ${result === expected ? '✅' : '❌'}`);
  });
}

// Test tool registry
export function testToolRegistry() {
  console.log("🧪 Testing tool registry:");
  
  const tools = getAvailableTools();
  console.log(`  Available tools: ${tools.join(', ')}`);
  
  const openAITools = registryToOpenAITools();
  console.log(`  OpenAI format tools: ${openAITools.length}`);
  
  openAITools.forEach(tool => {
    console.log(`    - ${tool.function.name}: ${tool.function.description.substring(0, 50)}...`);
  });
}

// Test individual tool execution (mock)
export async function testToolExecution() {
  console.log("🧪 Testing individual tool execution:");
  
  const { TOOL_REGISTRY } = await import('../tools/index.js');
  const { createExecutionContext } = await import('../shared/types.js');
  
  const ctx = createExecutionContext("test_run", createTestEnvelope());
  
  try {
    // Test OCR tool
    console.log("  Testing OCR tool...");
    const ocrResult = await TOOL_REGISTRY.ocr_pdf.execute({
      file_url: "file:///test/document.pdf",
      language: "hr"
    }, ctx);
    console.log(`    OCR result: ${ocrResult.character_count} characters extracted`);
    
    // Test table extraction
    console.log("  Testing table extraction...");
    const tableResult = await TOOL_REGISTRY.extract_table.execute({
      file_url: "file:///test/ponuda.xlsx",
      sheet_name: "Sheet1",
      include_headers: true
    }, ctx);
    console.log(`    Table result: ${tableResult.row_count} rows, ${tableResult.column_count} columns`);
    
    console.log(`  Context variables: ${Array.from(ctx.variables.keys()).join(', ')}`);
    console.log(`  Events generated: ${ctx.events.length}`);
    
  } catch (error) {
    console.error(`  ❌ Tool execution error: ${error.message}`);
  }
}

// Test chat orchestration (requires mock LLM endpoint)
export async function testChatOrchestration() {
  console.log("🧪 Testing chat orchestration:");
  
  // Mock messages
  const testMessages = [
    { role: "user", content: "Izvuci tablicu iz Excel filea na adresi file:///test/ponuda.xlsx" },
    { role: "user", content: "Analiziraj sliku na adresi file:///test/prozor.jpg" },
    { role: "user", content: "Usporedi Excel tablicu s DWG komponentama" }
  ];
  
  for (const message of testMessages) {
    try {
      console.log(`  Processing: "${message.content.substring(0, 50)}..."`);
      
      // This would require a real LLM endpoint to work
      // For testing, we'll just show what would happen
      console.log(`    Would send to LLM with ${registryToOpenAITools().length} tools available`);
      console.log(`    Expected tool calls based on content...`);
      
      if (message.content.includes("Excel") || message.content.includes("tablicu")) {
        console.log(`      - extract_table tool would be called`);
      }
      if (message.content.includes("sliku") || message.content.includes("image")) {
        console.log(`      - vlm_describe tool would be called`);
      }
      if (message.content.includes("DWG")) {
        console.log(`      - dwg_parser tool would be called`);
      }
      
    } catch (error) {
      console.error(`    ❌ Chat error: ${error.message}`);
    }
  }
}

// Run all tests
export async function runAllTests() {
  console.log("🚀 Running Orchestrator Tests\n");
  
  testSignatures();
  console.log();
  
  testToolRegistry();
  console.log();
  
  await testToolExecution();
  console.log();
  
  await testChatOrchestration();
  console.log();
  
  console.log("✅ All tests completed!");
}

// Browser-friendly test runner
if (typeof window !== 'undefined') {
  window.orchestratorTests = {
    runAllTests,
    testSignatures,
    testToolRegistry,
    testToolExecution,
    testChatOrchestration,
    createTestEnvelope
  };
  
  console.log("🔧 Orchestrator tests available at window.orchestratorTests");
}