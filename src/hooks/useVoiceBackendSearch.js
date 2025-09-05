import { useState, useEffect, useRef, useCallback } from 'react';
import { detectIntent, extractEntities, fuzzyFindDoc } from '../utils/hr-nlu';
import { getAllDocs } from '../utils/knownDocs.db';

export function useVoiceBackendSearch() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [error, setError] = useState(null);
  const [backendStats, setBackendStats] = useState(null);
  
  const recognitionRef = useRef(null);

  // Load available documents from IndexedDB
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await getAllDocs();
      setAvailableDocuments(docs);
      console.log(`📚 Loaded ${docs.length} documents from IndexedDB`);
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
      setError('Failed to load documents from database');
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'hr-HR'; // Croatian language

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        console.log('🎯 Final transcript:', finalTranscript);
        processVoiceCommand(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🏁 Voice recognition ended');
      setIsListening(false);
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Process voice command using Croatian NLU
  const processVoiceCommand = useCallback(async (voiceText) => {
    if (!voiceText.trim()) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      console.log('🧠 Processing voice command:', voiceText);
      
      // Detect intent using Croatian NLU
      const intent = detectIntent(voiceText);
      const entities = extractEntities(voiceText);
      
      console.log('📝 Detected intent:', intent);
      console.log('📦 Extracted entities:', entities);

      switch (intent) {
        case 'send':
          await handleSendCommand(voiceText, entities);
          break;
        case 'select':
          await handleSelectCommand(voiceText, entities);
          break;
        case 'help':
          await handleHelpCommand(voiceText);
          break;
        default:
          await handleGeneralQuery(voiceText);
      }

    } catch (error) {
      console.error('❌ Voice command processing failed:', error);
      setError('Voice command processing failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [availableDocuments]);

  // Handle send command - send document to backend for processing
  const handleSendCommand = useCallback(async (voiceText, entities) => {
    console.log('📤 Processing send command...');
    
    let targetDoc = null;
    
    // Try to find document by name guess
    if (entities.nameGuess) {
      targetDoc = fuzzyFindDoc(entities.nameGuess, availableDocuments);
    }
    
    // If no specific document found, try to find newest
    if (!targetDoc && entities.wantsNewest) {
      // Sort by creation date and take newest
      const sortedDocs = [...availableDocuments].sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      targetDoc = sortedDocs[0];
    }

    if (!targetDoc) {
      setError(`Dokument nije pronađen. Pokušajte: "pošalji testnik.pdf" ili "pošalji najnoviji"`);
      return;
    }

    // Send to backend for processing
    try {
      const response = await fetch('/api/agent/smart-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentName: targetDoc.name,
          query: voiceText,
          language: 'hr'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setSearchResults([{
        type: 'backend_processing',
        document: targetDoc,
        query: voiceText,
        result: result,
        timestamp: new Date().toISOString()
      }]);

      console.log('✅ Document sent to backend:', result);

    } catch (error) {
      console.error('❌ Backend processing failed:', error);
      setError(`Greška pri slanju na backend: ${error.message}`);
    }
  }, [availableDocuments]);

  // Handle select command - find and display document info
  const handleSelectCommand = useCallback(async (voiceText, entities) => {
    console.log('🔍 Processing select command...');
    
    let targetDoc = null;
    
    if (entities.nameGuess) {
      targetDoc = fuzzyFindDoc(entities.nameGuess, availableDocuments);
    }

    if (!targetDoc) {
      // Show available documents
      setSearchResults([{
        type: 'document_list',
        documents: availableDocuments.slice(0, 10), // Show first 10
        query: voiceText,
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    setSearchResults([{
      type: 'document_selected',
      document: targetDoc,
      query: voiceText,
      timestamp: new Date().toISOString()
    }]);

  }, [availableDocuments]);

  // Handle help command
  const handleHelpCommand = useCallback(async (voiceText) => {
    console.log('❓ Processing help command...');
    
    setSearchResults([{
      type: 'help',
      query: voiceText,
      helpInfo: {
        commands: [
          { command: 'pošalji [naziv dokumenta]', description: 'Pošalji dokument na obradu' },
          { command: 'odaberi [naziv dokumenta]', description: 'Odaberi dokument za pregled' },
          { command: 'pošalji najnoviji', description: 'Pošalji najnoviji dokument' },
          { command: 'jasan zvuk', description: 'Potvrdi akciju' },
          { command: 'pomoć', description: 'Prikaži ovu pomoć' }
        ]
      },
      timestamp: new Date().toISOString()
    }]);

  }, []);

  // Handle general query - send to ChatGPT for general questions
  const handleGeneralQuery = useCallback(async (voiceText) => {
    console.log('💬 Processing general query...');
    
    try {
      const response = await fetch('/api/llm/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: voiceText,
          language: 'hr'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      setSearchResults([{
        type: 'general_response',
        query: voiceText,
        response: result.response || result.content || 'Nema odgovora',
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      console.error('❌ General query failed:', error);
      setError(`Greška pri obradi upita: ${error.message}`);
    }
  }, []);

  // Start voice recognition
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not available');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    setTranscript('');
    setSearchResults([]);
    setError(null);
    
    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('❌ Failed to start voice recognition:', error);
      setError('Failed to start voice recognition');
    }
  }, [isListening]);

  // Stop voice recognition
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  // Perform text search via backend
  const performTextSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    setTranscript(query);

    try {
      // Try to process as voice command first
      await processVoiceCommand(query);
    } catch (error) {
      console.error('❌ Text search failed:', error);
      setError('Text search failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [processVoiceCommand]);

  // Clear search results
  const clearResults = useCallback(() => {
    setSearchResults([]);
    setTranscript('');
    setError(null);
  }, []);

  // Get backend statistics
  const getBackendStats = useCallback(async () => {
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setBackendStats({
          totalDocuments: data.documents?.length || 0,
          availableTypes: data.stats?.types || {},
          lastScanned: data.lastScanned
        });
      }
    } catch (error) {
      console.error('❌ Failed to get backend stats:', error);
    }
  }, []);

  // Refresh documents from backend
  const refreshDocuments = useCallback(async () => {
    try {
      const response = await fetch('/api/documents/refresh', { method: 'POST' });
      if (response.ok) {
        await loadDocuments();
        await getBackendStats();
      }
    } catch (error) {
      console.error('❌ Failed to refresh documents:', error);
      setError('Failed to refresh documents');
    }
  }, []);

  return {
    // State
    isListening,
    isProcessing,
    transcript,
    searchResults,
    availableDocuments,
    error,
    backendStats,
    
    // Actions
    startListening,
    stopListening,
    performTextSearch,
    clearResults,
    refreshDocuments,
    
    // Computed
    hasResults: searchResults.length > 0,
    isReady: !error
  };
}

export default useVoiceBackendSearch;