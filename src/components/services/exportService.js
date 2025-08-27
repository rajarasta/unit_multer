// services/exportService.js
import { generateEmptyProject } from '../utils/projectUtils';
import { formatDate } from '../utils/dateUtils';

export const exportService = {
  // Export project data to JSON
  exportData: (data) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `all_projects_${timestamp}.json`;
    const exportObj = { 
      version: '4.0', 
      exportDate: new Date().toISOString(), 
      data
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = filename; 
    a.click(); 
    URL.revokeObjectURL(url);
  },

  // Import project data from JSON
  importData: async (file, callback) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        const importedData = imported.data || imported;
        
        // Validate and normalize imported data
        const normalizedData = exportService.normalizeImportedData(importedData);
        callback(normalizedData);
      } catch (err) { 
        console.error("Import Error:", err);
        alert('Greška pri učitavanju datoteke'); 
      }
    };
    reader.readAsText(file);
  },

  // Normalize imported data structure
  normalizeImportedData: (importedData) => {
    // Ensure proper structure
    if (!importedData.projects || importedData.projects.length === 0) {
      // Handle potential old format or empty import
      if (importedData.tasks && importedData.tasks.length > 0) {
        // Old format - convert
        importedData.projects = [{
          id: 'proj-imported',
          name: importedData.projectName || 'Imported Project',
          tasks: importedData.tasks || [],
          pozicije: importedData.pozicije || [],
          events: importedData.events || [],
          history: importedData.history || [],
          subtasksByPosition: importedData.subtasksByPosition || {},
          documents: importedData.documents || []
        }];
        importedData.activeProjectId = 'proj-imported';
      } else {
        // Empty import, initialize with an empty project
        const initialProject = generateEmptyProject();
        importedData.projects = [initialProject];
        importedData.activeProjectId = initialProject.id;
      }
    }
    
    return importedData;
  },

  // Export to CSV format
  exportToCSV: (tasks) => {
    const headers = ['ID', 'Naziv', 'Pozicija', 'Proces', 'Početak', 'Kraj', 'Status', 'Napredak'];
    const rows = tasks.map(task => [
      task.id,
      task.naziv,
      task.pozicija,
      task.proces,
      task.start || '',
      task.end || '',
      task.status,
      `${task.progress || 0}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};