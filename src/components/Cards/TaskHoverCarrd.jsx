// components/Cards/TaskHoverCard.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  X, Plus, History, MessageSquare, Edit3, FileText, 
  AlertTriangle, ExternalLink, FileUp, Trash2
} from 'lucide-react';
import { STATUSI } from '../../constants/statuses';
import { formatDate, croatianDateFull, croatianDateFormat } from '../../utils/dateUtils';
import { dataURLtoBlob } from '../../utils/fileUtils';

export function TaskHoverCard({ 
  task, 
  position, 
  level, 
  onEdit, 
  onClose, 
  onUpdateTask, 
  onAddEvent 
}) {
  const [isSticky, setIsSticky] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localTask, setLocalTask] = useState(task);
  const [uploadZone, setUploadZone] = useState(false);
  const [showSubtaskPopup, setShowSubtaskPopup] = useState(false);
  const cardRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => setLocalTask(task), [task]);
  useEffect(() => { if (level >= 2) setIsSticky(true); }, [level]);

  useEffect(() => {
    if (!isSticky) return;
    const handleClickOutside = (e) => { 
      if (cardRef.current && !cardRef.current.contains(e.target)) onClose(); 
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSticky, onClose]);

  if (!task || !position) return null;

  const daysBetween = (start, end) => 
    Math.ceil((new Date(end) - new Date(start)) / (24 * 3600 * 1000));

  const kašnjenje = task.end && task.plannedEnd ? 
    daysBetween(task.plannedEnd, task.end) : 0;
  const status = STATUSI[task.status] || STATUSI['čeka'];
  const proces = task.proces; // You'll need to pass PROCESI from parent or import

  const handleAddComment = (comment) => {
    const updatedTask = { 
      ...localTask, 
      komentari: [...(localTask.komentari || []), comment] 
    };
    setLocalTask(updatedTask);
    onUpdateTask(task.id, updatedTask);
    onAddEvent({ 
      id: `e${Date.now()}`, 
      date: formatDate(new Date()), 
      type: 'komentar', 
      naslov: `Komentar dodan`, 
      opis: `${task.naziv} - ${task.pozicija}` 
    }, task.projectId);
  };

  const handleStatusChange = (newStatus) => {
    const updatedTask = { ...localTask, status: newStatus };
    setLocalTask(updatedTask);
    onUpdateTask(task.id, updatedTask);
    onAddEvent({ 
      id: `e${Date.now()}`, 
      date: formatDate(new Date()), 
      type: 'status', 
      naslov: `Status promijenjen: ${STATUSI[newStatus].text}`, 
      opis: `${task.naziv} - ${task.pozicija}` 
    }, task.projectId);
  };

  const handleFileUpload = (files) => {
    const fileArray = Array.from(files);
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const prilog = { 
          id: `file-${Date.now()}-${Math.random()}`, 
          name: file.name, 
          type: file.type, 
          size: file.size, 
          url: e.target.result, 
          isImage: file.type.startsWith('image/') 
        };
        const updatedTask = { 
          ...localTask, 
          prilozi: [...(localTask.prilozi || []), prilog] 
        };
        setLocalTask(updatedTask);
        onUpdateTask(task.id, updatedTask);
        onAddEvent({ 
          id: `e${Date.now()}`, 
          date: formatDate(new Date()), 
          type: 'dokument', 
          naslov: `Prilog dodan: ${file.name}`, 
          opis: `${task.naziv} - ${task.pozicija}` 
        }, task.projectId);
      };
      reader.readAsDataURL(file);
    });
    setUploadZone(false);
  };

  const handleOpenFile = (prilog) => {
    if (prilog.url && prilog.url !== '#') {
      if (prilog.url.startsWith('data:')) {
        const blob = dataURLtoBlob(prilog.url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } else window.open(prilog.url, '_blank');
    }
  };

  const missingDates = !task.start || !task.end;

  return (
    <div 
      ref={cardRef} 
      className="fixed z-50 pointer-events-auto" 
      style={{ 
        left: Math.min(position.x, window.innerWidth - (showComments ? 750 : 400)), 
        top: Math.min(position.y, window.innerHeight - 400) 
      }}
    >
      <div className="flex items-start gap-2">
        <div 
          className="bg-white rounded-xl shadow-2xl border border-slate-200 transition-all duration-300" 
          style={{ width: isSticky ? 400 : 350 }}
        >
          {missingDates && (
            <div className="p-2 bg-red-500 text-white rounded-t-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">UPOZORENJE: Nedostaju datumi!</span>
            </div>
          )}

          <div className="p-4 border-b border-slate-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 mr-1 rounded-full ${
                      task.status === 'kasni' ? 'pulse-strong' : ''
                    }`}
                    title={STATUSI[task.status]?.text || 'Status'}
                    style={{ backgroundColor: STATUSI[task.status]?.bg || STATUSI['čeka'].bg }}
                  />
                  <h4 className="font-semibold text-sm text-slate-800">{task.naziv}</h4>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  {task.pozicija} {task.projectName && `(${task.projectName})`}
                </p>

                {level >= 2 ? (
                  <select
                    value={localTask.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer"
                    style={{ 
                      backgroundColor: (STATUSI[localTask.status] || STATUSI['čeka']).light, 
                      color: (STATUSI[localTask.status] || STATUSI['čeka']).bg 
                    }}
                  >
                    {Object.entries(STATUSI).map(([key, val]) => 
                      <option key={key} value={key}>{val.text}</option>
                    )}
                  </select>
                ) : (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs font-medium inline-block"
                    style={{ 
                      backgroundColor: (STATUSI[localTask.status] || STATUSI['čeka']).light, 
                      color: (STATUSI[localTask.status] || STATUSI['čeka']).bg 
                    }}
                  >
                    {(STATUSI[localTask.status] || STATUSI['čeka']).text}
                  </span>
                )}
                {task.odgovorna_osoba && 
                  <span className="text-xs text-slate-500 ml-2">{task.odgovorna_osoba}</span>
                }
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSubtaskPopup(true)} 
                  className="px-2 py-1 rounded-lg border text-xs hover:bg-slate-50"
                  title="Dodaj podzadatak"
                >
                  <span className="inline-flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Task
                  </span>
                </button>
                <button 
                  onClick={task.onViewHistory} 
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors" 
                  title="Povijest"
                >
                  <History className="w-4 h-4 text-green-600" />
                </button>
                <button 
                  onClick={() => setShowComments(v => !v)} 
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors" 
                  title="Komentari"
                >
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </button>
                {isSticky && (
                  <button 
                    onClick={onClose} 
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {task.start && task.end ? (
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Početak</span>
                  <div className="font-medium">{croatianDateFull(task.start)}</div>
                </div>
                <div>
                  <span className="text-slate-500 block">Završetak</span>
                  <div className="font-medium">{croatianDateFull(task.end)}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-red-600">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">Datumi nisu definirani!</p>
              </div>
            )}
          </div>

          {level >= 2 && (
            <div className="border-t border-slate-100 p-3 space-y-3">
              <div className="flex gap-2">
                <button 
                  onClick={onEdit} 
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  Uredi zadatak
                </button>
                <button 
                  onClick={() => setUploadZone(!uploadZone)} 
                  className="px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors" 
                  title="Dodaj prilog"
                >
                  <FileUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {showComments && (
          <CommentsPanel
            comments={localTask.komentari || []}
            onAddComment={handleAddComment}
            onDeleteComment={(id) => {
              const updatedTask = {
                ...localTask,
                komentari: localTask.komentari.filter(c => c.id !== id)
              };
              setLocalTask(updatedTask);
              onUpdateTask(task.id, updatedTask);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CommentsPanel({ comments = [], onAddComment, onDeleteComment }) {
  const [newComment, setNewComment] = useState('');
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = { 
      id: `comment-${Date.now()}`, 
      text: newComment, 
      author: 'Trenutni korisnik', 
      timestamp: new Date().toISOString() 
    };
    onAddComment(comment);
    setNewComment('');
  };
  
  return (
    <div className="absolute left-full ml-4 top-0 w-80 max-h-96 bg-white rounded-xl shadow-2xl border overflow-hidden">
      <div className="p-3 border-b bg-slate-50">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Komentari ({comments.length})
        </h4>
      </div>
      <div className="max-h-64 overflow-y-auto p-3 space-y-2">
        {comments.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">Nema komentara</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="bg-slate-50 rounded-lg p-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">
                    {comment.text}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {comment.author} • {new Date(comment.timestamp).toLocaleString('hr-HR')}
                  </p>
                </div>
                <button 
                  onClick={() => onDeleteComment(comment.id)} 
                  className="p-0.5 hover:bg-slate-200 rounded"
                >
                  <X className="w-3 h-3 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
            placeholder="Dodaj komentar..."
            className="flex-1 px-2 py-1 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleAddComment} 
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
          >
            Dodaj
          </button>
        </div>
      </div>
    </div>
  );
}