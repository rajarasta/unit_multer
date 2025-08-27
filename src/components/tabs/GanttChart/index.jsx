import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
Home, Library, Gamepad2, AppWindow, Search, Settings, Sparkles, 
  MoreHorizontal, ChevronDown, ChevronLeft, Bell, Check, CheckCheck, Plus, Minus, FileText,
  GitBranch, Clock, Download, Upload, Eye, Edit3, Trash2, Copy,
  Lock, Unlock, Users, FolderOpen, AlertCircle, Circle, Triangle, Shuffle, 
  ChevronRight, ArrowRight, ArrowUp, Loader, Truck, FileSpreadsheet,
  CheckCircle, XCircle, RefreshCw, Save, History, Package, Heart, Hexagon, Move,EyeOff,
  Calendar, Flag, Target, Zap, TrendingUp, Award, Star, MessageSquare, Image as ImageIcon, Phone,
  AlertTriangle, BarChart3, Layers, Grid3x3, Play, Pause, FastForward, Mail, ClipboardList, Building2,
  Rewind, Maximize2, Filter, Camera,ShoppingCart,QrCode, Share2, BadgeCheck, Bookmark,
  Building, MapPin, DoorOpen, Square, Maximize, Activity, X, ExternalLink // Also add X here
} from "lucide-react";


// Microsoft Storeâ€“style shell

// Materials Grid Component
const MATERIAL_THEMES = {
  red:   { bg: "linear-gradient(180deg, #fecaca, #ef4444)", ring: "#fecaca", glow: "rgba(239,68,68,.45)" },
  green: { bg: "linear-gradient(180deg, #bbf7d0, #22c55e)", ring: "#bbf7d0", glow: "rgba(34,197,94,.40)" },
  blue:  { bg: "linear-gradient(180deg, #bfdbfe, #3b82f6)", ring: "#bfdbfe", glow: "rgba(59,130,246,.40)" },
};

// Gantt Chart Component
export default function GanttChart() {
  const [viewMode, setViewMode] = useState('month');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDependencies, setShowDependencies] = useState(true);
  const [currentDate] = useState(new Date('2025-08-14'));

  const [tasks] = useState([
    {
      id: 1,
      name: "Project Planning",
      assignee: "John Smith",
      start: new Date('2025-07-01'),
      end: new Date('2025-07-15'),
      progress: 100,
      status: 'completed',
      dependencies: [],
      color: '#059669'
    },
    {
      id: 2,
      name: "Design Phase",
      assignee: "Sarah Johnson",
      start: new Date('2025-07-10'),
      end: new Date('2025-07-28'),
      progress: 100,
      status: 'completed',
      dependencies: [1],
      color: '#2563eb'
    },
    {
      id: 3,
      name: "Frontend Development",
      assignee: "Mike Chen",
      start: new Date('2025-07-25'),
      end: new Date('2025-08-20'),
      progress: 65,
      status: 'in-progress',
      dependencies: [2],
      color: '#7c3aed'
    },
    {
      id: 4,
      name: "Backend Development",
      assignee: "Lisa Park",
      start: new Date('2025-07-25'),
      end: new Date('2025-08-25'),
      progress: 45,
      status: 'in-progress',
      dependencies: [2],
      color: '#db2777'
    },
    {
      id: 5,
      name: "Database Design",
      assignee: "Tom Wilson",
      start: new Date('2025-07-20'),
      end: new Date('2025-08-05'),
      progress: 100,
      status: 'completed',
      dependencies: [1],
      color: '#ea580c'
    },
    {
      id: 6,
      name: "API Integration",
      assignee: "Emily Davis",
      start: new Date('2025-08-06'),
      end: new Date('2025-08-18'),
      progress: 75,
      status: 'in-progress',
      dependencies: [5],
      color: '#0891b2'
    },
    {
      id: 7,
      name: "Testing & QA",
      assignee: "Robert Lee",
      start: new Date('2025-08-15'),
      end: new Date('2025-09-05'),
      progress: 20,
      status: 'pending',
      dependencies: [3, 4],
      color: '#84cc16'
    },
    {
      id: 8,
      name: "Deployment",
      assignee: "Anna Brown",
      start: new Date('2025-09-01'),
      end: new Date('2025-09-10'),
      progress: 0,
      status: 'pending',
      dependencies: [7],
      color: '#f59e0b'
    }
  ]);

  const getDateRange = () => {
    const starts = tasks.map(t => t.start);
    const ends = tasks.map(t => t.end);
    const minDate = new Date(Math.min(...starts));
    const maxDate = new Date(Math.max(...ends));
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 7);
    return { minDate, maxDate };
  };

  const { minDate, maxDate } = getDateRange();
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

  const getTaskPosition = (task) => {
    const startOffset = Math.ceil((task.start - minDate) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((task.end - task.start) / (1000 * 60 * 60 * 24));
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  const getTodayPosition = () => {
    const todayOffset = Math.ceil((currentDate - minDate) / (1000 * 60 * 60 * 24));
    return (todayOffset / totalDays) * 100;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'in-progress': return <Clock className="h-3 w-3" />;
      case 'pending': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Timeline</h1>
          <p className="mt-1 text-sm opacity-80">Interactive Gantt chart with task dependencies and progress tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="px-3 py-2 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button className="px-3 py-2 rounded-xl bg-slate-900 text-white flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View:</span>
          {['week', 'month', 'quarter'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded-lg text-sm capitalize transition-colors ${
                viewMode === mode 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-slate-100 ring-1 ring-slate-200 hover:bg-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDependencies}
              onChange={(e) => setShowDependencies(e.target.checked)}
              className="rounded"
            />
            Show dependencies
          </label>
          <div className="flex items-center gap-1">
            <button className="p-1 rounded-lg hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium px-2">August 2025</span>
            <button className="p-1 rounded-lg hover:bg-slate-100">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl ring-1 ring-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[300px_1fr]">
          <div className="border-r border-slate-200">
            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <div className="grid grid-cols-[1fr_80px_100px] gap-2 text-xs font-medium text-slate-600">
                <span>Task Name</span>
                <span>Assignee</span>
                <span>Progress</span>
              </div>
            </div>
            <div className="divide-y divide-slate-200">
              {tasks.map(task => (
                <motion.div
                  key={task.id}
                  whileHover={{ backgroundColor: 'rgb(248 250 252)' }}
                  className={`p-3 cursor-pointer ${selectedTask?.id === task.id ? 'bg-slate-50' : ''}`}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="grid grid-cols-[1fr_80px_100px] gap-2 items-center">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: task.color }}
                      />
                      <span className="text-sm font-medium truncate">{task.name}</span>
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="text-xs text-slate-600 truncate">{task.assignee.split(' ')[0]}</div>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full"
                          style={{ 
                            width: `${task.progress}%`,
                            backgroundColor: task.progress === 100 ? '#10b981' : task.color
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          transition={{ duration: 1, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-xs text-slate-600">{task.progress}%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 h-12 flex items-center px-4">
              <span className="text-xs font-medium text-slate-600">Timeline View</span>
            </div>

            <div className="relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                style={{ left: `${getTodayPosition()}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                  Today
                </div>
              </div>

              <div className="relative">
                {tasks.map((task, idx) => {
                  const position = getTaskPosition(task);
                  return (
                    <div key={task.id} className="h-12 relative group">
                      <motion.div
                        className="absolute top-2 h-8 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-shadow z-10"
                        style={{
                          ...position,
                          backgroundColor: task.color + '20',
                          border: `2px solid ${task.color}`
                        }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedTask(task)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <div
                          className="h-full rounded-md transition-all"
                          style={{
                            width: `${task.progress}%`,
                            backgroundColor: task.color + '60'
                          }}
                        />
                        
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none z-30 whitespace-nowrap transition-opacity">
                          <div className="font-medium">{task.name}</div>
                          <div className="mt-1 text-slate-300">
                            {task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}
                          </div>
                          <div className="mt-1">Progress: {task.progress}%</div>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 rounded-2xl ring-1 ring-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedTask.color }}
                  />
                  {selectedTask.name}
                </h3>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Assignee:</span>
                    <p className="font-medium">{selectedTask.assignee}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Start Date:</span>
                    <p className="font-medium">{selectedTask.start.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">End Date:</span>
                    <p className="font-medium">{selectedTask.end.toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <p className="font-medium capitalize">{selectedTask.status.replace('-', ' ')}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg hover:bg-slate-100"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


