// ExecutionEnvelope and related types for tool orchestrator

export const signature = (inputs, intent) => {
  const kinds = [...new Set(inputs.map(i => i.type))].sort();
  return `${kinds.join("+")}|${intent}`;
};

// Validation helpers
export const isValidBlobRef = (ref) => {
  return ref && 
    typeof ref.uri === 'string' && 
    ['text', 'image', 'video', 'table', 'document', 'dwg'].includes(ref.kind);
};

export const isValidDataFacet = (facet) => {
  if (!facet || typeof facet.type !== 'string') return false;
  
  switch (facet.type) {
    case 'text':
      return typeof facet.text === 'string';
    case 'text_file':
    case 'image':
    case 'video':
    case 'table':
    case 'document':
    case 'dwg':
      return isValidBlobRef(facet.ref);
    default:
      return false;
  }
};

export const isValidExecutionEnvelope = (envelope) => {
  return envelope &&
    envelope.v === "env/1" &&
    typeof envelope.request_id === 'string' &&
    typeof envelope.user_id === 'string' &&
    typeof envelope.created_at === 'string' &&
    Array.isArray(envelope.inputs) &&
    envelope.inputs.every(isValidDataFacet) &&
    typeof envelope.declared_intent === 'string';
};

// Plan validation
export const isValidStep = (step) => {
  if (!step || typeof step.id !== 'string' || !step.id.match(/^step_[A-Za-z0-9_]+$/)) {
    return false;
  }
  
  if (step.kind === 'call_tool') {
    return typeof step.tool === 'string' &&
           typeof step.args === 'object' &&
           typeof step.into === 'string' &&
           step.into.match(/^\$[A-Za-z][A-Za-z0-9_]*$/);
  }
  
  if (step.kind === 'call_llm') {
    return typeof step.model === 'string' &&
           typeof step.prompt === 'string' &&
           typeof step.into === 'string';
  }
  
  return false;
};

export const isValidPlan = (plan) => {
  return plan &&
    typeof plan.meta === 'object' &&
    typeof plan.meta.goal === 'string' &&
    typeof plan.meta.policy === 'object' &&
    plan.meta.policy.no_chain_of_thought === true &&
    Array.isArray(plan.steps) &&
    plan.steps.length > 0 &&
    plan.steps.every(isValidStep);
};

// Tool execution context
export const createExecutionContext = (runId, envelope) => ({
  runId,
  envelope,
  created_at: new Date().toISOString(),
  variables: new Map(),
  events: []
});

// Event types for tracing
export const createTraceEvent = (runId, event, step = null, preview = null, stats = null) => ({
  v: "trace/1",
  run_id: runId,
  ts: new Date().toISOString(),
  event,
  step,
  preview,
  stats: stats || { tokens_in: 0, tokens_out: 0 },
  redacted: false,
  locale: "hr-HR"
});