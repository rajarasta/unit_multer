// src/components/tabs/PlannerGantt/services/ProjectDataService.js
/**
 * ProjectDataService manages project data operations using the unified JSON structure
 * Provides high-level API for project manipulation with caching and validation
 */
class ProjectDataService {
  constructor(storageService = null) {
    this.storage = storageService;
    if (!this.storage) {
      // Lazy import to avoid circular dependencies
      const JsonStorageService = require('./JsonStorageService').default;
      this.storage = new JsonStorageService();
    }
    
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTimeout = 5000; // 5 seconds cache
    this.subscribers = new Set();
  }

  /**
   * Initialize data structure if it doesn't exist
   */
  async initializeDataStructure() {
    const data = await this.storage.readJson();
    if (!data) {
      const initialData = {
        version: '5.0',
        exportDate: new Date().toISOString(),
        meta: {
          schemaName: 'project.unified',
          schemaVersion: '5.0.0',
          types: this.getTypeDefinitions()
        },
        projects: [],
        activeProjectId: null
      };
      await this.storage.importFull(initialData);
      this.invalidateCache();
      return initialData;
    }
    return data;
  }

  /**
   * Get type definitions for the schema
   */
  getTypeDefinitions() {
    return {
      'item.id': 'string',
      'item.ref': 'string',
      'item.url': 'string',
      'item.user': {
        type: 'object',
        properties: {
          id: 'string',
          name: 'string',
          email: 'string'
        }
      },
      'item.descriptions': {
        type: 'object',
        additionalProperties: false,
        properties: {
          short: { type: 'string' },
          long: { type: 'string' },
          technical: { type: 'string' }
        }
      },
      'item.process': {
        type: 'object',
        properties: {
          name: 'string',
          status: {
            enum: ['Čeka', 'U tijeku', 'Na stajanju', 'Završeno']
          },
          owner: 'item.user',
          plannedStart: 'string',
          plannedEnd: 'string',
          actualStart: 'string|null',
          actualEnd: 'string|null',
          progress: 'number',
          notes: 'string'
        }
      }
    };
  }

  /**
   * Load all projects from storage
   */
  async loadAllProjects() {
    // Check cache first
    if (this.cache && this.cacheTimestamp && 
        (Date.now() - this.cacheTimestamp < this.cacheTimeout)) {
      return this.cache;
    }

    try {
      const data = await this.storage.exportFull();
      
      if (!data) {
        // Initialize if no data exists
        const initialized = await this.initializeDataStructure();
        this.updateCache(initialized);
        return initialized;
      }

      // Validate and migrate if necessary
      const validated = this.validateAndMigrate(data);
      this.updateCache(validated);
      return validated;
    } catch (error) {
      console.error('Error loading projects:', error);
      throw error;
    }
  }

  /**
   * Save all projects to storage
   */
  async saveAllProjects(data) {
    try {
      // Clear cache on save
      this.invalidateCache();

      // Ensure proper structure
      const dataToSave = {
        version: data.version || '5.0',
        exportDate: new Date().toISOString(),
        meta: data.meta || {
          schemaName: 'project.unified',
          schemaVersion: '5.0.0',
          types: this.getTypeDefinitions()
        },
        projects: data.projects || [],
        activeProjectId: data.activeProjectId || null
      };

      // Validate before saving
      const validation = this.validateDataStructure(dataToSave);
      if (!validation.valid) {
        console.error('Validation errors:', validation.errors);
        throw new Error('Invalid data structure: ' + validation.errors.join(', '));
      }

      await this.storage.importFull(dataToSave);
      this.notifySubscribers('save', dataToSave);
      return dataToSave;
    } catch (error) {
      console.error('Error saving projects:', error);
      throw error;
    }
  }

  /**
   * Get single project by ID
   */
  async getProject(projectId) {
    const data = await this.loadAllProjects();
    return data.projects?.find(p => p.id === projectId) || null;
  }

  /**
   * Create new project
   */
  async createProject(projectData) {
    const data = await this.loadAllProjects();
    
    const newProject = {
      id: projectData.id || this.generateId('PRJ'),
      name: projectData.name || 'Novi Projekt',
      client: projectData.client || { name: '', oib: '' },
      created: projectData.created || new Date().toISOString(),
      owner: projectData.owner || { 
        id: 'u1', 
        name: 'User', 
        email: 'user@example.com' 
      },
      llmData: projectData.llmData || { 
        summary: '', 
        keywords: [], 
        nextBestActions: [] 
      },
      descriptions: projectData.descriptions || { 
        short: '', 
        long: '', 
        technical: '' 
      },
      documents: projectData.documents || [],
      accounting: projectData.accounting || {
        documents: [],
        payments: [],
        budget: { 
          currency: 'EUR', 
          plannedTotal: 0, 
          committed: 0, 
          invoiced: 0, 
          paid: 0 
        }
      },
      floorplan: projectData.floorplan || null,
      gantt: projectData.gantt || { 
        scale: 'days', 
        start: null, 
        end: null 
      },
      positions: projectData.positions || [],
      history: [{
        id: this.generateId('h'),
        date: new Date().toISOString(),
        type: 'create',
        title: 'Projekt kreiran',
        details: ''
      }],
      dataCache: { 
        enabled: true, 
        lastSync: new Date().toISOString(), 
        items: [] 
      }
    };

    data.projects.push(newProject);
    data.activeProjectId = newProject.id;
    
    await this.saveAllProjects(data);
    this.notifySubscribers('create', newProject);
    return newProject;
  }

  /**
   * Update existing project
   */
  async updateProject(projectId, updates) {
    const data = await this.loadAllProjects();
    const projectIndex = data.projects?.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Deep merge updates
    const updatedProject = this.deepMerge(
      data.projects[projectIndex],
      updates
    );

    // Update cache timestamp
    updatedProject.dataCache = {
      ...updatedProject.dataCache,
      lastSync: new Date().toISOString()
    };

    data.projects[projectIndex] = updatedProject;

    await this.saveAllProjects(data);
    this.notifySubscribers('update', updatedProject);
    return updatedProject;
  }

  /**
   * Delete project
   */
  async deleteProject(projectId) {
    const data = await this.loadAllProjects();
    const projectIndex = data.projects?.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) {
      throw new Error(`Project ${projectId} not found`);
    }

    const deletedProject = data.projects[projectIndex];
    data.projects.splice(projectIndex, 1);
    
    // Update active project if necessary
    if (data.activeProjectId === projectId) {
      data.activeProjectId = data.projects[0]?.id || null;
    }

    await this.saveAllProjects(data);
    this.notifySubscribers('delete', deletedProject);
    return true;
  }

  /**
   * Add position to project
   */
  async addPosition(projectId, positionData) {
    const data = await this.loadAllProjects();
    const project = data.projects?.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const newPosition = {
      id: positionData.id || this.generateId('PZ'),
      title: positionData.title || 'Nova Pozicija',
      llmData: positionData.llmData || { 
        summary: '', 
        keywords: [] 
      },
      descriptions: positionData.descriptions || { 
        short: '', 
        long: '', 
        technical: '' 
      },
      documents: positionData.documents || [],
      tasks: positionData.tasks || [],
      comments: positionData.comments || [],
      materials: positionData.materials || [],
      processes: positionData.processes || this.getDefaultProcesses(),
      gantt: positionData.gantt || { 
        bar: { start: null, end: null }, 
        milestones: [] 
      }
    };

    if (!project.positions) {
      project.positions = [];
    }
    project.positions.push(newPosition);

    // Add history entry
    if (!project.history) {
      project.history = [];
    }
    project.history.push({
      id: this.generateId('h'),
      date: new Date().toISOString(),
      type: 'position',
      title: 'Pozicija dodana',
      details: `${newPosition.id}: ${newPosition.title}`
    });

    await this.saveAllProjects(data);
    this.notifySubscribers('position-add', { projectId, position: newPosition });
    return newPosition;
  }

  /**
   * Update position in project
   */
  async updatePosition(projectId, positionId, updates) {
    const data = await this.loadAllProjects();
    const project = data.projects?.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const positionIndex = project.positions?.findIndex(pos => pos.id === positionId);
    if (positionIndex === -1) {
      throw new Error(`Position ${positionId} not found in project ${projectId}`);
    }

    project.positions[positionIndex] = this.deepMerge(
      project.positions[positionIndex],
      updates
    );

    // Add history entry
    project.history.push({
      id: this.generateId('h'),
      date: new Date().toISOString(),
      type: 'position',
      title: 'Pozicija ažurirana',
      details: positionId
    });

    await this.saveAllProjects(data);
    this.notifySubscribers('position-update', { 
      projectId, 
      position: project.positions[positionIndex] 
    });
    return project.positions[positionIndex];
  }

  /**
   * Delete position from project
   */
  async deletePosition(projectId, positionId) {
    const data = await this.loadAllProjects();
    const project = data.projects?.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const positionIndex = project.positions?.findIndex(pos => pos.id === positionId);
    if (positionIndex === -1) {
      throw new Error(`Position ${positionId} not found in project ${projectId}`);
    }

    const deletedPosition = project.positions[positionIndex];
    project.positions.splice(positionIndex, 1);

    // Add history entry
    project.history.push({
      id: this.generateId('h'),
      date: new Date().toISOString(),
      type: 'position',
      title: 'Pozicija uklonjena',
      details: positionId
    });

    await this.saveAllProjects(data);
    this.notifySubscribers('position-delete', { projectId, position: deletedPosition });
    return true;
  }

  /**
   * Add task to position
   */
  async addTaskToPosition(projectId, positionId, taskData) {
    const position = await this.getPosition(projectId, positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    const newTask = {
      id: taskData.id || this.generateId('t'),
      title: taskData.title || 'Novi zadatak',
      status: taskData.status || 'todo',
      assignee: taskData.assignee || null,
      due: taskData.due || null,
      refs: taskData.refs || []
    };

    const updates = {
      tasks: [...(position.tasks || []), newTask]
    };

    await this.updatePosition(projectId, positionId, updates);
    return newTask;
  }

  /**
   * Update task in position
   */
  async updateTaskInPosition(projectId, positionId, taskId, updates) {
    const position = await this.getPosition(projectId, positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    const tasks = position.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    
    await this.updatePosition(projectId, positionId, { tasks });
    return tasks[taskIndex];
  }

  /**
   * Add process to position
   */
  async addProcessToPosition(projectId, positionId, processData) {
    const position = await this.getPosition(projectId, positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    const newProcess = {
      name: processData.name || 'Novi proces',
      status: processData.status || 'Čeka',
      owner: processData.owner || null,
      plannedStart: processData.plannedStart || null,
      plannedEnd: processData.plannedEnd || null,
      actualStart: processData.actualStart || null,
      actualEnd: processData.actualEnd || null,
      progress: processData.progress || 0,
      notes: processData.notes || ''
    };

    const updates = {
      processes: [...(position.processes || []), newProcess]
    };

    await this.updatePosition(projectId, positionId, updates);
    return newProcess;
  }

  /**
   * Update process in position
   */
  async updateProcessInPosition(projectId, positionId, processName, updates) {
    const position = await this.getPosition(projectId, positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found`);
    }

    const processes = position.processes || [];
    const processIndex = processes.findIndex(p => p.name === processName);
    if (processIndex === -1) {
      throw new Error(`Process ${processName} not found`);
    }

    processes[processIndex] = { ...processes[processIndex], ...updates };
    
    await this.updatePosition(projectId, positionId, { processes });
    return processes[processIndex];
  }

  /**
   * Get position from project
   */
  async getPosition(projectId, positionId) {
    const project = await this.getProject(projectId);
    if (!project) return null;
    return project.positions?.find(pos => pos.id === positionId) || null;
  }

  /**
   * Get aggregated data for all projects view
   */
  async getAggregatedProjectData() {
    const data = await this.loadAllProjects();
    
    const aggregated = {
      totalProjects: data.projects?.length || 0,
      totalPositions: 0,
      totalTasks: 0,
      totalDocuments: 0,
      totalBudget: 0,
      projectsSummary: []
    };

    if (data.projects) {
      for (const project of data.projects) {
        const positionsCount = project.positions?.length || 0;
        const tasksCount = project.positions?.reduce(
          (sum, pos) => sum + (pos.tasks?.length || 0), 0
        ) || 0;
        const documentsCount = project.documents?.length || 0;
        const budget = project.accounting?.budget?.plannedTotal || 0;

        aggregated.totalPositions += positionsCount;
        aggregated.totalTasks += tasksCount;
        aggregated.totalDocuments += documentsCount;
        aggregated.totalBudget += budget;

        aggregated.projectsSummary.push({
          id: project.id,
          name: project.name,
          client: project.client?.name || '',
          positions: positionsCount,
          tasks: tasksCount,
          documents: documentsCount,
          budget: budget,
          created: project.created,
          owner: project.owner
        });
      }
    }

    return aggregated;
  }

  /**
   * Search across all projects
   */
  async searchProjects(searchTerm, options = {}) {
    const { 
      searchIn = ['projects', 'positions', 'tasks', 'documents'],
      maxResults = 50
    } = options;

    const data = await this.loadAllProjects();
    const results = [];

    if (!data.projects) return results;

    const term = searchTerm.toLowerCase();

    for (const project of data.projects) {
      if (results.length >= maxResults) break;

      // Search in project
      if (searchIn.includes('projects')) {
        if (project.name?.toLowerCase().includes(term) || 
            project.client?.name?.toLowerCase().includes(term) ||
            project.descriptions?.short?.toLowerCase().includes(term) ||
            project.descriptions?.long?.toLowerCase().includes(term)) {
          results.push({
            type: 'project',
            projectId: project.id,
            projectName: project.name,
            title: project.name,
            description: project.client?.name || '',
            path: `/projects/${project.id}`
          });
        }
      }

      // Search in positions
      if (searchIn.includes('positions') && project.positions) {
        for (const position of project.positions) {
          if (results.length >= maxResults) break;
          
          if (position.title?.toLowerCase().includes(term) ||
              position.descriptions?.short?.toLowerCase().includes(term) ||
              position.descriptions?.long?.toLowerCase().includes(term)) {
            results.push({
              type: 'position',
              projectId: project.id,
              projectName: project.name,
              positionId: position.id,
              title: position.title,
              description: position.descriptions?.short || '',
              path: `/projects/${project.id}/positions/${position.id}`
            });
          }

          // Search in tasks
          if (searchIn.includes('tasks') && position.tasks) {
            for (const task of position.tasks) {
              if (results.length >= maxResults) break;
              
              if (task.title?.toLowerCase().includes(term)) {
                results.push({
                  type: 'task',
                  projectId: project.id,
                  projectName: project.name,
                  positionId: position.id,
                  taskId: task.id,
                  title: task.title,
                  description: `Position: ${position.title}`,
                  path: `/projects/${project.id}/positions/${position.id}/tasks/${task.id}`
                });
              }
            }
          }
        }
      }

      // Search in documents
      if (searchIn.includes('documents') && project.documents) {
        for (const doc of project.documents) {
          if (results.length >= maxResults) break;
          
          if (doc.name?.toLowerCase().includes(term)) {
            results.push({
              type: 'document',
              projectId: project.id,
              projectName: project.name,
              documentId: doc.id,
              title: doc.name,
              description: `Type: ${doc.type}`,
              path: `/projects/${project.id}/documents/${doc.id}`
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Export project data for backup
   */
  async exportProjectBackup(projectId = null) {
    const data = await this.loadAllProjects();
    
    if (projectId) {
      // Export single project
      const project = data.projects?.find(p => p.id === projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }
      
      return {
        version: data.version,
        exportDate: new Date().toISOString(),
        meta: data.meta,
        projects: [project],
        activeProjectId: projectId
      };
    } else {
      // Export all projects
      return {
        version: data.version,
        exportDate: new Date().toISOString(),
        meta: data.meta,
        projects: data.projects || [],
        activeProjectId: data.activeProjectId
      };
    }
  }

  /**
   * Import project data from backup
   */
  async importProjectBackup(backupData, mode = 'merge') {
    const currentData = await this.loadAllProjects();
    
    if (mode === 'replace') {
      // Replace all data
      await this.saveAllProjects(backupData);
      this.notifySubscribers('import', backupData);
      return backupData;
    } else if (mode === 'merge') {
      // Merge projects
      const mergedProjects = [...(currentData.projects || [])];
      
      for (const importedProject of (backupData.projects || [])) {
        const existingIndex = mergedProjects.findIndex(
          p => p.id === importedProject.id
        );
        
        if (existingIndex >= 0) {
          // Update existing project
          mergedProjects[existingIndex] = importedProject;
        } else {
          // Add new project
          mergedProjects.push(importedProject);
        }
      }

      const mergedData = {
        ...currentData,
        projects: mergedProjects
      };

      await this.saveAllProjects(mergedData);
      this.notifySubscribers('import', mergedData);
      return mergedData;
    } else {
      throw new Error(`Invalid import mode: ${mode}`);
    }
  }

  /**
   * Validate data structure
   */
  validateDataStructure(data) {
    const errors = [];
    const warnings = [];

    // Check basic structure
    if (!data) {
      errors.push('Data is null or undefined');
      return { valid: false, errors, warnings };
    }

    if (!data.version) warnings.push('Missing version field');
    if (!data.projects) errors.push('Missing projects array');
    if (data.projects && !Array.isArray(data.projects)) {
      errors.push('Projects field is not an array');
    }

    // Validate each project
    if (Array.isArray(data.projects)) {
      data.projects.forEach((project, index) => {
        if (!project.id) {
          errors.push(`Project at index ${index} missing ID`);
        }
        if (!project.name) {
          warnings.push(`Project ${project.id || index} missing name`);
        }
        
        // Validate positions
        if (project.positions && Array.isArray(project.positions)) {
          project.positions.forEach((position, posIndex) => {
            if (!position.id) {
              errors.push(
                `Position at index ${posIndex} in project ${project.id} missing ID`
              );
            }
            if (!position.title) {
              warnings.push(
                `Position ${position.id || posIndex} missing title`
              );
            }
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate and migrate data if necessary
   */
  validateAndMigrate(data) {
    // Add version if missing
    if (!data.version) {
      data.version = '5.0';
    }

    // Ensure projects array exists
    if (!data.projects) {
      data.projects = [];
    }

    // Migrate old format if necessary
    if (data.version < '5.0') {
      data = this.migrateToV5(data);
    }

    return data;
  }

  /**
   * Migrate data to v5.0 format
   */
  migrateToV5(data) {
    // Migration logic for older versions
    console.log('Migrating data to v5.0 format');
    
    // Add meta if missing
    if (!data.meta) {
      data.meta = {
        schemaName: 'project.unified',
        schemaVersion: '5.0.0',
        types: this.getTypeDefinitions()
      };
    }

    // Update version
    data.version = '5.0';

    // Migrate projects
    if (data.projects) {
      data.projects = data.projects.map(project => {
        // Ensure all required fields exist
        return {
          ...project,
          llmData: project.llmData || { summary: '', keywords: [], nextBestActions: [] },
          descriptions: project.descriptions || { short: '', long: '', technical: '' },
          accounting: project.accounting || {
            documents: [],
            payments: [],
            budget: { currency: 'EUR', plannedTotal: 0, committed: 0, invoiced: 0, paid: 0 }
          },
          history: project.history || [],
          dataCache: project.dataCache || { enabled: true, lastSync: new Date().toISOString(), items: [] }
        };
      });
    }

    return data;
  }

  /**
   * Get default processes for a position
   */
  getDefaultProcesses() {
    return [
      {
        name: 'Prodaja',
        status: 'Čeka',
        owner: null,
        plannedStart: null,
        plannedEnd: null,
        actualStart: null,
        actualEnd: null,
        progress: 0,
        notes: ''
      },
      {
        name: 'Teh. priprema',
        status: 'Čeka',
        owner: null,
        plannedStart: null,
        plannedEnd: null,
        actualStart: null,
        actualEnd: null,
        progress: 0,
        notes: ''
      },
      {
        name: 'Nabava',
        status: 'Čeka',
        owner: null,
        plannedStart: null,
        plannedEnd: null,
        actualStart: null,
        actualEnd: null,
        progress: 0,
        notes: ''
      },
      {
        name: 'Proizvodnja',
        status: 'Čeka',
        owner: null,
        plannedStart: null,
        plannedEnd: null,
        actualStart: null,
        actualEnd: null,
        progress: 0,
        notes: ''
      },
      {
        name: 'Ugradnja',
        status: 'Čeka',
        owner: null,
        plannedStart: null,
        plannedEnd: null,
        actualStart: null,
        actualEnd: null,
        progress: 0,
        notes: ''
      }
    ];
  }

  /**
   * Generate unique ID
   */
  generateId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
  }

  /**
   * Check if value is a plain object
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date);
  }

  /**
   * Subscribe to data changes
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of changes
   */
  notifySubscribers(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in subscriber:', error);
      }
    });
  }

  /**
   * Update cache
   */
  updateCache(data) {
    this.cache = data;
    this.cacheTimestamp = Date.now();
  }

  /**
   * Invalidate cache
   */
  invalidateCache() {
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.invalidateCache();
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      cached: this.cache !== null,
      timestamp: this.cacheTimestamp,
      age: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null,
      timeout: this.cacheTimeout
    };
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(timeout) {
    this.cacheTimeout = timeout;
  }

  /**
   * Get storage info
   */
  async getStorageInfo() {
    if (this.storage && this.storage.getStorageInfo) {
      return this.storage.getStorageInfo();
    }
    return null;
  }

  /**
   * Create backup
   */
  async createBackup() {
    if (this.storage && this.storage.createBackup) {
      return this.storage.createBackup();
    }
    return null;
  }

  /**
   * List backups
   */
  async listBackups() {
    if (this.storage && this.storage.listBackups) {
      return this.storage.listBackups();
    }
    return [];
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupKey) {
    if (this.storage && this.storage.restoreFromBackup) {
      const data = await this.storage.restoreFromBackup(backupKey);
      this.invalidateCache();
      this.notifySubscribers('restore', data);
      return data;
    }
    throw new Error('Backup restore not supported');
  }

  /**
   * Destroy service and cleanup
   */
  destroy() {
    this.invalidateCache();
    this.subscribers.clear();
    if (this.storage && this.storage.destroy) {
      this.storage.destroy();
    }
  }
}

export default ProjectDataService;