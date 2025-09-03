import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, FileText, MessageCircle, Image as ImageIcon, Upload, Download, Search, X, Filter, User, AlertTriangle, Folder, Hash, Box, Files, ChevronDown, ChevronUp, Video as VideoIcon, Music } from 'lucide-react';
import ProjectDataService from '../../../services/ProjectDataService';

// --- Fluent UI 3 Styling Constants and Config ---
const FLUENT_DEPTH_1 = 'shadow-md';
const FLUENT_DEPTH_2 = 'shadow-lg';
const FLUENT_DEPTH_3 = 'shadow-2xl';
const FLUENT_ACRYLIC_BG = 'bg-white/80 backdrop-blur-xl';
const FLUENT_TRANSITION = 'transition-all duration-300 ease-in-out';
const BATCH_PREVIEW_LIMIT = 4;

// Project data is loaded via ProjectDataService from agbim.json

// --- Helper Functions ---
const formatTime = (date) => new Intl.DateTimeFormat('hr-HR', { hour: '2-digit', minute: '2-digit' }).format(date);
const formatDate = (date) => new Intl.DateTimeFormat('hr-HR', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(date));


// --- Core Logic: Grouping Items into Parallel Rows ---

/**
 * Processes a flat list of timeline items into "Rows".
 * A Row can contain a left item, a right item, or both if they are linked and simultaneous.
 */
const groupItemsIntoRows = (items) => {
    const rows = [];
    const processedIds = new Set();
    // Ensure items are sorted by time before grouping
    const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp);

    sortedItems.forEach(item => {
        if (processedIds.has(item.id)) return;

        const isLeftAligned = (i) => i.type === 'comment' || i.type === 'issue' || i.type === 'agbim_result';
        let partner = null;

        if (item.linkedItemId) {
            // Find the partner in the list
            partner = sortedItems.find(i => i.id === item.linkedItemId);
        }

        // Check if partner exists and hasn't been processed. 
        // We assume linked items always have the same timestamp by design.
        if (partner && !processedIds.has(partner.id)) {
            // Found a simultaneous pair. Create a combined row (TimelineRow).
            rows.push({
                id: `${item.id}-${partner.id}`,
                timestamp: item.timestamp,
                // Assign items to the correct side
                leftItem: isLeftAligned(item) ? item : partner,
                rightItem: isLeftAligned(item) ? partner : item,
            });
            processedIds.add(item.id);
            processedIds.add(partner.id);
        } else {
            // Standalone item (or linked item was filtered out). Create a single-sided row.
            rows.push({
                id: item.id,
                timestamp: item.timestamp,
                leftItem: isLeftAligned(item) ? item : null,
                rightItem: isLeftAligned(item) ? null : item,
            });
            processedIds.add(item.id);
        }
    });
    return rows;
};


// --- Components ---

const FluentButton = ({ children, onClick, primary, disabled, className = '' }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${FLUENT_TRANSITION} ${FLUENT_DEPTH_1}
      ${primary ? `bg-blue-600 text-white hover:bg-blue-700` : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}
      disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

// UploadModal (Functional version included for completeness)
const UploadModal = ({ isOpen, onClose, onConfirm, activeProject, projects = [] }) => {
    const [comment, setComment] = useState('');
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
  
    useEffect(() => {
      if (isOpen) {
          setSelectedProject(activeProject?.id || '');
          setComment('');
          setSelectedPosition('');
          setSelectedFiles([]);
      }
    }, [activeProject, isOpen]);
  
    const selectedProjectObj = projects.find(p => p.id === selectedProject);
    const availablePositions = selectedProjectObj?.positions || [];
    
    // Handle both array of strings and array of objects for positions
    const positionOptions = Array.isArray(availablePositions) 
      ? availablePositions.map(pos => typeof pos === 'string' ? { id: pos, title: pos } : pos)
      : [];
  
    const validate = () => {
      if (selectedFiles.length === 0) return false;
      if (!selectedProject) return false;
      if (!comment.trim()) return false; // Comment is mandatory
      return true;
    };
  
    const handleFileChange = (e) => {
      const files = Array.from(e.target.files);
      const fileData = files.map(file => {
        let type = 'document';
        if (file.type.startsWith('image/') || file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
          type = 'image';
        } else if (file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov|avi)$/i)) {
          type = 'video';
        } else if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|webm|ogg)$/i)) {
          type = 'audio';
        }
        
        return {
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          type: type,
          id: Date.now() + Math.random() + Math.random(),
        };
      });
      setSelectedFiles(fileData);
    };
  
    const handleConfirm = () => {
      if (validate()) {
        let batchType = 'document'; // default
        if (selectedFiles.every(f => f.type === 'image')) {
          batchType = 'image';
        } else if (selectedFiles.every(f => f.type === 'video')) {
          batchType = 'video';
        } else if (selectedFiles.some(f => f.type === 'image') && selectedFiles.some(f => f.type === 'video')) {
          batchType = 'mixed';
        } else if (selectedFiles.some(f => f.type === 'image' || f.type === 'video')) {
          batchType = 'mixed';
        }
  
        onConfirm({
          files: selectedFiles,
          batchType: batchType,
          comment: comment.trim(),
          context: {
            projectId: selectedProject,
            positionId: selectedPosition || null,
            komadId: null,
          }
        });
        onClose();
      }
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className={`${FLUENT_ACRYLIC_BG} ${FLUENT_DEPTH_3} p-6 rounded-lg w-full max-w-lg`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Grupni Upload i Kontekst</h2>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
              <X className="w-5 h-5" />
            </button>
          </div>
  
          {/* File Input Area */}
          <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Odabir Datoteka <span className="text-red-500">*</span></label>
              <input id="dropzone-file" type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt" className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100" multiple onChange={handleFileChange} />
              
              {selectedFiles.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                      Odabrano: {selectedFiles.length} datoteka(e).
                  </div>
              )}
          </div>
  
           {/* Comment Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zajednički Komentar <span className="text-red-500">* Obavezno (Pojavit će se lijevo)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
  
           {/* Context Selectors */}
           <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Projekt <span className="text-red-500">* Obavezno</span></label>
                  <select
                      value={selectedProject}
                      onChange={(e) => {
                          setSelectedProject(e.target.value);
                          setSelectedPosition('');
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500"
                  >
                      <option value="">Odaberite projekt...</option>
                      {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pozicija (Fakultativno)</label>
                  <select
                      value={selectedPosition}
                      onChange={(e) => setSelectedPosition(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      disabled={!selectedProject}
                  >
                      <option value="">Odaberite poziciju...</option>
                      {positionOptions.map(pos => (
                          <option key={pos.id} value={pos.id}>{pos.title || pos.id}</option>
                      ))}
                  </select>
              </div>
          </div>
  
          <div className="flex justify-end gap-3">
            <FluentButton onClick={onClose}>Odustani</FluentButton>
            <FluentButton primary onClick={handleConfirm} disabled={!validate()}>
              <Upload className="w-4 h-4" />
              Potvrdi Upload
            </FluentButton>
          </div>
        </div>
      </div>
    );
  };

// TimelineDot (Slightly reduced size for better stacking, matching the screenshot)
const TimelineDot = ({ type }) => {
    const config = {
        comment: { color: 'bg-blue-500' },
        issue: { color: 'bg-red-500' },
        file_batch: { color: 'bg-teal-600' },
        agbim_result: { color: 'bg-gradient-to-br from-purple-600 to-blue-600' },
        agbim_attachments: { color: 'bg-gradient-to-br from-purple-500 to-indigo-500' },
    };
    const { color } = config[type] || config.comment;

    // Using w-6 h-6 (24px)
    return (
      <div className={`w-6 h-6 ${color} rounded-full border-4 border-white shadow-md flex items-center justify-center ${FLUENT_TRANSITION} transform hover:scale-110 z-10`}>
      </div>
    );
};

// ContextTag
const ContextTag = ({ context }) => {
    if (!context || (!context.projectId && !context.positionId)) return null;

    return (
        <div className='flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100/50'>
            {context.projectId && (
                <span className='flex items-center gap-1 text-xs bg-blue-100/70 text-blue-800 px-2 py-1 rounded-md'>
                    <Folder className='w-3 h-3'/> {context.projectId}
                </span>
            )}
            {context.positionId && (
                <span className='flex items-center gap-1 text-xs bg-gray-200/70 text-gray-800 px-2 py-1 rounded-md'>
                   <Hash className='w-3 h-3'/> #{context.positionId}
                </span>
            )}
        </div>
    )
}

// FluentCard (Base)
const FluentCard = ({ children, className = '', isHighlighted, onMouseEnter, onMouseLeave }) => (
     <div 
        // max-w-full ensures the card fills the column width
        className={`max-w-full bg-white rounded-lg p-4 ${FLUENT_TRANSITION} border 
        ${isHighlighted ? 'shadow-xl border-blue-500 ring-2 ring-blue-300/50' : `${FLUENT_DEPTH_1} hover:shadow-lg border-gray-200/50`}
        ${className}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
    >
        {children}
     </div>
);

// CommentCard (Left Side)
const CommentCard = ({ item, isHighlighted, setHighlightedItemId }) => (
  <FluentCard
    isHighlighted={isHighlighted}
    onMouseEnter={() => item.linkedItemId && setHighlightedItemId(item.linkedItemId)}
    onMouseLeave={() => setHighlightedItemId(null)}
  >
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-8 h-8 ${item.avatar === 'AI' ? 'bg-gradient-to-br from-purple-600 to-blue-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm`}>
        {item.avatar}
      </div>
      <div>
        <span className="text-sm font-medium text-gray-800">{item.author}</span>
        <span className="text-xs text-gray-500 ml-3">{formatTime(item.timestamp)}</span>
      </div>
    </div>
    <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.content}</div>
    <ContextTag context={item.context} />
  </FluentCard>
);

// IssueCard (Left Side)
const IssueCard = ({ item, isHighlighted, setHighlightedItemId }) => (
    <FluentCard 
        className="border-red-300 bg-red-50/50"
        isHighlighted={isHighlighted}
        onMouseEnter={() => item.linkedItemId && setHighlightedItemId(item.linkedItemId)}
        onMouseLeave={() => setHighlightedItemId(null)}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm">
          {item.avatar}
        </div>
        <div>
          <span className="text-sm font-medium text-gray-800">{item.author}</span>
          <span className="text-xs text-gray-500 ml-3">{formatTime(item.timestamp)}</span>
        </div>
      </div>
      <p className="text-sm text-red-800 font-medium leading-relaxed mb-3">{item.content}</p>
      
      <div className='flex justify-between items-center'>
        <ContextTag context={item.context} />
        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-red-500 text-white`}>
            {item.status}
        </span>
      </div>
    </FluentCard>
  );

// AgbimCard (Left Side) - Displays AI findings text
const AgbimCard = ({ item, isHighlighted, setHighlightedItemId }) => {
  const agbimData = item.agbimProcessing;
  if (!agbimData) return null;

  const { aiFindings, goriona } = agbimData;
  const displayText = aiFindings?.summary || aiFindings?.transcript || item.content || 'Multimodalna analiza završena';
  
  // Get goriona styling
  const gorioniColors = {
    'ladno': 'bg-blue-100 text-blue-800 border-blue-200',
    'lagana vatra': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'krčka se': 'bg-orange-100 text-orange-800 border-orange-200',
    'nestalo plina': 'bg-red-100 text-red-800 border-red-200',
    'nestalo struje': 'bg-red-200 text-red-900 border-red-300',
    'izgorilo': 'bg-red-300 text-red-900 border-red-400',
    'svaki čas će se zapalit': 'bg-red-400 text-white border-red-500',
    'ako sad ne zaliješ zapalit će se': 'bg-red-600 text-white border-red-700'
  };
  
  const gorioniStyle = gorioniColors[goriona] || gorioniColors['ladno'];

  return (
    <FluentCard
      className="border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50"
      isHighlighted={isHighlighted}
      onMouseEnter={() => item.linkedItemId && setHighlightedItemId(item.linkedItemId)}
      onMouseLeave={() => setHighlightedItemId(null)}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold shadow-sm">
          {item.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{item.author}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${gorioniStyle}`}>
              {goriona}
            </span>
          </div>
          <span className="text-xs text-gray-500">{formatTime(item.timestamp)}</span>
        </div>
      </div>
      
      <div className="text-sm text-gray-700 leading-relaxed mb-3">
        <div className="font-medium text-purple-800 mb-2">🎙️ AI Analiza terena:</div>
        <div className="whitespace-pre-wrap">{displayText}</div>
      </div>
      
      {aiFindings?.actionItems && aiFindings.actionItems.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Akcije:</div>
          <div className="space-y-1">
            {aiFindings.actionItems.map((action, idx) => (
              <div key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                • {action}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {aiFindings?.risks && aiFindings.risks.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-600 mb-1">Rizici:</div>
          <div className="space-y-1">
            {aiFindings.risks.map((risk, idx) => (
              <div key={idx} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                ⚠️ {risk}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <ContextTag context={item.context} />
    </FluentCard>
  );
};

// FileBatchCard (Right Side)
const FileBatchCard = ({ item, isHighlighted, setHighlightedItemId }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const files = item.files || [];
    const displayFiles = isExpanded ? files : files.slice(0, BATCH_PREVIEW_LIMIT);
    const remainingCount = files.length - BATCH_PREVIEW_LIMIT;

    const isImageBatch = item.batchType === 'image';
    const isVideoBatch = item.batchType === 'video'; 
    const isMixedBatch = item.batchType === 'mixed';
    
    let Icon, color, bgColor;
    if (isImageBatch) {
      Icon = ImageIcon;
      color = 'text-purple-600';
      bgColor = 'bg-purple-100/50';
    } else if (isVideoBatch) {
      Icon = VideoIcon;
      color = 'text-indigo-600';
      bgColor = 'bg-indigo-100/50';
    } else if (isMixedBatch) {
      Icon = Files;
      color = 'text-orange-600';
      bgColor = 'bg-orange-100/50';
    } else {
      Icon = Files;
      color = 'text-teal-600';
      bgColor = 'bg-teal-100/50';
    }

    return (
        <FluentCard
            isHighlighted={isHighlighted}
            onMouseEnter={() => item.linkedItemId && setHighlightedItemId(item.linkedItemId)}
            onMouseLeave={() => setHighlightedItemId(null)}
        >
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-md font-semibold text-gray-800">
                    {files.length} Datoteka Uploadano
                </h3>
            </div>

            {/* File Display Area (List style prioritized for consistency) */}
            <div className='space-y-2 mb-4'>
                {displayFiles.map(file => (
                     <div key={file.id} className='flex items-center justify-between p-3 bg-gray-50/70 rounded-md border border-gray-200/50 hover:bg-gray-100 transition group'>
                        <div className='flex items-center gap-3 overflow-hidden'>
                            {file.type === 'image' ? <ImageIcon className='w-4 h-4 text-green-500 flex-shrink-0'/> : 
                             file.type === 'video' ? <VideoIcon className='w-4 h-4 text-purple-500 flex-shrink-0'/> :
                             file.type === 'audio' ? <Music className='w-4 h-4 text-orange-500 flex-shrink-0'/> :
                             <FileText className='w-4 h-4 text-gray-500 flex-shrink-0'/>}
                            <div className='overflow-hidden'>
                                <p className='text-sm font-medium text-gray-800 truncate'>{file.name}</p>
                                <p className='text-xs text-gray-500'>{file.size}</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => alert(`Preuzimanje: ${file.name}`)}
                            className='text-gray-500 hover:text-blue-600 transition opacity-0 group-hover:opacity-100 ml-3'
                        >
                            <Download className='w-4 h-4'/>
                        </button>
                    </div>
                ))}
            </div>

             {/* Expand/Collapse Button (Dark style matching the screenshot) */}
             {remainingCount > 0 && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className='w-full text-center text-sm font-medium bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700 transition mb-3 flex items-center justify-center gap-1'
                >
                    {isExpanded ? (
                        <>Sakrij <ChevronUp className='w-4 h-4'/></>
                    ) : (
                        <>Prikaži još {remainingCount} <ChevronDown className='w-4 h-4'/></>
                    )}
                </button>
            )}

            <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>Uploadao: {item.uploadedBy}</span>
                <span>•</span>
                <span>{formatTime(item.timestamp)}</span>
            </div>
            <ContextTag context={item.context} />
        </FluentCard>
    );
}

// AgbimAttachmentsCard (Right Side) - Displays AGBIM attachments
const AgbimAttachmentsCard = ({ item, isHighlighted, setHighlightedItemId }) => {
  const attachments = item.attachments || [];
  if (attachments.length === 0) return null;
  
  const [isExpanded, setIsExpanded] = useState(false);
  const displayAttachments = isExpanded ? attachments : attachments.slice(0, BATCH_PREVIEW_LIMIT);
  const remainingCount = attachments.length - BATCH_PREVIEW_LIMIT;
  
  // Determine file types
  const getFileType = (filename) => {
    if (!filename) return 'document';
    const ext = filename.toLowerCase();
    if (ext.includes('.jpg') || ext.includes('.png') || ext.includes('.jpeg') || ext.includes('.webp')) return 'image';
    if (ext.includes('.mp4') || ext.includes('.webm') || ext.includes('.mov')) return 'video';
    if (ext.includes('.wav') || ext.includes('.mp3') || ext.includes('.ogg') || ext.includes('.webm')) return 'audio';
    return 'document';
  };
  
  return (
    <FluentCard
      className="border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50"
      isHighlighted={isHighlighted}
      onMouseEnter={() => item.linkedItemId && setHighlightedItemId(item.linkedItemId)}
      onMouseLeave={() => setHighlightedItemId(null)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-100/70">
          <Files className="w-6 h-6 text-purple-600" />
        </div>
        <h3 className="text-md font-semibold text-gray-800">
          {attachments.length} AGBIM Prilog(a)
        </h3>
      </div>
      
      <div className='space-y-2 mb-4'>
        {displayAttachments.map((attachment, idx) => {
          const fileType = getFileType(attachment);
          const fileName = typeof attachment === 'string' ? attachment : attachment.name || `prilog-${idx + 1}`;
          
          return (
            <div key={idx} className='flex items-center justify-between p-3 bg-gray-50/70 rounded-md border border-gray-200/50 hover:bg-gray-100 transition group'>
              <div className='flex items-center gap-3 overflow-hidden'>
                {fileType === 'image' ? <ImageIcon className='w-4 h-4 text-green-500 flex-shrink-0'/> : 
                 fileType === 'video' ? <VideoIcon className='w-4 h-4 text-purple-500 flex-shrink-0'/> :
                 fileType === 'audio' ? <Music className='w-4 h-4 text-orange-500 flex-shrink-0'/> :
                 <FileText className='w-4 h-4 text-gray-500 flex-shrink-0'/>}
                <div className='overflow-hidden'>
                  <p className='text-sm font-medium text-gray-800 truncate'>{fileName}</p>
                  <p className='text-xs text-gray-500'>AGBIM terenska snimka</p>
                </div>
              </div>
              
              <button 
                onClick={() => alert(`Preuzimanje: ${fileName}`)}
                className='text-gray-500 hover:text-purple-600 transition opacity-0 group-hover:opacity-100 ml-3'
              >
                <Download className='w-4 h-4'/>
              </button>
            </div>
          );
        })}
      </div>
      
      {remainingCount > 0 && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className='w-full text-center text-sm font-medium bg-purple-800 text-white py-2 rounded-md hover:bg-purple-700 transition mb-3 flex items-center justify-center gap-1'
        >
          {isExpanded ? (
            <>Sakrij <ChevronUp className='w-4 h-4'/></>
          ) : (
            <>Prikaži još {remainingCount} <ChevronDown className='w-4 h-4'/></>
          )}
        </button>
      )}
      
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span>AGBIM sistem</span>
        <span>•</span>
        <span>{formatTime(item.timestamp)}</span>
      </div>
      <ContextTag context={item.context} />
    </FluentCard>
  );
};


// --- Main Chat Component ---
const FluentTimelineChat = () => {
  const [timelineItems, setTimelineItems] = useState([]);
  const [inputComment, setInputComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  const projectService = useMemo(() => new ProjectDataService(), []);
  
  const timelineEndRef = useRef(null);

  // Load projects and chat data from backend
  useEffect(() => {
    const loadProjectsAndChat = async () => {
      try {
        setDataLoading(true);
        
        // Try localStorage first (where new data is saved), then backend file
        let data;
        try {
          const cachedData = localStorage.getItem('agbim_data_cache');
          if (cachedData) {
            data = JSON.parse(cachedData);
            console.log('📦 Chat using localStorage cache with fresh data');
          } else {
            data = await projectService.loadAllProjects();
            console.log('📁 Chat using agbim.json file data');
          }
        } catch (error) {
          console.error('Error loading chat data:', error);
          data = await projectService.loadAllProjects();
        }
        console.log('📊 Loaded backend data structure:', {
          projects: data?.projects?.length || 0,
          tasks: data?.tasks?.length || 0,
          people: data?.people?.length || 0
        });
        
        if (data?.projects) {
          setProjects(data.projects);
          
          // Set first project as active if none selected
          if (!activeProject && data.projects.length > 0) {
            setActiveProject(data.projects[0]);
          }
          
          // Load chat messages for all projects
          console.log('📥 Loading chat messages from projects:', data.projects.length);
          const allChatMessages = [];
          for (const project of data.projects) {
            if (project.chat) {
              console.log(`💬 Project ${project.id} has ${project.chat.length} chat messages`);
              project.chat.forEach(msg => {
                if (msg.agbimProcessing) {
                  // AGBIM message - create linked pair: text on left, attachments on right
                  const textId = `${msg.id}-text`;
                  const attachId = `${msg.id}-attach`;
                  
                  // Text/analysis card (left side)
                  allChatMessages.push({
                    id: textId,
                    type: 'agbim_result',
                    author: getAuthorName(msg.authorId, data.people),
                    content: msg.message,
                    timestamp: new Date(msg.timestamp),
                    avatar: getAuthorAvatar(msg.authorId, data.people),
                    context: { projectId: project.id },
                    agbimProcessing: msg.agbimProcessing,
                    linkedItemId: attachId
                  });
                  
                  // Attachments card (right side) - only if there are attachments
                  if (msg.attachments && msg.attachments.length > 0) {
                    allChatMessages.push({
                      id: attachId,
                      type: 'agbim_attachments',
                      author: getAuthorName(msg.authorId, data.people),
                      content: `${msg.attachments.length} priloga`,
                      timestamp: new Date(msg.timestamp),
                      avatar: getAuthorAvatar(msg.authorId, data.people),
                      context: { projectId: project.id },
                      attachments: msg.attachments,
                      linkedItemId: textId
                    });
                  }
                } else {
                  // Regular message
                  allChatMessages.push({
                    id: msg.id,
                    type: 'comment',
                    author: getAuthorName(msg.authorId, data.people),
                    content: msg.message,
                    timestamp: new Date(msg.timestamp),
                    avatar: getAuthorAvatar(msg.authorId, data.people),
                    context: { projectId: project.id },
                    attachments: msg.attachments || [],
                    linkedItemId: null
                  });
                }
              });
            }
          }
          
          // Sort by timestamp with AGBIM messages prioritized (newer first for recent activity)
          const sortedMessages = allChatMessages.sort((a, b) => {
            // If one is AGBIM and the other isn't, prioritize AGBIM
            const aIsAgbim = a.type === 'agbim_result' || a.type === 'agbim_attachments';
            const bIsAgbim = b.type === 'agbim_result' || b.type === 'agbim_attachments';
            
            if (aIsAgbim && !bIsAgbim) return 1; // AGBIM messages go to end (most recent)
            if (!aIsAgbim && bIsAgbim) return -1;
            
            // Otherwise sort by timestamp (newer first for recent activity at bottom)
            return a.timestamp - b.timestamp;
          });
          console.log('📝 Setting timeline items:', sortedMessages.length, '(AGBIM messages prioritized)');
          setTimelineItems(sortedMessages);
        }
      } catch (error) {
        console.error('Failed to load projects and chat:', error);
      } finally {
        setDataLoading(false);
      }
    };

    loadProjectsAndChat();
  }, []); // Load once on mount, updates come from events

  // Helper functions for author info
  const getAuthorName = (authorId, people) => {
    if (authorId === 'system') return 'Sustav';
    if (authorId === 'agbim_system') return 'AGBIM Sustav';
    const person = people?.find(p => p.id === authorId);
    return person?.name || 'Nepoznat korisnik';
  };

  const getAuthorAvatar = (authorId, people) => {
    if (authorId === 'system') return 'S';
    if (authorId === 'agbim_system') return 'AG';
    const person = people?.find(p => p.id === authorId);
    return person?.name ? person.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'NK';
  };

  useEffect(() => {
    const handleTabSwitch = (event) => {
      const { data } = event.detail;
      if (data && data.message) {
        const newComment = {
          id: `auto-${Date.now()}`,
          type: 'comment',
          author: 'AI Analiza',
          content: data.message,
          timestamp: new Date(),
          avatar: 'AI',
          context: data.context || {},
          linkedItemId: null,
        };

        setTimelineItems(prev => [...prev, newComment]);
        
        if (data.context?.projectId) {
          const project = projects.find(p => p.id === data.context.projectId);
          if (project) {
            setActiveProject(project);
          }
        }
      }
    };

    window.addEventListener('switchToTab', handleTabSwitch);
    
    return () => {
      window.removeEventListener('switchToTab', handleTabSwitch);
    };
  }, []);

  // Load project data and initialize timeline
  // Legacy useEffect removed - data is now loaded via ProjectDataService

  // Listen for messages from AGBIM Field Simulator
  useEffect(() => {
    const handleMediaAISwitchToChat = (event) => {
      console.log('Switch to chat requested:', event.detail);
      // Chat tab is already active, could focus on specific project
    };

    const handleMediaAIPostToChat = async (event) => {
      const { comment, batch } = event.detail;
      console.log('💬 Chat received media-ai:post-to-chat event:', { comment, batch });
      
      try {
        // Add to UI state immediately
        if (comment) {
          setTimelineItems(prev => [...prev, comment]);
        }
        if (batch) {
          setTimelineItems(prev => [...prev, batch]);
        }

        // Save to backend via ProjectDataService
        if (comment) {
          await projectService.addChatMessage({
            projectId: comment.context?.projectId || (activeProject?.id),
            message: {
              id: comment.id,
              type: comment.type || 'comment',
              authorId: 'u1', // Default user
              content: comment.content,
              timestamp: comment.timestamp,
              context: comment.context || {},
              linkedItemId: comment.linkedItemId
            }
          });
          console.log('✅ Comment saved to backend');
        }

        if (batch) {
          await projectService.addChatMessage({
            projectId: batch.context?.projectId || (activeProject?.id),
            message: {
              id: batch.id,
              type: batch.type || 'file_batch',
              authorId: 'u1', // Default user
              content: `${batch.files?.length || 0} datoteka(e)`,
              timestamp: batch.timestamp,
              context: batch.context || {},
              linkedItemId: batch.linkedItemId,
              files: batch.files || []
            }
          });
          console.log('✅ File batch saved to backend');
        }
      } catch (error) {
        console.error('❌ Failed to save chat message to backend:', error);
      }
    };

    window.addEventListener('media-ai:switch-to-chat', handleMediaAISwitchToChat);
    window.addEventListener('media-ai:post-to-chat', handleMediaAIPostToChat);

    return () => {
      window.removeEventListener('media-ai:switch-to-chat', handleMediaAISwitchToChat);
      window.removeEventListener('media-ai:post-to-chat', handleMediaAIPostToChat);
    };
  }, []);

  // Legacy loadProjectData function removed - using ProjectDataService now

  const parseFileReference = (fileRef) => {
    if (!fileRef) return null;
    if (fileRef.startsWith('file:///')) {
      const filename = fileRef.split('/').pop();
      return filename;
    }
    return fileRef;
  };

  const generateTimelineFromProjects = (projects) => {
    const timelineData = [];

    projects.forEach(project => {
      const projectStarted = new Date(project.created);
      
      timelineData.push({
        type: 'comment',
        id: `project-start-${project.id}`,
        author: 'Sistem',
        avatar: 'S',
        content: `📋 Projekt "${project.name}" je kreiran za klijenta ${project.client.name}`,
        timestamp: projectStarted,
        context: { projectId: project.id },
        linkedItemId: null,
      });

      project.positions?.forEach(position => {
        position.comments?.forEach(comment => {
          let commentContent = comment.text;
          if (comment.refs && comment.refs.length > 0) {
            const refStrings = comment.refs.map(ref => {
              if (ref.startsWith('acc:')) {
                const accDoc = project.accounting?.documents?.find(doc => doc.id === ref.replace('acc:', ''));
                return accDoc ? `📄 ${accDoc.documentType} ${accDoc.number}` : ref;
              }
              return parseFileReference(ref) || ref;
            });
            commentContent += `\n\n🔗 Reference: ${refStrings.join(', ')}`;
          }
          
          timelineData.push({
            type: 'comment',
            id: comment.id,
            author: comment.author.name,
            avatar: comment.author.name.split(' ').map(n => n[0]).join('').substring(0, 2),
            content: commentContent,
            timestamp: new Date(comment.date),
            context: { 
              projectId: project.id, 
              positionId: position.id,
              references: comment.refs 
            },
            linkedItemId: null,
          });
        });

        position.documents?.forEach(doc => {
          const docDate = new Date(doc.uploadDate);
          const commentId = `doc-comment-${doc.id}`;
          const batchId = `doc-batch-${doc.id}`;

          timelineData.push({
            type: 'comment',
            id: commentId,
            author: 'Sistem',
            avatar: 'S',
            content: `📎 Dodao dokument "${doc.name}" za ${position.title}\n\n🔗 Datoteka: ${parseFileReference(doc.path)}`,
            timestamp: docDate,
            context: { projectId: project.id, positionId: position.id },
            linkedItemId: batchId,
          });

          timelineData.push({
            type: 'file_batch',
            id: batchId,
            batchType: doc.isImage ? 'image' : 'document',
            timestamp: docDate,
            uploadedBy: 'Sistem',
            avatar: 'S',
            files: [{
              id: doc.id,
              name: doc.name,
              size: doc.size,
              type: doc.isImage ? 'image' : 'document'
            }],
            context: { projectId: project.id, positionId: position.id },
            linkedItemId: commentId,
          });
        });

        position.tasks?.forEach(task => {
          if (task.status === 'done') {
            timelineData.push({
              type: 'comment',
              id: `task-done-${task.id}`,
              author: task.assignee.name,
              avatar: task.assignee.name.split(' ').map(n => n[0]).join('').substring(0, 2),
              content: `✅ Završen zadatak: ${task.title}`,
              timestamp: new Date(task.due),
              context: { 
                projectId: project.id, 
                positionId: position.id,
                references: task.refs 
              },
              linkedItemId: null,
            });
          }
        });

        position.processes?.forEach(process => {
          if (process.status === 'Završeno' && process.actualEnd) {
            timelineData.push({
              type: 'comment',
              id: `process-done-${process.name}-${position.id}`,
              author: process.owner.name,
              avatar: process.owner.name.split(' ').map(n => n[0]).join('').substring(0, 2),
              content: `🔄 Završen proces: ${process.name} za ${position.title}`,
              timestamp: new Date(process.actualEnd),
              context: { projectId: project.id, positionId: position.id },
              linkedItemId: null,
            });
          }
        });
      });

      project.history?.slice(0, 10).forEach(historyItem => {
        timelineData.push({
          type: 'comment',
          id: historyItem.id,
          author: 'Sistem',
          avatar: 'S',
          content: `📝 ${historyItem.title}: ${historyItem.details}`,
          timestamp: new Date(historyItem.date),
          context: { projectId: project.id },
          linkedItemId: null,
        });
      });
    });

    timelineData.sort((a, b) => a.timestamp - b.timestamp);
    setTimelineItems(timelineData);
  };

  const generateSampleData = () => {
    const timestampBatch1 = new Date(2025, 8, 1, 9, 30);
    const idComment1 = 'c1';
    const idBatch1 = 'b1';

    const sampleData = [
      {
        type: 'comment',
        id: 'c0',
        author: 'Marko Petrović',
        content: 'Dobrodošli u Chat! Molim učitajte projektni JSON file.',
        timestamp: new Date(2025, 8, 1, 9, 15),
        avatar: 'MP',
        context: { projectId: 'DEMO' },
        linkedItemId: null,
      }
    ];
    
    setTimelineItems(sampleData);
  };

  // Auto-scroll
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timelineItems]);

  // --- Data Processing Pipeline ---

  // 1. Filtering (Memoized for performance)
  const filteredItems = useMemo(() => timelineItems.filter(item => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      let matches = (
        (item.content && item.content.toLowerCase().includes(term)) ||
        (item.author && item.author.toLowerCase().includes(term))
      );
       if (!matches && item.type === 'file_batch') {
        matches = item.files.some(file => file.name.toLowerCase().includes(term));
       }
      if (!matches) return false;
    }
    return true;
  }), [timelineItems, searchTerm]); 


  // 2. Grouping into Rows (CORE LOGIC CHANGE)
  const timelineRows = useMemo(() => groupItemsIntoRows(filteredItems), [filteredItems]);

  // 3. Grouping by Date (Now operates on Rows)
  const timelineGroups = useMemo(() => {
    const groups = {};
    timelineRows.forEach(row => {
      const dateKey = row.timestamp.toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(row);
    });
    return groups;
  }, [timelineRows]);


  // --- Handlers ---

  const handleSendComment = async () => {
    if (!inputComment.trim() || isLoading) return;

    const newComment = {
      id: `c-${Date.now()}`,
      type: 'comment',
      author: 'Vi (Ivan S.)',
      content: inputComment.trim(),
      timestamp: new Date(),
      avatar: 'IS',
      context: { projectId: activeProject?.id },
      linkedItemId: null,
    };

    setTimelineItems(prev => [...prev, newComment]);
    setInputComment('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  };

  // Handle the confirmed upload (Decoupling logic)
  const handleUploadConfirm = (uploadData) => {
    const { files, batchType, comment, context } = uploadData;
    // Ensure sharedTimestamp is exactly the same for both events
    const sharedTimestamp = new Date(); 
    const author = 'Vi (Ivan S.)';
    const avatar = 'IS';

    const commentId = `c-${Date.now()}`;
    const batchId = `b-${Date.now()}`;

    // 1. Create the File Batch Item (RIGHT SIDE)
    const batchItem = {
        id: batchId,
        type: 'file_batch',
        batchType: batchType,
        files: files,
        timestamp: sharedTimestamp,
        uploadedBy: author,
        author: author,
        avatar: avatar,
        context: context,
        linkedItemId: commentId,
    };

    // 2. Create the Comment Item (LEFT SIDE)
    const commentItem = {
        id: commentId,
        type: 'comment',
        author: author,
        avatar: avatar,
        content: comment,
        timestamp: sharedTimestamp,
        context: context,
        linkedItemId: batchId,
    };

    setTimelineItems(prev => [...prev, commentItem, batchItem]);
  };

  // --- Render Helper Functions ---

  // Renders the appropriate card component for an item
  const renderCard = (item) => {
    if (!item) return null;
    const isHighlighted = highlightedItemId === item.id;
    const commonProps = { item, isHighlighted, setHighlightedItemId };
    switch(item.type) {
        case 'comment': return <CommentCard {...commonProps} />;
        case 'issue': return <IssueCard {...commonProps} />;
        case 'file_batch': return <FileBatchCard {...commonProps} />;
        case 'agbim_result': return <AgbimCard {...commonProps} />;
        case 'agbim_attachments': return <AgbimAttachmentsCard {...commonProps} />;
        default: return null;
    }
  }

   // Determines connector color based on highlight state and type
   const getConnectorColor = (item, isHighlighted) => {
    if (!item) return 'bg-transparent';
    if (isHighlighted) return 'bg-blue-500'; // Active link color

    // Default hover colors based on type
    let hoverColor = 'bg-gray-500';
    if (item.type === 'comment') hoverColor = 'bg-blue-500';
    if (item.type === 'issue') hoverColor = 'bg-red-500';
    if (item.type === 'file_batch') {
        hoverColor = item.batchType === 'image' ? 'bg-purple-500' : 'bg-teal-500';
    }
    if (item.type === 'agbim_result' || item.type === 'agbim_attachments') {
        hoverColor = 'bg-purple-500';
    }
    
    return `bg-gray-300 group-hover:${hoverColor}`;
}

  // --- Render Logic for Timeline Row (NEW ARCHITECTURE) ---
  // Renders a complete row using the 5-2-5 grid layout
  const renderTimelineRow = (row) => {
    const { leftItem, rightItem } = row;

    // Check if the row (either side) is highlighted
    const isRowHighlighted = (leftItem && highlightedItemId === leftItem.id) || (rightItem && highlightedItemId === rightItem.id);

    // Define the gap size between the column edge and the connector start
    const gapSize = '24px'; // Corresponds to pr-6 / pl-6

    // Define the vertical alignment for the connector.
    // The center column starts with pt-4 (16px). The first dot is h-6 (24px).
    // The center of the first dot is 16px + 12px = 28px from the top edge of the row container.
    const connectorTopOffset = 'top-[28px]';

    return (
        // Grid Layout: 5/12 Left, 2/12 Center, 5/12 Right
        // items-start ensures the top edges of the cards are aligned horizontally
        <div key={row.id} className="grid grid-cols-12 mb-8 items-start">
            
            {/* Left Column (5/12) */}
            {/* pr-6 adds padding (gap) between content and the center column */}
            <div className="col-span-5 flex justify-end pr-6 relative group">
               {renderCard(leftItem)}
               {/* Connector Line (Visible only if leftItem exists) */}
               {leftItem && (
                 // Connector spans the gap defined by pr-6, aligned vertically by connectorTopOffset
                 <div style={{ width: gapSize }} className={`absolute right-0 ${connectorTopOffset} transform translate-x-full h-0.5 transition ${getConnectorColor(leftItem, isRowHighlighted)}`}></div>
               )}
            </div>

            {/* Center Column (2/12) - Timeline Dots */}
            {/* pt-4 aligns the dots vertically relative to the cards */}
            <div className="col-span-2 flex flex-col items-center pt-4 gap-1">
                {/* Render dots for existing items. They stack vertically if both exist. */}
                {leftItem && <TimelineDot type={leftItem.type} />}
                {/* Render the second dot only if the first one also exists OR if only the right one exists */}
                {rightItem && (leftItem || !leftItem) && <TimelineDot type={rightItem.type} />}
            </div>

            {/* Right Column (5/12) */}
             {/* pl-6 adds padding (gap) between the center column and content */}
            <div className="col-span-5 flex justify-start pl-6 relative group">
                {/* Connector Line (Visible only if rightItem exists) */}
                {rightItem && (
                    // Connector spans the gap defined by pl-6, aligned vertically by connectorTopOffset
                     <div style={{ width: gapSize }} className={`absolute left-0 ${connectorTopOffset} transform -translate-x-full h-0.5 transition ${getConnectorColor(rightItem, isRowHighlighted)}`}></div>
                )}
                {renderCard(rightItem)}
            </div>
        </div>
    );
  }

  // --- Main Render ---

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse">
          <div className="text-lg text-slate-600">Učitava chat podatke...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen bg-gray-100/70 overflow-hidden" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      
      {/* Header (Fluent UI 3 Style) */}
      <header className={`${FLUENT_ACRYLIC_BG} ${FLUENT_DEPTH_2} p-4 border-b border-gray-200/50 z-20`}>
        <div className="flex items-center justify-between gap-6">
          
          {/* 1. Project Selector */}
          <div className="flex items-center gap-3">
            <label htmlFor="project-selector" className='text-sm font-semibold text-gray-700'>Projekt:</label>
            <select
                id="project-selector"
                value={activeProject?.id || ""}
                onChange={(e) => {
                    const selected = projects.find(p => p.id === e.target.value);
                    setActiveProject(selected || null);
                }}
                className={`p-2 border border-gray-300 rounded-md bg-white ${FLUENT_DEPTH_1} focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-w-[250px]`}
            >
                <option value="">Opći Chat (Prikazuje sve)</option>
                {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>

          {/* 2. Omni-Search Bar */}
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Traži po tekstu, osobi, imenu datoteke, poziciji (PZ-01)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-2 pl-10 border border-gray-300 rounded-md bg-white/90 ${FLUENT_DEPTH_1} focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition duration-150 ease-in-out`}
            />
             {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                </button>
            )}
          </div>

          {/* 3. Visual Filters */}
          <div className="flex items-center gap-4">
            <FluentButton onClick={() => alert('Filteri')}>
                <Filter className='w-4 h-4'/>
                Filteri
            </FluentButton>
          </div>
        </div>
      </header>

      {/* Timeline Container */}
      {/* Updated positioning for the 3-column layout */}
      <div className="flex-1 overflow-y-auto relative py-8" onMouseLeave={() => setHighlightedItemId(null)}>
        
        {/* Central Timeline Line */}
        {/* Positioned exactly at the center (50%) */}
        <div className="absolute left-1/2 transform -translate-x-0.5 w-0.5 h-full bg-gray-300"></div>

        {/* Timeline Items (Rows) */}
        <div className='max-w-7xl mx-auto'> {/* Constrain width for better readability */}
          {Object.entries(timelineGroups).map(([dateString, rows]) => (
            <div key={dateString} className="mb-12">
              
              {/* Date Header (Sticky) */}
              <div className="flex justify-center mb-8 sticky top-0 z-10 pt-4">
                <div className="bg-gray-800 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                  {formatDate(dateString)}
                </div>
              </div>

              {/* Rows Grid */}
              {rows.map(row => renderTimelineRow(row))}
            </div>
          ))}

          {/* Loading indicator (Adapted for 3-column layout) */}
          {isLoading && (
             <div className="grid grid-cols-12 mb-8 items-start">
                <div className="col-span-5 flex justify-end pr-6">
                    <div className='p-4 bg-white rounded-lg shadow-md flex items-center gap-3'>
                        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                        <span className='text-sm text-gray-500'>Slanje...</span>
                    </div>
                </div>
                <div className="col-span-2 flex justify-center pt-4">
                     <div className="w-6 h-6 bg-gray-400 rounded-full border-4 border-white shadow-md animate-pulse z-10"></div>
                </div>
                <div className='col-span-5'></div>
            </div>
          )}

          <div ref={timelineEndRef} />
        </div>
      </div>

      {/* Input Area (Fluent UI 3 Style - Adapted for 3-column layout) */}
      <footer className={`${FLUENT_ACRYLIC_BG} ${FLUENT_DEPTH_2} border-t border-gray-200/50 p-4 z-20`}>
        <div className="max-w-7xl mx-auto grid grid-cols-12">
          
          {/* Left: Comment Input (5/12) */}
          <div className="col-span-5 flex gap-3 items-start pr-6">
            <textarea
              value={inputComment}
              onChange={(e) => setInputComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Napišite slobodan komentar (Lijeva strana)..."
              className={`flex-1 p-3 border border-gray-300 rounded-lg resize-none ${FLUENT_DEPTH_1} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white/90`}
              rows="3"
            />
            <FluentButton primary onClick={handleSendComment} disabled={!inputComment.trim() || isLoading} className='h-12'>
              <Send className="w-4 h-4" />
            </FluentButton>
          </div>

          {/* Center (2/12) */}
          <div className='col-span-2'></div>

          {/* Right: Upload/Issue (5/12) */}
          <div className="col-span-5 flex gap-4 items-center justify-start pl-6">
            <FluentButton onClick={() => setIsUploadModalOpen(true)} className='bg-teal-600 hover:bg-teal-700 text-white h-12'>
              <Upload className="w-4 h-4" />
              Upload Datoteka (Desna strana)
            </FluentButton>

            <FluentButton className='bg-red-600 hover:bg-red-700 text-white h-12'>
                <AlertTriangle className='w-4 h-4'/>
                Prijavi Problem
            </FluentButton>
          </div>
        </div>
      </footer>

      <UploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onConfirm={handleUploadConfirm}
        activeProject={activeProject}
        projects={projects}
      />
    </div>
  );
};

export default FluentTimelineChat;