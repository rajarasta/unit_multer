import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Save, RotateCcw, Brain, Server, Cpu, Zap, Globe, Key, Palette, User, ChevronRight, ChevronDown, ChevronUp, Activity, Play, Square, CheckCircle, Clock } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  // System prompt templates
  const systemPromptTemplates = {
    default: 'You are a helpful AI assistant specialized in document analysis and content processing.',
    analyst: `You are an expert document analyst with deep knowledge in:
- Financial document processing
- Invoice and receipt analysis
- Technical documentation review
- Data extraction and validation

Provide accurate, structured responses with clear reasoning.`,
    creative: `You are a creative AI assistant that helps with:
- Content creation and writing
- Visual design suggestions
- Creative problem solving
- Brainstorming and ideation

Be imaginative while maintaining accuracy and helpfulness.`,
    technical: `You are a technical specialist focused on:
- Code analysis and documentation
- System architecture review
- Technical specification writing
- Engineering problem solving

Provide precise, technical responses with examples when helpful.`,
    multilingual: `You are a multilingual AI assistant fluent in Croatian and English:
- Prioritize Croatian responses for Croatian users
- Provide accurate translations when needed
- Understand cultural context and nuances
- Adapt communication style to the user's preference

Odgovaraj na hrvatskom jeziku kad god je to moguće.`,
    custom: ''
  };
  // Multi-model configuration
  const [modelConfigs, setModelConfigs] = useState({
    model1: {
      name: 'Model 1',
      baseUrl: 'http://10.71.21.136:1234',
      apiKey: '',
      selectedModel: 'openai-oss-20b',
      temperature: 0.7,
      maxTokens: 1024,
      topP: 0.95,
      topK: 50,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: 'You are a helpful AI assistant specialized in document analysis and content processing.',
      systemPromptTemplate: 'default',
      responseFormat: 'text',
      enableStreaming: true,
      timeout: 30000,
      retries: 3,
      isActive: true
    },
    model2: {
      name: 'Model 2',
      baseUrl: 'http://localhost:1234',
      apiKey: '',
      selectedModel: 'llama-3-8b',
      temperature: 0.8,
      maxTokens: 2048,
      topP: 0.9,
      topK: 40,
      frequencyPenalty: 0.1,
      presencePenalty: 0.1,
      systemPrompt: 'You are a creative AI assistant focused on innovative solutions.',
      systemPromptTemplate: 'creative',
      responseFormat: 'text',
      enableStreaming: true,
      timeout: 45000,
      retries: 2,
      isActive: false
    },
    model3: {
      name: 'Model 3',
      baseUrl: 'http://localhost:8080',
      apiKey: '',
      selectedModel: 'gpt-4-turbo',
      temperature: 0.5,
      maxTokens: 4096,
      topP: 0.95,
      topK: 30,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: 'You are a technical specialist focused on precise analysis.',
      systemPromptTemplate: 'technical',
      responseFormat: 'json',
      enableStreaming: false,
      timeout: 60000,
      retries: 3,
      isActive: false
    },
    model4: {
      name: 'Model 4',
      baseUrl: 'http://localhost:11434',
      apiKey: '',
      selectedModel: 'mistral-7b',
      temperature: 0.6,
      maxTokens: 1536,
      topP: 0.85,
      topK: 45,
      frequencyPenalty: 0.05,
      presencePenalty: 0.05,
      systemPrompt: 'You are a multilingual AI assistant fluent in Croatian and English.',
      systemPromptTemplate: 'multilingual',
      responseFormat: 'text',
      enableStreaming: true,
      timeout: 35000,
      retries: 2,
      isActive: false
    },
    model5: {
      name: 'Model 5',
      baseUrl: 'http://localhost:5000',
      apiKey: '',
      selectedModel: 'claude-3-sonnet',
      temperature: 0.9,
      maxTokens: 8192,
      topP: 1.0,
      topK: 60,
      frequencyPenalty: 0.2,
      presencePenalty: 0.15,
      systemPrompt: 'You are an expert document analyst with deep knowledge.',
      systemPromptTemplate: 'analyst',
      responseFormat: 'text',
      enableStreaming: true,
      timeout: 50000,
      retries: 4,
      isActive: false
    }
  });

  // Global UI Settings
  const [globalSettings, setGlobalSettings] = useState({
    theme: 'light',
    language: 'hr',
    unitUserPrompt: '',
    unitCallModel: 'model1',
    multipleUnitsCallModel: 'model1',
    // Local GGUF (llama.cpp) defaults
    localGGUF_modelPath: '',
    localGGUF_alias: 'local-gguf',
    localGGUF_port: 8000,
    localGGUF_ctx: 4096,
    localGGUF_nGpuLayers: -1,
    localGGUF_threads: 0,
    localGGUF_runnerBase: 'http://127.0.0.1:3004',
    // HF Agent .bat launcher
    hfAgentBatPath: 'E:\\UI REFACTOR\\aluminum-store-ui\\start_hf_agent.bat'
  });

  // Active tab for model selection
  const [activeModelTab, setActiveModelTab] = useState('model1');

  // Collapsed sections state - Default all collapsed for cleaner view
  const [collapsedSections, setCollapsedSections] = useState({
    'model1-Povezivanje': false, // Keep first model connection visible
    'model1-Generiranje Teksta': true,
    'model1-Ponašanje Sistema': true,
    'model2-Povezivanje': true,
    'model2-Generiranje Teksta': true,
    'model2-Ponašanje Sistema': true,
    'model3-Povezivanje': true,
    'model3-Generiranje Teksta': true,
    'model3-Ponašanje Sistema': true,
    'model4-Povezivanje': true,
    'model4-Generiranje Teksta': true,
    'model4-Ponašanje Sistema': true,
    'model5-Povezivanje': true,
    'model5-Generiranje Teksta': true,
    'model5-Ponašanje Sistema': true,
  });

  // Toggle section collapse
  const toggleSection = (sectionKey) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Local GGUF status
  const [ggufStatus, setGgufStatus] = useState(null);
  const [ggufStarting, setGgufStarting] = useState(false);
  // HF Agent .bat status
  const [hfAgentStatus, setHfAgentStatus] = useState({ running: false, launching: false });

  // Load settings from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      const savedModels = localStorage.getItem('multi-model-settings');
      const savedGlobals = localStorage.getItem('global-ui-settings');

      if (savedModels) {
        try {
          const parsed = JSON.parse(savedModels);
          setModelConfigs(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.warn('Failed to parse saved model settings:', e);
        }
      }

      if (savedGlobals) {
        try {
          const parsed = JSON.parse(savedGlobals);
          setGlobalSettings(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.warn('Failed to parse saved global settings:', e);
        }
      }
    }
  }, [isOpen]);

  // Track changes for model configs
  const handleModelConfigChange = (modelId, key, value) => {
    setModelConfigs(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        [key]: value
      }
    }));
    setIsDirty(true);
  };

  // Track changes for global settings
  const handleGlobalSettingsChange = (key, value) => {
    setGlobalSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // Local GGUF helpers
  const buildGGUFArgs = () => {
    const s = globalSettings;
    const args = [
      '-m','llama_cpp.server',
      '--model', String(s.localGGUF_modelPath || ''),
      '--host','0.0.0.0',
      '--port', String(s.localGGUF_port || 8000),
      '--n_ctx', String(s.localGGUF_ctx || 4096),
      '--n_gpu_layers', String(s.localGGUF_nGpuLayers ?? -1),
      '--api-server'
    ];
    if (s.localGGUF_threads && Number(s.localGGUF_threads) > 0) {
      args.push('--threads', String(s.localGGUF_threads));
    }
    if (s.localGGUF_alias && String(s.localGGUF_alias).trim()) {
      args.push('--model_alias', String(s.localGGUF_alias).trim());
    }
    return args;
  };

  const startLocalGGUF = async () => {
    setGgufStarting(true);
    try {
      const id = `llama_${globalSettings.localGGUF_port || 8000}`;
      const payload = { id, cmd: 'python', args: buildGGUFArgs(), shell: false };
      const r = await fetch(`${globalSettings.localGGUF_runnerBase}/api/runner/launch`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Runner launch failed');
    } catch (e) {
      console.warn('startLocalGGUF error:', e);
    } finally {
      setGgufStarting(false);
    }
  };

  const stopLocalGGUF = async () => {
    try {
      const id = `llama_${globalSettings.localGGUF_port || 8000}`;
      await fetch(`${globalSettings.localGGUF_runnerBase}/api/runner/stop/${id}`, { method: 'POST' });
    } catch (e) {
      console.warn('stopLocalGGUF error:', e);
    }
  };

  const healthLocalGGUF = async () => {
    try {
      const r = await fetch(`http://127.0.0.1:${globalSettings.localGGUF_port || 8000}/v1/models`);
      setGgufStatus({ ok: r.ok });
    } catch (e) {
      setGgufStatus({ ok: false, error: String(e?.message || e) });
    }
  };

  // HF Agent .bat launcher functions
  const startHfAgentBat = async () => {
    setHfAgentStatus(prev => ({ ...prev, launching: true }));
    try {
      const batPath = globalSettings.hfAgentBatPath || 'start_hf_agent.bat';

      // Use shell execution to run .bat file
      const payload = {
        id: 'hf_agent_bat',
        cmd: 'cmd.exe',
        args: ['/c', batPath],
        shell: true,
        cwd: 'E:\\UI REFACTOR\\aluminum-store-ui'
      };

      const response = await fetch(`${globalSettings.localGGUF_runnerBase}/api/runner/launch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to launch HF Agent bat');
      }

      setHfAgentStatus(prev => ({ ...prev, running: true }));
      console.log('🤖 HF Agent .bat launched successfully');
    } catch (error) {
      console.error('Failed to start HF Agent .bat:', error);
      setHfAgentStatus(prev => ({ ...prev, running: false }));
    } finally {
      setHfAgentStatus(prev => ({ ...prev, launching: false }));
    }
  };

  const checkHfAgentHealth = async () => {
    try {
      const response = await fetch('http://127.0.0.1:7001/agent/health');
      const isRunning = response.ok;
      setHfAgentStatus(prev => ({ ...prev, running: isRunning }));
      return isRunning;
    } catch (error) {
      setHfAgentStatus(prev => ({ ...prev, running: false }));
      return false;
    }
  };

  const stopHfAgentBat = async () => {
    try {
      await fetch(`${globalSettings.localGGUF_runnerBase}/api/runner/stop/hf_agent_bat`, {
        method: 'POST'
      });
      setHfAgentStatus(prev => ({ ...prev, running: false }));
      console.log('🤖 HF Agent .bat stopped');
    } catch (error) {
      console.error('Failed to stop HF Agent .bat:', error);
    }
  };

  // Handle system prompt template change for specific model
  const handleTemplateChange = (modelId, template) => {
    const newPrompt = systemPromptTemplates[template];
    setModelConfigs(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        systemPromptTemplate: template,
        systemPrompt: template === 'custom' ? prev[modelId].systemPrompt : newPrompt
      }
    }));
    setIsDirty(true);
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('multi-model-settings', JSON.stringify(modelConfigs));
      localStorage.setItem('global-ui-settings', JSON.stringify(globalSettings));

      // Dispatch event for other components to pick up changes
      window.dispatchEvent(new CustomEvent('multi-model-settings-updated', {
        detail: { modelConfigs, globalSettings }
      }));

      // Also dispatch old event for backward compatibility
      const activeModel = Object.values(modelConfigs).find(model => model.isActive) || modelConfigs.model1;
      window.dispatchEvent(new CustomEvent('llm-settings-updated', {
        detail: { ...activeModel, ...globalSettings }
      }));

      // Dispatch specific event for AI call model settings
      window.dispatchEvent(new CustomEvent('ai-call-models-updated', {
        detail: {
          unitCallModel: globalSettings.unitCallModel,
          multipleUnitsCallModel: globalSettings.multipleUnitsCallModel,
          unitCallModelConfig: modelConfigs[globalSettings.unitCallModel],
          multipleUnitsCallModelConfig: modelConfigs[globalSettings.multipleUnitsCallModel]
        }
      }));

      setIsDirty(false);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (e) {
      console.error('Failed to save settings:', e);
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setModelConfigs({
      model1: {
        name: 'Model 1',
        baseUrl: 'http://10.71.21.136:1234',
        apiKey: '',
        selectedModel: 'openai-oss-20b',
        temperature: 0.7,
        maxTokens: 1024,
        topP: 0.95,
        topK: 50,
        frequencyPenalty: 0,
        presencePenalty: 0,
        systemPrompt: 'You are a helpful AI assistant specialized in document analysis and content processing.',
        systemPromptTemplate: 'default',
        responseFormat: 'text',
        enableStreaming: true,
        timeout: 30000,
        retries: 3,
        isActive: true
      },
      model2: {
        name: 'Model 2',
        baseUrl: 'http://localhost:1234',
        apiKey: '',
        selectedModel: 'llama-3-8b',
        temperature: 0.8,
        maxTokens: 2048,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
        systemPrompt: 'You are a creative AI assistant focused on innovative solutions.',
        systemPromptTemplate: 'creative',
        responseFormat: 'text',
        enableStreaming: true,
        timeout: 45000,
        retries: 2,
        isActive: false
      },
      model3: {
        name: 'Model 3',
        baseUrl: 'http://localhost:8080',
        apiKey: '',
        selectedModel: 'gpt-4-turbo',
        temperature: 0.5,
        maxTokens: 4096,
        topP: 0.95,
        topK: 30,
        frequencyPenalty: 0,
        presencePenalty: 0,
        systemPrompt: 'You are a technical specialist focused on precise analysis.',
        systemPromptTemplate: 'technical',
        responseFormat: 'json',
        enableStreaming: false,
        timeout: 60000,
        retries: 3,
        isActive: false
      },
      model4: {
        name: 'Model 4',
        baseUrl: 'http://localhost:11434',
        apiKey: '',
        selectedModel: 'mistral-7b',
        temperature: 0.6,
        maxTokens: 1536,
        topP: 0.85,
        topK: 45,
        frequencyPenalty: 0.05,
        presencePenalty: 0.05,
        systemPrompt: 'You are a multilingual AI assistant fluent in Croatian and English.',
        systemPromptTemplate: 'multilingual',
        responseFormat: 'text',
        enableStreaming: true,
        timeout: 35000,
        retries: 2,
        isActive: false
      },
      model5: {
        name: 'Model 5',
        baseUrl: 'http://localhost:5000',
        apiKey: '',
        selectedModel: 'claude-3-sonnet',
        temperature: 0.9,
        maxTokens: 8192,
        topP: 1.0,
        topK: 60,
        frequencyPenalty: 0.2,
        presencePenalty: 0.15,
        systemPrompt: 'You are an expert document analyst with deep knowledge.',
        systemPromptTemplate: 'analyst',
        responseFormat: 'text',
        enableStreaming: true,
        timeout: 50000,
        retries: 4,
        isActive: false
      }
    });

    setGlobalSettings({
      theme: 'light',
      language: 'hr',
      unitUserPrompt: '',
      unitCallModel: 'model1',
      multipleUnitsCallModel: 'model1',
      // Local GGUF (llama.cpp) defaults
      localGGUF_modelPath: '',
      localGGUF_alias: 'local-gguf',
      localGGUF_port: 8000,
      localGGUF_ctx: 4096,
      localGGUF_nGpuLayers: -1,
      localGGUF_threads: 0,
      localGGUF_runnerBase: 'http://127.0.0.1:3004',
      // HF Agent .bat launcher
      hfAgentBatPath: 'E:\\UI REFACTOR\\aluminum-store-ui\\start_hf_agent.bat'
    });

    setIsDirty(true);
  };

  // Parameter sections for each model
  const getModelParameterSections = (modelId) => [
    {
      title: 'Povezivanje',
      icon: Server,
      fields: [
        { key: 'name', label: 'Naziv Modela', type: 'text', placeholder: 'Model 1' },
        { key: 'baseUrl', label: 'Base URL', type: 'text', placeholder: 'http://localhost:1234' },
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Opcionalno' },
        { key: 'selectedModel', label: 'Model', type: 'text', placeholder: 'model-name' },
        { key: 'timeout', label: 'Timeout (ms)', type: 'number', min: 1000, max: 120000 },
        { key: 'retries', label: 'Ponovni pokušaji', type: 'number', min: 0, max: 10 },
        { key: 'isActive', label: 'Aktivan', type: 'checkbox' }
      ]
    },
    {
      title: 'Generiranje Teksta',
      icon: Brain,
      fields: [
        { key: 'temperature', label: 'Temperature', type: 'range', min: 0, max: 2, step: 0.1 },
        { key: 'maxTokens', label: 'Max Tokens', type: 'number', min: 1, max: 8192 },
        { key: 'topP', label: 'Top P', type: 'range', min: 0, max: 1, step: 0.05 },
        { key: 'topK', label: 'Top K', type: 'number', min: 1, max: 100 },
        { key: 'frequencyPenalty', label: 'Frequency Penalty', type: 'range', min: -2, max: 2, step: 0.1 },
        { key: 'presencePenalty', label: 'Presence Penalty', type: 'range', min: -2, max: 2, step: 0.1 }
      ]
    },
    {
      title: 'Ponašanje Sistema',
      icon: Cpu,
      fields: [
        {
          key: 'systemPromptTemplate',
          label: 'System Prompt Template',
          type: 'select',
          options: ['default', 'analyst', 'creative', 'technical', 'multilingual', 'custom'],
          optionLabels: {
            default: 'Osnovni asistent',
            analyst: 'Analitičar dokumenata',
            creative: 'Kreativni asistent',
            technical: 'Tehnički specialist',
            multilingual: 'Višejezični asistent',
            custom: 'Prilagođeno'
          }
        },
        { key: 'systemPrompt', label: 'System Prompt', type: 'textarea', rows: 6 },
        { key: 'responseFormat', label: 'Format Odgovora', type: 'select', options: ['text', 'json'] },
        { key: 'enableStreaming', label: 'Streaming', type: 'checkbox' }
      ]
    }
  ];


  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-xs sm:max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">LLM Postavke</h2>
              <p className="text-xs md:text-sm text-gray-600">Konfiguracija AI modela i parametara</p>
            </div>
            {/* Collapse/Expand All Button for non-global tabs */}
            {activeModelTab !== 'global' && (
              <button
                onClick={() => {
                  const hasCollapsed = Object.values(collapsedSections).some(collapsed => collapsed);
                  const newCollapsedState = {};
                  Object.keys(collapsedSections).forEach(key => {
                    if (key.startsWith(activeModelTab)) {
                      newCollapsedState[key] = !hasCollapsed;
                    } else {
                      newCollapsedState[key] = collapsedSections[key];
                    }
                  });
                  setCollapsedSections(newCollapsedState);
                }}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                {Object.keys(collapsedSections).filter(key => key.startsWith(activeModelTab)).some(key => collapsedSections[key]) ? 'Proširi sve' : 'Skupi sve'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Model Tabs Sidebar */}
          <div className="w-full lg:w-48 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200 flex lg:flex-col">
            {/* Mobile dropdown for model selection */}
            <div className="lg:hidden w-full p-3">
              <select
                value={activeModelTab}
                onChange={(e) => setActiveModelTab(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              >
                {Object.entries(modelConfigs).map(([modelId, model]) => (
                  <option key={modelId} value={modelId}>
                    {model.name} - {model.selectedModel}
                  </option>
                ))}
                <option value="global">Globalne Postavke</option>
              </select>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:flex-col lg:flex-1">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Modeli</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
              {Object.entries(modelConfigs).map(([modelId, model]) => (
                <button
                  key={modelId}
                  onClick={() => setActiveModelTab(modelId)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${
                    activeModelTab === modelId
                      ? 'bg-blue-50 border-r-2 border-r-blue-500 text-blue-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.selectedModel}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {model.isActive && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                  </div>
                </button>
              ))}

              {/* Global Settings Tab */}
              <button
                onClick={() => setActiveModelTab('global')}
                className={`w-full text-left px-4 py-3 border-b border-gray-200 transition-colors ${
                  activeModelTab === 'global'
                    ? 'bg-purple-50 border-r-2 border-r-purple-500 text-purple-700'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Globalne Postavke</div>
                    <div className="text-xs text-gray-500">UI i prompts</div>
                  </div>
                  <ChevronRight size={14} className="text-gray-400" />
                </div>
              </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 md:p-6 space-y-4 md:space-y-6">
              {/* Model Configuration */}
              {activeModelTab !== 'global' && modelConfigs[activeModelTab] && (
                <>
                  {/* Current System Prompt Preview */}
                  {modelConfigs[activeModelTab].systemPrompt && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain size={16} className="text-blue-600" />
                        <h4 className="text-sm font-semibold text-blue-900">
                          Trenutni System Prompt - {modelConfigs[activeModelTab].name}
                        </h4>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {modelConfigs[activeModelTab].systemPromptTemplate === 'custom'
                            ? 'Prilagođeno'
                            : modelConfigs[activeModelTab].systemPromptTemplate}
                        </span>
                        {modelConfigs[activeModelTab].isActive && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Aktivan
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-blue-800 font-mono bg-white/50 p-2 rounded border">
                        {modelConfigs[activeModelTab].systemPrompt.length > 200
                          ? modelConfigs[activeModelTab].systemPrompt.substring(0, 200) + '...'
                          : modelConfigs[activeModelTab].systemPrompt}
                      </div>
                    </div>
                  )}

                  {/* Model Sections */}
                  <div className="space-y-4">
                    {getModelParameterSections(activeModelTab).map((section, sectionIndex) => {
                      const sectionKey = `${activeModelTab}-${section.title}`;
                      const isCollapsed = collapsedSections[sectionKey];
                      return (
                        <div key={section.title} className="bg-gray-50 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleSection(sectionKey)}
                            className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <section.icon size={18} className="text-gray-700" />
                              <h3 className="font-semibold text-gray-900">{section.title}</h3>
                              <span className="text-xs text-gray-500">
                                ({section.fields.length} postavki)
                              </span>
                            </div>
                            {isCollapsed ? (
                              <ChevronDown size={16} className="text-gray-500" />
                            ) : (
                              <ChevronUp size={16} className="text-gray-500" />
                            )}
                          </button>

                          <AnimatePresence>
                            {!isCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-gray-200"
                              >
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {section.fields.map((field) => (
                                    <div key={field.key} className={`space-y-2 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}>
                                      <label className="text-sm font-medium text-gray-700">
                                        {field.label}
                                        {field.type === 'range' && (
                                          <span className="ml-2 text-gray-500">({modelConfigs[activeModelTab][field.key]})</span>
                                        )}
                                      </label>

                                      {field.type === 'text' || field.type === 'password' || field.type === 'number' ? (
                                        <input
                                          type={field.type}
                                          value={modelConfigs[activeModelTab][field.key]}
                                          onChange={(e) => handleModelConfigChange(activeModelTab, field.key, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                          placeholder={field.placeholder}
                                          min={field.min}
                                          max={field.max}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                      ) : field.type === 'range' ? (
                                        <input
                                          type="range"
                                          value={modelConfigs[activeModelTab][field.key]}
                                          onChange={(e) => handleModelConfigChange(activeModelTab, field.key, parseFloat(e.target.value))}
                                          min={field.min}
                                          max={field.max}
                                          step={field.step}
                                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                        />
                                      ) : field.type === 'textarea' ? (
                                        <div className="space-y-2">
                                          <textarea
                                            value={modelConfigs[activeModelTab][field.key]}
                                            onChange={(e) => {
                                              handleModelConfigChange(activeModelTab, field.key, e.target.value);
                                              // Auto-switch to custom when user starts editing
                                              if (field.key === 'systemPrompt' && modelConfigs[activeModelTab].systemPromptTemplate !== 'custom') {
                                                handleModelConfigChange(activeModelTab, 'systemPromptTemplate', 'custom');
                                              }
                                            }}
                                            rows={field.rows}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            placeholder={field.placeholder || (field.key === 'systemPrompt' ? 'Unesite svoj system prompt ili odaberite template...' : '')}
                                          />
                                          {field.key === 'systemPrompt' && (
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <p className="text-xs text-gray-500">
                                                  {modelConfigs[activeModelTab].systemPromptTemplate === 'custom'
                                                    ? 'Koristite prilagođeni prompt'
                                                    : `Template "${modelConfigs[activeModelTab].systemPromptTemplate}"`}
                                                </p>
                                                {modelConfigs[activeModelTab].systemPromptTemplate !== 'custom' && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleModelConfigChange(activeModelTab, 'systemPromptTemplate', 'custom')}
                                                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                                                  >
                                                    Prebaci na custom
                                                  </button>
                                                )}
                                              </div>
                                              <span className="text-xs text-gray-400">
                                                {modelConfigs[activeModelTab][field.key]?.length || 0} znakova
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ) : field.type === 'select' ? (
                                        <select
                                          value={modelConfigs[activeModelTab][field.key]}
                                          onChange={(e) => {
                                            if (field.key === 'systemPromptTemplate') {
                                              handleTemplateChange(activeModelTab, e.target.value);
                                            } else {
                                              handleModelConfigChange(activeModelTab, field.key, e.target.value);
                                            }
                                          }}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                          {field.options.map(option => (
                                            <option key={option} value={option}>
                                              {field.optionLabels?.[option] || option}
                                            </option>
                                          ))}
                                        </select>
                                      ) : field.type === 'checkbox' ? (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={modelConfigs[activeModelTab][field.key]}
                                            onChange={(e) => handleModelConfigChange(activeModelTab, field.key, e.target.checked)}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                          />
                                          <span className="text-sm text-gray-700">Omogući</span>
                                        </label>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Global Settings - Compact Layout */}
              {activeModelTab === 'global' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* AI Call Models */}
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-purple-100 rounded">
                          <Brain size={16} className="text-purple-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">AI Call Settings</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model za pojedinačne Unitove
                          </label>
                          <select
                            value={globalSettings.unitCallModel}
                            onChange={(e) => handleGlobalSettingsChange('unitCallModel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {Object.entries(modelConfigs).map(([key, model]) => (
                              <option key={key} value={key}>
                                {model.name} ({model.selectedModel})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Model za kombinirne Unitove
                          </label>
                          <select
                            value={globalSettings.multipleUnitsCallModel}
                            onChange={(e) => handleGlobalSettingsChange('multipleUnitsCallModel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {Object.entries(modelConfigs).map(([key, model]) => (
                              <option key={key} value={key}>
                                {model.name} ({model.selectedModel})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* User Prompt */}
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 bg-blue-100 rounded">
                          <User size={16} className="text-blue-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Unit Prompt</h3>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stalni prompt za sve Unit operacije
                        </label>
                        <textarea
                          value={globalSettings.unitUserPrompt}
                          onChange={(e) => handleGlobalSettingsChange('unitUserPrompt', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          placeholder="Unesite prompt koji će se koristiti uz sve inpute u Unit komponentama..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* HF Agent Launcher */}
                    <div className="bg-white border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-green-100 rounded">
                          <Brain size={16} className="text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">HF Agent (Transformers)</h3>
                          <p className="text-xs text-gray-600">Multimodal AI za slike + tekst</p>
                        </div>
                        {hfAgentStatus.running ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">Pokrenut</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">Zaustavljen</span>
                        )}
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            .bat file path
                          </label>
                          <input
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={globalSettings.hfAgentBatPath || ''}
                            onChange={(e)=>handleGlobalSettingsChange('hfAgentBatPath', e.target.value)}
                            placeholder="start_hf_agent.bat"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={checkHfAgentHealth}
                            className="px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1"
                          >
                            <Activity className="w-3 h-3"/> Health
                          </button>
                          <button
                            onClick={startHfAgentBat}
                            disabled={hfAgentStatus.launching || !globalSettings.hfAgentBatPath}
                            className="px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-1"
                          >
                            <Play className="w-3 h-3"/> {hfAgentStatus.launching ? 'Start...' : 'Start'}
                          </button>
                          <button
                            onClick={stopHfAgentBat}
                            className="px-2 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-1"
                          >
                            <Square className="w-3 h-3"/> Stop
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats - Optional */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-center p-2 bg-white rounded">
                          <div className="font-medium text-gray-900">{Object.keys(modelConfigs).length}</div>
                          <div className="text-gray-600">Modeli</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded">
                          <div className="font-medium text-gray-900">{Object.values(modelConfigs).filter(m => m.isActive).length}</div>
                          <div className="text-gray-600">Aktivni</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            Vrati na zadano
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Otkaži
            </button>
            <motion.button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDirty && !isSaving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              whileTap={{ scale: 0.95 }}
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap size={16} />
                  </motion.div>
                  Spremam...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Spremi
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;
