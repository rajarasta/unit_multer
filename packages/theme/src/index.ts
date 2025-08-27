export const fontStack = "Inter, "SF Pro Text", -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif" as const;

export const colors = {
  // brand
  primary: "#2563eb",       // blue-600
  primaryHover: "#1d4ed8",  // blue-700
  accent: "#a855f7",        // purple-ish
  info: "#0ea5e9",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",

  // ui
  background: "#f8fafc",   // slate-50
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",   // slate-100
  border: "#e2e8f0",       // slate-200
  textPrimary: "#0f172a",  // slate-900
  textSecondary: "#475569",// slate-600
} as const;

export const radius = {
  xs: "4px",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  pill: "999px",
} as const;

export const shadow = {
  sm: "0 1px 2px rgba(0,0,0,0.06)",
  md: "0 2px 6px rgba(0,0,0,0.10)",
  lg: "0 8px 24px rgba(0,0,0,0.12)",
} as const;

export const zIndex = {
  base: 1,
  header: 20,
  dropdown: 30,
  overlay: 40,
  modal: 50,
  toast: 60,
} as const;

// opcionalno: spacing helper (8pt scale / 4pt base)
export const spacing = (n: number) => ${n * 4}px;

export const theme = { colors, radius, shadow, zIndex, fontStack, spacing } as const;
export default theme;
