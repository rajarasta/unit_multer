// Utility functions for AI reasoning system

// Delay function for async operations
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate unique IDs
export const generateId = (prefix = 'id') => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Status icon mapping
export const getStatusIcon = (statusType, status) => {
  const iconMap = {
    upload: {
      upload_empty: { icon: 'Upload', color: 'text-slate-400', pulse: false },
      upload_uploading: { icon: 'Upload', color: 'text-blue-500', pulse: true },
      upload_uploaded: { icon: 'Check', color: 'text-green-500', pulse: false },
      upload_error: { icon: 'X', color: 'text-red-500', pulse: false }
    },

    processing: {
      proc_not_processed: { icon: 'Brain', color: 'text-slate-400', pulse: false },
      proc_reasoning: { icon: 'Brain', color: 'text-purple-500', pulse: true },
      proc_processed: { icon: 'Sparkles', color: 'text-green-500', pulse: false },
      proc_cancelled: { icon: 'X', color: 'text-orange-500', pulse: false },
      proc_error: { icon: 'AlertTriangle', color: 'text-red-500', pulse: false }
    },

    queue: {
      queue_not_ready: { icon: 'Clock', color: 'text-slate-400', pulse: false },
      queue_ready: { icon: 'Clock', color: 'text-blue-500', pulse: false },
      queue_queued: { icon: 'Timer', color: 'text-orange-500', pulse: true },
      queue_big_processing: { icon: 'Cpu', color: 'text-purple-500', pulse: true },
      queue_big_complete: { icon: 'CheckCircle', color: 'text-green-500', pulse: false },
      queue_big_error: { icon: 'XCircle', color: 'text-red-500', pulse: false }
    },

    connection: {
      conn_disconnected: { icon: 'Link', color: 'text-slate-400', pulse: false },
      conn_connected: { icon: 'Link2', color: 'text-blue-500', pulse: false },
      conn_ready_combined: { icon: 'Merge', color: 'text-green-500', pulse: false },
      conn_combined_processing: { icon: 'Merge', color: 'text-purple-500', pulse: true },
      conn_combined_complete: { icon: 'CheckCircle2', color: 'text-green-600', pulse: false }
    }
  };

  return iconMap[statusType]?.[status] || { icon: 'HelpCircle', color: 'text-slate-400', pulse: false };
};

// Format time duration
export const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

// Format confidence percentage
export const formatConfidence = (confidence) => {
  return `${Math.round(confidence * 100)}%`;
};

// Generate colors for connections
export const generateConnectionColor = () => {
  const colors = [
    'rgb(59, 130, 246)',   // blue
    'rgb(139, 92, 246)',   // purple
    'rgb(34, 197, 94)',    // green
    'rgb(251, 146, 60)',   // orange
    'rgb(236, 72, 153)',   // pink
    'rgb(14, 165, 233)',   // sky
    'rgb(168, 85, 247)',   // violet
    'rgb(34, 197, 94)',    // emerald
    'rgb(245, 158, 11)',   // amber
    'rgb(239, 68, 68)'     // red
  ];

  return colors[Math.floor(Math.random() * colors.length)];
};

// Validate content for processing
export const canProcessContent = (unitType, content) => {
  if (unitType === 'empty' || !content) return false;

  const processableTypes = ['text', 'image', 'pdf', 'table', 'xml', 'document'];
  return processableTypes.includes(unitType);
};

// Get processing complexity score
export const getProcessingComplexity = (unitType, content) => {
  const complexityMap = {
    text: 1,
    table: 2,
    image: 3,
    xml: 3,
    document: 4,
    pdf: 5
  };

  const baseComplexity = complexityMap[unitType] || 1;

  // Adjust for content size
  let sizeMultiplier = 1;
  if (content) {
    if (typeof content === 'string') {
      sizeMultiplier = Math.min(content.length / 1000, 3);
    } else if (content.size) {
      sizeMultiplier = Math.min(content.size / (1024 * 1024), 5); // MB based
    }
  }

  return Math.ceil(baseComplexity * sizeMultiplier);
};

// Check if units can be combined for processing
export const canCombineUnits = (unit1, unit2) => {
  if (!unit1 || !unit2) return false;

  // Both must have processed content
  if (!unit1.processingStatus?.hasProcessedContent || !unit2.processingStatus?.hasProcessedContent) {
    return false;
  }

  // Compatible content types
  const compatibleTypes = [
    ['text', 'pdf', 'document'],
    ['image', 'pdf'],
    ['table', 'text', 'xml'],
    ['xml', 'text', 'table']
  ];

  return compatibleTypes.some(group =>
    group.includes(unit1.unitType) && group.includes(unit2.unitType)
  );
};

// Estimate processing time
export const estimateProcessingTime = (unitType, content, complexity = null) => {
  const baseTimeMap = {
    text: 3000,      // 3s
    table: 2000,     // 2s
    image: 8000,     // 8s
    xml: 4000,       // 4s
    document: 6000,  // 6s
    pdf: 12000       // 12s
  };

  const baseTime = baseTimeMap[unitType] || 5000;
  const complexityScore = complexity || getProcessingComplexity(unitType, content);

  return baseTime * complexityScore * (0.8 + Math.random() * 0.4); // Add randomness
};

// Progress calculation utilities
export const calculateProgress = (currentStep, totalSteps, stepProgress = 0) => {
  if (totalSteps === 0) return 0;

  const completedSteps = currentStep - 1;
  const currentStepProgress = stepProgress;

  return Math.min((completedSteps + currentStepProgress) / totalSteps, 1);
};

// Text truncation with smart word boundaries
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
};

// Debounce function for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// File size formatting
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Safe JSON parsing
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
};

// Deep clone object
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

export default {
  delay,
  generateId,
  getStatusIcon,
  formatDuration,
  formatConfidence,
  generateConnectionColor,
  canProcessContent,
  getProcessingComplexity,
  canCombineUnits,
  estimateProcessingTime,
  calculateProgress,
  truncateText,
  debounce,
  formatFileSize,
  safeJsonParse,
  deepClone
};