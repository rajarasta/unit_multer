// src/components/tabs/PlannerGantt/services/ProjectDataService.js
import AgbimDataService from './AgbimDataService.js';

/**
 * ProjectDataService manages project data operations using the unified JSON structure
 * Provides high-level API for project manipulation with caching and validation
 */
class ProjectDataService {
  constructor(storageService = null) {
    this.storage = storageService;
    if (!this.storage) {
      this.storage = new AgbimDataService();
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
      await this.storage.writeJson(initialData);
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
      const data = await this.storage.loadAllProjects();
      
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

      await this.storage.saveAllProjects(dataToSave);
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

  // ===== CHAT DATA METHODS =====
  
  /**
   * Get chat timeline data from all projects
   */
  async getChatData() {
    const data = await this.loadAllProjects();
    if (!data?.projects) return [];

    const chatItems = [];
    
    data.projects.forEach(project => {
      // Project creation
      chatItems.push({
        id: `project-${project.id}`,
        type: 'system',
        content: `📋 **${project.name}** projekt je kreiran za ${project.client?.name || 'klijenta'}`,
        timestamp: new Date(project.created),
        author: 'Sistem',
        avatar: 'S',
        projectId: project.id,
        references: [{ type: 'project', id: project.id, title: project.name }]
      });

      // Position comments
      project.positions?.forEach(position => {
        position.comments?.forEach(comment => {
          let content = comment.text;
          if (comment.refs?.length > 0) {
            const refStrings = comment.refs.map(ref => this.parseReference(ref, project));
            content += `\n\n🔗 Reference: ${refStrings.join(', ')}`;
          }

          chatItems.push({
            id: comment.id,
            type: 'user',
            content: content,
            timestamp: new Date(comment.date),
            author: comment.author?.name || 'Nepoznat korisnik',
            avatar: comment.author?.name ? comment.author.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'NK',
            projectId: project.id,
            references: comment.refs?.map(ref => ({
              type: 'reference',
              id: ref,
              title: this.parseReference(ref, project)
            })) || []
          });
        });

        // Document uploads
        position.documents?.forEach(doc => {
          const docDate = new Date(doc.uploadDate || doc.created || Date.now());
          const commentId = `doc-comment-${doc.id}`;
          const batchId = `doc-batch-${doc.id}`;

          chatItems.push({
            id: commentId,
            type: 'comment',
            author: 'Sistem',
            avatar: 'S',
            content: `📎 Dodao dokument "${doc.name}" za ${position.title}\n\n🔗 Datoteka: ${this.parseFileReference(doc.path)}`,
            timestamp: docDate,
            projectId: project.id,
            linkedItemId: batchId
          });

          chatItems.push({
            id: batchId,
            type: 'file_batch',
            batchType: doc.isImage ? 'image' : 'document',
            timestamp: docDate,
            uploadedBy: 'Sistem',
            avatar: 'S',
            files: [{
              id: doc.id,
              name: doc.name,
              size: doc.size || '0 B',
              type: doc.isImage ? 'image' : 'document'
            }],
            projectId: project.id,
            linkedItemId: commentId
          });
        });

        // Completed tasks
        position.tasks?.forEach(task => {
          if (task.status === 'done') {
            chatItems.push({
              id: `task-done-${task.id}`,
              type: 'system',
              content: `✅ Završen zadatak: ${task.title}`,
              timestamp: new Date(task.due || Date.now()),
              author: task.assignee?.name || 'Nepoznat',
              avatar: task.assignee?.name ? task.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'NK',
              projectId: project.id,
              references: [{ type: 'task', id: task.id, title: task.title }]
            });
          }
        });

        // Process completions
        position.processes?.forEach(process => {
          if (process.status === 'Završeno' && process.actualEnd) {
            chatItems.push({
              id: `process-done-${process.name}-${position.id}`,
              type: 'system',
              content: `🔄 Završen proces: ${process.name} za ${position.title}`,
              timestamp: new Date(process.actualEnd),
              author: process.owner?.name || 'Sistem',
              avatar: process.owner?.name ? process.owner.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'S',
              projectId: project.id,
              references: [{ type: 'process', id: process.name, title: process.name }]
            });
          }
        });
      });

      // Project history
      project.history?.slice(0, 10).forEach(historyItem => {
        chatItems.push({
          id: historyItem.id,
          type: 'system',
          content: `📝 ${historyItem.title}: ${historyItem.details || ''}`,
          timestamp: new Date(historyItem.date),
          author: 'Sistem',
          avatar: 'S',
          projectId: project.id,
          references: [{ type: 'history', id: historyItem.id, title: historyItem.title }]
        });
      });
    });

    return chatItems.sort((a, b) => a.timestamp - b.timestamp);
  }

  // ===== GANTT DATA METHODS =====
  
  /**
   * Get Gantt chart data for all projects
   */
  async getGanttData() {
    const data = await this.loadAllProjects();
    if (!data?.projects) return [];

    return data.projects.map(project => ({
      id: project.id,
      name: project.name,
      start: project.gantt?.start || project.created,
      end: project.gantt?.end || project.deadline,
      progress: this.calculateProjectProgress(project),
      client: project.client?.name || '',
      status: this.getProjectStatus(project),
      positions: project.positions?.map(position => ({
        id: position.id,
        title: position.title,
        progress: this.calculatePositionProgress(position),
        tasks: position.tasks?.map(task => ({
          id: task.id,
          title: task.title,
          start: task.start || task.created,
          due: task.due,
          status: task.status,
          assignee: task.assignee?.name || '',
          progress: task.status === 'done' ? 100 : (task.status === 'in_progress' ? 50 : 0)
        })) || [],
        processes: position.processes?.map(process => ({
          id: `${process.name}-${position.id}`,
          name: process.name,
          start: process.plannedStart,
          end: process.plannedEnd,
          actualStart: process.actualStart,
          actualEnd: process.actualEnd,
          status: process.status,
          progress: process.progress || 0,
          owner: process.owner?.name || ''
        })) || []
      })) || []
    }));
  }

  // ===== FLOOR MANAGER DATA METHODS =====
  
  /**
   * Get floor plan data for all positions
   */
  async getFloorData() {
    const data = await this.loadAllProjects();
    if (!data?.projects) return [];

    const floorData = [];
    
    data.projects.forEach(project => {
      project.positions?.forEach(position => {
        if (position.location) {
          floorData.push({
            id: position.id,
            title: position.title,
            project: project.name,
            projectId: project.id,
            location: position.location,
            status: this.getPositionStatus(position),
            progress: this.calculatePositionProgress(position),
            materials: position.materials?.map(mat => ({
              id: mat.id || mat.name,
              name: mat.name,
              quantity: mat.quantity || 0,
              unit: mat.unit || 'kom',
              status: mat.deliveryStatus || 'pending',
              location: mat.storageLocation || 'N/A'
            })) || [],
            activeTasks: position.tasks?.filter(t => t.status !== 'done').length || 0,
            activeProcesses: position.processes?.filter(p => p.status === 'U tijeku').length || 0,
            totalTasks: position.tasks?.length || 0,
            completedTasks: position.tasks?.filter(t => t.status === 'done').length || 0
          });
        }
      });
    });

    return floorData;
  }

  // ===== HELPER METHODS =====
  
  parseReference(ref, project) {
    if (!ref) return ref;
    
    if (ref.startsWith('acc:')) {
      const accId = ref.replace('acc:', '');
      const accDoc = project.accounting?.documents?.find(doc => doc.id === accId);
      return accDoc ? `📄 ${accDoc.documentType} ${accDoc.number}` : ref;
    }
    return this.parseFileReference(ref) || ref;
  }

  parseFileReference(fileRef) {
    if (!fileRef) return null;
    if (fileRef.startsWith('file:///')) {
      return fileRef.split('/').pop();
    }
    return fileRef;
  }

  calculateProjectProgress(project) {
    if (!project.positions?.length) return 0;
    
    const totalTasks = project.positions.reduce((sum, pos) => 
      sum + (pos.tasks?.length || 0), 0);
    const completedTasks = project.positions.reduce((sum, pos) => 
      sum + (pos.tasks?.filter(t => t.status === 'done').length || 0), 0);
    
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  calculatePositionProgress(position) {
    const tasks = position.tasks || [];
    if (tasks.length === 0) return 0;
    
    const completed = tasks.filter(t => t.status === 'done').length;
    return Math.round((completed / tasks.length) * 100);
  }

  getPositionStatus(position) {
    const processes = position.processes || [];
    const tasks = position.tasks || [];
    
    if (processes.some(p => p.status === 'U tijeku') || tasks.some(t => t.status === 'in_progress')) {
      return 'active';
    }
    if (processes.every(p => p.status === 'Završeno') && tasks.every(t => t.status === 'done')) {
      return 'completed';
    }
    return 'pending';
  }

  getProjectStatus(project) {
    const positions = project.positions || [];
    if (positions.length === 0) return 'pending';
    
    const activePositions = positions.filter(p => this.getPositionStatus(p) === 'active');
    const completedPositions = positions.filter(p => this.getPositionStatus(p) === 'completed');
    
    if (completedPositions.length === positions.length) return 'completed';
    if (activePositions.length > 0) return 'active';
    return 'pending';
  }

  // ===== CHAT MANAGEMENT METHODS =====
  
  /**
   * Add chat message to project
   */
  async addChatMessage(projectId, messageData) {
    const data = await this.loadAllProjects();
    const project = data.projects?.find(p => p.id === projectId);
    
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (!project.chat) {
      project.chat = [];
    }

    const newMessage = {
      id: this.generateId('CHAT'),
      timestamp: new Date().toISOString(),
      authorId: messageData.authorId || "system",
      message: messageData.message,
      attachments: messageData.attachments || [],
      agbimProcessing: messageData.agbimProcessing || null,
      ...messageData
    };

    project.chat.push(newMessage);
    await this.saveAllProjects(data);
    this.notifySubscribers('chat_message_added', { projectId, message: newMessage });
    return newMessage;
  }

  /**
   * Get chat messages for project
   */
  async getChatMessages(projectId) {
    const data = await this.loadAllProjects();
    const project = data.projects?.find(p => p.id === projectId);
    return project?.chat || [];
  }

  /**
   * Add AGBIM processing result to chat
   */
  async addAgbimResultToChat(agbimResult) {
    const { 
      context, 
      result, 
      attachments, 
      jobId 
    } = agbimResult;

    const projectId = context?.projectId;
    if (!projectId) {
      console.warn('No projectId in AGBIM result context, skipping chat integration');
      return null;
    }

    // Create chat message from AGBIM result
    const messageData = {
      authorId: context?.userId || "agbim_system",
      message: `🎙️ ${result?.transcript || 'Multimodalni zapis s terena'}`,
      attachments: attachments?.map(f => f.name) || [],
      agbimProcessing: {
        jobId: jobId,
        goriona: result?.goriona,
        aiFindings: {
          transcript: result?.transcript,
          summary: result?.summary,
          actionItems: result?.actionItems || [],
          risks: result?.risks || [],
          imageFindings: result?.imageFindings || [],
          videoFindings: result?.videoFindings || [],
          entities: result?.entities,
          confidence: result?.confidence
        }
      }
    };

    return this.addChatMessage(projectId, messageData);
  }

  // ===== TASK MANAGEMENT METHODS =====
  
  /**
   * Get all tasks from agbim.json
   */
  async getAllTasks() {
    const data = await this.loadAllProjects();
    return data.tasks || [];
  }

  /**
   * Add new task to agbim.json
   */
  async addTask(taskData) {
    const data = await this.loadAllProjects();
    if (!data.tasks) {
      data.tasks = [];
    }

    const newTask = {
      id: this.generateId('T'),
      title: taskData.title,
      description: taskData.description || "",
      status: taskData.status || "open",
      substatus: taskData.substatus || "",
      priority: taskData.priority || "normal",
      gorion: taskData.goriona || taskData.gorion || null,
      createdAt: new Date().toISOString(),
      assignedBy: { 
        id: (taskData.assignedBy && typeof taskData.assignedBy === 'string' && taskData.assignedBy.includes(' ')) ? 
            taskData.assignedBy.toLowerCase().replace(/\s+/g, '') : 
            (taskData.assignedBy || 'unknown'),
        name: taskData.assignedBy || 'Unknown'
      },
      assignee: { 
        id: (taskData.assignedTo && typeof taskData.assignedTo === 'string' && taskData.assignedTo.includes(' ')) ? 
            taskData.assignedTo.toLowerCase().replace(/\s+/g, '') : 
            (taskData.assignedTo || 'unknown'),
        name: taskData.assignedTo || 'Unknown'
      },
      startDate: taskData.startDate,
      dueDate: taskData.dueDate,
      confirm: {
        required: taskData.confirmRequired || false,
        confirmed: taskData.confirmed || false,
        confirmedBy: taskData.confirmedBy || null,
        confirmedAt: taskData.confirmedAt || null
      },
      links: {
        projectId: taskData.links?.projectId || null,
        positionIds: taskData.links?.positionIds || [],
        processPath: taskData.links?.processIds || [],
        documentIds: [],
        imageIds: [],
        videoIds: []
      },
      aiToolCalls: [],
      aiFindings: taskData.aiFindings || { 
        summary: "", 
        chatMessage: `${taskData.title} - dodano iz Task Hub-a.` 
      },
      visibleIn: ["chat", "tasks"]
    };

    data.tasks.push(newTask);
    await this.saveAllProjects(data);
    this.notifySubscribers('task_added', newTask);
    return newTask;
  }

  /**
   * Update existing task
   */
  async updateTask(taskId, updates) {
    const data = await this.loadAllProjects();
    const taskIndex = data.tasks?.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    const updatedTask = {
      ...data.tasks[taskIndex],
      ...updates,
      // Handle goriona vs gorion field compatibility
      gorion: updates.goriona || updates.gorion || data.tasks[taskIndex].gorion,
      // Update confirm structure properly
      confirm: {
        ...data.tasks[taskIndex].confirm,
        ...(updates.confirmRequired !== undefined ? { required: updates.confirmRequired } : {}),
        ...(updates.confirmed !== undefined ? { 
          confirmed: updates.confirmed,
          confirmedAt: updates.confirmed ? new Date().toISOString() : null,
          confirmedBy: updates.confirmed ? updates.confirmedBy || "user" : null
        } : {})
      },
      // Update assignee/assignedBy structure
      ...(updates.assignedTo && typeof updates.assignedTo === 'string' ? {
        assignee: {
          id: updates.assignedTo.includes(' ') ? updates.assignedTo.toLowerCase().replace(/\s+/g, '') : updates.assignedTo,
          name: updates.assignedTo
        }
      } : {}),
      ...(updates.assignedBy && typeof updates.assignedBy === 'string' ? {
        assignedBy: {
          id: updates.assignedBy.includes(' ') ? updates.assignedBy.toLowerCase().replace(/\s+/g, '') : updates.assignedBy,
          name: updates.assignedBy
        }
      } : {})
    };

    data.tasks[taskIndex] = updatedTask;
    await this.saveAllProjects(data);
    this.notifySubscribers('task_updated', updatedTask);
    return updatedTask;
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    const data = await this.loadAllProjects();
    const taskIndex = data.tasks?.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    const deletedTask = data.tasks[taskIndex];
    data.tasks.splice(taskIndex, 1);
    
    await this.saveAllProjects(data);
    this.notifySubscribers('task_deleted', deletedTask);
    return true;
  }

  /**
   * Get tasks filtered by project
   */
  async getTasksByProject(projectId) {
    const tasks = await this.getAllTasks();
    return tasks.filter(t => t.links?.projectId === projectId);
  }

  /**
   * Get tasks filtered by assignee
   */
  async getTasksByAssignee(assigneeName) {
    const tasks = await this.getAllTasks();
    return tasks.filter(t => 
      t.assignee?.name?.toLowerCase().includes(assigneeName.toLowerCase())
    );
  }

  /**
   * Get tasks filtered by status
   */
  async getTasksByStatus(status) {
    const tasks = await this.getAllTasks();
    return tasks.filter(t => t.status === status);
  }

  /**
   * Get tasks that need confirmation
   */
  async getTasksNeedingConfirmation() {
    const tasks = await this.getAllTasks();
    return tasks.filter(t => t.confirm?.required && !t.confirm?.confirmed);
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks() {
    const tasks = await this.getAllTasks();
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(t => 
      t.status !== "done" && 
      t.dueDate && 
      t.dueDate < today
    );
  }

  /**
   * Convert agbim task to TaskHub format for compatibility
   */
  convertAgbimTaskToTaskHub(agbimTask) {
    return {
      id: agbimTask.id,
      title: agbimTask.title,
      description: agbimTask.description || "",
      assignedBy: agbimTask.assignedBy?.name || "",
      assignedTo: agbimTask.assignee?.name || "",
      startDate: agbimTask.startDate,
      dueDate: agbimTask.dueDate,
      priority: agbimTask.priority,
      status: agbimTask.status,
      confirmRequired: agbimTask.confirm?.required || false,
      confirmed: agbimTask.confirm?.confirmed || false,
      confirmedAt: agbimTask.confirm?.confirmedAt,
      confirmedBy: agbimTask.confirm?.confirmedBy,
      goriona: agbimTask.gorion || null,
      links: {
        projectId: agbimTask.links?.projectId,
        positionIds: agbimTask.links?.positionIds || [],
        processIds: agbimTask.links?.processPath || [],
        subprocessIds: [],
        taskIds: [],
        subtaskIds: []
      },
      attachments: {
        docs: agbimTask.links?.documentIds?.map(id => ({ id, name: id })) || [],
        images: agbimTask.links?.imageIds?.map(id => ({ id, name: id })) || [],
        videos: agbimTask.links?.videoIds?.map(id => ({ id, name: id })) || []
      },
      meta: {
        aiFindings: agbimTask.aiFindings,
        visibleIn: agbimTask.visibleIn
      }
    };
  }

  /**
   * Convert TaskHub task to agbim format
   */
  convertTaskHubToAgbim(taskHubTask) {
    return {
      title: taskHubTask.title,
      description: taskHubTask.description,
      status: taskHubTask.status,
      priority: taskHubTask.priority,
      goriona: taskHubTask.goriona,
      assignedBy: taskHubTask.assignedBy,
      assignedTo: taskHubTask.assignedTo,
      startDate: taskHubTask.startDate,
      dueDate: taskHubTask.dueDate,
      confirmRequired: taskHubTask.confirmRequired,
      confirmed: taskHubTask.confirmed,
      confirmedAt: taskHubTask.confirmedAt,
      confirmedBy: taskHubTask.confirmedBy,
      links: taskHubTask.links
    };
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