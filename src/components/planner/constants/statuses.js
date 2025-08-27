// constants/statuses.js
export const STATUSI = {
  'čeka': { bg: '#64748b', light: '#f1f5f9', border: '#cbd5e1', text: 'Čeka' },
  'u tijeku': { bg: '#0ea5e9', light: '#e0f2fe', border: '#7dd3fc', text: 'U tijeku' },
  'završeno': { bg: '#10b981', light: '#d1fae5', border: '#6ee7b7', text: 'Završeno' },
  'kasni': { bg: '#ef4444', light: '#fee2e2', border: '#fca5a5', text: 'Kasni' },
  'blokirano': { bg: '#f59e0b', light: '#fed7aa', border: '#fdba74', text: 'Blokirano' }
};

export const URGENCY_LEVELS = {
  'normal': { bg: '#64748b', light: '#f1f5f9', text: 'Normal', glow: 'transparent', icon: Clock },
  'medium': { bg: '#3b82f6', light: '#dbeafe', text: 'Srednje', glow: '#3b82f6', icon: Bell },
  'high': { bg: '#f59e0b', light: '#fed7aa', text: 'Visoko', glow: '#f59e0b', icon: Zap },
  'critical': { bg: '#ef4444', light: '#fee2e2', text: 'Kritično', glow: '#ef4444', icon: Flame }
};

export const DOC_URGENCY = {
  'normal': { bg: '#64748b', text: 'Normal' },
  'important': { bg: '#3b82f6', text: 'Važno' },
  'urgent': { bg: '#ef4444', text: 'Hitno' }
};

export const EVENT_TYPES = {
  'novi': { bg: '#10b981', text: 'Novi' },
  'promjena': { bg: '#0ea5e9', text: 'Promjena' },
  'brisanje': { bg: '#ef4444', text: 'Brisanje' },
  'import': { bg: '#8b5cf6', text: 'Import' },
  'ručno': { bg: '#f59e0b', text: 'Ručno' },
  'komentar': { bg: '#06b6d4', text: 'Komentar' },
  'dokument': { bg: '#ec4899', text: 'Dokument' },
  'opis': { bg: '#a855f7', text: 'Opis' },
  'status': { bg: '#22c55e', text: 'Status' },
  'podzadatak': { bg: '#fbbf24', text: 'Podzadatak' },
  'hitnost': { bg: '#dc2626', text: 'Hitnost' },
  'projekt': { bg: '#4ade80', text: 'Projekt' }
};