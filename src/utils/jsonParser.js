/**
 * JSON Parser Utilities
 * Handles LLM response parsing with fallback mechanisms
 * Used by: IRIS3, InvoiceProcessor2, all AI integration tabs
 */

/**
 * Extracts JSON from mixed text responses (common with LLM responses)
 * @param {string} text - Mixed text containing JSON
 * @returns {string|null} - Extracted JSON string or null
 */
export const extractJsonFromText = (text) => {
  if (!text) return null;
  
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return text.slice(jsonStart, jsonEnd + 1);
  }
  return null;
};

/**
 * Safely parses JSON with error handling
 * @param {string} jsonString - JSON string to parse
 * @returns {Object|null} - Parsed object or null on error
 */
export const safeJsonParse = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return null;
  }
};

/**
 * Extracts and parses JSON from LLM response with fallback
 * @param {string} llmResponse - Raw LLM response text
 * @returns {Object|null} - Parsed JSON object or null
 */
export const parseSchutoResponse = (llmResponse) => {
  const jsonStr = extractJsonFromText(llmResponse);
  if (!jsonStr) {
    console.warn('No JSON found in LLM response:', llmResponse);
    return null;
  }
  
  const parsed = safeJsonParse(jsonStr);
  if (!parsed) {
    console.warn('Failed to parse JSON from LLM response');
    return null;
  }
  
  return parsed;
};

/**
 * Creates smart fallback analysis when JSON parsing fails
 * @param {string} userInput - Original user voice input
 * @returns {Object} - Mock analysis object
 */
export const createFallbackSchutoAnalysis = (userInput) => {
  // Detect product type from user input
  let detectedTip = 'prozor';
  if (userInput.toLowerCase().includes('vrata') || userInput.toLowerCase().includes('door')) {
    detectedTip = 'vrata';
  } else if (userInput.toLowerCase().includes('fasad') || userInput.toLowerCase().includes('facade')) {
    detectedTip = 'fasada';
  }
  
  // Detect system from user input
  let detectedSystem = 'AWS 65';
  if (userInput.toLowerCase().includes('50')) {
    detectedSystem = 'AWS 50';
  } else if (userInput.toLowerCase().includes('70')) {
    detectedSystem = 'AWS 70';
  } else if (userInput.toLowerCase().includes('ad up')) {
    detectedSystem = 'AD UP';
  }
  
  return {
    analysis: {
      sistema_considered: ["AWS 50", "AWS 65", "AWS 70"],
      sistema_selected: detectedSystem,
      reasoning: `Analizirano na temelju transkripte: "${userInput}"`
    },
    tip: {
      considered: ["vrata", "prozor", "fasada"],
      selected: detectedTip,
      reasoning: `Detektirano iz glasovnog unosa korisnika`
    },
    brochure: {
      system: detectedSystem,
      image_url: null,
      has_image: false
    },
    pricing: {
      materijal: Math.floor(Math.random() * 800) + 800,
      staklo: Math.floor(Math.random() * 400) + 400,
      rad: Math.floor(Math.random() * 300) + 300,
      total: 0,
      currency: "EUR"
    },
    location: "Zagreb, Hrvatska"
  };
};

/**
 * Validates Schüco analysis object structure
 * @param {Object} analysis - Analysis object to validate
 * @returns {boolean} - True if valid structure
 */
export const validateSchutoAnalysis = (analysis) => {
  if (!analysis || typeof analysis !== 'object') return false;
  
  const requiredFields = ['analysis', 'tip', 'brochure', 'pricing'];
  return requiredFields.every(field => analysis.hasOwnProperty(field));
};