import { createValidator, TOOL_SCHEMAS } from '../util/ajv.js';
import { createTraceEvent } from '../shared/types.js';

const validate = createValidator(TOOL_SCHEMAS.extract_table, 'extract_table');

export const extract_table = {
  name: "extract_table",
  description: "Extract a table from an Excel file and return as JSON.",
  schema: TOOL_SCHEMAS.extract_table,
  
  validate: (args) => {
    if (!validate(args)) {
      throw new Error(`Invalid arguments for extract_table: ${JSON.stringify(args)}`);
    }
  },
  
  execute: async (args, ctx) => {
    console.log(`📊 Extract Table: Processing ${args.file_url}, sheet: ${args.sheet_name}`);
    
    // Emit start event
    ctx.events.push(createTraceEvent(ctx.runId, 'step.started', {
      id: 'step_extract_table',
      kind: 'call_tool',
      title: 'Excel Table Extraction',
      status: 'running'
    }));
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In real implementation, this would:
      // 1. Download Excel file from file_url
      // 2. Use xlsx library to parse the file
      // 3. Extract specified sheet and range
      // 4. Convert to JSON format
      // 5. Return structured data
      
      const mockTableData = {
        headers: ['Redni broj', 'Opis', 'Jedinica', 'Količina', 'Cijena', 'Iznos'],
        rows: [
          ['1', 'Aluminijski profil 40x40', 'm', '100', '15.50', '1550.00'],
          ['2', 'Staklo 6mm', 'm²', '25', '45.00', '1125.00'],
          ['3', 'Kovina za montažu', 'kom', '50', '8.75', '437.50'],
          ['4', 'Rad - montaža', 'h', '16', '85.00', '1360.00']
        ],
        total_rows: 4,
        total_amount: 4472.50
      };

      const result = {
        run_id: ctx.runId,
        kind: "extract_table",
        file: args.file_url,
        sheet_name: args.sheet_name,
        range: args.range || "full_sheet",
        include_headers: args.include_headers !== false,
        data: mockTableData,
        row_count: mockTableData.rows.length,
        column_count: mockTableData.headers.length,
        data_blob_uri: `file:///tmp/tables/${ctx.runId}_table.json`,
        processing_time_ms: 800
      };
      
      // Store result in context
      ctx.variables.set('$table_data', mockTableData);
      
      // Emit success event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.finished', {
        id: 'step_extract_table',
        kind: 'call_tool',
        title: 'Excel Table Extraction',
        status: 'ok',
        duration_ms: 800
      }, {
        slot: '$table_data',
        text: `Izvučeno ${mockTableData.rows.length} redova iz ${args.sheet_name}`
      }));
      
      return result;
      
    } catch (error) {
      // Emit error event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.error', {
        id: 'step_extract_table',
        kind: 'call_tool',
        title: 'Excel Table Extraction',
        status: 'error',
        error: error.message
      }));
      
      throw error;
    }
  }
};