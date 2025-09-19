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
import { getStatusIcon, canProcessContent } from '../../utils/helpers';
import aiCallService from '../../services/aiCallService';
import { pdfjs } from 'react-pdf';
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
  const [imageAnnotations, setImageAnnotations] = useState({ circles: [] });
  // DnD state via hook
  const { isDragOver, setIsDragOver, handleDrop, handleDragOver, handleDragLeave, handleUnitDropTarget } = useDnd((input) => morphUnit(input));
  // PDF state via hook
  const { pdfNumPages, setPdfNumPages, pdfPageNumber, setPdfPageNumber, onDocumentLoadSuccess } = usePdf();
  const [fileUrl, setFileUrl] = useState(null);
  // Text input + detection via hook (bind onInput->morphUnit)
  const { textInputValue, setTextInputValue, detectInputType, handleFileChange, handleTextChange, handleTextKeyPress } = useUnitContent((input) => morphUnit(input));
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

  // Multiphase dynamic action states
  const [unitGlowState, setUnitGlowState] = useState('idle'); // idle, activated, processing, thinking, completed, error
  const [dynamicButtonStates, setDynamicButtonStates] = useState({});
  const [activeOperation, setActiveOperation] = useState(null);
  const [thinkingTokens, setThinkingTokens] = useState([]);

  // AI Reasoning state via hook (declared after setProcessingStatus below)

  // Store user input for reasoning overlay
  const [userInputForReasoning, setUserInputForReasoning] = useState('');

  // Get persistent user prompt from settings
  const [persistentUserPrompt, setPersistentUserPrompt] = useState('');

  // Unit dimensions and position for overlay positioning
  const [unitBounds, setUnitBounds] = useState(null);

  // Processing status for multiple status icons
  const [processingStatus, setProcessingStatus] = useState({
    upload: STATUS_TYPES.UPLOAD.EMPTY,
    processing: STATUS_TYPES.PROCESSING.NOT_PROCESSED,
    connection: STATUS_TYPES.CONNECTION.DISCONNECTED,
    hasProcessedContent: false
  });

  const recognitionRef = useRef(null);
  const unitRef = useRef(null);
  // Reasoning hook
  const { reasoningState, setReasoningState, startReasoningProcess: _startReasoningWithArgs, cancelReasoningProcess } = useReasoning({ id, setProcessingStatus });

  // Multiphase button state management
  const setButtonState = useCallback((buttonLabel, phase) => {
    setDynamicButtonStates(prev => ({
      ...prev,
      [buttonLabel]: phase
    }));
  }, []);

  const resetAllButtonStates = useCallback(() => {
    setDynamicButtonStates({});
    setUnitGlowState('idle');
    setActiveOperation(null);
    setThinkingTokens([]);
  }, []);

  // Handle dynamic action with multiphase workflow
  const handleDynamicAction = useCallback(async (action) => {
    try {
      // PHASE 1: Activation and Unit glow
      setButtonState(action.label, 'activated');
      setUnitGlowState('activated');
      setActiveOperation(action.label);

      // Brief delay to show activation
      await new Promise(resolve => setTimeout(resolve, 300));

      // PHASE 2: Processing
      setButtonState(action.label, 'processing');
      setUnitGlowState('processing');

      // Execute original action
      if (action.action) {
        await action.action();
      }

      // PHASE 3: Thinking (will be handled by overlay component)
      setButtonState(action.label, 'thinking');
      setUnitGlowState('thinking');

      // Check if this is an AI processing action
      if (action.label === 'Process AI' || action.label.includes('AI')) {
        try {
          // Use the selected model for AI calls
          const unitData = {
            type: unitType,
            content: content,
            fileUrl: fileUrl
          };

          const response = await aiCallService.makeUnitCall(unitData, userInputForReasoning);

          // Update processing status
          setProcessingStatus(prev => ({
            ...prev,
            processing: STATUS_TYPES.PROCESSING.PROCESSED,
            hasProcessedContent: true
          }));

          console.log('AI Response:', response);

          setButtonState(action.label, 'completed');
          setUnitGlowState('completed');
        } catch (error) {
          console.error('AI processing error:', error);
          setButtonState(action.label, 'error');
          setUnitGlowState('error');
        }
      } else {
        // Simulate completion for non-AI actions
        setTimeout(() => {
          setButtonState(action.label, 'completed');
          setUnitGlowState('completed');
        }, 1500);
      }

      // Return to idle after showing completion
      setTimeout(() => {
        resetAllButtonStates();
      }, 2000);

    } catch (error) {
      console.error('Dynamic action error:', error);
      setButtonState(action.label, 'error');
      setUnitGlowState('error');

      // Reset after error display
      setTimeout(() => {
        resetAllButtonStates();
      }, 2000);
    }
  }, [setButtonState, resetAllButtonStates]);

  

  // detectInputType provided by useUnitContent

  

  // Auto-start flag to trigger reasoning after state updates
  const [autoStartReasoning, setAutoStartReasoning] = useState(false);

  const morphUnit = useCallback((input) => {
    const detectedType = detectInputType(input);
    setUnitType(detectedType);
    setContent(input);

    // Store input for reasoning overlay, combining with persistent prompt
    const combineWithPersistentPrompt = (inputText) => {
      if (persistentUserPrompt.trim()) {
        return `${persistentUserPrompt.trim()}\n\n${inputText}`;
      }
      return inputText;
    };

    if (typeof input === 'string') {
      setUserInputForReasoning(combineWithPersistentPrompt(input));
    } else if (input && input.name) {
      setUserInputForReasoning(combineWithPersistentPrompt(`File upload: ${input.name}`));
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

    // Emit event for dynamic icon system when unit has processable content
    if (canProcessContent(detectedType, input)) {
      window.dispatchEvent(new CustomEvent('unit-processed', {
        detail: {
          unitId: id,
          unitType: detectedType,
          content: input,
          hasProcessedContent: true
        }
      }));
    }

    // No longer auto-trigger reasoning - will be triggered manually via icon buttons

    onContentChange?.(id, detectedType, input);
  }, [detectInputType, id, onContentChange, persistentUserPrompt]);

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
      connection: STATUS_TYPES.CONNECTION.DISCONNECTED,
      hasProcessedContent: false
    });

    // Emit unit reset event for dynamic icon system
    window.dispatchEvent(new CustomEvent('unit-reset', {
      detail: { unitId: id }
    }));

    onContentChange?.(id, 'empty', null);
  }, [id, onContentChange, fileUrl, reasoningState.isActive, cancelReasoningProcess]);

  // AI Reasoning Management: wrapper that binds current unitType/content
  const startReasoningProcess = useCallback(() => {
    _startReasoningWithArgs(unitType, content);
  }, [_startReasoningWithArgs, unitType, content]);

  // Manual reasoning trigger - expose function for external use
  const triggerReasoning = useCallback(() => {
    if (canProcessContent(unitType, content) && !reasoningState.isActive) {
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

      startReasoningProcess();
    }
  }, [unitType, content, reasoningState.isActive, startReasoningProcess]);

  // Listen for image editor updates to capture circle annotations
  useEffect(() => {
    const handleImageAnnotationUpdate = (event) => {
      const { unitId, circles } = event.detail;
      if (unitId === id) {
        setImageAnnotations({ circles });
      }
    };

    window.addEventListener('unit-image-annotations-updated', handleImageAnnotationUpdate);
    return () => window.removeEventListener('unit-image-annotations-updated', handleImageAnnotationUpdate);
  }, [id]);

  // Listen for requests for unit data (for combined processing)
  useEffect(() => {
    const handleGetUnitData = (event) => {
      const { requestId, unitIds } = event.detail;
      console.log(`📨 Unit ${id} received data request for units: ${unitIds.join(', ')}`);
      console.log(`📨 Unit ${id} comparing: id=${id} (${typeof id}), unitIds=${JSON.stringify(unitIds)} (${unitIds.map(u => typeof u).join(', ')})`);

      // Convert both to numbers for comparison
      const numericId = Number(id);
      const numericUnitIds = unitIds.map(u => Number(u));

      if (numericUnitIds.includes(numericId)) {
        const responseData = {
          type: unitType,
          content: content,
          fileUrl: fileUrl,
          annotations: imageAnnotations
        };
        console.log(`📤 Unit ${id} sending response:`, responseData);
        window.dispatchEvent(new CustomEvent('unit-data-response', {
          detail: {
            requestId,
            unitId: numericId, // Use numeric ID for consistency
            data: responseData
          }
        }));
      } else {
        console.log(`🚫 Unit ${id} not in request list (numeric: ${numericId} not in ${numericUnitIds.join(', ')}), ignoring`);
      }
    };

    window.addEventListener('unit-data-request', handleGetUnitData);
    return () => window.removeEventListener('unit-data-request', handleGetUnitData);
  }, [id, unitType, content, fileUrl, imageAnnotations]);

  // Listen for manual reasoning trigger events and unit focus
  useEffect(() => {
    const handleTriggerReasoning = (event) => {
      const { unitId, useSelectedModel, modelConfig } = event.detail;
      if (unitId === id) {
        if (useSelectedModel && modelConfig) {
          console.log(`Unit ${id} using selected model:`, modelConfig.modelId);
        }
        // Emit reasoning started event
        window.dispatchEvent(new CustomEvent('reasoning-started', {
          detail: { unitId: id }
        }));
        triggerReasoning();
      }
    };

    const handleTriggerCombinedReasoning = (event) => {
      const { unitIds, useSelectedModel, modelConfig } = event.detail;
      if (unitIds.includes(id)) {
        if (useSelectedModel && modelConfig) {
          console.log(`Unit ${id} part of combined reasoning using model:`, modelConfig.modelId);
        }
        // For combined reasoning, show a different overlay or trigger different logic
        console.log(`Unit ${id} is part of combined reasoning with units:`, unitIds);
        window.dispatchEvent(new CustomEvent('reasoning-started', {
          detail: { unitId: id }
        }));
        triggerReasoning(); // For now, trigger individual reasoning
      }
    };

    const handleFocusUnit = (event) => {
      const { unitId } = event.detail;
      if (unitId === id && unitRef.current) {
        // Add focused styling
        setUnitGlowState('activated');
        setTimeout(() => setUnitGlowState('idle'), 2000);

        // Scroll into view
        unitRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    };

    window.addEventListener('trigger-unit-reasoning', handleTriggerReasoning);
    window.addEventListener('trigger-combined-reasoning', handleTriggerCombinedReasoning);
    window.addEventListener('focus-unit', handleFocusUnit);

    return () => {
      window.removeEventListener('trigger-unit-reasoning', handleTriggerReasoning);
      window.removeEventListener('trigger-combined-reasoning', handleTriggerCombinedReasoning);
      window.removeEventListener('focus-unit', handleFocusUnit);
    };
  }, [id, triggerReasoning]);

  // cancelReasoningProcess provided by hook


  // DnD and text handlers are provided via hooks (useDnd/useUnitContent)


  

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

  // Load unit user prompt from settings
  useEffect(() => {
    const loadSettings = () => {
      try {
        const settings = localStorage.getItem('llm-settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          setPersistentUserPrompt(parsed.unitUserPrompt || '');
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    };

    // Load settings on component mount
    loadSettings();

    // Listen for settings updates
    const handleSettingsUpdate = (event) => {
      const { unitUserPrompt } = event.detail;
      setPersistentUserPrompt(unitUserPrompt || '');
    };

    window.addEventListener('llm-settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('llm-settings-updated', handleSettingsUpdate);
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

  const getActionsByType = (type) => {
    // Create dynamic action wrapper
    const createDynamicAction = (label, originalAction) => ({
      ...originalAction,
      action: () => handleDynamicAction({ label, action: originalAction.action })
    });

    const baseActions = {
      pdf: [
        { icon: Eye, label: 'View', action: () => console.log('View PDF') },
        createDynamicAction('Download', { icon: Download, action: () => console.log('Download PDF') }),
        createDynamicAction('Split', { icon: Scissors, action: () => console.log('Split PDF') }),
        createDynamicAction('Extract', { icon: Copy, action: () => console.log('Extract Text') }),
        { icon: Search, label: 'Search', action: () => console.log('Search PDF') },
        { icon: Printer, label: 'Print', action: () => console.log('Print PDF') }
      ],
      image: [
        { icon: Eye, label: 'View', action: () => console.log('View Image') },
        { icon: Crop, label: 'Crop', action: () => console.log('Crop Image') },
        { icon: Filter, label: 'Filter', action: () => console.log('Filter Image') },
        { icon: Palette, label: 'Edit', action: () => console.log('Edit Image') },
        createDynamicAction('Download', { icon: Download, action: () => console.log('Download Image') }),
        createDynamicAction('Share', { icon: Share2, action: () => console.log('Share Image') })
      ],
      text: [
        { icon: Edit3, label: 'Clear', action: () => setContent('') },
        { icon: Bold, label: 'Upper', action: () => setContent(content?.toUpperCase() || '') },
        {
          icon: Copy,
          label: 'Copy',
          action: () => {
            if (content && navigator.clipboard) {
              navigator.clipboard.writeText(content);
              // Visual feedback for copy action
              setUnitGlowState('completed');
              setTimeout(() => setUnitGlowState('idle'), 1000);
            }
          }
        },
        createDynamicAction('Export', { icon: Download, action: () => {
          if (content) {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'text-export.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        }}),
        {
          icon: Search,
          label: 'Count',
          action: () => {
            const words = content ? content.split(/\s+/).filter(w => w.length > 0).length : 0;
            const chars = content ? content.length : 0;
            // Show count with visual feedback
            setUnitGlowState('activated');
            alert(`📊 Text Stats\n\nWords: ${words}\nCharacters: ${chars}`);
            setTimeout(() => setUnitGlowState('idle'), 1500);
          }
        },
        {
          icon: Type,
          label: 'Lower',
          action: () => setContent(content?.toLowerCase() || '')
        },
        {
          icon: Sparkles,
          label: 'Clean',
          action: () => {
            // Clean text: trim whitespace, remove extra spaces
            const cleaned = content?.replace(/\s+/g, ' ').trim() || '';
            setContent(cleaned);
            setUnitGlowState('completed');
            setTimeout(() => setUnitGlowState('idle'), 1000);
          }
        }
      ],
      table: [
        { icon: Eye, label: 'View', action: () => console.log('View Table') },
        createDynamicAction('Analyze', { icon: FileBarChart, action: () => console.log('Analyze Data') }),
        createDynamicAction('Export', { icon: Download, action: () => console.log('Export Table') }),
        { icon: Edit3, label: 'Edit', action: () => console.log('Edit Table') }
      ],
      dwg: [
        { icon: Eye, label: 'View', action: () => console.log('View DWG') },
        { icon: Layers, label: 'Layers', action: () => console.log('Toggle Layers') },
        { icon: Ruler, label: 'Measure', action: () => console.log('Measure') },
        createDynamicAction('Export', { icon: Download, action: () => console.log('Export DWG') })
      ]
    };

    // Add AI processing actions for processable content types
    const processingActions = [];

    if (canProcessContent(type, content)) {
      // Process action
      if (processingStatus.processing === STATUS_TYPES.PROCESSING.NOT_PROCESSED) {
        processingActions.push(createDynamicAction('Process AI', {
          icon: Brain,
          action: startReasoningProcess,
          className: 'text-purple-600 hover:text-purple-700'
        }));
      } else if (processingStatus.processing === STATUS_TYPES.PROCESSING.REASONING) {
        processingActions.push({
          icon: X,
          label: 'Cancel',
          action: cancelReasoningProcess,
          className: 'text-orange-600 hover:text-orange-700'
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
                resetUnit,
                onConnectionDragStart: handleConnectionDragStart,
                setContent,
                setFileUrl,
                dynamicButtonStates,
                unitId: id
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
                resetUnit,
                onConnectionDragStart: handleConnectionDragStart
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
                content,
                onConnectionDragStart: handleConnectionDragStart
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
                resetUnit,
                onConnectionDragStart: handleConnectionDragStart
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
                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Connect Unit"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Connect Unit
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
                {/* Connection Button */}
                <button
                  onMouseDown={handleConnectionDragStart}
                  title="Connect Unit"
                  className="relative group text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg p-1.5 transition-all duration-200 hover:scale-110"
                >
                  <Link size={14} />

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                    Connect Unit
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
        className={`unit-container relative overflow-hidden ${
          // Expansion logic for editing modes
          'w-full h-full'
        } rounded border-2 p-4 mx-2 mb-2 transition-all duration-300 cursor-grab active:cursor-grabbing flex-shrink-0 ${
          // Unit glow states override other states
          unitGlowState === 'activated' ? 'unit-activated' :
          unitGlowState === 'processing' ? 'unit-processing' :
          unitGlowState === 'thinking' ? 'unit-thinking' :
          unitGlowState === 'completed' ? 'unit-completed' :
          unitGlowState === 'error' ? 'unit-error' :
          // Default states
          isInConnectedContainer
            ? 'border-slate-200 bg-yellow-50 shadow-sm'
            : isConnectedUnit && connectionColor
              ? `border-2 bg-yellow-50 shadow-lg`
              : isDragOver
                ? 'border-blue-400 bg-blue-50'
                : unitType === 'empty'
                  ? 'border-dashed border-slate-300 bg-gray-50'
                  : 'border-slate-200 bg-gray-50 shadow-sm'
        }`}
        style={{
          // Accent color per unit (A/B/C/D)
          borderLeftWidth: '6px',
          borderLeftColor: (!isInConnectedContainer && isConnectedUnit && connectionColor)
            ? connectionColor
            : ({1:'#3b82f6',2:'#22c55e',3:'#a855f7',4:'#f59e0b'}[id] || '#94a3b8'),
          borderColor: !isInConnectedContainer && isConnectedUnit && connectionColor ? connectionColor : undefined,
          borderWidth: !isInConnectedContainer && isConnectedUnit && connectionColor ? '3px' : undefined,
          boxShadow: !isInConnectedContainer && isConnectedUnit && connectionColor
            ? `0 0 40px ${connectionColor}90, 0 0 80px ${connectionColor}60, 0 0 120px ${connectionColor}30, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
            : undefined
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDragEnter={handleUnitDropTarget}
        layout
        animate={!isInConnectedContainer && isConnectedUnit && connectionColor ? {
          boxShadow: [
            `0 0 40px ${connectionColor}90, 0 0 80px ${connectionColor}60, 0 0 120px ${connectionColor}30, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
            `0 0 60px ${connectionColor}95, 0 0 120px ${connectionColor}70, 0 0 160px ${connectionColor}40, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
            `0 0 40px ${connectionColor}90, 0 0 80px ${connectionColor}60, 0 0 120px ${connectionColor}30, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
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
            className="h-full flex flex-col min-h-0"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>

        {/* Corner Label (A/B/C/D) */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold rounded-full text-white select-none"
          style={{
            backgroundColor: ({1:'#3b82f6',2:'#22c55e',3:'#a855f7',4:'#f59e0b'}[id] || '#64748b')
          }}
        >
          {{1:'A',2:'B',3:'C',4:'D'}[id] || id}
        </div>


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
            readOnlyMode={reasoningState.status === 'completed' && reasoningState.result}
            result={reasoningState.result}
            onDoubleClick={() => {
              // Double-click to dismiss and show only unit quick data
              cancelReasoningProcess();
              setUnitBounds(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Unit;
