// Tool schemas and lightweight validator + dispatcher mapping

export const toolSchemas = {
  move_start: {
    required: ['alias', 'date'],
    props: { alias: 'string', date: 'date' },
  },
  move_end: {
    required: ['alias', 'date'],
    props: { alias: 'string', date: 'date' },
  },
  set_range: {
    required: ['alias', 'start', 'end'],
    props: { alias: 'string', start: 'date', end: 'date' },
  },
  set_duration: {
    required: ['alias', 'duration_days'],
    props: { alias: 'string', duration_days: 'number' },
  },
  shift: {
    required: ['alias', 'days'],
    props: { alias: 'string', days: 'number' },
  },
  shift_all: {
    required: ['days'],
    props: { days: 'number' },
  },
  distribute_chain: {
    required: [],
    props: {},
  },
  normative_extend: {
    required: ['days'],
    props: { days: 'number' },
  },
  apply_normative: {
    required: ['profile'],
    props: { profile: 'number' },
  },
  open_document: {
    required: ['document', 'page'],
    props: { document: 'string', page: 'number' },
  },
  add_task_open: {
    required: [],
    props: {},
  },
  cancel_pending: {
    required: [],
    props: {},
  },
  image_popup: {
    required: [],
    props: {},
  },
};

export function validateParams(tool, params) {
  const schema = toolSchemas[tool];
  if (!schema) return { ok: false, error: `Unknown tool: ${tool}` };
  const p = params || {};
  for (const k of schema.required) {
    if (!(k in p)) return { ok: false, error: `Missing required param: ${k}` };
  }
  for (const [k, typ] of Object.entries(schema.props)) {
    if (p[k] == null) continue; // optional
    if (typ === 'date') {
      if (typeof p[k] !== 'string') return { ok: false, error: `Param ${k} must be ISO date string` };
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(p[k]);
      if (!iso) return { ok: false, error: `Param ${k} must be YYYY-MM-DD` };
    } else if (typ === 'number') {
      if (typeof p[k] !== 'number' || !Number.isFinite(p[k])) return { ok: false, error: `Param ${k} must be a number` };
    } else if (typ === 'string') {
      if (typeof p[k] !== 'string') return { ok: false, error: `Param ${k} must be a string` };
    }
  }
  return { ok: true };
}
