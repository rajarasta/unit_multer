// src/components/tabs/PlannerGanttTab.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Save, Upload, Download, Filter, ZoomIn, ZoomOut, Calendar, Settings, 
  Link2, Unlink, Trash2, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Users, BadgeCheck, Target, 
  MoreHorizontal, MessageSquare, Paperclip, Clock, AlertCircle, X,
  Maximize2, CalendarDays, Search, Eye, EyeOff, Layers, Info, Edit3, FileText,
  Package, ShoppingCart, Palette, Wrench, Factory, Home, CheckSquare, Camera,
  FilterX, Undo, Redo, AlertTriangle, ExternalLink, ScrollText, Grid3x3, List, FileUp,
  Sparkles, Star, Hash, Database, BookOpen, Activity, ListTodo, Flame, FolderOpen,
  Zap, Shield, Bell, FileImage, Archive, Folder, History, Image, FileCode, Expand,
  FolderPlus, GitBranch, Shuffle, BarChart3
} from 'lucide-react';

import ProjectDataService from '../../../services/ProjectDataService.js';
import TaskHoverCardRedesign from './hoverTab2.jsx';
import JsonStorageService from '../../../services/JsonStorageService.js';
import { useProjectStore } from '../../../store/useProjectStore';
import { AdvancedTaskHoverCard } from './hoverTab.jsx';
import FloatingMicLauncher from '../../../app/components/FloatingMicLauncher.jsx';
import { SCOPES, normalise } from '../../../app/voice/scopeRegistry';
import useGanttAgent from '../GVAv2/hooks/useGanttAgent.js';
import AgentInteractionBar from '../GVAv2/components/AgentInteractionBar.jsx';

/** ======================== KONSTANTE ======================== */
const ROW_H = 36;
const HEADER_H = 80;
const SIDEBAR_W = 320;
const DAY_MS = 24 * 3600 * 1000;
const HOVER_DELAY_1 = 800;  // Reduced for immediate small hover
const HOVER_DELAY_2 = 1200; // Reduced for faster large hover
const HOVER_DELAY_3 = 1800; // Reduced for faster full hover
const HOVER_LEAVE_DELAY = 600; // Longer delay to allow mouse movement to hover
const HOVER_EXPAND_DELAY = 200; // Quick expansion on hover transition
const OVERSCAN_DAYS = 14;
const OVERSCAN_ROWS = 10;
const ALL_PROJECTS_ID = 'ALL_PROJECTS'; // ID for the aggregated view

const STATUSI = {
  'čeka': { bg: '#64748b', light: '#f1f5f9', border: '#cbd5e1', text: 'Čeka' },
  'u tijeku': { bg: '#0ea5e9', light: '#e0f2fe', border: '#7dd3fc', text: 'U tijeku' },
  'završeno': { bg: '#10b981', light: '#d1fae5', border: '#6ee7b7', text: 'Završeno' },
  'kasni': { bg: '#ef4444', light: '#fee2e2', border: '#fca5a5', text: 'Kasni' },
  'blokirano': { bg: '#f59e0b', light: '#fed7aa', border: '#fdba74', text: 'Blokirano' }
};

const URGENCY_LEVELS = {
  'normal': { bg: '#64748b', light: '#f1f5f9', text: 'Normal', glow: 'transparent', icon: Clock },
  'medium': { bg: '#3b82f6', light: '#dbeafe', text: 'Srednje', glow: '#3b82f6', icon: Bell },
  'high': { bg: '#f59e0b', light: '#fed7aa', text: 'Visoko', glow: '#f59e0b', icon: Zap },
  'critical': { bg: '#ef4444', light: '#fee2e2', text: 'Kritično', glow: '#ef4444', icon: Flame }
};

const DOC_URGENCY = {
  'normal': { bg: '#64748b', text: 'Normal' },
  'important': { bg: '#3b82f6', text: 'Važno' },
  'urgent': { bg: '#ef4444', text: 'Hitno' }
};

const PROCESI = [
  { id: 'općenito', naziv: 'Općenito', ikona: Shuffle, boja: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%)' },
  { id: 'prodaja', naziv: 'Prodaja', ikona: ShoppingCart, boja: '#8b5cf6' },
  { id: 'dizajn', naziv: 'Dizajn', ikona: Palette, boja: '#3b82f6' },
  { id: 'nabava', naziv: 'Nabava', ikona: Package, boja: '#06b6d4' },
  { id: 'teh_priprema', naziv: 'Teh. priprema', ikona: Wrench, boja: '#10b981' },
  { id: 'proizvodnja', naziv: 'Proizvodnja', ikona: Factory, boja: '#f59e0b' },
  { id: 'ugradnja', naziv: 'Ugradnja', ikona: Home, boja: '#ef4444' },
  { id: 'primopredaja', naziv: 'Primopredaja', ikona: CheckSquare, boja: '#ec4899' }
];

const EVENT_TYPES = {
  'novi': { bg: '#10b981', text: 'Novi' },
  'promjena': { bg: '#0ea5e9', text: 'Promjena' },
  'brisanje': { bg: '#ef4444', text: 'Brisanje' },
  'import': { bg: '#8b5cf6', text: 'Import' },
  'ručno': { bg: '#f59e0b', text: 'Ručno' },
  'komentar': { bg: '#06b6d4', text: 'Komentar' },
  'dokument': { bg: '#ec4899', text: 'Dokument' },
  'opis': { bg: '#a855f7', text: 'Opis' },
  'status': { bg: '#22c55e', text: 'Status' },
  'podzadatak': { bg: '#fbbf24', text: 'Podzadatak' },
  'hitnost': { bg: '#dc2626', text: 'Hitnost' },
  'projekt': { bg: '#4ade80', text: 'Projekt' }
};

/** ======================== UTILITY ======================== */
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
const daysBetween = (start, end) => Math.ceil((new Date(end) - new Date(start)) / DAY_MS);

const croatianDateFormat = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
};
const croatianDateFull = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' });
};
const croatianDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('hr-HR', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
};

// Generate project color based on name
const generateProjectColor = (projectName) => {
  let hash = 0;
  for (let i = 0; i < projectName.length; i++) {
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 50%)`;
};

// rAF throttle helper
const useRafThrottle = (fn) => {
  const tickingRef = useRef(false);
  const lastArgsRef = useRef(null);
  return useCallback((...args) => {
    lastArgsRef.current = args;
    if (!tickingRef.current) {
      tickingRef.current = true;
      requestAnimationFrame(() => {
        tickingRef.current = false;
        fn(...(lastArgsRef.current || []));
      });
    }
  }, [fn]);
};

/** ======================== PROJECT SELECTOR ======================== */
// Removed onAddProject functionality
function ProjectSelector({ projects, activeProjectId, onSelectProject, onDeleteProject }) {
  const [showDropdown, setShowDropdown] = useState(false);
  
  const activeProject = activeProjectId === ALL_PROJECTS_ID ? null : projects.find(p => p.id === activeProjectId);
  const displayName = activeProjectId === ALL_PROJECTS_ID ? 'Svi projekti' : (activeProject?.name || 'Odaberi projekt');

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <GitBranch className="w-4 h-4" />
        <span className="text-sm font-medium">{displayName}</span>
        {activeProjectId !== ALL_PROJECTS_ID && activeProject && (
          <div 
            className="w-3 h-3 rounded-full ml-2" 
            style={{ backgroundColor: generateProjectColor(activeProject.name) }}
          />
        )}
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-xl shadow-2xl border z-50">
          <div className="p-2">
            <div className="text-xs font-semibold text-slate-500 px-2 py-1">Pregled</div>

            <div
              className={`flex items-center px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer ${
                activeProjectId === ALL_PROJECTS_ID ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                onSelectProject(ALL_PROJECTS_ID);
                setShowDropdown(false);
              }}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Svi projekti</span>
              <span className="text-xs text-slate-400 ml-auto">
                ({projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)} zadataka)
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-500 px-2 py-1 mt-2">Pojedinačni Projekti</div>
            {projects.map(project => (
              <div
                key={project.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer ${
                  project.id === activeProjectId ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  onSelectProject(project.id);
                  setShowDropdown(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: generateProjectColor(project.name) }}
                  />
                  <span className="text-sm">{project.name}</span>
                  <span className="text-xs text-slate-400">
                    ({project.tasks?.length || 0} zadataka)
                  </span>
                </div>
                {/* Allow deletion */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Izbrisati projekt "${project.name}"?`)) {
                      onDeleteProject(project.id);
                    }
                  }}
                  className="p-1 hover:bg-red-100 rounded"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
          </div>
          {/* Removed Add Project UI */}
        </div>
      )}
    </div>
  );
}

/** ======================== POSITION HISTORY ======================== */
function PositionHistory({ position, history, onClose }) {
  const positionHistory = useMemo(() => {
    return history
      .filter(event => event.opis?.includes(position))
      .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date));
  }, [history, position]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Povijest pozicije: {position}</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {positionHistory.length} događaja
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {positionHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nema povijesti za ovu poziciju</p>
            </div>
          ) : (
            <div className="space-y-3">
              {positionHistory.map((event, idx) => {
                const eventType = EVENT_TYPES[event.type] || EVENT_TYPES['ručno'];
                return (
                  <div key={event.id || idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-3 h-3 rounded-full border-2 border-white z-10"
                        style={{ backgroundColor: eventType.bg }}
                      />
                      {idx < positionHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 -mt-1" />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: eventType.bg }}
                              >
                                {eventType.text}
                              </span>
                              <span className="text-xs text-slate-500">
                                {croatianDateTime(event.timestamp || event.date)}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-700">{event.naslov}</p>
                            {event.opis && (
                              <p className="text-xs text-slate-600 mt-1">{event.opis}</p>
                            )}
                            {event.author && (
                              <p className="text-xs text-slate-400 mt-2">
                                Od: {event.author}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ======================== IMAGE/CAD PREVIEW ======================== */
// Set to z-50 to ensure it is above DocumentsManager (z-40)
function ImageCADPreview({ file, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const isImage = file.type?.startsWith('image/');
  const isCAD = file.name?.toLowerCase().endsWith('.dwg') || 
                file.name?.toLowerCase().endsWith('.dxf') ||
                file.name?.toLowerCase().endsWith('.dwf');
  
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };
  
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleOpen = () => {
    if (file.url && file.url !== '#') {
      if (file.url.startsWith('data:')) {
        const blob = dataURLtoBlob(file.url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } else {
        window.open(file.url, '_blank');
      }
    }
  };
  
  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-medium">{file.name}</h3>
          <span className="text-white/60 text-sm">
            {(file.size / 1024).toFixed(1)} KB
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(prev => Math.max(0.1, prev - 0.2))}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          
          <span className="text-white text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={() => setScale(prev => Math.min(5, prev + 0.2))}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          
          <button
            onClick={resetView}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white ml-2"
            title="Reset view"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleOpen}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white ml-4"
            title="Otvori u vanjskoj aplikaciji"
          >
            <ExternalLink className="w-5 h-5" />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-hidden relative cursor-move"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center',
            transition: isDragging ? 'none' : 'transform 0.1s'
          }}
        >
          {isImage ? (
            <img 
              src={file.url} 
              alt={file.name}
              className="max-w-none"
              draggable={false}
              style={{ userSelect: 'none' }}
            />
          ) : isCAD ? (
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <div className="flex flex-col items-center">
                <FileCode className="w-24 h-24 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
                <p className="text-sm text-slate-600 mb-4">CAD datoteka</p>
                <div className="bg-slate-100 rounded-lg p-4 mb-4">
                  <p className="text-xs text-slate-600">
                    Preview CAD datoteka trenutno nije podržan.
                    <br />
                    Kliknite "Otvori" za prikaz u vanjskoj aplikaciji.
                  </p>
                </div>
                <button
                  onClick={handleOpen}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Otvori u CAD aplikaciji
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <div className="flex flex-col items-center">
                <FileText className="w-24 h-24 text-slate-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">{file.name}</h3>
                <p className="text-sm text-slate-600">
                  Preview nije dostupan za ovaj tip datoteke
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3 bg-black/50 text-white/60 text-xs text-center">
        Koristi scroll za zoom, povuci za pomicanje • ESC za zatvaranje
      </div>
    </div>
  );
}

/** ======================== DOCUMENTS MANAGER ======================== */
// Set to z-40 so that ImageCADPreview (z-50) can overlay it.
function DocumentsManager({ documents = [], onClose, onUpdateDocument, onDeleteDocument, onPreview }) {
  const [filter, setFilter] = useState('all');
  const [searchDoc, setSearchDoc] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (filter !== 'all') {
        const docType = doc.type?.startsWith('image/') ? 'image' :
                       (doc.name?.toLowerCase().endsWith('.dwg') || doc.name?.toLowerCase().endsWith('.dxf')) ? 'cad' :
                       doc.name?.toLowerCase().endsWith('.pdf') ? 'pdf' :
                       'document';
        if (docType !== filter) return false;
      }
      if (urgencyFilter !== 'all' && doc.urgency !== urgencyFilter) return false;
      if (searchDoc && !doc.name.toLowerCase().includes(searchDoc.toLowerCase())) return false;
      return true;
    });
  }, [documents, filter, urgencyFilter, searchDoc]);

  const groupedDocs = useMemo(() => {
    const grouped = new Map();
    filteredDocs.forEach(doc => {
      const key = doc.position || 'Bez pozicije';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredDocs]);

  const handleOpenDocument = (doc) => {
    if (doc.url && doc.url !== '#') {
      if (doc.url.startsWith('data:')) {
        const blob = dataURLtoBlob(doc.url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } else window.open(doc.url, '_blank');
    }
  };

  const handleUrgencyChange = (docId, urgency) => {
    onUpdateDocument(docId, { urgency });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Dokumenti projekta</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {documents.length} dokumenata
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pretraži dokumente..."
                value={searchDoc}
                onChange={(e) => setSearchDoc(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Tip:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-sm"
              >
                <option value="all">Svi</option>
                <option value="image">Slike</option>
                <option value="cad">CAD/DWG</option>
                <option value="pdf">PDF</option>
                <option value="document">Dokumenti</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Hitnost:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-sm"
              >
                <option value="all">Sve</option>
                {Object.entries(DOC_URGENCY).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {groupedDocs.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nema dokumenata koji odgovaraju filterima</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedDocs.map(([position, docs]) => (
                <div key={position}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    {position}
                    <span className="text-xs text-slate-400 font-normal">({docs.length})</span>
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {docs.map(doc => {
                      // const urgency = DOC_URGENCY[doc.urgency || 'normal'];
                      const isImage = doc.type?.startsWith('image/');
                      const isCAD = doc.name?.toLowerCase().endsWith('.dwg') || 
                                   doc.name?.toLowerCase().endsWith('.dxf');
                      
                      return (
                        <div
                          key={doc.id}
                          className="group relative bg-white border rounded-lg hover:shadow-lg transition-all overflow-hidden"
                        >
                          <div 
                            className="aspect-video relative cursor-pointer"
                            onClick={() => onPreview(doc)}
                          >
                            {isImage ? (
                              <>
                                <img 
                                  src={doc.url} 
                                  alt={doc.name} 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-2 left-2 p-1 bg-black/50 rounded">
                                  <Image className="w-4 h-4 text-white" />
                                </div>
                              </>
                            ) : isCAD ? (
                              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
                                <FileCode className="w-12 h-12 text-blue-600 mb-2" />
                                <span className="text-xs font-medium text-blue-700">CAD/DWG</span>
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                                <FileText className="w-12 h-12 text-slate-400" />
                              </div>
                            )}
                            
                            <div className="absolute bottom-2 right-2 flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreview(doc);
                                }}
                                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                title="Brza inspekcija"
                              >
                                <Expand className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDocument(doc);
                                }}
                                className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                title="Otvori"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <p className="text-xs font-medium text-slate-700 truncate mb-2">{doc.name}</p>
                            
                            <div className="flex items-center justify-between">
                              <select
                                value={doc.urgency || 'normal'}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleUrgencyChange(doc.id, e.target.value);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer"
                                style={{ 
                                  backgroundColor: DOC_URGENCY[doc.urgency || 'normal'].bg + '20',
                                  color: DOC_URGENCY[doc.urgency || 'normal'].bg
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {Object.entries(DOC_URGENCY).map(([key, val]) => (
                                  <option key={key} value={key}>{val.text}</option>
                                ))}
                              </select>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">
                                  {(doc.size / 1024).toFixed(1)} KB
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteDocument(doc.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ======================== SETTINGS PANEL ======================== */
function SettingsPanel({ settings, onSettingsChange, onClose }) {
  const local = { ...settings };
  return (
    <div className="fixed right-4 top-20 z-40 w-80 bg-white rounded-xl shadow-2xl border">
      <style>{`
        .pulse-strong { 
          animation: pulseStrong 1s ease-in-out infinite; 
        }
        @keyframes pulseStrong {
          0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70% { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        .glow-critical {
          animation: glowCritical 1.5s ease-in-out infinite;
        }
        @keyframes glowCritical {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.6); }
        }
        .glow-high {
          animation: glowHigh 2s ease-in-out infinite;
        }
        @keyframes glowHigh {
          0%, 100% { box-shadow: 0 0 15px rgba(245,158,11,0.5), 0 0 30px rgba(245,158,11,0.3); }
          50% { box-shadow: 0 0 25px rgba(245,158,11,0.7), 0 0 50px rgba(245,158,11,0.5); }
        }
        .glow-medium {
          animation: glowMedium 2.5s ease-in-out infinite;
        }
        @keyframes glowMedium {
          0%, 100% { box-shadow: 0 0 10px rgba(59,130,246,0.4), 0 0 20px rgba(59,130,246,0.2); }
          50% { box-shadow: 0 0 20px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.4); }
        }
        .rainbow-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%);
        }
      `}</style>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Postavke prikaza</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Prikaz u trakama
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showPositionInBar}
                  onChange={(e) => onSettingsChange({ ...local, showPositionInBar: e.target.checked })}
                  className="rounded"
                />
                Prikaži poziciju u traci
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showIconsInBar}
                  onChange={(e) => onSettingsChange({ ...local, showIconsInBar: e.target.checked })}
                  className="rounded"
                />
                Ikone procesa u traci
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.openEditorOnTrayClick}
                  onChange={(e) => onSettingsChange({ ...local, openEditorOnTrayClick: e.target.checked })}
                  className="rounded"
                />
                Klik na traku otvara UREDI ZADATAK
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showUrgencyGlow}
                  onChange={(e) => onSettingsChange({ ...local, showUrgencyGlow: e.target.checked })}
                  className="rounded"
                />
                Prikaži sjaj hitnih zadataka
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.useProjectColors}
                  onChange={(e) => onSettingsChange({ ...local, useProjectColors: e.target.checked })}
                  className="rounded"
                />
                {/* Updated label to reflect behavior in aggregated view */}
                Boje (Uklj = Projektne boje, Isklj = Boje procesa)
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Indikatori statusa
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showStatusIndicators}
                  onChange={(e) => onSettingsChange({ ...local, showStatusIndicators: e.target.checked })}
                  className="rounded"
                />
                Prikaži indikatore (komentari, prilozi, opis, podzadaci)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.showProgressPercentage}
                  onChange={(e) => onSettingsChange({ ...local, showProgressPercentage: e.target.checked })}
                  className="rounded"
                />
                Prikaži postotak napretka
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Označavanje
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.highlightNoDates}
                  onChange={(e) => onSettingsChange({ ...local, highlightNoDates: e.target.checked })}
                  className="rounded"
                />
                Upozori na zadatke bez datuma
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={local.highlightOverdue}
                  onChange={(e) => onSettingsChange({ ...local, highlightOverdue: e.target.checked })}
                  className="rounded"
                />
                Istakni zadatke koji kasne
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Timeline
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={local.showTimeline}
                onChange={(e) => onSettingsChange({ ...local, showTimeline: e.target.checked })}
                className="rounded"
              />
              Prikaži zapisnik događaja
            </label>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-2">
              Performanse
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={local.enableAnimations}
                onChange={(e) => onSettingsChange({ ...local, enableAnimations: e.target.checked })}
                  className="rounded"
              />
              Omogući animacije
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ======================== ENHANCED SUBTASKS DRAWER ======================== */
// Updated handlers to accept projectId
function SubtasksDrawer({ open, onClose, subtasksByPosition = {}, onToggle, onDelete, onUpdateSubtask, onAddEvent }) {
  const [positionFilter, setPositionFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  
  const allSubtasks = useMemo(() => {
    const tasks = [];
    Object.entries(subtasksByPosition).forEach(([position, list]) => {
      if (list && list.length) {
        // Tasks here should already have projectId if aggregated in PlannerGanttTab
        list.forEach(task => tasks.push({ ...task, position }));
      }
    });
    return tasks;
  }, [subtasksByPosition]);

  const people = useMemo(() => {
    const peopleSet = new Set();
    allSubtasks.forEach(task => {
      if (task.assignedTo) peopleSet.add(task.assignedTo);
    });
    return Array.from(peopleSet);
  }, [allSubtasks]);

  const positions = useMemo(() => {
    return Object.keys(subtasksByPosition).filter(pos => 
      subtasksByPosition[pos] && subtasksByPosition[pos].length > 0
    );
  }, [subtasksByPosition]);

  const filteredSubtasks = useMemo(() => {
    return allSubtasks.filter(task => {
      if (positionFilter !== 'all' && task.position !== positionFilter) return false;
      if (personFilter !== 'all' && task.assignedTo !== personFilter) return false;
      if (urgencyFilter !== 'all' && task.urgency !== urgencyFilter) return false;
      if (searchText && !task.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [allSubtasks, positionFilter, personFilter, urgencyFilter, searchText]);

  const groupedByPosition = useMemo(() => {
    const grouped = new Map();
    filteredSubtasks.forEach(task => {
      if (!grouped.has(task.position)) grouped.set(task.position, []);
      grouped.get(task.position).push(task);
    });
    return Array.from(grouped.entries());
  }, [filteredSubtasks]);

  // Added projectId parameter
  const handleUrgencyChange = (position, taskId, urgency, projectId) => {
    onUpdateSubtask(position, taskId, { urgency }, projectId);
    onAddEvent({
      id: `e${Date.now()}`,
      date: formatDate(new Date()),
      type: 'hitnost',
      naslov: `Hitnost podzadatka promijenjena`,
      opis: `${position} - ${URGENCY_LEVELS[urgency].text}`
    }, projectId);
  };

  // Added projectId parameter
  const handleStatusChange = (position, taskId, status, projectId) => {
    onUpdateSubtask(position, taskId, { status }, projectId);
  };

  const stats = useMemo(() => {
    const total = filteredSubtasks.length;
    const done = filteredSubtasks.filter(t => t.done).length;
    const urgent = filteredSubtasks.filter(t => t.urgency === 'critical' || t.urgency === 'high').length;
    return { total, done, urgent, pending: total - done };
  }, [filteredSubtasks]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl border-l flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold">Podzadaci</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/50 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
              <p className="text-[10px] text-slate-500">Ukupno</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-green-600">{stats.done}</p>
              <p className="text-[10px] text-slate-500">Završeno</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              <p className="text-[10px] text-slate-500">U tijeku</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              <p className="text-[10px] text-slate-500">Hitno</p>
            </div>
          </div>
        </div>

        <div className="p-3 border-b bg-slate-50">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pretraži podzadatke..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Sve pozicije</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
              
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Sve osobe</option>
                {people.map(person => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>
              
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Sve hitnosti</option>
                {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {groupedByPosition.length === 0 ? (
            <div className="text-center py-8">
              <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nema podzadataka koji odgovaraju filterima</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByPosition.map(([position, tasks]) => (
                <div key={position}>
                  <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
                    <span>{position} ({tasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map(task => {
                      const urgency = URGENCY_LEVELS[task.urgency || 'normal'];
                      const UrgencyIcon = urgency.icon;
                      const status = STATUSI[task.status || 'čeka'];
                      
                      return (
                        <div 
                          key={task.id} 
                          className={`border rounded-lg p-3 bg-white hover:shadow-sm transition-all ${
                            task.urgency === 'critical' ? 'border-red-300' :
                            task.urgency === 'high' ? 'border-orange-300' :
                            task.urgency === 'medium' ? 'border-blue-300' :
                            'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input 
                              type="checkbox" 
                              checked={!!task.done} 
                              // Pass projectId for correct targeting
                              onChange={() => onToggle(position, task.id, task.projectId)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 space-y-2">
                              <div className={`text-sm ${task.done ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                {task.title}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.dueDate && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {croatianDateFormat(task.dueDate)}
                                  </span>
                                )}
                                {task.assignedTo && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {task.assignedTo}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <select
                                  value={task.urgency || 'normal'}
                                  // Pass projectId for correct targeting
                                  onChange={(e) => handleUrgencyChange(position, task.id, e.target.value, task.projectId)}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer"
                                  style={{ 
                                    backgroundColor: urgency.light,
                                    color: urgency.bg
                                  }}
                                >
                                  {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.text}</option>
                                  ))}
                                </select>
                                
                                <select
                                  value={task.status || 'čeka'}
                                  // Pass projectId for correct targeting
                                  onChange={(e) => handleStatusChange(position, task.id, e.target.value, task.projectId)}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer"
                                  style={{ 
                                    backgroundColor: status.light,
                                    color: status.bg
                                  }}
                                >
                                  {Object.entries(STATUSI).map(([key, val]) => (
                                    <option key={key} value={key}>{val.text}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <UrgencyIcon 
                                className="w-4 h-4" 
                                style={{ color: urgency.bg }}
                              />
                              <button 
                                // Pass projectId for correct targeting
                                onClick={() => onDelete(position, task.id, task.projectId)} 
                                className="p-1 hover:bg-slate-100 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ======================== QUICK SUBTASK POPUP ======================== */
function QuickSubtaskPopup({ position, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [status, setStatus] = useState('čeka');

  const save = () => {
    if (!title.trim()) return;
    onSave({
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title: title.trim(),
      dueDate: due || null,
      assignedTo: assignee || '',
      urgency,
      status,
      done: false,
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4">
        <h3 className="text-sm font-semibold mb-3">Novi podzadatak — {position}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-600 block mb-1">Naslov</label>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Npr. provjera mjera, naručiti vijčanu robu…" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Rok</label>
              <input 
                type="date" 
                value={due} 
                onChange={(e) => setDue(e.target.value)} 
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Osoba</label>
              <input 
                value={assignee} 
                onChange={(e) => setAssignee(e.target.value)} 
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Dodijeli osobi…" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Hitnost</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(STATUSI).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">
            Odustani
          </button>
          <button onClick={save} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Spremi
          </button>
        </div>
      </div>
    </div>
  );
}

/** ======================== TASK EDITOR MODAL ======================== */
function TaskEditorModal({ task, pozicije, onSave, onClose, onAddEvent, projectService, projectId }) {
  const [form, setForm] = useState({
    naziv: task?.naziv || '',
    pozicija: task?.pozicija || pozicije[0] || '',
    proces: task?.proces || 'općenito',
    start: task?.start || formatDate(new Date()),
    end: task?.end || formatDate(addDays(new Date(), 7)),
    plannedStart: task?.plannedStart || formatDate(new Date()),
    plannedEnd: task?.plannedEnd || formatDate(addDays(new Date(), 7)),
    status: task?.status || 'čeka',
    urgency: task?.urgency || 'normal',
    progress: task?.progress || 0,
    prioritet: task?.prioritet || 2,
    odgovorna_osoba: task?.odgovorna_osoba || '',
    opis: task?.opis || '',
    komentari: task?.komentari || [],
    prilozi: task?.prilozi || []
  });

  const [originalForm, setOriginalForm] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const fileInputRef = useRef(null);
  const [newComment, setNewComment] = useState('');
  const [newPositionInput, setNewPositionInput] = useState('');
  const [showNewPosition, setShowNewPosition] = useState(false);

  // Dohvati svježe podatke iz baze podataka kada se modal otvori
  useEffect(() => {
    if (task?.pozicija && projectService && projectId) {
      const loadFreshData = async () => {
        try {
          setIsLoading(true);
          const freshPosition = await projectService.getPosition(projectId, task.pozicija);
          if (freshPosition) {
            const freshTask = freshPosition.processes?.find(p => p.name === task.proces) || 
                             freshPosition.tasks?.find(t => t.id === task.id) ||
                             task;
            
            const freshForm = {
              naziv: freshTask?.naziv || '',
              pozicija: freshTask?.pozicija || pozicije[0] || '',
              proces: freshTask?.proces || 'općenito',
              start: freshTask?.start || formatDate(new Date()),
              end: freshTask?.end || formatDate(addDays(new Date(), 7)),
              plannedStart: freshTask?.plannedStart || formatDate(new Date()),
              plannedEnd: freshTask?.plannedEnd || formatDate(addDays(new Date(), 7)),
              status: freshTask?.status || 'čeka',
              urgency: freshTask?.urgency || 'normal',
              progress: freshTask?.progress || 0,
              prioritet: freshTask?.prioritet || 2,
              odgovorna_osoba: freshTask?.odgovorna_osoba || '',
              opis: freshTask?.opis || '',
              komentari: freshTask?.komentari || [],
              prilozi: freshTask?.prilozi || []
            };
            
            setForm(freshForm);
            setOriginalForm(JSON.parse(JSON.stringify(freshForm))); // Deep copy for comparison
          }
        } catch (error) {
          console.warn('Failed to load fresh task data:', error);
          const currentForm = { ...form };
          setOriginalForm(JSON.parse(JSON.stringify(currentForm)));
        } finally {
          setIsLoading(false);
        }
      };
      loadFreshData();
    } else {
      const currentForm = { ...form };
      setOriginalForm(JSON.parse(JSON.stringify(currentForm)));
    }
  }, [task, projectService, projectId]);

  // Prati promjene u formi u odnosu na originalne podatke
  useEffect(() => {
    if (originalForm) {
      const hasChanges = JSON.stringify(form) !== JSON.stringify(originalForm);
      setHasUnsavedChanges(hasChanges);
    }
  }, [form, originalForm]);
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    processFiles(Array.from(e.dataTransfer.files)); 
  };
  
  const processFiles = (files) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setForm(prev => ({ 
        ...prev, 
        prilozi: [...prev.prilozi, { 
          id: `file-${Date.now()}-${Math.random()}`, 
          name: file.name, 
          type: file.type, 
          size: file.size, 
          url: e.target.result, 
          isImage: file.type.startsWith('image/'),
          urgency: 'normal',
          position: prev.pozicija
        }] 
      }));
      reader.readAsDataURL(file);
    });
  };
  
  const addComment = (text) => setForm(prev => ({ 
    ...prev, 
    komentari: [...prev.komentari, { 
      id: `comment-${Date.now()}`, 
      text, 
      author: 'Trenutni korisnik', 
      timestamp: new Date().toISOString() 
    }] 
  }));
  
  const handleSubmit = () => {
    const proces = PROCESI.find(p => p.id === form.proces);
    // Maintain existing projectId/Name if present
    const finalTask = { ...task, ...form, naziv: proces.naziv, id: task?.id || `t${Date.now()}` };
    onSave(finalTask);
    // Pass projectId to event handler if available
    onAddEvent({ 
      id: `e${Date.now()}`, 
      date: formatDate(new Date()), 
      type: task ? 'promjena' : 'novi', 
      naslov: task ? `Uređen: ${finalTask.naziv}` : `Novi: ${finalTask.naziv}`, 
      opis: `Pozicija: ${finalTask.pozicija}` 
    }, finalTask.projectId);
  };

  const addNewPosition = () => {
    if (newPositionInput.trim() && !pozicije.includes(newPositionInput.trim())) {
      pozicije.push(newPositionInput.trim());
      setForm({ ...form, pozicija: newPositionInput.trim() });
      setNewPositionInput('');
      setShowNewPosition(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{task ? 'Uredi zadatak' : 'Novi zadatak'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pozicija</label>
                <div className="flex gap-2">
                  {showNewPosition ? (
                    <>
                      <input
                        type="text"
                        value={newPositionInput}
                        onChange={(e) => setNewPositionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNewPosition()}
                        placeholder="Nova pozicija..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button onClick={addNewPosition} className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        ✓
                      </button>
                      <button onClick={() => { setShowNewPosition(false); setNewPositionInput(''); }} className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <select 
                        value={form.pozicija} 
                        onChange={(e) => setForm({ ...form, pozicija: e.target.value })} 
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {pozicije.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button onClick={() => setShowNewPosition(true)} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200" title="Dodaj novu poziciju">
                        <Plus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proces</label>
                <select 
                  value={form.proces} 
                  onChange={(e) => setForm({ ...form, proces: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROCESI.map(p => <option key={p.id} value={p.id}>{p.naziv}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Početak</label>
                <input 
                  type="date" 
                  value={form.start} 
                  onChange={(e) => setForm({ ...form, start: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Završetak</label>
                <input 
                  type="date" 
                  value={form.end} 
                  onChange={(e) => setForm({ ...form, end: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select 
                  value={form.status} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(STATUSI).map(([key, val]) => (
                    <option key={key} value={key}>{val.text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hitnost</label>
                <select 
                  value={form.urgency} 
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                    <option key={key} value={key}>{val.text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Napredak: {form.progress}%</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={form.progress} 
                  onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })} 
                  className="w-full mt-2" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opis</label>
              <textarea 
                value={form.opis} 
                onChange={(e) => setForm({ ...form, opis: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                rows={3} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Prilozi (uključujući DWG/DXF)</label>
              <div 
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all" 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={handleDrop} 
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  multiple 
                  accept="*"
                  className="hidden" 
                  onChange={(e) => processFiles(Array.from(e.target.files))} 
                />
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Povucite datoteke ovdje ili kliknite za odabir</p>
                <p className="text-xs text-slate-500 mt-2">Podržani formati: DWG, DXF, PDF, slike i svi ostali</p>
              </div>
              
              {form.prilozi.length > 0 && (
                <div className="mt-4 space-y-2">
                  {form.prilozi.map(prilog => {
                    const isCAD = prilog.name?.toLowerCase().endsWith('.dwg') || prilog.name?.toLowerCase().endsWith('.dxf');
                    return (
                      <div key={prilog.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {prilog.isImage ? (
                            <img src={prilog.url} alt={prilog.name} className="w-10 h-10 object-cover rounded" />
                          ) : isCAD ? (
                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                              <FileCode className="w-6 h-6 text-blue-600" />
                            </div>
                          ) : (
                            <FileText className="w-6 h-6 text-slate-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{prilog.name}</p>
                            <p className="text-xs text-slate-500">{(prilog.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setForm(prev => ({ 
                            ...prev, 
                            prilozi: prev.prilozi.filter(p => p.id !== prilog.id) 
                          }))} 
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Komentari</label>
              {form.komentari.length > 0 && (
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {form.komentari.map(k => (
                    <div key={k.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{k.text}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {k.author} • {new Date(k.timestamp).toLocaleString('hr-HR')}
                          </p>
                        </div>
                        <button 
                          onClick={() => setForm(prev => ({ 
                            ...prev, 
                            komentari: prev.komentari.filter(c => c.id !== k.id) 
                          }))} 
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && newComment.trim() && (addComment(newComment), setNewComment(''))} 
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Dodajte komentar..." 
                />
                <button 
                  onClick={() => newComment.trim() && (addComment(newComment), setNewComment(''))} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Odustani
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {task ? 'Spremi promjene' : 'Stvori zadatak'}
          </button>
        </div>
      </div>
    </div>
  );
}




/** ======================== KOMENTARI PANEL ======================== */
function CommentsPanel({ comments = [], onAddComment, onDeleteComment }) {
  const [newComment, setNewComment] = useState('');
  const [localComments, setLocalComments] = useState(comments);
  useEffect(() => { setLocalComments(comments); }, [comments]);
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = { id: `comment-${Date.now()}`, text: newComment, author: 'Trenutni korisnik', timestamp: new Date().toISOString() };
    onAddComment(comment);
    setLocalComments([...localComments, comment]);
    setNewComment('');
  };
  const handleDeleteComment = (id) => {
    onDeleteComment(id);
    setLocalComments(localComments.filter(c => c.id !== id));
  };
  return (
    <div className="absolute left-full ml-4 top-0 w-80 max-h-96 bg-white rounded-xl shadow-2xl border overflow-hidden">
      <div className="p-3 border-b bg-slate-50">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Komentari ({localComments.length})
        </h4>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 space-y-2">
        {localComments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Nema komentara</p>
        ) : (
          localComments.map(comment => (
            <div key={comment.id} className="bg-slate-50 rounded-lg p-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{comment.text}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {comment.author} • {new Date(comment.timestamp).toLocaleString('hr-HR')}
                  </p>
                </div>
                <button onClick={() => handleDeleteComment(comment.id)} className="p-0.5 hover:bg-slate-200 rounded">
                  <X className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
            placeholder="Dodaj komentar..."
            className="flex-1 px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleAddComment} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
            Dodaj
          </button>
        </div>
      </div>
    </div>
  );
}

/** ======================== DEMO PODACI ======================== */
// Demo data loader for canonical v5 structure
const loadDemoData = async (projectService) => {
  try {
    // Try to load the demo data from backend
    const response = await fetch('/src/backend/unified_demo_two_projects.json');
    if (response.ok) {
      const demoData = await response.json();
      await projectService.importProjectBackup(demoData, 'replace');
      console.log('Demo data loaded successfully');
      return true;
    } else {
      console.log('Demo data response not OK:', response.status);
    }
  } catch (error) {
    console.log('Demo data not available:', error.message);
    
    // Fallback: create some basic demo data
    try {
      await projectService.createProject({
        name: 'Demo Projekt',
        client: { name: 'Demo Klijent', oib: '12345678901' },
        descriptions: {
          short: 'Demo projekt za testiranje',
          long: 'Ovo je demo projekt kreiran za testiranje funkcionalnosti',
          technical: 'Demo specifikacije'
        }
      });
      console.log('Basic demo project created');
      return true;
    } catch (createError) {
      console.error('Failed to create demo project:', createError);
    }
  }
  return false;
};

/** ======================== GLAVNA KOMPONENTA ======================== */
export default function PlannerGanttTab() {
  const { project } = useProjectStore();
  const [projectService] = useState(() => new ProjectDataService());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voiceLauncherVisible, setVoiceLauncherVisible] = useState(true);
  const [jsonHistory, setJsonHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activeLineId, setActiveLineId] = useState(null);
  const [focusMode, setFocusMode] = useState(false);

  const agent = useGanttAgent();

  const activeProjectId = data?.activeProjectId || project.id;
  const isAllProjectsView = activeProjectId === ALL_PROJECTS_ID;

  // Initialize data from ProjectDataService (skip if voice launcher data exists)
  useEffect(() => {
    let mounted = true;

    const initializeData = async () => {
      // Skip initialization if voice launcher has already loaded data
      if (isDataLoaded) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        
        // Try to load from ProjectDataService first
        let projectData = await projectService.getGanttData();
        
        // If no data exists, create from current Zustand project
        if (!projectData || !projectData.projects || projectData.projects.length === 0) {
          projectData = {
            version: '5.0',
            exportDate: new Date().toISOString(),
            meta: {
              schemaName: 'project.unified',
              schemaVersion: '5.0.0'
            },
            projects: [{
              id: project.id,
              name: project.name || 'Trenutni projekt',
              orderNo: project.orderNo,
              client: project.client,
              currency: project.currency,
              tasks: project.tasks || [],
              positions: project.positions || [],
              materials: project.materials || []
            }],
            activeProjectId: project.id
          };
          
          // Save initialized data
          try {
            await projectService.storage.importFull(projectData);
          } catch (saveErr) {
            console.warn('Could not save initialized data:', saveErr);
          }
        }
        
        if (mounted) {
          setData(projectData);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeData();

    // Subscribe to data changes for real-time updates
    const unsubscribe = projectService.subscribe(async (event, eventData) => {
      console.log('Data changed:', event, eventData);
      
      if (!mounted) return;

      try {
        // Reload fresh data from service
        const freshData = await projectService.getGanttData();
        setData(freshData);
      } catch (err) {
        console.error('Failed to reload data after change:', err);
        setError(err.message);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [projectService, project, isDataLoaded]);

  // Subscribe to localStorage/BroadcastChannel changes for cross-tab sync
  useEffect(() => {
    if (!projectService.storage) return;

    const handleStorageChange = async () => {
      try {
        const freshData = await projectService.getGanttData();
        setData(freshData);
      } catch (err) {
        console.error('Failed to sync data:', err);
        setError(err.message);
      }
    };

    // Subscribe to storage service changes
    const unsubscribe = projectService.storage.subscribe(handleStorageChange);

    return unsubscribe;
  }, [projectService]);

  // Convert canonical v5 data to currentViewData for component compatibility
  const currentViewData = useMemo(() => {
    if (!data || !data.projects) return null;

    if (isAllProjectsView) {
      // Aggregate view - combine data from all projects
      const allPositions = [];
      const allTasks = [];
      const allEvents = [];
      const allHistory = [];
      const allDocuments = [];

      data.projects.forEach(project => {
        // Extract positions and their tasks
        if (project.positions) {
          project.positions.forEach(position => {
            // Create tasks from position processes for Gantt display
            const positionTasks = (position.processes || []).map(process => ({
              id: `${project.id}-${position.id}-${process.name}`,
              naziv: `${position.title} - ${process.name}`,
              pozicija: position.id,
              proces: process.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              status: process.status?.toLowerCase() || 'čeka',
              start: process.plannedStart,
              end: process.plannedEnd,
              actualStart: process.actualStart,
              actualEnd: process.actualEnd,
              progress: process.progress || 0,
              projectId: project.id,
              projectName: project.name,
              owner: process.owner?.name,
              notes: process.notes,
              urgency: 'normal'
            }));

            allTasks.push(...positionTasks);
            allPositions.push(position.id);
          });
        }

        // Add project documents
        if (project.documents) {
          allDocuments.push(...project.documents.map(doc => ({
            ...doc,
            projectId: project.id,
            projectName: project.name
          })));
        }

        // Add project history
        if (project.history) {
          allHistory.push(...project.history.map(event => ({
            ...event,
            projectId: project.id,
            projectName: project.name,
            timestamp: event.date,
            naslov: event.title,
            opis: event.details,
            type: event.type
          })));
        }
      });

      return {
        id: ALL_PROJECTS_ID,
        name: 'Svi projekti',
        tasks: allTasks,
        pozicije: Array.from(new Set(allPositions)),
        events: allEvents,
        history: allHistory,
        documents: allDocuments,
        subtasksByPosition: {}
      };
    } else {
      // Single project view
      const project = data.projects.find(p => p.id === activeProjectId);
      if (!project) {
        // Return the first project if active not found
        const firstProject = data.projects[0];
        if (!firstProject) return null;
        
        // Update active project in data
        setData(prev => ({ ...prev, activeProjectId: firstProject.id }));
        return null; // Will re-render with correct activeProjectId
      }

      // Convert canonical v5 project structure to component format
      const projectTasks = [];
      const projectPositions = [];

      if (project.positions) {
        project.positions.forEach(position => {
          projectPositions.push(position.id);

          // Create tasks from position processes
          const positionTasks = (position.processes || []).map(process => ({
            id: `${project.id}-${position.id}-${process.name}`,
            naziv: `${position.title} - ${process.name}`,
            pozicija: position.id,
            proces: process.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            status: process.status?.toLowerCase() || 'čeka',
            start: process.plannedStart,
            end: process.plannedEnd,
            actualStart: process.actualStart,
            actualEnd: process.actualEnd,
            progress: process.progress || 0,
            projectId: project.id,
            projectName: project.name,
            owner: process.owner?.name,
            notes: process.notes,
            urgency: 'normal'
          }));

          projectTasks.push(...positionTasks);
        });
      }

      return {
        ...project,
        tasks: projectTasks,
        pozicije: projectPositions,
        events: [],
        history: (project.history || []).map(event => ({
          ...event,
          timestamp: event.date,
          naslov: event.title,
          opis: event.details,
          type: event.type
        })),
        subtasksByPosition: {}
      };
    }
  }, [data, activeProjectId, isAllProjectsView]);

  // Memoize project list for ProjectSelector to ensure it updates when data changes
  const memoizedProjects = useMemo(() => {
    return data?.projects || [];
  }, [data?.projects]);


  const [viewMode, setViewMode] = useState('pozicije');
  const [zoom, setZoom] = useState('week');
  const [selectedTask, setSelectedTask] = useState(null);
  const [hoveredTask, setHoveredTask] = useState(null);
  const [hoverLevel, setHoverLevel] = useState(0);
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [timeExtent, setTimeExtent] = useState({ left: 60, right: 120 });
  const [searchText, setSearchText] = useState('');
  const [processFilters, setProcessFilters] = useState(new Set(PROCESI.map(p => p.id)));
  const [showSettings, setShowSettings] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showSubtasksDrawer, setShowSubtasksDrawer] = useState(false);
  const [showDocumentsManager, setShowDocumentsManager] = useState(false);
  const [showPositionHistory, setShowPositionHistory] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(null);

  const [indicatorFilters, setIndicatorFilters] = useState(new Set());

  // Update indicatorFilters when data changes
  useEffect(() => {
    if (data) {
      if (data.indicatorFilters instanceof Set) {
        setIndicatorFilters(data.indicatorFilters);
      } else if (Array.isArray(data.indicatorFilters)) {
        setIndicatorFilters(new Set(data.indicatorFilters));
      }
    }
  }, [data]);
  
  const [settings, setSettings] = useState({
    showPositionInBar: false,
    showIconsInBar: true,
    highlightNoDates: true,
    highlightOverdue: true,
    showTimeline: true,
    openEditorOnTrayClick: false,
    showStatusIndicators: true,
    showProgressPercentage: true,
    enableAnimations: true,
    showUrgencyGlow: true,
    useProjectColors: false
  });

  const [dragState, setDragState] = useState(null);
  
  // Optimistic UI state for drag operations (no database saves during drag)
  const [optimisticUpdates, setOptimisticUpdates] = useState(new Map());
  
  // Cleanup optimistic updates on unmount
  useEffect(() => {
    return () => {
      setOptimisticUpdates(new Map());
    };
  }, []);

  const chartRef = useRef(null);
  const ganttRef = useRef(null);
  const hoverTimer1Ref = useRef(null);
  const hoverTimer2Ref = useRef(null);
  const hoverTimer3Ref = useRef(null);
  const hoverLeaveTimerRef = useRef(null);
  const hoverExpandTimerRef = useRef(null);

  // Project management with ProjectDataService
  const selectProject = useCallback(async (projectId) => {
    try {
      if (!data) {
        console.warn('Cannot select project: data not loaded yet');
        return;
      }

      // Update activeProjectId in the data and persist it
      const updatedData = { ...data, activeProjectId: projectId };
      await projectService.saveAllProjects(updatedData);
      
      // Update local state immediately for responsive UI
      setData(updatedData);
      setSelectedTask(null);
      setHoveredTask(null);
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to select project:', err);
      setError(err.message);
    }
  }, [projectService, data]);

  const deleteProject = useCallback(async (projectId) => {
    try {
      await projectService.deleteProject(projectId);
      // Data will be refreshed via subscription
    } catch (err) {
      console.error('Failed to delete project:', err);
      setError(err.message);
    }
  }, [projectService]);

  // Helper function to update a position process (task) in a project
  const updatePositionProcess = useCallback(async (projectId, positionId, processName, updates) => {
    try {
      await projectService.updateProcessInPosition(projectId, positionId, processName, updates);
      // Data will be refreshed via subscription
    } catch (err) {
      console.error('Failed to update position process:', err);
      setError(err.message);
    }
  }, [projectService]);

  // Event handling - Updated to work with canonical v5 structure
  const addEvent = useCallback(async (event, projectId = null) => {
    try {
      const targetProjectId = projectId || (isAllProjectsView ? null : activeProjectId);
      
      if (!targetProjectId) {
        console.warn("Cannot add event: Project ID missing or invalid context.");
        return;
      }

      // Add event to project history
      const historyEntry = {
        id: projectService.generateId('h'),
        date: new Date().toISOString(),
        type: event.type || 'manual',
        title: event.naslov || event.title || 'Event added',
        details: event.opis || event.details || ''
      };

      const project = await projectService.getProject(targetProjectId);
      if (project) {
        const updatedHistory = [...(project.history || []), historyEntry];
        await projectService.updateProject(targetProjectId, { history: updatedHistory });
      }
    } catch (err) {
      console.error('Failed to add event:', err);
      setError(err.message);
    }
  }, [activeProjectId, isAllProjectsView, projectService]);

  // Task Management for canonical v5 structure (replaces old subtask system)
  const addSubtask = useCallback(async (position, subtask, projectId = null) => {
    try {
      const targetProjectId = projectId || (isAllProjectsView ? null : activeProjectId);
      
      if (!targetProjectId) {
        alert("Molimo odaberite specifičan projekt za dodavanje zadatka.");
        return;
      }

      // Add task to position using the new service
      await projectService.addTaskToPosition(targetProjectId, position, subtask);
      
      // Add event to history
      await addEvent({
        type: 'task',
        title: 'Dodan zadatak',
        details: `Pozicija: ${position} • ${subtask.title}`
      }, targetProjectId);
    } catch (err) {
      console.error('Failed to add task:', err);
      setError(err.message);
    }
  }, [activeProjectId, isAllProjectsView, projectService, addEvent]);

  // Helper to resolve projectId for task operations
  const resolveSubtaskProjectId = useCallback((position, id, providedProjectId) => {
    if (providedProjectId) return providedProjectId;
    if (!isAllProjectsView) return activeProjectId;
    
    // For canonical v5, parse ID to get project info
    // Project ID format: "PRJ-YYYY-MMDD" (3 parts)
    // Example task ID: "PRJ-2025-0101-PZ-01-Prodaja"
    const parts = id.split('-');
    if (parts.length >= 3) {
      return parts.slice(0, 3).join('-'); // "PRJ-2025-0101"
    }
    return null;
  }, [activeProjectId, isAllProjectsView]);

  const toggleSubtaskDone = useCallback(async (position, id, projectId = null) => {
    try {
      const targetProjectId = resolveSubtaskProjectId(position, id, projectId);
      if (!targetProjectId) {
        console.warn("Cannot toggle task: Project ID could not be resolved.");
        return;
      }

      // Parse task ID to get position and process info
      // Format: ${projectId}-${positionId}-${processName}
      // Example: "PRJ-2025-0101-PZ-01-Prodaja"
      
      // Find the last hyphen to separate process name
      const lastHyphenIndex = id.lastIndexOf('-');
      if (lastHyphenIndex === -1) {
        console.warn('Invalid task ID format - no hyphens:', id);
        return;
      }
      
      const processName = id.slice(lastHyphenIndex + 1);
      const remainingPart = id.slice(0, lastHyphenIndex);
      
      // Find where project ID ends and position ID begins
      // Project ID format: "PRJ-YYYY-MMDD" (3 parts)
      const parts = remainingPart.split('-');
      if (parts.length < 4) {
        console.warn('Invalid task ID format - insufficient parts:', id);
        return;
      }
      
      const positionId = parts.slice(3).join('-'); // "PZ-01"
      
      
      if (positionId && processName) {
        // Toggle task completion via process update
        const position = await projectService.getPosition(targetProjectId, positionId);
        if (position) {
          const process = position.processes?.find(p => p.name === processName);
          if (process) {
            const newProgress = process.progress >= 100 ? 0 : 100;
            const newStatus = newProgress >= 100 ? 'Završeno' : 'U tijeku';
            await updatePositionProcess(targetProjectId, positionId, processName, {
              progress: newProgress,
              status: newStatus,
              actualStart: process.actualStart || new Date().toISOString(),
              actualEnd: newProgress >= 100 ? new Date().toISOString() : null
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setError(err.message);
    }
  }, [resolveSubtaskProjectId, projectService, updatePositionProcess]);

  const deleteSubtask = useCallback(async (position, id, projectId = null) => {
    try {
      console.log('Delete task operation:', { position, id, projectId });
      // Implementation would handle task deletion in canonical v5 structure
      // For now, just log the operation
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError(err.message);
    }
  }, []);

  // Task updating function - needs to be defined before updateSubtask
  const updateTask = useCallback(async (id, updates, projectId = null) => {
    try {
      // Parse the task ID to extract project, position, and process info
      // Format: ${projectId}-${positionId}-${processName}
      // Example: "PRJ-2025-0101-PZ-01-Prodaja"
      
      // Find the last hyphen to separate process name
      const lastHyphenIndex = id.lastIndexOf('-');
      if (lastHyphenIndex === -1) {
        console.warn('Invalid task ID format - no hyphens:', id);
        return;
      }
      
      const processName = id.slice(lastHyphenIndex + 1);
      const remainingPart = id.slice(0, lastHyphenIndex);
      
      // Find where project ID ends and position ID begins
      // Project ID format: "PRJ-YYYY-MMDD" (3 parts)
      // So we need to find the 3rd hyphen from the start
      const parts = remainingPart.split('-');
      if (parts.length < 4) {
        console.warn('Invalid task ID format - insufficient parts:', id);
        return;
      }
      
      const taskProjectId = parts.slice(0, 3).join('-'); // "PRJ-2025-0101"
      const positionId = parts.slice(3).join('-'); // "PZ-01"
      
      if (!taskProjectId || !positionId || !processName) {
        console.warn('Invalid task ID format:', id, { taskProjectId, positionId, processName });
        return;
      }


      // Use provided projectId or extract from task ID
      const targetProjectId = projectId || taskProjectId;

      // Convert updates to process format
      const processUpdates = {};
      if (updates.start) processUpdates.plannedStart = updates.start;
      if (updates.end) processUpdates.plannedEnd = updates.end;
      if (updates.actualStart) processUpdates.actualStart = updates.actualStart;
      if (updates.actualEnd) processUpdates.actualEnd = updates.actualEnd;
      if (updates.progress !== undefined) processUpdates.progress = updates.progress;
      if (updates.status) processUpdates.status = updates.status;
      if (updates.notes) processUpdates.notes = updates.notes;
      if (updates.owner) {
        processUpdates.owner = typeof updates.owner === 'string' 
          ? { id: 'u1', name: updates.owner, email: '' }
          : updates.owner;
      }

      await updatePositionProcess(targetProjectId, positionId, processName, processUpdates);
    } catch (err) {
      console.error('Failed to update task:', err);
      setError(err.message);
    }
  }, [updatePositionProcess]);

  const updateSubtask = useCallback(async (position, id, updates, projectId = null) => {
    try {
      // Use the existing updateTask function
      await updateTask(id, updates, projectId);
    } catch (err) {
      console.error('Failed to update task:', err);
      setError(err.message);
    }
  }, [updateTask]);

  // Document Management for canonical v5 structure
  const updateDocument = useCallback(async (docId, updates) => {
    try {
      console.log('Update document:', docId, updates);
      // For canonical v5, documents are stored at project level
      // This would be implemented with ProjectDataService
      // For now, just log the operation
    } catch (err) {
      console.error('Failed to update document:', err);
      setError(err.message);
    }
  }, []);

  const deleteDocument = useCallback(async (docId) => {
    try {
      console.log('Delete document:', docId);
      // For canonical v5, this would be implemented with ProjectDataService
      // For now, just log the operation
    } catch (err) {
      console.error('Failed to delete document:', err);
      setError(err.message);
    }
  }, []);

  const log = (message) => console.log(`[Voice Launcher] ${message}`);

  const loadProcessesByScope = useCallback(async (scope = 'sve') => {
    console.log('[Voice Launcher] loadProcessesByScope called with scope:', scope);
    const res = await fetch('/all_projects_2025-09-02T23-56-55.json');
    const all = await res.json();
    const key = normalise(scope);
    const selected = [];

    console.log('[Voice Launcher] Normalized key:', key);
    const scopeDef = SCOPES.find(s => s.key === key);
    console.log('[Voice Launcher] Found scope definition:', scopeDef?.key);
    const matchProc = (proc) => {
      if (!scopeDef || !scopeDef.matchers) return true;
      const name = normalise(proc?.name || '');
      const tags = (proc?.tags || []).map(normalise);
      const nOk = scopeDef.matchers.name?.some(rx => rx.test(name));
      const tOk = scopeDef.matchers.tags?.some(rx => tags.some(t => rx.test(t)));
      return !!(nOk || tOk);
    };

    all?.projects?.forEach(project => {
      project?.positions?.forEach(pozicija => {
        pozicija?.processes?.forEach(process => {
          if (matchProc(process)) {
            selected.push({ project, pozicija, process, id: `${project.id}-${pozicija.id}-${process.name||'PROC'}` });
          }
        });
      });
    });

    const title = scopeDef?.title || `Svi procesi: ${key}`;
    console.log('[Voice Launcher] Selected process names:', selected.map(s => s.process.name));
    return {
      project: { id: `ALL-${key.toUpperCase()}-PROCESSES`, name: title, description: `Prikaz ${selected.length} procesa (${key})` },
      pozicije: selected.map(item => ({
        id: item.id,
        naziv: `${item.project.name} – ${item.pozicija.title}`,
        montaza: {
          opis: `${item.process.name} za ${item.pozicija.title} (${item.project.client?.name || 'N/A'})`,
          osoba: item.process.owner?.name || 'Nepoznato',
          datum_pocetka: item.process.plannedStart,
          datum_zavrsetka: item.process.plannedEnd,
          status: item.process.status,
          progress: item.process.progress || 0,
          actualStart: item.process.actualStart,
          actualEnd: item.process.actualEnd,
          notes: item.process.notes || '',
          projectId: item.project.id,
          pozicijaId: item.pozicija.id,
          clientName: item.project.client?.name
        }
      })),
      metadata: { version: '2.0', source: 'all_projects_2025-09-02T23-56-55.json', processCount: selected.length, loadedAt: new Date().toISOString() }
    };
  }, []);

  // Helper to extract process name from position ID
  const extractProcessName = (positionId) => {
    // Format: ${projectId}-${positionId}-${processName}
    const parts = positionId.split('-');
    return parts[parts.length - 1] || 'Proces';
  };

  const initializeGanttByScope = useCallback(async (scope) => {
    console.log('[Voice Launcher] initializeGanttByScope called with scope:', scope);
    const scopeData = await loadProcessesByScope(scope);
    console.log('[Voice Launcher] loadProcessesByScope returned:', scopeData.pozicije.length, 'positions');
    console.log('[Voice Launcher] First position process names:', scopeData.pozicije.slice(0, 3).map(p => extractProcessName(p.id)));
    
    // Convert to format expected by main component
    const formattedData = {
      version: '5.0',
      exportDate: new Date().toISOString(),
      activeProjectId: ALL_PROJECTS_ID, // Use standard ALL_PROJECTS_ID for aggregated view
      projects: [{
        id: scopeData.project.id,
        name: scopeData.project.name,
        description: scopeData.project.description,
        positions: scopeData.pozicije.map(poz => ({
          id: poz.id,
          title: poz.naziv,
          processes: [{
            name: extractProcessName(poz.id), // Extract from ID
            status: poz.montaza.status || 'Čeka',
            plannedStart: poz.montaza.datum_pocetka,
            plannedEnd: poz.montaza.datum_zavrsetka,
            actualStart: poz.montaza.actualStart,
            actualEnd: poz.montaza.actualEnd,
            progress: poz.montaza.progress || 0,
            notes: poz.montaza.notes || '',
            owner: { name: poz.montaza.osoba }
          }]
        }))
      }],
      meta: scopeData.metadata
    };
    
    setData(formattedData);
    setIsDataLoaded(true);
    setLoading(false);
    if (scopeData.pozicije?.length) setActiveLineId(scopeData.pozicije[0].id);
    
    log(`✅ Učitano ${scopeData.pozicije.length} procesa za scope: ${scope}`);
  }, [loadProcessesByScope, log]);

  // Voice command processing with wake-word detection (GVAv2 pattern)
  useEffect(() => {
    if (!agent.isListening) return;
    
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'hr-HR';
    
    const onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const t = result[0].transcript.toLowerCase().trim();
          
          // Wake word detection (same as GVAv2)
          if (!focusMode && /\bagent\b/.test(t)) {
            setFocusMode(true);
            log('🎯 Focus Mode aktiviran - Agent je spreman za glasovne naredbe');
            
            // Add stage to agent (same as GVAv2)
            agent.addStage({
              id: `focus-${Date.now()}`,
              name: 'Focus Mode aktiviran',
              description: 'Agent je detektirao "agent" wake word',
              icon: '🎯',
              status: 'completed',
              timestamp: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              params: { wakeWord: 'agent', command: t }
            });
            
            // Background highlight effect
            setTimeout(() => window.dispatchEvent(new CustomEvent('bg:highlight', { detail: { durationMs: 800 } })), 0);
            return;
          }
          
          // In focus mode, process commands
          if (focusMode) {
            agent.processTextCommand(t, (modification) => {
              // Handle gantt modifications here
              console.log('Gantt modification:', modification);
            });
          }
        }
      }
    };
    
    const onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        log('Mikrofon nije dostupan. Molimo dozvolite pristup mikrofonu.');
      }
    };
    
    rec.onresult = onresult;
    rec.onerror = onerror;
    rec.start();
    
    return () => {
      try { rec.stop(); } catch {}
    };
  }, [agent.isListening, focusMode, agent, log]);

  // Exit focus mode via Escape key (GVAv2 pattern)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && focusMode) {
        try { agent.stopListening(); } catch {}
        setFocusMode(false);
        log('❌ Focus Mode završen (Escape)');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, agent, log]);

  const timeline = useMemo(() => {
    // Use currentViewData with null check
    const validTasks = currentViewData?.tasks ? currentViewData.tasks.filter(t => t.start && t.end) : [];
    if (!validTasks.length) {
      const today = new Date();
      return { start: addDays(today, -30), end: addDays(today, 60) };
    }
    const dates = validTasks.flatMap(t => [new Date(t.start), new Date(t.end)]);
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    return { start: addDays(min, -timeExtent.left), end: addDays(max, timeExtent.right) };
  }, [currentViewData?.tasks, timeExtent]);

  const dayWidth = useMemo(() => zoom === 'day' ? 80 : zoom === 'week' ? 30 : 10, [zoom]);
  const totalDays = daysBetween(timeline.start, timeline.end);

  const filteredTasks = useMemo(() => {
    // Use currentViewData with null check
    return (currentViewData?.tasks || []).filter(t => {
      if (!processFilters.has(t.proces)) return false;
      // Include projectName in search
      if (searchText && !(`${t.pozicija} ${t.naziv} ${t.projectName || ''}`.toLowerCase().includes(searchText.toLowerCase()))) return false;
      if (indicatorFilters.size > 0) {
        const hasComments = (t.komentari?.length || 0) > 0;
        const hasDocs = (t.prilozi?.length || 0) > 0;
        const hasDescription = t.opis && t.opis.length > 0;
        const hasSubtasks = (currentViewData?.subtasksByPosition?.[t.pozicija]?.length || 0) > 0;
        if (indicatorFilters.has('comments') && !hasComments) return false;
        if (indicatorFilters.has('docs') && !hasDocs) return false;
        if (indicatorFilters.has('description') && !hasDescription) return false;
        if (indicatorFilters.has('subtasks') && !hasSubtasks) return false;
      }
      return true;
    });
  }, [currentViewData?.tasks, currentViewData?.subtasksByPosition, processFilters, searchText, indicatorFilters]);

  const { groups, flatRows } = useMemo(() => {
    const grouped = new Map();
    filteredTasks.forEach(task => {
      const key = viewMode === 'pozicije' ? task.pozicija : task.proces;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(task);
    });
    grouped.forEach(tasks => tasks.sort((a, b) => (!a.start || !b.start) ? 0 : (new Date(a.start) - new Date(b.start))));
    const groupsArr = Array.from(grouped.entries()).map(([name, tasks]) => ({
      name,
      displayName: viewMode === 'procesi' ? (PROCESI.find(p => p.id === name)?.naziv || name) : name,
      tasks
    }));

    let rowIndex = 0;
    const rows = [];
    groupsArr.forEach(g => {
      rows.push({ type: 'header', key: `h-${g.name}`, group: g, rowIndex: rowIndex++ });
      g.tasks.forEach(t => rows.push({ type: 'task', key: t.id, task: t, rowIndex: rowIndex++ }));
    });
    return { groups: groupsArr, flatRows: rows };
  }, [filteredTasks, viewMode]);

  const chartHeight = flatRows.length * ROW_H;

  const [viewport, setViewport] = useState({ left: 0, top: 0, width: 1000, height: 600 });

  const scrollHandler = useCallback(() => {
    const el = chartRef.current;
    if (!el) return;
    setViewport({ left: el.scrollLeft, top: el.scrollTop, width: el.clientWidth, height: el.clientHeight });
  }, []);

  const onScrollRaf = useRafThrottle(scrollHandler);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    
    scrollHandler();

    el.addEventListener('scroll', onScrollRaf, { passive: true });
    window.addEventListener('resize', onScrollRaf);
    return () => {
      el.removeEventListener('scroll', onScrollRaf);
      window.removeEventListener('resize', onScrollRaf);
    };
  }, [onScrollRaf, scrollHandler]);

  const visibleDayStart = Math.max(0, Math.floor(viewport.left / dayWidth) - OVERSCAN_DAYS);
  const visibleDayEnd = Math.min(totalDays, Math.ceil((viewport.left + viewport.width) / dayWidth) + OVERSCAN_DAYS);
  const visibleRowStart = Math.max(0, Math.floor(viewport.top / ROW_H) - OVERSCAN_ROWS);
  const visibleRowEnd = Math.min(flatRows.length, Math.ceil((viewport.top + viewport.height) / ROW_H) + OVERSCAN_ROWS);

  const pushToHistory = useCallback(() => {
    // History (Undo/Redo) is not implemented in this version.
  }, []);

  // const undo = useCallback(() => {
  //   // Not implemented
  // }, []);

  // const redo = useCallback(() => {
  //   // Not implemented
  // }, []);

  // Persistence (useEffect for localStorage) is intentionally omitted for clean slate on refresh.

  // Task bar rendering
  const TaskBar = useMemo(() => {
    return React.memo(function TaskBarInner({ task, rowIndex }) {
      const missing = !task.start || !task.end;
      const status = STATUSI[task.status] || STATUSI['čeka'];
      const urgency = URGENCY_LEVELS[task.urgency || 'normal'];
      const proces = PROCESI.find(p => p.id === task.proces);
      const isSelected = selectedTask?.id === task.id;
      const isHovered = hoveredTask?.id === task.id;
      const isDragging = dragState?.id === task.id;
      
      // Apply optimistic updates during drag
      const optimisticUpdate = optimisticUpdates.get(task.id);
      const effectiveTask = optimisticUpdate ? { ...task, ...optimisticUpdate } : task;
      
      const startDays = effectiveTask.start ? daysBetween(timeline.start, new Date(effectiveTask.start)) : 0;
      const endDays = effectiveTask.end ? daysBetween(timeline.start, new Date(effectiveTask.end)) : 1;
      const x = startDays * dayWidth;
      const width = Math.max((endDays - startDays) * dayWidth, 20);
      const y = rowIndex * ROW_H + 4;
      const height = ROW_H - 8;
      const hasComments = task.komentari?.length > 0;
      const hasDocs = task.prilozi?.length > 0;
      const hasDescription = task.opis && task.opis.length > 0;
      // Use currentViewData
      const hasSubtasks = (currentViewData?.subtasksByPosition?.[task.pozicija]?.length || 0) > 0;
      
      // Use task.projectName for color generation
      const projectColor = generateProjectColor(task.projectName || '');
      
      // Use settings to decide color scheme
      const useProjectColors = settings.useProjectColors;

      if (missing) {
        if (rowIndex < visibleRowStart || rowIndex > visibleRowEnd) return null;
        return (
          <div key={task.id} className="absolute" style={{ left: 10, top: `${rowIndex*ROW_H+4}px`, width: 220, height }}>
            <div className="h-full bg-red-500 rounded-lg border-2 border-red-600 flex items-center px-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-white mr-2" />
              <span className="text-xs font-bold text-white">NEMA DATUM!</span>
            </div>
          </div>
        );
      }
      
      const startDayIdx = Math.floor(x / dayWidth);
      const endDayIdx = Math.ceil((x + width) / dayWidth);
      if (rowIndex < visibleRowStart || rowIndex > visibleRowEnd) return null;
      if (endDayIdx < visibleDayStart || startDayIdx > visibleDayEnd) return null;
      
      const onClickBar = () => {
        if (settings.openEditorOnTrayClick) setEditingTask(task);
        else setSelectedTask(task);
      };
      
      const glowClass = settings.showUrgencyGlow && task.urgency ? 
        task.urgency === 'critical' ? 'glow-critical' :
        task.urgency === 'high' ? 'glow-high' :
        task.urgency === 'medium' ? 'glow-medium' : ''
        : '';
      
      return (
        <>
          {settings.showProgressPercentage && (
            <div 
              className="absolute select-none" 
              style={{ 
                left: Math.max(0, x - 22), 
                top: y, 
                width: 20, 
                height, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-end', 
                opacity: 0.35, 
                fontSize: 10, 
                color: '#475569' 
              }}
            >
              {task.progress ?? 0}%
            </div>
          )}
          <div 
            className={`absolute ${settings.enableAnimations ?'transition-all duration-150':''} ${isSelected ?'z-20':isHovered ?'z-15':'z-10'} ${isDragging ?'cursor-grabbing opacity-75':'cursor-pointer'} ${glowClass}`} 
            style={{
              left:x,
              top:y,
              width,
              height,
              transform:isHovered && !isDragging && settings.enableAnimations ?'scale(1.02)':'scale(1)',
              contentVisibility:'auto',
              contain:'layout paint size'
            }} 
            onMouseEnter={(e)=>!isDragging && handleTaskHover(task, e.currentTarget)} 
            onMouseLeave={()=>{
              if (!isDragging) {
                handleTaskLeave();
              }
            }} 
            onClick={onClickBar} 
            onMouseDown={(e)=>handleTaskMouseDown(e, task, 'move')}
          >
            <div 
              className={`h-full rounded-lg border-2 overflow-hidden ${isSelected ?'ring-2 ring-blue-500 ring-offset-1':''} ${settings.highlightOverdue && task.status === 'kasni' ? 'animate-pulse' : ''} ${task.proces === 'općenito' && !useProjectColors ? 'rainbow-gradient' : ''}`} 
              style={{
                backgroundColor: useProjectColors ? `${projectColor}20` : status.light,
                borderColor: useProjectColors ? projectColor : 
                           (task.urgency === 'critical' || task.urgency === 'high' ? urgency.bg : status.border),
                background: task.proces === 'općenito' && !useProjectColors ? 
                           'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #fda085 100%)' :
                           (useProjectColors ? `${projectColor}20` : status.light)
              }}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 opacity-30 pointer-events-none" 
                style={{ 
                  width: `${task.progress || 0}%`, 
                  backgroundColor: useProjectColors ? projectColor : status.bg
                }} 
              />
              <div className="relative h-full flex items-center px-2">
                {settings.showIconsInBar && proces && (
                  <proces.ikona className="w-3 h-3 mr-1.5 flex-shrink-0" 
                    style={{ color: useProjectColors ? projectColor : 
                            (typeof proces.boja === 'string' && proces.boja.includes('gradient') ? '#764ba2' : proces.boja) }} 
                  />
                )}
                <span 
                  className={`inline-block w-1.5 h-1.5 mr-1 rounded-full ${task.status === 'kasni' ? 'pulse-strong' : ''}`} 
                  style={{ backgroundColor: status.bg }} 
                />
                <span className={`text-xs font-medium truncate ${task.proces === 'općenito' && !useProjectColors ? 'text-white' : 'text-slate-700'}`}>
                  {task.naziv}{settings.showPositionInBar ? ` - ${task.pozicija.slice(0, 18)}` : ''}
                </span>
                {/* Optionally show Project Name in aggregated view if needed, but might clutter */}
              </div>
              <div 
                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/30" 
                onMouseDown={(e)=>{e.stopPropagation();handleTaskMouseDown(e, task, 'resize-left');}} 
              />
              <div 
                className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-blue-500/30" 
                onMouseDown={(e)=>{e.stopPropagation();handleTaskMouseDown(e, task, 'resize-right');}} 
              />
            </div>
          </div>
          {settings.showStatusIndicators && (
            <div 
              className="absolute" 
              style={{ 
                left: x + width + 6, 
                top: y, 
                height, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6 
              }}
            >
              <MessageSquare 
                className={`w-3 h-3 cursor-pointer transition-all ${indicatorFilters.has('comments') ? 'scale-125' : ''}`} 
                style={{
                  opacity: hasComments ? 0.9 : 0.3, 
                  color: hasComments ? '#2563eb' : '#94a3b8', 
                  filter: indicatorFilters.has('comments') ? 'drop-shadow(0 0 8px #2563eb)' : 'none'
                }} 
                title={hasComments ? 'Ima komentara' : 'Bez komentara'} 
                onClick={(e) => { e.stopPropagation(); toggleIndicatorFilter('comments'); }} 
              />
              <Paperclip 
                className={`w-3 h-3 cursor-pointer transition-all ${indicatorFilters.has('docs') ? 'scale-125' : ''}`} 
                style={{
                  opacity: hasDocs ? 0.9 : 0.3, 
                  color: hasDocs ? '#16a34a' : '#94a3b8', 
                  filter: indicatorFilters.has('docs') ? 'drop-shadow(0 0 8px #16a34a)' : 'none'
                }} 
                title={hasDocs ? 'Ima priloga' : 'Bez priloga'} 
                onClick={(e) => { e.stopPropagation(); toggleIndicatorFilter('docs'); }} 
              />
              <ScrollText 
                className={`w-3 h-3 cursor-pointer transition-all ${indicatorFilters.has('description') ? 'scale-125' : ''}`} 
                style={{
                  opacity: hasDescription ? 0.9 : 0.3, 
                  color: hasDescription ? '#7c3aed' : '#94a3b8', 
                  filter: indicatorFilters.has('description') ? 'drop-shadow(0 0 8px #7c3aed)' : 'none'
                }} 
                title={hasDescription ? 'Ima opis' : 'Bez opisa'} 
                onClick={(e) => { e.stopPropagation(); toggleIndicatorFilter('description'); }} 
              />
              <ListTodo 
                className={`w-3 h-3 cursor-pointer transition-all ${indicatorFilters.has('subtasks') ? 'scale-125' : ''}`} 
                style={{
                  opacity: hasSubtasks ? 0.9 : 0.3, 
                  color: hasSubtasks ? '#f59e0b' : '#94a3b8', 
                  filter: indicatorFilters.has('subtasks') ? 'drop-shadow(0 0 8px #f59e0b)' : 'none'
                }} 
                title={hasSubtasks ? `${currentViewData?.subtasksByPosition?.[task.pozicija]?.length || 0} podzadataka` : 'Bez podzadataka'} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (hasSubtasks) {
                    openSubtasksForPosition(task.pozicija);
                  } else {
                    toggleIndicatorFilter('subtasks');
                  }
                }} 
              />
            </div>
          )}
        </>
      );
    });
  }, [
    dayWidth, timeline.start, visibleDayStart, visibleDayEnd, visibleRowStart, visibleRowEnd,
    hoveredTask, selectedTask, dragState, settings, indicatorFilters, currentViewData, isAllProjectsView, optimisticUpdates
  ]);

  // Other callbacks
  const handleTaskHover = useCallback((task, element) => {
    clearTimeout(hoverLeaveTimerRef.current);
    const rect = element.getBoundingClientRect();
    setHoveredTask({ ...task, position: { x: rect.right + 10, y: rect.top } });
    setHoverLevel(1); // Pokazuje mali hover
    setIsHoverExpanded(false);
  }, []);
  
  const handleTaskLeave = useCallback(() => {
    // Ako je mali hover - daj kratki delay da miš stigne na hover card
    if (hoverLevel === 1) {
      clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = setTimeout(() => {
        // Provjeri da li se u međuvremenu hover nije proširio
        if (hoverLevel === 1) {
          setHoveredTask(null);
          setHoverLevel(0);
          setIsHoverExpanded(false);
        }
      }, 200); // Kratki delay da stigneš miš dovesti na hover
    }
    // Ako je veliki hover - ne radi ništa, jer ga kontrolira hover card
  }, [hoverLevel]);

  // Nove funkcije za hover card interakciju
  const handleHoverCardEnter = useCallback(() => {
    clearTimeout(hoverLeaveTimerRef.current);
    clearTimeout(hoverExpandTimerRef.current);
    // Kada miš dođe na hover card, proširi ga
    if (hoverLevel === 1) {
      hoverExpandTimerRef.current = setTimeout(() => {
        setHoverLevel(2);
      }, HOVER_EXPAND_DELAY);
    }
  }, [hoverLevel]);

  const handleHoverCardLeave = useCallback(() => {
    clearTimeout(hoverExpandTimerRef.current);
    // Ako je ekspandovan, zadrži ga kratko
    if (!isHoverExpanded) {
      hoverLeaveTimerRef.current = setTimeout(() => {
        setHoveredTask(null);
        setHoverLevel(0);
      }, HOVER_LEAVE_DELAY);
    }
  }, [isHoverExpanded]);

  // Funkcija za ekspandiranje hover-a umjesto otvaranja popup-a
  const handleExpandHover = useCallback(() => {
    setIsHoverExpanded(true);
    setHoverLevel(3); // Prebaci u puni hover mode sa svim opcijama
  }, []);

  const handleCloseExpandedHover = useCallback(() => {
    setIsHoverExpanded(false);
    setHoveredTask(null);
    setHoverLevel(0);
  }, []);


  const handleTaskMouseDown = useCallback((e, task, mode) => {
    if (!task.start || !task.end) return;
    e.preventDefault();
    e.stopPropagation();
    pushToHistory();
    const startDays = daysBetween(timeline.start, new Date(task.start));
    const endDays = daysBetween(timeline.start, new Date(task.end));
    setDragState({ 
      id: task.id, 
      mode, 
      startX: e.clientX, 
      startDays, 
      endDays, 
      originalTask: { ...task } // Ensure originalTask includes projectId
    });
  }, [timeline.start, pushToHistory]);

  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;
    const deltaX = e.clientX - dragState.startX;
    const deltaDays = Math.round(deltaX / dayWidth);
    if (deltaDays === 0 && e.type !== 'mouseup') return;
    
    let newStart, newEnd;
    if (dragState.mode === 'move') {
      newStart = formatDate(addDays(timeline.start, dragState.startDays + deltaDays));
      newEnd = formatDate(addDays(timeline.start, dragState.endDays + deltaDays));
    } else if (dragState.mode === 'resize-left') {
      const newStartDays = dragState.startDays + deltaDays;
      if (newStartDays >= dragState.endDays) return;
      newStart = formatDate(addDays(timeline.start, newStartDays));
      newEnd = dragState.originalTask.end;
    } else if (dragState.mode === 'resize-right') {
      const newEndDays = dragState.endDays + deltaDays;
      if (newEndDays <= dragState.startDays) return;
      newStart = dragState.originalTask.start;
      newEnd = formatDate(addDays(timeline.start, newEndDays));
    }
    
    // OPTIMISTIC UPDATE: Update UI immediately, no database save during drag
    setOptimisticUpdates(prev => new Map(prev.set(dragState.id, {
      start: newStart,
      end: newEnd,
      isDragging: true
    })));

  }, [dragState, dayWidth, timeline.start]);

  const throttledHandleMouseMove = useRafThrottle(handleMouseMove);

  const handleMouseUp = useCallback(async () => {
    if (!dragState) return;
    
    // Get the final optimistic update
    const finalUpdate = optimisticUpdates.get(dragState.id);
    
    if (finalUpdate && finalUpdate.isDragging) {
      // SAVE TO DATABASE: Only happens once when drag ends
      const targetProjectId = dragState.originalTask.projectId;
      
      if (targetProjectId) {
        try {
          await updateTask(dragState.id, { 
            start: finalUpdate.start, 
            end: finalUpdate.end 
          }, targetProjectId);
          
          console.log('✅ Drag completed - saved to database');
          
          // Add event to history
          const originalTask = dragState.originalTask;
          addEvent({
            id: `e${Date.now()}`, 
            date: formatDate(new Date()), 
            type: 'promjena',
            naslov: `Promijenjeno trajanje`, 
            opis: `${originalTask.naziv} - ${originalTask.pozicija}`
          }, targetProjectId);
          
        } catch (error) {
          console.error('Failed to save drag changes:', error);
          // Could show user notification here
        }
      } else {
        console.warn("Cannot determine project ID during drag operation.");
      }
    }
    
    // Clean up drag state and optimistic updates
    setDragState(null);
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(dragState.id);
      return newMap;
    });
  }, [dragState, optimisticUpdates, updateTask, addEvent]);

  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', throttledHandleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', throttledHandleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, throttledHandleMouseMove, handleMouseUp]);

  const toggleIndicatorFilter = useCallback((type) => {
    setIndicatorFilters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        if (newSet.size === 1) return new Set();
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const openSubtasksForPosition = useCallback(() => {
    setShowSubtasksDrawer(true);
  }, []);

  // Updated logic for filter button toggle behavior (Fixes requirement)
  const toggleProcessFilters = useCallback(() => {
    // Logic:
    // 1. If any filter is active (search, indicators, or processes restricted), clear them all (Show Everything).
    // 2. If no filters are active (Everything is shown), restrict processes (hide all processes) so the user can enable them one by one.

    const searchActive = searchText !== '';
    const indicatorsActive = indicatorFilters.size > 0;
    const processesRestricted = processFilters.size < PROCESI.length;

    if (searchActive || indicatorsActive || processesRestricted) {
        // State 1: Clear all filters (Show everything)
        setSearchText('');
        setIndicatorFilters(new Set());
        setProcessFilters(new Set(PROCESI.map(p => p.id))); // Enable all process checkboxes
    } else {
        // State 2: Everything is shown. Now hide all processes.
        // Search and Indicators remain cleared.
        setProcessFilters(new Set()); // Disable all process checkboxes
    }

  }, [processFilters, searchText, indicatorFilters]);

  const navigateToDate = useCallback((date) => {
    const target = new Date(date);
    const days = daysBetween(timeline.start, target);
    const scrollPos = days * dayWidth;
    if (chartRef.current) chartRef.current.scrollLeft = Math.max(0, scrollPos - 100);
  }, [timeline.start, dayWidth]);

  const navigateByPeriod = useCallback((direction) => {
    const current = chartRef.current?.scrollLeft || 0;
    const offset = zoom === 'day' ? dayWidth : zoom === 'week' ? dayWidth * 7 : dayWidth * 30;
    if (chartRef.current) chartRef.current.scrollLeft = Math.max(0, direction === 'forward' ? current + offset : current - offset);
  }, [zoom, dayWidth]);

  const fitToView = useCallback(() => {
    const valid = filteredTasks.filter(t => t.start && t.end);
    if (!valid.length) return;
    const dates = valid.flatMap(t => [new Date(t.start), new Date(t.end)]);
    const min = new Date(Math.min(...dates)); 
    const max = new Date(Math.max(...dates));
    const duration = daysBetween(min, max);
    if (duration <= 30) setZoom('day'); 
    else if (duration <= 90) setZoom('week'); 
    else setZoom('month');
    setTimeExtent({ left: 7, right: 7 });
    setTimeout(() => navigateToDate(formatDate(min)), 100);
  }, [filteredTasks, navigateToDate]);

  const exportAsImage = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Use currentViewData.name
      printWindow.document.write(`<html><head><title>Gantt Chart - ${currentViewData.name} - ${formatDate(new Date())}</title><style>body{font-family:system-ui,-apple-system,sans-serif;}.print-info{margin:20px;}@media print{.no-print{display:none;}}</style></head><body><div class="print-info"><h2>${currentViewData.name} - Gantt Chart</h2><p class="no-print">Ctrl/Cmd+P za PDF</p><p>Datum: ${croatianDateFull(new Date())}</p></div></body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  }, [currentViewData?.name]);

  const exportData = useCallback(async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `all_projects_${timestamp}.json`;
      
      const exportData = await projectService.exportProjectBackup();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); 
      const a = document.createElement('a'); 
      a.href = url; 
      a.download = filename; 
      a.click(); 
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      setError(err.message);
    }
  }, [projectService]);

  const importData = useCallback(async (file) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          const importedData = imported.data || imported;
          
          // Validate and import the data using ProjectDataService
          await projectService.importProjectBackup(importedData, 'replace');
          
          // Success message
          console.log('Data imported successfully');
        } catch (err) { 
          console.error("Import Error:", err);
          setError('Greška pri učitavanju datoteke: ' + err.message);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error("File read error:", err);
      setError('Greška pri čitanju datoteke: ' + err.message);
    }
  }, [projectService]);

  const monthsHeader = useMemo(() => {
    const parts = [];
    let currentMonth = null; 
    let monthStart = visibleDayStart;
    for (let i = visibleDayStart; i < visibleDayEnd; i++) {
      const date = addDays(timeline.start, i);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (currentMonth === null) { 
        currentMonth = key; 
        monthStart = i; 
      }
      if (key !== currentMonth) {
        const width = (i - monthStart) * dayWidth;
        const labelDate = addDays(timeline.start, monthStart);
        parts.push(
          <div 
            key={`${currentMonth}-${i}`} 
            className="border-r px-2 flex items-center" 
            style={{ width }}
          >
            {labelDate.toLocaleDateString('hr-HR', { month: 'long', year: 'numeric' })}
          </div>
        );
        currentMonth = key; 
        monthStart = i;
      }
    }
    if (currentMonth !== null) {
      const width = (visibleDayEnd - monthStart) * dayWidth;
      const labelDate = addDays(timeline.start, monthStart);
      parts.push(
        <div 
          key={`${currentMonth}-last`} 
          className="border-r px-2 flex items-center" 
          style={{ width }}
        >
          {labelDate.toLocaleDateString('hr-HR', { month: 'long', year: 'numeric' })}
        </div>
      );
    }
    return parts;
  }, [visibleDayStart, visibleDayEnd, dayWidth, timeline.start]);

  const openAllSubtasks = useCallback(() => setShowSubtasksDrawer(true), []);

  const memoizedHoverTask = useMemo(() => {
    if (!hoveredTask) return null;
    return {
      ...hoveredTask,
      // Use currentViewData
      subtasksForPosition: (currentViewData?.subtasksByPosition?.[hoveredTask.pozicija] || []),
      onAddSubtask: addSubtask,
      onToggleSubtask: toggleSubtaskDone,
      onDeleteSubtask: deleteSubtask,
      onOpenAllSubtasks: openAllSubtasks,
      onViewHistory: () => setShowPositionHistory(hoveredTask.pozicija)
    };
  }, [hoveredTask, currentViewData?.subtasksByPosition, addSubtask, toggleSubtaskDone, deleteSubtask, openAllSubtasks]);

  // Collect all documents from tasks
  const allDocuments = useMemo(() => {
    const docs = [];
    // Use currentViewData with null check
    (currentViewData?.tasks || []).forEach(task => {
      if (task.prilozi && task.prilozi.length > 0) {
        task.prilozi.forEach(prilog => {
          docs.push({
            ...prilog,
            position: task.pozicija,
            taskId: task.id,
            projectId: task.projectId, // Include projectId
            urgency: prilog.urgency || 'normal'
          });
        });
      }
    });
    // Include project-level documents
    return [...docs, ...(currentViewData?.documents || [])];
  }, [currentViewData?.tasks, currentViewData?.documents]);

  // Show loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Učitavam projekte...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Greška pri učitavanju</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              // Retry loading
              projectService.getGanttData().then(setData).catch(setError).finally(() => setLoading(false));
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Pokušaj ponovno
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!data || !currentViewData) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Database className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Nema podataka za prikaz</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50" ref={ganttRef}>
      <div className="h-14 bg-white border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProjectSelector
            projects={memoizedProjects}
            activeProjectId={data.activeProjectId}
            onSelectProject={selectProject}
            onDeleteProject={deleteProject}
          />
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setViewMode('pozicije')} 
              className={`p-2 rounded-lg text-sm transition-colors flex items-center gap-1 ${viewMode === 'pozicije' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`} 
              title="Po pozicijama"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('procesi')} 
              className={`p-2 rounded-lg text-sm transition-colors flex items-center gap-1 ${viewMode === 'procesi' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`} 
              title="Po procesima"
            >
              <List className="w-4 h-4" />
            </button>
            {/* Disable New Task button in All Projects View */}
            <button 
              onClick={() => setEditingTask({})} 
              disabled={isAllProjectsView}
              className={`p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 transition-colors ml-2 disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isAllProjectsView ? "Nije moguće dodati zadatak u prikazu 'Svi projekti'" : "Novi zadatak"}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg">
            {PROCESI.map(p => (
              <button 
                key={p.id} 
                onClick={() => { 
                  const nf = new Set(processFilters); 
                  nf.has(p.id) ? nf.delete(p.id) : nf.add(p.id); 
                  setProcessFilters(nf); 
                }} 
                className={`p-1.5 rounded transition-all ${processFilters.has(p.id) ? 'text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} 
                style={{ 
                  backgroundColor: processFilters.has(p.id) ? 
                    (p.id === 'općenito' ? '#764ba2' : p.boja) : 
                    'transparent' 
                }} 
                title={p.naziv}
              >
                <p.ikona className="w-4 h-4" />
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg">
            <button 
              onClick={() => toggleIndicatorFilter('comments')} 
              className={`p-1.5 rounded transition-all ${indicatorFilters.has('comments') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} 
              title="Filtriraj po komentarima"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toggleIndicatorFilter('docs')} 
              className={`p-1.5 rounded transition-all ${indicatorFilters.has('docs') ? 'bg-green-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} 
              title="Filtriraj po prilozima"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toggleIndicatorFilter('description')} 
              className={`p-1.5 rounded transition-all ${indicatorFilters.has('description') ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} 
              title="Filtriraj po opisu"
            >
              <ScrollText className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toggleIndicatorFilter('subtasks')} 
              className={`p-1.5 rounded transition-all ${indicatorFilters.has('subtasks') ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} 
              title="Filtriraj po podzadacima"
            >
              <ListTodo className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={toggleProcessFilters} // Use the toggle function
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Ukloni/Primjeni filtere"
            >
              <FilterX className="w-4 h-4" />
            </button>
            <button 
              onClick={exportAsImage} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Izvezi kao sliku"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowSubtasksDrawer(true)} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Prikaži sve podzadatke"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowDocumentsManager(true)} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Upravljanje dokumentima"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  await loadDemoData(projectService);
                } catch (err) {
                  setError('Greška pri učitavanju demo podataka: ' + err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Učitaj demo podatke"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pretraži..." 
              value={searchText} 
              onChange={(e) => setSearchText(e.target.value)} 
              className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => navigateByPeriod('backward')} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg" 
              title={`Prethodni ${zoom === 'day' ? 'dan' : zoom === 'week' ? 'tjedan' : 'mjesec'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input 
              type="date" 
              onChange={(e) => navigateToDate(e.target.value)} 
              className="px-2 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
            />
            <button 
              onClick={() => navigateByPeriod('forward')} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg" 
              title={`Sljedeći ${zoom === 'day' ? 'dan' : zoom === 'week' ? 'tjedan' : 'mjesec'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-1 py-1">
            <button 
              onClick={() => setZoom('day')} 
              className={`px-2 py-1 rounded text-xs transition-colors ${zoom === 'day' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              Dan
            </button>
            <button 
              onClick={() => setZoom('week')} 
              className={`px-2 py-1 rounded text-xs transition-colors ${zoom === 'week' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              Tjedan
            </button>
            <button 
              onClick={() => setZoom('month')} 
              className={`px-2 py-1 rounded text-xs transition-colors ${zoom === 'month' ? 'bg-white shadow-sm' : 'hover:bg-white/50'}`}
            >
              Mjesec
            </button>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Postavke"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={fitToView} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Prikaži sve"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button 
              onClick={exportData} 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" 
              title="Izvezi podatke"
            >
              <Download className="w-4 h-4" />
            </button>
            <label 
              className="p-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" 
              title="Uvezi podatke"
            >
              <Upload className="w-4 h-4" />
              <input 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} 
              />
            </label>
          </div>
        </div>
      </div>
      
      {showSettings && (
        <SettingsPanel 
          settings={settings} 
          onSettingsChange={(s) => { 
            setSettings(s); 
            setShowTimeline(s.showTimeline); 
          }} 
          onClose={() => setShowSettings(false)} 
        />
      )}
      
      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="h-20 border-b px-4 flex items-end pb-2">
            <span className="text-sm font-medium text-slate-600">
              {viewMode === 'pozicije' ? 'Pozicije' : 'Procesi'}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.name}>
                <div className="h-9 px-4 bg-slate-50 border-b flex items-center">
                  <ChevronDown className="w-4 h-4 mr-2 text-slate-500" />
                  <span className="text-sm font-medium truncate">{group.displayName}</span>
                  <button
                    onClick={() => setShowPositionHistory(group.name)}
                    className="ml-auto p-1 hover:bg-slate-200 rounded"
                    title="Povijest pozicije"
                  >
                    <History className="w-3 h-3 text-slate-600" />
                  </button>
                  <span className="ml-2 text-xs text-slate-500">{group.tasks.length}</span>
                </div>
                {group.tasks.map((task) => { 
                  const proces = PROCESI.find(p => p.id === task.proces); 
                  const missingDates = !task.start || !task.end; 
                  const urgency = URGENCY_LEVELS[task.urgency || 'normal'];
                  return (
                    <div 
                      key={task.id} 
                      className={`h-9 px-6 border-b flex items-center hover:bg-slate-50 cursor-pointer ${selectedTask?.id === task.id ?'bg-blue-50':''} ${missingDates && settings.highlightNoDates ? 'bg-red-50' : ''}`} 
                      style={{ height: ROW_H }} 
                      onClick={()=>setSelectedTask(task)}
                    >
                      {proces && (
                        <proces.ikona 
                          className="w-3 h-3 mr-2 flex-shrink-0" 
                          style={{ 
                            color: proces.id === 'općenito' ? '#764ba2' : proces.boja 
                          }} 
                        />
                      )}
                      <span 
                        className={`text-xs truncate flex-1 ${missingDates ? 'text-red-600 font-bold' : ''}`}
                      >
                        {viewMode === 'pozicije' ? task.naziv : task.pozicija}
                      </span>
                      
                      {/* Show Project Color Indicator in All Projects View */}
                      {isAllProjectsView && (
                        <div 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: generateProjectColor(task.projectName || '') }}
                            title={task.projectName}
                        />
                      )}

                      {task.urgency && task.urgency !== 'normal' && (
                        <urgency.icon 
                          className="w-3 h-3 mr-1" 
                          style={{ color: urgency.bg }}
                        />
                      )}
                      <span 
                        className="w-2 h-2 rounded-full ml-2 flex-shrink-0" 
                        style={{ backgroundColor: STATUSI[task.status]?.bg }} 
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-20 bg-white border-b overflow-hidden">
            <div 
              className="h-full" 
              style={{ 
                width: `${(visibleDayEnd-visibleDayStart) * dayWidth}px`, 
                transform: `translateX(${visibleDayStart*dayWidth}px)` 
              }}
            >
              <div className="h-10 border-b flex text-xs font-medium text-slate-600">
                {monthsHeader}
              </div>
              <div className="h-10 flex">
                {Array.from({ length: visibleDayEnd - visibleDayStart }).map((_, idx) => { 
                  const i = visibleDayStart + idx; 
                  const date = addDays(timeline.start, i); 
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6; 
                  const isToday = formatDate(date) === formatDate(new Date()); 
                  return (
                    <div 
                      key={i} 
                      className={`border-r flex items-center justify-center text-xs ${isWeekend ? 'bg-slate-50' : ''} ${isToday ? 'bg-blue-50 font-semibold text-blue-600' : ''}`} 
                      style={{ width: dayWidth }} 
                      title={croatianDateFull(date)}
                    >
                      {zoom === 'day' && (
                        <div className="text-center">
                          <div className="font-medium">{date.getDate()}</div>
                          <div className="text-[10px] text-slate-500">
                            {date.toLocaleDateString('hr-HR', { weekday: 'short' })}
                          </div>
                        </div>
                      )}
                      {zoom === 'week' && date.getDay() === 1 && (
                        <div className="text-center">
                          <div className="font-medium">{date.getDate()}</div>
                          <div className="text-[10px] text-slate-500">
                            {date.toLocaleDateString('hr-HR', { month: 'short' })}
                          </div>
                        </div>
                      )}
                      {zoom === 'month' && date.getDate() === 1 && (
                        <div className="font-medium">{date.getDate()}</div>
                      )}
                    </div>
                  ); 
                })}
              </div>
            </div>
          </div>
          
          <div ref={chartRef} className="flex-1 overflow-auto bg-white relative" style={{ scrollBehavior: 'smooth' }}>
            <div className="relative" style={{ width: `${totalDays * dayWidth}px`, height: `${chartHeight}px` }}>
              {Array.from({ length: visibleDayEnd - visibleDayStart }).map((_, idx) => { 
                const i = visibleDayStart + idx; 
                const date = addDays(timeline.start, i); 
                const isWeekend = date.getDay() === 0 || date.getDay() === 6; 
                const isToday = formatDate(date) === formatDate(new Date()); 
                return ( 
                  <div key={i} className={`absolute top-0 bottom-0 border-r ${isWeekend ? 'bg-slate-50' : ''} ${isToday ? 'bg-blue-50 border-blue-300' : 'border-slate-100'}`} style={{ left: `${i * dayWidth}px`, width: dayWidth }} /> 
                ); 
              })}
              {(() => { 
                const todayDays = daysBetween(timeline.start, new Date()); 
                if (todayDays >= 0 && todayDays <= totalDays) { 
                  const left = todayDays * dayWidth; 
                  if (left >= visibleDayStart * dayWidth - 2 && left <= visibleDayEnd * dayWidth + 2) { 
                    return <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-5" style={{ left }} />; 
                  } 
                } 
              })()}
              {Array.from({ length: Math.max(0, visibleRowEnd - visibleRowStart) }).map((_, idx) => { 
                const rowIdx = visibleRowStart + idx; 
                const row = flatRows[rowIdx]; 
                if (!row) return null; 
                if (row.type === 'header') { 
                  return <div key={row.key} className="absolute left-0 right-0 bg-slate-50 border-b" style={{ top: `${row.rowIndex * ROW_H}px`, height: ROW_H }} />; 
                } 
                return null; 
              })}
              {Array.from({ length: Math.max(0, visibleRowEnd - visibleRowStart) }).map((_, idx) => { 
                const rowIdx = visibleRowStart + idx; 
                const row = flatRows[rowIdx]; 
                if (!row) return null; 
                if (row.type === 'task') { 
                  return <TaskBar key={row.key} task={row.task} rowIndex={row.rowIndex} />; 
                } 
                return null; 
              })}
            </div>
          </div>
        </div>
      </div>
      
      {showTimeline && settings.showTimeline && (
        <div className="h-24 bg-white border-t transition-all">
          <div className="px-4 py-2 h-full">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-medium">Zapisnik događaja</h3>
              <button onClick={() => setShowTimeline(!showTimeline)} className="p-1 hover:bg-slate-100 rounded">
                {showTimeline ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {/* Use currentViewData */}
              {(currentViewData?.events || []).slice(-15).reverse().map(event => { 
                const eventType = EVENT_TYPES[event.type] || EVENT_TYPES['ručno']; 
                return ( 
                  <div key={event.id} className="min-w-[160px] p-2 rounded-lg border bg-slate-50">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventType.bg }} />
                      <span className="text-[10px] font-medium">{eventType.text}</span>
                    </div>
                    <div className="text-[10px] font-medium text-slate-700">{event.naslov}</div>
                    <div className="text-[10px] text-slate-500">{croatianDateFormat(event.date)}</div>
                    {event.opis && <div className="text-[10px] text-slate-600 mt-1">{event.opis}</div>}
                  </div> 
                ); 
              })}
            </div>
          </div>
        </div>
      )}
      
      {showPositionHistory && (
        <PositionHistory
          position={showPositionHistory}
          // Use currentViewData
          history={currentViewData?.history || []}
          onClose={() => setShowPositionHistory(null)}
        />
      )}
      
      {/* Modal rendering order matters if z-index is the same, but explicit z-index is used here. */}
      
      {/* DocumentsManager (z-40) */}
      {showDocumentsManager && (
        <DocumentsManager
          documents={allDocuments}
          onClose={() => setShowDocumentsManager(false)}
          onUpdateDocument={updateDocument}
          onDeleteDocument={deleteDocument}
          onPreview={(doc) => setShowImagePreview(doc)}
        />
      )}

      {/* ImagePreview (z-50) - Will overlay DocumentsManager */}
      {showImagePreview && (
        <ImageCADPreview
          file={showImagePreview}
          onClose={() => setShowImagePreview(null)}
        />
      )}
      
      {showSubtasksDrawer && (
        <SubtasksDrawer
          open={showSubtasksDrawer}
          onClose={() => setShowSubtasksDrawer(false)}
          // Use currentViewData
          subtasksByPosition={currentViewData?.subtasksByPosition || {}}
          onToggle={toggleSubtaskDone}
          onDelete={deleteSubtask}
          onUpdateSubtask={updateSubtask}
          onAddEvent={addEvent}
        />
      )}
      
      {editingTask && (
        <TaskEditorModal
          task={editingTask.id ? editingTask : null}
          // Use currentViewData
          pozicije={currentViewData?.pozicije || []}
          onSave={async (task) => {
            try {
              // Determine the target project for saving the task
              const targetProjectId = task.projectId || (isAllProjectsView ? null : activeProjectId);

              if (!targetProjectId) {
                alert("Nije moguće spremiti zadatak. Nije odabran projekt.");
                return;
              }

              if (editingTask.id) {
                // Update existing task via canonical v5 structure
                await updateTask(task.id, task, targetProjectId);
              } else {
                // For new tasks, we would need to create them in canonical v5 structure
                // This would require adding a process to a position
                console.log("New task creation not implemented for canonical v5 yet:", task);
              }
              
              setEditingTask(null);
            } catch (err) {
              console.error("Failed to save task:", err);
              alert("Greška pri spremanju zadatka: " + err.message);
            }
          }}
          onClose={() => setEditingTask(null)}
          onAddEvent={addEvent}
          projectService={projectService}
          projectId={activeProjectId}
        />
      )}
      
    
      <AnimatePresence>
        {memoizedHoverTask && hoverLevel > 0 && !dragState && (
          <TaskHoverCardRedesign
            open
            task={memoizedHoverTask}
            level={hoverLevel}
            position={memoizedHoverTask?.pozicija}
            projectService={projectService}
            projectId={activeProjectId}
            onClose={() => { setHoveredTask(null); setHoverLevel(0); setIsHoverExpanded(false); }}
            onExpand={() => { 
              clearTimeout(hoverLeaveTimerRef.current); // Obriši timer kad se proširi
              setHoverLevel(2); 
              setIsHoverExpanded(true); 
            }}
            onCollapse={() => { setHoverLevel(1); setIsHoverExpanded(false); }}
            onAddComment={(text) => addComment(text)}
            onAddTask={(title) => addSubtask(memoizedHoverTask?.pozicija, title)}
          />
        )}
      </AnimatePresence>

      <FloatingMicLauncher
        active={voiceLauncherVisible && !focusMode}
        onOpen={() => {
          // UX hint po želji (blur, snack)
        }}
        onRecognized={async (scope) => {
          if (!scope) {
            log('Nije prepoznato "Gant". Reci: Gant prodaja/proizvodnja/općenito.');
            return;
          }
          await initializeGanttByScope(scope);
          setVoiceLauncherVisible(false);

          // Ključ: odmah slušaj wake-word "agent" (tvoj handler već pali Focus Mode)
          try { if (!agent.isListening) agent.startListening(); } catch {}
          log(`🎤 Učitano "${scope}". Reci "agent" za Focus Mode.`);
          agent.addStage({
            id: `post-load-${Date.now()}`,
            name: 'Gant pokrenut',
            description: `Scope: ${scope}. Reci "agent" za fokus.`,
            icon: '🎯',
            status: 'completed',
            timestamp: new Date().toISOString(),
            completedAt: new Date().toISOString()
          });
        }}
      />

      {focusMode && (
        <AgentInteractionBar
          agent={agent}
          processCommand={(command) => {
            agent.processTextCommand(command, (modification) => {
              // Handle gantt modifications here
              console.log('Gantt modification:', modification);
            });
          }}
        />
      )}
    </div>
  );
}