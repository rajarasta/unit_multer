// components/Modals/DocumentsManager.jsx
import React, { useState, useMemo } from 'react';
import {
  X, Search, Archive, Folder, FolderOpen, FileText, FileCode,
  Image, Trash2, ExternalLink, Expand
} from 'lucide-react';
import { DOC_URGENCY } from '../../constants/statuses';
import { dataURLtoBlob } from '../../utils/fileUtils';

export function DocumentsManager({ 
  documents = [], 
  onClose, 
  onUpdateDocument, 
  onDeleteDocument, 
  onPreview 
}) {
  const [filter, setFilter] = useState('all');
  const [searchDoc, setSearchDoc] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('all');

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (filter !== 'all') {
        const docType = doc.type?.startsWith('image/') ? 'image' :
                       (doc.name?.toLowerCase().endsWith('.dwg') || 
                        doc.name?.toLowerCase().endsWith('.dxf')) ? 'cad' :
                       doc.name?.toLowerCase().endsWith('.pdf') ? 'pdf' :
                       'document';
        if (docType !== filter) return false;
      }
      if (urgencyFilter !== 'all' && doc.urgency !== urgencyFilter) return false;
      if (searchDoc && !doc.name.toLowerCase().includes(searchDoc.toLowerCase())) 
        return false;
      return true;
    });
  }, [documents, filter, urgencyFilter, searchDoc]);

  const groupedDocs = useMemo(() => {
    const grouped = new Map();
    filteredDocs.forEach(doc => {
      const key = doc.position || 'Bez pozicije';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    });
    return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredDocs]);

  const handleOpenDocument = (doc) => {
    if (doc.url && doc.url !== '#') {
      if (doc.url.startsWith('data:')) {
        const blob = dataURLtoBlob(doc.url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
      } else window.open(doc.url, '_blank');
    }
  };

  const handleUrgencyChange = (docId, urgency) => {
    onUpdateDocument(docId, { urgency });
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Dokumenti projekta</h2>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {documents.length} dokumenata
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 border-b bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pretraži dokumente..."
                value={searchDoc}
                onChange={(e) => setSearchDoc(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Tip:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-sm"
              >
                <option value="all">Svi</option>
                <option value="image">Slike</option>
                <option value="cad">CAD/DWG</option>
                <option value="pdf">PDF</option>
                <option value="document">Dokumenti</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Hitnost:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="px-2 py-1 border border-slate-300 rounded-lg text-sm"
              >
                <option value="all">Sve</option>
                {Object.entries(DOC_URGENCY).map(([key, val]) => (
                  <option key={key} value={key}>{val.text}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {groupedDocs.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                Nema dokumenata koji odgovaraju filterima
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedDocs.map(([position, docs]) => (
                <div key={position}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Folder className="w-4 h-4" />
                    {position}
                    <span className="text-xs text-slate-400 font-normal">
                      ({docs.length})
                    </span>
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {docs.map(doc => {
                      const urgency = DOC_URGENCY[doc.urgency || 'normal'];
                      const isImage = doc.type?.startsWith('image/');
                      const isCAD = doc.name?.toLowerCase().endsWith('.dwg') || 
                                   doc.name?.toLowerCase().endsWith('.dxf');
                      
                      return (
                        <div
                          key={doc.id}
                          className="group relative bg-white border rounded-lg hover:shadow-lg transition-all overflow-hidden"
                        >
                          <div 
                            className="aspect-video relative cursor-pointer"
                            onClick={() => onPreview(doc)}
                          >
                            {isImage ? (
                              <>
                                <img 
                                  src={doc.url} 
                                  alt={doc.name} 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-2 left-2 p-1 bg-black/50 rounded">
                                  <Image className="w-4 h-4 text-white" />
                                </div>
                              </>
                            ) : isCAD ? (
                              <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center">
                                <FileCode className="w-12 h-12 text-blue-600 mb-2" />
                                <span className="text-xs font-medium text-blue-700">
                                  CAD/DWG
                                </span>
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                                <FileText className="w-12 h-12 text-slate-400" />
                              </div>
                            )}
                            
                            <div className="absolute bottom-2 right-2 flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPreview(doc);
                                }}
                                className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                title="Brza inspekcija"
                              >
                                <Expand className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDocument(doc);
                                }}
                                className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                title="Otvori"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <p className="text-xs font-medium text-slate-700 truncate mb-2">
                              {doc.name}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <select
                                value={doc.urgency || 'normal'}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleUrgencyChange(doc.id, e.target.value);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-medium border-0 cursor-pointer"
                                style={{ 
                                  backgroundColor: DOC_URGENCY[doc.urgency || 'normal'].bg + '20',
                                  color: DOC_URGENCY[doc.urgency || 'normal'].bg
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {Object.entries(DOC_URGENCY).map(([key, val]) => (
                                  <option key={key} value={key}>{val.text}</option>
                                ))}
                              </select>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">
                                  {(doc.size / 1024).toFixed(1)} KB
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteDocument(doc.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                                >
                                  <Trash2 className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
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