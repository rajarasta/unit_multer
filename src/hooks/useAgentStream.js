import { useState, useEffect, useCallback, useRef } from 'react';
import AgentOrchestrator from '../services/AgentOrchestrator';

/**
 * Hook za streaming AI agent rezultata u real-time
 * @param {Array} tasks - Lista taskova za izvršavanje
 * @param {Function} onResult - Callback kad stigne rezultat
 * @param {Function} onError - Callback za greške
 * @param {Function} onComplete - Callback kad se završi stream
 */
export function useAgentStream(tasks, onResult, onError, onComplete) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  const startStream = useCallback(() => {
    if (!tasks || tasks.length === 0) return;

    setIsStreaming(true);
    setProgress(0);
    setResults([]);

    const tasksParam = encodeURIComponent(JSON.stringify(tasks));
    const eventSource = new EventSource(`/api/agent/stream?tasks=${tasksParam}`);

    eventSource.addEventListener('start', (e) => {
      const data = JSON.parse(e.data);
      console.log(`🌊 Stream started for ${data.total} tasks`);
    });

    eventSource.addEventListener('result', (e) => {
      const data = JSON.parse(e.data);
      console.log(`✅ Result ${data.taskIndex}:`, data.result);
      
      setResults(prev => [...prev, data]);
      setProgress(data.progress || 0);
      
      if (onResult) onResult(data);
    });

    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse(e.data);
      console.error(`❌ Task ${data.taskIndex} error:`, data.error);
      
      if (onError) onError(data);
    });

    eventSource.addEventListener('complete', (e) => {
      console.log('🏁 Stream completed');
      setIsStreaming(false);
      eventSource.close();
      
      if (onComplete) onComplete(results);
    });

    eventSource.onerror = (error) => {
      console.error('❌ EventSource error:', error);
      setIsStreaming(false);
      eventSource.close();
      
      if (onError) onError({ error: 'Stream connection failed' });
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [tasks, onResult, onError, onComplete, results]);

  return {
    isStreaming,
    progress,
    results,
    startStream
  };
}

/**
 * Hook za multi-task batch processing (bez streaminga)
 */
export function useAgentMulti() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);

  const processTasks = useCallback(async (tasks, files = []) => {
    if (!tasks || tasks.length === 0) return [];

    setIsProcessing(true);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('tasks', JSON.stringify(tasks));
      
      // Dodaj datoteke ako ih ima
      files.forEach((file, index) => {
        if (file) formData.append('files', file);
      });

      const response = await fetch('/api/agent/multi', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data.results);
      return data.results;

    } catch (error) {
      console.error('❌ Multi-task error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    results,
    processTasks
  };
}

/**
 * Hook za smart routing (jedan input → auto-detektira tip)
 */
export function useSmartRoute() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const route = useCallback(async (prompt, file = null) => {
    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      if (prompt) formData.append('prompt', prompt);
      if (file) formData.append('file', file);

      const response = await fetch('/api/agent/route', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
      return data;

    } catch (error) {
      console.error('❌ Route error:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    result,
    route
  };
}

/**
 * Advanced hook za orchestrator s local processing i routing
 */
export function useAgentOrchestrator() {
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orchestratorStats, setOrchestratorStats] = useState(null);
  const [error, setError] = useState(null);
  
  const orchestratorRef = useRef(null);
  const streamIdRef = useRef(null);

  // Inicijaliziraj orchestrator
  useEffect(() => {
    orchestratorRef.current = new AgentOrchestrator();
    
    return () => {
      if (streamIdRef.current) {
        orchestratorRef.current?.stopStream(streamIdRef.current);
      }
    };
  }, []);

  // Local streaming (koristi AgentOrchestrator)
  const processLocalStream = useCallback(async (tasks) => {
    if (!orchestratorRef.current) return;
    
    setIsProcessing(true);
    setResults([]);
    setError(null);
    
    const startTime = Date.now();
    streamIdRef.current = `local_stream_${startTime}`;
    
    try {
      await orchestratorRef.current.streamMultipleRequests(
        tasks,
        // onResult - čim stigne rezultat
        (resultData) => {          
          setResults(prev => {
            const newResults = [...prev];
            
            if (resultData.event === 'result') {
              newResults[resultData.taskId] = {
                taskId: resultData.taskId,
                status: 'completed',
                data: resultData.data,
                timestamp: resultData.timestamp
              };
            } else if (resultData.event === 'error') {
              newResults[resultData.taskId] = {
                taskId: resultData.taskId,
                status: 'failed', 
                error: resultData.error,
                timestamp: resultData.timestamp
              };
            }
            
            return newResults;
          });
        },
        // onComplete - sve završeno
        (stats) => {
          setOrchestratorStats({
            ...stats,
            totalDuration: Date.now() - startTime
          });
          
          setIsProcessing(false);
          streamIdRef.current = null;
        }
      );
      
    } catch (err) {
      console.error('❌ Local stream error:', err);
      setError(err.message);
      setIsProcessing(false);
    }
  }, []);

  // Batch processing (paralelno, ali čeka sve)
  const processBatch = useCallback(async (tasks) => {
    if (!orchestratorRef.current) return [];
    
    setIsProcessing(true);
    setResults([]);
    setError(null);
    
    try {
      const startTime = Date.now();
      const batchResults = await orchestratorRef.current.processMultipleRequests(tasks);
      
      setResults(batchResults.map((result, index) => ({
        taskId: index,
        status: result.status === 'fulfilled' ? 'completed' : 'failed',
        data: result.status === 'fulfilled' ? result.data : null,
        error: result.status === 'rejected' ? result.error : null
      })));
      
      setOrchestratorStats({
        totalTasks: tasks.length,
        completed: batchResults.filter(r => r.status === 'fulfilled').length,
        failed: batchResults.filter(r => r.status === 'rejected').length,
        totalDuration: Date.now() - startTime,
        mode: 'batch'
      });
      
      setIsProcessing(false);
      return batchResults;
      
    } catch (err) {
      console.error('❌ Batch error:', err);
      setError(err.message);
      setIsProcessing(false);
      return [];
    }
  }, []);

  // Jedan zahtjev s routing logikom
  const routeRequest = useCallback(async (input) => {
    if (!orchestratorRef.current) return null;
    
    try {
      const result = await orchestratorRef.current.routeLLMRequest(input);
      return result;
    } catch (err) {
      console.error('❌ Route error:', err);
      throw err;
    }
  }, []);

  const stopProcessing = useCallback(() => {
    if (orchestratorRef.current && streamIdRef.current) {
      orchestratorRef.current.stopStream(streamIdRef.current);
      setIsProcessing(false);
    }
  }, []);

  const getStats = useCallback(() => {
    return orchestratorRef.current?.getStats() || {};
  }, []);

  return {
    results,
    isProcessing,
    orchestratorStats,
    error,
    processLocalStream,
    processBatch,
    routeRequest,
    stopProcessing,
    getStats
  };
}

/**
 * IRIS3 Specific API Integration Hook
 * Extends useAgentStream with Schüco/projektiranje functionality
 * Used by: IRIS3 tab, future Schüco integrations
 */
export function useIRIS3ApiIntegration() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiData, setApiData] = useState({
    lastPayload: null,
    lastResponse: null,
    timestamp: null
  });
  const [chatHistory, setChatHistory] = useState([]);
  
  /**
   * Sends request to OpenAI API via /api/llm/draft endpoint
   */
  const sendApiRequest = useCallback(async (payload) => {
    if (!payload || !payload.command) {
      throw new Error('Invalid payload: command is required');
    }
    
    setIsProcessing(true);
    setApiData(prev => ({
      ...prev,
      lastPayload: payload,
      lastResponse: null,
      timestamp: new Date().toLocaleTimeString()
    }));
    
    try {
      const response = await fetch('/api/llm/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      setApiData(prev => ({
        ...prev,
        lastResponse: {
          status: response.ok ? 'success' : 'error',
          ...result
        }
      }));
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP ${response.status}`);
      }
      
      return result;
    } catch (error) {
      const errorResponse = {
        status: 'error',
        message: error.message,
        error: error
      };
      
      setApiData(prev => ({
        ...prev,
        lastResponse: errorResponse
      }));
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  /**
   * Adds entry to chat history
   */
  const addChatEntry = useCallback((entry) => {
    const chatEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      ...entry
    };
    
    setChatHistory(prev => [...prev, chatEntry]);
  }, []);
  
  /**
   * Processes Schüco analysis command
   */
  const processSchutoAnalysis = useCallback(async (transcript, activeTab) => {
    const systemPrompt = `Ti si specijalist za SCHÜCO aluminijske sustave. Analiziraj korisnikov glasovni unos.

VAŽNO: Korisnik traži SCHÜCO aluminijske profile za gradnju, NE IT sustave!

DOSTUPNI SCHÜCO SISTEMI:
- AD UP (aluminijski sistem za vrata)
- AWS 50 (prozorski sistem) 
- AWS 65 (prozorski sistem)
- AWS 70 (prozorski sistem)
- FW 50+ SG (fasadni sistem)
- FWS 50 S (fasadni sistem)
- FWS 50 (fasadni sistem)

Analiziraj transkript: "${transcript}"

OBAVEZNO vrati TOČNO ovaj JSON format (ništa drugo):

{
  "analysis": {
    "sistema_considered": ["AWS 50", "AWS 65", "AWS 70"],
    "sistema_selected": "AWS 65",
    "reasoning": "Korisnik je spomenuo..."
  },
  "tip": {
    "considered": ["vrata", "prozor", "fasada"],
    "selected": "prozor",
    "reasoning": "Na temelju konteksta..."
  },
  "brochure": {
    "system": "AWS 65"
  },
  "pricing": {
    "materijal": 1200,
    "staklo": 650,
    "rad": 450,
    "total": 2300,
    "currency": "EUR"
  },
  "location": "Zagreb, Hrvatska"
}`;
    
    const payload = {
      command: transcript,
      tool_call: 'schuco_analysis',
      context: {
        active_tab: activeTab,
        system_prompt: systemPrompt,
        location: "Zagreb, Hrvatska",
        timestamp: new Date().toISOString()
      }
    };
    
    return await sendApiRequest(payload);
  }, [sendApiRequest]);
  
  /**
   * Processes projektiranje command
   */
  const processProjektiranjeCommand = useCallback(async (transcript, activeTab, currentSystem) => {
    const systemPrompt = `Ti si SCHÜCO projektant specijalist za standardne detalje.
Tvoja uloga je obrada glasovnih naredbi za projektiranje aluminijskih sustava.

DOSTUPNE NAREDBE:
- "Primjeni standardne detalje" - učitaj standardne detalje za trenutni sistem
- "Promijeni donji detalj" - prebaci na donji_detalj2
- "Promijeni gornji detalj" - prebaci na gornji_detalj2
- "Vrati na originalne detalje" - vrati donji_detalj1 i gornji_detalj1

Trenutni sistem: ${currentSystem || 'N/A'}
Komanda: "${transcript}"`;
    
    const payload = {
      command: transcript,
      tool_call: 'projektiranje_details',
      context: {
        active_tab: activeTab,
        system_prompt: systemPrompt,
        current_system: currentSystem,
        timestamp: new Date().toISOString()
      }
    };
    
    return await sendApiRequest(payload);
  }, [sendApiRequest]);
  
  /**
   * Processes general IRI S3 command
   */
  const processGeneralCommand = useCallback(async (transcript, activeTab) => {
    const systemPrompt = `Ti si AI asistent za IRI S3 sistem (Intelligent Resource Integration - Storage 3).
Tvoja uloga je da pomogneš korisnicima sa pitanjima vezanim za:
- Upravljanje resursima i skladištem
- S3 storage sisteme  
- Prodaju, projektovanje, pripremu i proizvodnju
- Opšta pitanja vezana za poslovne procese

Odgovaraj kratko i jasno na hrvatskom jeziku. Trenutno aktivni tab je: ${activeTab}`;
    
    const payload = {
      command: transcript,
      context: {
        active_tab: activeTab,
        system_prompt: systemPrompt,
        timestamp: new Date().toISOString()
      }
    };
    
    return await sendApiRequest(payload);
  }, [sendApiRequest]);
  
  /**
   * Clears chat history
   */
  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);
  
  /**
   * Clears API data
   */
  const clearApiData = useCallback(() => {
    setApiData({
      lastPayload: null,
      lastResponse: null,
      timestamp: null
    });
  }, []);
  
  return {
    // State
    isProcessing,
    apiData,
    chatHistory,
    
    // Actions
    sendApiRequest,
    addChatEntry,
    clearChatHistory,
    clearApiData,
    
    // Specialized processors
    processSchutoAnalysis,
    processProjektiranjeCommand,
    processGeneralCommand
  };
}

export default useAgentStream;