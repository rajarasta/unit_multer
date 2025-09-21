import { createValidator, TOOL_SCHEMAS } from '../util/ajv.js';
import { createTraceEvent } from '../shared/types.js';

const validate = createValidator(TOOL_SCHEMAS.summarize_docs, 'summarize_docs');

export const summarize_docs = {
  name: "summarize_docs",
  description: "Summarize multiple text documents into a concise report.",
  schema: TOOL_SCHEMAS.summarize_docs,
  
  validate: (args) => {
    if (!validate(args)) {
      throw new Error(`Invalid arguments for summarize_docs: ${JSON.stringify(args)}`);
    }
  },
  
  execute: async (args, ctx) => {
    console.log(`📝 Summarize Docs: Processing ${args.doc_urls.length} documents, length: ${args.summary_length || 'medium'}`);
    
    // Emit start event
    ctx.events.push(createTraceEvent(ctx.runId, 'step.started', {
      id: 'step_summarize_docs',
      kind: 'call_tool',
      title: 'Document Summarization',
      status: 'running'
    }));
    
    try {
      // Simulate summarization delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In real implementation, this would:
      // 1. Download all documents from doc_urls
      // 2. Extract text content from each document
      // 3. Use LLM to create summary based on summary_length
      // 4. Format in requested language
      // 5. Return structured summary
      
      const summaryLength = args.summary_length || 'medium';
      const language = args.language || 'hr';
      
      let mockSummary;
      if (summaryLength === 'short') {
        mockSummary = `Kratki sažetak od ${args.doc_urls.length} dokumenata: Projekat se odnosi na aluminijsku konstrukciju s prozorima i vratima. Ukupna vrednost radova: 4.472,50 EUR.`;
      } else if (summaryLength === 'long') {
        mockSummary = `Detaljni sažetak od ${args.doc_urls.length} dokumenata:

PREGLED PROJEKTA:
Projekat obuhvata izradu i montažu aluminijske konstrukcije za stambeni objekat. Konstrukcija uključuje prozore, vrata i pratećie komponente.

KOMPONENTE:
- Aluminijski profili 40x40mm: 100m po ceni od 15,50 EUR/m
- Staklo 6mm: 25m² po ceni od 45,00 EUR/m²
- Kovina za montažu: 50 komada po ceni od 8,75 EUR/kom
- Rad montaže: 16 sati po ceni od 85,00 EUR/h

FINANSIJSKI PREGLED:
- Ukupna vrednost materijala: 3.112,50 EUR
- Ukupna vrednost rada: 1.360,00 EUR
- UKUPNO: 4.472,50 EUR

TEHNIČKI DETALJI:
Konstrukcija je projektovana u skladu sa standardima kvaliteta. Svi materijali su visoko kvalitetni aluminijski profili otporni na koroziju.

PREPORUKE:
- Redovno održavanje svake 6 meseci
- Čišćenje i podmazivanje mehanizama
- Provera brtvi i zamena po potrebi`;
      } else {
        mockSummary = `Sažetak od ${args.doc_urls.length} dokumenata:

Projekat aluminijske konstrukcije uključuje:
- Aluminijske profile (100m)
- Staklo 6mm (25m²) 
- Montažnu kovinu (50 kom)
- Radove montaže (16h)

Ukupna vrednost: 4.472,50 EUR
Komponente su visoko kvalitetne i otporne na koroziju.
Preporučuje se redovno održavanje.`;
      }

      const result = {
        run_id: ctx.runId,
        kind: "summarize_docs",
        doc_urls: args.doc_urls,
        summary_length: summaryLength,
        language: language,
        document_count: args.doc_urls.length,
        summary: mockSummary,
        word_count: mockSummary.split(' ').length,
        character_count: mockSummary.length,
        key_topics: ["aluminijska konstrukcija", "prozori", "vrata", "materijali", "montaža"],
        summary_blob_uri: `file:///tmp/summaries/${ctx.runId}_summary.txt`,
        processing_time_ms: 1500
      };
      
      // Store result in context
      ctx.variables.set('$document_summary', mockSummary);
      
      // Emit success event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.finished', {
        id: 'step_summarize_docs',
        kind: 'call_tool',
        title: 'Document Summarization',
        status: 'ok',
        duration_ms: 1500
      }, {
        slot: '$document_summary',
        text: `Sažeto ${args.doc_urls.length} dokumenata (${result.word_count} reči)`
      }));
      
      return result;
      
    } catch (error) {
      // Emit error event
      ctx.events.push(createTraceEvent(ctx.runId, 'step.error', {
        id: 'step_summarize_docs',
        kind: 'call_tool',
        title: 'Document Summarization',
        status: 'error',
        error: error.message
      }));
      
      throw error;
    }
  }
};