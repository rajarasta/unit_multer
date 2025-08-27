// src/adapters/UnifiedAdapterV2.js
import { PROCESI, STATUSI } from '../components/tabs/PlannerGantt/constants';

class UnifiedAdapterV2 {
  /**
   * MAPIRANJE POLJA - centralno mjesto za definicije
   */
  static fieldMappings = {
    // Gantt → Unified mapiranje
    ganttToUnified: {
      // Standardna polja
      'naziv': 'name',
      'pozicija': 'positionId', 
      'proces': 'processType',
      'start': 'actualStart',
      'end': 'actualEnd',
      'plannedStart': 'plannedStart',
      'plannedEnd': 'plannedEnd',
      'status': 'status',
      'progress': 'progress',
      'odgovorna_osoba': 'owner.name',
      'opis': 'notes',
      'urgency': 'urgency',
      
      // NOVA POLJA - lako dodajete
      'priority': 'priority',
      'tags': 'tags',
      'dependencies': 'dependencies',
      'estimatedHours': 'estimates.hours',
      'actualHours': 'actuals.hours',
      'customFields': '_custom'  // Posebno rukovanje
    },
    
    // Unified → Gantt mapiranje
    unifiedToGantt: {
      'name': 'naziv',
      'positionId': 'pozicija',
      'processType': 'proces',
      'actualStart': 'start',
      'actualEnd': 'end',
      'plannedStart': 'plannedStart',
      'plannedEnd': 'plannedEnd',
      'status': 'status',
      'progress': 'progress',
      'owner.name': 'odgovorna_osoba',
      'notes': 'opis',
      'urgency': 'urgency',
      
      // NOVA POLJA
      'priority': 'priority',
      'tags': 'tags',
      'dependencies': 'dependencies',
      'estimates.hours': 'estimatedHours',
      'actuals.hours': 'actualHours',
      '_custom': 'customFields'
    }
  };

  /**
   * Transformira unified strukturu u Gantt format
   * ENHANCED: Čuva sva nepoznata polja u _meta
   */
  static fromUnified(unifiedProject) {
    if (!unifiedProject) return null;
    
    if (Array.isArray(unifiedProject)) {
      return {
        version: '5.1',  // Povećana verzija
        projects: unifiedProject.map(p => this.unifiedToGanttProject(p)),
        activeProjectId: unifiedProject[0]?.id || null,
        _meta: {
          adapterVersion: '2.0',
          lastConversion: new Date().toISOString(),
          preservedFields: []  // Lista sačuvanih nepoznatih polja
        }
      };
    }
    
    const ganttProject = this.unifiedToGanttProject(unifiedProject);
    return {
      version: '5.1',
      projects: [ganttProject],
      activeProjectId: ganttProject.id,
      _meta: {
        adapterVersion: '2.0',
        lastConversion: new Date().toISOString()
      }
    };
  }
  
  /**
   * Smart field mapper - čuva nepoznata polja
   */
  static mapFields(source, mapping, preserveUnknown = true) {
    const result = {};
    const preserved = {};
    
    // Mapiraj poznata polja
    Object.entries(source).forEach(([key, value]) => {
      if (mapping[key]) {
        const targetKey = mapping[key];
        
        // Handle nested paths (e.g., 'owner.name')
        if (targetKey.includes('.')) {
          const parts = targetKey.split('.');
          let current = result;
          
          for (let i = 0; i < parts.length - 1; i++) {
            if (!current[parts[i]]) current[parts[i]] = {};
            current = current[parts[i]];
          }
          
          current[parts[parts.length - 1]] = value;
        } else {
          result[targetKey] = value;
        }
      } else if (preserveUnknown && !key.startsWith('_')) {
        // Sačuvaj nepoznata polja
        preserved[key] = value;
      }
    });
    
    // Dodaj preserved fields u _preserved namespace
    if (Object.keys(preserved).length > 0) {
      result._preserved = preserved;
    }
    
    return result;
  }
  
  /**
   * Enhanced project transformer
   */
  static unifiedToGanttProject(unified) {
    const tasks = [];
    const pozicije = [];
    const subtasksByPosition = {};
    const documents = [];
    const events = [];
    
    if (unified.positions) {
      unified.positions.forEach(position => {
        pozicije.push(position.id);
        
        if (position.processes) {
          position.processes.forEach(process => {
            const task = {
              id: `${position.id}-${process.name}`,
              naziv: process.name,
              pozicija: position.id,
              proces: this.mapProcessName(process.name),
              start: process.actualStart || process.plannedStart,
              end: process.actualEnd || process.plannedEnd,
              plannedStart: process.plannedStart,
              plannedEnd: process.plannedEnd,
              status: this.mapStatus(process.status),
              progress: process.progress || 0,
              odgovorna_osoba: process.owner?.name || '',
              opis: process.notes || '',
              komentari: position.comments || [],
              prilozi: position.documents || [],
              urgency: process.urgency || 'normal',
              
              // NOVA POLJA - automatski dodaj ako postoje
              priority: process.priority,
              tags: process.tags,
              dependencies: process.dependencies,
              estimatedHours: process.estimates?.hours,
              actualHours: process.actuals?.hours,
              
              // Sačuvaj sve custom/nepoznate podatke
              _unified: {
                processId: process.id,
                originalData: process._preserved || {}
              }
            };
            
            // Ukloni undefined vrijednosti
            Object.keys(task).forEach(key => {
              if (task[key] === undefined) delete task[key];
            });
            
            tasks.push(task);
          });
        }
        
        if (position.tasks) {
          subtasksByPosition[position.id] = position.tasks.map(task => ({
            id: task.id,
            title: task.title,
            done: task.status === 'done',
            status: task.status,
            dueDate: task.due,
            assignedTo: task.assignee?.name || '',
            urgency: task.urgency || 'normal',
            createdAt: task.createdAt || new Date().toISOString(),
            
            // Preserve any additional fields
            ...task._preserved
          }));
        }
        
        if (position.documents) {
          documents.push(...position.documents.map(doc => ({
            ...doc,
            position: position.id
          })));
        }
      });
    }
    
    if (unified.documents) {
      documents.push(...unified.documents);
    }
    
    if (unified.history) {
      events.push(...unified.history.map(h => ({
        id: h.id,
        date: h.date,
        type: h.type || 'ručno',
        naslov: h.title,
        opis: h.details || '',
        // Preserve extra fields
        ...h._preserved
      })));
    }
    
    return {
      id: unified.id,
      name: unified.name,
      client: unified.client,
      owner: unified.owner,
      tasks,
      pozicije,
      events,
      history: unified.history || [],
      subtasksByPosition,
      documents,
      
      // Preserve project-level custom data
      _unified: {
        llmData: unified.llmData,
        descriptions: unified.descriptions,
        accounting: unified.accounting,
        floorplan: unified.floorplan,
        customData: unified._custom || {}
      }
    };
  }
  
  /**
   * Transformira Gantt format u unified strukturu
   * ENHANCED: Vraća sve preserved podatke
   */
  static ganttProjectToUnified(ganttProject) {
    const positions = [];
    const positionMap = new Map();
    
    ganttProject.tasks?.forEach(task => {
      if (!positionMap.has(task.pozicija)) {
        positionMap.set(task.pozicija, {
          id: task.pozicija,
          title: task.pozicija,
          processes: [],
          tasks: [],
          documents: [],
          comments: [],
          materials: [],
          _ganttTasks: []  // Čuva originalne Gantt taskove
        });
      }
      
      const position = positionMap.get(task.pozicija);
      
      // Čuvaj original za buduće reference
      position._ganttTasks.push({...task});
      
      // Convert task to process sa svim poljima
      const process = {
        name: task.naziv,
        status: this.reverseMapStatus(task.status),
        owner: { name: task.odgovorna_osoba || '' },
        plannedStart: task.plannedStart,
        plannedEnd: task.plannedEnd,
        actualStart: task.start,
        actualEnd: task.end,
        progress: task.progress || 0,
        notes: task.opis || '',
        
        // NOVA POLJA - automatski prenesi
        urgency: task.urgency,
        priority: task.priority,
        tags: task.tags,
        dependencies: task.dependencies
      };
      
      // Dodaj estimates/actuals ako postoje
      if (task.estimatedHours || task.actualHours) {
        process.estimates = { hours: task.estimatedHours };
        process.actuals = { hours: task.actualHours };
      }
      
      // Prenesi custom fields
      if (task.customFields) {
        process._custom = task.customFields;
      }
      
      // Prenesi preserved unified data ako postoji
      if (task._unified) {
        process.id = task._unified.processId;
        process._preserved = task._unified.originalData;
      }
      
      position.processes.push(process);
      
      if (task.komentari) position.comments.push(...task.komentari);
      if (task.prilozi) position.documents.push(...task.prilozi);
    });
    
    // Add subtasks to positions
    Object.entries(ganttProject.subtasksByPosition || {}).forEach(([posId, subtasks]) => {
      if (!positionMap.has(posId)) {
        positionMap.set(posId, {
          id: posId,
          title: posId,
          processes: [],
          tasks: [],
          documents: [],
          comments: [],
          materials: [],
          _ganttTasks: []
        });
      }
      
      const position = positionMap.get(posId);
      position.tasks = subtasks.map(st => ({
        id: st.id,
        title: st.title,
        status: st.done ? 'done' : (st.status || 'todo'),
        assignee: st.assignedTo ? { name: st.assignedTo } : null,
        due: st.dueDate,
        urgency: st.urgency,
        refs: [],
        // Preserve all extra fields
        ...(st._preserved || {})
      }));
    });
    
    positions.push(...positionMap.values());
    
    // Build unified structure
    const unified = {
      id: ganttProject.id,
      name: ganttProject.name,
      client: ganttProject.client || { name: '', oib: '' },
      created: ganttProject.created || new Date().toISOString(),
      owner: ganttProject.owner || { name: '' },
      
      // Restore preserved unified data if exists
      ...(ganttProject._unified || {}),
      
      // Default structure
      llmData: ganttProject._unified?.llmData || {
        summary: `${positions.length} pozicija`,
        keywords: [],
        nextBestActions: []
      },
      descriptions: ganttProject._unified?.descriptions || {
        short: ganttProject.name,
        long: '',
        technical: ''
      },
      documents: ganttProject.documents?.filter(d => !d.position) || [],
      accounting: ganttProject._unified?.accounting || {
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
      floorplan: ganttProject._unified?.floorplan || null,
      gantt: {
        scale: 'days',
        start: this.findEarliestDate(ganttProject.tasks),
        end: this.findLatestDate(ganttProject.tasks)
      },
      positions,
      history: ganttProject.history || [],
      dataCache: {
        enabled: false,
        lastSync: new Date().toISOString(),
        items: []
      }
    };
    
    // Add any custom project-level data
    if (ganttProject._unified?.customData) {
      unified._custom = ganttProject._unified.customData;
    }
    
    return unified;
  }
  
  // Helper methods ostaju isti...
  static mapProcessName(name) {
    const mapping = {
      'Prodaja': 'prodaja',
      'Teh. priprema': 'teh_priprema',
      'Nabava': 'nabava',
      'Proizvodnja': 'proizvodnja',
      'Ugradnja': 'ugradnja',
      'Dizajn': 'dizajn',
      'Primopredaja': 'primopredaja'
    };
    return mapping[name] || 'općenito';
  }
  
  static mapStatus(status) {
    const mapping = {
      'Čeka': 'čeka',
      'U tijeku': 'u tijeku',
      'Završeno': 'završeno',
      'Na stajanju': 'blokirano'
    };
    return mapping[status] || 'čeka';
  }
  
  static reverseMapStatus(status) {
    const mapping = {
      'čeka': 'Čeka',
      'u tijeku': 'U tijeku',
      'završeno': 'Završeno',
      'kasni': 'U tijeku',
      'blokirano': 'Na stajanju'
    };
    return mapping[status] || 'Čeka';
  }
  
  static findEarliestDate(tasks) {
    if (!tasks || tasks.length === 0) return new Date().toISOString();
    const dates = tasks
      .filter(t => t.start)
      .map(t => new Date(t.start));
    return dates.length ? new Date(Math.min(...dates)).toISOString() : new Date().toISOString();
  }
  
  static findLatestDate(tasks) {
    if (!tasks || tasks.length === 0) {
      const future = new Date();
      future.setMonth(future.getMonth() + 3);
      return future.toISOString();
    }
    const dates = tasks
      .filter(t => t.end)
      .map(t => new Date(t.end));
    return dates.length ? new Date(Math.max(...dates)).toISOString() : new Date().toISOString();
  }
  
  /**
   * SCHEMA MIGRATION - za buduće promjene strukture
   */
  static migrateSchema(data, fromVersion, toVersion) {
    let migrated = { ...data };
    
    // Version 4.0 → 5.0
    if (fromVersion === '4.0' && toVersion >= '5.0') {
      // Migrate old task structure
      if (migrated.tasks && !migrated.projects) {
        migrated = {
          projects: [{
            id: 'migrated-project',
            name: 'Migrated Project',
            tasks: migrated.tasks
          }]
        };
      }
    }
    
    // Version 5.0 → 5.1 (nova polja)
    if (fromVersion === '5.0' && toVersion >= '5.1') {
      migrated.projects?.forEach(project => {
        project.tasks?.forEach(task => {
          // Set defaults for new fields
          if (!task.priority) task.priority = 'normal';
          if (!task.tags) task.tags = [];
          if (!task.dependencies) task.dependencies = [];
        });
      });
    }
    
    migrated.version = toVersion;
    migrated._migrationHistory = [
      ...(data._migrationHistory || []),
      {
        from: fromVersion,
        to: toVersion,
        date: new Date().toISOString()
      }
    ];
    
    return migrated;
  }
  
  /**
   * VALIDATION - provjeri strukturu
   */
  static validateStructure(data, expectedVersion = '5.1') {
    const errors = [];
    const warnings = [];
    
    // Check version
    if (!data.version) {
      errors.push('Missing version field');
    } else if (data.version < expectedVersion) {
      warnings.push(`Data version ${data.version} is older than expected ${expectedVersion}`);
    }
    
    // Check required fields
    if (!data.projects && !data.positions) {
      errors.push('Missing both projects and positions - invalid structure');
    }
    
    // Validate each project/position
    if (data.projects) {
      data.projects.forEach((project, idx) => {
        if (!project.id) errors.push(`Project ${idx} missing ID`);
        if (!project.name) warnings.push(`Project ${idx} missing name`);
      });
    }
    
    if (data.positions) {
      data.positions.forEach((pos, idx) => {
        if (!pos.id) errors.push(`Position ${idx} missing ID`);
        if (!pos.title) warnings.push(`Position ${idx} missing title`);
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export default UnifiedAdapterV2;