// services/taskService.js
import { PROCESI } from '../constants/processes';
import { daysBetween } from '../utils/dateUtils';

export const taskService = {
  // Update a single task
  updateTask: (tasks, taskId, updates) => {
    return tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
  },

  // Filter tasks based on various criteria
  filterTasks: (tasks, filters, subtasksByPosition) => {
    const { processFilters, searchText, indicatorFilters } = filters;
    
    return tasks.filter(task => {
      // Process filter
      if (processFilters && !processFilters.has(task.proces)) return false;
      
      // Search filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = 
          `${task.pozicija} ${task.naziv} ${task.projectName || ''}`
            .toLowerCase()
            .includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Indicator filters
      if (indicatorFilters && indicatorFilters.size > 0) {
        const hasComments = (task.komentari?.length || 0) > 0;
        const hasDocs = (task.prilozi?.length || 0) > 0;
        const hasDescription = task.opis && task.opis.length > 0;
        const hasSubtasks = (subtasksByPosition?.[task.pozicija]?.length || 0) > 0;
        
        if (indicatorFilters.has('comments') && !hasComments) return false;
        if (indicatorFilters.has('docs') && !hasDocs) return false;
        if (indicatorFilters.has('description') && !hasDescription) return false;
        if (indicatorFilters.has('subtasks') && !hasSubtasks) return false;
      }
      
      return true;
    });
  },

  // Calculate task position on timeline
  calculateTaskPosition: (task, timeline, dayWidth) => {
    if (!task.start || !task.end) {
      return {
        x: 0,
        width: 0,
        isValid: false
      };
    }

    const startDays = daysBetween(timeline.start, new Date(task.start));
    const endDays = daysBetween(timeline.start, new Date(task.end));
    const x = startDays * dayWidth;
    const width = Math.max((endDays - startDays) * dayWidth, 20);

    return {
      x,
      width,
      startDays,
      endDays,
      isValid: true
    };
  },

  // Group tasks by view mode
  groupTasks: (tasks, viewMode) => {
    const grouped = new Map();
    
    tasks.forEach(task => {
      const key = viewMode === 'pozicije' ? task.pozicija : task.proces;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(task);
    });

    // Sort tasks within groups by start date
    grouped.forEach(tasks => {
      tasks.sort((a, b) => {
        if (!a.start || !b.start) return 0;
        return new Date(a.start) - new Date(b.start);
      });
    });

    // Convert to array and create display names
    const groupsArr = Array.from(grouped.entries()).map(([name, tasks]) => ({
      name,
      displayName: viewMode === 'procesi' 
        ? (PROCESI.find(p => p.id === name)?.naziv || name) 
        : name,
      tasks
    }));

    // Create flat rows for rendering
    let rowIndex = 0;
    const rows = [];
    groupsArr.forEach(g => {
      rows.push({ 
        type: 'header', 
        key: `h-${g.name}`, 
        group: g, 
        rowIndex: rowIndex++ 
      });
      g.tasks.forEach(t => rows.push({ 
        type: 'task', 
        key: t.id, 
        task: t, 
        rowIndex: rowIndex++ 
      }));
    });

    return { groups: groupsArr, flatRows: rows };
  },

  // Calculate timeline boundaries
  calculateTimeline: (tasks, timeExtent) => {
    const validTasks = tasks.filter(t => t.start && t.end);
    
    if (!validTasks.length) {
      const today = new Date();
      return { 
        start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
      };
    }

    const dates = validTasks.flatMap(t => [
      new Date(t.start), 
      new Date(t.end)
    ]);
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));

    return { 
      start: new Date(min.getTime() - timeExtent.left * 24 * 60 * 60 * 1000),
      end: new Date(max.getTime() + timeExtent.right * 24 * 60 * 60 * 1000)
    };
  },

  // Validate task dates
  validateTaskDates: (task) => {
    const errors = [];
    
    if (!task.start) errors.push('Početni datum nije postavljen');
    if (!task.end) errors.push('Završni datum nije postavljen');
    
    if (task.start && task.end) {
      const start = new Date(task.start);
      const end = new Date(task.end);
      if (start > end) {
        errors.push('Početni datum ne može biti nakon završnog');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Create new task with defaults
  createTask: (pozicija, proces = 'općenito') => {
    const procesData = PROCESI.find(p => p.id === proces);
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      id: `t${Date.now()}`,
      naziv: procesData?.naziv || 'Novi zadatak',
      pozicija: pozicija || 'Nova pozicija',
      proces: proces,
      start: today.toISOString().split('T')[0],
      end: nextWeek.toISOString().split('T')[0],
      plannedStart: today.toISOString().split('T')[0],
      plannedEnd: nextWeek.toISOString().split('T')[0],
      status: 'čeka',
      urgency: 'normal',
      progress: 0,
      prioritet: 2,
      odgovorna_osoba: '',
      opis: '',
      komentari: [],
      prilozi: []
    };
  }
};