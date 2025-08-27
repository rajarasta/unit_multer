// components/Drawers/SubtasksDrawer.jsx
import React, { useState, useMemo } from 'react';
import { 
  X, ListTodo, Search, Trash2, Calendar, 
  Users, Clock, Bell, Zap, Flame 
} from 'lucide-react';
import { URGENCY_LEVELS, STATUSI } from '../../constants/statuses';
import { croatianDateFormat } from '../../utils/dateUtils';

export function SubtasksDrawer({ 
  open, 
  onClose, 
  subtasksByPosition = {}, 
  onToggle, 
  onDelete, 
  onUpdateSubtask, 
  onAddEvent 
}) {
  const [positionFilter, setPositionFilter] = useState('all');
  const [personFilter, setPersonFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  
  if (!open) return null;
  
  const allSubtasks = useMemo(() => {
    const tasks = [];
    Object.entries(subtasksByPosition).forEach(([position, list]) => {
      if (list && list.length) {
        list.forEach(task => tasks.push({ ...task, position }));
      }
    });
    return tasks;
  }, [subtasksByPosition]);

  const people = useMemo(() => {
    const peopleSet = new Set();
    allSubtasks.forEach(task => {
      if (task.assignedTo) peopleSet.add(task.assignedTo);
    });
    return Array.from(peopleSet);
  }, [allSubtasks]);

  const positions = useMemo(() => {
    return Object.keys(subtasksByPosition).filter(pos => 
      subtasksByPosition[pos] && subtasksByPosition[pos].length > 0
    );
  }, [subtasksByPosition]);

  const filteredSubtasks = useMemo(() => {
    return allSubtasks.filter(task => {
      if (positionFilter !== 'all' && task.position !== positionFilter) return false;
      if (personFilter !== 'all' && task.assignedTo !== personFilter) return false;
      if (urgencyFilter !== 'all' && task.urgency !== urgencyFilter) return false;
      if (searchText && !task.title.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [allSubtasks, positionFilter, personFilter, urgencyFilter, searchText]);

  const groupedByPosition = useMemo(() => {
    const grouped = new Map();
    filteredSubtasks.forEach(task => {
      if (!grouped.has(task.position)) grouped.set(task.position, []);
      grouped.get(task.position).push(task);
    });
    return Array.from(grouped.entries());
  }, [filteredSubtasks]);

  const handleUrgencyChange = (position, taskId, urgency, projectId) => {
    onUpdateSubtask(position, taskId, { urgency }, projectId);
    onAddEvent({
      id: `e${Date.now()}`,
      date: formatDate(new Date()),
      type: 'hitnost',
      naslov: `Hitnost podzadatka promijenjena`,
      opis: `${position} - ${URGENCY_LEVELS[urgency].text}`
    }, projectId);
  };

  const handleStatusChange = (position, taskId, status, projectId) => {
    onUpdateSubtask(position, taskId, { status }, projectId);
  };

  const stats = useMemo(() => {
    const total = filteredSubtasks.length;
    const done = filteredSubtasks.filter(t => t.done).length;
    const urgent = filteredSubtasks.filter(t => 
      t.urgency === 'critical' || t.urgency === 'high'
    ).length;
    return { total, done, urgent, pending: total - done };
  }, [filteredSubtasks]);

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl border-l flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-semibold">Podzadaci</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/50 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
              <p className="text-[10px] text-slate-500">Ukupno</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-green-600">{stats.done}</p>
              <p className="text-[10px] text-slate-500">Završeno</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              <p className="text-[10px] text-slate-500">U tijeku</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
              <p className="text-[10px] text-slate-500">Hitno</p>
            </div>
          </div>
        </div>

        <div className="p-3 border-b bg-slate-50">
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pretraži podzadatke..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Sve pozicije</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
              
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Sve osobe</option>
                {people.map(person => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>
              
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
              >
                <option value="all">Sve hitnosti</option>
                {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {groupedByPosition.length === 0 ? (
            <div className="text-center py-8">
              <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Nema podzadataka koji odgovaraju filterima
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedByPosition.map(([position, tasks]) => (
                <div key={position}>
                  <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center justify-between">
                    <span>{position} ({tasks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {tasks.map(task => {
                      const urgency = URGENCY_LEVELS[task.urgency || 'normal'];
                      const UrgencyIcon = urgency.icon;
                      const status = STATUSI[task.status || 'čeka'];
                      
                      return (
                        <div 
                          key={task.id} 
                          className={`border rounded-lg p-3 bg-white hover:shadow-sm transition-all ${
                            task.urgency === 'critical' ? 'border-red-300' :
                            task.urgency === 'high' ? 'border-orange-300' :
                            task.urgency === 'medium' ? 'border-blue-300' :
                            'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input 
                              type="checkbox" 
                              checked={!!task.done} 
                              onChange={() => onToggle(position, task.id, task.projectId)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 space-y-2">
                              <div className={`text-sm ${
                                task.done ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}>
                                {task.title}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                {task.dueDate && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {croatianDateFormat(task.dueDate)}
                                  </span>
                                )}
                                {task.assignedTo && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {task.assignedTo}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <select
                                  value={task.urgency || 'normal'}
                                  onChange={(e) => handleUrgencyChange(
                                    position, task.id, e.target.value, task.projectId
                                  )}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer"
                                  style={{ 
                                    backgroundColor: urgency.light,
                                    color: urgency.bg
                                  }}
                                >
                                  {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                                    <option key={key} value={key}>{val.text}</option>
                                  ))}
                                </select>
                                
                                <select
                                  value={task.status || 'čeka'}
                                  onChange={(e) => handleStatusChange(
                                    position, task.id, e.target.value, task.projectId
                                  )}
                                  className="px-2 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer"
                                  style={{ 
                                    backgroundColor: status.light,
                                    color: status.bg
                                  }}
                                >
                                  {Object.entries(STATUSI).map(([key, val]) => (
                                    <option key={key} value={key}>{val.text}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <UrgencyIcon 
                                className="w-4 h-4" 
                                style={{ color: urgency.bg }}
                              />
                              <button 
                                onClick={() => onDelete(position, task.id, task.projectId)} 
                                className="p-1 hover:bg-slate-100 rounded"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}