// components/Modals/TaskEditorModal.jsx
import React, { useState, useRef } from 'react';
import { Plus, X, Upload, Trash2 } from 'lucide-react';
import { PROCESI, STATUSI, URGENCY_LEVELS } from '../../constants';
import { formatDate, addDays } from '../../utils/dateUtils';

export function TaskEditorModal({ 
  task, 
  pozicije, 
  onSave, 
  onClose, 
  onAddEvent 
}) {
  const [form, setForm] = useState({
    naziv: task?.naziv || '',
    pozicija: task?.pozicija || pozicije[0] || '',
    proces: task?.proces || 'općenito',
    start: task?.start || formatDate(new Date()),
    end: task?.end || formatDate(addDays(new Date(), 7)),
    plannedStart: task?.plannedStart || formatDate(new Date()),
    plannedEnd: task?.plannedEnd || formatDate(addDays(new Date(), 7)),
    status: task?.status || 'čeka',
    urgency: task?.urgency || 'normal',
    progress: task?.progress || 0,
    prioritet: task?.prioritet || 2,
    odgovorna_osoba: task?.odgovorna_osoba || '',
    opis: task?.opis || '',
    komentari: task?.komentari || [],
    prilozi: task?.prilozi || []
  });

  const fileInputRef = useRef(null);
  const [newComment, setNewComment] = useState('');
  const [newPositionInput, setNewPositionInput] = useState('');
  const [showNewPosition, setShowNewPosition] = useState(false);
  
  const handleDrop = (e) => { 
    e.preventDefault(); 
    processFiles(Array.from(e.dataTransfer.files)); 
  };
  
  const processFiles = (files) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setForm(prev => ({ 
        ...prev, 
        prilozi: [...prev.prilozi, { 
          id: `file-${Date.now()}-${Math.random()}`, 
          name: file.name, 
          type: file.type, 
          size: file.size, 
          url: e.target.result, 
          isImage: file.type.startsWith('image/'),
          urgency: 'normal',
          position: prev.pozicija
        }] 
      }));
      reader.readAsDataURL(file);
    });
  };
  
  const addComment = (text) => setForm(prev => ({ 
    ...prev, 
    komentari: [...prev.komentari, { 
      id: `comment-${Date.now()}`, 
      text, 
      author: 'Trenutni korisnik', 
      timestamp: new Date().toISOString() 
    }] 
  }));
  
  const handleSubmit = () => {
    const proces = PROCESI.find(p => p.id === form.proces);
    const finalTask = { 
      ...task, 
      ...form, 
      naziv: proces.naziv, 
      id: task?.id || `t${Date.now()}` 
    };
    onSave(finalTask);
    onAddEvent({ 
      id: `e${Date.now()}`, 
      date: formatDate(new Date()), 
      type: task ? 'promjena' : 'novi', 
      naslov: task ? `Uređen: ${finalTask.naziv}` : `Novi: ${finalTask.naziv}`, 
      opis: `Pozicija: ${finalTask.pozicija}` 
    }, finalTask.projectId);
  };

  const addNewPosition = () => {
    if (newPositionInput.trim() && !pozicije.includes(newPositionInput.trim())) {
      pozicije.push(newPositionInput.trim());
      setForm({ ...form, pozicija: newPositionInput.trim() });
      setNewPositionInput('');
      setShowNewPosition(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {task ? 'Uredi zadatak' : 'Novi zadatak'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pozicija
                </label>
                <div className="flex gap-2">
                  {showNewPosition ? (
                    <>
                      <input
                        type="text"
                        value={newPositionInput}
                        onChange={(e) => setNewPositionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNewPosition()}
                        placeholder="Nova pozicija..."
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button 
                        onClick={addNewPosition} 
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => { 
                          setShowNewPosition(false); 
                          setNewPositionInput(''); 
                        }} 
                        className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <select 
                        value={form.pozicija} 
                        onChange={(e) => setForm({ ...form, pozicija: e.target.value })} 
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {pozicije.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <button 
                        onClick={() => setShowNewPosition(true)} 
                        className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200" 
                        title="Dodaj novu poziciju"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Proces
                </label>
                <select 
                  value={form.proces} 
                  onChange={(e) => setForm({ ...form, proces: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PROCESI.map(p => (
                    <option key={p.id} value={p.id}>{p.naziv}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Početak
                </label>
                <input 
                  type="date" 
                  value={form.start} 
                  onChange={(e) => setForm({ ...form, start: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Završetak
                </label>
                <input 
                  type="date" 
                  value={form.end} 
                  onChange={(e) => setForm({ ...form, end: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select 
                  value={form.status} 
                  onChange={(e) => setForm({ ...form, status: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(STATUSI).map(([key, val]) => (
                    <option key={key} value={key}>{val.text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hitnost
                </label>
                <select 
                  value={form.urgency} 
                  onChange={(e) => setForm({ ...form, urgency: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(URGENCY_LEVELS).map(([key, val]) => (
                    <option key={key} value={key}>{val.text}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Napredak: {form.progress}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={form.progress} 
                  onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) })} 
                  className="w-full mt-2" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Opis
              </label>
              <textarea 
                value={form.opis} 
                onChange={(e) => setForm({ ...form, opis: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                rows={3} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Prilozi (uključujući DWG/DXF)
              </label>
              <div 
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all" 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={handleDrop} 
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  multiple 
                  accept="*"
                  className="hidden" 
                  onChange={(e) => processFiles(Array.from(e.target.files))} 
                />
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  Povucite datoteke ovdje ili kliknite za odabir
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Podržani formati: DWG, DXF, PDF, slike i svi ostali
                </p>
              </div>
              
              {form.prilozi.length > 0 && (
                <div className="mt-4 space-y-2">
                  {form.prilozi.map(prilog => {
                    const isCAD = prilog.name?.toLowerCase().endsWith('.dwg') || 
                                  prilog.name?.toLowerCase().endsWith('.dxf');
                    return (
                      <div key={prilog.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {prilog.isImage ? (
                            <img 
                              src={prilog.url} 
                              alt={prilog.name} 
                              className="w-10 h-10 object-cover rounded" 
                            />
                          ) : isCAD ? (
                            <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                              <FileCode className="w-6 h-6 text-blue-600" />
                            </div>
                          ) : (
                            <FileText className="w-6 h-6 text-slate-400" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{prilog.name}</p>
                            <p className="text-xs text-slate-500">
                              {(prilog.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setForm(prev => ({ 
                            ...prev, 
                            prilozi: prev.prilozi.filter(p => p.id !== prilog.id) 
                          }))} 
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Komentari
              </label>
              {form.komentari.length > 0 && (
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {form.komentari.map(k => (
                    <div key={k.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{k.text}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {k.author} • {new Date(k.timestamp).toLocaleString('hr-HR')}
                          </p>
                        </div>
                        <button 
                          onClick={() => setForm(prev => ({ 
                            ...prev, 
                            komentari: prev.komentari.filter(c => c.id !== k.id) 
                          }))} 
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newComment.trim()) {
                      addComment(newComment);
                      setNewComment('');
                    }
                  }} 
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="Dodajte komentar..." 
                />
                <button 
                  onClick={() => {
                    if (newComment.trim()) {
                      addComment(newComment);
                      setNewComment('');
                    }
                  }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Dodaj
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Odustani
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {task ? 'Spremi promjene' : 'Stvori zadatak'}
          </button>
        </div>
      </div>
    </div>
  );
}