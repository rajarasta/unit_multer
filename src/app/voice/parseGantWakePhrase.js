import { normalise } from './scopeRegistry';

export function parseGantWakePhrase(raw) {
  if (!raw) return null;
  const s = normalise(raw).trim();
  if (!/^gant\b/.test(s)) return null;

  const m = s.match(/\bgant(?:\s+(prodaja|proizvodnja|opcenito))?\b/);
  return m?.[1] || 'sve';
}