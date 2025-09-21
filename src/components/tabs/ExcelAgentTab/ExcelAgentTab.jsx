import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  Upload,
  Bot,
  Send,
  Download,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Zap,
  FileDown
} from 'lucide-react';

const ExcelAgentTab = ({ isOpen, onClose }) => {
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [selection, setSelection] = useState(null);

  // Agent state
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [actions, setActions] = useState([]);
  const [executionLog, setExecutionLog] = useState([]);
  const [diff, setDiff] = useState(null);

  // Streaming state
  const [streamingStatus, setStreamingStatus] = useState('');
  const [narratorEvents, setNarratorEvents] = useState([]);
  const eventSourceRef = useRef(null);

  // File upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize session
  const initializeSession = useCallback(async () => {
    try {
      const response = await fetch('/api/excel/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to create session');

      const { sessionId } = await response.json();
      setSessionId(sessionId);

      // Set up SSE connection
      setupEventStream(sessionId);

      console.log('✅ Excel Agent session initialized:', sessionId);
    } catch (error) {
      console.error('L Failed to initialize session:', error);
    }
  }, []);

  // Set up Server-Sent Events for real-time updates
  const setupEventStream = useCallback((sessionId) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/excel/stream/${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'status':
          setStreamingStatus(data.message);
          break;
        case 'finding':
          setNarratorEvents(prev => [...prev, { type: 'finding', message: data.message, timestamp: Date.now() }]);
          break;
        case 'result':
          setNarratorEvents(prev => [...prev, { type: 'result', message: data.message, diff: data.diff, timestamp: Date.now() }]);
          setDiff(data.diff);
          setIsProcessing(false);
          break;
        case 'ask':
          setNarratorEvents(prev => [...prev, { type: 'ask', message: data.message, timestamp: Date.now() }]);
          break;
        case 'error':
          setNarratorEvents(prev => [...prev, { type: 'error', message: data.message, timestamp: Date.now() }]);
          setIsProcessing(false);
          break;
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file) => {
    if (!sessionId || !file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/excel/open`, {
        method: 'POST',
        headers: {
          'X-Session-Id': sessionId
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload file');

      const result = await response.json();
      setWorkbook(result.workbook);

      // Get sheets list
      await loadSheets();

      console.log(' Excel file uploaded successfully');
    } catch (error) {
      console.error('L File upload failed:', error);
    }
  }, [sessionId]);

  // Load sheets from workbook
  const loadSheets = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/excel/sheets?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to load sheets');

      const { sheets } = await response.json();
      setSheets(sheets);
      if (sheets.length > 0) {
        setActiveSheet(sheets[0].name);
      }
    } catch (error) {
      console.error('L Failed to load sheets:', error);
    }
  }, [sessionId]);

  // Process natural language prompt with LLM
  const processPrompt = useCallback(async () => {
    if (!prompt.trim() || !sessionId || isProcessing) return;

    setIsProcessing(true);
    setNarratorEvents([]);
    setStreamingStatus('Interpreting natural language...');

    try {
      // Get current selection preview for context
      const selectionPreview = selection ? await getSelectionPreview() : null;

      // Call LLM to convert prompt to actions
      const llmResponse = await fetch('/api/llm/excel-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          sessionId,
          activeSheet,
          selection: selectionPreview,
          context: {
            sheets: sheets.map(s => s.name),
            workbookInfo: workbook
          }
        })
      });

      if (!llmResponse.ok) throw new Error('LLM planning failed');

      const { actions: plannedActions } = await llmResponse.json();
      setActions(plannedActions);

      // Execute the planned actions
      setStreamingStatus('Executing spreadsheet operations...');

      const executeResponse = await fetch('/api/excel/ops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify({
          actions: plannedActions,
          dryRun: false,
          transactionId: `tx-${Date.now()}`
        })
      });

      if (!executeResponse.ok) throw new Error('Execution failed');

      const result = await executeResponse.json();

      setExecutionLog(prev => [...prev, {
        timestamp: Date.now(),
        prompt,
        actions: plannedActions,
        result,
        success: true
      }]);

      setPrompt(''); // Clear input after successful execution

    } catch (error) {
      console.error('L Prompt processing failed:', error);
      setNarratorEvents(prev => [...prev, {
        type: 'error',
        message: `Error: ${error.message}`,
        timestamp: Date.now()
      }]);
      setIsProcessing(false);
    }
  }, [prompt, sessionId, isProcessing, selection, activeSheet, sheets, workbook]);

  // Get selection preview for LLM context
  const getSelectionPreview = useCallback(async () => {
    if (!selection || !sessionId) return null;

    try {
      const response = await fetch(`/api/excel/range?sessionId=${sessionId}&sheet=${activeSheet}&range=${selection.range}`);
      if (!response.ok) return null;

      return await response.json();
    } catch (error) {
      console.error('Failed to get selection preview:', error);
      return null;
    }
  }, [selection, sessionId, activeSheet]);

  // Export workbook
  const exportWorkbook = useCallback(async (format = 'xlsx') => {
    console.log('🔄 Export attempt - sessionId:', sessionId, 'workbook:', !!workbook);

    if (!sessionId) {
      console.error('❌ No session ID available for export');
      alert('No session available. Please upload a file first.');
      return;
    }

    if (!workbook) {
      console.error('❌ No workbook loaded for export');
      alert('No Excel file loaded. Please upload a file first.');
      return;
    }

    try {
      console.log('📤 Attempting export with sessionId:', sessionId);

      const response = await fetch(`/api/excel/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, format })
      });

      console.log('📥 Export response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Export failed:', errorText);
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      console.log('📦 Export blob size:', blob.size, 'bytes');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exported_workbook_${new Date().getTime()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('✅ Export completed successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert(`Export failed: ${error.message}`);
    }
  }, [sessionId, workbook]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file =>
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls') ||
      file.name.endsWith('.csv')
    );

    if (excelFile) {
      handleFileUpload(excelFile);
    }
  }, [handleFileUpload]);

  // Initialize on mount
  useEffect(() => {
    if (isOpen && !sessionId) {
      initializeSession();
    }
  }, [isOpen, sessionId, initializeSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="fixed right-0 top-0 h-full w-1/2 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-purple-600" />
            <span className="text-lg font-semibold text-slate-800">Excel AI Agent</span>
            {sessionId && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                Session: {sessionId.slice(-8)}
              </span>
            )}
          </div>
          <button
            className="text-slate-400 hover:text-slate-600 text-xl"
            onClick={onClose}
          >
            
          </button>
        </div>

        {/* File Upload Section */}
        {!workbook && (
          <div className="p-4 border-b border-slate-200">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet size={48} className="mx-auto mb-3 text-slate-400" />
              <p className="text-sm text-slate-600 mb-2">
                Drop an Excel file or click to upload
              </p>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} className="inline mr-2" />
                Upload Excel File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          </div>
        )}

        {/* Workbook Info */}
        {workbook && (
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-green-600" />
                <span className="font-medium text-sm">{workbook.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('🔍 Debug - sessionId:', sessionId, 'workbook:', workbook);
                    alert(`Session: ${sessionId || 'None'}, Workbook: ${workbook ? 'Loaded' : 'None'}`);
                  }}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  Debug
                </button>
                <button
                  onClick={() => exportWorkbook()}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  <Download size={12} className="inline mr-1" />
                  Export
                </button>
              </div>
            </div>

            {sheets.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">Sheet:</span>
                <select
                  value={activeSheet || ''}
                  onChange={(e) => setActiveSheet(e.target.value)}
                  className="text-xs border border-slate-300 rounded px-2 py-1"
                >
                  {sheets.map(sheet => (
                    <option key={sheet.name} value={sheet.name}>
                      {sheet.name} ({sheet.rows}�{sheet.cols})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Natural Language Input */}
        <div className="p-4 border-b border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Natural Language Command
          </label>
          <div className="flex gap-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Make column A bold and increase font size to 14' or 'Insert a new row after row 5'"
              className="flex-1 p-3 border border-slate-300 rounded-lg text-sm resize-none h-20"
              disabled={isProcessing}
            />
            <button
              onClick={processPrompt}
              disabled={!prompt.trim() || isProcessing || !workbook}
              className={`px-4 py-2 rounded-lg text-white transition-colors ${
                isProcessing
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isProcessing ? (
                <Clock size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>

        {/* Status and Streaming */}
        {streamingStatus && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Clock size={14} className="animate-spin" />
              {streamingStatus}
            </div>
          </div>
        )}

        {/* Narrator Events */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {narratorEvents.map((event, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg border-l-4 ${
                  event.type === 'error'
                    ? 'bg-red-50 border-red-400 text-red-800'
                    : event.type === 'result'
                    ? 'bg-green-50 border-green-400 text-green-800'
                    : event.type === 'ask'
                    ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                    : 'bg-blue-50 border-blue-400 text-blue-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {event.type === 'error' && <AlertCircle size={16} className="mt-0.5" />}
                  {event.type === 'result' && <CheckCircle size={16} className="mt-0.5" />}
                  {event.type === 'finding' && <Eye size={16} className="mt-0.5" />}
                  {event.type === 'ask' && <Bot size={16} className="mt-0.5" />}

                  <div className="flex-1">
                    <p className="text-sm">{event.message}</p>
                    <span className="text-xs opacity-70">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {event.diff && (
                  <div className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded">
                    <strong>Changes:</strong> {event.diff.length} cells modified
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Log */}
        {executionLog.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 p-3 max-h-32 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-slate-600">Execution History</h4>
              {workbook && (
                <button
                  onClick={() => exportWorkbook()}
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 flex items-center gap-1"
                >
                  <FileDown size={12} />
                  Download Excel
                </button>
              )}
            </div>
            <div className="space-y-1">
              {executionLog.slice(-3).map((log, index) => (
                <div key={index} className="text-xs text-slate-600">
                  <span className="font-medium">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  : {log.prompt.slice(0, 50)}...
                  {log.success && <CheckCircle size={12} className="inline ml-1 text-green-600" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ExcelAgentTab;