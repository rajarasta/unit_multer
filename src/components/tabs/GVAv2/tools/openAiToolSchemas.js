/**
 * OpenAI tool schemas for GVAv2 normative operations
 * Compatible with Responses API and Realtime API
 */

export const applyNormativeProfileTool = {
  type: "function",
  function: {
    name: "apply_normative_profile",
    description: "Primijeni normativni profil (offsete start/end) na ciljani scope; preview=focus, commit=superfocus.",
    parameters: {
      type: "object",
      properties: {
        profile: {
          type: "object",
          properties: {
            id: { type: "string", enum: ["NORMATIV_1", "NORMATIV_2", "CUSTOM"] },
            offsets: {
              type: "object",
              properties: {
                start_days: { type: "integer" },
                end_days: { type: "integer" }
              },
              required: ["start_days", "end_days"]
            }
          },
          required: ["id", "offsets"]
        },
        scope: {
          type: "object",
          properties: {
            targets: { type: "array", items: { type: "string" } },
            unit: { type: "string", enum: ["calendar_days", "work_days"], default: "calendar_days" }
          },
          required: ["targets"]
        },
        execution_mode: { type: "string", enum: ["preview", "commit"], default: "preview" }
      },
      required: ["profile", "scope"]
    }
  }
};

export const showStandardPlanTool = {
  type: "function", 
  function: {
    name: "show_standard_plan",
    description: "Prikaži/primijeni plan gdje je kraj prethodne poravnat na početak sljedeće (gap=0 default).",
    parameters: {
      type: "object",
      properties: {
        targets: { type: "array", items: { type: "string" } },
        gap_days: { type: "integer", default: 0 },
        anchor: { type: "string", enum: ["next_start"], default: "next_start" },
        adjust: { type: "string", enum: ["prev_end"], default: "prev_end" },
        duration_policy: {
          type: "string",
          enum: ["preserve_start", "preserve_duration"], 
          default: "preserve_start"
        },
        execution_mode: { type: "string", enum: ["preview", "commit"], default: "preview" }
      },
      required: ["targets"]
    }
  }
};

export const analyzeDocumentTool = {
  type: "function",
  function: {
    name: "analyze_document", 
    description: "Analiziraj PDF dokument za Gantt planiranje",
    parameters: {
      type: "object",
      properties: {
        target: { type: "string", enum: ["petak", "subota", "sve"] }
      },
      required: ["target"]
    }
  }
};

export const openAiTools = [
  applyNormativeProfileTool,
  showStandardPlanTool, 
  analyzeDocumentTool
];

// Normative catalog
export const normativeProfiles = {
  NORMATIV_1: { id: "NORMATIV_1", offsets: { start_days: 1, end_days: 3 } },
  NORMATIV_2: { id: "NORMATIV_2", offsets: { start_days: 4, end_days: 9 } }
};