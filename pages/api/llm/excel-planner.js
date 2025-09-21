/**
 * Excel AI Planner - Converts natural language to structured Excel actions
 */

// LLM Configuration - Using hosted LLM instead of Gemini
const LLM_BASE_URL = 'http://192.168.30.11:1234';
const LLM_MODEL = 'qwen3-4b-thinking-2507'; // Hosted model name

// Fallback to Gemini if needed
const { GoogleGenAI } = require('@google/genai');
const apiKey = process.env.VITE_GOOGLE_AI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Excel Action Schema for LLM output
 */
const ACTION_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            properties: {
              type: { enum: ["updateCell"] },
              sheet: { type: "string" },
              target: { type: "string", pattern: "^[A-Z]+[0-9]+$" },
              value: { type: ["string", "number"] }
            },
            required: ["type", "sheet", "target", "value"]
          },
          {
            type: "object",
            properties: {
              type: { enum: ["formatCell"] },
              sheet: { type: "string" },
              target: { type: "string", pattern: "^[A-Z]+[0-9]+$" },
              style: {
                type: "object",
                properties: {
                  backgroundColor: { type: "string" },
                  textColor: { type: "string" },
                  bold: { type: "boolean" },
                  italic: { type: "boolean" },
                  fontSize: { type: "number" },
                  horizontalAlign: { enum: ["left", "center", "right"] },
                  verticalAlign: { enum: ["top", "center", "bottom"] }
                }
              }
            },
            required: ["type", "sheet", "target", "style"]
          },
          {
            type: "object",
            properties: {
              type: { enum: ["insertRow"] },
              sheet: { type: "string" },
              target: { type: "string" },
              index: { type: "number" },
              count: { type: "number", default: 1 }
            },
            required: ["type", "sheet", "target", "index"]
          },
          {
            type: "object",
            properties: {
              type: { enum: ["deleteRow"] },
              sheet: { type: "string" },
              target: { type: "string" },
              start: { type: "number" },
              end: { type: "number" }
            },
            required: ["type", "sheet", "target", "start", "end"]
          },
          {
            type: "object",
            properties: {
              type: { enum: ["setRowHeight"] },
              sheet: { type: "string" },
              target: { type: "string" },
              height: { type: "number" }
            },
            required: ["type", "sheet", "target", "height"]
          },
          {
            type: "object",
            properties: {
              type: { enum: ["setColumnWidth"] },
              sheet: { type: "string" },
              target: { type: "string" },
              width: { type: "number" }
            },
            required: ["type", "sheet", "target", "width"]
          },
          {
            type: "object",
            properties: {
              type: { enum: ["mergeCells"] },
              sheet: { type: "string" },
              target: { type: "string" },
              range: { type: "string", pattern: "^[A-Z]+[0-9]+:[A-Z]+[0-9]+$" }
            },
            required: ["type", "sheet", "target", "range"]
          }
        ]
      }
    },
    reasoning: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["actions", "reasoning"]
};

/**
 * Generate Excel planning prompt
 */
function generatePlanningPrompt(request) {
  const { prompt, activeSheet, selection, context } = request;

  const selectionInfo = selection
    ? `Current selection: ${selection.range || 'None'}\nSelected values: ${JSON.stringify(selection.cells || [])}`
    : 'No current selection';

  const sheetsInfo = context.sheets?.length
    ? `Available sheets: ${context.sheets.join(', ')}`
    : 'No sheets information';

  return `You are an Excel AI assistant that converts natural language commands into structured Excel actions.

CONTEXT:
- Active sheet: ${activeSheet || 'Unknown'}
- ${sheetsInfo}
- ${selectionInfo}
- Workbook: ${context.workbookInfo?.name || 'Unknown'}

USER COMMAND: "${prompt}"

INSTRUCTIONS:
1. Interpret the user's natural language command
2. Convert it to precise Excel actions using the supported action types
3. Use A1 notation for cell references (e.g., "A1", "B5", "C10")
4. For ranges, use format "A1:B5"
5. Be conservative - if uncertain, ask for clarification
6. Consider the current sheet and selection context

SUPPORTED ACTIONS:
- updateCell: Change cell value
- formatCell: Apply styling (bold, italic, colors, alignment, font size)
- insertRow/deleteRow: Add or remove rows
- setRowHeight/setColumnWidth: Adjust dimensions
- mergeCells: Merge cell ranges

RESPONSE FORMAT: Return valid JSON with actions array, reasoning, and confidence score.

Examples:
"Make A1 bold" → formatCell action with bold: true
"Insert row after row 5" → insertRow action with index: 6
"Change B2 to 'Hello'" → updateCell action with value: "Hello"
"Make column A wider" → setColumnWidth action (assume reasonable width)

Respond with JSON only - no explanatory text before or after.`;
}

/**
 * Parse and validate LLM response
 */
function parseAndValidateResponse(responseText) {
  try {
    // Clean response - remove any non-JSON content
    let cleanedResponse = responseText.trim();

    // Remove think tags if present (for hosted LLM that outputs thinking)
    const beforeCleaning = cleanedResponse.length;
    cleanedResponse = cleanedResponse.replace(/<think>[\s\S]*?<\/think>/g, '');
    const afterCleaning = cleanedResponse.length;

    if (beforeCleaning !== afterCleaning) {
      console.log(`🧹 Removed thinking tags: ${beforeCleaning} -> ${afterCleaning} chars`);
    }

    // Also remove any leading/trailing whitespace and newlines after cleaning
    cleanedResponse = cleanedResponse.trim();

    // Remove markdown code blocks if present
    cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    // Find JSON object
    const jsonStart = cleanedResponse.indexOf('{');
    const jsonEnd = cleanedResponse.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON object found in response');
    }

    const jsonStr = cleanedResponse.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(jsonStr);

    // Basic validation
    if (!parsed.actions || !Array.isArray(parsed.actions)) {
      throw new Error('Response must contain actions array');
    }

    // Validate each action has required fields
    for (const action of parsed.actions) {
      if (!action.type || !action.sheet || !action.target) {
        throw new Error(`Invalid action: missing required fields in ${JSON.stringify(action)}`);
      }
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    console.error('Raw response:', responseText);
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}

/**
 * Call hosted LLM at http://192.168.30.11:1234
 */
async function callHostedLLM(prompt) {
  const response = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an Excel AI assistant. When users request Excel operations, you MUST call the appropriate function.

CRITICAL RULES:
- ALWAYS use function calls for Excel operations
- DO NOT output JSON in text content
- DO NOT include <think> blocks
- DO NOT explain what you're doing
- ONLY call the function with the correct parameters

Available functions: formatCell, updateCell, insertRow

Example: User says "make A1 red" → Call formatCell function immediately.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "formatCell",
            description: "Apply formatting to Excel cells (colors, fonts, alignment)",
            parameters: {
              type: "object",
              properties: {
                sheet: {
                  type: "string",
                  description: "Sheet name (e.g., 'Sheet1')"
                },
                target: {
                  type: "string",
                  description: "Cell reference in A1 notation (e.g., 'A1', 'B5:C10')"
                },
                style: {
                  type: "object",
                  properties: {
                    backgroundColor: { type: "string", description: "Hex color code (e.g., '#0000FF')" },
                    color: { type: "string", description: "Text color hex code" },
                    fontWeight: { type: "string", description: "'bold' or 'normal'" },
                    fontStyle: { type: "string", description: "'italic' or 'normal'" },
                    fontSize: { type: "number", description: "Font size in points" },
                    textAlign: { type: "string", description: "'left', 'center', 'right'" }
                  }
                }
              },
              required: ["sheet", "target", "style"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "updateCell",
            description: "Update cell values",
            parameters: {
              type: "object",
              properties: {
                sheet: { type: "string", description: "Sheet name" },
                target: { type: "string", description: "Cell reference (A1 notation)" },
                value: { type: "string", description: "New cell value" }
              },
              required: ["sheet", "target", "value"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "insertRow",
            description: "Insert new rows",
            parameters: {
              type: "object",
              properties: {
                sheet: { type: "string", description: "Sheet name" },
                index: { type: "number", description: "Row index to insert at (1-based)" },
                count: { type: "number", description: "Number of rows to insert", default: 1 }
              },
              required: ["sheet", "index"]
            }
          }
        }
      ],
      tool_choice: "required",
      temperature: 0.1,
      max_tokens: 4096,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('❌ Invalid LLM response structure:', JSON.stringify(data, null, 2));
    throw new Error('Invalid LLM response structure');
  }

  const message = data.choices[0].message;
  const content = message.content;
  const toolCalls = message.tool_calls;

  // Log response stats
  console.log(`📊 LLM Response - Content: ${content?.length || 0} chars, Tool calls: ${toolCalls?.length || 0}, Finish reason: ${data.choices[0].finish_reason}`);

  if (data.choices[0].finish_reason === 'length') {
    console.warn('⚠️ LLM response was truncated due to max_tokens limit');
  }

  // Return both content and tool calls
  return { content, toolCalls };
}

/**
 * Generate fallback actions for common patterns
 */
function generateFallbackActions(prompt, activeSheet) {
  const actions = [];
  const lowerPrompt = prompt.toLowerCase();

  // Simple pattern matching for common requests
  if (lowerPrompt.includes('bold') && lowerPrompt.includes('a1')) {
    actions.push({
      type: 'formatCell',
      sheet: activeSheet || 'Sheet1',
      target: 'A1',
      style: { bold: true }
    });
  } else if (lowerPrompt.includes('insert row')) {
    const rowMatch = lowerPrompt.match(/row (\d+)/);
    const index = rowMatch ? parseInt(rowMatch[1]) + 1 : 2;
    actions.push({
      type: 'insertRow',
      sheet: activeSheet || 'Sheet1',
      target: `A${index}`,
      index: index,
      count: 1
    });
  }

  return {
    actions,
    reasoning: 'Fallback pattern matching used due to LLM parsing failure',
    confidence: 0.3
  };
}

/**
 * Main handler
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, sessionId, activeSheet, selection, context } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`🎯 Using hosted LLM at ${LLM_BASE_URL} (model: ${LLM_MODEL})`);
    if (!apiKey) {
      console.warn('⚠️ No Gemini API key - will use hosted LLM only');
    }

    console.log(`🤖 Excel Planner: Processing prompt for session ${sessionId}`);
    console.log(`📝 Prompt: "${prompt}"`);
    console.log(`📊 Context: Sheet=${activeSheet}, Selection=${selection?.range || 'none'}`);

    // Generate planning prompt
    const planningPrompt = generatePlanningPrompt({ prompt, activeSheet, selection, context });

    try {
      // Try hosted LLM first
      console.log(`🤖 Calling hosted LLM at ${LLM_BASE_URL} with model ${LLM_MODEL}`);

      let parsedResult;
      try {
        const llmResponse = await callHostedLLM(planningPrompt);
        console.log(`🔍 Hosted LLM response - Content: ${llmResponse.content?.length || 0} chars, Tool calls: ${llmResponse.toolCalls?.length || 0}`);

        // Process tool calls if available
        if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
          console.log(`🔧 Processing ${llmResponse.toolCalls.length} tool calls`);

          const actions = llmResponse.toolCalls.map(toolCall => {
            const { name, arguments: args } = toolCall.function;
            console.log(`📞 Tool call: ${name} with args:`, args);

            // Parse arguments if they're a string
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

            return {
              type: name,
              ...parsedArgs
            };
          });

          parsedResult = {
            actions,
            reasoning: "Tool functions called by LLM",
            confidence: 0.95
          };
        } else {
          // Fallback to content parsing
          console.log(`📝 No tool calls, parsing content as JSON`);
          parsedResult = parseAndValidateResponse(llmResponse.content || '');
        }

      } catch (hostedError) {
        console.error('❌ Hosted LLM failed, trying Gemini fallback:', hostedError);

        // Fallback to Gemini if hosted LLM fails
        if (ai) {
          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: planningPrompt,
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 1000,
              responseMimeType: "application/json",
              responseSchema: ACTION_SCHEMA
            }
          });
          const responseText = geminiResponse.text || '';
          console.log(`🔍 Gemini fallback response: ${responseText}`);
          parsedResult = parseAndValidateResponse(responseText);
        } else {
          throw new Error('Both hosted LLM and Gemini unavailable');
        }
      }

      console.log(`✅ Parsed ${parsedResult.actions.length} actions with confidence ${parsedResult.confidence || 'unknown'}`);
      console.log(`💭 Reasoning: ${parsedResult.reasoning}`);

      return res.status(200).json({
        success: true,
        actions: parsedResult.actions,
        reasoning: parsedResult.reasoning,
        confidence: parsedResult.confidence || 0.8,
        sessionId,
        llmSource: responseText.includes('hosted') ? 'hosted' : 'gemini',
        timestamp: new Date().toISOString()
      });

    } catch (llmError) {
      console.error('❌ All LLM calls failed:', llmError);

      // Generate fallback actions
      const fallbackResult = generateFallbackActions(prompt, activeSheet);

      console.log(`🔄 Using fallback actions: ${fallbackResult.actions.length} actions generated`);

      return res.status(200).json({
        success: true,
        actions: fallbackResult.actions,
        reasoning: fallbackResult.reasoning + ` (LLM error: ${llmError.message})`,
        confidence: fallbackResult.confidence,
        fallback: true,
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ Excel planner error:', error);

    return res.status(500).json({
      error: 'Failed to plan Excel actions',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}