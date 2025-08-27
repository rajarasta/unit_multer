// src/services/ProjectIOManager.js
import { 
  exportFull, 
  exportPartial, 
  exportPartialTree, 
  importFull, 
  importPartial, 
  importPartialTree 
} from '../utils/json-partial-io';

/**
 * Manager za rad s projektnim JSON fajlovima
 * Omogućava full i parcijalne operacije
 */
class ProjectIOManager {
  constructor(filePath = null) {
    this.filePath = filePath;
    this.cache = null;
    this.lastSync = null;
    this.listeners = new Set();
  }
  
  /**
   * Set file path
   */
  setFilePath(path) {
    this.filePath = path;
    this.cache = null;
    this.lastSync = null;
  }
  
  /**
   * Load full project data
   */
  async load(forceReload = false) {
    if (!this.filePath) {
      throw new Error('File path not set');
    }
    
    if (this.cache && !forceReload) {
      return this.cache;
    }
    
    try {
      this.cache = await exportFull(this.filePath);
      this.lastSync = new Date().toISOString();
      return this.cache;
    } catch (error) {
      console.error('Error loading project:', error);
      // Return empty project structure if file doesn't exist
      return this.getEmptyProject();
    }
  }
  
  /**
   * Save full project data
   */
  async save(data) {
    if (!this.filePath) {
      throw new Error('File path not set');
    }
    
    await importFull(this.filePath, data);
    this.cache = data;
    this.lastSync = new Date().toISOString();
    
    // Notify listeners
    this.notifyListeners('save', data);
    
    return data;
  }
  
  /**
   * Partial updates - specific paths
   */
  async updatePartial(patches) {
    if (!this.filePath) {
      throw new Error('File path not set');
    }
    
    // Update file
    await importPartial(this.filePath, patches);
    
    // Update cache if exists
    if (this.cache) {
      patches.forEach(patch => {
        this.applyPatchToCache(patch);
      });
    }
    
    this.lastSync = new Date().toISOString();
    this.notifyListeners('partial-update', patches);
  }
  
  /**
   * Update specific position
   */
  async updatePosition(positionIndex, updates) {
    const pointer = `/positions/${positionIndex}`;
    const patches = [{ pointer, value: updates }];
    await this.updatePartial(patches);
  }
  
  /**
   * Update specific task in position
   */
  async updateTask(positionIndex, taskIndex, updates) {
    const pointer = `/positions/${positionIndex}/tasks/${taskIndex}`;
    const patches = [{ pointer, value: updates }];
    await this.updatePartial(patches);
  }
  
  /**
   * Update specific process in position
   */
  async updateProcess(positionIndex, processIndex, updates) {
    const pointer = `/positions/${positionIndex}/processes/${processIndex}`;
    const patches = [{ pointer, value: updates }];
    await this.updatePartial(patches);
  }
  
  /**
   * Add document to position
   */
  async addDocument(positionIndex, document) {
    if (!this.cache) await this.load();
    
    const position = this.cache.positions[positionIndex];
    if (!position) throw new Error('Position not found');
    
    const newDocs = [...(position.documents || []), document];
    await this.updatePosition(positionIndex, { documents: newDocs });
  }
  
  /**
   * Export specific positions
   */
  async exportPositions(positionIds) {
    const pointers = positionIds.map(id => {
      const index = this.cache?.positions?.findIndex(p => p.id === id);
      return index !== -1 ? `/positions/${index}` : null;
    }).filter(Boolean);
    
    return await exportPartialTree(this.filePath, pointers);
  }
  
  /**
   * Import positions from another file
   */
  async importPositions(sourceFile, positionIds) {
    const sourceData = await exportFull(sourceFile);
    const positions = sourceData.positions.filter(p => positionIds.includes(p.id));
    
    if (!this.cache) await this.load();
    
    const newData = {
      ...this.cache,
      positions: [...this.cache.positions, ...positions]
    };
    
    await this.save(newData);
  }
  
  /**
   * Merge data from another project
   */
  async mergeProject(sourceFile, options = {}) {
    const sourceData = await exportFull(sourceFile);
    
    if (!this.cache) await this.load();
    
    const merged = this.mergeProjectData(this.cache, sourceData, options);
    await this.save(merged);
    
    return merged;
  }
  
  /**
   * Listen for changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Notify listeners
   */
  notifyListeners(type, data) {
    this.listeners.forEach(callback => {
      try {
        callback({ type, data, timestamp: new Date().toISOString() });
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
  
  // Helper methods
  
  /**
   * Apply patch to cached data
   */
  applyPatchToCache(patch) {
    const { pointer, value } = patch;
    const parts = pointer.split('/').filter(Boolean);
    
    let current = this.cache;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    
    const lastKey = parts[parts.length - 1];
    current[lastKey] = value;
  }
  
  /**
   * Merge two project structures
   */
  mergeProjectData(target, source, options = {}) {
    const { 
      mergePositions = true, 
      mergeDocuments = true, 
      mergeHistory = true,
      overwrite = false 
    } = options;
    
    const result = { ...target };
    
    if (mergePositions) {
      const existingIds = new Set(target.positions?.map(p => p.id) || []);
      const newPositions = source.positions?.filter(p => !existingIds.has(p.id)) || [];
      
      if (overwrite) {
        // Replace matching positions
        result.positions = [
          ...(target.positions?.filter(p => !source.positions?.find(sp => sp.id === p.id)) || []),
          ...(source.positions || [])
        ];
      } else {
        // Add only new positions
        result.positions = [...(target.positions || []), ...newPositions];
      }
    }
    
    if (mergeDocuments) {
      const existingDocIds = new Set(target.documents?.map(d => d.id) || []);
      const newDocs = source.documents?.filter(d => !existingDocIds.has(d.id)) || [];
      result.documents = [...(target.documents || []), ...newDocs];
    }
    
    if (mergeHistory) {
      result.history = [...(target.history || []), ...(source.history || [])];
    }
    
    return result;
  }
  
  /**
   * Get empty project structure
   */
  getEmptyProject() {
    return {
      id: `PRJ-${Date.now()}`,
      name: 'Novi Projekt',
      client: { name: '', oib: '' },
      created: new Date().toISOString(),
      owner: { id: '', name: '', email: '' },
      llmData: {
        summary: '',
        keywords: [],
        nextBestActions: []
      },
      descriptions: {
        short: '',
        long: '',
        technical: ''
      },
      documents: [],
      accounting: {
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
      floorplan: null,
      gantt: {
        scale: 'days',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      positions: [],
      history: [],
      dataCache: {
        enabled: false,
        lastSync: new Date().toISOString(),
        items: []
      }
    };
  }
  
  /**
   * Validate project structure
   */
  validateProject(data) {
    const errors = [];
    
    if (!data.id) errors.push('Missing project ID');
    if (!data.name) errors.push('Missing project name');
    if (!Array.isArray(data.positions)) errors.push('Positions must be an array');
    
    data.positions?.forEach((pos, index) => {
      if (!pos.id) errors.push(`Position ${index} missing ID`);
      if (!pos.title) errors.push(`Position ${index} missing title`);
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance for shared state
let sharedInstance = null;

export function getSharedIOManager(filePath = null) {
  if (!sharedInstance) {
    sharedInstance = new ProjectIOManager(filePath);
  } else if (filePath && sharedInstance.filePath !== filePath) {
    sharedInstance.setFilePath(filePath);
  }
  return sharedInstance;
}

export default ProjectIOManager;