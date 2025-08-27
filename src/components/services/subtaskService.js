// services/subtaskService.js
export const subtaskService = {
  // Add subtask to position
  addSubtask: (subtasksByPosition, position, subtask) => {
    return {
      ...subtasksByPosition,
      [position]: [...(subtasksByPosition[position] || []), subtask]
    };
  },

  // Toggle subtask completion
  toggleSubtask: (subtasksByPosition, position, subtaskId) => {
    return {
      ...subtasksByPosition,
      [position]: (subtasksByPosition[position] || []).map(s =>
        s.id === subtaskId ? { ...s, done: !s.done } : s
      )
    };
  },

  // Update subtask
  updateSubtask: (subtasksByPosition, position, subtaskId, updates) => {
    return {
      ...subtasksByPosition,
      [position]: (subtasksByPosition[position] || []).map(s =>
        s.id === subtaskId ? { ...s, ...updates } : s
      )
    };
  },

  // Delete subtask
  deleteSubtask: (subtasksByPosition, position, subtaskId) => {
    return {
      ...subtasksByPosition,
      [position]: (subtasksByPosition[position] || []).filter(s => s.id !== subtaskId)
    };
  },

  // Get all subtasks flattened with position info
  getAllSubtasks: (subtasksByPosition) => {
    const tasks = [];
    Object.entries(subtasksByPosition).forEach(([position, list]) => {
      if (list && list.length) {
        list.forEach(task => tasks.push({ ...task, position }));
      }
    });
    return tasks;
  },

  // Filter subtasks
  filterSubtasks: (subtasks, filters) => {
    const { positionFilter, personFilter, urgencyFilter, searchText } = filters;
    
    return subtasks.filter(task => {
      if (positionFilter !== 'all' && task.position !== positionFilter) return false;
      if (personFilter !== 'all' && task.assignedTo !== personFilter) return false;
      if (urgencyFilter !== 'all' && task.urgency !== urgencyFilter) return false;
      if (searchText && !task.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  },

  // Calculate subtask statistics
  getSubtaskStats: (subtasks) => {
    const total = subtasks.length;
    const done = subtasks.filter(t => t.done).length;
    const urgent = subtasks.filter(t => 
      t.urgency === 'critical' || t.urgency === 'high'
    ).length;
    
    return { 
      total, 
      done, 
      urgent, 
      pending: total - done,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0
    };
  },

  // Create new subtask
  createSubtask: (position, data = {}) => {
    return {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title: data.title || '',
      dueDate: data.dueDate || null,
      assignedTo: data.assignedTo || '',
      urgency: data.urgency || 'normal',
      status: data.status || 'čeka',
      done: false,
      createdAt: new Date().toISOString(),
      position
    };
  }
};