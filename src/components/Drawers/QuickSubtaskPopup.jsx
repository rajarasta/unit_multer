// components/Drawers/QuickSubtaskPopup.jsx
import React, { useState } from 'react';
import { URGENCY_LEVELS, STATUSI } from '../../constants/statuses';

export function QuickSubtaskPopup({ position, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [status, setStatus] = useState('čeka');

  const save = () => {
    if (!title.trim()) return;
    onSave({
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      title: title.trim(),
      dueDate: due || null,
      assignedTo: assignee || '',
      urgency,
      status,
      done: false,
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-4">
        <h3 className="text-sm font-semibold mb-3">Novi podzadatak — {position}</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-600 block mb-1">Naslov</label>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Npr. provjera mjera, naručiti vijčanu robu…" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Rok</label>
              <input 
                type="date" 
                value={due} 
                onChange={(e) => setDue(e.target.value)} 
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Osoba</label>
              <input 
                value={assignee} 
                onChange={(e) => setAssignee(e.target.value)} 
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="Dodijeli osobi…" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 block mb-1">Hitnost</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(STATUSI).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button 
            onClick={onClose} 
            className="px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Odustani
          </button>
          <button 
            onClick={save} 
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Spremi
          </button>
        </div>
      </div>
    </div>
  );
}