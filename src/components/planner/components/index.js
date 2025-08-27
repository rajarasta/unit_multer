// re-export komponenti po potrebi
// src/components/planner/PlannerGanttTab.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Plus, Save, Upload, Download, Filter, ZoomIn, ZoomOut, 
  Calendar, Settings, Maximize2, Camera, Activity, FolderOpen 
} from 'lucide-react';

// Constants
import { 
  STATUSI, PROCESI, EVENT_TYPES, ROW_H, SIDEBAR_W, 
  ALL_PROJECTS_ID, OVERSCAN_DAYS, OVERSCAN_ROWS 
} from './constants';

// Utils
import { 
  formatDate, addDays, daysBetween, 
  croatianDateFormat, croatianDateFull 
} from './utils/dateUtils';
import { generateProjectColor, generateEmptyProject } from './utils/projectUtils';

// Hooks
import { useRafThrottle } from './hooks/useRafThrottle';
import { useViewport } from './hooks/useViewport';

// Components
import { ProjectSelector } from './components/Header/ProjectSelector';
import { SettingsPanel } from './components/Header/SettingsPanel';
import { TaskEditorModal } from './components/Modals/TaskEditorModal';
import { SubtasksDrawer } from './components/Drawers/SubtasksDrawer';
import { DocumentsManager } from './components/Modals/DocumentsManager';
import { ImageCADPreview } from './components/Modals/ImageCADPreview';
import { TaskHoverCard } from './components/Cards/TaskHoverCard';
import { PositionHistory } from './components/Modals/PositionHistory';
import { TaskBar } from './components/Timeline/TaskBar';

export default function PlannerGanttTab() {
  // === STATE MANAGEMENT ===
  const [data, setData] = useState(() => {
    const initialProject = generateEmptyProject();
    return {
      version: '4.0',
      projects: [initialProject],
      activeProjectId: initialProject.id,
      globalSettings: {},
      indicatorFilters: []
    };
  });

  const [viewMode, setViewMode] = useState('pozicije');
  const [zoom, setZoom] = useState('week');
  const [selectedTask, setSelectedTask] = useState(null);
  const [hoveredTask, setHoveredTask] = useState(null);
  const [hoverLevel, setHoverLevel] = useState(0);
  const [editingTask, setEditingTask] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [processFilters, setProcessFilters] = useState(new Set(PROCESI.map(p => p.id)));
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtasksDrawer, setShowSubtasksDrawer] = useState(false);
  const [showDocumentsManager, setShowDocumentsManager] = useState(false);
  const [showPositionHistory, setShowPositionHistory] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(null);
  const [indicatorFilters, setIndicatorFilters] = useState(new Set());
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

  // === REFS ===
  const chartRef = useRef(null);
  const ganttRef = useRef(null);

  // === COMPUTED VALUES ===
  const activeProjectId = data.activeProjectId;
  const isAllProjectsView = activeProjectId === ALL_PROJECTS_ID;
  
  const currentViewData = useMemo(() => {
    if (isAllProjectsView) {
      return {
        id: ALL_PROJECTS_ID,
        name: 'Svi projekti',
        tasks: data.projects.flatMap(p => 
          (p.tasks || []).map(t => ({ ...t, projectId: p.id, projectName: p.name }))
        ),
        pozicije: Array.from(new Set(data.projects.flatMap(p => p.pozicije || []))),
        events: data.projects.flatMap(p => p.events || [])
          .sort((a, b) => new Date(a.date) - new Date(b.date)),
        history: data.projects.flatMap(p => p.history || []),
        subtasksByPosition: data.projects.reduce((acc, p) => {
          Object.entries(p.subtasksByPosition || {}).forEach(([pos, tasks]) => {
            if (!acc[pos]) acc[pos] = [];
            acc[pos].push(...tasks.map(t => ({...t, projectId: p.id})));
          });
          return acc;
        }, {}),
        documents: data.projects.flatMap(p => p.documents || [])
      };
    } else {
      const project = data.projects.find(p => p.id === activeProjectId);
      if (project) {
        return {
          ...project,
          tasks: (project.tasks || []).map(t => ({ 
            ...t, projectId: project.id, projectName: project.name 
          })),
          subtasksByPosition: Object.entries(project.subtasksByPosition || {})
            .reduce((acc, [pos, tasks]) => {
              acc[pos] = tasks.map(t => ({...t, projectId: project.id}));
              return acc;
            }, {})
        };
      }
      return generateEmptyProject();
    }
  }, [data.projects, activeProjectId, isAllProjectsView]);

  // === VIEWPORT MANAGEMENT ===
  const viewport = useViewport(chartRef);
  const dayWidth = useMemo(() => 
    zoom === 'day' ? 80 : zoom === 'week' ? 30 : 10, [zoom]
  );

  // === PROJECT MANAGEMENT ===
  const selectProject = useCallback((projectId) => {
    setData(prev => ({ ...prev, activeProjectId: projectId }));
    setSelectedTask(null);
    setHoveredTask(null);
    setEditingTask(null);
  }, []);

  const deleteProject = useCallback((projectId) => {
    setData(prev => {
      const remaining = prev.projects.filter(p => p.id !== projectId);
      
      if (remaining.length === 0) {
        const newProject = generateEmptyProject();
        return {
          ...prev,
          projects: [newProject],
          activeProjectId: newProject.id
        };
      }

      let newActiveId = prev.activeProjectId;
      if (prev.activeProjectId === projectId) {
        newActiveId = ALL_PROJECTS_ID;
      }
      
      return {
        ...prev,
        projects: remaining,
        activeProjectId: newActiveId
      };
    });
  }, []);

  const updateProject = useCallback((projectId, updateFn) => {
    setData(prev => ({
      ...prev,
      projects: prev.projects.map(p => 
        p.id === projectId ? updateFn(p) : p
      )
    }));
  }, []);

  // === RENDER ===
  return (
    <div className="h-full flex flex-col bg-slate-50" ref={ganttRef}>
      {/* Header */}
      <div className="h-14 bg-white border-b px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ProjectSelector
            projects={data.projects}
            activeProjectId={data.activeProjectId}
            onSelectProject={selectProject}
            onDeleteProject={deleteProject}
          />
          {/* View mode buttons, process filters, etc. */}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search, navigation, zoom controls */}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel 
          settings={settings} 
          onSettingsChange={setSettings} 
          onClose={() => setShowSettings(false)} 
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Task List */}
        <div className="w-80 bg-white border-r flex flex-col">
          {/* Task headers and rows */}
        </div>

        {/* Gantt Chart Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={chartRef} className="flex-1 overflow-auto bg-white relative">
            {/* Gantt chart content with TaskBar components */}
          </div>
        </div>
      </div>

      {/* Modals and Overlays */}
      {showDocumentsManager && (
        <DocumentsManager
          documents={[]}
          onClose={() => setShowDocumentsManager(false)}
          onUpdateDocument={() => {}}
          onDeleteDocument={() => {}}
          onPreview={setShowImagePreview}
        />
      )}

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
          subtasksByPosition={currentViewData.subtasksByPosition || {}}
          onToggle={() => {}}
          onDelete={() => {}}
          onUpdateSubtask={() => {}}
          onAddEvent={() => {}}
        />
      )}

      {editingTask && (
        <TaskEditorModal
          task={editingTask.id ? editingTask : null}
          pozicije={currentViewData.pozicije || []}
          onSave={() => {}}
          onClose={() => setEditingTask(null)}
          onAddEvent={() => {}}
        />
      )}

      {showPositionHistory && (
        <PositionHistory
          position={showPositionHistory}
          history={currentViewData.history || []}
          onClose={() => setShowPositionHistory(null)}
        />
      )}

      {hoveredTask && hoverLevel > 0 && (
        <TaskHoverCard
          task={hoveredTask}
          position={hoveredTask.position}
          level={hoverLevel}
          onEdit={() => {
            setEditingTask(hoveredTask);
            setHoveredTask(null);
            setHoverLevel(0);
          }}
          onClose={() => {
            setHoveredTask(null);
            setHoverLevel(0);
          }}
          onUpdateTask={() => {}}
          onAddEvent={() => {}}
        />
      )}
    </div>
  );
}