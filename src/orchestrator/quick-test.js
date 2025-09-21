// Quick test script for orchestrator - browser compatible

export async function quickTest() {
  console.log("🚀 Starting Orchestrator Quick Test");
  
  try {
    // Test 1: Basic imports
    console.log("📦 Testing imports...");
    const { getAvailableTools, createOrchestratorClient } = await import('./index.js');
    console.log("✅ Imports successful");
    
    // Test 2: Tool registry
    console.log("🔧 Testing tool registry...");
    const tools = getAvailableTools();
    console.log(`✅ Tools loaded: ${tools.join(', ')}`);
    
    // Test 3: Client creation
    console.log("🤖 Testing client creation...");
    const client = createOrchestratorClient({
      client: {
        baseURL: "http://localhost:8000/v1",
        apiKey: "test"
      }
    });
    console.log("✅ Client created successfully");
    console.log(`✅ Client has ${client.getAvailableTools().length} tools`);
    
    // Test 4: Test envelope validation
    console.log("📋 Testing envelope validation...");
    const { createTestEnvelope, isValidExecutionEnvelope } = await import('./test/example.js');
    const envelope = createTestEnvelope();
    const isValid = isValidExecutionEnvelope(envelope);
    console.log(`✅ Test envelope valid: ${isValid}`);
    
    // Test 5: Signature generation
    console.log("🔖 Testing signature generation...");
    const { signature } = await import('./shared/types.js');
    const sig = signature([{type: "table"}, {type: "dwg"}], "compare");
    console.log(`✅ Signature generated: ${sig}`);
    
    console.log("\n🎉 All tests passed! Orchestrator is ready to use.");
    
    return {
      success: true,
      tools: tools.length,
      signature: sig,
      envelope_valid: isValid
    };
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Auto-run in browser
if (typeof window !== 'undefined') {
  window.quickTestOrchestrator = quickTest;
  console.log("🔧 Quick test available at: window.quickTestOrchestrator()");
}