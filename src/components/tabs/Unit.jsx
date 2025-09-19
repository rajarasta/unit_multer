import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image, Table, File, RotateCcw, Camera, Type, Grid3x3, FileSpreadsheet, FileX, Code, Archive, Download, Edit3, Share2, Copy, Scissors, FileBarChart, Eye, Printer, Search, Layers, Ruler, Palette, Crop, Filter, Bold, Mic, MicOff, Brain, Cpu, Zap, Merge, X, Check, Sparkles, Wand2, Bot, Link, Timer, Clock, CheckCircle, XCircle, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import ReasoningOverlay from '../ReasoningOverlay';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [fileUrl, setFileUrl] = useState(null);
  const [textInputValue, setTextInputValue] = useState('');
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

  // AI Reasoning state management
  const [reasoningState, setReasoningState] = useState({
    isActive: false,
    reasoningId: null,
    steps: [],
    currentStep: 0,
    status: 'idle', // idle, processing, completed, cancelled, error
    result: null,
    error: null
  });

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
  const reasoningAbortControllerRef = useRef(null);

  const detectInputType = useCallback((input) => {
    if (input && (input.constructor.name === 'FileList' || input.constructor.name === 'File' || input.type !== undefined)) {
      const file = input.constructor.name === 'FileList' ? input[0] : input;

      // Enhanced detection
      if (file.type.startsWith('image/')) {
        return file.type.includes('svg') ? 'svg' : 'image';
      }
      if (file.type === 'application/pdf') return 'pdf';
      if (file.name.endsWith('.xml') || file.type.includes('xml')) return 'xml';
      if (file.name.endsWith('.dwg') || file.name.endsWith('.dxf')) return 'dwg';
      if (file.type.includes('sheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.csv') || file.name.endsWith('.xls')) return 'table';
      if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) return 'textfile';
      if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return 'document';
      return 'file';
    }
    if (typeof input === 'string') {
      if (input.trim().includes('\t') || input.includes(',')) return 'table';
      if (input.includes('<') && input.includes('>')) return 'xml';
      return 'text';
    }
    return 'empty';
  }, []);

  const morphUnit = useCallback((input) => {
    const detectedType = detectInputType(input);
    setUnitType(detectedType);
    setContent(input);

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

    onContentChange?.(id, detectedType, input);
  }, [detectInputType, id, onContentChange]);

  const resetUnit = useCallback(() => {
    // Cancel any active reasoning
    if (reasoningState.isActive && reasoningAbortControllerRef.current) {
      reasoningAbortControllerRef.current.abort();
      mockLLMService.cancelReasoning(reasoningState.reasoningId);
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

  // AI Reasoning Management Functions
  const startReasoningProcess = useCallback(async () => {
    if (!canProcessContent(unitType, content) || reasoningState.isActive) {
      return;
    }

    const reasoningId = generateId('reasoning');
    reasoningAbortControllerRef.current = new AbortController();

    // Update status to processing
    setProcessingStatus(prev => ({
      ...prev,
      processing: STATUS_TYPES.PROCESSING.REASONING
    }));

    setReasoningState({
      isActive: true,
      reasoningId,
      steps: [],
      currentStep: 0,
      status: 'processing',
      result: null,
      error: null
    });

    try {
      const result = await mockLLMService.startReasoning(
        id,
        unitType,
        content,
        (progressData) => {
          setReasoningState(prev => ({
            ...prev,
            steps: progressData.steps || prev.steps,
            currentStep: progressData.step || prev.currentStep,
            status: progressData.status || prev.status,
            result: progressData.result || prev.result,
            error: progressData.error || prev.error
          }));
        }
      );

      // Reasoning completed successfully
      setProcessingStatus(prev => ({
        ...prev,
        processing: STATUS_TYPES.PROCESSING.PROCESSED,
        hasProcessedContent: true,
        readyForBigProcessing: true,
        queue: STATUS_TYPES.QUEUE.READY
      }));

    } catch (error) {
      console.error('Reasoning failed:', error);
      setReasoningState(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }));

      setProcessingStatus(prev => ({
        ...prev,
        processing: STATUS_TYPES.PROCESSING.ERROR
      }));
    }
  }, [unitType, content, reasoningState.isActive, id]);

  const cancelReasoningProcess = useCallback(() => {
    if (reasoningState.isActive && reasoningState.reasoningId) {
      if (reasoningAbortControllerRef.current) {
        reasoningAbortControllerRef.current.abort();
      }

      mockLLMService.cancelReasoning(reasoningState.reasoningId);

      setReasoningState(prev => ({
        ...prev,
        isActive: false,
        status: 'cancelled'
      }));

      setProcessingStatus(prev => ({
        ...prev,
        processing: STATUS_TYPES.PROCESSING.CANCELLED
      }));
    }
  }, [reasoningState.isActive, reasoningState.reasoningId]);

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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      morphUnit(files[0]);
    }
  }, [morphUnit]);

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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

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

  const handleUnitDropTarget = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // Add visual feedback for valid drop target
    if (isDragOver) return; // Don't interfere with file drag-drop

    setIsDragOver(true);
  }, [isDragOver]);

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

  const onDocumentLoadSuccess = ({ numPages }) => {
    setPdfNumPages(numPages);
  };

  const renderContent = () => {
    switch (unitType) {
      case 'empty':
        return (
          <div
            className={`h-full flex flex-col relative bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg transition-all duration-300 ${
              isDragOver ? 'border-blue-400 bg-blue-50/30 shadow-lg shadow-blue-500/20' : 'hover:bg-white/30'
            }`}
          >
            {/* Transparent overlay for empty state */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-lg pointer-events-none" />

            {/* Supported file type icons in top right */}
            <div className="absolute top-2 right-2 flex flex-wrap gap-1.5 z-10">
              {getSupportedTypeIcons().map((type, index) => (
                <motion.div
                  key={type.label}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`${type.color} opacity-40 hover:opacity-80 transition-all duration-200 hover:scale-110 cursor-help`}
                  title={type.label}
                >
                  <type.icon size={14} className="drop-shadow-sm" />
                </motion.div>
              ))}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-6 relative z-10">
              <motion.div
                className="text-5xl text-slate-400"
                animate={{
                  scale: isDragOver ? 1.1 : 1,
                  color: isDragOver ? '#3b82f6' : '#94a3b8'
                }}
                transition={{ duration: 0.2 }}
              >
                <Upload size={40} className="drop-shadow-md" />
              </motion.div>

              <div className="text-sm text-center space-y-2">
                <p className="text-slate-500 font-medium">Drop files here or</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/80 hover:bg-blue-600/90 text-white rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg backdrop-blur-sm">
                  <FileText size={16} />
                  <span className="font-medium">Browse Files</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    multiple={false}
                  />
                </label>
              </div>

              <div className="w-full px-4">
                <div className="relative">
                  <textarea
                    placeholder="...or start typing/speaking something amazing (Press Enter to confirm)"
                    value={textInputValue}
                    className="w-full h-20 p-4 text-sm bg-white/50 border border-white/50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 backdrop-blur-sm transition-all duration-200 placeholder-slate-400"
                    onChange={handleTextChange}
                    onKeyPress={handleTextKeyPress}
                  />
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    {speechSupported && (
                      <motion.button
                        onClick={isListening ? stopListening : startListening}
                        title={isListening ? "Stop listening" : "Start voice input"}
                        className={`relative group transition-all duration-200 p-1.5 rounded-lg ${
                          isListening
                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                            : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50/50'
                        }`}
                        animate={{
                          scale: isListening ? [1, 1.1, 1] : 1,
                          boxShadow: isListening ? [
                            '0 0 0 0 rgba(239, 68, 68, 0.7)',
                            '0 0 0 10px rgba(239, 68, 68, 0)',
                            '0 0 0 0 rgba(239, 68, 68, 0)'
                          ] : '0 0 0 0 rgba(239, 68, 68, 0)'
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: isListening ? Infinity : 0,
                          ease: "easeInOut"
                        }}
                      >
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                          {isListening ? "Stop listening" : "Start voice input"}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                        </div>
                      </motion.button>
                    )}
                    <div className="text-xs text-slate-400">
                      <Type size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Image size={16} className="text-green-600" />
                <span className="text-xs font-medium">Image</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Processing Status Icons */}
                {getProcessingStatusIcons().map((statusIcon, index) => (
                  <motion.button
                    key={statusIcon.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={statusIcon.action}
                    title={statusIcon.title}
                    className={`relative group ${statusIcon.color} hover:bg-slate-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 ${statusIcon.pulse ? 'animate-pulse' : ''}`}
                  >
                    {React.createElement(statusIcon.icon === 'Brain' ? Brain :
                                        statusIcon.icon === 'Check' ? Check :
                                        statusIcon.icon === 'X' ? X :
                                        statusIcon.icon === 'Upload' ? Upload :
                                        statusIcon.icon === 'Sparkles' ? Sparkles :
                                        statusIcon.icon === 'Clock' ? Clock :
                                        statusIcon.icon === 'Timer' ? Timer :
                                        statusIcon.icon === 'Cpu' ? Cpu :
                                        statusIcon.icon === 'CheckCircle' ? CheckCircle :
                                        statusIcon.icon === 'XCircle' ? XCircle :
                                        statusIcon.icon === 'Link' ? Link :
                                        statusIcon.icon === 'Link2' ? Link :
                                        statusIcon.icon === 'Merge' ? Merge :
                                        statusIcon.icon === 'CheckCircle2' ? CheckCircle2 :
                                        statusIcon.icon === 'AlertTriangle' ? AlertTriangle :
                                        HelpCircle, { size: 14 })}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {statusIcon.title}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                    </div>
                  </motion.button>
                ))}

                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Drag to connect units"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Drag to connect
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>

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
              {/* Left side - Image Preview */}
              <div className="w-2/3 bg-slate-50 rounded border-2 border-dashed border-slate-200 flex items-center justify-center">
                {fileUrl && (
                  <img
                    src={fileUrl}
                    alt="Uploaded"
                    className="max-w-full max-h-full object-contain rounded"
                  />
                )}
              </div>

              {/* Right side - Actions */}
              <div className="w-1/3 p-2">
                <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1">
                  <Grid3x3 size={12} className="text-blue-500" />
                  Actions
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {getActionsByType('image').map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={action.action}
                      title={action.label}
                      className="relative group flex flex-col items-center justify-center p-2 rounded-lg bg-white/60 hover:bg-blue-50/80 border border-white/50 hover:border-blue-200/50 transition-all duration-200 hover:scale-105 hover:shadow-md backdrop-blur-sm"
                    >
                      <action.icon size={16} className="text-slate-600 group-hover:text-blue-600 transition-colors mb-1" />
                      <span className="text-xs text-slate-500 group-hover:text-blue-700 font-medium">
                        {action.label}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                        {action.label}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <p>Name: {content?.name}</p>
                  <p>Size: {content ? (content.size / 1024).toFixed(1) : 0} KB</p>
                  <p>Type: {content?.type}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-xs font-medium">Text</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Processing Status Icons */}
                {getProcessingStatusIcons().map((statusIcon, index) => (
                  <motion.button
                    key={statusIcon.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={statusIcon.action}
                    title={statusIcon.title}
                    className={`relative group ${statusIcon.color} hover:bg-slate-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 ${statusIcon.pulse ? 'animate-pulse' : ''}`}
                  >
                    {React.createElement(statusIcon.icon === 'Brain' ? Brain :
                                        statusIcon.icon === 'Check' ? Check :
                                        statusIcon.icon === 'X' ? X :
                                        statusIcon.icon === 'Upload' ? Upload :
                                        statusIcon.icon === 'Sparkles' ? Sparkles :
                                        statusIcon.icon === 'Clock' ? Clock :
                                        statusIcon.icon === 'Timer' ? Timer :
                                        statusIcon.icon === 'Cpu' ? Cpu :
                                        statusIcon.icon === 'CheckCircle' ? CheckCircle :
                                        statusIcon.icon === 'XCircle' ? XCircle :
                                        statusIcon.icon === 'Link' ? Link :
                                        statusIcon.icon === 'Link2' ? Link :
                                        statusIcon.icon === 'Merge' ? Merge :
                                        statusIcon.icon === 'CheckCircle2' ? CheckCircle2 :
                                        statusIcon.icon === 'AlertTriangle' ? AlertTriangle :
                                        HelpCircle, { size: 14 })}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {statusIcon.title}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                    </div>
                  </motion.button>
                ))}

                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Drag to connect units"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Drag to connect
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>

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
              {/* Left side - Text Editor */}
              <div className="w-2/3 bg-slate-50 rounded p-2 overflow-auto">
                <textarea
                  value={content || ''}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-full resize-none border-none outline-none bg-transparent text-xs"
                  placeholder="Enter your text..."
                />
              </div>

              {/* Right side - Actions */}
              <div className="w-1/3 p-1">
                <div className="text-xs font-medium text-slate-600 mb-2">Actions</div>
                <div className="space-y-1">
                  {getActionsByType('text').map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={action.action}
                      className="w-full flex items-center space-x-2 p-1 rounded hover:bg-slate-100 transition-colors group"
                    >
                      <action.icon size={12} className="text-slate-600 group-hover:text-blue-600 transition-colors" />
                      <span className="text-xs text-slate-500 group-hover:text-slate-700">
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <p>Words: {content ? content.split(/\s+/).filter(w => w.length > 0).length : 0}</p>
                  <p>Characters: {content ? content.length : 0}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <FileX size={16} className="text-red-600" />
                <span className="text-xs font-medium">PDF Document</span>
                {pdfNumPages && (
                  <span className="text-xs text-slate-500">({pdfNumPages} pages)</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Processing Status Icons */}
                {getProcessingStatusIcons().map((statusIcon, index) => (
                  <motion.button
                    key={statusIcon.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={statusIcon.action}
                    title={statusIcon.title}
                    className={`relative group ${statusIcon.color} hover:bg-slate-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 ${statusIcon.pulse ? 'animate-pulse' : ''}`}
                  >
                    {React.createElement(statusIcon.icon === 'Brain' ? Brain :
                                        statusIcon.icon === 'Check' ? Check :
                                        statusIcon.icon === 'X' ? X :
                                        statusIcon.icon === 'Upload' ? Upload :
                                        statusIcon.icon === 'Sparkles' ? Sparkles :
                                        statusIcon.icon === 'Clock' ? Clock :
                                        statusIcon.icon === 'Timer' ? Timer :
                                        statusIcon.icon === 'Cpu' ? Cpu :
                                        statusIcon.icon === 'CheckCircle' ? CheckCircle :
                                        statusIcon.icon === 'XCircle' ? XCircle :
                                        statusIcon.icon === 'Link' ? Link :
                                        statusIcon.icon === 'Link2' ? Link :
                                        statusIcon.icon === 'Merge' ? Merge :
                                        statusIcon.icon === 'CheckCircle2' ? CheckCircle2 :
                                        statusIcon.icon === 'AlertTriangle' ? AlertTriangle :
                                        HelpCircle, { size: 14 })}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {statusIcon.title}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                    </div>
                  </motion.button>
                ))}

                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Drag to connect units"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Drag to connect
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>

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
              {/* Left side - PDF Thumbnail */}
              <div className="w-1/2 bg-slate-50 rounded border-2 border-dashed border-slate-200 flex items-center justify-center">
                {fileUrl && (
                  <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="max-w-full max-h-full"
                  >
                    <Page
                      pageNumber={pdfPageNumber}
                      width={120}
                      className="shadow-sm"
                    />
                  </Document>
                )}
              </div>

              {/* Right side - Actions */}
              <div className="w-1/2 p-2">
                <div className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-1">
                  <FileText size={12} className="text-red-500" />
                  Actions
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {getActionsByType('pdf').map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={action.action}
                      title={action.label}
                      className="relative group flex flex-col items-center justify-center p-2 rounded-lg bg-white/60 hover:bg-red-50/80 border border-white/50 hover:border-red-200/50 transition-all duration-200 hover:scale-105 hover:shadow-md backdrop-blur-sm"
                    >
                      <action.icon size={14} className="text-slate-600 group-hover:text-red-600 transition-colors mb-1" />
                      <span className="text-xs text-slate-500 group-hover:text-red-700 font-medium">
                        {action.label}
                      </span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                        {action.label}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                  <p>Name: {content?.name}</p>
                  <p>Size: {content ? (content.size / 1024).toFixed(1) : 0} KB</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Table size={16} className="text-purple-600" />
                <span className="text-xs font-medium">Table</span>
              </div>
              <div className="flex items-center gap-1">
                {/* Processing Status Icons */}
                {getProcessingStatusIcons().map((statusIcon, index) => (
                  <motion.button
                    key={statusIcon.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={statusIcon.action}
                    title={statusIcon.title}
                    className={`relative group ${statusIcon.color} hover:bg-slate-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 ${statusIcon.pulse ? 'animate-pulse' : ''}`}
                  >
                    {React.createElement(statusIcon.icon === 'Brain' ? Brain :
                                        statusIcon.icon === 'Check' ? Check :
                                        statusIcon.icon === 'X' ? X :
                                        statusIcon.icon === 'Upload' ? Upload :
                                        statusIcon.icon === 'Sparkles' ? Sparkles :
                                        statusIcon.icon === 'Clock' ? Clock :
                                        statusIcon.icon === 'Timer' ? Timer :
                                        statusIcon.icon === 'Cpu' ? Cpu :
                                        statusIcon.icon === 'CheckCircle' ? CheckCircle :
                                        statusIcon.icon === 'XCircle' ? XCircle :
                                        statusIcon.icon === 'Link' ? Link :
                                        statusIcon.icon === 'Link2' ? Link :
                                        statusIcon.icon === 'Merge' ? Merge :
                                        statusIcon.icon === 'CheckCircle2' ? CheckCircle2 :
                                        statusIcon.icon === 'AlertTriangle' ? AlertTriangle :
                                        HelpCircle, { size: 14 })}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {statusIcon.title}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                    </div>
                  </motion.button>
                ))}

                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Drag to connect units"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Drag to connect
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>

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
            <div className="flex gap-2 h-full">
              {/* Left side - Content */}
              <div className="w-2/3 bg-slate-50 rounded p-2 overflow-auto">
                {content instanceof File ? (
                  <div className="text-xs text-slate-600">
                    <p>File: {content.name}</p>
                    <p>Type: Spreadsheet</p>
                    <p>Size: {(content.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="text-xs font-mono whitespace-pre-wrap">{content}</div>
                )}
              </div>

              {/* Right side - Actions */}
              <div className="w-1/3 p-1">
                <div className="text-xs font-medium text-slate-600 mb-2">Actions</div>
                <div className="space-y-1">
                  {getActionsByType('table').map((action, index) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={action.action}
                      className="w-full flex items-center space-x-2 p-1 rounded hover:bg-slate-100 transition-colors group"
                    >
                      <action.icon size={12} className="text-slate-600 group-hover:text-purple-600 transition-colors" />
                      <span className="text-xs text-slate-500 group-hover:text-slate-700">
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
                {/* Processing Status Icons */}
                {getProcessingStatusIcons().map((statusIcon, index) => (
                  <motion.button
                    key={statusIcon.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={statusIcon.action}
                    title={statusIcon.title}
                    className={`relative group ${statusIcon.color} hover:bg-slate-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 ${statusIcon.pulse ? 'animate-pulse' : ''}`}
                  >
                    {React.createElement(statusIcon.icon === 'Brain' ? Brain :
                                        statusIcon.icon === 'Check' ? Check :
                                        statusIcon.icon === 'X' ? X :
                                        statusIcon.icon === 'Upload' ? Upload :
                                        statusIcon.icon === 'Sparkles' ? Sparkles :
                                        statusIcon.icon === 'Clock' ? Clock :
                                        statusIcon.icon === 'Timer' ? Timer :
                                        statusIcon.icon === 'Cpu' ? Cpu :
                                        statusIcon.icon === 'CheckCircle' ? CheckCircle :
                                        statusIcon.icon === 'XCircle' ? XCircle :
                                        statusIcon.icon === 'Link' ? Link :
                                        statusIcon.icon === 'Link2' ? Link :
                                        statusIcon.icon === 'Merge' ? Merge :
                                        statusIcon.icon === 'CheckCircle2' ? CheckCircle2 :
                                        statusIcon.icon === 'AlertTriangle' ? AlertTriangle :
                                        HelpCircle, { size: 14 })}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {statusIcon.title}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                    </div>
                  </motion.button>
                ))}

                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Drag to connect units"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Drag to connect
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>

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
                {/* Processing Status Icons */}
                {getProcessingStatusIcons().map((statusIcon, index) => (
                  <motion.button
                    key={statusIcon.key}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={statusIcon.action}
                    title={statusIcon.title}
                    className={`relative group ${statusIcon.color} hover:bg-slate-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 ${statusIcon.pulse ? 'animate-pulse' : ''}`}
                  >
                    {React.createElement(statusIcon.icon === 'Brain' ? Brain :
                                        statusIcon.icon === 'Check' ? Check :
                                        statusIcon.icon === 'X' ? X :
                                        statusIcon.icon === 'Upload' ? Upload :
                                        statusIcon.icon === 'Sparkles' ? Sparkles :
                                        statusIcon.icon === 'Clock' ? Clock :
                                        statusIcon.icon === 'Timer' ? Timer :
                                        statusIcon.icon === 'Cpu' ? Cpu :
                                        statusIcon.icon === 'CheckCircle' ? CheckCircle :
                                        statusIcon.icon === 'XCircle' ? XCircle :
                                        statusIcon.icon === 'Link' ? Link :
                                        statusIcon.icon === 'Link2' ? Link :
                                        statusIcon.icon === 'Merge' ? Merge :
                                        statusIcon.icon === 'CheckCircle2' ? CheckCircle2 :
                                        statusIcon.icon === 'AlertTriangle' ? AlertTriangle :
                                        HelpCircle, { size: 14 })}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                      {statusIcon.title}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                    </div>
                  </motion.button>
                ))}

                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Drag to connect units"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110 cursor-grab active:cursor-grabbing"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Drag to connect
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-2 border-transparent border-t-slate-800"></div>
                  </div>
                </button>

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
        onDragLeave={handleUnitDropLeave}
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
            ↔ Unit {connectedToUnit}
          </motion.div>
        )}
      </motion.div>

      {/* AI Reasoning Overlay */}
      <AnimatePresence>
        {reasoningState.isActive && (
          <ReasoningOverlay
            isActive={reasoningState.isActive}
            reasoningData={reasoningState}
            onCancel={cancelReasoningProcess}
            position="absolute"
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Connected Container Component for linked Units
const ConnectedContainer = ({
  sourceUnit,
  targetUnit,
  connectionColor,
  onDisconnect,
  children
}) => {
  return (
    <motion.div
      className="relative bg-white/50 backdrop-blur-sm rounded-xl border-2 p-4"
      style={{
        borderColor: connectionColor,
        boxShadow: `0 0 30px ${connectionColor}40, 0 0 60px ${connectionColor}20`
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1,
        boxShadow: [
          `0 0 30px ${connectionColor}40, 0 0 60px ${connectionColor}20`,
          `0 0 40px ${connectionColor}60, 0 0 80px ${connectionColor}30`,
          `0 0 30px ${connectionColor}40, 0 0 60px ${connectionColor}20`
        ]
      }}
      transition={{
        scale: { duration: 0.3 },
        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }}
      layout
    >
      {/* Connection Bridge */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-1 z-0"
        style={{
          background: `linear-gradient(90deg, ${connectionColor}60, ${connectionColor}80, ${connectionColor}60)`,
          width: 'calc(100% - 2rem)',
          boxShadow: `0 0 10px ${connectionColor}60`
        }}
      />

      {/* Container Header */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/80 rounded-full px-3 py-1 text-xs font-medium z-10">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: connectionColor }}
        />
        <span className="text-slate-600">
          Units {sourceUnit.id} ↔ {targetUnit.id}
        </span>
        <button
          onClick={onDisconnect}
          className="ml-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-1"
          title="Disconnect units"
        >
          <X size={12} />
        </button>
      </div>

      {/* Unit Grid */}
      <div className="grid grid-cols-2 gap-4 relative z-10 mt-6">
        {children}
      </div>

      {/* Connection Status */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-slate-500 bg-white/60 rounded px-2 py-1">
        Connected • Ready for processing
      </div>
    </motion.div>
  );
};

export default Unit;
export { ConnectedContainer };