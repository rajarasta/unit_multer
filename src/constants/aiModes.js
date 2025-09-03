// src/constants/aiModes.js

/**
 * CHANGE: 2025-09-02 - Created centralized AI analysis modes for IP1 and IP2
 * WHY: Consolidate AI mode definitions to support both local and cloud processing
 * IMPACT: Enables consistent mode handling across Invoice Processor variants
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #ai-modes #local-llm #cloud-llm #invoice-processing
 */

export const AI_MODES = {
  // Local LLM modes (IP1)
  SPATIAL: 'spatial',
  VISION: 'vision',
  OPENWEBUI: 'openwebui',
  LMSTUDIO_DIRECT: 'lmstudio_direct',
  BACKEND: 'backend',
  AGENT: 'agent',
  DIRECT_PROMPT: 'direct_prompt',
  STRUCTURED_TEXT: 'structured_text',

  // Cloud LLM modes (IP2)
  CLOUD_GOOGLE_PDF: 'cloud_google_pdf',      // cijeli PDF → JSON (preporučeno)
  CLOUD_GOOGLE_VISION: 'cloud_google_vision' // renderirane slike stranica → JSON
};

export const AI_MODE_LABELS = {
  [AI_MODES.SPATIAL]: 'Analiza koordinata (LLM)',
  [AI_MODES.VISION]: 'Vizualna analiza (VLM)',
  [AI_MODES.OPENWEBUI]: 'OpenWebUI integracija',
  [AI_MODES.LMSTUDIO_DIRECT]: 'LM Studio direktno',
  [AI_MODES.BACKEND]: 'Backend servis',
  [AI_MODES.AGENT]: 'PDF Agent',
  [AI_MODES.DIRECT_PROMPT]: 'Direktni prompt',
  [AI_MODES.STRUCTURED_TEXT]: 'Strukturirani tekst',
  
  // Cloud modes
  [AI_MODES.CLOUD_GOOGLE_PDF]: 'Google Cloud PDF analiza',
  [AI_MODES.CLOUD_GOOGLE_VISION]: 'Google Cloud Vision analiza'
};

export const AI_MODE_DESCRIPTIONS = {
  [AI_MODES.SPATIAL]: 'Koristi koordinate teksta za analizu dokumenata',
  [AI_MODES.VISION]: 'Koristi slike stranica za vizualnu analizu',
  [AI_MODES.OPENWEBUI]: 'Integracija s OpenWebUI servisom',
  [AI_MODES.LMSTUDIO_DIRECT]: 'Direktno slanje na LM Studio bez preprocessing',
  [AI_MODES.BACKEND]: 'Slanje na backend servis za obradu',
  [AI_MODES.AGENT]: 'PDF Agent s tool-calling LLM modelima',
  [AI_MODES.DIRECT_PROMPT]: 'Direktni file + prompt → JSON',
  [AI_MODES.STRUCTURED_TEXT]: 'OCR/parsing + strukturirani prompt',
  
  // Cloud modes
  [AI_MODES.CLOUD_GOOGLE_PDF]: 'Šalje cijeli PDF Google AI servisu za analizu (preporučeno)',
  [AI_MODES.CLOUD_GOOGLE_VISION]: 'Šalje renderirane slike stranica Google Vision AI-u'
};

export const CLOUD_PROVIDERS = {
  GOOGLE: 'google',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic'
};

export const GOOGLE_MODELS = {
  GEMINI_15_PRO: 'gemini-1.5-pro',
  GEMINI_15_FLASH: 'gemini-1.5-flash',
  GEMINI_20_FLASH: 'gemini-2.0-flash-exp'
};

export const GOOGLE_MODEL_LABELS = {
  [GOOGLE_MODELS.GEMINI_15_PRO]: 'Gemini 1.5 Pro (najbolja kvaliteta)',
  [GOOGLE_MODELS.GEMINI_15_FLASH]: 'Gemini 1.5 Flash (brz i ekonomičan)',
  [GOOGLE_MODELS.GEMINI_20_FLASH]: 'Gemini 2.0 Flash (eksperimentalni)'
};

export const GOOGLE_MODEL_DESCRIPTIONS = {
  [GOOGLE_MODELS.GEMINI_15_PRO]: 'Najviša kvaliteta analize, optimalno za složene dokumente',
  [GOOGLE_MODELS.GEMINI_15_FLASH]: 'Brza obrada s dobrom kvalitetom, ekonomična opcija',
  [GOOGLE_MODELS.GEMINI_20_FLASH]: 'Najnoviji eksperimentalni model s poboljšanjima'
};

export default {
  AI_MODES,
  AI_MODE_LABELS,
  AI_MODE_DESCRIPTIONS,
  CLOUD_PROVIDERS,
  GOOGLE_MODELS,
  GOOGLE_MODEL_LABELS,
  GOOGLE_MODEL_DESCRIPTIONS
};