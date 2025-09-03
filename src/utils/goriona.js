export const GORIONA = {
  LADNO: "ladno",
  LAGANA: "lagana vatra", 
  KRCKA: "krčka se",
  NESTALO_PLINA: "nestalo plina",
  NESTALO_STRUJE: "nestalo struje",
  IZGORILO: "izgorilo",
  SKORO_ZAPALIT: "svaki čas će se zapalit",
  AKO_NE_ZALIJES: "ako sad ne zaliješ zapalit će se"
};

export const GORIONA_META = {
  [GORIONA.LADNO]:          { level: 0, priority: "low",      color:"bg-gray-200 text-gray-800",     emoji:"🧊" },
  [GORIONA.LAGANA]:         { level: 1, priority: "normal",   color:"bg-amber-100 text-amber-800",   emoji:"✨" },
  [GORIONA.KRCKA]:          { level: 2, priority: "high",     color:"bg-orange-100 text-orange-800", emoji:"🔥" },
  [GORIONA.NESTALO_PLINA]:  { level: 3, priority: "high",     color:"bg-yellow-100 text-yellow-800", emoji:"⛽️" },
  [GORIONA.NESTALO_STRUJE]: { level: 3, priority: "high",     color:"bg-yellow-100 text-yellow-800", emoji:"🔌" },
  [GORIONA.IZGORILO]:       { level: 5, priority: "critical", color:"bg-red-600 text-white",         emoji:"🔥" },
  [GORIONA.SKORO_ZAPALIT]:  { level: 5, priority: "critical", color:"bg-red-600 text-white",         emoji:"🚨" },
  [GORIONA.AKO_NE_ZALIJES]: { level: 4, priority: "critical", color:"bg-red-500 text-white",         emoji:"🧯" }
};

export const normalizeGoriona = (s) => {
  const key = (s||"").toLowerCase().trim();
  const all = Object.values(GORIONA);
  const hit = all.find(v => v === key);
  return hit || GORIONA.LADNO;
};

export const getGorionaUrgencyLevel = (goriona) => {
  const normalized = normalizeGoriona(goriona);
  return GORIONA_META[normalized]?.level || 0;
};

export const getGorionaPriority = (goriona) => {
  const normalized = normalizeGoriona(goriona);
  return GORIONA_META[normalized]?.priority || "normal";
};

export const formatGorionaForDisplay = (goriona) => {
  if (!goriona) return null;
  const normalized = normalizeGoriona(goriona);
  const meta = GORIONA_META[normalized];
  if (!meta) return null;
  
  return {
    text: normalized,
    emoji: meta.emoji,
    color: meta.color,
    priority: meta.priority,
    level: meta.level
  };
};