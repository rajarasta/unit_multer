export const fontStack =
  "Inter, "SF Pro Text", -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif" as const;

export const colors = {
  // brand
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  accent: "#a855f7",
  info: "#0ea5e9",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",

  // ui
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  border: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
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

export const spacing = (n: number) => ${n * 4}px;

const theme = { colors, radius, shadow, zIndex, fontStack, spacing } as const;
export default theme;
