/**
 * sx(input) → always returns a valid React style object.
 * - function → sx(fnResult)
 * - array   → merge of sx(each)
 * - string  → heuristics (backgroundImage/borderStyle/color/cursor/display/textAlign/…)
 * - object  → returned as-is
 */
export function sx(input) {
  // If the input is a function, assume caller already passed ctx; but be defensive
  if (typeof input === "function") {
    try { return sx(input()); } catch { return {}; }
  }
  if (Array.isArray(input)) {
    return input.reduce((acc, it) => Object.assign(acc, sx(it)), {});
  }
  if (!input || typeof input !== "object" && typeof input !== "string") return {};
  if (typeof input === "object") return input;

  // String heuristics
  const s = String(input).trim();
  if (!s) return {};

  if (/^linear-gradient\(/i.test(s))       return { backgroundImage: s };
  if (/^(solid|dashed|dotted)$/i.test(s))  return { borderStyle: s };
  if (/^(pointer|auto|default|move|text|crosshair|not-allowed|grab|grabbing)$/i.test(s)) return { cursor: s };
  if (/^(none|block|inline|inline-block|flex|grid)$/i.test(s)) return { display: s };
  if (/^(left|center|right|justify)$/i.test(s)) return { textAlign: s };
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s) || /^(rgb|rgba|hsl|hsla)\(/i.test(s)) return { color: s };

  // Fallback: do nothing rather than crash
  return {};
}

export default sx;
