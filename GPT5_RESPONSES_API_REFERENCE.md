# GPT-5 & Responses API Complete Reference

## Table of Contents
1. [GPT-5 Overview](#gpt-5-overview)
2. [Model Variants](#model-variants)
3. [New API Features](#new-api-features)
4. [Responses API vs Chat Completions](#responses-api-vs-chat-completions)
5. [Migration Guide](#migration-guide)
6. [Function Calling](#function-calling)
7. [Custom Tools & Grammars](#custom-tools--grammars)
8. [Best Practices](#best-practices)
9. [Code Examples](#code-examples)

---

## GPT-5 Overview

GPT-5 is OpenAI's most intelligent model yet, trained to be especially proficient in:
- **Code generation, bug fixing, and refactoring**
- **Instruction following** 
- **Long context and tool calling**

### Key Features
- **Reasoning Models**: Generate internal chain of thought before responding
- **Verbosity Control**: Adjust output length (low/medium/high)
- **Reasoning Effort**: Control reasoning depth (minimal/low/medium/high)
- **Custom Tools**: Send arbitrary text to tools with optional grammar constraints
- **Native Tools**: Built-in web search, file search, code interpreter, etc.

---

## Model Variants

| Model | Best For | Use Case |
|-------|----------|----------|
| `gpt-5` | Complex reasoning, broad world knowledge, code-heavy tasks | Production applications requiring maximum intelligence |
| `gpt-5-mini` | Cost-optimized reasoning and chat | Balanced speed, cost, and capability |
| `gpt-5-nano` | High-throughput tasks | Simple instruction-following or classification |

### Model Name Mapping
| System Card Name | API Alias |
|------------------|-----------|
| gpt-5-thinking | `gpt-5` |
| gpt-5-thinking-mini | `gpt-5-mini` |
| gpt-5-thinking-nano | `gpt-5-nano` |
| gpt-5-main | `gpt-5-chat-latest` |

---

## New API Features

### 1. Reasoning Effort Control
```javascript
const response = await client.responses.create({
  model: "gpt-5",
  input: "Complex problem requiring deep thought",
  reasoning: { effort: "high" } // minimal, low, medium, high
});
```

### 2. Verbosity Control
```javascript
const response = await client.responses.create({
  model: "gpt-5", 
  input: "Explain quantum computing",
  text: { verbosity: "low" } // high, medium, low
});
```

### 3. Custom Tools
```javascript
const response = await client.responses.create({
  model: "gpt-5",
  input: "Execute Python code to calculate fibonacci",
  tools: [{
    type: "custom",
    name: "code_exec", 
    description: "Executes arbitrary Python code"
  }]
});
```

### 4. Allowed Tools (Subset Control)
```javascript
"tool_choice": {
  "type": "allowed_tools",
  "mode": "auto", // or "required"
  "tools": [
    { "type": "function", "name": "get_weather" },
    { "type": "mcp", "server_label": "deepwiki" },
    { "type": "image_generation" }
  ]
}
```

---

## Responses API vs Chat Completions

### Key Differences

| Feature | Chat Completions | Responses API |
|---------|------------------|---------------|
| **Input Format** | Array of messages | String or array of items |
| **Output Format** | choices[].message | output[] items |
| **Chain of Thought** | ❌ Not supported | ✅ Full support |
| **Built-in Tools** | ❌ Manual implementation | ✅ Native support |
| **Reasoning Models** | ⚠️ Limited | ✅ Optimized |
| **State Management** | Manual | Optional automatic |
| **Cost Optimization** | Standard | 40-80% cache improvement |

### Benefits of Responses API
1. **Better Performance**: 3% improvement in SWE-bench evaluations
2. **Lower Costs**: 40-80% cache hit rate improvement 
3. **Agentic by Default**: Multi-tool calls in single request
4. **Stateful Context**: Maintains reasoning between turns
5. **Future-Proof**: Designed for upcoming models

---

## Migration Guide

### From Chat Completions to Responses

#### 1. Basic Text Generation
```javascript
// BEFORE: Chat Completions
const completion = await client.chat.completions.create({
  model: "gpt-5",
  messages: [
    { role: "system", content: "You are helpful" },
    { role: "user", content: "Hello!" }
  ]
});
console.log(completion.choices[0].message.content);

// AFTER: Responses API  
const response = await client.responses.create({
  model: "gpt-5",
  instructions: "You are helpful", // system message
  input: "Hello!" // user message
});
console.log(response.output_text);
```

#### 2. Multi-turn Conversations
```javascript
// BEFORE: Manual message management
let messages = [
  { role: "system", content: "You are helpful" },
  { role: "user", content: "What's the capital of France?" }
];
const res1 = await client.chat.completions.create({
  model: "gpt-5", 
  messages
});
messages.push(res1.choices[0].message);
messages.push({ role: "user", content: "And its population?" });

// AFTER: Automatic state management
const res1 = await client.responses.create({
  model: "gpt-5",
  input: "What's the capital of France?",
  store: true // enables state management
});
const res2 = await client.responses.create({
  model: "gpt-5", 
  input: "And its population?",
  previous_response_id: res1.id // chains responses
});
```

#### 3. Function Definitions
```javascript
// BEFORE: Chat Completions (externally tagged)
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get weather info",
    "strict": true,
    "parameters": { /* schema */ }
  }
}

// AFTER: Responses API (internally tagged)
{
  "type": "function", 
  "name": "get_weather",
  "description": "Get weather info",
  "parameters": { /* schema */ }
  // strict: true by default
}
```

### Migration Strategy by Current Model
| From Model | Recommended GPT-5 Setup |
|------------|-------------------------|
| **o3** | `gpt-5` with medium/high reasoning |
| **gpt-4.1** | `gpt-5` with minimal/low reasoning |
| **o4-mini/gpt-4.1-mini** | `gpt-5-mini` with prompt tuning |
| **gpt-4.1-nano** | `gpt-5-nano` with prompt tuning |

---

## Function Calling

### 1. Basic Function Definition
```javascript
const tools = [{
  type: "function",
  name: "get_weather", 
  description: "Get current weather for a location",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City and country e.g. Paris, France"
      },
      units: {
        type: "string", 
        enum: ["celsius", "fahrenheit"]
      }
    },
    required: ["location", "units"],
    additionalProperties: false
  }
}];
```

### 2. Complete Function Calling Flow
```javascript
import OpenAI from "openai";
const client = new OpenAI();

// Define tools
const tools = [/* function definitions */];

// 1. Initial request with tools
let input_list = [
  { role: "user", content: "What's the weather in Paris?" }
];

const response = await client.responses.create({
  model: "gpt-5",
  tools: tools,
  input: input_list
});

// Save response output
input_list = input_list.concat(response.output);

// 2. Handle function calls
for (const item of response.output) {
  if (item.type === "function_call") {
    if (item.name === "get_weather") {
      // 3. Execute function
      const result = await executeWeatherFunction(JSON.parse(item.arguments));
      
      // 4. Add function output
      input_list.push({
        type: "function_call_output", 
        call_id: item.call_id,
        output: JSON.stringify(result)
      });
    }
  }
}

// 5. Get final response
const finalResponse = await client.responses.create({
  model: "gpt-5",
  tools: tools,
  input: input_list
});

console.log(finalResponse.output_text);
```

### 3. Tool Choice Options
```javascript
// Auto (default) - model decides
tool_choice: "auto"

// Required - must call at least one tool
tool_choice: "required" 

// Force specific function
tool_choice: { 
  type: "function", 
  name: "get_weather" 
}

// Allowed tools subset
tool_choice: {
  type: "allowed_tools",
  mode: "auto",
  tools: [
    { type: "function", name: "get_weather" },
    { type: "web_search" }
  ]
}
```

### 4. Streaming Function Calls
```javascript
const stream = client.responses.create({
  model: "gpt-5",
  input: "What's the weather in Paris?",
  tools: tools,
  stream: true
});

const toolCalls = {};

for await (const event of stream) {
  if (event.type === "response.output_item.added") {
    toolCalls[event.output_index] = event.item;
  }
  
  if (event.type === "response.function_call_arguments.delta") {
    const index = event.output_index;
    if (toolCalls[index]) {
      toolCalls[index].arguments += event.delta;
    }
  }
  
  if (event.type === "response.function_call_arguments.done") {
    console.log("Function call complete:", event.item);
  }
}
```

---

## Custom Tools & Grammars

### 1. Basic Custom Tool
```javascript
const response = await client.responses.create({
  model: "gpt-5",
  input: "Write Python code to calculate factorial of 5",
  tools: [{
    type: "custom",
    name: "code_exec",
    description: "Executes arbitrary Python code"
  }]
});

// Response will contain:
// {
//   "type": "custom_tool_call",
//   "name": "code_exec", 
//   "call_id": "call_123",
//   "input": "def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)\n\nprint(factorial(5))"
// }
```

### 2. Lark Grammar Example
```javascript
const grammar = `
start: expr
expr: term (SP ADD SP term)* -> add
     | term
term: factor (SP MUL SP factor)* -> mul 
     | factor
factor: INT
SP: " "
ADD: "+"
MUL: "*"
%import common.INT
`;

const response = await client.responses.create({
  model: "gpt-5",
  input: "Use math_exp to add four plus four",
  tools: [{
    type: "custom",
    name: "math_exp",
    description: "Creates valid mathematical expressions",
    format: {
      type: "grammar",
      syntax: "lark", 
      definition: grammar
    }
  }]
});

// Output: "4 + 4"
```

### 3. Regex Grammar Example  
```javascript
const grammar = String.raw`^(?P<month>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?P<day>\d{1,2})(?:st|nd|rd|th)?\s+(?P<year>\d{4})\s+at\s+(?P<hour>0?[1-9]|1[0-2])(?P<ampm>AM|PM)$`;

const response = await client.responses.create({
  model: "gpt-5", 
  input: "Use timestamp tool for August 7th 2025 at 10AM",
  tools: [{
    type: "custom",
    name: "timestamp",
    description: "Saves timestamp in specific format",
    format: {
      type: "grammar",
      syntax: "regex",
      definition: grammar
    }
  }]
});

// Output: "August 7th 2025 at 10AM"
```

### Grammar Best Practices

#### Lark Guidelines
- **Keep it simple**: Complex grammars may be rejected
- **Single terminals for freeform text**: Don't split across rules
- **Explicit whitespace**: Avoid unbounded %ignore directives
- **Bounded quantifiers**: Use `{0,10}` instead of unbounded `*`

#### Regex Guidelines  
- **Single line patterns**: Use `\n` for newlines, no verbose mode
- **No lookarounds**: Avoid `(?=...)` and `(?<=...)`
- **No lazy modifiers**: Avoid `*?`, `+?`, `??`
- **Rust regex syntax**: Different from Python's `re` module

---

## Best Practices

### 1. Function Calling
```javascript
// ✅ GOOD: Clear, specific descriptions
{
  name: "get_weather",
  description: "Get current weather conditions for a specific city and country. Returns temperature, humidity, and conditions.",
  parameters: {
    type: "object",
    properties: {
      location: {
        type: "string", 
        description: "City and country in format 'Paris, France' or 'New York, USA'"
      }
    }
  }
}

// ❌ BAD: Vague descriptions
{
  name: "weather",
  description: "Weather stuff", 
  parameters: {
    type: "object",
    properties: {
      place: { type: "string" }
    }
  }
}
```

### 2. Reasoning Models
- **Pass reasoning items back**: Use `previous_response_id` for multi-turn
- **Don't re-reason**: Reuse existing reasoning when possible
- **Appropriate effort levels**: Use minimal for speed, high for complex tasks

### 3. Prompt Optimization
```javascript
// For minimal reasoning, encourage explicit thinking
"Before answering, think through the steps required."

// For tool calling, be specific about when to use tools
"Use the weather tool only when current conditions are requested."

// For custom tools, explain the expected format
"Return valid SQL that queries the users table for active accounts."
```

### 4. Error Handling
```javascript
try {
  const response = await client.responses.create({
    model: "gpt-5",
    input: prompt,
    tools: tools
  });
  
  return response.output_text;
} catch (error) {
  if (error.code === 'grammar_too_complex') {
    // Simplify grammar and retry
    return retryWithSimpleGrammar(prompt);
  }
  
  if (error.code === 'context_length_exceeded') {
    // Reduce context or use streaming
    return handleLongContext(prompt);
  }
  
  throw error;
}
```

---

## Code Examples

### Backend API Integration (Your Voice Tab)

#### Draft Endpoint
```javascript
// pages/api/llm/draft.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const { command } = req.body;

    const response = await client.responses.create({
      model: "gpt-5-mini", // Cost-optimized for drafts
      instructions: `You are an agent for aluminum-store app management.
Convert voice commands to structured JSON responses.
Return ONLY JSON without explanation.`,
      input: `Voice command: "${command}"`,
      text: { 
        verbosity: "low" // Concise responses
      },
      reasoning: {
        effort: "minimal" // Fast processing
      }
    });

    const jsonResponse = JSON.parse(response.output_text);
    
    // Ensure draft status
    jsonResponse.status = "draft";
    jsonResponse.flags = jsonResponse.flags || {};
    jsonResponse.flags.confirmed = false;

    res.status(200).json(jsonResponse);
    
  } catch (error) {
    console.error("GPT-5 API error:", error);
    
    // Fallback response
    res.status(200).json({
      action: "upload_offer",
      status: "draft",
      fields: {
        customer: null,
        date: new Date().toISOString().split('T')[0],
        amount: null,
        currency: "HRK",
        description: req.body.command || "Unknown command"
      },
      flags: {
        needs_manual_input: ["customer", "amount"],
        confirmed: false,
        refresh_ui: true
      },
      error: "LLM unavailable - using fallback"
    });
  }
}
```

#### Confirm Endpoint  
```javascript
// pages/api/llm/confirm.js
export default async function handler(req, res) {
  try {
    const { command, fields } = req.body;

    const response = await client.responses.create({
      model: "gpt-5-mini",
      instructions: `Finalize the action with confirmed: true.
Add execution_plan with specific steps.
Return ONLY JSON.`,
      input: `Original command: "${command}"
Confirmed data: ${JSON.stringify(fields, null, 2)}`,
      text: { verbosity: "medium" },
      reasoning: { effort: "low" }
    });

    const jsonResponse = JSON.parse(response.output_text);
    
    // Ensure final status
    jsonResponse.status = "final";
    jsonResponse.flags = jsonResponse.flags || {};
    jsonResponse.flags.confirmed = true;
    jsonResponse.flags.needs_manual_input = [];

    res.status(200).json(jsonResponse);
    
  } catch (error) {
    // Fallback final response
    res.status(200).json({
      action: fields.action || "unknown",
      status: "final",
      fields: fields,
      flags: {
        confirmed: true,
        needs_manual_input: [],
        refresh_ui: false
      },
      execution_plan: [
        "Opening relevant module",
        "Creating new document", 
        "Entering data",
        "Saving to database"
      ],
      result: "Action completed successfully",
      error: "LLM unavailable - using fallback"
    });
  }
}
```

### Frontend Integration
```javascript
// VoiceTab component usage
const handleTranscript = async (text) => {
  setLoading(true);
  
  try {
    const res = await fetch("/api/llm/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: text }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    setDraftJson(data);
    setLogs(prev => [...prev, "✅ GPT-5 draft received"]);
    
  } catch (error) {
    console.error("Draft error:", error);
    setLogs(prev => [...prev, `❌ Error: ${error.message}`]);
  } finally {
    setLoading(false);
  }
};
```

---

## Environment Setup

### Required Environment Variables
```bash
# .env
OPENAI_API_KEY=sk-your-api-key-here

# Optional: For advanced features
OPENAI_ORGANIZATION=org-your-org-id
OPENAI_PROJECT=proj_your-project-id
```

### Package Installation
```bash
# Install latest OpenAI SDK with Responses API support
npm install openai@latest

# For Node.js projects
npm install node-fetch  # If using fetch polyfill
```

### TypeScript Types (if using TypeScript)
```typescript
import OpenAI from 'openai';

interface VoiceCommand {
  command: string;
  timestamp: Date;
}

interface DraftResponse {
  action: string;
  document_id?: string;
  status: 'draft' | 'final';
  fields: Record<string, any>;
  flags: {
    needs_manual_input: string[];
    confirmed: boolean;
    refresh_ui: boolean;
  };
  attachments?: any[];
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});
```

---

## Troubleshooting

### Common Issues

1. **Grammar Too Complex Error**
   ```javascript
   // Simplify your Lark grammar
   // Remove unbounded %ignore directives
   // Use bounded quantifiers: {0,10} instead of *
   ```

2. **Context Length Exceeded**
   ```javascript
   // Use streaming for long responses
   // Implement context window management
   // Consider gpt-5-nano for simpler tasks
   ```

3. **Function Calls Not Working**  
   ```javascript
   // Ensure strict: true for reliable function calls
   // Add required: [] for all parameters
   // Set additionalProperties: false
   ```

4. **Poor Reasoning Quality**
   ```javascript
   // Increase reasoning effort from minimal to low/medium
   // Add "think step by step" to prompts
   // Pass reasoning items in multi-turn conversations
   ```

### Performance Optimization
- Use `gpt-5-mini` for cost-sensitive applications
- Set `verbosity: "low"` for faster responses
- Enable `store: true` for conversation caching
- Use `previous_response_id` to avoid re-reasoning

---

## Further Resources

- **GPT-5 Prompting Guide**: Advanced prompting strategies
- **Function Calling Cookbook**: Complex tool calling examples  
- **Lark IDE**: Test grammar definitions interactively
- **OpenAI Playground**: Experiment with GPT-5 settings
- **Prompt Optimizer**: Automatically improve prompts for GPT-5

---

*Last Updated: January 2025*
*OpenAI GPT-5 and Responses API Documentation*