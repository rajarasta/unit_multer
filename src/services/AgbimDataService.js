/**
 * AgbimDataService - Direct file-based backend integration
 * Reads from and writes to agbim.json directly
 */
class AgbimDataService {
  constructor() {
    this.filePath = '/src/backend/agbim.json';
    this.writeEndpoint = 'http://localhost:3001/api/save-agbim'; // File server endpoint
    this.cache = null;
    this.cacheTimestamp = null;
    this.cacheTimeout = 2000; // 2 seconds cache
    
    // Add dispatch-specific endpoints
    this.dispatchEndpoint = 'http://localhost:3001/api/dispatch';
    this.warehouseEndpoint = 'http://localhost:3001/api/warehouse';
    
    // Clear oversized localStorage on startup
    this.performStartupCleanup();
  }

  /**
   * Perform cleanup on service startup
   */
  performStartupCleanup() {
    try {
      // Clear the large cache that's causing quota issues
      const cachedData = localStorage.getItem('agbim_data_cache');
      if (cachedData) {
        const size = cachedData.length;
        if (size > 1024 * 1024) { // If larger than 1MB
          console.warn(`🧹 Clearing oversized localStorage cache (${(size / 1024 / 1024).toFixed(2)}MB)`);
          localStorage.removeItem('agbim_data_cache');
        }
      }
    } catch (error) {
      console.warn('Startup cleanup failed:', error);
      // Force clear if there's any error
      try {
        localStorage.clear();
        console.log('🧹 Force cleared all localStorage due to cleanup error');
      } catch (clearError) {
        // Ignore
      }
    }
  }

  /**
   * Read data from agbim.json
   */
  async readJson() {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cache && this.cacheTimestamp && (now - this.cacheTimestamp) < this.cacheTimeout) {
      return this.cache;
    }

    try {
      const response = await fetch(this.filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update cache
      this.cache = data;
      this.cacheTimestamp = now;
      
      return data;
    } catch (error) {
      console.error('Error reading agbim.json:', error);
      
      // Return cached data if available, even if stale
      if (this.cache) {
        console.warn('Returning stale cached data due to read error');
        return this.cache;
      }
      
      // Return empty structure as fallback
      return {
        version: "5.2",
        exportDate: new Date().toISOString(),
        meta: {
          schemaName: "project.unified",
          schemaVersion: "5.2.0",
          extensions: {
            "task.gorion": {
              type: "string",
              description: "lagana vatra|krčka se|ladno|nestalo plina|nestalo struje|izgorilo|svaki čas će se zapalit|ako sad ne zaliješ zapalit će se"
            }
          }
        },
        people: [],
        projects: [],
        tasks: [],
        aiOutputs: []
      };
    }
  }

  /**
   * Clear localStorage if it's too large
   */
  clearLocalStorageIfNeeded() {
    try {
      // Check localStorage size (rough estimate)
      let total = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage[key].length;
        }
      }
      
      // If total size is more than 4MB (rough localStorage limit is 5-10MB)
      if (total > 4 * 1024 * 1024) {
        console.warn('🧹 localStorage is too large, clearing cache');
        localStorage.removeItem('agbim_data_cache');
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Error checking localStorage size:', error);
      return false;
    }
  }

  /**
   * Save only essential data to localStorage (summary, not full data)
   */
  saveToLocalStorageSafely(data) {
    try {
      // Clear if needed first
      this.clearLocalStorageIfNeeded();
      
      // Create a lightweight version for localStorage
      const lightData = {
        version: data.version,
        lastUpdated: new Date().toISOString(),
        projectCount: data.projects?.length || 0,
        chatCount: data.projects?.reduce((total, p) => total + (p.chat?.length || 0), 0) || 0,
        taskCount: data.tasks?.length || 0,
        // Store only recent chat messages (last 10) for quick access
        recentChats: data.projects?.map(p => ({
          id: p.id,
          name: p.name,
          recentMessages: (p.chat || []).slice(-10)
        })) || []
      };
      
      localStorage.setItem('agbim_data_summary', JSON.stringify(lightData));
      console.log('💾 Saved lightweight summary to localStorage');
      return true;
    } catch (error) {
      console.warn('Failed to save to localStorage, quota likely exceeded:', error);
      // Clear all cache if we can't save
      try {
        localStorage.removeItem('agbim_data_cache');
        localStorage.removeItem('agbim_data_summary');
      } catch (clearError) {
        // Ignore clear errors
      }
      return false;
    }
  }

  /**
   * Write data to agbim.json
   */
  async writeJson(data) {
    try {
      // Write to actual agbim.json file using API endpoint
      const response = await fetch(this.writeEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data, null, 2)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Update in-memory cache after successful write
      this.cache = data;
      this.cacheTimestamp = Date.now();
      
      // Save lightweight version to localStorage instead of full data
      this.saveToLocalStorageSafely(data);
      
      console.log('✅ Data saved to agbim.json file successfully');
      return true;
    } catch (error) {
      console.error('Error writing to agbim.json:', error);
      
      // If file write fails, we'll rely on the file-writer service retry
      // Don't try to save full data to localStorage as fallback
      console.warn('⚠️ File write failed - data may not be persisted');
      throw error;
    }
  }

  /**
   * Try to read from file primarily, localStorage only for emergency
   */
  async loadAllProjects() {
    // First, try to read from the actual file (primary source)
    try {
      console.log('📁 Loading data from agbim.json file');
      const fileData = await this.readJson();
      
      // Update localStorage summary after successful file read
      this.saveToLocalStorageSafely(fileData);
      
      return fileData;
    } catch (error) {
      console.warn('Failed to read from file, trying localStorage cache:', error);
    }

    // Fallback: try old localStorage cache
    try {
      const cachedData = localStorage.getItem('agbim_data_cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        this.cache = parsed;
        this.cacheTimestamp = Date.now();
        console.log('📦 Using localStorage cache as fallback');
        return parsed;
      }
    } catch (error) {
      console.warn('Error reading from localStorage cache:', error);
      // Clear corrupted cache
      try {
        localStorage.removeItem('agbim_data_cache');
      } catch {}
    }

    // Final fallback: return empty structure
    console.warn('Using empty structure as final fallback');
    return this.getEmptyStructure();
  }

  /**
   * Get empty data structure
   */
  getEmptyStructure() {
    return {
      version: "5.2",
      exportDate: new Date().toISOString(),
      meta: {
        schemaName: "project.unified",
        schemaVersion: "5.2.0",
        extensions: {
          "task.gorion": {
            type: "string",
            description: "lagana vatra|krčka se|ladno|nestalo plina|nestalo struje|izgorilo|svaki čas će se zapalit|ako sad ne zaliješ zapalit će se"
          }
        }
      },
      people: [],
      projects: [],
      tasks: [],
      aiOutputs: []
    };
  }

  /**
   * Save all projects data
   */
  async saveAllProjects(data) {
    return this.writeJson(data);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = null;
    this.cacheTimestamp = null;
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
   * Import full data structure
   */
  async importFull(data) {
    return this.writeJson(data);
  }

  // ==================== DISPATCH OPERATIONS ====================

  /**
   * Create new dispatch
   */
  async createDispatch(projectId, dispatchData) {
    try {
      const data = await this.loadJson();
      const project = data.projects?.find(p => p.id === projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.dispatches) {
        project.dispatches = [];
      }

      // Generate dispatch ID and document number
      const dispatchId = `dispatch_${Date.now()}`;
      const documentNumber = `OTPR-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-${String(project.dispatches.length + 1).padStart(4, '0')}`;

      const newDispatch = {
        id: dispatchId,
        documentNumber,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user_demo',
        items: [],
        recipient: dispatchData.recipient || {},
        transport: dispatchData.transport || {},
        documents: [],
        notes: dispatchData.notes || '',
        ...dispatchData
      };

      project.dispatches.push(newDispatch);
      
      // Update history
      if (!project.history) project.history = [];
      project.history.push({
        id: `h_${Date.now()}`,
        date: new Date().toISOString(),
        type: 'dispatch',
        title: 'Kreirana nova otpremnica',
        details: `Otpremnica ${documentNumber} kreirana`,
        userId: 'user_demo',
        dispatchId: dispatchId
      });

      await this.writeJson(data);
      console.log(`📦 Created dispatch ${documentNumber}`);
      return newDispatch;
    } catch (error) {
      console.error('Error creating dispatch:', error);
      throw error;
    }
  }

  /**
   * Update existing dispatch
   */
  async updateDispatch(projectId, dispatchId, updates) {
    try {
      const data = await this.loadJson();
      const project = data.projects?.find(p => p.id === projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const dispatch = project.dispatches?.find(d => d.id === dispatchId);
      if (!dispatch) {
        throw new Error(`Dispatch ${dispatchId} not found`);
      }

      Object.assign(dispatch, updates, {
        updatedAt: new Date().toISOString()
      });

      await this.writeJson(data);
      console.log(`📦 Updated dispatch ${dispatch.documentNumber}`);
      return dispatch;
    } catch (error) {
      console.error('Error updating dispatch:', error);
      throw error;
    }
  }

  /**
   * Add items to dispatch
   */
  async addItemsToDispatch(projectId, dispatchId, items) {
    try {
      const data = await this.loadJson();
      const project = data.projects?.find(p => p.id === projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const dispatch = project.dispatches?.find(d => d.id === dispatchId);
      if (!dispatch) {
        throw new Error(`Dispatch ${dispatchId} not found`);
      }

      // Add or update items
      items.forEach(newItem => {
        const existingIndex = dispatch.items.findIndex(item => item.positionId === newItem.positionId);
        if (existingIndex >= 0) {
          // Update existing item
          dispatch.items[existingIndex].quantity += newItem.quantity;
          dispatch.items[existingIndex].updatedAt = new Date().toISOString();
        } else {
          // Add new item
          dispatch.items.push({
            id: `item_${Date.now()}_${newItem.positionId}`,
            positionId: newItem.positionId,
            positionTitle: newItem.position?.title || newItem.positionTitle,
            quantity: newItem.quantity,
            plannedQty: newItem.plannedQty || newItem.quantity,
            status: 'ready',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });

      // Update position dispatch status
      items.forEach(item => {
        const position = project.positions?.find(p => p.id === item.positionId);
        if (position && position.dispatch) {
          position.dispatch.reserved += item.quantity;
          position.dispatch.remaining = Math.max(0, position.dispatch.remaining - item.quantity);
        }
      });

      dispatch.updatedAt = new Date().toISOString();
      await this.writeJson(data);
      
      console.log(`📦 Added ${items.length} items to dispatch ${dispatch.documentNumber}`);
      return dispatch;
    } catch (error) {
      console.error('Error adding items to dispatch:', error);
      throw error;
    }
  }

  /**
   * Confirm dispatch (change status to confirmed)
   */
  async confirmDispatch(projectId, dispatchId) {
    try {
      const dispatch = await this.updateDispatch(projectId, dispatchId, {
        status: 'confirmed',
        confirmedAt: new Date().toISOString()
      });

      // Update position quantities
      const data = await this.loadJson();
      const project = data.projects?.find(p => p.id === projectId);
      
      if (project && dispatch.items) {
        dispatch.items.forEach(item => {
          const position = project.positions?.find(p => p.id === item.positionId);
          if (position && position.dispatch) {
            position.dispatch.shipped += item.quantity;
            position.dispatch.reserved -= item.quantity;
            position.dispatch.lastShipped = new Date().toISOString();
          }
        });

        // Add to history
        project.history.push({
          id: `h_${Date.now()}`,
          date: new Date().toISOString(),
          type: 'dispatch',
          title: 'Otprema potvrđena',
          details: `Otpremnica ${dispatch.documentNumber} potvrđena - ${dispatch.items.length} stavki`,
          userId: 'user_demo',
          dispatchId: dispatchId
        });

        await this.writeJson(data);
      }

      console.log(`✅ Confirmed dispatch ${dispatch.documentNumber}`);
      return dispatch;
    } catch (error) {
      console.error('Error confirming dispatch:', error);
      throw error;
    }
  }

  /**
   * Get all dispatches for project
   */
  async getDispatches(projectId) {
    try {
      const data = await this.loadJson();
      const project = data.projects?.find(p => p.id === projectId);
      return project?.dispatches || [];
    } catch (error) {
      console.error('Error getting dispatches:', error);
      return [];
    }
  }

  /**
   * Update project (enhanced version)
   */
  async updateProject(projectId, updates) {
    try {
      const data = await this.loadJson();
      const projectIndex = data.projects?.findIndex(p => p.id === projectId);
      
      if (projectIndex >= 0) {
        // Update existing project
        data.projects[projectIndex] = {
          ...data.projects[projectIndex],
          ...updates,
          updated: new Date().toISOString()
        };
      } else {
        // Add new project
        if (!data.projects) data.projects = [];
        data.projects.push({
          ...updates,
          id: projectId,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        });
      }

      await this.writeJson(data);
      console.log(`💾 Updated project ${projectId}`);
      return data.projects[projectIndex >= 0 ? projectIndex : data.projects.length - 1];
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  // ==================== WAREHOUSE OPERATIONS ====================

  /**
   * Update warehouse stock
   */
  async updateWarehouseStock(projectId, movements) {
    try {
      const data = await this.loadJson();
      const project = data.projects?.find(p => p.id === projectId);
      
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.warehouse) {
        project.warehouse = { sections: [], movements: [] };
      }

      // Add movements
      movements.forEach(movement => {
        project.warehouse.movements.push({
          id: `mov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          type: movement.type, // 'in', 'out', 'transfer'
          positionId: movement.positionId,
          quantity: movement.quantity,
          section: movement.section,
          notes: movement.notes || '',
          userId: 'user_demo'
        });
      });

      await this.writeJson(data);
      console.log(`📦 Updated warehouse with ${movements.length} movements`);
      return project.warehouse;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }
  }
}

export default AgbimDataService;