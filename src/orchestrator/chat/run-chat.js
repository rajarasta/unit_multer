// OpenAI-compatible chat loop for tool orchestration
import { registryToOpenAITools, dispatchToolCall } from '../tools/index.js';
import { createExecutionContext } from '../shared/types.js';

// Simple fetch-based OpenAI client for browser environment
class SimpleOpenAIClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "unused";
    this.baseURL = config.baseURL || process.env.BASE_URL || "http://localhost:8000/v1";
  }

  async createChatCompletion(params) {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

// Main chat orchestrator function
export async function runChatOrchestrator(messages, options = {}) {
  const runId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
    ? crypto.randomUUID() 
    : `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const client = new SimpleOpenAIClient(options.client);
  const tools = registryToOpenAITools();
  const ctx = createExecutionContext(runId, options.envelope);
  
  console.log(`🚀 Starting chat orchestration run: ${runId}`);
  console.log(`🔧 Available tools: ${tools.map(t => t.function.name).join(', ')}`);
  
  try {
    // Add system message if not present
    const systemMessage = {
      role: "system",
      content: `You are a tool orchestrator for aluminum fabrication management. 
You have access to tools for OCR, Excel extraction, image analysis, DWG parsing, and document summarization.
Always call appropriate tools when users request document processing or analysis.
Respond in Croatian language.`
    };
    
    const fullMessages = [systemMessage, ...messages];
    
    // First phase: Get tool calls from model
    console.log(`💬 Sending ${fullMessages.length} messages to model`);
    const firstResponse = await client.createChatCompletion({
      model: options.model || "gpt-3.5-turbo",
      messages: fullMessages,
      tools: tools,
      tool_choice: "auto",
      parallel_tool_calls: false,
      max_tokens: options.maxTokens || 384,
      temperature: options.temperature || 0.1
    });

    const assistantMessage = firstResponse.choices[0].message;
    const responseMessages = [assistantMessage];
    
    console.log(`🤖 Model response:`, {
      content: assistantMessage.content?.substring(0, 100),
      tool_calls: assistantMessage.tool_calls?.length || 0
    });

    // Second phase: Execute tool calls if any
    if (assistantMessage.tool_calls?.length) {
      console.log(`🔧 Executing ${assistantMessage.tool_calls.length} tool calls`);
      
      for (const toolCall of assistantMessage.tool_calls) {
        try {
          console.log(`🛠️ Executing tool: ${toolCall.function.name}`);
          const toolMessage = await dispatchToolCall(toolCall, ctx);
          responseMessages.push(toolMessage);
          console.log(`✅ Tool ${toolCall.function.name} completed successfully`);
        } catch (error) {
          console.error(`❌ Tool ${toolCall.function.name} failed:`, error.message);
          // Add error message
          responseMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: error.message,
              tool: toolCall.function.name
            })
          });
        }
      }
    }

    // Third phase: Get final response from model
    if (responseMessages.length > 1) {
      console.log(`💬 Sending tool results back to model`);
      const finalMessages = [...fullMessages, ...responseMessages];
      
      const finalResponse = await client.createChatCompletion({
        model: options.model || "gpt-3.5-turbo",
        messages: finalMessages,
        max_tokens: options.maxTokens || 512,
        temperature: options.temperature || 0.1
      });

      responseMessages.push(finalResponse.choices[0].message);
      console.log(`🎯 Final response generated`);
    }

    // Return orchestration result
    const result = {
      run_id: runId,
      messages: responseMessages,
      context: {
        variables: Object.fromEntries(ctx.variables),
        events: ctx.events
      },
      tools_used: assistantMessage.tool_calls?.map(tc => tc.function.name) || [],
      total_tokens: (firstResponse.usage?.total_tokens || 0) + 
                   (responseMessages.length > 1 ? 500 : 0), // Estimate for final response
      success: true
    };

    console.log(`✅ Orchestration completed: ${runId}`);
    return result;

  } catch (error) {
    console.error(`❌ Orchestration failed: ${runId}`, error);
    
    return {
      run_id: runId,
      messages: [{
        role: "assistant",
        content: `Dogodila se greška tokom obrade: ${error.message}`
      }],
      context: {
        variables: Object.fromEntries(ctx.variables),
        events: ctx.events
      },
      tools_used: [],
      total_tokens: 0,
      success: false,
      error: error.message
    };
  }
}

// Simplified interface for single user message
export async function processUserMessage(content, options = {}) {
  const messages = [{ role: "user", content }];
  return await runChatOrchestrator(messages, options);
}

// Example usage function
export async function exampleRun() {
  const result = await processUserMessage(
    "Izvuci tablicu iz Excel filea i usporedi s komponentama iz DWG.",
    {
      model: "gpt-3.5-turbo",
      client: {
        baseURL: "http://localhost:8000/v1",
        apiKey: "unused"
      }
    }
  );
  
  console.log("🎯 Example run result:", result);
  return result;
}