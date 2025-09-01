/*
 * CHANGE: 2025-09-01 - Created AI File Processor tab component
 * WHY: Provide user interface for uploading files to OpenWebUI and LM Studio
 * IMPACT: Users can now upload documents directly from the app for AI processing
 * AUTHOR: Claude Code Assistant
 * SEARCH_TAGS: #ai-file-processing #file-upload #openwebui #lm-studio #tab-component
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Settings, CheckCircle, XCircle, AlertCircle, Loader, Trash2 } from 'lucide-react';
import aiIntegrationService from '../../../services/aiIntegrationService';

/*
 * CHUNK: AI File Processor Main Component
 * PURPOSE: Complete interface for uploading and processing files with AI services
 * DEPENDENCIES: aiIntegrationService, React hooks, Lucide icons
 * OUTPUTS: File upload interface with real-time progress tracking
 * COMPLEXITY: High - multiple services, progress tracking, configuration
 * REFACTOR_CANDIDATE: No - cohesive feature implementation
 */
const AIFileProcessor = () => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [config, setConfig] = useState({
    openWebUIApiKey: '',
    openWebUIUrl: 'http://localhost:8080',
    lmStudioUrl: 'http://10.39.35.136:1234',
    selectedService: 'lmstudio-raw'
  });
  const [showConfig, setShowConfig] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({});
  const fileInputRef = useRef(null);

  /*
   * CHUNK: Service Status Check
   * PURPOSE: Verify connectivity to AI services
   * DEPENDENCIES: aiIntegrationService.checkServiceHealth
   * OUTPUTS: Updates serviceStatus state
   * COMPLEXITY: Low - async service call
   */
  const checkServices = useCallback(async () => {
    try {
      // Apply current configuration
      aiIntegrationService.setOpenWebUIConfig(config.openWebUIApiKey, config.openWebUIUrl);
      aiIntegrationService.setLMStudioConfig(config.lmStudioUrl);
      
      const status = await aiIntegrationService.checkServiceHealth();
      setServiceStatus(status);
    } catch (error) {
      console.error('Failed to check service status:', error);
    }
  }, [config]);

  /*
   * CHUNK: File Selection Handler
   * PURPOSE: Handle file input and validation
   * DEPENDENCIES: HTML file input, file validation logic
   * OUTPUTS: Updates files state with selected files
   * COMPLEXITY: Medium - file validation and state management
   * BUG_PREVENTION: File size and type validation
   */
  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files);
    
    // Validate files
    const validFiles = selectedFiles.filter(file => {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      validFiles.forEach(file => {
        // Avoid duplicates
        if (!newFiles.find(f => f.name === file.name && f.size === file.size)) {
          newFiles.push({
            file,
            id: Date.now() + Math.random(),
            status: 'ready',
            progress: 0
          });
        }
      });
      return newFiles;
    });

    // Clear input for re-selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /*
   * CHUNK: File Removal
   * PURPOSE: Remove files from the upload queue
   * DEPENDENCIES: files state
   * OUTPUTS: Updated files array
   * COMPLEXITY: Low - array filtering
   */
  const removeFile = useCallback((fileId) => {
    setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
  }, []);

  /*
   * CHUNK: File Processing Handler
   * PURPOSE: Process all files with selected AI service
   * DEPENDENCIES: aiIntegrationService, files state, config
   * OUTPUTS: Updates results state with processing outcomes
   * COMPLEXITY: High - batch processing with progress tracking
   * PERFORMANCE_NOTE: Sequential processing to avoid overwhelming services
   */
  const processFiles = useCallback(async () => {
    if (files.length === 0) {
      alert('Please select files to process');
      return;
    }

    if (config.selectedService === 'openwebui' && !config.openWebUIApiKey) {
      alert('Please configure OpenWebUI API key in settings');
      setShowConfig(true);
      return;
    }

    setProcessing(true);
    setResults([]);

    // Apply current configuration
    aiIntegrationService.setOpenWebUIConfig(config.openWebUIApiKey, config.openWebUIUrl);
    aiIntegrationService.setLMStudioConfig(config.lmStudioUrl);

    try {
      const processedResults = [];

      for (let i = 0; i < files.length; i++) {
        const fileItem = files[i];
        
        // Update file status
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileItem.id 
              ? { ...f, status: 'processing', progress: 0 }
              : f
          )
        );

        try {
          let result;
          
          const onProgress = (progressData) => {
            setFiles(prevFiles => 
              prevFiles.map(f => 
                f.id === fileItem.id 
                  ? { 
                      ...f, 
                      status: progressData.status, 
                      progress: progressData.progress || f.progress 
                    }
                  : f
              )
            );
          };

          if (config.selectedService === 'openwebui') {
            result = await aiIntegrationService.uploadToOpenWebUI(fileItem.file, onProgress);
          } else if (config.selectedService === 'lmstudio-raw') {
            result = await aiIntegrationService.uploadRawToLMStudio(fileItem.file, onProgress);
          } else {
            result = await aiIntegrationService.processWithLMStudio(
              fileItem.file, 
              "Please analyze this document and provide key insights:",
              onProgress
            );
          }

          // Mark as completed
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: 'completed', progress: 100 }
                : f
            )
          );

          processedResults.push({
            fileId: fileItem.id,
            filename: fileItem.file.name,
            success: true,
            ...result
          });

        } catch (error) {
          // Mark as failed
          setFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === fileItem.id 
                ? { ...f, status: 'error', error: error.message }
                : f
            )
          );

          processedResults.push({
            fileId: fileItem.id,
            filename: fileItem.file.name,
            success: false,
            error: error.message
          });
        }
      }

      setResults(processedResults);

    } catch (error) {
      console.error('Batch processing error:', error);
      alert(`Processing failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [files, config]);

  /*
   * CHUNK: Configuration Update Handler
   * PURPOSE: Update service configuration settings
   * DEPENDENCIES: config state
   * OUTPUTS: Updated configuration
   * COMPLEXITY: Low - state updates
   */
  const updateConfig = useCallback((key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  /*
   * CHUNK: File Status Icon Renderer
   * PURPOSE: Display appropriate icon based on file processing status
   * DEPENDENCIES: Lucide icons, file status
   * OUTPUTS: React icon component
   * COMPLEXITY: Low - conditional rendering
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return <FileText className="w-4 h-4 text-gray-500" />;
      case 'processing': return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  /*
   * ===== SECTION: Configuration Panel =====
   * LINES: Config panel UI for API keys and service URLs
   * PURPOSE: Allow users to configure AI service connections
   * SEARCH_KEYWORDS: #section-config #api-configuration
   * COMPLEXITY: Low
   * ===== END SECTION =====
   */
  const ConfigPanel = () => (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">AI Service Configuration</h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="text-blue-600 hover:text-blue-700"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      
      {showConfig && (
        <div className="space-y-4">
          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Service
            </label>
            <select
              value={config.selectedService}
              onChange={(e) => updateConfig('selectedService', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="lmstudio-raw">🚀 LM Studio RAW Upload (Bez obrade)</option>
              <option value="openwebui">OpenWebUI (File Upload + RAG)</option>
              <option value="lmstudio">LM Studio (Content Analysis)</option>
            </select>
          </div>

          {/* OpenWebUI Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenWebUI URL
            </label>
            <input
              type="text"
              value={config.openWebUIUrl}
              onChange={(e) => updateConfig('openWebUIUrl', e.target.value)}
              placeholder="http://localhost:8080"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenWebUI API Key
            </label>
            <form onSubmit={(e) => e.preventDefault()}>
              <input
                type="password"
                value={config.openWebUIApiKey}
                onChange={(e) => updateConfig('openWebUIApiKey', e.target.value)}
                placeholder="Your OpenWebUI API key"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />
            </form>
            <p className="text-xs text-gray-500 mt-1">
              Get this from OpenWebUI Settings → Account → API Keys
            </p>
          </div>

          {/* LM Studio Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              LM Studio URL
            </label>
            <input
              type="text"
              value={config.lmStudioUrl}
              onChange={(e) => updateConfig('lmStudioUrl', e.target.value)}
              placeholder="http://10.39.35.136:1234"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Service Status */}
          <div>
            <div className="flex gap-2 mb-2">
              <button
                onClick={checkServices}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Check Service Status
              </button>
              <button
                onClick={async () => {
                  try {
                    aiIntegrationService.setOpenWebUIConfig(config.openWebUIApiKey, config.openWebUIUrl);
                    const endpoints = await aiIntegrationService.discoverOpenWebUIEndpoints();
                    console.log('OpenWebUI Endpoint Discovery Results:', endpoints);
                    alert('Check browser console for endpoint discovery results');
                  } catch (error) {
                    console.error('Endpoint discovery failed:', error);
                  }
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Test Endpoints
              </button>
              <button
                onClick={async () => {
                  try {
                    aiIntegrationService.setOpenWebUIConfig(config.openWebUIApiKey, config.openWebUIUrl);
                    const result = await aiIntegrationService.testAPIKey();
                    console.log('API Key test result:', result);
                    if (result.valid) {
                      alert('✅ API Key is valid!');
                    } else {
                      alert(`❌ API Key invalid: ${result.status} ${result.statusText || result.error}`);
                    }
                  } catch (error) {
                    console.error('API Key test failed:', error);
                    alert(`❌ API Key test failed: ${error.message}`);
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Test API Key
              </button>
            </div>
            
            {Object.keys(serviceStatus).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">OpenWebUI:</span>
                  {serviceStatus.openwebui?.available ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs text-gray-600">
                    {serviceStatus.openwebui?.available ? 'Available' : serviceStatus.openwebui?.error}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">LM Studio:</span>
                  {serviceStatus.lmstudio?.available ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-xs text-gray-600">
                    {serviceStatus.lmstudio?.available ? 'Available' : serviceStatus.lmstudio?.error}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /*
   * ===== SECTION: Main UI Rendering =====
   * LINES: Primary component UI layout
   * PURPOSE: File upload interface and processing results display
   * SEARCH_KEYWORDS: #section-main-ui #file-upload #results-display
   * COMPLEXITY: Medium
   * ===== END SECTION =====
   */
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">AI File Processor</h1>
        <p className="text-gray-600">
          RAW Upload: Direktno slanje file-a na LM Studio • OpenWebUI: RAG analiza • LM Studio: Content obrada
        </p>
      </div>

      {/* Configuration Panel */}
      <ConfigPanel />

      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-700">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports documents up to 10MB
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".txt,.md,.pdf,.doc,.docx"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Select Files
        </button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Selected Files ({files.length})</h3>
              <button
                onClick={processFiles}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : `Process with ${config.selectedService === 'openwebui' ? 'OpenWebUI' : 'LM Studio'}`}
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {files.map(fileItem => (
              <div key={fileItem.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(fileItem.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{fileItem.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(fileItem.file.size / 1024).toFixed(1)} KB
                      {fileItem.status === 'processing' && ` • ${fileItem.progress}%`}
                      {fileItem.error && ` • ${fileItem.error}`}
                    </p>
                  </div>
                  {fileItem.status === 'processing' && (
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${fileItem.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(fileItem.id)}
                  disabled={fileItem.status === 'processing'}
                  className="ml-4 p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">Processing Results</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {results.map((result, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{result.filename}</p>
                    {result.success ? (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>✓ Processed with {result.service}</p>
                        {result.fileId && <p>File ID: {result.fileId}</p>}
                        {result.warning && (
                          <div className="mt-2 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                            <p className="font-medium text-yellow-800">Note:</p>
                            <p className="mt-1 text-yellow-700">{result.warning}</p>
                          </div>
                        )}
                        {result.response && (
                          <div className="mt-2 p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                            <p className="font-medium">AI Response:</p>
                            <p className="mt-1 whitespace-pre-wrap">{result.response}</p>
                          </div>
                        )}
                        {result.service === 'openwebui' && result.fileId && (
                          <div className="mt-2 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                            <p className="font-medium text-blue-800">Next Steps:</p>
                            <p className="mt-1 text-blue-700">
                              1. Go to your OpenWebUI at <code>http://localhost:8080</code><br/>
                              2. In a chat, type <code>#</code> to see your uploaded files<br/>
                              3. Select this file to use it for RAG conversations<br/>
                              4. If the file shows as empty, try converting to text format first
                            </p>
                          </div>
                        )}
                        
                        {result.service === 'lmstudio-raw' && result.fileId && (
                          <div className="mt-2 p-3 bg-green-50 rounded border-l-4 border-green-400">
                            <p className="font-medium text-green-800">🚀 RAW Upload Successful!</p>
                            <p className="mt-1 text-green-700">
                              1. File uploaded directly to LM Studio without preprocessing<br/>
                              2. File ID: <code>{result.fileId}</code><br/>
                              3. Access through LM Studio interface at <code>http://10.39.35.136:1234</code><br/>
                              4. No OCR, no parsing - completely raw file processing
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-red-600">Error: {result.error}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/*
 * INTEGRATION_POINT: Export component for lazy loading in main app
 * EXTERNAL_DEPENDENCIES: aiIntegrationService, React, Lucide icons
 * PROP_INTERFACE: Standalone component - no props required
 * STATE_CONTRACT: Self-contained state management
 * VERSION_COMPATIBILITY: React 19, modern browsers with File API
 */
export default AIFileProcessor;