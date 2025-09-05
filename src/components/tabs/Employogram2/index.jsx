import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "../../../store/useProjectStore";
import { useUserStore } from '../../../store/useUserStore';
import ProjectDataService from "../../../store/ProjectDataService.js";
import TaskHoverCardRedesign from "../hoverTab2.jsx";
import {
  Users, Layers, CalendarDays, ChevronDown, ChevronLeft, ChevronRight,
  Grid3X3 as Grid3x3, Group, Columns3, AlertTriangle, Search,
  Zap, Brain, Activity, Focus, Sparkles, Play, Pause, 
  Calendar, ZoomIn, ZoomOut, Settings, Link2, Unlink, Plus,
  Save, Upload, Download, Filter, Maximize2, Eye, EyeOff,
  Clock, Bell, Flame, Target, Edit3, Trash2, FileText,
  MessageSquare, Paperclip, MoreHorizontal, X, List,
  BarChart3, Calendar as TimelineIcon, GitBranch, Shuffle
} from "lucide-react";

// Gantt Chart Constants
const DAY_WIDTH = 30; // pixels per day
const ROW_HEIGHT = 50; // height of each employee row
const TIMELINE_HEIGHT = 80; // height of timeline header
const DAY_MS = 24 * 3600 * 1000;

// View modes
const VIEW_MODES = {
  MATRIX: 'matrix',
  GANTT: 'gantt', 
  HYBRID: 'hybrid'
};

// Task status definitions
const TASK_STATUSES = {
  'pending': { bg: '#64748b', light: '#f1f5f9', border: '#cbd5e1', text: 'Čeka' },
  'in_progress': { bg: '#0ea5e9', light: '#e0f2fe', border: '#7dd3fc', text: 'U tijeku' },
  'completed': { bg: '#10b981', light: '#d1fae5', border: '#6ee7b7', text: 'Završeno' },
  'overdue': { bg: '#ef4444', light: '#fee2e2', border: '#fca5a5', text: 'Kasni' },
  'blocked': { bg: '#f59e0b', light: '#fed7aa', border: '#fdba74', text: 'Blokirano' }
};

// Priority levels
const PRIORITY_LEVELS = {
  'low': { bg: '#64748b', light: '#f1f5f9', text: 'Niska', glow: 'transparent', icon: Clock },
  'medium': { bg: '#3b82f6', light: '#dbeafe', text: 'Srednja', glow: '#3b82f6', icon: Bell },
  'high': { bg: '#f59e0b', light: '#fed7aa', text: 'Visoka', glow: '#f59e0b', icon: Zap },
  'critical': { bg: '#ef4444', light: '#fee2e2', text: 'Kritična', glow: '#ef4444', icon: Flame }
};

// Dependency types
const DEPENDENCY_TYPES = {
  FINISH_TO_START: 'fs',
  START_TO_START: 'ss',
  FINISH_TO_FINISH: 'ff',
  START_TO_FINISH: 'sf'
};

// Utility functions for date calculations
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  return new Date(dateStr);
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const daysBetween = (start, end) => {
  if (!start || !end) return 0;
  return Math.ceil((new Date(end) - new Date(start)) / DAY_MS);
};

const getWeekDays = (startDate, numDays = 30) => {
  const days = [];
  for (let i = 0; i < numDays; i++) {
    days.push(addDays(startDate, i));
  }
  return days;
};

// Kinetic Context Framework - Animation variants
const variants = {
  container: {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.5, 
        staggerChildren: 0.05,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3, ease: "easeIn" }
    }
  },
  item: {
    initial: { opacity: 0, y: 10 },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: { 
      opacity: 0, 
      y: -10,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  },
  cell: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.2, ease: "easeOut" }
    },
    hover: {
      scale: 1.02,
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
      transition: { duration: 0.2, ease: "easeInOut" }
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  },
  pill: {
    initial: { scale: 0, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.5
      }
    },
    hover: {
      scale: 1.05,
      y: -2,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      transition: { 
        type: "spring",
        stiffness: 400,
        damping: 25
      }
    },
    tap: {
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  },
  ganttBar: {
    initial: { scaleX: 0, opacity: 0 },
    animate: { 
      scaleX: 1, 
      opacity: 1,
      transition: { 
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    hover: {
      scaleY: 1.1,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      transition: { duration: 0.2 }
    },
    drag: {
      scale: 1.05,
      zIndex: 10,
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)"
    }
  },
  timeline: {
    initial: { opacity: 0, x: -20 },
    animate: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  },
  dependencyLine: {
    initial: { pathLength: 0, opacity: 0 },
    animate: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.2, ease: "easeInOut" }
    }
  }
};

const MATRIX_COL_W = 240; // Matrix column width

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function toDate(d){ return d ? new Date(d) : null; }
function overlaps(aStart, aEnd, bStart, bEnd){
  if(!aStart || !aEnd || !bStart || !bEnd) return false;
  return toDate(aStart) <= toDate(bEnd) && toDate(bStart) <= toDate(aEnd);
}

function pillGradient(c1, c2, opacity = 1){
  return `linear-gradient(135deg, ${c1}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, ${c2}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 100%)`;
}

// Enhanced glow effect for focus mode
function pillGlowGradient(c1, c2){
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 100%), 
          radial-gradient(circle at center, ${c1}40 0%, transparent 70%)`;
}

// Timeline Header Component
const TimelineHeader = ({ startDate, viewDays, dayWidth, onDateChange, onZoom }) => {
  const days = getWeekDays(startDate, viewDays);
  
  return (
    <motion.div 
      className="timeline-header bg-white/90 backdrop-blur-xl border-b sticky top-0 z-20"
      variants={variants.timeline}
    >
      {/* Date Navigation */}
      <div className="h-12 px-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => onDateChange(addDays(startDate, -7))}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          
          <span className="text-sm font-medium min-w-[200px] text-center">
            {startDate?.toLocaleDateString('hr-HR', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
          
          <motion.button
            onClick={() => onDateChange(addDays(startDate, 7))}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => onZoom(-0.2)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            whileHover={{ scale: 1.1 }}
          >
            <ZoomOut className="w-4 h-4" />
          </motion.button>
          
          <motion.button
            onClick={() => onZoom(0.2)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            whileHover={{ scale: 1.1 }}
          >
            <ZoomIn className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
      
      {/* Days Grid */}
      <div className="h-16 flex overflow-x-auto" style={{ width: `${viewDays * dayWidth}px` }}>
        {days.map((day, index) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          
          return (
            <motion.div
              key={day.toISOString()}
              className={`border-r border-gray-200/50 flex flex-col items-center justify-center text-xs relative ${
                isToday ? 'bg-blue-50 text-blue-600 font-medium' : 
                isWeekend ? 'bg-gray-50 text-gray-400' : 'text-gray-600'
              }`}
              style={{ width: `${dayWidth}px`, minWidth: `${dayWidth}px` }}
              variants={variants.item}
              custom={index}
              whileHover={{ backgroundColor: isToday ? '#dbeafe' : '#f8fafc' }}
            >
              <div className="font-medium">
                {day.getDate()}
              </div>
              <div className="text-[10px] opacity-70">
                {day.toLocaleDateString('hr-HR', { weekday: 'short' })}
              </div>
              
              {isToday && (
                <motion.div
                  className="absolute bottom-0 left-1/2 w-1 h-1 bg-blue-500 rounded-full"
                  style={{ transform: 'translateX(-50%)' }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// Gantt Task Bar Component
const GanttTaskBar = ({ task, employee, dayWidth, startDate, onTaskUpdate, onTaskSelect, isSelected }) => {
  const taskStart = parseDate(task.start);
  const taskEnd = parseDate(task.end);
  
  if (!taskStart || !taskEnd) return null;
  
  const startOffset = Math.max(0, daysBetween(startDate, taskStart));
  const duration = Math.max(1, daysBetween(taskStart, taskEnd));
  const width = duration * dayWidth;
  const left = startOffset * dayWidth;
  
  const status = TASK_STATUSES[task.status] || TASK_STATUSES.pending;
  const priority = PRIORITY_LEVELS[task.priority] || PRIORITY_LEVELS.low;
  
  return (
    <motion.div
      className={`absolute rounded-lg border-2 cursor-pointer group ${
        isSelected ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
      }`}
      style={{
        left: `${left}px`,
        width: `${Math.max(60, width)}px`,
        height: '32px',
        top: '9px',
        backgroundColor: status.light,
        borderColor: status.border,
        boxShadow: priority.glow !== 'transparent' ? `0 0 8px ${priority.glow}40` : undefined
      }}
      variants={variants.ganttBar}
      initial="initial"
      animate="animate"
      whileHover="hover"
      drag="x"
      dragConstraints={{ left: -left, right: 1000 }}
      dragElastic={0.1}
      onDragEnd={(event, info) => {
        const daysMoved = Math.round(info.offset.x / dayWidth);
        if (daysMoved !== 0) {
          const newStart = addDays(taskStart, daysMoved);
          const newEnd = addDays(taskEnd, daysMoved);
          onTaskUpdate(task.id, {
            start: formatDate(newStart),
            end: formatDate(newEnd)
          });
        }
      }}
      onClick={() => onTaskSelect(task)}
    >
      {/* Task Content */}
      <div className="h-full flex items-center px-2 relative overflow-hidden">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {priority.icon && (
            <priority.icon className="w-3 h-3 flex-shrink-0" style={{ color: priority.bg }} />
          )}
          
          <span className="text-xs font-medium truncate" style={{ color: status.bg }}>
            {task.title}
          </span>
        </div>
        
        {/* Progress Bar */}
        {task.progress > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 rounded-bl-lg"
            style={{ 
              backgroundColor: status.bg,
              width: `${(task.progress / 100) * 100}%`
            }}
            initial={{ width: 0 }}
            animate={{ width: `${(task.progress / 100) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
        
        {/* Resize Handles */}
        <div className="absolute left-0 top-0 w-1 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-gray-400 transition-opacity" />
        <div className="absolute right-0 top-0 w-1 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 bg-gray-400 transition-opacity" />
      </div>
    </motion.div>
  );
};

// View Mode Toggle Component
const ViewModeToggle = ({ currentMode, onModeChange }) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      {Object.entries(VIEW_MODES).map(([key, mode]) => {
        const isActive = currentMode === mode;
        const icons = {
          MATRIX: Grid3x3,
          GANTT: BarChart3,
          HYBRID: TimelineIcon
        };
        const Icon = icons[key];
        
        return (
          <motion.button
            key={mode}
            onClick={() => onModeChange(mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-all ${
              isActive 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-3.5 h-3.5" />
            {key.charAt(0) + key.slice(1).toLowerCase()}
          </motion.button>
        );
      })}
    </div>
  );
};

// Normaliziraj task iz canonical v5 (ProjectDataService) u matricu stupaca
function normalizeTasks(project){
  const tasks = [];
  if(!project) return tasks;
  for(const position of (project.positions||[])){
    for(const proc of (position.processes||[])){
      const id = `${project.id}-${position.id}-${proc.name}`;
      tasks.push({
        id,
        key: id,
        title: proc.name,
        positionId: position.id,
        positionTitle: position.title,
        projectId: project.id,
        projectName: project.name,
        processName: proc.name,
        ownerName: proc?.owner?.name || "",
        start: proc.plannedStart || proc.actualStart || null,
        end: proc.plannedEnd || proc.actualEnd || null,
        status: (proc.status||"pending").toLowerCase(),
        progress: proc.progress ?? 0,
        notes: proc.notes || "",
        priority: proc.priority || 'medium'
      });
    }
  }
  return tasks;
}

export default function Employogram2(){
  const { project } = useProjectStore();
  const { users } = useUserStore();
  const [service] = useState(() => new ProjectDataService());
  const [all, setAll] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [search, setSearch] = useState("");
  const [groupMode, setGroupMode] = useState("project-process-position");
  
  // Kinetic Context Framework state
  const [focusMode, setFocusMode] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null);
  const [aiActivity, setAiActivity] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [hoveredEmployee, setHoveredEmployee] = useState(null);
  
  // Gantt Chart state
  const [viewMode, setViewMode] = useState(VIEW_MODES.HYBRID);
  const [timelineStart, setTimelineStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 7); // Start a week ago
    return today;
  });
  const [viewDays, setViewDays] = useState(30);
  const [dayWidth, setDayWidth] = useState(DAY_WIDTH);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [taskDependencies, setTaskDependencies] = useState(new Map());
  const [draggedTask, setDraggedTask] = useState(null);
  
  // Task management state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  
  const scrollRef = useRef(null);
  const searchRef = useRef(null);

  // Dynamic Focus System
  const activateFocusMode = useCallback((cellKey, element) => {
    setFocusMode(true);
    setFocusedCell(cellKey);
    
    // Trigger background highlight
    window.dispatchEvent(new CustomEvent('bg:highlight', {
      detail: {
        selector: element ? null : '[data-cell-focus]',
        x: element?.getBoundingClientRect().left + element?.getBoundingClientRect().width / 2,
        y: element?.getBoundingClientRect().top + element?.getBoundingClientRect().height / 2,
        durationMs: 2500,
        radius: 300
      }
    }));
  }, []);

  const deactivateFocusMode = useCallback(() => {
    setFocusMode(false);
    setFocusedCell(null);
  }, []);

  // Enhanced search with AI activity
  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    if (value.trim() && !searchActive) {
      setSearchActive(true);
      setAiActivity(true);
      setTimeout(() => {
        setAiActivity(false);
      }, 800);
    } else if (!value.trim() && searchActive) {
      setSearchActive(false);
    }
  }, [searchActive]);
  
  // Timeline management
  const handleDateChange = useCallback((newDate) => {
    setTimelineStart(newDate);
  }, []);
  
  const handleZoom = useCallback((delta) => {
    setDayWidth(prev => Math.max(15, Math.min(60, prev + delta * 10)));
  }, []);
  
  // Task management
  const handleTaskUpdate = useCallback((taskId, updates) => {
    console.log('Updating task:', taskId, updates);
    // This would normally update the backend/state
  }, []);
  
  const handleTaskSelect = useCallback((task) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(task.id)) {
        newSet.delete(task.id);
      } else {
        newSet.add(task.id);
      }
      return newSet;
    });
  }, []);
  
  const handleCreateTask = useCallback((employeeId, projectId, processId, positionId) => {
    setEditingTask({
      id: null, // New task
      employeeId,
      projectId,
      processId,
      positionId,
      title: '',
      start: formatDate(new Date()),
      end: formatDate(addDays(new Date(), 1)),
      status: 'pending',
      priority: 'medium',
      progress: 0
    });
    setShowTaskModal(true);
  }, []);

  // učitaj podatke
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAiActivity(true);
        
        let jsonData = null;
        try {
          const response = await fetch('/project_from_troskovnik_planning.json');
          if (response.ok) {
            jsonData = await response.json();
            console.log('Loaded real project data from JSON:', jsonData);
          }
        } catch (err) {
          console.log('Could not load JSON file, using service data');
        }

        if (jsonData && jsonData.projects && jsonData.projects.length > 0) {
          setAll(jsonData);
          setActiveProjectId(jsonData.projects[0]?.id || null);
        } else {
          const data = await service.loadAllProjects();
          if(!mounted) return;
          if(!data || !Array.isArray(data.projects) || data.projects.length===0){
            const init = {
              version: "5.0",
              exportDate: new Date().toISOString(),
              meta: { schemaName: "project.unified", schemaVersion: "5.0.0" },
              projects: [{
                id: project.id,
                name: project.name || "Trenutni projekt",
                positions: project.positions || [],
                materials: project.materials || [],
                tasks: project.tasks || [],
                documents: project.documents || [],
              }],
              activeProjectId: project.id,
            };
            await service.storage.importFull(init);
            setAll(init);
            setActiveProjectId(init.activeProjectId);
          } else {
            setAll(data);
            setActiveProjectId(data.activeProjectId || data.projects[0]?.id || null);
          }
        }
        
        setTimeout(() => setAiActivity(false), 1200);
      } catch(e){
        console.error('Error loading project data:', e);
        setAiActivity(false);
      }
    })();
    return () => { mounted=false; };
  }, [service, project]);

  const activeProject = useMemo(() => {
    if(!all) return null;
    return all.projects.find(p => p.id === (activeProjectId || all.activeProjectId)) || all.projects[0] || null;
  }, [all, activeProjectId]);

  // Enhanced employees with better color management
  const employees = useMemo(() => {
    const list = (users||[]).map((u, index) => {
      const colorPairs = [
        { colorA: "#ddd6fe", colorB: "#8b5cf6" }, // Purple
        { colorA: "#bfdbfe", colorB: "#3b82f6" }, // Blue
        { colorA: "#bbf7d0", colorB: "#10b981" }, // Green
        { colorA: "#fed7aa", colorB: "#f97316" }, // Orange
        { colorA: "#fce7f3", colorB: "#ec4899" }, // Pink
        { colorA: "#fef3c7", colorB: "#f59e0b" }, // Amber
        { colorA: "#e0e7ff", colorB: "#6366f1" }, // Indigo
        { colorA: "#d1fae5", colorB: "#059669" }, // Emerald
      ];
      const colors = colorPairs[index % colorPairs.length];
      
      return {
        id: u.id || u.email || u.name,
        name: u.name || u.email || "User",
        role: u.role || "",
        colorA: u.colorA || colors.colorA,
        colorB: u.colorB || colors.colorB,
        capacityH: u.capacityH || 8,
      };
    });
    
    if(list.length===0){
      list.push({ 
        id: "emp-1", 
        name: "Bez imena", 
        role: "", 
        colorA: "#fef3c7", 
        colorB: "#f59e0b", 
        capacityH: 8 
      });
    }
    return list;
  }, [users]);

  const columns = useMemo(() => {
    const tasks = normalizeTasks(activeProject);
    const q = search.trim().toLowerCase();
    const filtered = q ? tasks.filter(t =>
      `${t.title} ${t.positionTitle} ${t.projectName} ${t.processName}`.toLowerCase().includes(q)
    ) : tasks;

    // Enhanced tree structure
    const tree = [];
    const byProj = new Map();
    for(const t of filtered){
      if(!byProj.has(t.projectId)) byProj.set(t.projectId, { id: t.projectId, name: t.projectName, groups: new Map() });
      const proj = byProj.get(t.projectId);
      const keyProc = t.processName;
      if(!proj.groups.has(keyProc)) proj.groups.set(keyProc, { id: keyProc, name: keyProc, groups: new Map() });
      const proc = proj.groups.get(keyProc);
      const keyPos = t.positionId;
      if(!proc.groups.has(keyPos)) proc.groups.set(keyPos, { id: keyPos, name: t.positionTitle, tasks: [] });
      proc.groups.get(keyPos).tasks.push(t);
    }
    for(const proj of byProj.values()){
      const procs = [];
      for(const proc of proj.groups.values()){
        const poss = [];
        for(const pos of proc.groups.values()){
          poss.push(pos);
        }
        procs.push({ ...proc, positions: poss });
      }
      tree.push({ ...proj, processes: procs });
    }
    return { tasks, tree };
  }, [activeProject, search]);

  const employeeByName = useMemo(() => {
    const map = new Map();
    for(const e of employees){ map.set(e.name, e); }
    return map;
  }, [employees]);

  const allocations = useMemo(() => {
    const map = new Map();
    for(const t of columns.tasks){
      const emp = t.ownerName && employeeByName.get(t.ownerName);
      if(emp){ map.set(`${t.id}::${emp.id}`, true); }
    }
    return map;
  }, [columns.tasks, employeeByName]);

  // Enhanced conflict detection with severity levels
  const conflictByEmp = useMemo(() => {
    const m = new Map();
    for(const e of employees){ m.set(e.id, { count: 0, severity: 'none' }); }
    const tasksByEmp = new Map();
    for(const t of columns.tasks){
      const emp = t.ownerName && employeeByName.get(t.ownerName);
      if(!emp) continue;
      if(!tasksByEmp.has(emp.id)) tasksByEmp.set(emp.id, []);
      tasksByEmp.get(emp.id).push(t);
    }
    for(const [empId, list] of tasksByEmp){
      let conflicts = 0;
      for(let i=0;i<list.length;i++){
        for(let j=i+1;j<list.length;j++){
          if(overlaps(list[i].start, list[i].end, list[j].start, list[j].end)) conflicts++;
        }
      }
      const severity = conflicts === 0 ? 'none' : conflicts <= 2 ? 'low' : conflicts <= 5 ? 'medium' : 'high';
      m.set(empId, { count: conflicts, severity });
    }
    return m;
  }, [columns.tasks, employees, employeeByName]);

  // Enhanced hover functionality
  const [hoverTask, setHoverTask] = useState(null);
  const [hoverXY, setHoverXY] = useState({x:0,y:0});

  const openHover = useCallback((e, task) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    const x = (e?.clientX||0) - (rect?.left||0) + 16;
    const y = (e?.clientY||0) - (rect?.top||0) + 16;
    
    const position = activeProject?.positions?.find(pos => pos.id === task.positionId);
    
    setHoverTask({
      ...task,
      realPosition: position
    });
    setHoverXY({x,y});
    
    // Activate focus mode for hovered task
    activateFocusMode(task.id, e.target);
  }, [activeProject, activateFocusMode]);

  const closeHover = useCallback(() => { 
    setHoverTask(null); 
    setTimeout(deactivateFocusMode, 300);
  }, [deactivateFocusMode]);

  // Get conflict severity style
  const getConflictStyle = (severity) => {
    switch(severity) {
      case 'low': return { color: '#f59e0b', bg: '#fef3c7' };
      case 'medium': return { color: '#ef4444', bg: '#fee2e2' };
      case 'high': return { color: '#dc2626', bg: '#fecaca' };
      default: return { color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  return (
    <motion.div 
      className="h-full flex flex-col overflow-hidden relative"
      variants={variants.container}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* Ambient Background Effects */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${
          aiActivity ? 'bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-100' : 'opacity-0'
        }`}
        style={{
          background: aiActivity 
            ? `radial-gradient(circle at 25% 75%, #8b5cf610 0%, transparent 50%), 
               radial-gradient(circle at 75% 25%, #3b82f608 0%, transparent 50%)`
            : 'none'
        }}
      />

      {/* Enhanced Toolbar */}
      <motion.div 
        className="flex items-center gap-3 p-4 border-b bg-white/80 backdrop-blur-xl relative z-10"
        variants={variants.item}
      >
        <div className="flex items-center gap-2">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Layers className="w-5 h-5" />
            {aiActivity && (
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          <motion.select
            value={activeProjectId || ""}
            onChange={(e)=>setActiveProjectId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200/50 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {all?.projects?.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </motion.select>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            <Search className="w-4 h-4" />
            {searchActive && (
              <motion.div
                className="absolute -inset-1 bg-purple-500/20 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </motion.div>
          
          <motion.input
            ref={searchRef}
            value={search}
            onChange={e=>handleSearchChange(e.target.value)}
            placeholder="Pretraži zadatke, pozicije, procese..."
            className={`px-4 py-2 text-sm border rounded-xl w-80 transition-all duration-300 ${
              searchActive 
                ? 'border-purple-300 bg-purple-50/50 backdrop-blur-sm focus:ring-2 focus:ring-purple-500/20' 
                : 'border-gray-200/50 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20'
            }`}
            whileFocus={{ scale: 1.02 }}
          />
        </div>
        
        <div className="ml-auto flex items-center gap-4">
          {/* View Mode Toggle */}
          <ViewModeToggle 
            currentMode={viewMode} 
            onModeChange={setViewMode} 
          />
          
          <div className="w-px h-6 bg-gray-300" />
          
          <motion.div 
            className="flex items-center gap-2 text-sm"
            variants={variants.item}
          >
            <Users className="w-4 h-4 text-slate-600" />
            <span className="text-slate-600">Zaposlenika: {employees.length}</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-2 text-sm"
            variants={variants.item}
          >
            <CalendarDays className="w-4 h-4 text-slate-600" />
            <span className="text-slate-600">Zadataka: {columns.tasks.length}</span>
            {aiActivity && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Activity className="w-4 h-4 text-purple-500" />
              </motion.div>
            )}
          </motion.div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowDocuments(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FileText className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              onClick={() => handleCreateTask(null, null, null, null)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Zadatak</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Timeline Header (only in Gantt and Hybrid modes) */}
      {(viewMode === VIEW_MODES.GANTT || viewMode === VIEW_MODES.HYBRID) && (
        <TimelineHeader
          startDate={timelineStart}
          viewDays={viewDays}
          dayWidth={dayWidth}
          onDateChange={handleDateChange}
          onZoom={handleZoom}
        />
      )}
      
      {/* Enhanced Grid */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Enhanced Employee Sidebar (only in Matrix and Hybrid modes) */}
        {(viewMode === VIEW_MODES.MATRIX || viewMode === VIEW_MODES.HYBRID) && (
          <motion.div 
            className="shrink-0 w-72 border-r bg-slate-50/60 backdrop-blur-sm"
            variants={variants.item}
          >
            <div className="h-12 border-b flex items-center px-4 text-sm font-medium text-slate-700 bg-white/60">
              <Users className="w-4 h-4 mr-2" />
              Zaposlenici
            </div>
            
            <div className="overflow-auto" style={{maxHeight: "calc(100% - 48px)"}}>
              <AnimatePresence>
                {employees.map((emp, index) => {
                  const conflict = conflictByEmp.get(emp.id);
                  const conflictStyle = getConflictStyle(conflict.severity);
                  
                  return (
                    <motion.div 
                      key={emp.id}
                      className={`h-12 flex items-center px-4 border-b justify-between cursor-pointer transition-all duration-200 ${
                        hoveredEmployee === emp.id ? 'bg-white/80 shadow-sm' : 'hover:bg-white/60'
                      } ${focusMode && focusedCell && !focusedCell.includes(emp.id) ? 'opacity-40 blur-[1px]' : ''}`}
                      style={{ height: `${ROW_HEIGHT}px` }}
                      variants={variants.item}
                      custom={index}
                      whileHover={{ 
                        x: 4,
                        transition: { type: "spring", stiffness: 400, damping: 25 }
                      }}
                      onMouseEnter={() => setHoveredEmployee(emp.id)}
                      onMouseLeave={() => setHoveredEmployee(null)}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div 
                          className="w-3 h-8 rounded-full shadow-sm"
                          style={{background: pillGradient(emp.colorA, emp.colorB)}}
                          whileHover={{ 
                            scale: 1.1,
                            boxShadow: `0 4px 12px ${emp.colorB}40`
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-800 truncate">{emp.name}</div>
                          {emp.role && (
                            <div className="text-xs text-slate-500 truncate">{emp.role}</div>
                          )}
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {conflict.count > 0 && (
                          <motion.div 
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                            style={{ color: conflictStyle.color, backgroundColor: conflictStyle.bg }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <AlertTriangle className="w-3 h-3" /> 
                            {conflict.count}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Enhanced Task Matrix/Gantt Area */}
        <motion.div 
          ref={scrollRef} 
          className="flex-1 overflow-auto relative"
          variants={variants.item}
        >
          {viewMode === VIEW_MODES.MATRIX ? (
            /* Matrix View - Original Employogram */
            <>
              {/* Enhanced Column Headers */}
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b shadow-sm">
                <div className="min-w-max flex">
                  {columns.tree.map((proj, projIndex) => (
                    <motion.div 
                      key={proj.id} 
                      className="border-r"
                      variants={variants.item}
                      custom={projIndex}
                    >
                      <div className="h-12 px-4 flex items-center text-sm font-semibold text-slate-800 bg-slate-50/80 backdrop-blur-sm border-b">
                        <Layers className="w-4 h-4 mr-2" />
                        {proj.name}
                      </div>
                      
                      <div className="flex">
                        {proj.processes.map((proc, procIndex) => (
                          <motion.div 
                            key={proc.id} 
                            className="border-r"
                            variants={variants.item}
                            custom={procIndex}
                          >
                            <div className="h-10 px-3 flex items-center text-xs font-medium text-slate-700 bg-slate-50/60 backdrop-blur-sm border-b">
                              <Group className="w-3 h-3 mr-2" />
                              {proc.name}
                            </div>
                            
                            <div className="flex">
                              {proc.positions.map((pos, posIndex) => (
                                <motion.div 
                                  key={pos.id} 
                                  className="border-r bg-white/40 backdrop-blur-sm" 
                                  style={{width: MATRIX_COL_W}}
                                  variants={variants.item}
                                  custom={posIndex}
                                  whileHover={{
                                    backgroundColor: "rgba(255,255,255,0.8)",
                                    transition: { duration: 0.2 }
                                  }}
                                >
                                  <div className="h-10 px-3 flex items-center text-xs text-slate-600 border-b truncate" title={pos.name}>
                                    <Columns3 className="w-3 h-3 mr-2" />
                                    {pos.name}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Enhanced Matrix Body */}
              <div className="min-w-max">
                {employees.map((emp, empIndex) => (
                  <motion.div 
                    key={emp.id} 
                    className="flex"
                    style={{ height: `${ROW_HEIGHT}px` }}
                    variants={variants.item}
                    custom={empIndex}
                  >
                    {columns.tree.map(proj => (
                      <React.Fragment key={proj.id}>
                        {proj.processes.map(proc => (
                          <React.Fragment key={proc.id}>
                            {proc.positions.map(pos => {
                              const cellKey = `${emp.id}-${pos.id}`;
                              const cellTasks = pos.tasks.filter(t => (t.ownerName && employeeByName.get(t.ownerName)?.id === emp.id));
                              const isActive = cellTasks.length > 0;
                              const isFocused = focusedCell === cellKey;
                              
                              return (
                                <motion.div 
                                  key={pos.id} 
                                  className={`border-r transition-all duration-300 ${
                                    focusMode && !isFocused ? 'opacity-30 blur-[1px]' : ''
                                  }`}
                                  style={{width: MATRIX_COL_W}}
                                  variants={variants.cell}
                                  data-cell-focus={isFocused}
                                  whileHover={cellTasks.length > 0 ? "hover" : undefined}
                                >
                                  <div 
                                    className={`h-12 border-b px-3 flex items-center gap-2 ${
                                      isActive ? 'bg-gradient-to-r from-transparent to-white/60' : ''
                                    }`}
                                  >
                                    <AnimatePresence>
                                      {cellTasks.map((t, taskIndex) => (
                                        <motion.button
                                          key={t.id}
                                          onMouseEnter={(e)=>openHover(e, t)}
                                          onMouseLeave={closeHover}
                                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-800 shadow-sm border border-white/50 hover:border-white/80 transition-all duration-200 backdrop-blur-sm"
                                          style={{ 
                                            background: pillGradient(emp.colorA, emp.colorB, 0.9),
                                            boxShadow: isFocused ? `0 0 20px ${emp.colorB}40` : undefined
                                          }}
                                          title={`${t.title} • ${t.positionTitle}`}
                                          variants={variants.pill}
                                          custom={taskIndex}
                                          initial="initial"
                                          animate="animate"
                                          exit="exit"
                                          whileHover="hover"
                                          whileTap="tap"
                                        >
                                          <span className="truncate max-w-[140px] block">
                                            {t.title}
                                          </span>
                                          
                                          {/* Progress indicator */}
                                          {t.progress > 0 && (
                                            <motion.div 
                                              className="w-1 h-1 rounded-full bg-current ml-1 opacity-60"
                                              style={{ 
                                                width: `${Math.max(4, t.progress * 16)}px`
                                              }}
                                            />
                                          )}
                                        </motion.button>
                                      ))}
                                    </AnimatePresence>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            /* Gantt/Hybrid View */
            <div className="relative">
              {/* Employee rows with Gantt bars */}
              {employees.map((emp, empIndex) => {
                const empTasks = columns.tasks.filter(t => t.ownerName && employeeByName.get(t.ownerName)?.id === emp.id);
                
                return (
                  <motion.div
                    key={emp.id}
                    className={`border-b relative ${
                      focusMode && hoveredEmployee !== emp.id ? 'opacity-40 blur-[1px]' : ''
                    }`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    variants={variants.item}
                    custom={empIndex}
                  >
                    {/* Employee name (in Gantt mode) */}
                    {viewMode === VIEW_MODES.GANTT && (
                      <div className="absolute left-0 top-0 h-full w-48 flex items-center px-4 bg-white/80 backdrop-blur-sm border-r z-10">
                        <motion.div 
                          className="w-3 h-6 rounded-full shadow-sm mr-3"
                          style={{background: pillGradient(emp.colorA, emp.colorB)}}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-800 truncate">{emp.name}</div>
                          {emp.role && (
                            <div className="text-xs text-slate-500 truncate">{emp.role}</div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Gantt task bars */}
                    <div 
                      className="absolute top-0 h-full"
                      style={{ 
                        left: viewMode === VIEW_MODES.GANTT ? '192px' : '0px',
                        width: `${viewDays * dayWidth}px`
                      }}
                    >
                      {empTasks.map(task => (
                        <GanttTaskBar
                          key={task.id}
                          task={task}
                          employee={emp}
                          dayWidth={dayWidth}
                          startDate={timelineStart}
                          onTaskUpdate={handleTaskUpdate}
                          onTaskSelect={handleTaskSelect}
                          isSelected={selectedTasks.has(task.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Enhanced Hover Card */}
          <AnimatePresence>
            {hoverTask && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 30,
                  mass: 0.8
                }}
              >
                <TaskHoverCardRedesign
                  task={{
                    id: hoverTask.id,
                    naziv: hoverTask.title,
                    pozicija: `${hoverTask.positionId} – ${hoverTask.positionTitle}`,
                    proces: hoverTask.processName,
                    start: hoverTask.start,
                    end: hoverTask.end,
                    plannedEnd: hoverTask.end,
                    faza: "u_radu",
                    hitnost: "normalno"
                  }}
                  hoverMeta={{
                    position: {
                      id: hoverTask.positionId,
                      title: hoverTask.positionTitle,
                      processData: {
                        comments: hoverTask.realPosition?.comments?.map(c => ({
                          id: c.id,
                          text: c.text,
                          author: c.author?.name || "Unknown",
                          date: new Date(c.date).toISOString().split('T')[0]
                        })) || [],
                        documents: hoverTask.realPosition?.documents || [],
                        tasks: hoverTask.realPosition?.tasks?.map(t => ({
                          id: t.id,
                          title: t.title,
                          assignee: t.assignee?.name || "Unassigned",
                          due: t.due,
                          done: t.status === "completed"
                        })) || []
                      },
                      pieces: [{
                        id: 1,
                        pieceNumber: 1,
                        processData: {
                          comments: [],
                          documents: [],
                          tasks: []
                        },
                        montaza: hoverTask.realPosition?.processes?.reduce((acc, proc) => {
                          const processKey = proc.name.toLowerCase().replace(/\s+/g, '_');
                          acc[processKey] = {
                            status: proc.status === "Završeno",
                            comments: proc.subtasks?.map(st => ({
                              id: st.id,
                              text: st.title,
                              author: st.assignee?.name || "Unknown",
                              date: st.due
                            })) || [],
                            documents: [],
                            tasks: proc.subtasks?.map(st => ({
                              id: st.id,
                              title: st.title,
                              assignee: st.assignee?.name || "Unassigned",
                              due: st.due,
                              done: st.status === "completed"
                            })) || [],
                            timestamp: proc.actualEnd || null
                          };
                          return acc;
                        }, {
                          transport: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                          ugradnja: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                        }) || {
                          transport: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                          ugradnja: { status: false, comments: [], documents: [], tasks: [], timestamp: null },
                        }
                      }]
                    }
                  }}
                  level={2}
                  position={{ x: hoverXY.x, y: hoverXY.y }}
                  onClose={closeHover}
                  onExpand={()=>{}}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Focus Mode Overlay */}
          <AnimatePresence>
            {focusMode && (
              <motion.div
                className="fixed inset-0 bg-black/10 backdrop-blur-sm z-30 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}