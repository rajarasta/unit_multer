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
}

export default AgbimDataService;