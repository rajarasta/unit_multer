import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Napredni agentic workflow s više alata
const agenticTools = [
  {
    type: "function",
    name: "analyze_aluminum_image",
    description: "Analyze images of aluminum construction documents, plans, or components",
    parameters: {
      type: "object", 
      properties: {
        image_analysis: {
          type: "string",
          description: "Detailed description of what was found in the image"
        },
        detected_elements: {
          type: "array",
          items: { type: "string" },
          description: "List of aluminum construction elements detected"
        },
        measurements: {
          type: "array", 
          items: { 
            type: "object",
            properties: {
              element: { type: "string" },
              dimension: { type: "string" },
              unit: { type: "string" }
            }
          },
          description: "Measurements found in the image"
        }
      },
      required: ["image_analysis"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "create_project_estimate",
    description: "Create cost estimate for aluminum construction project",
    parameters: {
      type: "object",
      properties: {
        project_name: { type: "string", description: "Name of the project" },
        elements: {
          type: "array",
          items: {
            type: "object", 
            properties: {
              type: { type: "string", description: "Type of aluminum element" },
              quantity: { type: "number", description: "Quantity needed" },
              unit: { type: "string", description: "Unit of measurement" },
              unit_price: { type: "number", description: "Price per unit in HRK" }
            }
          }
        },
        labor_hours: { type: "number", description: "Estimated labor hours" },
        complexity_factor: { 
          type: "number", 
          description: "Complexity multiplier (1.0 = standard, 1.5 = complex)",
          default: 1.0
        }
      },
      required: ["project_name", "elements"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "schedule_work_phases",
    description: "Create work schedule for aluminum construction project",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project identifier" },
        phases: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Phase name" },
              duration_days: { type: "number", description: "Duration in days" },
              dependencies: { 
                type: "array", 
                items: { type: "string" },
                description: "Previous phases this depends on"
              },
              resources_needed: {
                type: "array",
                items: { type: "string" },
                description: "Required resources/skills"
              }
            }
          }
        },
        start_date: { 
          type: "string", 
          description: "Project start date in ISO format"
        }
      },
      required: ["project_id", "phases"],
      additionalProperties: false
    }
  },
  {
    type: "function", 
    name: "generate_bom",
    description: "Generate Bill of Materials for aluminum construction",
    parameters: {
      type: "object",
      properties: {
        project_name: { type: "string" },
        components: {
          type: "array",
          items: {
            type: "object",
            properties: {
              part_number: { type: "string" },
              description: { type: "string" },
              material: { type: "string", description: "Aluminum alloy type" },
              dimensions: { type: "string" },
              quantity: { type: "number" },
              supplier: { type: "string" },
              estimated_cost: { type: "number" }
            }
          }
        }
      },
      required: ["project_name", "components"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "check_compliance",
    description: "Check aluminum construction compliance with Croatian standards",
    parameters: {
      type: "object", 
      properties: {
        project_type: { 
          type: "string",
          enum: ["residential", "commercial", "industrial", "public"],
          description: "Type of construction project"
        },
        aluminum_elements: {
          type: "array",
          items: { type: "string" },
          description: "List of aluminum components to check"
        },
        location: {
          type: "string", 
          description: "Location in Croatia (affects wind/seismic requirements)"
        }
      },
      required: ["project_type", "aluminum_elements"],
      additionalProperties: false
    }
  }
];

// Tool executors
const toolExecutors = {
  analyze_aluminum_image: async (params) => {
    return {
      analysis_id: `IMG_${Date.now()}`,
      image_analysis: params.image_analysis,
      detected_elements: params.detected_elements || [],
      measurements: params.measurements || [],
      confidence: 0.85,
      processing_time: "2.3s",
      recommendations: [
        "Verify measurements with actual site survey",
        "Consider local weather conditions for material selection",
        "Check compatibility with existing structures"
      ]
    };
  },

  create_project_estimate: async (params) => {
    const { project_name, elements, labor_hours = 40, complexity_factor = 1.0 } = params;
    
    const materialCost = elements.reduce((total, el) => {
      return total + ((el.quantity || 1) * (el.unit_price || 150));
    }, 0);
    
    const laborCost = labor_hours * 80 * complexity_factor; // 80 HRK/hour
    const overhead = (materialCost + laborCost) * 0.15; // 15% overhead
    const profit = (materialCost + laborCost + overhead) * 0.12; // 12% profit
    
    const totalCost = materialCost + laborCost + overhead + profit;

    return {
      estimate_id: `EST_${Date.now()}`,
      project_name,
      breakdown: {
        materials: Math.round(materialCost),
        labor: Math.round(laborCost), 
        overhead: Math.round(overhead),
        profit: Math.round(profit),
        total: Math.round(totalCost)
      },
      currency: "HRK",
      elements_count: elements.length,
      estimated_duration_days: Math.ceil(labor_hours / 8),
      validity_days: 30,
      created_at: new Date().toISOString()
    };
  },

  schedule_work_phases: async (params) => {
    const { project_id, phases, start_date = new Date().toISOString() } = params;
    
    let currentDate = new Date(start_date);
    const scheduledPhases = phases.map((phase, index) => {
      const phaseStart = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + (phase.duration_days || 5));
      const phaseEnd = new Date(currentDate);
      
      return {
        phase_id: `PHASE_${index + 1}`,
        name: phase.name,
        start_date: phaseStart.toISOString().split('T')[0],
        end_date: phaseEnd.toISOString().split('T')[0],
        duration_days: phase.duration_days || 5,
        dependencies: phase.dependencies || [],
        resources_needed: phase.resources_needed || [],
        status: "planned"
      };
    });

    return {
      schedule_id: `SCH_${Date.now()}`,
      project_id,
      total_phases: phases.length,
      total_duration_days: scheduledPhases.reduce((sum, p) => sum + p.duration_days, 0),
      project_start: start_date.split('T')[0],
      project_end: currentDate.toISOString().split('T')[0], 
      phases: scheduledPhases,
      created_at: new Date().toISOString()
    };
  },

  generate_bom: async (params) => {
    const { project_name, components } = params;
    
    const totalCost = components.reduce((sum, comp) => {
      return sum + ((comp.estimated_cost || 100) * (comp.quantity || 1));
    }, 0);

    return {
      bom_id: `BOM_${Date.now()}`,
      project_name,
      total_components: components.length,
      total_estimated_cost: Math.round(totalCost),
      currency: "HRK", 
      components: components.map((comp, index) => ({
        line_number: index + 1,
        part_number: comp.part_number || `ALU-${1000 + index}`,
        description: comp.description,
        material: comp.material || "6061-T6 Aluminum",
        dimensions: comp.dimensions,
        quantity: comp.quantity || 1,
        supplier: comp.supplier || "Aluminum Croatia d.o.o.",
        estimated_cost: comp.estimated_cost || 100,
        line_total: Math.round((comp.estimated_cost || 100) * (comp.quantity || 1))
      })),
      created_at: new Date().toISOString(),
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    };
  },

  check_compliance: async (params) => {
    const { project_type, aluminum_elements, location = "Zagreb" } = params;
    
    // Simulacija provjere standarda
    const standards = {
      residential: ["HRN EN 1999-1-1", "HRN EN 1999-1-4"],
      commercial: ["HRN EN 1999-1-1", "HRN EN 1999-1-2", "HRN EN 1999-1-4"],
      industrial: ["HRN EN 1999-1-1", "HRN EN 1999-1-3", "HRN EN 1999-1-5"],
      public: ["HRN EN 1999-1-1", "HRN EN 1999-1-2", "HRN EN 1999-1-4", "HRN EN 1999-1-6"]
    };

    const checkResults = aluminum_elements.map((element, index) => ({
      element,
      compliant: Math.random() > 0.2, // 80% compliance rate
      applicable_standards: standards[project_type] || [],
      notes: Math.random() > 0.5 ? "Additional verification recommended" : "Standard compliant",
      risk_level: ["low", "medium", "high"][Math.floor(Math.random() * 3)]
    }));

    return {
      compliance_id: `COMP_${Date.now()}`,
      project_type,
      location,
      overall_compliance: checkResults.every(r => r.compliant),
      applicable_standards: standards[project_type] || [],
      elements_checked: aluminum_elements.length,
      compliant_count: checkResults.filter(r => r.compliant).length,
      results: checkResults,
      recommendations: [
        "Engage certified structural engineer for final approval",
        "Consider local seismic conditions",
        "Verify with local building authority"
      ],
      created_at: new Date().toISOString()
    };
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, images, enable_tools = true } = req.body;

    console.log(`🤖 Agentic workflow started - Prompt: "${prompt}"`);
    if (images?.length > 0) {
      console.log(`🖼️ Processing ${images.length} images multimodally`);
    }

    // Kreiraj multimodalni input
    let input = [];

    // System message za agentic behavior
    input.push({
      type: "message",
      role: "system",
      content: [{
        type: "output_text", 
        text: `You are an advanced AI agent specialized in aluminum construction project management.
You have access to powerful tools for analyzing images, creating estimates, scheduling work, generating BOMs, and checking compliance.

CAPABILITIES:
- Multimodal image analysis of construction plans, documents, and photos
- Project cost estimation with detailed breakdowns
- Work phase scheduling with dependencies
- Bill of Materials generation  
- Croatian compliance checking (HRN EN standards)

WORKFLOW APPROACH:
1. Analyze any provided images first to extract technical data
2. Use extracted data to create comprehensive project documentation
3. Generate estimates, schedules, and compliance reports as needed
4. Provide actionable insights and recommendations

Be proactive in using tools to provide comprehensive responses. Always explain your reasoning and provide practical next steps.`
      }]
    });

    // User content s multimodalnim inputom
    let userContent = [{
      type: "output_text",
      text: prompt
    }];

    // Dodaj slike ako postoje
    if (images && images.length > 0) {
      for (const image of images) {
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: image.mimeType || "image/jpeg",
            data: image.data
          }
        });
      }
    }

    input.push({
      type: "message", 
      role: "user",
      content: userContent
    });

    console.log(`🔧 Using ${agenticTools.length} specialized tools`);

    // Pokretaj agentic workflow
    let currentInput = [...input];
    let iteration = 0;
    const maxIterations = 8; // Više iteracija za složene zadatke
    let toolCallsExecuted = [];

    while (iteration < maxIterations) {
      iteration++;
      console.log(`🔄 Agentic iteration ${iteration}`);

      // Pozovi model
      const response = await client.responses.create({
        model: "gpt-4o-mini",
        input: currentInput,
        tools: enable_tools ? agenticTools : [],
        text: { verbosity: "medium" },
        reasoning: { effort: "high" }, // Visok reasoning za kompleksne odluke
        temperature: 0.1, // Niska temperatura za preciznost
        store: true
      });

      // Dodaj response u conversation
      currentInput = [...currentInput, ...response.output];
      
      let hasToolCalls = false;

      // Izvršaj tool calls
      for (const item of response.output) {
        if (item.type === "function_call") {
          hasToolCalls = true;
          
          const functionName = item.name;
          const args = JSON.parse(item.arguments);
          
          console.log(`🔧 Executing ${functionName}`);
          toolCallsExecuted.push({
            tool: functionName,
            iteration: iteration,
            arguments: args
          });

          // Izvršaj tool
          let result;
          if (toolExecutors[functionName]) {
            try {
              result = await toolExecutors[functionName](args);
            } catch (error) {
              result = { error: error.message, tool: functionName };
            }
          } else {
            result = { error: `Unknown tool: ${functionName}` };
          }

          // Dodaj tool output
          currentInput.push({
            type: "function_call_output",
            call_id: item.call_id,
            output: JSON.stringify(result)
          });
        }
      }

      // Ako nema tool calls, završi workflow
      if (!hasToolCalls) {
        console.log(`✅ Agentic workflow completed - no more tools needed`);
        break;
      }
    }

    // Final response
    const finalResponse = await client.responses.create({
      model: "gpt-4o-mini",
      input: currentInput,
      tools: [],
      text: { verbosity: "high" }, // Detaljan završni odgovor
      reasoning: { effort: "medium" },
      temperature: 0.2,
      store: true
    });

    const result = {
      workflow_id: `WF_${Date.now()}`,
      status: "completed",
      iterations: iteration,
      tools_executed: toolCallsExecuted.length,
      tool_summary: toolCallsExecuted,
      images_processed: images?.length || 0,
      final_response: finalResponse.output_text,
      usage: {
        total_tokens: finalResponse.usage?.total_tokens || 0,
        completion_tokens: finalResponse.usage?.output_tokens || 0
      },
      reasoning_summary: finalResponse.reasoning?.summary,
      created_at: new Date().toISOString()
    };

    console.log(`🎉 Agentic workflow complete: ${toolCallsExecuted.length} tools in ${iteration} iterations`);
    
    res.status(200).json(result);

  } catch (error) {
    console.error("❌ Agentic workflow error:", error);
    res.status(500).json({
      error: error.message,
      type: error.type || "workflow_error",
      code: error.code || "unknown"
    });
  }
}