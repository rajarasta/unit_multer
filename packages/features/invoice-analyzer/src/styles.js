const {
  colors = {
    background: '#f6f8fa',
    surface: '#ffffff',
    border: '#e5e7eb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    primary: '#0969da',
    error: '#dc2626'
  },
  fontStack = "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  radius = { sm: 6, md: 8, lg: 12 },
  shadow = {
    sm: "0 1px 2px rgba(0,0,0,0.04)",
    md: "0 2px 8px rgba(0,0,0,0.1)",
    lg: "0 8px 24px rgba(0,0,0,0.15)"
  }
} = theme || {};

export { colors, fontStack, radius, shadow };

/** S — central style object for Invoice Processor & related tabs */
export const S = {
  wrap: {
    display: "flex",
    flexWrap: "wrap",
    height: "calc(100vh - 60px)",
    backgroundColor: colors.background,
    fontFamily: fontStack,
  },

  left: {
    flex: "1 1 350px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.surface,
    borderRight: 1px solid ,
    minHeight: 300,
    overflow: "hidden",
  },

  right: {
    flex: "2 1 450px",
    display: "flex",
    flexDirection: "column",
    minHeight: 300,
    background: colors.surface
  },

  header: {
    padding: "12px 16px",
    borderBottom: 1px solid ,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.surface,
  },

  title: { fontSize: 18, fontWeight: 700, margin: 0, color: colors.textPrimary },
  sub: { fontSize: 12, color: colors.textSecondary },
  toolbar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  content: { flex: 1, overflow: "auto", padding: 16 },

  projectTop: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: 12,
    borderBottom: 1px solid ,
  },

  select: {
    padding: "8px 10px",
    border: 1px solid ,
    borderRadius: radius.md,
    background: colors.surface,
    fontSize: 14,
    color: colors.textPrimary
  },

  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottom: 1px solid ,
  },

  searchInput: {
    width: "100%",
    padding: "8px 10px",
    border: 1px solid ,
    borderRadius: radius.md,
    outline: "none",
    background: colors.surface,
    color: colors.textPrimary
  },

  zoomRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderBottom: 1px solid ,
  },

  dropZone: {
    padding: 12,
    border: 1px solid transparent,
    borderRadius: radius.lg,
    transition: "all .2s",
    background: colors.surface,
    marginBottom: 12,
  },

  dropZoneActive: {
    borderColor: colors.primary,
    background: "#f0f9ff",
    borderStyle: "dashed",
  },

  targetHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  targetTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: colors.textPrimary },
  taskTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: colors.textPrimary },

  cameraButton: {
    padding: 8,
    background: colors.surface,
    border: 1px solid ,
    borderRadius: radius.md,
    cursor: "pointer",
    display: "inline-flex",
  },

  docList: { display: "flex", gap: 8, flexWrap: "wrap" },

  chip: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: colors.textSecondary,
  },

  uploadBtn: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "8px 10px",
    background: colors.surface,
    border: 1px solid ,
    borderRadius: radius.md,
    cursor: "pointer",
  },

  viewBtn: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "6px 8px",
    background: colors.surface,
    border: 1px solid ,
    borderRadius: radius.md,
    cursor: "pointer",
  },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 },
  list: { display: "flex", flexDirection: "column", gap: 8 },

  card: (scale = 1) => ({
    border: 1px solid ,
    borderRadius: radius.lg,
    background: colors.surface,
    overflow: "hidden",
    cursor: "grab",
    userSelect: "none",
    boxShadow: shadow.sm,
    transform: scale(),
    transformOrigin: "top left",
  }),

  thumbBox: { height: 140, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" },
  thumb: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  cardBody: { padding: 10 },
  meta: { fontSize: 12, color: colors.textSecondary },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },

  modal: {
    background: colors.surface,
    borderRadius: radius.lg,
    width: "min(960px, 96vw)",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: shadow.lg
  },

  modalHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: 1px solid ,
  },

  modalMain: { padding: 16, display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 },

  modalPreview: {
    background: "#0b0b0b",
    borderRadius: radius.md,
    minHeight: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  textarea: {
    width: "100%",
    minHeight: 100,
    border: 1px solid ,
    borderRadius: radius.md,
    padding: 10,
    outline: "none",
    color: colors.textPrimary,
    background: colors.surface
  },

  footer: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    padding: 12,
    borderTop: 1px solid ,
    background: colors.surface,
  },

  primary: { background: colors.primary, color: "white", border: "none", padding: "8px 12px", borderRadius: radius.md, cursor: "pointer" },
  danger:  { background: colors.error,   color: "white", border: "none", padding: "8px 12px", borderRadius: radius.md, cursor: "pointer" },
  subtle:  { background: colors.surface, border: 1px solid , padding: "8px 12px", borderRadius: radius.md, cursor: "pointer", color: colors.textPrimary },
};

