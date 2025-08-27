// src/components/tabs/PlannerGantt/services/JsonStorageService.js
/**
 * Browser-compatible JsonStorageService
 * Uses localStorage for persistence and BroadcastChannel for cross-tab sync
 * Implements JSON Pointer (RFC 6901) for granular updates
 */
class JsonStorageService {
  constructor(storageKey = 'unified_projects') {
    this.storageKey = storageKey;
    this.channel = null;
    this.listeners = new Set();
    
    // Initialize broadcast channel for cross-tab communication
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('project_data_sync');
        this.channel.onmessage = (event) => {
          if (event.data.type === 'data_updated' && event.data.key === this.storageKey) {
            // Notify all listeners about external changes
            this.notifyListeners(event.data.data);
          }
        };
      } catch (error) {
        console.warn('BroadcastChannel not supported, falling back to single-tab mode');
      }
    }
  }

  // ---------- Core Storage Operations ----------
  
  /**
   * Read data from localStorage
   */
  async readJson() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (!data) return null;
      
      // Handle both string and already parsed data
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch (parseError) {
          console.error('Error parsing stored data:', parseError);
          return null;
        }
      }
      return data;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Write data to localStorage and notify other tabs
   */
  async writeJson(data) {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      localStorage.setItem(this.storageKey, jsonString);
      
      // Notify other tabs about the change
      if (this.channel) {
        try {
          this.channel.postMessage({
            type: 'data_updated',
            key: this.storageKey,
            data: data,
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn('Failed to broadcast update:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded. Attempting cleanup...');
        
        // Try to clean up old backups first
        this.cleanupOldBackups();
        
        // Also clean up any other large items to free space
        this.emergencyCleanup();
        
        // Retry with compressed data (no formatting)
        try {
          const compressedData = JSON.stringify(data);
          localStorage.setItem(this.storageKey, compressedData);
          console.log('Successfully saved data after cleanup');
          return true;
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError);
          
          // Last resort: try to save a minimal version
          try {
            const minimalData = this.createMinimalDataVersion(data);
            const minimalJson = JSON.stringify(minimalData);
            localStorage.setItem(this.storageKey, minimalJson);
            console.warn('Saved minimal data version due to storage constraints');
            return true;
          } catch (minimalError) {
            console.error('Failed to save even minimal data:', minimalError);
            // Return false instead of throwing to prevent infinite loops
            return false;
          }
        }
      }
      
      throw error;
    }
  }

  // ---------- JSON Pointer Operations (RFC 6901) ----------
  
  /**
   * Split JSON Pointer into path segments
   */
  splitPointer(ptr) {
    if (ptr === '' || ptr === '#') return [];
    if (!ptr.startsWith('/')) {
      throw new Error(`Invalid JSON Pointer: "${ptr}"`);
    }
    
    return ptr
      .slice(1)
      .split('/')
      .map(seg => seg.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  /**
   * Get value by JSON Pointer
   */
  getByPointer(root, pointer) {
    if (!root) return undefined;
    
    const parts = this.splitPointer(pointer);
    let cur = root;
    
    for (const keyRaw of parts) {
      const key = Array.isArray(cur) ? this.toIndex(keyRaw) : keyRaw;
      if (cur == null || !(key in cur)) {
        return undefined;
      }
      cur = cur[key];
    }
    
    return cur;
  }

  /**
   * Set value by JSON Pointer
   */
  setByPointer(root, pointer, value, options = {}) {
    const { mode = 'replace' } = options;
    const parts = this.splitPointer(pointer);
    
    // Handle root replacement
    if (parts.length === 0) {
      if (mode === 'merge' && this.isObject(root) && this.isObject(value)) {
        const merged = { ...root };
        this.deepMergeInto(merged, value);
        return merged;
      }
      return value;
    }
    
    // Clone root to avoid mutations
    const newRoot = this.deepClone(root || {});
    let cur = newRoot;
    
    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      let key = parts[i];
      if (Array.isArray(cur)) {
        key = this.toIndex(key);
      }
      
      // Create intermediate nodes if they don't exist
      if (!(key in cur) || cur[key] == null || typeof cur[key] !== 'object') {
        // Determine if next segment is array index
        const nextKey = parts[i + 1];
        const isNextArray = /^\d+$/.test(nextKey);
        cur[key] = isNextArray ? [] : {};
      }
      
      cur = cur[key];
    }
    
    // Set the final value
    let last = parts[parts.length - 1];
    if (Array.isArray(cur)) {
      last = this.toIndex(last);
    }

    if (mode === 'merge' && this.isObject(cur[last]) && this.isObject(value)) {
      if (!cur[last]) cur[last] = {};
      this.deepMergeInto(cur[last], value);
    } else {
      cur[last] = value;
    }
    
    return newRoot;
  }

  /**
   * Delete value by JSON Pointer
   */
  deleteByPointer(root, pointer) {
    const parts = this.splitPointer(pointer);
    if (parts.length === 0) return undefined;
    
    const newRoot = this.deepClone(root || {});
    let cur = newRoot;
    
    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      let key = parts[i];
      if (Array.isArray(cur)) {
        key = this.toIndex(key);
      }
      
      if (!(key in cur)) return newRoot;
      cur = cur[key];
    }
    
    // Delete the final key
    let last = parts[parts.length - 1];
    if (Array.isArray(cur)) {
      last = this.toIndex(last);
      cur.splice(last, 1);
    } else {
      delete cur[last];
    }
    
    return newRoot;
  }

  /**
   * Convert string to array index
   */
  toIndex(s) {
    if (s === '-') {
      throw new Error('Append operator "-" not supported');
    }
    const n = Number(s);
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`Expected non-negative array index, got "${s}"`);
    }
    return n;
  }

  /**
   * Check if value is a plain object
   */
  isObject(x) {
    return x !== null && typeof x === 'object' && !Array.isArray(x) && !(x instanceof Date);
  }

  /**
   * Deep clone an object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Deep merge source into target (mutates target)
   */
  deepMergeInto(target, source) {
    if (!this.isObject(target) || !this.isObject(source)) return;
    
    for (const [key, value] of Object.entries(source)) {
      if (this.isObject(value)) {
        if (!this.isObject(target[key])) {
          target[key] = {};
        }
        this.deepMergeInto(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  // ---------- Export Operations ----------
  
  /**
   * Full export: read entire data
   */
  async exportFull() {
    return this.readJson();
  }

  /**
   * Partial export: return map of { pointer: value } for requested paths
   */
  async exportPartial(pointers) {
    const data = await this.readJson();
    if (!data) return {};
    
    const out = {};
    for (const p of pointers) {
      out[p] = this.getByPointer(data, p);
    }
    return out;
  }

  /**
   * Partial export tree: build minimal tree with requested parts
   */
  async exportPartialTree(pointers) {
    const data = await this.readJson();
    if (!data) return {};
    
    const tree = {};
    for (const p of pointers) {
      const val = this.getByPointer(data, p);
      if (val !== undefined) {
        this.buildTree(tree, p, val);
      }
    }
    return tree;
  }

  /**
   * Build tree structure from pointer and value
   */
  buildTree(root, pointer, value) {
    const parts = this.splitPointer(pointer);
    let cur = root;
    
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      const isLast = i === parts.length - 1;
      
      if (isLast) {
        cur[seg] = value;
      } else {
        if (!this.isObject(cur[seg])) {
          // Check if next segment is numeric (array index)
          const nextSeg = parts[i + 1];
          cur[seg] = /^\d+$/.test(nextSeg) ? [] : {};
        }
        cur = cur[seg];
      }
    }
  }

  // ---------- Import Operations ----------
  
  /**
   * Full import: completely replace data
   */
  async importFull(newObject) {
    const success = await this.writeJson(newObject);
    if (!success) {
      console.error('Failed to save data to localStorage - data may not persist');
      // Still return the object so the application can continue
      // but the user should be aware that data won't persist
    }
    return newObject;
  }

  /**
   * Partial import: apply list of patches
   */
  async importPartial(patches, options = {}) {
    const { mode = 'replace' } = options;
    
    let data = await this.readJson();
    if (!data) data = {};
    
    for (const patch of patches) {
      if (patch.op === 'delete' || patch.op === 'remove') {
        data = this.deleteByPointer(data, patch.pointer || patch.path);
      } else {
        const pointer = patch.pointer || patch.path;
        const value = patch.value;
        data = this.setByPointer(data, pointer, value, { mode });
      }
    }
    
    await this.writeJson(data);
    return data;
  }

  /**
   * Partial import from composite tree
   */
  async importPartialTree(tree, options = {}) {
    const { mode = 'replace' } = options;
    const patches = this.flattenTreeToPatches(tree);
    return this.importPartial(patches, { mode });
  }

  /**
   * Flatten tree to patches array
   */
  flattenTreeToPatches(tree, base = '') {
    const patches = [];
    
    const walk = (obj, pathParts) => {
      for (const [key, value] of Object.entries(obj)) {
        const next = [...pathParts, key];
        
        // Check if this is a leaf value or should recurse
        if (this.isObject(value) && Object.keys(value).length > 0) {
          // Check if all keys are numeric (array representation)
          const keys = Object.keys(value);
          const isArrayLike = keys.every(k => /^\d+$/.test(k));
          
          if (isArrayLike) {
            // Convert to array
            const arr = [];
            for (const k of keys) {
              arr[parseInt(k)] = value[k];
            }
            const pointer = '/' + next.map(s => this.escapePointer(s)).join('/');
            patches.push({ pointer, value: arr });
          } else if (this.shouldTreatAsLeaf(value)) {
            const pointer = '/' + next.map(s => this.escapePointer(s)).join('/');
            patches.push({ pointer, value });
          } else {
            walk(value, next);
          }
        } else {
          const pointer = '/' + next.map(s => this.escapePointer(s)).join('/');
          patches.push({ pointer, value });
        }
      }
    };
    
    walk(tree, base ? this.splitPointer(base) : []);
    return patches;
  }

  /**
   * Determine if an object should be treated as a leaf value
   */
  shouldTreatAsLeaf(obj) {
    // Treat certain objects as leaf values (e.g., Date, specific structures)
    if (obj instanceof Date) return true;
    
    // Check for specific data structures that should be kept intact
    if (obj.hasOwnProperty('id') && obj.hasOwnProperty('name')) return true;
    if (obj.hasOwnProperty('x') && obj.hasOwnProperty('y')) return true;
    
    return false;
  }

  /**
   * Escape special characters in pointer segment
   */
  escapePointer(s) {
    return String(s).replace(/~/g, '~0').replace(/\//g, '~1');
  }

  // ---------- Browser-Specific Methods ----------
  
  /**
   * Export data as downloadable file
   */
  downloadAsFile(data, filename = 'unified_projects.json') {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import data from file
   */
  async importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const data = JSON.parse(content);
          resolve(data);
        } catch (error) {
          reject(new Error('Invalid JSON file: ' + error.message));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Create backup with timestamp
   */
  async createBackup() {
    try {
      const data = await this.readJson();
      if (!data) return null;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupKey = `${this.storageKey}_backup_${timestamp}`;
      
      localStorage.setItem(backupKey, JSON.stringify(data));
      
      // Keep only last 5 backups
      this.cleanupOldBackups(5);
      
      return backupKey;
    } catch (error) {
      console.error('Error creating backup:', error);
      return null;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup not found');
      }
      
      const data = JSON.parse(backupData);
      await this.writeJson(data);
      return data;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  listBackups() {
    const backups = [];
    const backupPrefix = `${this.storageKey}_backup_`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(backupPrefix)) {
        const timestamp = key.replace(backupPrefix, '');
        try {
          const dateStr = timestamp.replace(/-/g, ':').replace('T', ' ');
          backups.push({
            key,
            timestamp,
            date: new Date(dateStr)
          });
        } catch (error) {
          console.warn(`Invalid backup timestamp: ${timestamp}`);
        }
      }
    }
    
    return backups.sort((a, b) => b.date - a.date);
  }

  /**
   * Clean up old backups, keeping only the most recent ones
   */
  cleanupOldBackups(keepCount = 5) {
    try {
      const backups = this.listBackups();
      
      if (backups.length > keepCount) {
        const toRemove = backups.slice(keepCount);
        for (const backup of toRemove) {
          try {
            localStorage.removeItem(backup.key);
            console.log(`Removed old backup: ${backup.key}`);
          } catch (error) {
            console.error(`Failed to remove backup ${backup.key}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
  }

  /**
   * Emergency cleanup to free up localStorage space
   */
  emergencyCleanup() {
    try {
      // Remove all backups except the most recent one
      this.cleanupOldBackups(1);
      
      // Clean up any temporary data that might exist
      const keysToCheck = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('temp_') || key.includes('cache_') || key.includes('_old'))) {
          keysToCheck.push(key);
        }
      }
      
      keysToCheck.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`Removed temporary item: ${key}`);
        } catch (error) {
          console.error(`Failed to remove temporary item ${key}:`, error);
        }
      });
      
    } catch (error) {
      console.error('Error in emergency cleanup:', error);
    }
  }

  /**
   * Create a minimal version of the data for storage when space is limited
   */
  createMinimalDataVersion(data) {
    try {
      // Create a minimal version with only essential data
      const minimal = {
        version: data.version || '5.0',
        exportDate: new Date().toISOString(),
        meta: {
          schemaName: 'project.unified',
          schemaVersion: '5.0.0',
          types: {}
        },
        projects: [],
        activeProjectId: data.activeProjectId || null
      };

      // Include only essential project data
      if (data.projects && Array.isArray(data.projects)) {
        minimal.projects = data.projects.map(project => ({
          id: project.id,
          name: project.name || 'Untitled Project',
          client: {
            name: project.client?.name || '',
            oib: project.client?.oib || ''
          },
          created: project.created || new Date().toISOString(),
          owner: project.owner || { id: 'u1', name: 'User', email: 'user@example.com' },
          // Keep only essential position data
          positions: (project.positions || []).map(position => ({
            id: position.id,
            title: position.title || 'Untitled Position',
            processes: (position.processes || []).map(process => ({
              name: process.name,
              status: process.status || 'Čeka',
              progress: process.progress || 0
            }))
          }))
        }));
      }

      return minimal;
    } catch (error) {
      console.error('Error creating minimal data version:', error);
      // Return absolute minimum
      return {
        version: '5.0',
        exportDate: new Date().toISOString(),
        meta: { schemaName: 'project.unified', schemaVersion: '5.0.0', types: {} },
        projects: [],
        activeProjectId: null
      };
    }
  }

  /**
   * Get storage size info
   */
  async getStorageInfo() {
    try {
      const data = await this.readJson();
      const dataSize = data ? new Blob([JSON.stringify(data)]).size : 0;
      
      // Estimate total localStorage usage
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      
      // Check if storage estimate API is available
      let quota = null;
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        quota = estimate.quota;
      }
      
      return {
        dataSize,
        dataSizeKB: (dataSize / 1024).toFixed(2),
        dataSizeMB: (dataSize / 1024 / 1024).toFixed(2),
        totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        usage: totalSize > 0 ? ((dataSize / totalSize) * 100).toFixed(1) : 0,
        quota: quota ? (quota / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown',
        backups: this.listBackups().length
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribe(callback) {
    this.listeners.add(callback);
    
    // Also listen for storage events (changes from other tabs)
    const storageHandler = (e) => {
      if (e.key === this.storageKey) {
        try {
          const newData = e.newValue ? JSON.parse(e.newValue) : null;
          callback(newData);
        } catch (error) {
          console.error('Error parsing storage event data:', error);
        }
      }
    };
    
    window.addEventListener('storage', storageHandler);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      window.removeEventListener('storage', storageHandler);
    };
  }

  /**
   * Notify all listeners about data changes
   */
  notifyListeners(data) {
    this.listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in storage listener:', error);
      }
    });
  }

  /**
   * Clear all data
   */
  async clearAll() {
    try {
      localStorage.removeItem(this.storageKey);
      
      // Also clear all backups
      const backups = this.listBackups();
      for (const backup of backups) {
        localStorage.removeItem(backup.key);
      }
      
      // Notify other tabs
      if (this.channel) {
        this.channel.postMessage({
          type: 'data_cleared',
          key: this.storageKey,
          timestamp: Date.now()
        });
      }
      
      // Notify local listeners
      this.notifyListeners(null);
      
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Validate JSON structure
   */
  validateStructure(data) {
    const errors = [];
    const warnings = [];
    
    if (!data) {
      errors.push('Data is null or undefined');
      return { valid: false, errors, warnings };
    }
    
    if (!data.version) warnings.push('Missing version field');
    if (!data.projects) errors.push('Missing projects array');
    if (data.projects && !Array.isArray(data.projects)) {
      errors.push('Projects field is not an array');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export default JsonStorageService;