import { useState, useEffect, useRef } from 'react';
import { 
  Server, Play, Square, RotateCcw, Settings, Terminal, 
  Activity, Cpu, HardDrive, Wifi, WifiOff, CheckCircle, 
  XCircle, Clock, Download, Upload, Eye, EyeOff, Plus, 
  Edit3, Save, X, Trash2, Brain, Sliders, TestTube, Zap
} from 'lucide-react';
import { useLLMSession } from './llmSessionStore';
import { useAISettingsStore } from '../../../store/useAISettingsStore';
import { sendChatMessage, testSessionConnectivity, ERROR_TYPES } from './llmBridge';

const LLMServerManager = () => {
  // LLM Session Management
  const {
    activeSessionId,
    activeSession,
    sessions,
    createSession,
    updateSession,
    deleteSession,
    setActiveSession,
    getParameterPresets,
    getEngineConfig,
    getSessionStats,
    validateSession,
    PARAMETER_PRESETS,
    ENGINE_CONFIGS
  } = useLLMSession();

  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isStartingServer, setIsStartingServer] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  
  // Enhanced form data with session integration
  const [formData, setFormData] = useState({
    name: '',
    type: 'Custom',
    host: 'localhost',
    port: 5000,
    model: '',
    maxTokens: 4096,
    temperature: 0.7,
    systemPrompt: 'Make a short stroy based on these inputs',
    createSession: true // New: option to create session for server
  });
  
  // New states for session management
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [testMessage, setTestMessage] = useState('Pozdrav! Možeš li mi reći nešto o aluminijumu u građevinarstvu?');
  const [testResponse, setTestResponse] = useState('');
  const [isTestingSession, setIsTestingSession] = useState(false);
  
  // Runner API base URL
  const RUNNER_BASE = "http://127.0.0.1:3002";

  // Launcher state for llama_cpp.server
  const [launcher, setLauncher] = useState({
    modelPath: "E:\\models\\Qwen2.5-7B-Instruct-Q4_K_M.gguf",
    mmprojPath: "",       // za vision modele (prazno za text)
    host: "0.0.0.0",
    port: 8000,
    ctx: 4096,
    nGpuLayers: -1,
    threads: 0,           // 0 = auto
    apiServer: true,
    visionMode: false,
    extraArgs: "",        // npr: --parallel 4 --batch-size 256
    workingDir: "",       // opciono
  });

  // Prompts and presets
  const [prompts, setPrompts] = useState({
    system: "You are a helpful assistant specialized in aluminum construction and engineering.",
    developer: "",
    userTemplate: "",
  });

  // BAT execution and logging
  const [batPath, setBatPath] = useState("E:\\UI REFACTOR\\aluminum-store-ui\\start_agent_stack.bat");
  const [runnerId, setRunnerId] = useState(null);
  const [runnerLogs, setRunnerLogs] = useState([]);
  const runnerEvtRef = useRef(null);
  
  const logsEndRef = useRef(null);

  // Global AI settings (agent mode + local config)
  const aiSettings = useAISettingsStore();
  const [localPing, setLocalPing] = useState(null);
  const [modelsScan, setModelsScan] = useState(null);

  const API_BASE = 'http://localhost:3002';

  async function pingLocal() {
    try {
      setLocalPing({ loading: true });
      const u = new URL('/api/llm/local/health', API_BASE);
      u.searchParams.set('base', aiSettings.localBaseUrl);
      const r = await fetch(u.toString());
      const j = await r.json();
      setLocalPing(j);
    } catch (e) {
      setLocalPing({ ok: false, error: String(e?.message || e) });
    }
  }

  async function scanModels() {
    try {
      setModelsScan({ loading: true });
      const u = new URL('/api/llm/local/models', API_BASE);
      u.searchParams.set('root', aiSettings.localModelsRoot || 'E:\\Modeli');
      const r = await fetch(u.toString());
      const j = await r.json();
      setModelsScan(j);
    } catch (e) {
      setModelsScan({ ok: false, error: String(e?.message || e) });
    }
  }

  // Initialize with predefined server configurations
  useEffect(() => {
    const defaultServers = [
      {
        id: 'lm-studio',
        name: 'LM Studio Server',
        type: 'LM Studio',
        host: '10.39.35.136',
        port: 1234,
        endpoint: 'http://10.39.35.136:1234',
        status: 'stopped',
        model: 'llama-3.1-8b-instruct',
        maxTokens: 4096,
        temperature: 0.7,
        lastStarted: null,
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      },
      {
        id: 'openwebui',
        name: 'OpenWebUI Server',
        type: 'OpenWebUI',
        host: 'localhost',
        port: 8080,
        endpoint: 'http://localhost:8080',
        status: 'stopped',
        model: 'auto',
        maxTokens: 2048,
        temperature: 0.8,
        lastStarted: null,
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      },
      {
        id: 'ollama',
        name: 'Ollama Server',
        type: 'Ollama',
        host: 'localhost',
        port: 11434,
        endpoint: 'http://localhost:11434',
        status: 'stopped',
        model: 'llama3.1:8b',
        maxTokens: 8192,
        temperature: 0.6,
        lastStarted: null,
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      },
      {
        id: 'custom-server',
        name: 'Custom LLM Server',
        type: 'Custom',
        host: 'localhost',
        port: 5000,
        endpoint: 'http://localhost:5000',
        status: 'stopped',
        model: 'custom-model',
        maxTokens: 4096,
        temperature: 0.7,
        lastStarted: null,
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      },
      {
        id: 'python-llm-text',
        name: 'Python LLM Server (Text)',
        type: 'Python LLM',
        host: '127.0.0.1',
        port: 8000,
        endpoint: 'http://127.0.0.1:8000',
        status: 'stopped',
        model: 'qwen2.5-7b-instruct',
        maxTokens: 2048,
        temperature: 0.7,
        lastStarted: null,
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      },
      {
        id: 'python-llm-vision',
        name: 'Python LLM Server (Vision)',
        type: 'Python LLM',
        host: '127.0.0.1',
        port: 8001,
        endpoint: 'http://127.0.0.1:8001',
        status: 'stopped',
        model: 'llava-v1.5-7b',
        maxTokens: 2048,
        temperature: 0.7,
        lastStarted: null,
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      }
    ];

    setServers(defaultServers);
    setSelectedServer(defaultServers[0]);

    // Add initial system log
    addLog('system', 'LLM Server Manager inicijalizovan');
  }, []);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, showLogs]);

  const addLog = (type, message, serverId = null) => {
    const newLog = {
      id: Date.now(),
      type, // 'system', 'info', 'success', 'error', 'warning'
      message,
      serverId,
      timestamp: new Date()
    };
    setLogs(prev => [...prev, newLog]);
  };

  const updateServerStatus = (serverId, status, additionalData = {}) => {
    setServers(prev => prev.map(server => 
      server.id === serverId 
        ? { ...server, status, ...additionalData }
        : server
    ));
  };

  // Helper functions for launcher
  function buildLlamaArgs() {
    const args = [
      "-m", "llama_cpp.server", 
      "--model", launcher.modelPath, 
      "--host", launcher.host, 
      "--port", String(launcher.port), 
      "--n_ctx", String(launcher.ctx), 
      "--n_gpu_layers", String(launcher.nGpuLayers)
    ];
    
    if (launcher.apiServer) args.push("--api-server");
    if (launcher.threads > 0) { 
      args.push("--threads", String(launcher.threads)); 
    }
    if (launcher.visionMode && launcher.mmprojPath) { 
      args.push("--mmproj", launcher.mmprojPath); 
    }
    if (launcher.extraArgs?.trim()) {
      const extra = launcher.extraArgs.trim().split(/\s+/);
      args.push(...extra);
    }
    return args;
  }

  function buildOneLiner() {
    const args = buildLlamaArgs().map(a => (a.includes(" ") ? `"${a}"` : a)).join(" ");
    return `python ${args}`;
  }

  // Launch process via Runner API
  async function launchProcess() {
    const id = `llama_${launcher.port}`;
    setRunnerId(id);
    setRunnerLogs(prev => [...prev, `[ui] launching ${id} ...`]);

    // Close previous stream
    if (runnerEvtRef.current) { 
      runnerEvtRef.current.close(); 
      runnerEvtRef.current = null; 
    }

    try {
      const payload = {
        id,
        cmd: "python",
        args: buildLlamaArgs(),
        cwd: launcher.workingDir || undefined,
        shell: false
      };

      const r = await fetch(`${RUNNER_BASE}/api/runner/launch`, {
        method: "POST", 
        headers: { "content-type": "application/json" }, 
        body: JSON.stringify(payload)
      });

      const j = await r.json();
      if (!r.ok) {
        addLog('error', `Runner launch failed: ${j.error || 'unknown'}`);
        return;
      }

      // Open SSE stream for live logs
      const es = new EventSource(`${RUNNER_BASE}/api/runner/stream/${id}`);
      runnerEvtRef.current = es;
      
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.line) {
            setRunnerLogs(prev => [...prev.slice(-500), data.line]); // Keep last 500 lines
          }
        } catch (err) {
          console.log('SSE parse error:', err);
        }
      };
      
      es.addEventListener("error", () => {
        setRunnerLogs(prev => [...prev, "[ui] stream closed"]);
      });

      // Add/update server in the list
      const endpoint = `http://${launcher.host === '0.0.0.0' ? '127.0.0.1' : launcher.host}:${launcher.port}`;
      const newServer = {
        id,
        name: `Python LLM (launched ${launcher.port})`,
        type: 'Python LLM',
        host: launcher.host === '0.0.0.0' ? '127.0.0.1' : launcher.host,
        port: launcher.port,
        endpoint,
        status: 'running',
        model: launcher.visionMode ? 'vision-gguf' : 'text-gguf',
        maxTokens: launcher.ctx,
        temperature: 0.7,
        lastStarted: new Date(),
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      };
      
      setServers(prev => {
        const exists = prev.some(s => s.id === id);
        return exists 
          ? prev.map(s => s.id === id ? newServer : s) 
          : [newServer, ...prev];
      });
      
      setSelectedServer(newServer);
      addLog('success', `Launched ${newServer.name} on ${endpoint}`, id);

    } catch (error) {
      addLog('error', `Launch error: ${error.message}`);
    }
  }

  // Stop process via Runner API
  async function stopProcess() {
    if (!runnerId) return;
    
    try {
      await fetch(`${RUNNER_BASE}/api/runner/stop/${runnerId}`, { method: "POST" });
      if (runnerEvtRef.current) { 
        runnerEvtRef.current.close(); 
        runnerEvtRef.current = null; 
      }
      setRunnerLogs(prev => [...prev, `[ui] stop signal sent for ${runnerId}`]);
      
      // Update server status
      setServers(prev => prev.map(s => 
        s.id === runnerId ? { ...s, status: 'stopped' } : s
      ));
      
    } catch (error) {
      addLog('error', `Stop error: ${error.message}`);
    }
  }

  // --- Render helpers for global AI settings ---
  function GlobalAgentControls() {
    return (
      <div className="mb-4 p-3 border rounded-lg bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Agent mode:</span>
            <select
              className="text-sm border rounded px-2 py-1"
              value={aiSettings.llmMode}
              onChange={(e)=>aiSettings.setLLMMode(e.target.value)}
            >
              <option value="server">Server</option>
              <option value="local">Local</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Local LLM URL:</span>
            <input
              className="text-sm border rounded px-2 py-1 w-[280px]"
              value={aiSettings.localBaseUrl || ''}
              onChange={(e)=>aiSettings.setLocalBaseUrl(e.target.value)}
              placeholder="http://10.255.130.136:1234"
            />
            <button className="px-2 py-1 text-sm border rounded" onClick={pingLocal}>Ping</button>
            {localPing?.loading ? (
              <span className="text-xs text-slate-500">Pinging…</span>
            ) : localPing ? (
              <span className={`text-xs ${localPing.ok? 'text-emerald-600' : 'text-rose-600'}`}>
                {localPing.ok ? `OK (${localPing.models||0} models)` : `ERR: ${localPing.error||'unknown'}`}
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-600">Models path:</span>
          <input
            className="text-sm border rounded px-2 py-1 w-[280px]"
            value={aiSettings.localModelsRoot || ''}
            onChange={(e)=>aiSettings.setLocalModelsRoot(e.target.value)}
            placeholder="E:\\Modeli"
          />
          <button className="px-2 py-1 text-sm border rounded" onClick={scanModels}>Scan</button>
          {modelsScan?.loading ? (
            <span className="text-xs text-slate-500">Scanning…</span>
          ) : modelsScan ? (
            <span className={`text-xs ${modelsScan.ok? 'text-emerald-600' : 'text-rose-600'}`}>
              {modelsScan.ok ? `${modelsScan.count||0} gguf` : `ERR: ${modelsScan.error||'unknown'}`}
            </span>
          ) : null}
          {modelsScan?.ok && (modelsScan.models?.length>0) && (
            <>
              <span className="text-sm text-slate-600 ml-2">Select model:</span>
              <select
                className="text-sm border rounded px-2 py-1"
                value={aiSettings.selectedLocalModel || ''}
                onChange={(e)=>aiSettings.setSelectedLocalModel(e.target.value)}
              >
                <option value="">-- choose --</option>
                {modelsScan.models.map(m => (
                  <option key={m.path} value={m.path}>{m.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
    );
  }

  // Run .bat file via Runner API
  async function runBat() {
    const id = `bat_${Date.now()}`;
    setRunnerLogs(prev => [...prev, `[ui] starting .bat ${batPath}`]);
    
    // Close previous stream
    if (runnerEvtRef.current) { 
      runnerEvtRef.current.close(); 
      runnerEvtRef.current = null; 
    }
    
    try {
      const r = await fetch(`${RUNNER_BASE}/api/runner/start-bat`, {
        method: "POST", 
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          id, 
          path: batPath, 
          args: [], 
          cwd: undefined 
        })
      });
      
      const j = await r.json();
      if (!r.ok) {
        addLog('error', `start-bat failed: ${j.error || 'unknown'}`);
        return;
      }
      
      // Open SSE stream for .bat logs
      const es = new EventSource(`${RUNNER_BASE}/api/runner/stream/${id}`);
      runnerEvtRef.current = es;
      
      es.onmessage = (e) => {
        try { 
          const data = JSON.parse(e.data); 
          if (data.line) {
            setRunnerLogs(prev => [...prev.slice(-500), data.line]);
          }
        } catch (err) {
          console.log('BAT SSE parse error:', err);
        }
      };

    } catch (error) {
      addLog('error', `BAT execution error: ${error.message}`);
    }
  }

  // REAL CONNECT (CONNECT to existing Python server)
  const handleStartServer = async (serverId) => {
    const server = servers.find(s => s.id === serverId);
    setIsStartingServer(serverId);
    addLog('info', `Povezujem se na ${server.name}...`, serverId);

    try {
      updateServerStatus(serverId, 'starting');

      // Create temporary session for connectivity test
      const sessionConfig = {
        engineType: getEngineTypeFromServerType(server.type),
        baseUrl: server.endpoint,
        selectedModel: server.model,
        systemPrompt: 'You are a helpful assistant.',
        modelParams: {
          temperature: server.temperature,
          max_tokens: server.maxTokens,
          top_p: 0.95,
          top_k: 50,
          repeat_penalty: 1.05
        }
      };

      const tempSession = createSession(sessionConfig);
      
      // Test actual connectivity
      const pingResult = await testSessionConnectivity({
        session: { activeSession: tempSession },
        updateSessionStats: updateSession
      });

      if (pingResult.success) {
        updateServerStatus(serverId, 'running', {
          lastStarted: new Date(),
          uptime: 0
        });
        addLog('success', `Konekcija uspješna: ${pingResult.data.reply?.slice(0, 50) || 'connected'}`, serverId);
        
        // Set as active session
        setActiveSession(tempSession.sessionId);
      } else {
        updateServerStatus(serverId, 'error');
        addLog('error', `Konekcija neuspješna: ${pingResult.error?.message || 'Nepoznata greška'}`, serverId);
        
        // Clean up failed session
        deleteSession(tempSession.sessionId);
      }
    } catch (error) {
      updateServerStatus(serverId, 'error');
      addLog('error', `Greška pri povezivanju: ${error.message}`, serverId);
    } finally {
      setIsStartingServer(null);
    }
  };

  // REAL DISCONNECT (disconnect from server and clean up sessions)
  const handleStopServer = async (serverId) => {
    const server = servers.find(s => s.id === serverId);
    addLog('info', `Prekidam vezu s ${server.name}...`, serverId);
    
    updateServerStatus(serverId, 'stopping');
    
    try {
      // Find and clean up any sessions using this server
      const serverSessions = sessions.filter(session => 
        session.baseUrl === server.endpoint
      );
      
      for (const session of serverSessions) {
        deleteSession(session.sessionId);
        addLog('info', `Obrisana sesija ${session.sessionId.slice(-8)}`, serverId);
      }
      
      // If active session was on this server, clear it
      if (activeSession && activeSession.baseUrl === server.endpoint) {
        setActiveSession(null);
        addLog('info', 'Aktivna sesija obrisan', serverId);
      }
      
      updateServerStatus(serverId, 'stopped', {
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      });
      
      addLog('success', `${server.name} uspješno odspojen`, serverId);
      
    } catch (error) {
      updateServerStatus(serverId, 'error');
      addLog('error', `Greška pri prekidanju veze: ${error.message}`, serverId);
    }
  };

  const handleRestartServer = async (serverId) => {
    await handleStopServer(serverId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await handleStartServer(serverId);
  };

  // New: Session management integration
  const handleCreateSessionForServer = async (serverId) => {
    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    try {
      const sessionConfig = {
        engineType: getEngineTypeFromServerType(server.type),
        baseUrl: server.endpoint,
        apiKey: server.apiKey || null,
        selectedModel: server.model,
        systemPrompt: server.systemPrompt || 'You are a helpful AI assistant specialized in aluminum industry processes.',
        modelParams: {
          temperature: server.temperature,
          max_tokens: server.maxTokens,
          top_p: 0.95,
          top_k: 50,
          repeat_penalty: 1.05
        },
        metadata: {
          serverId: serverId,
          serverName: server.name,
          serverType: server.type
        }
      };

      const newSession = createSession(sessionConfig);
      addLog('success', `Kreirana LLM sesija ${newSession.sessionId} za server ${server.name}`, serverId);
      
      return newSession;
    } catch (error) {
      addLog('error', `Greška pri kreiranju sesije: ${error.message}`, serverId);
      throw error;
    }
  };

  const getEngineTypeFromServerType = (serverType) => {
    const mapping = {
      'LM Studio': 'lm_studio',
      'OpenWebUI': 'openwebui', 
      'Ollama': 'ollama',
      'Custom': 'llama_cpp_python', // Default to Python llama-cpp server
      'Python LLM': 'llama_cpp_python'
    };
    return mapping[serverType] || 'llama_cpp_python';
  };

  // New: Test active session functionality
  const handleTestActiveSession = async () => {
    if (!activeSession) {
      addLog('error', 'Nema aktivne LLM sesije za testiranje');
      return;
    }

    setIsTestingSession(true);
    setTestResponse('');
    addLog('info', `Testiranje aktivne sesije ${activeSessionId}...`);

    try {
      const result = await sendChatMessage(
        testMessage,
        { 
          session: { activeSession },
          updateSessionStats: updateSession
        }
      );

      if (result.success) {
        setTestResponse(result.data.content);
        addLog('success', `Test sesije uspješan: ${result.data.content.substring(0, 100)}...`);
        
        // Update session status
        updateSession(activeSessionId, { status: 'active' });
      } else {
        setTestResponse(`Greška: ${result.error.message}`);
        addLog('error', `Test sesije neuspješan: ${result.error.message}`);
        
        // Update session status
        updateSession(activeSessionId, { status: 'error' });
      }
    } catch (error) {
      const errorMsg = `Neočekivana greška: ${error.message}`;
      setTestResponse(errorMsg);
      addLog('error', `Test sesije failed: ${errorMsg}`);
      
      updateSession(activeSessionId, { status: 'error' });
    } finally {
      setIsTestingSession(false);
    }
  };

  // REAL CONNECTION TEST (test actual HTTP connectivity)
  const testServerConnection = async (serverId) => {
    const server = servers.find(s => s.id === serverId);
    addLog('info', `Testiranje konekcije na ${server.name}...`, serverId);
    
    try {
      // Use existing active session if it's for this server, otherwise create temporary
      let sessionForTest = activeSession && activeSession.baseUrl === server.endpoint
        ? activeSession
        : createSession({
            engineType: getEngineTypeFromServerType(server.type),
            baseUrl: server.endpoint,
            selectedModel: server.model,
            systemPrompt: 'You are a helpful assistant.',
            modelParams: {
              temperature: server.temperature,
              max_tokens: 32, // Very small for quick test
              top_p: 0.95
            }
          });

      // Test connectivity
      const pingResult = await testSessionConnectivity({
        session: { activeSession: sessionForTest },
        updateSessionStats: updateSession
      });

      if (pingResult.success) {
        addLog('success', `Uspješno: ${pingResult.data.reply?.slice(0, 60) || 'pong'}`, serverId);
        
        // Update server stats
        setServers(prev => prev.map(s => 
          s.id === serverId 
            ? { ...s, requestCount: (s.requestCount || 0) + 1 }
            : s
        ));
        
        // Clean up temporary session if created
        if (sessionForTest.sessionId !== activeSessionId) {
          // Keep temporary session for future use, or delete if not needed
          // deleteSession(sessionForTest.sessionId);
        }
      } else {
        addLog('error', `Neuspješno: ${pingResult.error?.message || 'Nepoznata greška'}`, serverId);
        
        setServers(prev => prev.map(s => 
          s.id === serverId 
            ? { ...s, errorCount: (s.errorCount || 0) + 1 }
            : s
        ));
        
        // Clean up temporary session on failure
        if (sessionForTest.sessionId !== activeSessionId) {
          deleteSession(sessionForTest.sessionId);
        }
      }
    } catch (error) {
      addLog('error', `Greška pri testiranju: ${error.message}`, serverId);
      
      setServers(prev => prev.map(s => 
        s.id === serverId 
          ? { ...s, errorCount: (s.errorCount || 0) + 1 }
          : s
      ));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'stopped': return 'bg-gray-100 text-gray-800';
      case 'starting': case 'stopping': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'stopped': return <XCircle className="w-4 h-4 text-gray-600" />;
      case 'starting': case 'stopping': return <Clock className="w-4 h-4 text-yellow-600 animate-spin" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Server className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatUptime = (startTime) => {
    if (!startTime) return '0s';
    const diff = Date.now() - new Date(startTime).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('hr-HR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const getLogTypeColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  // Server management functions
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Custom',
      host: 'localhost',
      port: 5000,
      model: '',
      maxTokens: 4096,
      temperature: 0.7
    });
  };

  const handleAddServer = () => {
    setShowAddForm(true);
    setEditingServer(null);
    resetForm();
  };

  const handleEditServer = (server) => {
    setEditingServer(server.id);
    setFormData({
      name: server.name,
      type: server.type,
      host: server.host,
      port: server.port,
      model: server.model,
      maxTokens: server.maxTokens,
      temperature: server.temperature
    });
    setShowAddForm(true);
  };

  const handleSaveServer = () => {
    if (!formData.name.trim() || !formData.model.trim()) {
      addLog('error', 'Ime servera i model su obavezni');
      return;
    }

    const endpoint = `http://${formData.host}:${formData.port}`;

    if (editingServer) {
      // Edit existing server
      setServers(prev => prev.map(server => 
        server.id === editingServer 
          ? {
              ...server,
              name: formData.name,
              type: formData.type,
              host: formData.host,
              port: parseInt(formData.port),
              endpoint: endpoint,
              model: formData.model,
              maxTokens: parseInt(formData.maxTokens),
              temperature: parseFloat(formData.temperature)
            }
          : server
      ));
      addLog('success', `Server "${formData.name}" uspješno ažuriran`);
    } else {
      // Add new server
      const newServer = {
        id: `server-${Date.now()}`,
        name: formData.name,
        type: formData.type,
        host: formData.host,
        port: parseInt(formData.port),
        endpoint: endpoint,
        status: 'stopped',
        model: formData.model,
        maxTokens: parseInt(formData.maxTokens),
        temperature: parseFloat(formData.temperature),
        lastStarted: null,
        uptime: 0,
        requestCount: 0,
        errorCount: 0
      };

      setServers(prev => [...prev, newServer]);
      addLog('success', `Novi server "${formData.name}" dodan`);
    }

    setShowAddForm(false);
    setEditingServer(null);
    resetForm();
  };

  const handleDeleteServer = (serverId) => {
    const server = servers.find(s => s.id === serverId);
    
    if (server.status === 'running') {
      addLog('error', `Ne mogu obrisati pokrenut server "${server.name}"`);
      return;
    }

    if (confirm(`Jeste li sigurni da želite obrisati server "${server.name}"?`)) {
      setServers(prev => prev.filter(s => s.id !== serverId));
      addLog('success', `Server "${server.name}" obrisan`);
      
      if (selectedServer?.id === serverId) {
        setSelectedServer(servers.find(s => s.id !== serverId) || null);
      }
    }
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingServer(null);
    resetForm();
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const serverTypes = ['Python LLM', 'LM Studio', 'OpenWebUI', 'Ollama', 'Custom'];

  const getTypePresets = (type) => {
    const presets = {
      'Python LLM': { port: 8000, model: 'qwen2.5-7b-instruct', maxTokens: 2048, temperature: 0.7 },
      'LM Studio': { port: 1234, model: 'llama-3.1-8b-instruct', maxTokens: 4096, temperature: 0.7 },
      'OpenWebUI': { port: 8080, model: 'auto', maxTokens: 2048, temperature: 0.8 },
      'Ollama': { port: 11434, model: 'llama3.1:8b', maxTokens: 8192, temperature: 0.6 },
      'Custom': { port: 5000, model: 'custom-model', maxTokens: 4096, temperature: 0.7 }
    };
    return presets[type] || presets['Python LLM'];
  };

  const applyTypePreset = (type) => {
    const preset = getTypePresets(type);
    setFormData(prev => ({
      ...prev,
      type,
      port: preset.port,
      model: preset.model,
      maxTokens: preset.maxTokens,
      temperature: preset.temperature
    }));
  };

  // Load saved prompts preset on mount
  useEffect(() => {
    const savedPreset = localStorage.getItem('llm_prompt_preset');
    if (savedPreset) {
      try {
        setPrompts(JSON.parse(savedPreset));
      } catch (err) {
        console.log('Failed to load prompt preset:', err);
      }
    }
  }, []);

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (runnerEvtRef.current) {
        runnerEvtRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-blue-600" />
          <h1 className="text-xl font-semibold text-gray-800">LLM Server Manager</h1>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
            {servers.filter(s => s.status === 'running').length} / {servers.length} aktivno
          </span>
          {/* Active Session Indicator */}
          {activeSession && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Aktivna sesija: {activeSession.selectedModel}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSessionManager(!showSessionManager)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              showSessionManager 
                ? 'bg-purple-600 text-white' 
                : 'text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Brain className="w-4 h-4" />
            {showSessionManager ? 'Sakrij' : 'Prikaži'} sesije
          </button>
          <button
            onClick={handleAddServer}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Dodaj server
          </button>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
              showLogs 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {showLogs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showLogs ? 'Sakrij' : 'Prikaži'} logove
          </button>
        </div>
      </div>

      {/* Global Agent Controls */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <GlobalAgentControls />
      </div>

      {/* Launcher & Prompts Panel */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Launcher */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-gray-700" />
              <h3 className="font-semibold text-gray-800">Launcher (llama_cpp.server)</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Model path *</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.modelPath} 
                  onChange={e=>setLauncher({...launcher, modelPath:e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">mmproj (vision)</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.mmprojPath} 
                  onChange={e=>setLauncher({...launcher, mmprojPath:e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Host</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.host} 
                  onChange={e=>setLauncher({...launcher, host:e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Port</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.port} 
                  onChange={e=>setLauncher({...launcher, port:Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Context (n_ctx)</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.ctx} 
                  onChange={e=>setLauncher({...launcher, ctx:Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">n_gpu_layers</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.nGpuLayers} 
                  onChange={e=>setLauncher({...launcher, nGpuLayers:Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">threads</label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.threads} 
                  onChange={e=>setLauncher({...launcher, threads:Number(e.target.value)})}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input 
                  type="checkbox" 
                  checked={launcher.apiServer} 
                  onChange={e=>setLauncher({...launcher, apiServer:e.target.checked})}
                />
                <span className="text-sm text-gray-700">--api-server</span>
                <input 
                  type="checkbox" 
                  className="ml-4" 
                  checked={launcher.visionMode} 
                  onChange={e=>setLauncher({...launcher, visionMode:e.target.checked})}
                />
                <span className="text-sm text-gray-700">Vision mode</span>
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Extra args</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  placeholder="--parallel 4 --batch-size 256" 
                  value={launcher.extraArgs} 
                  onChange={e=>setLauncher({...launcher, extraArgs:e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Working dir</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={launcher.workingDir} 
                  onChange={e=>setLauncher({...launcher, workingDir:e.target.value})}
                />
              </div>
            </div>

            {/* One-liner preview */}
            <div className="mt-3 p-2 bg-black text-green-400 text-xs font-mono rounded">
              {buildOneLiner()}
            </div>

            <div className="flex gap-2 mt-3">
              <button 
                onClick={launchProcess} 
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Play className="w-4 h-4"/> Launch
              </button>
              <button 
                onClick={stopProcess} 
                className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
              >
                <Square className="w-4 h-4"/> Stop
              </button>
              <button 
                onClick={() => runnerId && testServerConnection(runnerId)} 
                className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 flex items-center gap-2"
                disabled={!runnerId}
              >
                <Wifi className="w-4 h-4"/> Ping
              </button>
            </div>
          </div>

          {/* Prompts & Presets */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-gray-700" />
              <h3 className="font-semibold text-gray-800">Prompts & Presets</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">System prompt</label>
                <textarea 
                  rows={3} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={prompts.system} 
                  onChange={e=>setPrompts({...prompts, system:e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Developer prompt</label>
                <textarea 
                  rows={2} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={prompts.developer} 
                  onChange={e=>setPrompts({...prompts, developer:e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">User template</label>
                <textarea 
                  rows={2} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  placeholder="npr. Analiziraj… i vrati JSON" 
                  value={prompts.userTemplate} 
                  onChange={e=>setPrompts({...prompts, userTemplate:e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button 
                onClick={() => {
                  if (!activeSession) { 
                    addLog('warning','Nema aktivne sesije'); 
                    return; 
                  }
                  updateSession(activeSessionId, { systemPrompt: prompts.system });
                  addLog('success','System prompt primijenjen na aktivnu sesiju');
                }} 
                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Primijeni na sesiju
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('llm_prompt_preset', JSON.stringify(prompts));
                  addLog('success','Preset spremljen');
                }} 
                className="px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
              >
                Spremi
              </button>
              <button 
                onClick={() => {
                  const p = localStorage.getItem('llm_prompt_preset');
                  if (p) {
                    setPrompts(JSON.parse(p));
                    addLog('success','Preset učitan');
                  }
                }} 
                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Učitaj
              </button>
            </div>
          </div>

          {/* .BAT & Live Logs */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-gray-700" />
              <h3 className="font-semibold text-gray-800">.BAT & Live Log</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">.bat path</label>
                <input 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                  value={batPath} 
                  onChange={e=>setBatPath(e.target.value)} 
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={runBat} 
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                >
                  <Zap className="w-4 h-4" />
                  Run .bat
                </button>
                <button 
                  onClick={() => setRunnerLogs([])} 
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              </div>
              <div className="h-32 bg-black text-green-400 text-xs font-mono p-2 rounded overflow-auto">
                {runnerLogs.length ? (
                  runnerLogs.map((line, i) => (
                    <div key={i} className="whitespace-pre-wrap">{line}</div>
                  ))
                ) : (
                  <span className="text-gray-400">No log…</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Manager Panel */}
      {showSessionManager && (
        <div className="p-4 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-purple-800">LLM Session Manager</h2>
              <span className="px-2 py-1 bg-purple-200 text-purple-700 rounded text-sm">
                {sessions.length} sesija, {sessions.filter(s => s.status === 'active').length} aktivno
              </span>
            </div>
            
            {/* Session Test Panel */}
            <div className="flex items-center gap-3">
              {activeSession && (
                <>
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Test poruka..."
                    className="px-3 py-1 border border-purple-300 rounded text-sm w-64"
                  />
                  <button
                    onClick={handleTestActiveSession}
                    disabled={isTestingSession}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm"
                  >
                    <TestTube className="w-4 h-4" />
                    {isTestingSession ? 'Testiram...' : 'Test sesije'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Active Session Info */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <h3 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Aktivna Sesija
              </h3>
              {activeSession ? (
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {activeSessionId?.slice(-8)}...</div>
                  <div><strong>Engine:</strong> {activeSession.engineType}</div>
                  <div><strong>Model:</strong> {activeSession.selectedModel}</div>
                  <div><strong>URL:</strong> {activeSession.baseUrl}</div>
                  <div><strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      activeSession.status === 'active' ? 'bg-green-100 text-green-700' :
                      activeSession.status === 'error' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {activeSession.status}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setActiveSession(null)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                    >
                      Deaktiviraj
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm italic">Nema aktivne sesije</p>
              )}
            </div>

            {/* Available Sessions */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <h3 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Dostupne Sesije
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sessions.length > 0 ? sessions.map(session => (
                  <div 
                    key={session.sessionId} 
                    className={`p-2 rounded border text-sm cursor-pointer transition-colors ${
                      activeSessionId === session.sessionId 
                        ? 'border-purple-400 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => setActiveSession(session.sessionId)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{session.selectedModel}</span>
                      <span className={`px-1 py-0.5 rounded text-xs ${
                        session.status === 'active' ? 'bg-green-100 text-green-600' :
                        session.status === 'error' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {session.engineType} • {session.requestCount || 0} zahtjeva
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 text-sm italic">Nema kreiranih sesija</p>
                )}
              </div>
            </div>

            {/* Test Response */}
            <div className="bg-white rounded-lg p-4 border border-purple-200">
              <h3 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                Test Odgovor
              </h3>
              <div className="bg-gray-900 text-green-400 p-3 rounded text-sm font-mono h-32 overflow-y-auto">
                {isTestingSession ? (
                  <div className="flex items-center">
                    <div className="animate-spin w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full mr-2"></div>
                    Testiram sesiju...
                  </div>
                ) : testResponse ? (
                  <pre className="whitespace-pre-wrap">{testResponse}</pre>
                ) : (
                  <span className="text-gray-500">Nema test odgovora...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Servers List */}
        <div className="w-1/2 border-r border-gray-200 bg-white">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">LLM Serveri</h2>
            
            <div className="space-y-3">
              {servers.map(server => (
                <div 
                  key={server.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedServer?.id === server.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  onClick={() => setSelectedServer(server)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(server.status)}
                      <div>
                        <h3 className="font-medium text-gray-900">{server.name}</h3>
                        <p className="text-sm text-gray-500">{server.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(server.status)}`}>
                        {server.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditServer(server);
                        }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Uredi server"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteServer(server.id);
                        }}
                        disabled={server.status === 'running'}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        title="Obriši server"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Endpoint:</span>
                      <p className="font-mono text-xs text-blue-600">{server.endpoint}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Model:</span>
                      <p className="font-mono text-xs">{server.model}</p>
                    </div>
                  </div>

                  {server.status === 'running' && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-medium text-green-700">Uptime</div>
                        <div className="text-green-600">{formatUptime(server.lastStarted)}</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-medium text-blue-700">Zahtjevi</div>
                        <div className="text-blue-600">{server.requestCount}</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="font-medium text-red-700">Greške</div>
                        <div className="text-red-600">{server.errorCount}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Server Details and Controls */}
        <div className="w-1/2 flex flex-col">
          {selectedServer && (
            <>
              {/* Server Controls */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Kontrole servera - {selectedServer.name}
                </h3>

                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => handleStartServer(selectedServer.id)}
                    disabled={selectedServer.status === 'running' || isStartingServer === selectedServer.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    {isStartingServer === selectedServer.id ? 'Pokretanje...' : 'Pokreni'}
                  </button>

                  <button
                    onClick={() => handleStopServer(selectedServer.id)}
                    disabled={selectedServer.status !== 'running'}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Square className="w-4 h-4" />
                    Zaustavi
                  </button>

                  <button
                    onClick={() => handleRestartServer(selectedServer.id)}
                    disabled={selectedServer.status !== 'running'}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restartaj
                  </button>

                  <button
                    onClick={() => testServerConnection(selectedServer.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Wifi className="w-4 h-4" />
                    Test konekcije
                  </button>

                  <button
                    onClick={() => handleCreateSessionForServer(selectedServer.id)}
                    disabled={selectedServer.status !== 'running'}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <Brain className="w-4 h-4" />
                    Kreiraj sesiju
                  </button>
                </div>

                {/* Server Configuration */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Host:Port
                    </label>
                    <p className="text-sm font-mono text-gray-900">{selectedServer.host}:{selectedServer.port}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Tokens
                    </label>
                    <p className="text-sm text-gray-900">{selectedServer.maxTokens}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature
                    </label>
                    <p className="text-sm text-gray-900">{selectedServer.temperature}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedServer.status)}
                      <span className="text-sm text-gray-900">{selectedServer.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logs Section */}
              {showLogs && (
                <div className="flex-1 flex flex-col">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Server Logovi</span>
                      <span className="text-xs text-gray-500">({logs.length} zapisa)</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 bg-black text-green-400 font-mono text-sm">
                    {logs.length === 0 ? (
                      <div className="text-gray-500 italic">Nema logova za prikaz...</div>
                    ) : (
                      logs.map(log => (
                        <div key={log.id} className="mb-1 leading-relaxed">
                          <span className="text-gray-400">
                            [{formatTimestamp(log.timestamp)}]
                          </span>
                          <span className={`ml-2 ${getLogTypeColor(log.type)}`}>
                            [{log.type.toUpperCase()}]
                          </span>
                          <span className="ml-2 text-gray-300">
                            {log.message}
                          </span>
                          {log.serverId && (
                            <span className="ml-2 text-blue-400">
                              ({log.serverId})
                            </span>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Server Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingServer ? 'Uredi Server' : 'Dodaj Novi Server'}
              </h2>
              <button
                onClick={handleCancelForm}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ime servera *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Moj LLM Server"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tip servera
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const type = e.target.value;
                      handleFormChange('type', type);
                      applyTypePreset(type);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {serverTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Network Configuration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host
                  </label>
                  <input
                    type="text"
                    value={formData.host}
                    onChange={(e) => handleFormChange('host', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="localhost"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => handleFormChange('port', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>
              </div>

              {/* Model Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model *
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleFormChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="llama-3.1-8b-instruct"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ime modela koji će biti korišten za zahtjeve
                </p>
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => handleFormChange('maxTokens', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="32768"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maksimalan broj tokena za odgovor
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Temperature
                  </label>
                  <input
                    type="number"
                    value={formData.temperature}
                    onChange={(e) => handleFormChange('temperature', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="2"
                    step="0.1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Kreativnost odgovora (0.0 - 2.0)
                  </p>
                </div>
              </div>

              {/* Endpoint Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Endpoint Preview</span>
                </div>
                <p className="font-mono text-sm text-blue-600">
                  http://{formData.host}:{formData.port}
                </p>
              </div>

              {/* Type Presets Info */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Preset konfiguracije:</h4>
                <div className="grid grid-cols-2 gap-3 text-xs text-blue-700">
                  <div>
                    <strong>LM Studio:</strong> Port 1234, llama-3.1-8b-instruct
                  </div>
                  <div>
                    <strong>OpenWebUI:</strong> Port 8080, auto model selection
                  </div>
                  <div>
                    <strong>Ollama:</strong> Port 11434, llama3.1:8b
                  </div>
                  <div>
                    <strong>Custom:</strong> Port 5000, custom-model
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCancelForm}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Odustani
              </button>
              <button
                onClick={handleSaveServer}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingServer ? 'Spremi promjene' : 'Dodaj server'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMServerManager;
