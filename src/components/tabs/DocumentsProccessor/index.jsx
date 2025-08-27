import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Upload,
  FileText,
  Camera,
  Building,
  Package,
  X,
  Search,
  AlertTriangle,
  Trash2,
  Grid,
  List,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Images,
} from "lucide-react";

/**
 * Single-file, drop-in component for a user-friendly Document Intake system.
 *
 * Key features:
 * - Right panel: upload files (images/PDF), unassigned pool, grid/list view, thumbnails with metadata
 * - Left panel: Project selector + list of positions (tasks); drag from right to left to assign
 * - Camera capture buttons on Project and each Task (mobile-first)
 * - Remove from a position/project (returns to unassigned)
 * - Comment per document (stored in JSON)
 * - Save/Confirm -> export JSON in the same shape FloorManagement/Gantt expect
 * - Cancel/Close -> revert to last imported/saved snapshot
 * - Multi-project support: import one or more project JSONs and switch active project
 * - Mobile-friendly responsive layout (panels stack)
 *
 * JSON SHAPES SUPPORTED
 * 1) Single project file (recommended / backwards compatible):
 *    {
 *      "projectState": {
 *        projectName: string,
 *        tasks: Task[],
 *        floors: object,
 *        projectDocuments: Document[],
 *        unassignedDocuments: Document[]
 *      }
 *    }
 * 2) Multi-project bundle:
 *    {
 *      "projects": [ { "projectState": { ... } }, { "projectState": { ... } } ]
 *    }
 *
 * TASK SHAPE EXPECTED (minimal):
 *    {
 *      id: string,
 *      name: string,
 *      department?: string,
 *      details?: { documents?: Document[], [k: string]: any },
 *      [k: string]: any
 *    }
 *
 * DOCUMENT SHAPE:
 *    {
 *      id: string,
 *      name: string,
 *      type: string, // mime
 *      size: string, // human readable
 *      uploadDate: string,
 *      isImage: boolean,
 *      dataUrl: string, // base64
 *      thumbnailUrl?: string,
 *      comment?: string,
 *      metadata: { location?: any, captureTime?: string }
 *    }
 */

// ----------------- Utilities -----------------
const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
    "PB",
    "EB",
    "ZB",
    "YB",
  ];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const readDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

const generateThumbnail = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 220; // a tad bigger for retina
        let { width, height } = img;
        if (width > height && width > MAX) {
          height *= MAX / width;
          width = MAX;
        } else if (height > MAX) {
          width *= MAX / height;
          height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });

const processFiles = async (files) => {
  const out = [];
  for (const file of files) {
    try {
      const isImage = file.type?.startsWith("image/") ?? false;
      const dataUrl = await readDataUrl(file);
      const thumbnailUrl = isImage ? await generateThumbnail(file) : null;
      out.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: file.type || "application/octet-stream",
        size: formatBytes(file.size || 0),
        uploadDate: new Date().toLocaleString(),
        isImage,
        dataUrl,
        thumbnailUrl,
        comment: "",
        metadata: {
          location: null, // EXIF/GPS parsing can be added later
          captureTime: file.lastModified
            ? new Date(file.lastModified).toLocaleString()
            : null,
        },
      });
    } catch (e) {
      console.error("File processing error:", e);
    }
  }
  return out;
};

const deepClone = (x) => JSON.parse(JSON.stringify(x));

// ----------------- Styles (inline, theme-friendly) -----------------
const colors = {
  background: "#f6f7f9",
  surface: "#ffffff",
  border: "#e6e8eb",
  text: "#1f2937",
  textSecondary: "#6b7280",
  primary: "#0ea5e9",
  danger: "#ef4444",
  success: "#10b981",
};

const S = {
  wrap: {
    display: "flex",
    flexWrap: "wrap",
    height: "calc(100vh - 60px)",
    backgroundColor: colors.background,
    fontFamily:
      "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
  },
  left: {
    flex: "1 1 350px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    minHeight: 300,
    overflow: "hidden",
  },
  right: {
    flex: "2 1 450px",
    display: "flex",
    flexDirection: "column",
    minHeight: 300,
  },
  header: {
    padding: "12px 16px",
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.surface,
  },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  sub: { fontSize: 12, color: colors.textSecondary },
  toolbar: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  content: { flex: 1, overflow: "auto", padding: 16 },
  // Left side specifics
  projectTop: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    padding: 12,
    borderBottom: `1px solid ${colors.border}`,
  },
  select: {
    padding: "8px 10px",
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: colors.surface,
    fontSize: 14,
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottom: `1px solid ${colors.border}`,
  },
  searchInput: {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    outline: "none",
  },
  zoomRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderBottom: `1px solid ${colors.border}`,
  },
  dropZone: {
    padding: 12,
    border: `1px solid transparent`,
    borderRadius: 10,
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
  targetTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700 },
  taskTitle: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 },
  cameraButton: {
    padding: 8,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
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
  // Right side specifics
  uploadBtn: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "8px 10px",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    cursor: "pointer",
  },
  viewBtn: {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "6px 8px",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    cursor: "pointer",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 },
  list: { display: "flex", flexDirection: "column", gap: 8 },
  card: (scale = 1) => ({
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    background: colors.surface,
    overflow: "hidden",
    cursor: "grab",
    userSelect: "none",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  }),
  thumbBox: { height: 140, background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" },
  thumb: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" },
  cardBody: { padding: 10 },
  meta: { fontSize: 12, color: colors.textSecondary },
  // Modal
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
    borderRadius: 12,
    width: "min(960px, 96vw)",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: `1px solid ${colors.border}`,
  },
  modalMain: { padding: 16, display: "grid", gridTemplateColumns: "1fr 300px", gap: 16 },
  modalPreview: {
    background: "#0b0b0b",
    borderRadius: 8,
    minHeight: 300,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  textarea: {
    width: "100%",
    minHeight: 100,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: 10,
    outline: "none",
  },
  footer: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
    padding: 12,
    borderTop: `1px solid ${colors.border}`,
    background: colors.surface,
  },
  // Utility buttons
  primary: { background: colors.primary, color: "white", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer" },
  danger: { background: colors.danger, color: "white", border: "none", padding: "8px 12px", borderRadius: 8, cursor: "pointer" },
  subtle: { background: colors.surface, border: `1px solid ${colors.border}`, padding: "8px 12px", borderRadius: 8, cursor: "pointer" },
};

// ----------------- Small building blocks -----------------
const DocCard = ({ doc, onDragStart, onClick, scale = 1 }) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, doc)}
    style={S.card(scale)}
    onClick={() => onClick(doc)}
    title="Povuci lijevo za dodjelu. Klikni za detalje."
  >
    <div style={S.thumbBox}>
      {doc.isImage && doc.thumbnailUrl ? (
        <img src={doc.thumbnailUrl} alt={doc.name} style={S.thumb} />
      ) : (
        <FileText size={54} color="#a8a8a8" />
      )}
    </div>
    <div style={S.cardBody}>
      <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>{doc.name}</div>
      <div style={S.meta}>
        {doc.size} • {doc.uploadDate.split(",")[0]}
      </div>
      {doc.metadata?.captureTime && (
        <div style={{ ...S.meta, marginTop: 4 }}>
          Vrijeme: {doc.metadata.captureTime}
        </div>
      )}
      {doc.comment && (
        <div style={{ ...S.meta, fontStyle: "italic", marginTop: 2 }}>
          Komentar dodan
        </div>
      )}
    </div>
  </div>
);

const AssignedThumb = ({ doc, onRemove, onClick }) => (
  <div
    style={{
      position: "relative",
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      overflow: "hidden",
      width: 88,
      height: 88,
      background: "#fafafa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {doc.isImage && doc.thumbnailUrl ? (
      <img
        src={doc.thumbnailUrl}
        alt={doc.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
        onClick={() => onClick(doc)}
      />
    ) : (
      <div onClick={() => onClick(doc)} style={{ cursor: "pointer" }}>
        <FileText size={40} color="#a8a8a8" />
      </div>
    )}

    <button
      onClick={() => onRemove(doc.id)}
      title="Vrati u Nedodijeljene"
      style={{
        position: "absolute",
        top: 6,
        right: 6,
        border: "none",
        background: "rgba(255,255,255,0.8)",
        borderRadius: 8,
        padding: 4,
        cursor: "pointer",
      }}
    >
      <Trash2 size={16} color={colors.danger} />
    </button>
  </div>
);

// ----------------- Main component -----------------
export default function DocumentsProccessor() {
  // Multi-project support
  const [projects, setProjects] = useState([]); // each item: { id, projectState }
  const [activeProjectId, setActiveProjectId] = useState(null);

  // UI state
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [rightScale, setRightScale] = useState(1);
  const [leftScale, setLeftScale] = useState(1); // affect task density
  const [filter, setFilter] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDragOverProject, setIsDragOverProject] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

  // snapshot for cancel
  const [snapshot, setSnapshot] = useState(null);

  // file input refs
  const uploadRef = useRef(null);
  const projectCameraRef = useRef(null);

  // "Active project" helpers
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const ensureTaskDetails = (tasks) =>
    tasks.map((t) => ({ ...t, details: { documents: [], ...(t.details || {}) } }));

  const setActiveProjectState = useCallback(
    (updater) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id !== activeProjectId) return p;
          const nextPS = typeof updater === "function" ? updater(p.projectState) : updater;
          return { ...p, projectState: nextPS };
        })
      );
    },
    [activeProjectId]
  );

  // --------------- Import / Export ---------------
  const importJsonFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const loaded = [];
    for (const f of files) {
      try {
        const txt = await f.text();
        const json = JSON.parse(txt);
        if (json?.projects?.length) {
          // multi
          json.projects.forEach((wrap) => {
            const ps = wrap.projectState || wrap; // tolerate either shape
            loaded.push({
              id: `proj-${Math.random().toString(36).slice(2)}`,
              projectState: normalizeProjectState(ps),
              fileName: f.name,
            });
          });
        } else if (json?.projectState || json?.tasks) {
          const ps = json.projectState || json;
          loaded.push({
            id: `proj-${Math.random().toString(36).slice(2)}`,
            projectState: normalizeProjectState(ps),
            fileName: f.name,
          });
        }
      } catch (err) {
        console.error("Import error:", err);
      }
    }

    if (!loaded.length) return;

    setProjects((prev) => [...prev, ...loaded]);
    setActiveProjectId((prev) => prev ?? loaded[0].id);
    // create snapshot after import
    setSnapshot({ projects: deepClone([...projects, ...loaded]) });
    e.target.value = null; // reset
  };

  const normalizeProjectState = (ps) => {
    return {
      projectName: ps.projectName || "Novi Projekt",
      tasks: ensureTaskDetails(ps.tasks || []),
      floors: ps.floors || {},
      projectDocuments: ps.projectDocuments || [],
      unassignedDocuments: ps.unassignedDocuments || [],
    };
  };

  const exportJson = () => {
    if (!projects.length) return;

    let payload;
    if (projects.length === 1) {
      payload = { projectState: projects[0].projectState };
    } else {
      payload = { projects: projects.map((p) => ({ projectState: p.projectState })) };
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const name = projects.length === 1
      ? `${projects[0].projectState.projectName || "projekt"}-documents.json`
      : `projekti-documents-bundle.json`;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // create fresh snapshot on save
    setSnapshot({ projects: deepClone(projects) });
  };

  const cancelAll = () => {
    if (!snapshot) return;
    setProjects(deepClone(snapshot.projects));
  };

  // --------------- Assignment & camera ---------------
  const onDragStart = (e, doc) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ docId: doc.id }));
  };

  const assignToProject = (docId) => {
    if (!activeProject) return;
    const ps = deepClone(activeProject.projectState);
    const idx = ps.unassignedDocuments.findIndex((d) => d.id === docId);
    if (idx === -1) return;
    const [doc] = ps.unassignedDocuments.splice(idx, 1);
    ps.projectDocuments.push(doc);
    setActiveProjectState(ps);
  };

  const assignToTask = (taskId, docId) => {
    if (!activeProject) return;
    const ps = deepClone(activeProject.projectState);
    const idx = ps.unassignedDocuments.findIndex((d) => d.id === docId);
    if (idx === -1) return;
    const [doc] = ps.unassignedDocuments.splice(idx, 1);
    ps.tasks = ps.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const docs = [...(t.details?.documents || []), doc];
      return { ...t, details: { ...(t.details || {}), documents: docs } };
    });
    setActiveProjectState(ps);
  };

  const removeFromProject = (docId) => {
    if (!activeProject) return;
    const ps = deepClone(activeProject.projectState);
    const idx = ps.projectDocuments.findIndex((d) => d.id === docId);
    if (idx === -1) return;
    const [doc] = ps.projectDocuments.splice(idx, 1);
    ps.unassignedDocuments.push(doc);
    setActiveProjectState(ps);
  };

  const removeFromTask = (taskId, docId) => {
    if (!activeProject) return;
    const ps = deepClone(activeProject.projectState);
    ps.tasks = ps.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const list = t.details?.documents || [];
      const idx = list.findIndex((d) => d.id === docId);
      if (idx === -1) return t;
      const [doc] = list.splice(idx, 1);
      ps.unassignedDocuments.push(doc);
      return { ...t, details: { ...(t.details || {}), documents: list } };
    });
    setActiveProjectState(ps);
  };

  const handleCamera = async (files, target) => {
    if (!activeProject || !files?.length) return;
    const [doc] = await processFiles(files);
    if (!doc) return;
    const ps = deepClone(activeProject.projectState);
    if (target.type === "project") {
      ps.projectDocuments.push(doc);
    } else {
      ps.tasks = ps.tasks.map((t) => {
        if (t.id !== target.id) return t;
        const docs = [...(t.details?.documents || []), doc];
        return { ...t, details: { ...(t.details || {}), documents: docs } };
      });
    }
    setActiveProjectState(ps);
  };

  // --------------- Update comment everywhere ---------------
  const updateComment = (docId, comment) => {
    if (!activeProject) return;
    const ps = deepClone(activeProject.projectState);
    const touch = (d) => (d.id === docId ? { ...d, comment } : d);
    ps.unassignedDocuments = ps.unassignedDocuments.map(touch);
    ps.projectDocuments = ps.projectDocuments.map(touch);
    ps.tasks = ps.tasks.map((t) => ({
      ...t,
      details: {
        ...(t.details || {}),
        documents: (t.details?.documents || []).map(touch),
      },
    }));
    setActiveProjectState(ps);
  };

  // --------------- Right panel handlers ---------------
  const onFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !activeProject) return;
    const docs = await processFiles(files);
    const ps = deepClone(activeProject.projectState);
    ps.unassignedDocuments.push(...docs);
    setActiveProjectState(ps);
    e.target.value = null;
  };

  // --------------- Derived values ---------------
  const filteredUnassigned = useMemo(() => {
    if (!activeProject) return [];
    const list = activeProject.projectState.unassignedDocuments || [];
    if (!filter) return list;
    const q = filter.toLowerCase();
    return list.filter((d) =>
      [d.name, d.type, d.comment, d.metadata?.captureTime]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [activeProject, filter]);

  const filteredTasks = useMemo(() => {
    if (!activeProject) return [];
    const tasks = activeProject.projectState.tasks || [];
    return tasks;
  }, [activeProject]);

  // --------------- Expand / collapse tasks ---------------
  const toggleTask = (id) => {
    setExpandedTaskIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const expandAll = () => {
    if (!activeProject) return;
    setExpandedTaskIds(new Set(activeProject.projectState.tasks.map((t) => t.id)));
  };
  const collapseAll = () => setExpandedTaskIds(new Set());

  // --------------- Initial sample (optional) ---------------
  useEffect(() => {
    if (projects.length) return;
    // Create an empty default project for immediate use
    const empty = {
      projectName: "Novi Projekt",
      tasks: [
        { id: "t1", name: "Pozicija 1", department: "ALU", details: { documents: [] } },
        { id: "t2", name: "Pozicija 2", department: "STAKLO", details: { documents: [] } },
      ],
      floors: {},
      projectDocuments: [],
      unassignedDocuments: [],
    };
    const id = `proj-${Math.random().toString(36).slice(2)}`;
    const p = { id, projectState: empty, fileName: "(neimenovano)" };
    setProjects([p]);
    setActiveProjectId(id);
    setSnapshot({ projects: [deepClone(p)] });
  }, []);

  // ----------------- Render -----------------
  return (
    <div style={S.wrap}>
      {/* LEFT PANEL: Targets */}
      <div style={S.left}>
        {/* Projects bar */}
        <div style={S.projectTop}>
          <div>
            <div style={{ fontSize: 12, color: colors.textSecondary }}>Projekt</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                value={activeProjectId || ""}
                onChange={(e) => setActiveProjectId(e.target.value)}
                style={S.select}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectState.projectName || p.fileName}
                  </option>
                ))}
              </select>
              {/* Import one or more projects */}
              <label style={S.subtle}>
                <input
                  type="file"
                  accept="application/json"
                  multiple
                  style={{ display: "none" }}
                  onChange={importJsonFiles}
                />
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Upload size={16} /> Uvezi JSON
                </span>
              </label>
            </div>
          </div>

          {/* Project-level camera */}
          <div>
            <input
              ref={projectCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={(e) => handleCamera(e.target.files, { type: "project" })}
            />
            <button style={S.cameraButton} onClick={() => projectCameraRef.current?.click()} title="Slikaj i dodaj projektu">
              <Camera size={18} />
            </button>
          </div>
        </div>

        {/* Zoom controls & actions */}
        <div style={S.zoomRow}>
          <span style={S.chip}>Lista pozicija</span>
          <button style={S.subtle} onClick={expandAll} title="Proširi sve">
            <ChevronDown size={16} />
          </button>
          <button style={S.subtle} onClick={collapseAll} title="Skupi sve">
            <ChevronUp size={16} />
          </button>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={S.sub}>Veličina</span>
            <input
              type="range"
              min={0.9}
              max={1.4}
              step={0.05}
              value={leftScale}
              onChange={(e) => setLeftScale(parseFloat(e.target.value))}
            />
          </div>
        </div>

        {/* Targets content */}
        <div style={S.content}>
          {/* Assign to whole project */}
          <DropTarget
            label="Projekt (Općenito)"
            icon={Building}
            onDrop={(docId) => assignToProject(docId)}
            onDragState={setIsDragOverProject}
            isActive={isDragOverProject}
          >
            <AssignedList
              docs={activeProject?.projectState.projectDocuments || []}
              onRemove={(docId) => removeFromProject(docId)}
              onOpen={setSelectedDoc}
            />
          </DropTarget>

          {/* Tasks list */}
          <div style={{ height: 12 }} />
          {activeProject ? (
            activeProject.projectState.tasks.map((t) => (
              <div
                key={t.id}
                style={{ transform: `scale(${leftScale})`, transformOrigin: "top left" }}
              >
                <TaskTarget
                  task={t}
                  onDrop={(docId) => assignToTask(t.id, docId)}
                  onRemove={(docId) => removeFromTask(t.id, docId)}
                  onOpen={setSelectedDoc}
                  expanded={expandedTaskIds.has(t.id)}
                  onToggle={() => toggleTask(t.id)}
                  onCamera={(files) => handleCamera(files, { type: "task", id: t.id })}
                />
                <div style={{ height: 8 }} />
              </div>
            ))
          ) : (
            <div style={{ color: colors.textSecondary }}>Uvezite JSON projekta kako bi se prikazale pozicije.</div>
          )}
        </div>

        {/* Footer actions for Save / Cancel */}
        <div style={S.footer}>
          <button style={S.subtle} onClick={cancelAll} title="Poništi sve">
            <RotateCcw size={16} /> Poništi sve
          </button>
          <button style={S.primary} onClick={exportJson} title="Spremi u JSON (dijeljeno s Gantt/Tlocrti)">
            <Save size={16} /> Spremi / Potvrdi
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Unassigned */}
      <div style={S.right}>
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Nedodijeljeni dokumenti ({filteredUnassigned.length})</h2>
            <div style={S.sub}>Povucite lijevo na projekt ili poziciju</div>
          </div>
          <div style={S.toolbar}>
            {/* search */}
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: 10, top: 10, opacity: 0.6 }} />
              <input
                placeholder="Pretraži..."
                style={{ ...S.searchInput, paddingLeft: 32, width: 220 }}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>

            {/* view mode */}
            <button style={S.viewBtn} onClick={() => setViewMode("grid")} title="Mrežni prikaz">
              <Grid size={16} />
            </button>
            <button style={S.viewBtn} onClick={() => setViewMode("list")} title="Lista">
              <List size={16} />
            </button>

            {/* scale */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Images size={16} />
              <input
                type="range"
                min={0.9}
                max={1.3}
                step={0.05}
                value={rightScale}
                onChange={(e) => setRightScale(parseFloat(e.target.value))}
              />
            </div>

            {/* upload */}
            <label style={S.uploadBtn}>
              <input
                ref={uploadRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={onFilesChosen}
                style={{ display: "none" }}
              />
              <Upload size={16} /> Učitaj dokumente
            </label>
          </div>
        </div>

        <div style={S.content}>
          {activeProject && filteredUnassigned.length ? (
            viewMode === "grid" ? (
              <div style={S.grid}>
                {filteredUnassigned.map((doc) => (
                  <DocCard key={doc.id} doc={doc} onDragStart={onDragStart} onClick={setSelectedDoc} scale={rightScale} />
                ))}
              </div>
            ) : (
              <div style={S.list}>
                {filteredUnassigned.map((doc) => (
                  <div key={doc.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 120 }}>
                      <DocCard doc={doc} onDragStart={onDragStart} onClick={setSelectedDoc} scale={rightScale} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{doc.name}</div>
                      <div style={S.meta}>
                        {doc.size} • {doc.uploadDate.split(",")[0]} • {doc.type}
                      </div>
                      {doc.metadata?.captureTime && (
                        <div style={S.meta}>Vrijeme: {doc.metadata.captureTime}</div>
                      )}
                      {doc.comment && (
                        <div style={{ ...S.meta, fontStyle: "italic" }}>Komentar: {doc.comment}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div style={{ textAlign: "center", color: colors.textSecondary, padding: 40 }}>
              <p>Nema nedodijeljenih dokumenata.</p>
            </div>
          )}

          <div style={{ padding: 10, background: "#fffbe6", fontSize: 12, display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
            <AlertTriangle size={14} color="#faad14" />
            <div>Napomena: dokumenti se spremaju unutar JSON-a (Base64).</div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedDoc && (
        <div style={S.modalOverlay} onClick={() => setSelectedDoc(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHead}>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedDoc.name}</div>
                <div style={S.meta}>{selectedDoc.size} • {selectedDoc.type}</div>
              </div>
              <button style={S.subtle} onClick={() => setSelectedDoc(null)}>
                <X size={18} />
              </button>
            </div>
            <div style={S.modalMain}>
              <div style={S.modalPreview}>
                {selectedDoc.isImage && selectedDoc.dataUrl ? (
                  <img
                    src={selectedDoc.dataUrl}
                    alt={selectedDoc.name}
                    style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ color: "#bbb", textAlign: "center" }}>
                    <FileText size={64} />
                    <div style={{ marginTop: 8 }}>Nema pregleda za ovu datoteku</div>
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>Metapodaci</div>
                <div style={{ ...S.meta, marginBottom: 8 }}>Vrijeme nastanka: {selectedDoc.metadata?.captureTime || "-"}</div>
                {/* Location placeholder */}
                <div style={{ ...S.meta, marginBottom: 12 }}>Lokacija: {selectedDoc.metadata?.location ? JSON.stringify(selectedDoc.metadata.location) : "-"}</div>

                <div style={{ fontWeight: 600, marginBottom: 6 }}>Komentar</div>
                <textarea
                  defaultValue={selectedDoc.comment || ""}
                  onBlur={(e) => updateComment(selectedDoc.id, e.target.value)}
                  placeholder="Dodaj kratki komentar..."
                  style={S.textarea}
                />
              </div>
            </div>
            <div style={S.footer}>
              <button style={S.subtle} onClick={() => setSelectedDoc(null)}>Zatvori</button>
              <button style={S.primary} onClick={() => setSelectedDoc(null)}>Spremi komentar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------- Subcomponents -----------------
function DropTarget({ label, icon: Icon, children, onDrop, onDragState, isActive }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
    onDragState?.(true);
  };
  const handleDragLeave = () => {
    setDragOver(false);
    onDragState?.(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onDragState?.(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.docId) onDrop(data.docId);
    } catch {}
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...S.dropZone,
        ...(dragOver || isActive ? S.dropZoneActive : {}),
      }}
    >
      <div style={S.targetHeader}>
        <div style={S.targetTitle}>
          <Icon size={18} /> {label}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function AssignedList({ docs, onRemove, onOpen }) {
  if (!docs?.length) return <div style={{ fontSize: 12, color: colors.textSecondary }}>Nema dokumenata.</div>;
  return (
    <div style={S.docList}>
      {docs.map((doc) => (
        <AssignedThumb key={doc.id} doc={doc} onRemove={() => onRemove(doc.id)} onClick={() => onOpen(doc)} />
      ))}
    </div>
  );
}

function TaskTarget({ task, onDrop, onRemove, onOpen, expanded, onToggle, onCamera }) {
  const cameraRef = useRef(null);

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/json"));
          if (data.docId) onDrop(data.docId);
        } catch {}
      }}
      style={{ ...S.dropZone }}
    >
      <div style={S.targetHeader}>
        <div style={S.taskTitle}>
          <button
            onClick={onToggle}
            style={{ ...S.subtle, padding: 4, display: "inline-flex", alignItems: "center", gap: 4 }}
            title={expanded ? "Skupi" : "Proširi"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <Package size={16} /> {task.name}
          {task.department && <span style={{ ...S.chip, marginLeft: 8 }}>{task.department}</span>}
        </div>
        <div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => onCamera(e.target.files)}
          />
          <button style={S.cameraButton} onClick={() => cameraRef.current?.click()} title="Slikaj i dodaj poziciji">
            <Camera size={18} />
          </button>
        </div>
      </div>

      {expanded && (
        <AssignedList
          docs={task.details?.documents || []}
          onRemove={(docId) => onRemove(docId)}
          onOpen={onOpen}
        />
      )}
    </div>
  );
}
