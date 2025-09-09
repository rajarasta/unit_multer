import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ORCHESTRATOR_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening', 
  PROCESSING: 'processing',
  DOMAIN_SELECTION: 'domain_selection',
  DOMAIN_ACTIVE: 'domain_active'
};

const SUPPORTED_DOMAINS = [
  {
    id: 'gantt',
    route: '/gantt-agent',
    keywords: ['gantt', 'raspored', 'montaža', 'planiranje', 'pozicija', 'ekipa', 'termin'],
    confidence_threshold: 0.7
  },
  {
    id: 'iris3',
    route: '/iris3',
    keywords: ['schüco', 'schuco', 'aws', 'aluminij', 'prodaja', 'projektiranje', 'vrata', 'prozor', 'fasada', 'troškovnik'],
    confidence_threshold: 0.6,
    description: 'IRI S3 - Schüco aluminijski sistemi'
  },
  // Future domains
  {
    id: 'users',
    route: '/users',
    keywords: ['korisnik', 'user', 'uloga', 'dozvola'],
    confidence_threshold: 0.8,
    available: false
  }
];

export function useVoiceOrchestrator() {
  const navigate = useNavigate();
  const [state, setState] = useState(ORCHESTRATOR_STATES.IDLE);
  const [transcript, setTranscript] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Mock voice recognition
  const mockRecognition = useRef(null);
  const transcriptBuffer = useRef('');

  // Initialize mock voice recognition
  useEffect(() => {
    // In real implementation, this would be WebSpeech API or OpenAI Realtime
    mockRecognition.current = {
      start: () => {
        console.log('🎙️ Starting voice recognition (mock)');
        setState(ORCHESTRATOR_STATES.LISTENING);
        
        // Mock: simulate voice input after 3 seconds
        setTimeout(() => {
          setState(ORCHESTRATOR_STATES.PROCESSING);
          simulateTranscription();
        }, 3000);
      },
      
      stop: () => {
        console.log('🛑 Stopping voice recognition');
        setState(ORCHESTRATOR_STATES.IDLE);
        setTranscript('');
        transcriptBuffer.current = '';
      }
    };
  }, []);

  // Mock transcription simulation
  const simulateTranscription = useCallback(() => {
    const sampleInputs = [
      "Trebam urediti raspored montaže za sljedeći tjedan, dodaj novu poziciju P-004",
      "Pomakni gantt za sve ekipe, provjeri preklapanja s resursima", 
      "Planiranje montaže fasade, treba mi optimizacija terminâ",
      "Ažurirај gantt dijagram, nova pozicija horizontalne lamele",
      "Raspored montaže za projekt Voltaža, dvije ekipe dostupne",
      "Trebam analizu Schüco AWS 65 sistema za prozore",
      "Provjeri troškovnik za aluminijske vrata AD UP",
      "Projektiranje standardnih detalja za fasadni sistem",
      "Schuco prodaja za stambenu zgradu, trebam cijene"
    ];
    
    const selectedInput = sampleInputs[Math.floor(Math.random() * sampleInputs.length)];
    transcriptBuffer.current = selectedInput;
    
    let i = 0;
    setTranscript('');
    
    const typeInterval = setInterval(() => {
      setTranscript(prev => prev + selectedInput[i]);
      i++;
      
      if (i >= selectedInput.length) {
        clearInterval(typeInterval);
        // Process the complete transcript
        setTimeout(() => {
          processTranscript(selectedInput);
        }, 1000);
      }
    }, 40);
  }, []);

  // Process transcript and detect domain intent
  const processTranscript = useCallback((text) => {
    console.log('🧠 Processing transcript:', text);
    
    // Simple keyword matching (in real implementation would use NLU model)
    let bestMatch = null;
    let bestScore = 0;
    
    for (const domain of SUPPORTED_DOMAINS) {
      let score = 0;
      const words = text.toLowerCase().split(/\s+/);
      
      for (const keyword of domain.keywords) {
        if (words.some(word => word.includes(keyword) || keyword.includes(word))) {
          score += 1;
        }
      }
      
      // Normalize score by keyword count
      score = score / domain.keywords.length;
      
      if (score > bestScore && score >= domain.confidence_threshold) {
        bestScore = score;
        bestMatch = domain;
      }
    }
    
    setConfidence(bestScore);
    
    if (bestMatch && bestMatch.available !== false) {
      console.log(`✅ Detected domain: ${bestMatch.id} (confidence: ${bestScore})`);
      setSelectedDomain(bestMatch);
      setState(ORCHESTRATOR_STATES.DOMAIN_SELECTION);
    } else {
      console.log(`❓ No clear domain detected (best: ${bestScore})`);
      setState(ORCHESTRATOR_STATES.DOMAIN_SELECTION);
    }
  }, []);

  // Start voice orchestration
  const startListening = useCallback(() => {
    setIsVisible(true);
    if (mockRecognition.current) {
      mockRecognition.current.start();
    }
  }, []);

  // Stop voice orchestration  
  const stopListening = useCallback(() => {
    if (mockRecognition.current) {
      mockRecognition.current.stop();
    }
    setState(ORCHESTRATOR_STATES.IDLE);
    setIsVisible(false);
    setTranscript('');
    setSelectedDomain(null);
    setConfidence(0);
  }, []);

  // Handle domain selection
  const selectDomain = useCallback((domain) => {
    console.log(`🎯 Selecting domain: ${domain.id}`);
    setState(ORCHESTRATOR_STATES.DOMAIN_ACTIVE);
    
    // Navigate to domain-specific interface
    setTimeout(() => {
      setIsVisible(false);
      navigate(domain.route, { 
        state: { 
          fromOrchestrator: true,
          transcript: transcriptBuffer.current,
          confidence
        }
      });
      
      // Reset state after navigation
      setTimeout(() => {
        setState(ORCHESTRATOR_STATES.IDLE);
        setSelectedDomain(null);
        setTranscript('');
        setConfidence(0);
      }, 1000);
    }, 2000);
  }, [navigate, confidence]);

  // Auto-select domain if high confidence
  useEffect(() => {
    if (state === ORCHESTRATOR_STATES.DOMAIN_SELECTION && 
        selectedDomain && 
        confidence > 0.85) {
      console.log(`🚀 Auto-selecting high confidence domain: ${selectedDomain.id}`);
      setTimeout(() => {
        selectDomain(selectedDomain);
      }, 1500);
    }
  }, [state, selectedDomain, confidence, selectDomain]);

  return {
    state,
    transcript,
    selectedDomain,
    confidence,
    isVisible,
    startListening,
    stopListening,
    selectDomain,
    
    // State checks
    isListening: state === ORCHESTRATOR_STATES.LISTENING,
    isProcessing: state === ORCHESTRATOR_STATES.PROCESSING,
    needsDomainSelection: state === ORCHESTRATOR_STATES.DOMAIN_SELECTION,
    isDomainActive: state === ORCHESTRATOR_STATES.DOMAIN_ACTIVE,
    
    // Available domains
    availableDomains: SUPPORTED_DOMAINS.filter(d => d.available !== false)
  };
}