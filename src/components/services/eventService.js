// services/eventService.js
import { formatDate } from '../utils/dateUtils';

export const eventService = {
  // Create new event
  createEvent: (type, title, description = '', projectId = null) => {
    return {
      id: `e${Date.now()}`,
      date: formatDate(new Date()),
      type: type,
      naslov: title,
      opis: description,
      timestamp: new Date().toISOString(),
      projectId: projectId
    };
  },

  // Add event to history
  addToHistory: (history, event) => {
    return [...history, { ...event, timestamp: new Date().toISOString() }];
  },

  // Filter events by position
  filterEventsByPosition: (events, position) => {
    return events.filter(event => 
      event.opis?.includes(position)
    );
  },

  // Get recent events
  getRecentEvents: (events, limit = 15) => {
    return events
      .slice(-limit)
      .reverse();
  },

  // Event type definitions
  eventTypes: {
    NEW: 'novi',
    CHANGE: 'promjena',
    DELETE: 'brisanje',
    IMPORT: 'import',
    MANUAL: 'ručno',
    COMMENT: 'komentar',
    DOCUMENT: 'dokument',
    DESCRIPTION: 'opis',
    STATUS: 'status',
    SUBTASK: 'podzadatak',
    URGENCY: 'hitnost',
    PROJECT: 'projekt'
  },

  // Create specific event types
  createTaskEvent: (task, type) => {
    const eventMap = {
      'new': `Novi: ${task.naziv}`,
      'edit': `Uređen: ${task.naziv}`,
      'delete': `Obrisan: ${task.naziv}`,
      'status': `Status promijenjen: ${task.naziv}`
    };

    return eventService.createEvent(
      type,
      eventMap[type] || `Promjena: ${task.naziv}`,
      `Pozicija: ${task.pozicija}`,
      task.projectId
    );
  },

  // Group events by date
  groupEventsByDate: (events) => {
    const grouped = new Map();
    
    events.forEach(event => {
      const date = formatDate(new Date(event.date || event.timestamp));
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(event);
    });
    
    return Array.from(grouped.entries()).sort((a, b) => 
      new Date(b[0]) - new Date(a[0])
    );
  }
};