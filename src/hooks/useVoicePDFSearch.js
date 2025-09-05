import { useState, useEffect, useRef, useCallback } from 'react';
import pdfSearchEngine from '../services/PDFSearchEngine';

export function useVoicePDFSearch() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [engineStats, setEngineStats] = useState(null);
  
  const recognitionRef = useRef(null);
  const isEngineInitialized = useRef(false);

  // Initialize PDF search engine
  useEffect(() => {
    const initEngine = async () => {
      if (!isEngineInitialized.current) {
        console.log('🔄 Initializing PDF Search Engine...');
        try {
          await pdfSearchEngine.initialize();
          setEngineStats(pdfSearchEngine.getStats());
          isEngineInitialized.current = true;
          console.log('✅ PDF Search Engine ready!');
        } catch (error) {
          console.error('❌ Failed to initialize PDF Search Engine:', error);
          setError('Failed to initialize PDF search engine');
        }
      }
    };

    initEngine();
  }, []);

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
    recognition.lang = 'hr-HR'; // Croatian language for PDF search

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
        performVoiceSearch(finalTranscript);
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

  // Perform voice search on PDF content
  const performVoiceSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      console.log('🔍 Searching PDFs for:', query);
      const results = await pdfSearchEngine.voiceSearch(query);
      
      setSearchResults(results);
      setEngineStats(pdfSearchEngine.getStats());
      
      console.log(`✅ Found ${results.length} results`);
    } catch (error) {
      console.error('❌ Voice search failed:', error);
      setError('Voice search failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Manual text search
  const performTextSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    setTranscript(query);

    try {
      const results = await pdfSearchEngine.textSearch(query);
      setSearchResults(results);
      setEngineStats(pdfSearchEngine.getStats());
    } catch (error) {
      console.error('❌ Text search failed:', error);
      setError('Text search failed: ' + error.message);
    } finally {
      setIsProcessing(false);
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

  // Clear search results
  const clearResults = useCallback(() => {
    setSearchResults([]);
    setTranscript('');
    setError(null);
  }, []);

  // Get loaded PDFs info
  const getLoadedPDFs = useCallback(() => {
    return pdfSearchEngine.getLoadedPDFs();
  }, []);

  return {
    // State
    isListening,
    isProcessing,
    transcript,
    searchResults,
    error,
    engineStats,
    
    // Actions
    startListening,
    stopListening,
    performTextSearch,
    clearResults,
    getLoadedPDFs,
    
    // Computed
    hasResults: searchResults.length > 0,
    isReady: isEngineInitialized.current && !error
  };
}

export default useVoicePDFSearch;