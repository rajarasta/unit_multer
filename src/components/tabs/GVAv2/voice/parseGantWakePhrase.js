import { normalise } from './scopeRegistry';

export function parseGantWakePhrase(raw) {
  if (!raw) return null;
  const s = normalise(raw).trim();
  console.log(`🔍 Parsing voice phrase: "${raw}" → normalized: "${s}"`);
  
  // Check for "gant" prefix first
  if (/^gant\b/.test(s)) {
    const m = s.match(/\bgant(?:\s+(prodaja|proizvodnja|opcenito))?\b/);
    const result = m?.[1] || 'sve';
    console.log(`✅ Regex match with gant:`, m, `→ result: "${result}"`);
    return result;
  }
  
  // Also accept direct scope words
  if (/(prodaja|proizvodnja|opcenito)/.test(s)) {
    const match = s.match(/(prodaja|proizvodnja|opcenito)/);
    const result = match[1];
    console.log(`✅ Direct scope match: "${result}"`);
    return result;
  }

  console.log(`❌ No valid scope found`);
  return null;
}