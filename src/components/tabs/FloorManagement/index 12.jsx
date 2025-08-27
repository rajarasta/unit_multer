// index.jsx
// =====================================================
// Fluent Floor Management (refactor, single-file)
// =====================================================
// ► Kasnije izdvojiti u module prema komentarima niže.
//    - constants: INSTALLATION_PHASES, COLORS...
//    - helpers: clamp, toPercent, initializeTask, getMarkerVisualStatus...
//    - sub-components: Header, Sidebar*, MarkerComponent, DetailsModal...
//    - styles: styles object ili Tailwind alternative
// =====================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Building, Upload, Download, Plus, X, Edit3, Trash2,
  Settings, Filter, Search, CheckCircle, AlertTriangle,
  FileText, MessageSquare, Layers, Save, Wrench, Pin,
  ChevronDown, ChevronUp, Loader
} from "lucide-react";

// === THEME (kasnije: /theme) ===
// Ako @al/theme postoji—super; inače fallback paleta i font.
import theme from "@al/theme";
const { colors: themeColors, fontStack: themeFont } = theme || {};
const colors = {
  primary: themeColors?.primary ?? "#0969da",
  surface: themeColors?.surface ?? "#ffffff",
  background: themeColors?.background ?? "#f6f8fa",
  border: themeColors?.border ?? "#e5e7eb",
  textPrimary: themeColors?.textPrimary ?? "#111827",
  textSecondary: themeColors?.textSecondary ?? "#6b7280",
  error: themeColors?.error ?? "#dc2626",
};
const fontStack = themeFont ?? "Inter, system-ui, sans-serif";

// === PDF & OCR (kasnije: /lib/pdf.ts i /lib/ocr.ts) ===
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
// Ako koristiš Vite/Webpack možeš odkomentirati liniju niže i imati lokalni worker bundle:
// import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import Tesseract from "tesseract.js";
const PDF_WORKER_CDN =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.mjs";

// === CONSTANTS & HELPERS (kasnije u /constants.ts i /lib/helpers.ts) ===
const DEFAULT_W = 5;
const DEFAULT_H = 3;
// Fleksibilniji pattern za labelu na tlocrtniku
const LABEL_REGEX = /\b(?:CW|P|D|W|V)\s*-?\s*\d{1,3}(?:[A-Z])?\b/gi;

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const toPercent = (value, total) =>
  Math.min(Math.max((value / total) * 100, 0), 100);

const INSTALLATION_PHASES = {
  spremno: { label: "Spremno", color: "#0969da" },
  montirano: { label: "Montirano", color: "#10b981" },
  ostakljeno: { label: "Ostakljeno", color: "#10b981" },
  brtvljenje: { label: "Brtvljenje", color: "#10b981" },
  dodaci: { label: "Dodaci", color: "#10b981" },
  zavrseno: { label: "Završeno", color: "#0e7a0d" },
};

const GANTT_STATUS_COLORS = {
  Planning: "#a8a8a8",
  "In Progress": "#0969da",
  Completed: "#0e7a0d",
  Delayed: "#ca8a04",
  Blocked: "#dc2626",
};
const getGanttStatusColor = (status) =>
  GANTT_STATUS_COLORS[status] || "#5c5c5c";

const getMarkerVisualStatus = (taskData, settings) => {
  if (!taskData) return { color: "#a8a8a8", name: "Unassigned" };
  const installation = taskData.floorManagement?.installation;

  // Reklamacija ima prioritet
  if (installation?.reklamacija)
    return { color: "#dc2626", name: "Reklamacija" };

  if (settings.prioritizeInstallationStatus) {
    if (installation?.zavrseno)
      return { color: "#0e7a0d", name: "Instalacija završena" };
    if (
      installation?.spremno ||
      installation?.montirano ||
      installation?.ostakljeno ||
      installation?.brtvljenje ||
      installation?.dodaci
    )
      return { color: "#10b981", name: "Montaža u tijeku" };
  }
  return { color: getGanttStatusColor(taskData.status), name: taskData.status };
};

// Osiguraj strukturu taska
const initializeTask = (task) => ({
  ...task,
  id: task.id || `task-${Math.random().toString(36).slice(2)}`,
  name: task.name || "Pozicija",
  department: task.department || "N/A",
  status: task.status || "Planning",
  floorManagement: task.floorManagement || {
    location: null, // { floorId, x, y, w, h }
    installation: {
      spremno: false,
      montirano: false,
      ostakljeno: false,
      brtvljenje: false,
      dodaci: false,
      zavrseno: false,
      reklamacija: "",
    },
  },
  details: task.details || {
    description: task.description || "",
    documents: task.documents || [],
    comments: task.comments || [],
  },
});

// === ROOT KOMPONENTA (kasnije /pages/FluentFloorManagement.tsx) ===
export default function FluentFloorManagement() {
  // ---------- Core Data ----------
  const [tasks, setTasks] = useState([]);
  const [floors, setFloors] = useState({}); // { id: { id, name, image, annotations: [...] } }
  const [currentFloorId, setCurrentFloorId] = useState(null);

  // ---------- UI State ----------
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ---------- Settings & Filters ----------
  const [settings, setSettings] = useState({
    showGanttInfo: true,
    showInstallationInfo: true,
    showIcons: true,
    showAnnotations: true,
    autoDetectLabels: true,
    ignoreLegend: true,
    prioritizeInstallationStatus: true,
  });

  const [filters, setFilters] = useState({
    search: "",
    ganttStatus: [],
    installationPhase: [],
    hasComplaint: false,
    department: [],
  });
  const [showFilters, setShowFilters] = useState(true);

  // ---------- Refs & Drag ----------
  const floorPlanRef = useRef(null);
  // dragging: { type: 'marker'|'annotation'|'task_sidebar', id, startX, startY, origX, origY }
  const [dragging, setDragging] = useState(null);
  const [actionMoved, setActionMoved] = useState(false);

  // PDF worker init + keyframes spinner
  useEffect(() => {
    if (!GlobalWorkerOptions.workerSrc) {
      // Ako koristiš lokalni worker, zamijeni s importanim `pdfWorker`
      // GlobalWorkerOptions.workerSrc = pdfWorker;
      GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;
    }
    ensureSpinnerKeyframes();
  }, []);

  const currentFloor = floors[currentFloorId] || null;

  const tasksOnFloor = useMemo(
    () =>
      tasks.filter(
        (t) => t.floorManagement?.location?.floorId === currentFloorId
      ),
    [tasks, currentFloorId]
  );

  const unassignedTasks = useMemo(
    () => tasks.filter((t) => !t.floorManagement?.location),
    [tasks]
  );

  const filteredTasksOnFloor = useMemo(() => {
    return tasksOnFloor.filter((task) => {
      const { search, ganttStatus, installationPhase, hasComplaint, department } =
        filters;
      const fm = task.floorManagement;

      if (search) {
        const q = search.toLowerCase();
        const inName = task.name.toLowerCase().includes(q);
        const inId = task.id.toLowerCase().includes(q);
        const inDesc = (task.details.description || "")
          .toLowerCase()
          .includes(q);
        if (!inName && !inId && !inDesc) return false;
      }

      if (department.length > 0 && !department.includes(task.department)) {
        return false;
      }

      if (ganttStatus.length > 0 && !ganttStatus.includes(task.status)) {
        return false;
      }

      if (installationPhase.length > 0) {
        const activePhases = Object.keys(INSTALLATION_PHASES).filter(
          (k) => fm.installation?.[k]
        );
        if (!installationPhase.some((p) => activePhases.includes(p))) {
          return false;
        }
      }

      if (hasComplaint && !fm.installation?.reklamacija) {
        return false;
      }

      return true;
    });
  }, [tasksOnFloor, filters]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId),
    [tasks, selectedTaskId]
  );

  // === IMPORT/EXPORT/UPDATE (kasnije: /lib/io.ts) ===
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.projectState?.tasks && data.projectState?.floors) {
        const state = data.projectState;
        setTasks((state.tasks || []).map(initializeTask));
        setFloors(state.floors || {});
        const firstFloorId = Object.keys(state.floors || {})[0] || null;
        setCurrentFloorId(firstFloorId);
        alert("Projekt uspješno učitan.");
      } else if (Array.isArray(data)) {
        const newTasks = data.map(initializeTask);
        setTasks(newTasks);
        alert(`Uspješno učitano ${data.length} pozicija iz Gantt JSON-a.`);
      } else {
        alert("JSON format nije prepoznat.");
      }
    } catch (err) {
      console.error("Error importing JSON:", err);
      alert("Greška pri učitavanju JSON datoteke.");
    } finally {
      setIsLoading(false);
      if (e.target) e.target.value = null;
    }
  };

  const handleExportJSON = () => {
    const projectState = { tasks, floors };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ projectState }, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute(
      "download",
      `FloorManagement_State_${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Centralni update taska
  const updateTask = useCallback((taskId, updates, path = "") => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = { ...t };
        if (path === "installation") {
          updated.floorManagement = {
            ...updated.floorManagement,
            installation: {
              ...updated.floorManagement.installation,
              ...updates,
            },
          };
        } else if (path === "location") {
          // updates može biti null → odspoji
          updated.floorManagement = {
            ...updated.floorManagement,
            location: updates ? { ...updated.floorManagement.location, ...updates } : null,
          };
        } else if (path === "details") {
          updated.details = { ...updated.details, ...updates };
        } else {
          Object.assign(updated, updates);
        }
        return updated;
      })
    );
  }, []);

  // === FLOOR MANAGEMENT (kasnije: /lib/floor.ts) ===
  const handleAddFloor = (name = `Crtež ${Object.keys(floors).length + 1}`) => {
    const newId = `floor-${Date.now()}`;
    setFloors((prev) => ({
      ...prev,
      [newId]: { id: newId, name, image: null, annotations: [] },
    }));
    setCurrentFloorId(newId);
    return newId;
  };

  const handleRenameFloor = (id, newName) => {
    if (!newName || !floors[id]) return;
    setFloors((prev) => ({ ...prev, [id]: { ...prev[id], name: newName } }));
  };

  const handleDeleteFloor = (id) => {
    if (
      window.confirm(
        "Jeste li sigurni da želite obrisati ovaj crtež? Sve pozicije na njemu bit će odspojene i vraćene u listu nevezanih."
      )
    ) {
      setTasks((prev) =>
        prev.map((t) =>
          t.floorManagement?.location?.floorId === id
            ? { ...t, floorManagement: { ...t.floorManagement, location: null } }
            : t
        )
      );
      setFloors((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (currentFloorId === id) {
        const remainingIds = Object.keys(floors).filter((k) => k !== id);
        setCurrentFloorId(remainingIds[0] || null);
      }
    }
  };

  // Auto-match OCR detekcija s taskovima
  const autoMatchDetections = (detections, floorId, pageW, pageH) => {
    let matchedCount = 0;
    setTasks((prevTasks) => {
      const available = new Map();
      prevTasks.forEach((t) => {
        if (!t.floorManagement?.location) {
          const key = t.name.toUpperCase().replace(/\s|-/g, "");
          if (!available.has(key)) available.set(key, []);
          available.get(key).push(t);
        }
      });

      const updates = new Map();
      detections.forEach((det) => {
        const normalized = det.name.trim().toUpperCase().replace(/\s|-/g, "");
        const pool = available.get(normalized);
        if (pool && pool.length) {
          const task = pool.shift();
          matchedCount++;
          const location = {
            floorId,
            x: toPercent(det.cx, pageW),
            y: toPercent(det.cy, pageH),
            w: DEFAULT_W,
            h: DEFAULT_H,
          };
          updates.set(task.id, {
            ...task,
            floorManagement: { ...task.floorManagement, location },
          });
        }
      });

      return prevTasks.map((t) => updates.get(t.id) || t);
    });
    return matchedCount;
  };

  const processFloorPlanFile = async (file) => {
    if (!file) return;
    setIsLoading(true);
    let targetFloorId = currentFloorId;
    if (!targetFloorId) targetFloorId = handleAddFloor(file.name.split(".")[0]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      let imageDataUrl, canvas, pageW, pageH;

      if (/^image\//.test(file.type)) {
        imageDataUrl = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((res) => {
          img.onload = res;
          img.src = imageDataUrl;
        });
        canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        pageW = img.width;
        pageH = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
      } else if (file.type === "application/pdf") {
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        pageW = viewport.width;
        pageH = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        imageDataUrl = canvas.toDataURL("image/png");
      } else {
        alert("Nepodržani format datoteke.");
        return;
      }

      setFloors((prev) => ({
        ...prev,
        [targetFloorId]: { ...prev[targetFloorId], image: imageDataUrl },
      }));

      if (settings.autoDetectLabels && tasks.length > 0) {
        let detections = [];

        const { data } = await Tesseract.recognize(canvas, "eng");
        (data.words || []).forEach((w) => {
          const hits = (w.text || "").match(LABEL_REGEX);
          if (hits) {
            const bb = w.bbox;
            const cx = (bb.x0 + bb.x1) / 2;
            const cy = (bb.y0 + bb.y1) / 2;
            hits.forEach((h) => detections.push({ name: h, cx, cy }));
          }
        });

        if (settings.ignoreLegend) {
          detections = detections.filter(
            (d) => !(d.cx > pageW * 0.8 && d.cy > pageH * 0.8)
          );
        }

        const matched = autoMatchDetections(detections, targetFloorId, pageW, pageH);
        if (matched > 0) console.log(`Automatski povezano ${matched} pozicija.`);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      alert("Greška pri obradi datoteke. Provjeri konzolu.");
    } finally {
      setIsLoading(false);
    }
  };

  // === Interaction (drag/click) ===
  const handleTaskDragStart = (e, task) => {
    e.dataTransfer.setData("text/plain", task.id);
    setDragging({ type: "task_sidebar", id: task.id });
  };

  const handleDropOnFloor = (e) => {
    e.preventDefault();
    if (!floorPlanRef.current || !currentFloorId || dragging?.type !== "task_sidebar")
      return;

    const taskId = e.dataTransfer.getData("text/plain");
    if (!unassignedTasks.find((t) => t.id === taskId)) {
      setDragging(null);
      return;
    }

    const rect = floorPlanRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    updateTask(
      taskId,
      { floorId: currentFloorId, x: clamp(x, 0, 100), y: clamp(y, 0, 100), w: DEFAULT_W, h: DEFAULT_H },
      "location"
    );
    setDragging(null);
  };

  // FIX: marker drag — prosljeđujemo i taskId i lokaciju
  const onElementMouseDown = (e, type, element, taskIdIfMarker) => {
    if (isAddingAnnotation) return;
    e.stopPropagation();
    setActionMoved(false);

    const rect = floorPlanRef.current.getBoundingClientRect();
    const id = type === "marker" ? taskIdIfMarker : element.id;
    const srcX = (element.x / 100) * rect.width;
    const srcY = (element.y / 100) * rect.height;

    setDragging({
      type, // 'marker' | 'annotation'
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: srcX,
      origY: srcY,
    });
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging || !floorPlanRef.current) return;

      const rect = floorPlanRef.current.getBoundingClientRect();
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) setActionMoved(true);

      const newX = clamp(((dragging.origX + dx) / rect.width) * 100, 0, 100);
      const newY = clamp(((dragging.origY + dy) / rect.height) * 100, 0, 100);

      if (dragging.type === "marker") {
        updateTask(dragging.id, { x: newX, y: newY }, "location");
      } else if (dragging.type === "annotation") {
        setFloors((prev) => ({
          ...prev,
          [currentFloorId]: {
            ...prev[currentFloorId],
            annotations: prev[currentFloorId].annotations.map((a) =>
              a.id === dragging.id ? { ...a, x: newX, y: newY } : a
            ),
          },
        }));
      }
    };

    const onUp = () => setDragging(null);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, updateTask, currentFloorId]);

  const openDetails = (taskId) => {
    if (actionMoved) return;
    setSelectedTaskId(taskId);
    setShowDetailsModal(true);
  };

  const handleFloorPlanClick = (e) => {
    if (!isAddingAnnotation || !floorPlanRef.current || !currentFloorId) return;
    const rect = floorPlanRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const text = prompt("Unesite tekst bilješke:");
    if (text) {
      const newAnno = {
        id: `anno-${Date.now()}`,
        x: clamp(x, 0, 100),
        y: clamp(y, 0, 100),
        text,
        status: "info",
      };
      setFloors((prev) => ({
        ...prev,
        [currentFloorId]: {
          ...prev[currentFloorId],
          annotations: [...(prev[currentFloorId].annotations || []), newAnno],
        },
      }));
    }
    setIsAddingAnnotation(false);
  };

  // === RENDER ===
  return (
    <div style={styles.appContainer}>
      {/* Header */}
      <Header
        floors={floors}
        currentFloorId={currentFloorId}
        onSelectFloor={setCurrentFloorId}
        onAddFloor={() => handleAddFloor()}
        onRenameFloor={handleRenameFloor}
        onDeleteFloor={handleDeleteFloor}
        onImportJSON={handleImportJSON}
        onExportJSON={handleExportJSON}
        onUploadFloorPlan={processFloorPlanFile}
        isLoading={isLoading}
      />

      {/* Main */}
      <div style={styles.mainContent}>
        {/* Left: Filters + Settings */}
        <div style={styles.sidebarLeft}>
          <SidebarFilters
            filters={filters}
            setFilters={setFilters}
            tasks={tasks}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
          <SidebarSettings settings={settings} setSettings={setSettings} />
        </div>

        {/* Center: Floor Plan */}
        <div style={styles.floorPlanArea}>
          <div style={styles.floorPlanToolbar}>
            <ActionButton
              onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
              active={isAddingAnnotation}
              icon={Pin}
              label={isAddingAnnotation ? "Završi dodavanje" : "Dodaj bilješku"}
              disabled={!currentFloorId}
            />
            <div style={{ flex: 1 }} />
            {isLoading && (
              <div style={styles.loadingIndicator}>
                <Loader size={18} style={{ animation: "spin 1s linear infinite" }} />
                Obrada...
              </div>
            )}
          </div>

          <div
            ref={floorPlanRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnFloor}
            onClick={handleFloorPlanClick}
            style={{
              ...styles.floorPlanViewer,
              backgroundImage: currentFloor?.image
                ? `url(${currentFloor.image})`
                : "none",
              cursor: isAddingAnnotation
                ? "crosshair"
                : dragging && dragging.type !== "task_sidebar"
                ? "grabbing"
                : "default",
              userSelect: dragging ? "none" : "auto",
              opacity: isLoading ? 0.7 : 1,
              border:
                dragging?.type === "task_sidebar"
                  ? `2px dashed ${colors.primary}`
                  : `1px solid ${colors.border}`,
            }}
          >
            {Object.keys(floors).length === 0 && <EmptyStateHint />}

            {/* Markeri */}
            {filteredTasksOnFloor.map((task) => (
              <MarkerComponent
                key={task.id}
                task={task}
                settings={settings}
                isHovered={hoveredTaskId === task.id}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
                onMouseDown={(e) =>
                  onElementMouseDown(e, "marker", task.floorManagement.location, task.id)
                }
                onMouseUp={() => openDetails(task.id)}
                onUpdateTask={updateTask}
              />
            ))}

            {/* Anotacije */}
            {settings.showAnnotations &&
              currentFloor?.annotations?.map((anno) => (
                <AnnotationComponent
                  key={anno.id}
                  annotation={anno}
                  onMouseDown={(e) => onElementMouseDown(e, "annotation", anno)}
                />
              ))}
          </div>
        </div>

        {/* Right: Lists + Summary */}
        <div style={styles.sidebarRight}>
          <SidebarTasks
            unassignedTasks={unassignedTasks}
            assignedTasks={tasksOnFloor}
            onTaskDragStart={handleTaskDragStart}
            onOpenDetails={openDetails}
            onHoverTask={setHoveredTaskId}
          />
          <InstallationSummary tasks={tasksOnFloor} />
        </div>
      </div>

      {/* Modal */}
      {showDetailsModal && selectedTask && (
        <DetailsModal
          task={selectedTask}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedTaskId(null);
          }}
          onUpdateTask={updateTask}
        />
      )}
    </div>
  );
}

// =====================================================
// SUB-KOMPONENTE (kasnije izdvojiti u /components/*)
// =====================================================

const Header = ({
  floors,
  currentFloorId,
  onSelectFloor,
  onAddFloor,
  onRenameFloor,
  onDeleteFloor,
  onImportJSON,
  onExportJSON,
  onUploadFloorPlan,
  isLoading,
}) => {
  const jsonInputRef = useRef(null);
  const fileInputRef = useRef(null);

  return (
    <header style={styles.header}>
      <div style={styles.headerLeft}>
        <div style={styles.logoContainer}>
          <Building style={styles.logoIcon} />
        </div>
        <h1 style={styles.title}>Upravljanje montažom (Tlocrti)</h1>

        {!!Object.keys(floors).length && (
          <FloorSwitcher
            floors={floors}
            currentFloorId={currentFloorId}
            onSelect={onSelectFloor}
            onAdd={onAddFloor}
            onRename={onRenameFloor}
            onDelete={onDeleteFloor}
          />
        )}
      </div>

      <div style={styles.headerRight}>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={onImportJSON}
        />
        <button
          style={styles.buttonSecondary}
          onClick={() => jsonInputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload size={16} /> Učitaj podatke (JSON)
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadFloorPlan(f);
          }}
        />
        <button
          style={styles.buttonPrimary}
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Layers size={16} /> {currentFloorId ? "Ažuriraj/Dodaj tlocrt" : "Dodaj tlocrt"}
        </button>

        <button style={styles.buttonSecondary} onClick={onExportJSON} disabled={isLoading}>
          <Save size={16} /> Spremi stanje
        </button>
      </div>
    </header>
  );
};

const FloorSwitcher = ({ floors, currentFloorId, onSelect, onAdd, onRename, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const handleClickOutside = (ev) => {
      if (ref.current && !ref.current.contains(ev.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const currentFloor = floors[currentFloorId];

  const handleRenameClick = (e, id, name) => {
    e.stopPropagation();
    const newName = prompt("Unesite novo ime crteža:", name);
    if (newName) onRename(id, newName);
    setIsOpen(false);
  };

  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    onDelete(id);
    setIsOpen(false);
  };

  return (
    <div style={styles.floorSwitcherContainer} ref={ref}>
      <button style={styles.floorSwitcherButton} onClick={() => setIsOpen(!isOpen)}>
        <Layers size={18} style={{ marginRight: 8 }} />
        {currentFloor ? currentFloor.name : "Odaberi crtež"}
        {isOpen ? (
          <ChevronUp size={18} style={{ marginLeft: 8 }} />
        ) : (
          <ChevronDown size={18} style={{ marginLeft: 8 }} />
        )}
      </button>
      {isOpen && (
        <div style={styles.floorSwitcherDropdown}>
          {Object.values(floors).map((floor) => (
            <div
              key={floor.id}
              style={styles.floorSwitcherItemWrapper}
              onClick={() => {
                onSelect(floor.id);
                setIsOpen(false);
              }}
            >
              <div
                style={{
                  ...styles.floorSwitcherItem,
                  backgroundColor:
                    floor.id === currentFloorId ? "#f0f0f0" : "transparent",
                }}
              >
                {floor.name}
              </div>
              <button
                style={styles.floorSwitcherActionButton}
                onClick={(e) => handleRenameClick(e, floor.id, floor.name)}
                title="Preimenuj"
              >
                <Edit3 size={14} />
              </button>
              <button
                style={styles.floorSwitcherActionButton}
                onClick={(e) => handleDeleteClick(e, floor.id)}
                title="Obriši"
              >
                <Trash2 size={14} color="#dc2626" />
              </button>
            </div>
          ))}
          <button
            style={styles.floorSwitcherAddButton}
            onClick={() => {
              onAdd();
              setIsOpen(false);
            }}
          >
            <Plus size={16} /> Dodaj novi crtež
          </button>
        </div>
      )}
    </div>
  );
};

const SidebarFilters = ({ filters, setFilters, tasks, showFilters, setShowFilters }) => {
  const uniqueGanttStatuses = useMemo(
    () => [...new Set(tasks.map((p) => p.status))].filter(Boolean).sort(),
    [tasks]
  );
  const uniqueDepartments = useMemo(
    () => [...new Set(tasks.map((p) => p.department))].filter(Boolean).sort(),
    [tasks]
  );

  const handleCheckboxChange = (type, value) => {
    setFilters((prev) => {
      const list = prev[type] || [];
      const newList = list.includes(value)
        ? list.filter((i) => i !== value)
        : [...list, value];
      return { ...prev, [type]: newList };
    });
  };

  return (
    <div style={styles.sidebarSection}>
      <div style={styles.sidebarHeader}>
        <h3 style={styles.sidebarTitle}>
          <Filter size={16} style={{ marginRight: 8 }} />
          Filteri prikaza
        </h3>
        <button style={styles.toggleButton} onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {showFilters && (
        <div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Pretraga (Naziv, ID, Opis)</label>
            <div style={styles.searchInputContainer}>
              <Search size={16} style={styles.searchIconInput} />
              <input
                type="text"
                placeholder="Traži..."
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                style={styles.searchInput}
              />
            </div>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Odjel (Gantt)</label>
            {uniqueDepartments.map((dept) => (
              <label key={dept} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={filters.department.includes(dept)}
                  onChange={() => handleCheckboxChange("department", dept)}
                  style={{ marginRight: 8 }}
                />
                {dept}
              </label>
            ))}
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Gantt status</label>
            {uniqueGanttStatuses.map((st) => (
              <label key={st} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={filters.ganttStatus.includes(st)}
                  onChange={() => handleCheckboxChange("ganttStatus", st)}
                  style={{ marginRight: 8 }}
                />
                {st}
              </label>
            ))}
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Faza montaže (aktivna)</label>
            {Object.keys(INSTALLATION_PHASES).map((key) => (
              <label key={key} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={filters.installationPhase.includes(key)}
                  onChange={() => handleCheckboxChange("installationPhase", key)}
                  style={{ marginRight: 8 }}
                />
                {INSTALLATION_PHASES[key].label}
              </label>
            ))}
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={filters.hasComplaint}
                onChange={() =>
                  setFilters((prev) => ({ ...prev, hasComplaint: !prev.hasComplaint }))
                }
                style={{ marginRight: 8 }}
              />
              <AlertTriangle size={14} color="#dc2626" style={{ marginRight: 4 }} />
              Samo reklamacije
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

const SidebarSettings = ({ settings, setSettings }) => {
  const toggle = (k) => setSettings((prev) => ({ ...prev, [k]: !prev[k] }));
  return (
    <div style={styles.sidebarSection}>
      <h3 style={styles.sidebarTitle}>
        <Settings size={16} style={{ marginRight: 8 }} />
        Postavke
      </h3>

      <h4 style={styles.subSectionTitle}>Prikaz na tlocrtu</h4>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={settings.showIcons}
          onChange={() => toggle("showIcons")}
          style={{ marginRight: 8 }}
        />
        Prikaži ikonice (Dokumenti, Komentari)
      </label>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={settings.showAnnotations}
          onChange={() => toggle("showAnnotations")}
          style={{ marginRight: 8 }}
        />
        Prikaži bilješke (Anotacije)
      </label>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={settings.prioritizeInstallationStatus}
          onChange={() => toggle("prioritizeInstallationStatus")}
          style={{ marginRight: 8 }}
        />
        Prioritet boje statusa montaže (ispred Gantt statusa)
      </label>

      <h4 style={styles.subSectionTitle}>Automatska detekcija (OCR)</h4>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={settings.autoDetectLabels}
          onChange={() => toggle("autoDetectLabels")}
          style={{ marginRight: 8 }}
        />
        Automatski detektiraj i poveži oznake pri uploadu
      </label>
      <label style={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={settings.ignoreLegend}
          onChange={() => toggle("ignoreLegend")}
          style={{ marginRight: 8 }}
        />
        Ignoriraj legendu (donji desni kut)
      </label>
    </div>
  );
};

const SidebarTasks = ({ unassignedTasks, assignedTasks, onTaskDragStart, onOpenDetails, onHoverTask }) => {
  const [activeTab, setActiveTab] = useState("unassigned");
  return (
    <div style={styles.sidebarSection}>
      <div style={styles.sidebarTabs}>
        <button
          onClick={() => setActiveTab("unassigned")}
          style={activeTab === "unassigned" ? styles.sidebarTabActive : styles.sidebarTab}
        >
          Nevezane ({unassignedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("assigned")}
          style={activeTab === "assigned" ? styles.sidebarTabActive : styles.sidebarTab}
        >
          Na crtežu ({assignedTasks.length})
        </button>
      </div>

      <div style={styles.taskList}>
        {activeTab === "unassigned" && (
          <>
            {unassignedTasks.length === 0 && (
              <p style={styles.emptyListText}>Sve pozicije su dodijeljene.</p>
            )}
            {unassignedTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => onTaskDragStart(e, task)}
                style={styles.unassignedItem}
                title="Povuci na tlocrt za dodavanje"
              >
                <span style={styles.unassignedName}>{task.name}</span>
                {task.quantity > 1 && (
                  <span style={styles.quantityBadge}>x{task.quantity}</span>
                )}
                <span style={{ fontSize: 11, color: "#5c5c5c" }}>{task.department}</span>
              </div>
            ))}
          </>
        )}

        {activeTab === "assigned" && (
          <>
            {assignedTasks.length === 0 && (
              <p style={styles.emptyListText}>Nema pozicija na ovom crtežu.</p>
            )}
            {assignedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onOpenDetails(task.id)}
                onMouseEnter={() => onHoverTask(task.id)}
                onMouseLeave={() => onHoverTask(null)}
                style={styles.assignedItem}
                title="Klikni za detalje"
              >
                <span style={styles.unassignedName}>{task.name}</span>
                {task.quantity > 1 && (
                  <span style={styles.quantityBadge}>x{task.quantity}</span>
                )}
                <span style={{ fontSize: 11, color: "#5c5c5c" }}>{task.department}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const InstallationSummary = ({ tasks }) => {
  const total = tasks.length;
  if (total === 0) return null;

  const summary = Object.keys(INSTALLATION_PHASES).reduce((acc, key) => {
    acc[key] = tasks.filter((t) => t.floorManagement.installation?.[key]).length;
    return acc;
  }, {});
  const reklamacijeCount = tasks.filter((t) => t.floorManagement.installation?.reklamacija).length;

  return (
    <div style={styles.sidebarSection}>
      <h3 style={styles.sidebarTitle}>
        <Wrench size={16} style={{ marginRight: 8 }} />
        Pregled montaže (ovaj crtež)
      </h3>

      {Object.entries(INSTALLATION_PHASES).map(([key, { label, color }]) => {
        const count = summary[key] || 0;
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} style={{ marginBottom: 12 }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}
            >
              <span>{label}</span>
              <span style={{ fontWeight: 600 }}>
                {count} / {total}
              </span>
            </div>
            <div style={styles.progressBarBackground}>
              <div
                style={{
                  ...styles.progressBarForeground,
                  width: `${percentage}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}

      <div style={{ ...styles.reklamacijaAlert, marginTop: 16 }}>
        <AlertTriangle size={16} color={reklamacijeCount > 0 ? "#dc2626" : "#5c5c5c"} />
        <span style={{ fontWeight: 600 }}>Reklamacije: {reklamacijeCount}</span>
      </div>
    </div>
  );
};

const MarkerComponent = ({
  task,
  settings,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onUpdateTask,
}) => {
  const { location, installation } = task.floorManagement;
  const visualStatus = getMarkerVisualStatus(task, settings);

  const hasDocs = task.details.documents?.length > 0;
  const hasComments = task.details.comments?.length > 0;

  const toggleInstall = (e, key) => {
    e.stopPropagation();
    onUpdateTask(task.id, { [key]: e.target.checked }, "installation");
  };

  return (
    <div
      style={{
        position: "absolute",
        left: `${location.x}%`,
        top: `${location.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: isHovered ? 15 : installation?.reklamacija ? 10 : 5,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        style={{
          ...styles.markerBody,
          width: `${location.w ?? DEFAULT_W}%`,
          height: `${location.h ?? DEFAULT_H}%`,
          backgroundColor: visualStatus.color,
          transform: isHovered ? "scale(1.05)" : "scale(1)",
          boxShadow: isHovered ? styles.shadowLg : installation?.reklamacija ? styles.shadowError : styles.shadowMd,
        }}
        title={`${task.name} - ${visualStatus.name}`}
      >
        {task.name}
        {task.quantity > 1 && <span style={styles.markerQuantity}>x{task.quantity}</span>}
      </div>

      {settings.showIcons && (
        <div style={styles.markerIconsContainer}>
          {installation?.reklamacija && <AlertTriangle size={14} color="#dc2626" title="Reklamacija!" />}
          {hasDocs && <FileText size={14} color="#5c5c5c" title="Dokumenti" />}
          {hasComments && <MessageSquare size={14} color="#5c5c5c" title="Komentari" />}
          {installation?.zavrseno && <CheckCircle size={14} color="#0e7a0d" title="Instalacija završena" />}
        </div>
      )}

      {isHovered && (
        <div style={styles.hoverTooltip}>
          <div style={styles.tooltipHeader}>
            <h4 style={styles.tooltipTitle}>{task.name}</h4>
            <span style={{ ...styles.statusBadgeLg, backgroundColor: visualStatus.color }}>
              {visualStatus.name}
            </span>
          </div>

          {settings.showGanttInfo && (
            <div style={styles.tooltipSection}>
              <h5 style={styles.tooltipSectionTitle}>Gantt podaci</h5>
              <InfoRow label="Odjel:" value={task.department || "N/A"} />
              <InfoRow
                label="Datumi:"
                value={`${task.start || task.startDate || "?"} - ${task.end || task.endDate || "?"}`}
              />
            </div>
          )}

          {settings.showInstallationInfo && (
            <div style={styles.tooltipSection}>
              <h5 style={styles.tooltipSectionTitle}>Montaža (klikni za izmjenu)</h5>
              <div style={styles.tooltipInstallationGrid}>
                {Object.keys(INSTALLATION_PHASES).map((key) => (
                  <label key={key} style={styles.checkboxLabel} onClick={(e) => e.preventDefault()}>
                    <input
                      type="checkbox"
                      checked={!!installation?.[key]}
                      onChange={(e) => toggleInstall(e, key)}
                      style={{ marginRight: 8, pointerEvents: "auto" }}
                    />
                    {INSTALLATION_PHASES[key].label}
                  </label>
                ))}
              </div>
              {installation?.reklamacija && (
                <div style={styles.tooltipComplaint}>
                  <strong>Reklamacija:</strong> {installation.reklamacija}
                </div>
              )}
            </div>
          )}

          <div style={styles.tooltipFooter}>Kliknite za detalje i uređivanje.</div>
        </div>
      )}
    </div>
  );
};

const AnnotationComponent = ({ annotation, onMouseDown }) => {
  const color =
    annotation.status === "warning"
      ? "#ca8a04"
      : annotation.status === "critical"
      ? "#dc2626"
      : "#0969da";

  return (
    <div
      style={{
        position: "absolute",
        left: `${annotation.x}%`,
        top: `${annotation.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 3,
      }}
      onMouseDown={onMouseDown}
      title={annotation.text}
    >
      <div style={{ ...styles.annotationMarker, borderColor: color }}>
        <Pin size={14} color={color} />
        <span style={styles.annotationTextPreview}>
          {annotation.text.substring(0, 50)}
          {annotation.text.length > 50 ? "..." : ""}
        </span>
      </div>
    </div>
  );
};

const DetailsModal = ({ task, onClose, onUpdateTask }) => {
  const [tab, setTab] = useState("installation");
  const { installation } = task.floorManagement;

  const [reklamacijaText, setReklamacijaText] = useState(installation?.reklamacija || "");
  const [descriptionText, setDescriptionText] = useState(task.details.description || "");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");

  const handleStageToggle = (key) => {
    onUpdateTask(task.id, { [key]: !installation?.[key] }, "installation");
  };

  const handleSaveReklamacija = () => {
    onUpdateTask(task.id, { reklamacija: reklamacijaText }, "installation");
    alert("Reklamacija ažurirana.");
  };

  const handleSaveDescription = () => {
    onUpdateTask(task.id, { description: descriptionText }, "details");
    setIsEditingDescription(false);
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const newComment = {
      user: "Trenutni korisnik",
      text: newCommentText.trim(),
      date: new Date().toLocaleString(),
    };
    onUpdateTask(
      task.id,
      { comments: [...task.details.comments, newComment] },
      "details"
    );
    setNewCommentText("");
  };

  const handleUnassign = () => {
    if (
      window.confirm(
        `Želite li ukloniti poziciju "${task.name}" s ovog crteža? Ostat će u podacima, ali će biti označena kao nevezana.`
      )
    ) {
      onUpdateTask(task.id, null, "location");
      onClose();
    }
  };

  const visualStatus = getMarkerVisualStatus(task, { prioritizeInstallationStatus: true });

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalContent}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <h2 style={styles.modalTitle}>{task.name}</h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ ...styles.statusBadgeLg, backgroundColor: visualStatus.color }}>
                {visualStatus.name}
              </span>
              <span style={{ fontSize: 14, color: colors.textSecondary }}>
                ID: {task.id} | Odjel: {task.department}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={styles.modalCloseButton}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => setTab("installation")}
            style={tab === "installation" ? styles.tabActive : styles.tab}
          >
            <Wrench size={16} /> Montaža
          </button>
          <button
            onClick={() => setTab("details")}
            style={tab === "details" ? styles.tabActive : styles.tab}
          >
            <FileText size={16} /> Detalji i opis
          </button>
          <button
            onClick={() => setTab("comments")}
            style={tab === "comments" ? styles.tabActive : styles.tab}
          >
            <MessageSquare size={16} /> Komentari ({task.details.comments.length})
          </button>
        </div>

        {/* Body */}
        <div style={styles.modalBody}>
          {tab === "installation" && (
            <div style={styles.installationGrid}>
              <div>
                <h3 style={styles.sectionTitle}>Faze montaže</h3>
                {Object.entries(INSTALLATION_PHASES).map(([key, { label }]) => (
                  <label key={key} style={styles.checkboxLabelLg}>
                    <input
                      type="checkbox"
                      checked={!!installation?.[key]}
                      onChange={() => handleStageToggle(key)}
                      style={{ marginRight: 12, transform: "scale(1.2)" }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div>
                <h3 style={styles.sectionTitle}>
                  <AlertTriangle size={18} color="#dc2626" style={{ marginRight: 8 }} />
                  Reklamacija / komentar
                </h3>
                <textarea
                  value={reklamacijaText}
                  onChange={(e) => setReklamacijaText(e.target.value)}
                  rows={6}
                  style={styles.textarea}
                  placeholder="Unesite detalje reklamacije ili poseban komentar montaže..."
                />
                <button style={styles.buttonPrimary} onClick={handleSaveReklamacija}>
                  <Save size={16} /> Spremi izmjene
                </button>
              </div>
            </div>
          )}

          {tab === "details" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h3 style={styles.sectionTitle}>Opis pozicije</h3>
                {isEditingDescription ? (
                  <div>
                    <textarea
                      value={descriptionText}
                      onChange={(e) => setDescriptionText(e.target.value)}
                      rows={5}
                      style={styles.textarea}
                    />
                    <button
                      style={{ ...styles.buttonPrimary, marginRight: 8 }}
                      onClick={handleSaveDescription}
                    >
                      Spremi opis
                    </button>
                    <button
                      style={styles.buttonSecondary}
                      onClick={() => setIsEditingDescription(false)}
                    >
                      Odustani
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {task.details.description || "Nema opisa."}
                    </p>
                    <button
                      style={styles.iconButton}
                      onClick={() => setIsEditingDescription(true)}
                    >
                      <Edit3 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <h3 style={styles.sectionTitle}>Gantt podaci</h3>
              <div style={styles.ganttDetailsGrid}>
                <InfoRow label="Količina:" value={task.quantity || 1} bold />
                <InfoRow label="Status (Gantt):" value={task.status} />
                <InfoRow label="Početak:" value={task.startDate || task.start || "N/A"} />
                <InfoRow label="Kraj:" value={task.endDate || task.end || "N/A"} />
              </div>
              <p style={styles.infoText}>Napomena: Datumi i status se ažuriraju u Gantt sustavu.</p>

              <h3 style={{ ...styles.sectionTitle, marginTop: 24 }}>
                Dokumenti ({task.details.documents.length})
              </h3>
              {task.details.documents.map((doc, idx) => (
                <div key={idx} style={styles.documentItem}>
                  <FileText size={14} /> {doc.name}
                </div>
              ))}
              <button style={{ ...styles.buttonSecondary, marginTop: 12 }}>
                Dodaj dokument (TBD)
              </button>
            </div>
          )}

          {tab === "comments" && (
            <div>
              <h3 style={styles.sectionTitle}>Komentari</h3>
              <div style={styles.commentsList}>
                {task.details.comments.length === 0 && (
                  <p style={styles.infoText}>Nema komentara.</p>
                )}
                {task.details.comments.map((c, i) => (
                  <div key={i} style={styles.commentBlock}>
                    <div style={styles.commentHeader}>
                      <strong>{c.user}</strong>
                      <span>{c.date}</span>
                    </div>
                    <p style={styles.commentText}>{c.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  rows={3}
                  style={styles.textarea}
                  placeholder="Unesite novi komentar..."
                />
                <button
                  style={styles.buttonPrimary}
                  onClick={handleAddComment}
                  disabled={!newCommentText.trim()}
                >
                  <Plus size={16} /> Dodaj komentar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.modalFooter}>
          <button onClick={handleUnassign} style={styles.buttonErrorOutline}>
            <Trash2 size={16} /> Ukloni s crteža (odspoji)
          </button>
          <button style={styles.buttonPrimary} onClick={onClose}>
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};

// === UTIL KOMPONENTE ===
function InfoRow({ label, value, bold }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={{ ...styles.infoValue, fontWeight: bold ? "600" : "500" }}>
        {value}
      </span>
    </div>
  );
}

function EmptyStateHint() {
  return (
    <div style={styles.emptyStateContainer}>
      <Layers style={styles.emptyStateIcon} />
      <p style={styles.emptyStateText}>
        Započni učitavanjem Gantt podataka (JSON), zatim dodaj crtež (PDF/Slika) preko
        gumba gore desno.
      </p>
    </div>
  );
}

const ActionButton = ({ onClick, active, icon: Icon, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      ...styles.buttonSecondary,
      backgroundColor: active ? colors.primary : colors.surface,
      color: active ? "#ffffff" : colors.textPrimary,
      borderColor: active ? colors.primary : colors.border,
    }}
  >
    <Icon size={16} /> {label}
  </button>
);

// =====================================================
// STYLES (kasnije izdvojiti u /styles.ts ili Tailwind)
// =====================================================
const styles = {
  appContainer: {
    minHeight: "100vh",
    backgroundColor: colors.background,
    fontFamily: fontStack,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    padding: "12px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 1px 0 rgba(27, 31, 35, 0.04)",
    zIndex: 50,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "24px" },
  headerRight: { display: "flex", alignItems: "center", gap: "12px" },
  logoContainer: {
    width: "36px",
    height: "36px",
    backgroundColor: colors.primary,
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoIcon: { width: "22px", height: "22px", color: "white" },
  title: { fontSize: "18px", fontWeight: "600", margin: 0, color: colors.textPrimary },

  mainContent: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
    height: "calc(100vh - 65px)",
  },
  sidebarLeft: {
    width: "280px",
    backgroundColor: colors.surface,
    borderRight: `1px solid ${colors.border}`,
    overflowY: "auto",
    flexShrink: 0,
  },
  sidebarRight: {
    width: "320px",
    backgroundColor: colors.surface,
    borderLeft: `1px solid ${colors.border}`,
    overflowY: "auto",
    flexShrink: 0,
  },
  floorPlanArea: { flex: 1, display: "flex", flexDirection: "column", padding: "16px", overflow: "hidden" },

  sidebarSection: { padding: "16px", borderBottom: `1px solid ${colors.border}` },
  sidebarTitle: { fontSize: "14px", fontWeight: "600", color: colors.textPrimary, margin: "0 0 12px 0", display: "flex", alignItems: "center" },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  toggleButton: { background: "none", border: "none", cursor: "pointer", padding: "4px", color: colors.textSecondary },
  subSectionTitle: { fontSize: "13px", fontWeight: "600", color: colors.textSecondary, marginTop: "16px", marginBottom: "8px" },

  filterGroup: { marginBottom: "16px" },
  filterLabel: { fontSize: "12px", fontWeight: "500", color: colors.textSecondary, marginBottom: "6px", display: "block" },
  searchInputContainer: { position: "relative" },
  searchIconInput: {
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    color: colors.textSecondary,
  },
  searchInput: {
    width: "100%",
    padding: "8px 12px 8px 32px",
    border: `1px solid ${colors.border}`,
    borderRadius: "6px",
    fontSize: "14px",
    boxSizing: "border-box",
  },
  checkboxLabel: { display: "flex", alignItems: "center", fontSize: "13px", marginBottom: "6px", cursor: "pointer" },
  checkboxLabelLg: { display: "flex", alignItems: "center", fontSize: "14px", marginBottom: "10px", cursor: "pointer" },

  sidebarTabs: { display: "flex", borderBottom: `1px solid ${colors.border}`, marginBottom: 12 },
  sidebarTab: {
    flex: 1,
    padding: "10px",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 500,
    color: colors.textSecondary,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
  },
  sidebarTabActive: {
    flex: 1,
    padding: "10px",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 600,
    color: colors.primary,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    borderBottom: `2px solid ${colors.primary}`,
  },
  taskList: { maxHeight: "50vh", overflowY: "auto" },
  emptyListText: { fontSize: 12, color: colors.textSecondary, textAlign: "center", padding: 10 },
  unassignedItem: {
    padding: "10px",
    border: `1px dashed ${colors.border}`,
    borderRadius: "6px",
    marginBottom: "8px",
    backgroundColor: "#f6f8fa",
    cursor: "grab",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  assignedItem: {
    padding: "10px",
    border: `1px solid ${colors.border}`,
    borderRadius: "6px",
    marginBottom: "8px",
    backgroundColor: colors.surface,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  unassignedName: { fontSize: "13px", fontWeight: "500", color: colors.textPrimary, flex: 1 },
  quantityBadge: { fontSize: "12px", color: colors.textSecondary, fontWeight: 600 },

  progressBarBackground: { height: "8px", backgroundColor: colors.border, borderRadius: "4px", overflow: "hidden" },
  progressBarForeground: { height: "100%", borderRadius: "4px", transition: "width 0.3s ease" },
  reklamacijaAlert: {
    padding: 12,
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },

  floorPlanToolbar: { display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" },
  floorPlanViewer: {
    flex: 1,
    backgroundColor: colors.surface,
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    position: "relative",
    borderRadius: "8px",
    overflow: "auto",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  loadingIndicator: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: colors.primary },

  markerBody: {
    minWidth: "30px",
    minHeight: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 6px",
    color: "#ffffff",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "grab",
    transition: "transform 0.12s ease-out, box-shadow 0.12s ease-out",
    position: "relative",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  shadowMd: "0 2px 8px rgba(0,0,0,0.1)",
  shadowLg: "0 4px 16px rgba(0,0,0,0.2)",
  shadowError: "0 0 12px rgba(220, 38, 38, 0.5), 0 0 0 2px #dc2626",
  markerQuantity: { fontSize: "9px", fontWeight: "500", marginLeft: "4px", opacity: 0.8 },
  markerIconsContainer: { display: "flex", justifyContent: "center", gap: "4px", marginTop: "4px" },

  annotationMarker: {
    display: "flex",
    alignItems: "center",
    padding: "6px 10px",
    backgroundColor: colors.surface,
    border: "1px solid",
    borderRadius: "16px",
    cursor: "grab",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  annotationTextPreview: {
    fontSize: "12px",
    color: colors.textPrimary,
    marginLeft: "8px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "200px",
  },

  hoverTooltip: {
    position: "absolute",
    bottom: "calc(100% + 12px)",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: colors.surface,
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    width: "320px",
    zIndex: 20,
    padding: "16px",
    pointerEvents: "auto",
  },
  tooltipHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  tooltipTitle: { fontSize: "16px", fontWeight: "600", color: colors.textPrimary, margin: 0 },
  tooltipSection: { borderTop: `1px solid ${colors.border}`, paddingTop: "12px", marginTop: "12px" },
  tooltipSectionTitle: { fontSize: "13px", fontWeight: "600", color: colors.textPrimary, marginBottom: "8px" },
  tooltipInstallationGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" },
  tooltipComplaint: {
    marginTop: "8px",
    padding: "8px",
    backgroundColor: "#ffeded",
    color: colors.error,
    borderRadius: "4px",
    fontSize: "12px",
  },
  tooltipFooter: {
    marginTop: "12px",
    fontSize: "11px",
    color: colors.textSecondary,
    textAlign: "center",
    borderTop: `1px solid ${colors.border}`,
    paddingTop: "8px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: "12px",
    width: "90%",
    maxWidth: 900,
    maxHeight: "90vh",
    overflow: "hidden",
    boxShadow: "0 12px 48px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
  },
  modalHeader: {
    padding: "20px 24px",
    borderBottom: `1px solid ${colors.border}`,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    backgroundColor: colors.surface,
    zIndex: 1,
  },
  modalTitle: { fontSize: "20px", fontWeight: "600", color: colors.textPrimary, margin: "0 0 8px 0" },
  modalCloseButton: {
    padding: "8px",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    borderRadius: "6px",
    color: colors.textSecondary,
  },
  modalBody: { padding: "24px", flex: 1, overflowY: "auto" },
  modalFooter: {
    padding: "16px 24px",
    borderTop: `1px solid ${colors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "sticky",
    bottom: 0,
    backgroundColor: colors.surface,
  },

  tabsContainer: { display: "flex", borderBottom: `1px solid ${colors.border}`, padding: "0 24px" },
  tab: {
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: colors.textSecondary,
    borderBottom: "2px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  tabActive: {
    padding: "12px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: colors.textPrimary,
    borderBottom: `2px solid ${colors.primary}`,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  sectionTitle: { fontSize: "16px", fontWeight: "600", color: colors.textPrimary, marginBottom: "16px", display: "flex", alignItems: "center" },
  installationGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
  textarea: {
    width: "100%",
    padding: "12px",
    border: `1px solid ${colors.border}`,
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: fontStack,
    boxSizing: "border-box",
    resize: "vertical",
    marginBottom: "12px",
  },
  ganttDetailsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${colors.border}` },
  infoLabel: { fontSize: "13px", color: colors.textSecondary },
  infoValue: { fontSize: "13px", color: colors.textPrimary },
  infoText: { fontSize: "12px", color: colors.textSecondary, marginTop: 12 },
  documentItem: { fontSize: "13px", padding: "4px 0", display: "flex", alignItems: "center", gap: "8px" },

  commentsList: { maxHeight: "300px", overflowY: "auto", marginBottom: 16 },
  commentBlock: { marginBottom: 12, padding: 12, background: colors.background, borderRadius: 6 },
  commentHeader: { display: "flex", justifyContent: "space-between", fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  commentText: { fontSize: 14, margin: 0 },

  buttonPrimary: {
    padding: "8px 16px",
    backgroundColor: colors.primary,
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  buttonSecondary: {
    padding: "8px 16px",
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  buttonErrorOutline: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    color: colors.error,
    border: `1px solid ${colors.error}`,
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  iconButton: {
    padding: "6px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    color: colors.textSecondary,
  },

  statusBadgeLg: {
    fontSize: "13px",
    fontWeight: "600",
    padding: "4px 12px",
    borderRadius: "16px",
    color: "#ffffff",
    textTransform: "uppercase",
  },

  emptyStateContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
    maxWidth: "450px",
  },
  emptyStateIcon: { width: "64px", height: "64px", color: "#d1d5db", marginBottom: "16px" },
  emptyStateText: { color: colors.textSecondary, fontSize: "14px", lineHeight: "1.5" },

  floorSwitcherContainer: { position: "relative" },
  floorSwitcherButton: {
    padding: "8px 16px",
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    minWidth: "200px",
    justifyContent: "space-between",
  },
  floorSwitcherDropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    width: "300px",
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    zIndex: 100,
    padding: "8px 0",
  },
  floorSwitcherItemWrapper: {
    display: "flex",
    alignItems: "center",
    padding: "0 8px",
    cursor: "pointer",
  },
  floorSwitcherItem: { padding: "8px 12px", fontSize: "14px", flex: 1, borderRadius: "4px" },
  floorSwitcherActionButton: {
    marginLeft: "4px",
    padding: "6px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: colors.textSecondary,
    opacity: 0.5,
  },
  floorSwitcherAddButton: {
    width: "calc(100% - 16px)",
    margin: "8px 8px 0 8px",
    padding: "8px 12px",
    backgroundColor: "#f6f8fa",
    border: `1px dashed ${colors.border}`,
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    color: colors.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
};

// === Keyframes spinner helper (sigurno umetanje) ===
function ensureSpinnerKeyframes() {
  if (typeof document === "undefined") return;
  const id = "__inline_spin_keyframes__";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
@keyframes spin { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}`;
  document.head.appendChild(style);
}
