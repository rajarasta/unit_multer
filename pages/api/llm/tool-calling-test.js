import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simulacija tool funkcija
const availableTools = {
  get_weather: async (location) => {
    return {
      location: location,
      temperature: Math.round(Math.random() * 30 + 5),
      condition: ["sunny", "cloudy", "rainy", "windy"][Math.floor(Math.random() * 4)],
      humidity: Math.round(Math.random() * 100),
      timestamp: new Date().toISOString()
    };
  },
  
  calculate: async (expression) => {
    try {
      // Sigurna evaluacija samo osnovnih matematičkih operacija
      const sanitized = expression.replace(/[^0-9+\-*/\(\)\.\s]/g, '');
      const result = eval(sanitized);
      return {
        expression: expression,
        result: result,
        valid: true
      };
    } catch (error) {
      return {
        expression: expression,
        result: null,
        valid: false,
        error: error.message
      };
    }
  },

  create_aluminum_quote: async (customer, items, total) => {
    const quoteId = `ALU-${Date.now()}`;
    return {
      quote_id: quoteId,
      customer: customer,
      items: items || [],
      total_amount: total || 0,
      currency: "HRK",
      created_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dana
      status: "draft"
    };
  },

  search_projects: async (query, limit = 5) => {
    // Simulacija pretrage projekata
    const mockProjects = [
      { id: "P001", name: "Škola Zadar", status: "active", client: "Grad Zadar" },
      { id: "P002", name: "Trgovački centar Split", status: "completed", client: "Mall Group" },
      { id: "P003", name: "Stambena zgrada Zagreb", status: "planning", client: "Nekretnine d.o.o." },
      { id: "P004", name: "Industrijska hala Varaždin", status: "active", client: "Production Ltd" },
      { id: "P005", name: "Hotel Dubrovnik", status: "completed", client: "Tourism Corp" }
    ];

    const filtered = mockProjects
      .filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || 
                   p.client.toLowerCase().includes(query.toLowerCase()))
      .slice(0, limit);

    return {
      query: query,
      results: filtered,
      total_found: filtered.length
    };
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, enable_tools = true, llm_mode = 'server', base_url, model } = req.body;

    console.log(`🔧 Tool calling test - Prompt: "${prompt}"`);

    // Definiraj tools za OpenAI
    const tools = enable_tools ? [
      {
        type: "function",
        name: "get_weather", 
        description: "Get current weather information for a specific location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City and country, e.g. 'Zagreb, Croatia'"
            }
          },
          required: ["location"],
          additionalProperties: false
        }
      },
      {
        type: "function",
        name: "calculate",
        description: "Perform mathematical calculations", 
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: "Mathematical expression to evaluate, e.g. '2 + 3 * 4'"
            }
          },
          required: ["expression"],
          additionalProperties: false
        }
      },
      {
        type: "function", 
        name: "create_aluminum_quote",
        description: "Create a quote for aluminum construction work",
        parameters: {
          type: "object",
          properties: {
            customer: {
              type: "string",
              description: "Customer name or company"
            },
            items: {
              type: "array",
              items: { type: "string" },
              description: "List of aluminum items/services"
            },
            total: {
              type: "number",
              description: "Total quote amount"
            }
          },
          required: ["customer"],
          additionalProperties: false
        }
      },
      {
        type: "function",
        name: "search_projects", 
        description: "Search for existing aluminum construction projects",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term for project name or client"
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return",
              default: 5
            }
          },
          required: ["query"],
          additionalProperties: false
        }
      }
    ] : [];

    // Kreiraj input
    const input = [{
      type: "message",
      role: "user",
      content: [{
        type: "output_text",
        text: prompt
      }]
    }];

    console.log(`🔧 Using ${tools.length} tools`);

    // Prvi poziv - dobij tool calls
    let response = await client.responses.create({
      model: "gpt-4o-mini",
      input: input,
      tools: tools,
      text: { verbosity: "medium" },
      reasoning: { effort: "medium" },
      temperature: 0.3,
      store: true
    });

    console.log("✅ Initial response received");
    
    // Dodaj response output u input array
    let currentInput = [...input, ...response.output];
    
    // Izvršaj tool calls
    let toolCallsExecuted = 0;
    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      let hasToolCalls = false;

      // Pronađi tool calls u output
      for (const item of response.output) {
        if (item.type === "function_call") {
          hasToolCalls = true;
          toolCallsExecuted++;
          
          const functionName = item.name;
          const args = JSON.parse(item.arguments);
          
          console.log(`🔧 Executing ${functionName} with args:`, args);

          // Izvršaj tool
          let result;
          if (availableTools[functionName]) {
            try {
              result = await availableTools[functionName](...Object.values(args));
            } catch (error) {
              result = { error: error.message };
            }
          } else {
            result = { error: `Unknown function: ${functionName}` };
          }

          // Dodaj tool output
          currentInput.push({
            type: "function_call_output",
            call_id: item.call_id,
            output: JSON.stringify(result)
          });
        }
      }

      // Ako nema više tool calls, završi
      if (!hasToolCalls) {
        break;
      }

      // Pozovi model s tool outputs
      response = await client.responses.create({
        model: "gpt-4o-mini", 
        input: currentInput,
        tools: tools,
        text: { verbosity: "medium" },
        reasoning: { effort: "low" },
        temperature: 0.3,
        store: true
      });

      console.log(`✅ Iteration ${iteration} complete`);
      
      // Dodaj novi output
      currentInput = [...currentInput, ...response.output];
    }

    // Kreiraj rezultat
    const result = {
      id: response.id,
      model: response.model,
      status: response.status,
      iterations: iteration,
      tool_calls_executed: toolCallsExecuted,
      usage: response.usage,
      final_response: response.output_text,
      full_conversation: currentInput,
      reasoning_summary: response.reasoning?.summary || null
    };

    console.log(`🎉 Tool calling test complete - ${toolCallsExecuted} tools executed in ${iteration} iterations`);
    
    res.status(200).json(result);

  } catch (error) {
    console.error("❌ Tool calling test error:", error);
    res.status(500).json({
      error: error.message,
      type: error.type || "unknown", 
      code: error.code || "unknown"
    });
  }
}
