import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Square, 
  Volume2, 
  Settings,
  Calendar,
  Users,
  FileText,
  BarChart3,
  X,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Button } from '../ui/Primitives';

const DOMAIN_OPTIONS = [
  {
    id: 'gantt',
    title: 'Gantt Planning',
    description: 'Upravljanje rasporedom montaže i resursa',
    icon: Calendar,
    color: 'blue',
    available: true
  },
  {
    id: 'users',
    title: 'User Management', 
    description: 'Upravljanje korisnicima i ulogama',
    icon: Users,
    color: 'green',
    available: false
  },
  {
    id: 'documents',
    title: 'Document Processing',
    description: 'Obrada računa i dokumenata',
    icon: FileText,
    color: 'orange',
    available: false
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Izvještaji i analitika',
    icon: BarChart3,
    color: 'purple',
    available: false
  }
];

const ORCHESTRATOR_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  DOMAIN_SELECTION: 'domain_selection',
  DOMAIN_ACTIVE: 'domain_active'
};

export default function VoiceOrchestrator({ onDomainSelect, children }) {
  const [state, setState] = useState(ORCHESTRATOR_STATES.IDLE);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  // Voice recording mock states
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio level animation during listening
  useEffect(() => {
    let interval;
    if (state === ORCHESTRATOR_STATES.LISTENING) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 150);
    } else {
      setAudioLevel(0);
    }
    return () => clearInterval(interval);
  }, [state]);

  // Mock transcript typing during processing
  useEffect(() => {
    if (state === ORCHESTRATOR_STATES.PROCESSING) {
      const targetText = "Trebam urediti raspored montaže za sljedeći tjedan, dodaj novu poziciju i provjeri preklapanja s ekipama.";
      let i = 0;
      setTranscript('');
      
      const typeInterval = setInterval(() => {
        setTranscript(prev => prev + targetText[i]);
        i++;
        if (i >= targetText.length) {
          clearInterval(typeInterval);
          // Auto transition to domain selection after typing completes
          setTimeout(() => {
            setState(ORCHESTRATOR_STATES.DOMAIN_SELECTION);
          }, 1000);
        }
      }, 30);
      
      return () => clearInterval(typeInterval);
    }
  }, [state]);

  const handleStartListening = useCallback(() => {
    setIsVisible(true);
    setState(ORCHESTRATOR_STATES.LISTENING);
    setTranscript('');
    
    // Mock: Auto transition to processing after 3 seconds
    setTimeout(() => {
      setState(ORCHESTRATOR_STATES.PROCESSING);
    }, 3000);
  }, []);

  const handleStopListening = useCallback(() => {
    setState(ORCHESTRATOR_STATES.IDLE);
    setTranscript('');
    setAudioLevel(0);
  }, []);

  const handleDomainSelect = useCallback((domain) => {
    setSelectedDomain(domain);
    setState(ORCHESTRATOR_STATES.DOMAIN_ACTIVE);
    
    // Notify parent component
    if (onDomainSelect) {
      onDomainSelect(domain);
    }
    
    // Hide overlay and let domain-specific component take over
    setTimeout(() => {
      setIsVisible(false);
    }, 500);
  }, [onDomainSelect]);

  const handleClose = useCallback(() => {
    setState(ORCHESTRATOR_STATES.IDLE);
    setIsVisible(false);
    setSelectedDomain(null);
    setTranscript('');
  }, []);

  // Floating activation button
  const ActivationButton = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <Button
        onClick={handleStartListening}
        disabled={state !== ORCHESTRATOR_STATES.IDLE}
        className={`
          rounded-full w-16 h-16 shadow-2xl transition-all duration-300 text-white flex items-center justify-center
          ${state === ORCHESTRATOR_STATES.LISTENING 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700'
          }
        `}
      >
        {state === ORCHESTRATOR_STATES.LISTENING ? (
          <Square className="w-6 h-6" />
        ) : (
          <Mic className="w-6 h-6" />
        )}
      </Button>
    </motion.div>
  );

  // Main overlay
  const Overlay = () => (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full max-w-4xl"
          >
            <div className="border-2 shadow-2xl bg-white rounded-lg p-6">
              <div className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Voice Orchestrator</h2>
                    <p className="text-gray-600 mt-1">
                      Glasovno upravljanje sustavom - odaberite domenu za editiranje
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded capitalize">
                      {state.replace('_', ' ')}
                    </span>
                    <Button className="p-2 hover:bg-gray-100 rounded" onClick={handleClose}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Voice Status Section */}
                <VoiceStatusSection 
                  state={state}
                  transcript={transcript}
                  audioLevel={audioLevel}
                  onStopListening={handleStopListening}
                />

                {/* Domain Selection */}
                {state === ORCHESTRATOR_STATES.DOMAIN_SELECTION && (
                  <DomainSelection onDomainSelect={handleDomainSelect} />
                )}

                {/* Domain Active State */}
                {state === ORCHESTRATOR_STATES.DOMAIN_ACTIVE && selectedDomain && (
                  <DomainActiveState domain={selectedDomain} />
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {children}
      <ActivationButton />
      <Overlay />
    </>
  );
}

// Voice Status Component
function VoiceStatusSection({ state, transcript, audioLevel, onStopListening }) {
  return (
    <div className="space-y-4">
      {/* Listening State */}
      {state === ORCHESTRATOR_STATES.LISTENING && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="relative">
            <motion.div
              className="w-32 h-32 rounded-full bg-red-500 mx-auto flex items-center justify-center"
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 0 rgba(239, 68, 68, 0.7)',
                  '0 0 0 20px rgba(239, 68, 68, 0)',
                  '0 0 0 0 rgba(239, 68, 68, 0)'
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Mic className="w-12 h-12 text-white" />
            </motion.div>
            
            {/* Audio level visualizer */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full mt-4">
              <div className="flex items-end gap-1 h-8">
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-2 bg-red-500 rounded-full"
                    animate={{
                      height: Math.random() * audioLevel * 0.32 + 4,
                      opacity: audioLevel > i * 8 ? 1 : 0.3
                    }}
                    transition={{ duration: 0.1 }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold">Slušam...</h3>
            <p className="text-gray-600">Govori jasno i opišite što trebate urediti</p>
            <Button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50" onClick={onStopListening}>
              <Square className="w-4 h-4 mr-2" />
              Prekini snimanje
            </Button>
          </div>
        </motion.div>
      )}

      {/* Processing State */}
      {state === ORCHESTRATOR_STATES.PROCESSING && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
            />
            <span className="font-medium">Obrađujem govor...</span>
          </div>

          <div className="bg-gray-100 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Prepoznati tekst:</div>
            <div className="font-mono text-sm">
              {transcript}
              <motion.span
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="ml-1"
              >
                |
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Domain Selection Component
function DomainSelection({ onDomainSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="text-center space-y-2">
        <Zap className="w-8 h-8 mx-auto text-blue-500" />
        <h3 className="text-xl font-semibold">Prepoznao sam intent za uređivanje</h3>
        <p className="text-gray-600">Odaberite domenu koju želite urediti:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DOMAIN_OPTIONS.map((domain) => {
          const IconComponent = domain.icon;

          return (
            <motion.div
              key={domain.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div 
                className={`
                  cursor-pointer transition-all duration-200 border rounded-lg p-4 bg-white
                  ${domain.available 
                    ? 'hover:shadow-lg hover:border-blue-300 hover:bg-blue-50' 
                    : 'opacity-50 cursor-not-allowed border-gray-200'
                  }
                `}
                onClick={domain.available ? () => onDomainSelect(domain) : undefined}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <IconComponent className="w-6 h-6 text-blue-600" />
                        <h4 className="font-semibold">{domain.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600">{domain.description}</p>
                      {!domain.available && (
                        <span className="text-xs px-2 py-1 bg-gray-200 rounded">Uskoro</span>
                      )}
                    </div>
                    {domain.available && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Domain Active State
function DomainActiveState({ domain }) {
  const IconComponent = domain.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-4"
    >
      <div className="space-y-2">
        <IconComponent className="w-12 h-12 mx-auto text-blue-600" />
        <h3 className="text-xl font-semibold">Aktiviram {domain.title}</h3>
        <p className="text-gray-600">Prebacujem na specijalizirani interface...</p>
      </div>
      
      <motion.div
        className="w-32 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden"
      >
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}