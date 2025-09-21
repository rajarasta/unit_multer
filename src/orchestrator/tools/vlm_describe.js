import { createValidator, TOOL_SCHEMAS } from '../util/ajv.js';
import { createTraceEvent } from '../shared/types.js';

const validate = createValidator(TOOL_SCHEMAS.vlm_describe, 'vlm_describe');

export const vlm_describe = {
  name: "vlm_describe",
  description: "Generate a text description of an image for inspection reports.",
  schema: TOOL_SCHEMAS.vlm_describe,
  
  validate: (args) => {
    if (!validate(args)) {
      throw new Error(`Invalid arguments for vlm_describe: ${JSON.stringify(args)}`);
    }
  },
  
  execute: async (args, ctx) => {
    console.log(`👁️ VLM Describe: Processing ${args.image_url}, detail: ${args.detail_level || 'medium'}`);
    
    // Emit start event
    ctx.events.push(createTraceEvent(ctx.runId, 'step.started', {
      id: 'step_vlm_describe',
      kind: 'call_tool',
      title: 'Image Description (VLM)',
      status: 'running'
    }));
    
    try {
      // Simulate VLM processing delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // In real implementation, this would:
      // 1. Download image from image_url
      // 2. Call Vision Language Model (GPT-4V, Claude Vision, etc.)
      // 3. Generate description based on detail_level
      // 4. Return structured description
      
      const detailLevel = args.detail_level || 'medium';
      
      let mockDescription;
      if (detailLevel === 'low') {
        mockDescription = "Aluminijska konstrukcija s prozorima.";
      } else if (detailLevel === 'high') {
        mockDescription = `Detaljni pregled aluminijske konstrukcije:
- Okvir: Aluminijski profil srebrne boje, dimenzije približno 40x40mm
- Staklo: Čisto, bez vidljivih oštećenja ili pukotina
- Kovanje: Standardno aluminijsko kovanje, funkcijsko
- Brtve: Crne gumene brtve, u dobrom stanju
- Montaža: Pravilno postavljena, nema vidljivih nedostataka
- Stanje: Odlično, bez korozije ili mehaničkih oštećenja
- Preporučuje se: Redovno čišćenje i održavanje`;
      } else {
        mockDescription = `Aluminijska konstrukcija s duplim staklom u dobrom stanju. 
Okvir je srebrne boje bez vidljivih oštećenja. Staklo je čisto i bez pukotina. 
Kovanje funkcioniše ispravno. Preporučuje se redovno održavanje.`;
      }

      const result = {
        run_id: ctx.runId,
        kind: "vlm_describe",
        image: args.image_url,
        detail_level: detailLevel,
        description: mockDescription,
        confidence: 0.92,
        objects_detected: ["window_frame", "glass", "aluminum_profile", "hardware"],
        description_blob_uri: `file:///tmp/descriptions/${ctx.runId}_description.txt`,
        processing_time_ms: 1200
      };
      
      // Store result in context
      ctx.variables.set('$image_description', mockDescription);
      
      // Emit success event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.finished', {
        id: 'step_vlm_describe',
        kind: 'call_tool',
        title: 'Image Description (VLM)',
        status: 'ok',
        duration_ms: 1200
      }, {
        slot: '$image_description',
        text: mockDescription.substring(0, 100) + '...'
      }));
      
      return result;
      
    } catch (error) {
      // Emit error event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.error', {
        id: 'step_vlm_describe',
        kind: 'call_tool',
        title: 'Image Description (VLM)',
        status: 'error',
        error: error.message
      }));
      
      throw error;
    }
  }
};