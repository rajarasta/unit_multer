import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image, Table, File, RotateCcw, Camera, Type, Grid3x3, FileSpreadsheet, FileX, Code, Archive, Download, Edit3, Share2, Copy, Scissors, FileBarChart, Eye, Printer, Search, Layers, Ruler, Palette, Crop, Filter, Bold, Mic, MicOff, Brain, Cpu, Zap, Merge, X, Check, Sparkles, Wand2, Bot, Link, Timer, Clock, CheckCircle, XCircle, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import ReasoningOverlay from '../ReasoningOverlay';
import ContentRenderer from '../unit/content/ContentRenderer';
import useUnitContent from '../unit/hooks/useUnitContent';
import usePdf from '../unit/hooks/usePdf';
import useReasoning from '../unit/hooks/useReasoning';
import useDnd from '../unit/hooks/useDnd';
import { mockLLMService, STATUS_TYPES } from '../../services/mockLLMService';
import { getStatusIcon, canProcessContent, generateId, debounce } from '../../utils/helpers';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.min.js',
  import.meta.url
).toString();

const Unit = ({ id, onContentChange, isInConnectedContainer = false, containerPosition = null }) => {
  const [unitType, setUnitType] = useState('empty');
  const [content, setContent] = useState(null);
  // DnD state via hook
  const { isDragOver, setIsDragOver, handleDrop, handleDragOver, handleDragLeave, handleUnitDropTarget } = useDnd((input) => morphUnit(input));
  // PDF state via hook
  const { pdfNumPages, setPdfNumPages, pdfPageNumber, setPdfPageNumber, onDocumentLoadSuccess } = usePdf();
  const [fileUrl, setFileUrl] = useState(null);
  // Text input + detection via hook
  const { textInputValue, setTextInputValue, detectInputType } = useUnitContent();
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isDraggingConnection, setIsDraggingConnection] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState(null);
  const [dragCurrentPosition, setDragCurrentPosition] = useState(null);
  const [dragTargetUnit, setDragTargetUnit] = useState(null);

  // Enhanced connection management
  const [isConnectedUnit, setIsConnectedUnit] = useState(false);
  const [connectedToUnit, setConnectedToUnit] = useState(null); // ID of connected unit
  const [connectionColor, setConnectionColor] = useState(null); // Shared glow color

  // AI Reasoning state via hook - initialized after setProcessingStatus is declared
  let reasoningState, setReasoningState, _startReasoningWithArgs, cancelReasoningProcess;

  // Store user input for reasoning overlay
  const [userInputForReasoning, setUserInputForReasoning] = useState('');

  // Unit dimensions and position for overlay positioning
  const [unitBounds, setUnitBounds] = useState(null);

  // Processing status for multiple status icons
  const [processingStatus, setProcessingStatus] = useState({
    upload: STATUS_TYPES.UPLOAD.EMPTY,
    processing: STATUS_TYPES.PROCESSING.NOT_PROCESSED,
    queue: STATUS_TYPES.QUEUE.NOT_READY,
    connection: STATUS_TYPES.CONNECTION.DISCONNECTED,
    hasProcessedContent: false,
    readyForBigProcessing: false,
    inBigProcessingQueue: false
  });

  const recognitionRef = useRef(null);
  const unitRef = useRef(null);
  // Removed explicit abort controller; managed in useReasoning hook

  // Now that setProcessingStatus exists, initialize reasoning hook
  ({ reasoningState, setReasoningState, startReasoningProcess: _startReasoningWithArgs, cancelReasoningProcess } = useReasoning({ id, setProcessingStatus }));

  // detectInputType provided by useUnitContent

  

  // Auto-start flag to trigger reasoning after state updates
  const [autoStartReasoning, setAutoStartReasoning] = useState(false);

  const morphUnit = useCallback((input) => {
    const detectedType = detectInputType(input);
    setUnitType(detectedType);
    setContent(input);

    // Store input for reasoning overlay
    if (typeof input === 'string') {
      setUserInputForReasoning(input);
    } else if (input && input.name) {
      setUserInputForReasoning(`File upload: ${input.name}`);
    }

    // Create file URL for file-based content
    if (input && (input.constructor.name === 'File' || input.type !== undefined)) {
      const url = URL.createObjectURL(input);
      setFileUrl(url);
    }

    // Update processing status - content uploaded
    setProcessingStatus(prev => ({
      ...prev,
      upload: STATUS_TYPES.UPLOAD.UPLOADED,
      processing: canProcessContent(detectedType, input)
        ? STATUS_TYPES.PROCESSING.NOT_PROCESSED
        : prev.processing
    }));

    // Trigger reasoning overlay after 1 second delay
    setTimeout(() => {
      // Get Unit bounds before showing overlay
      if (unitRef.current) {
        const rect = unitRef.current.getBoundingClientRect();
        setUnitBounds({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      }

      setReasoningState(prev => ({
        ...prev,
        isActive: true,
        status: 'processing'
      }));
    }, 1000);

    // Request auto-start of reasoning on next render once content/state are updated
    if (canProcessContent(detectedType, input)) {
      setAutoStartReasoning(true);
    }

    onContentChange?.(id, detectedType, input);
  }, [detectInputType, id, onContentChange]);

  // Fire reasoning once unitType/content are updated and flag is set

  const resetUnit = useCallback(() => {
    // Cancel any active reasoning
    if (reasoningState.isActive) {
      cancelReasoningProcess();
    }

    setUnitType('empty');
    setContent(null);
    setPdfNumPages(null);
    setPdfPageNumber(1);

    // Cleanup file URL
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }

    // Reset all statuses
    setReasoningState({
      isActive: false,
      reasoningId: null,
      steps: [],
      currentStep: 0,
      status: 'idle',
      result: null,
      error: null
    });

    setUserInputForReasoning('');
    setUnitBounds(null);

    setProcessingStatus({
      upload: STATUS_TYPES.UPLOAD.EMPTY,
      processing: STATUS_TYPES.PROCESSING.NOT_PROCESSED,
      queue: STATUS_TYPES.QUEUE.NOT_READY,
      connection: STATUS_TYPES.CONNECTION.DISCONNECTED,
      hasProcessedContent: false,
      readyForBigProcessing: false,
      inBigProcessingQueue: false
    });

    onContentChange?.(id, 'empty', null);
  }, [id, onContentChange, fileUrl, reasoningState.isActive, reasoningState.reasoningId]);

  // AI Reasoning Management: wrapper that binds current unitType/content
  const startReasoningProcess = useCallback(() => {
    _startReasoningWithArgs(unitType, content);
  }, [_startReasoningWithArgs, unitType, content]);

  // Fire reasoning once unitType/content are updated and flag is set
  useEffect(() => {
    if (autoStartReasoning && canProcessContent(unitType, content) && !reasoningState.isActive) {
      startReasoningProcess();
      setAutoStartReasoning(false);
    }
  }, [autoStartReasoning, unitType, content, reasoningState.isActive, startReasoningProcess]);

  // cancelReasoningProcess provided by hook

  const addToBigProcessingQueue = useCallback(() => {
    if (!processingStatus.hasProcessedContent) {
      return;
    }

    const queueId = mockLLMService.addToBigProcessingQueue([id], 'normal');

    setProcessingStatus(prev => ({
      ...prev,
      inBigProcessingQueue: true,
      queue: STATUS_TYPES.QUEUE.QUEUED
    }));

    // Trigger global queue update event
    window.dispatchEvent(new CustomEvent('unit-added-to-big-queue', {
      detail: { unitId: id, queueId }
    }));
  }, [processingStatus.hasProcessedContent, id]);

  // DnD handlers provided by useDnd hook

  const handleFileChange = useCallback((e) => {
    const files = e.target.files;
    if (files.length > 0) {
      morphUnit(files[0]);
    }
  }, [morphUnit]);

  const handleTextChange = useCallback((e) => {
    setTextInputValue(e.target.value);
  }, []);

  const handleTextKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = textInputValue.trim();
      if (text) {
        morphUnit(text);
        setTextInputValue('');
      }
    }
  }, [textInputValue, morphUnit]);

  

  

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setTextInputValue(prev => prev + (prev ? ' ' : '') + transcript);
          setIsListening(false);
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Connection Button Drag Functions
  const handleConnectionDragStart = useCallback((e) => {
    e.stopPropagation();
    if (unitType === 'empty') return;

    const rect = unitRef.current.getBoundingClientRect();
    const startPos = {
      x: e.clientX,
      y: e.clientY,
      unitX: rect.left + rect.width / 2,
      unitY: rect.top + rect.height / 2
    };

    setDragStartPosition(startPos);
    setDragCurrentPosition(startPos);
    setIsDraggingConnection(true);

    // Trigger global drag state
    window.dispatchEvent(new CustomEvent('unit-connection-drag-start', {
      detail: { sourceUnitId: id, sourceData: { type: unitType, content, fileUrl } }
    }));
  }, [id, unitType, content, fileUrl]);

  const handleConnectionDragMove = useCallback((e) => {
    if (!isDraggingConnection) return;

    setDragCurrentPosition({
      x: e.clientX,
      y: e.clientY
    });
  }, [isDraggingConnection]);

  const handleConnectionDragEnd = useCallback((e) => {
    if (!isDraggingConnection) return;

    // Check if we're over a valid drop target
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    const targetUnit = elementBelow?.closest('[data-unit-id]');

    if (targetUnit) {
      const targetId = targetUnit.getAttribute('data-unit-id');
      if (targetId !== id) {
        // Generate unique connection color
        const colors = [
          'rgb(59, 130, 246)', // blue
          'rgb(139, 92, 246)', // purple
          'rgb(34, 197, 94)',  // green
          'rgb(251, 146, 60)', // orange
          'rgb(236, 72, 153)', // pink
          'rgb(14, 165, 233)'  // sky
        ];
        const connectionColor = colors[Math.floor(Math.random() * colors.length)];

        // Connect both units with same color
        setIsConnectedUnit(true);
        setConnectedToUnit(targetId);
        setConnectionColor(connectionColor);

        // Get Unit positions for container calculation
        const sourceRect = unitRef.current.getBoundingClientRect();
        const targetRect = targetUnit.getBoundingClientRect();

        // Trigger global connection event to create connected container
        window.dispatchEvent(new CustomEvent('units-create-connected-container', {
          detail: {
            sourceUnitId: id,
            targetUnitId: targetId,
            connectionColor,
            sourcePosition: {
              x: sourceRect.left,
              y: sourceRect.top,
              width: sourceRect.width,
              height: sourceRect.height
            },
            targetPosition: {
              x: targetRect.left,
              y: targetRect.top,
              width: targetRect.width,
              height: targetRect.height
            }
          }
        }));

        // Also trigger individual unit connection for internal state
        window.dispatchEvent(new CustomEvent('unit-connected', {
          detail: {
            sourceUnitId: id,
            targetUnitId: targetId,
            connectionColor
          }
        }));
      }
    }

    // Reset drag state
    setIsDraggingConnection(false);
    setDragStartPosition(null);
    setDragCurrentPosition(null);

    window.dispatchEvent(new CustomEvent('unit-connection-drag-end'));
  }, [isDraggingConnection, id]);

  // Listen for connection events from other units
  useEffect(() => {
    const handleConnection = (event) => {
      const { sourceUnitId, targetUnitId, connectionColor } = event.detail;
      if (targetUnitId === id) {
        setIsConnectedUnit(true);
        setConnectedToUnit(sourceUnitId);
        setConnectionColor(connectionColor);
      }
    };

    window.addEventListener('unit-connected', handleConnection);
    return () => window.removeEventListener('unit-connected', handleConnection);
  }, [id]);

  // Reset connection
  const resetConnection = useCallback(() => {
    setIsConnectedUnit(false);
    setConnectedToUnit(null);
    setConnectionColor(null);

    // Reset connection status
    setProcessingStatus(prev => ({
      ...prev,
      connection: STATUS_TYPES.CONNECTION.DISCONNECTED
    }));

    // Notify connected unit to also reset
    if (connectedToUnit) {
      window.dispatchEvent(new CustomEvent('unit-disconnected', {
        detail: { unitId: connectedToUnit }
      }));
    }
  }, [connectedToUnit]);

  // Listen for disconnection events
  useEffect(() => {
    const handleDisconnection = (event) => {
      const { unitId } = event.detail;
      if (unitId === id) {
        setIsConnectedUnit(false);
        setConnectedToUnit(null);
        setConnectionColor(null);
      }
    };

    window.addEventListener('unit-disconnected', handleDisconnection);
    return () => window.removeEventListener('unit-disconnected', handleDisconnection);
  }, [id]);

  // handleUnitDropTarget provided by useDnd hook

  const handleUnitDropLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  // Global event listeners for connection drag tracking
  useEffect(() => {
    if (isDraggingConnection) {
      const handleGlobalMouseMove = (e) => handleConnectionDragMove(e);
      const handleGlobalMouseUp = (e) => handleConnectionDragEnd(e);

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDraggingConnection, handleConnectionDragMove, handleConnectionDragEnd]);

  const getSupportedTypeIcons = () => [
    { icon: Camera, label: 'Images', color: 'text-green-500' },
    { icon: Type, label: 'Text', color: 'text-blue-500' },
    { icon: FileSpreadsheet, label: 'Tables', color: 'text-purple-500' },
    { icon: FileX, label: 'PDF', color: 'text-red-500' },
    { icon: Code, label: 'XML', color: 'text-orange-500' },
    { icon: Archive, label: 'DWG', color: 'text-cyan-500' }
  ];

  // Get processing status icons for status bar
  const getProcessingStatusIcons = useCallback(() => {
    const statusIcons = [];

    // Upload status
    if (processingStatus.upload !== STATUS_TYPES.UPLOAD.EMPTY) {
      const uploadIcon = getStatusIcon('upload', processingStatus.upload);
      statusIcons.push({
        key: 'upload',
        ...uploadIcon,
        title: `Upload: ${processingStatus.upload.replace('upload_', '').replace('_', ' ')}`
      });
    }

    // Processing status
    if (processingStatus.processing !== STATUS_TYPES.PROCESSING.NOT_PROCESSED) {
      const processIcon = getStatusIcon('processing', processingStatus.processing);
      statusIcons.push({
        key: 'processing',
        ...processIcon,
        title: `Processing: ${processingStatus.processing.replace('proc_', '').replace('_', ' ')}`,
        action: () => {
          if (processingStatus.processing === STATUS_TYPES.PROCESSING.NOT_PROCESSED) {
            startReasoningProcess();
          } else if (processingStatus.processing === STATUS_TYPES.PROCESSING.REASONING) {
            cancelReasoningProcess();
          }
        }
      });
    }

    // Queue status
    if (processingStatus.queue !== STATUS_TYPES.QUEUE.NOT_READY) {
      const queueIcon = getStatusIcon('queue', processingStatus.queue);
      statusIcons.push({
        key: 'queue',
        ...queueIcon,
        title: `Queue: ${processingStatus.queue.replace('queue_', '').replace('_', ' ')}`,
        action: () => {
          if (processingStatus.queue === STATUS_TYPES.QUEUE.READY) {
            addToBigProcessingQueue();
          }
        }
      });
    }

    // Connection status
    if (processingStatus.connection !== STATUS_TYPES.CONNECTION.DISCONNECTED) {
      const connIcon = getStatusIcon('connection', processingStatus.connection);
      statusIcons.push({
        key: 'connection',
        ...connIcon,
        title: `Connection: ${processingStatus.connection.replace('conn_', '').replace('_', ' ')}`
      });
    }

    return statusIcons;
  }, [processingStatus, startReasoningProcess, cancelReasoningProcess, addToBigProcessingQueue]);

  const getActionsByType = (type) => {
    const baseActions = {
      pdf: [
        { icon: Eye, label: 'View', action: () => console.log('View PDF') },
        { icon: Download, label: 'Download', action: () => console.log('Download PDF') },
        { icon: Scissors, label: 'Split', action: () => console.log('Split PDF') },
        { icon: Copy, label: 'Extract', action: () => console.log('Extract Text') },
        { icon: Search, label: 'Search', action: () => console.log('Search PDF') },
        { icon: Printer, label: 'Print', action: () => console.log('Print PDF') }
      ],
      image: [
        { icon: Eye, label: 'View', action: () => console.log('View Image') },
        { icon: Crop, label: 'Crop', action: () => console.log('Crop Image') },
        { icon: Filter, label: 'Filter', action: () => console.log('Filter Image') },
        { icon: Palette, label: 'Edit', action: () => console.log('Edit Image') },
        { icon: Download, label: 'Download', action: () => console.log('Download Image') },
        { icon: Share2, label: 'Share', action: () => console.log('Share Image') }
      ],
      text: [
        { icon: Edit3, label: 'Edit', action: () => console.log('Edit Text') },
        { icon: Bold, label: 'Format', action: () => console.log('Format Text') },
        { icon: Copy, label: 'Copy', action: () => console.log('Copy Text') },
        { icon: Download, label: 'Export', action: () => console.log('Export Text') },
        { icon: Search, label: 'Find', action: () => console.log('Find in Text') }
      ],
      table: [
        { icon: Eye, label: 'View', action: () => console.log('View Table') },
        { icon: FileBarChart, label: 'Analyze', action: () => console.log('Analyze Data') },
        { icon: Download, label: 'Export', action: () => console.log('Export Table') },
        { icon: Edit3, label: 'Edit', action: () => console.log('Edit Table') }
      ],
      dwg: [
        { icon: Eye, label: 'View', action: () => console.log('View DWG') },
        { icon: Layers, label: 'Layers', action: () => console.log('Toggle Layers') },
        { icon: Ruler, label: 'Measure', action: () => console.log('Measure') },
        { icon: Download, label: 'Export', action: () => console.log('Export DWG') }
      ]
    };

    // Add AI processing actions for processable content types
    const processingActions = [];

    if (canProcessContent(type, content)) {
      // Process action
      if (processingStatus.processing === STATUS_TYPES.PROCESSING.NOT_PROCESSED) {
        processingActions.push({
          icon: Brain,
          label: 'Process AI',
          action: startReasoningProcess,
          className: 'text-purple-600 hover:text-purple-700'
        });
      } else if (processingStatus.processing === STATUS_TYPES.PROCESSING.REASONING) {
        processingActions.push({
          icon: X,
          label: 'Cancel',
          action: cancelReasoningProcess,
          className: 'text-orange-600 hover:text-orange-700'
        });
      } else if (processingStatus.hasProcessedContent && processingStatus.queue === STATUS_TYPES.QUEUE.READY) {
        processingActions.push({
          icon: Zap,
          label: 'Big Process',
          action: addToBigProcessingQueue,
          className: 'text-green-600 hover:text-green-700'
        });
      }
    }

    return [...(baseActions[type] || []), ...processingActions];
  };

  const renderContent = () => {
    switch (unitType) {
      case 'empty':
        return (
          <ContentRenderer
            unitType={unitType}
            views={{
              empty: {
                isDragOver,
                handleFileChange,
                textInputValue,
                handleTextChange,
                handleTextKeyPress,
                speechSupported,
                isListening,
                startListening,
                stopListening,
                getSupportedTypeIcons
              }
            }}
          />
        );

      case 'image':
        return (
          <ContentRenderer
            unitType={unitType}
            views={{
              image: {
                fileUrl,
                content,
                getActionsByType,
                resetUnit
              }
            }}
          />
        );

      case 'text':
        return (
          <ContentRenderer
            unitType={unitType}
            views={{
              text: {
                content,
                onChange: (val) => setContent(val),
                getActionsByType,
                resetUnit
              }
            }}
          />
        );

      case 'pdf':
        return (
          <ContentRenderer
            unitType={unitType}
            views={{
              pdf: {
                fileUrl,
                pdfNumPages,
                pdfPageNumber,
                onDocumentLoadSuccess,
                getActionsByType,
                resetUnit,
                content
              }
            }}
          />
        );

      case 'table':
        return (
          <ContentRenderer
            unitType={unitType}
            views={{
              table: {
                content,
                getActionsByType,
                resetUnit
              }
            }}
          />
        );

      case 'dwg':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Archive size={16} className="text-cyan-600" />
                <span className="text-xs font-medium">CAD Drawing</span>
              </div>
              <div className="flex items-center gap-1">

                {/* Reset Button */}
                <button
                  onClick={resetUnit}
                  title="Reset Unit"
                  className="relative group text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
                >
                  <RotateCcw size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Reset Unit
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex-1 flex gap-2">
              {/* Left side - CAD Preview */}
              <div className="w-2/3 bg-slate-50 rounded border-2 border-dashed border-slate-200 flex flex-col justify-center items-center space-y-2">
                <Archive size={32} className="text-cyan-400" />
                <div className="text-xs text-center text-slate-600">
                  <p className="font-medium">{content?.name}</p>
                  <p>CAD Drawing File</p>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="w-1/3 p-1">
                <div className="text-xs font-medium text-slate-600 mb-2">Actions</div>
                <div className="space-y-1">
                  {getActionsByType('dwg').map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={action.action}
                      className="w-full flex items-center space-x-2 p-1 rounded hover:bg-slate-100 transition-colors group"
                    >
                      <action.icon size={12} className="text-slate-600 group-hover:text-cyan-600 transition-colors" />
                      <span className="text-xs text-slate-500 group-hover:text-slate-700">
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <p>Name: {content?.name}</p>
                  <p>Size: {content ? (content.size / 1024).toFixed(1) : 0} KB</p>
                  <p>Type: {content?.type || 'CAD'}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <File size={16} className="text-orange-600" />
                <span className="text-xs font-medium">File</span>
              </div>
              <div className="flex items-center gap-1">

                {/* Reset Button */}
                <button
                  onClick={resetUnit}
                  title="Reset Unit"
                  className="relative group text-slate-400 hover:text-red-600 hover:bg-red-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
                >
                  <RotateCcw size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Reset Unit
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-50 rounded p-2 flex flex-col justify-center items-center space-y-2">
              <File size={24} className="text-slate-400" />
              <div className="text-xs text-center text-slate-600">
                <p className="font-medium">{content?.name}</p>
                <p>Size: {content ? (content.size / 1024).toFixed(1) : 0} KB</p>
                <p>Type: {content?.type || 'Unknown'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="h-full flex items-center justify-center text-slate-400">Unknown type</div>;
    }
  };


  return (
    <>
      {/* Dynamic Arrow SVG Overlay */}
      {isDraggingConnection && dragStartPosition && dragCurrentPosition && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <svg className="w-full h-full">
            <defs>
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Main arrow line */}
            <motion.line
              x1={dragStartPosition.unitX}
              y1={dragStartPosition.unitY}
              x2={dragCurrentPosition.x}
              y2={dragCurrentPosition.y}
              stroke="url(#arrowGradient)"
              strokeWidth="3"
              filter="url(#glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />

            {/* Arrowhead */}
            <motion.polygon
              points={`${dragCurrentPosition.x-10},${dragCurrentPosition.y-6} ${dragCurrentPosition.x},${dragCurrentPosition.y} ${dragCurrentPosition.x-10},${dragCurrentPosition.y+6}`}
              fill="url(#arrowGradient)"
              filter="url(#glow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.2 }}
            />

            {/* Pulsing effect at start */}
            <motion.circle
              cx={dragStartPosition.unitX}
              cy={dragStartPosition.unitY}
              r="8"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              initial={{ r: 0, opacity: 0.8 }}
              animate={{ r: [8, 16, 8], opacity: [0.8, 0.2, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>
      )}


      {/* Main Unit Container */}
      <motion.div
        ref={unitRef}
        data-unit-id={id}
        className={`h-full rounded border-2 p-2 transition-all duration-300 cursor-grab active:cursor-grabbing ${
          isInConnectedContainer
            ? 'border-slate-200 bg-white shadow-sm'
            : isConnectedUnit && connectionColor
              ? `border-2 bg-white shadow-lg`
              : isDragOver
                ? 'border-blue-400 bg-blue-50'
                : unitType === 'empty'
                  ? 'border-dashed border-slate-300 bg-white'
                  : 'border-slate-200 bg-white shadow-sm'
        }`}
        style={{
          borderColor: !isInConnectedContainer && isConnectedUnit && connectionColor ? connectionColor : undefined,
          boxShadow: !isInConnectedContainer && isConnectedUnit && connectionColor
            ? `0 0 30px ${connectionColor}80, 0 0 60px ${connectionColor}40, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
            : undefined
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleUnitDropTarget}
        layout
        animate={!isInConnectedContainer && isConnectedUnit && connectionColor ? {
          boxShadow: [
            `0 0 30px ${connectionColor}80, 0 0 60px ${connectionColor}40, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
            `0 0 40px ${connectionColor}90, 0 0 80px ${connectionColor}60, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
            `0 0 30px ${connectionColor}80, 0 0 60px ${connectionColor}40, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
          ]
        } : {}}
        transition={!isInConnectedContainer && isConnectedUnit ? {
          boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        } : {}}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={unitType}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>


        {/* Connection Indicator */}
        {isConnectedUnit && connectedToUnit && (
          <motion.div
            className="absolute bottom-1 left-1 text-xs text-slate-600 bg-white/80 rounded px-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            â†” Unit {connectedToUnit}
          </motion.div>
        )}
      </motion.div>

      {/* AI Reasoning Overlay */}
      <AnimatePresence>
        {reasoningState.isActive && unitBounds && (
          <ReasoningOverlay
            isActive={reasoningState.isActive}
            reasoningData={reasoningState}
            onCancel={cancelReasoningProcess}
            position="fixed"
            userInput={userInputForReasoning}
            unitBounds={unitBounds}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Unit;
