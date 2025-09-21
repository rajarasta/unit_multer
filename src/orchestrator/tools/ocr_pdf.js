import { createValidator, TOOL_SCHEMAS } from '../util/ajv.js';
import { createTraceEvent } from '../shared/types.js';

const validate = createValidator(TOOL_SCHEMAS.ocr_pdf, 'ocr_pdf');

export const ocr_pdf = {
  name: "ocr_pdf",
  description: "Extract text from a PDF document using OCR.",
  schema: TOOL_SCHEMAS.ocr_pdf,
  
  validate: (args) => {
    if (!validate(args)) {
      throw new Error(`Invalid arguments for ocr_pdf: ${JSON.stringify(args)}`);
    }
  },
  
  execute: async (args, ctx) => {
    console.log(`🔍 OCR PDF: Processing ${args.file_url}`);
    
    // Emit start event
    ctx.events.push(createTraceEvent(ctx.runId, 'step.started', {
      id: 'step_ocr',
      kind: 'call_tool',
      title: 'OCR PDF Processing',
      status: 'running'
    }));
    
    try {
      // Simulate OCR processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real implementation, this would:
      // 1. Download PDF from file_url
      // 2. Use Tesseract.js or similar OCR engine
      // 3. Extract text from specified pages
      // 4. Save result to blob storage
      // 5. Return blob URI
      
      const mockText = `Izvučeni tekst iz PDF dokumenta: ${args.file_url}
Jezik: ${args.language || 'hr'}
Stranice: ${args.pages || 'sve'}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation.`;

      const result = {
        run_id: ctx.runId,
        kind: "ocr_pdf",
        file: args.file_url,
        text_blob_uri: `file:///tmp/ocr/${ctx.runId}_result.txt`,
        pages_processed: args.pages || "all",
        language: args.language || "hr",
        character_count: mockText.length,
        confidence: 0.95,
        processing_time_ms: 1000
      };
      
      // Store result in context
      ctx.variables.set('$doc_text', mockText);
      
      // Emit success event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.finished', {
        id: 'step_ocr',
        kind: 'call_tool',
        title: 'OCR PDF Processing',
        status: 'ok',
        duration_ms: 1000
      }, {
        slot: '$doc_text',
        text: mockText.substring(0, 100) + '...'
      }));
      
      return result;
      
    } catch (error) {
      // Emit error event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.error', {
        id: 'step_ocr',
        kind: 'call_tool',
        title: 'OCR PDF Processing',
        status: 'error',
        error: error.message
      }));
      
      throw error;
    }
  }
};