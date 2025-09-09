/**
 * useVoiceRecognition Hook
 * Manages speech recognition functionality for IRIS3
 * Handles start/stop, transcript processing, and recognition events
 */

import { useState, useRef } from 'react';

export const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);

  const startVoiceRecognition = (onTranscriptComplete) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.error('Speech Recognition not supported');
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'hr-HR';
    
    recognition.onstart = () => {
      setCurrentTranscript('Slušam...');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        setCurrentTranscript(interimTranscript);
      }

      if (finalTranscript.trim()) {
        onTranscriptComplete?.(finalTranscript.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setCurrentTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setCurrentTranscript('');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setCurrentTranscript('');
  };

  const toggleListening = (onTranscriptComplete) => {
    if (isListening) {
      stopVoiceRecognition();
    } else {
      setIsListening(true);
      startVoiceRecognition(onTranscriptComplete);
    }
  };

  return {
    isListening,
    currentTranscript,
    isProcessing,
    setIsProcessing,
    startVoiceRecognition,
    stopVoiceRecognition,
    toggleListening
  };
};

export default useVoiceRecognition;