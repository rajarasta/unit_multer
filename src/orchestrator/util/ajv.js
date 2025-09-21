// AJV validation utilities
// Note: In production you'd use proper AJV with TypeScript, but this is a JS equivalent

export const createValidator = (schema, name) => {
  return (data) => {
    try {
      // Basic validation for our schema structures
      if (name === 'ocr_pdf') {
        return data && 
          typeof data.file_url === 'string' &&
          (!data.pages || typeof data.pages === 'string') &&
          (!data.language || ['hr', 'en', 'de', 'fr'].includes(data.language));
      }
      
      if (name === 'extract_table') {
        return data &&
          typeof data.file_url === 'string' &&
          typeof data.sheet_name === 'string' &&
          (!data.range || typeof data.range === 'string') &&
          (data.include_headers === undefined || typeof data.include_headers === 'boolean');
      }
      
      if (name === 'vlm_describe') {
        return data &&
          typeof data.image_url === 'string' &&
          (!data.detail_level || ['low', 'medium', 'high'].includes(data.detail_level));
      }
      
      if (name === 'dwg_parser') {
        return data &&
          typeof data.file_url === 'string' &&
          (!data.components || Array.isArray(data.components)) &&
          (!data.export_format || ['json', 'csv'].includes(data.export_format));
      }
      
      if (name === 'summarize_docs') {
        return data &&
          Array.isArray(data.doc_urls) &&
          data.doc_urls.every(url => typeof url === 'string') &&
          (!data.summary_length || ['short', 'medium', 'long'].includes(data.summary_length)) &&
          (!data.language || typeof data.language === 'string');
      }
      
      return true;
    } catch (error) {
      return false;
    }
  };
};

export const assertValid = (validator, name) => {
  throw new Error(`Validation failed for ${name}: Invalid arguments provided`);
};

// Tool argument schemas
export const TOOL_SCHEMAS = {
  ocr_pdf: {
    type: "object",
    properties: {
      file_url: { type: "string" },
      pages: { type: "string" },
      language: { type: "string", enum: ["hr", "en", "de", "fr"] }
    },
    required: ["file_url"],
    additionalProperties: false
  },
  
  extract_table: {
    type: "object",
    properties: {
      file_url: { type: "string" },
      sheet_name: { type: "string" },
      range: { type: "string" },
      include_headers: { type: "boolean", default: true }
    },
    required: ["file_url", "sheet_name"],
    additionalProperties: false
  },
  
  vlm_describe: {
    type: "object",
    properties: {
      image_url: { type: "string" },
      detail_level: { type: "string", enum: ["low", "medium", "high"] }
    },
    required: ["image_url"],
    additionalProperties: false
  },
  
  dwg_parser: {
    type: "object",
    properties: {
      file_url: { type: "string" },
      components: { type: "array", items: { type: "string" } },
      export_format: { type: "string", enum: ["json", "csv"], default: "json" }
    },
    required: ["file_url"],
    additionalProperties: false
  },
  
  summarize_docs: {
    type: "object",
    properties: {
      doc_urls: { type: "array", items: { type: "string" } },
      summary_length: { type: "string", enum: ["short", "medium", "long"], default: "medium" },
      language: { type: "string" }
    },
    required: ["doc_urls"],
    additionalProperties: false
  }
};