import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Search, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  Mic, 
  Brain,
  Zap,
  Sparkles,
  Target,
  Download,
  Clock,
  Globe
} from 'lucide-react';
import { detectIntent, extractEntities, fuzzyFindDoc } from '../../utils/hr-nlu';
import { getAllDocs, putDoc, deleteDoc, generateId, addDoc, hasFileSystemAccess, ensureReadPermission } from '../../utils/knownDocs.db';
import useVoiceBackendSearch from '../../hooks/useVoiceBackendSearch';

export default function VoiceAgentHR() {
  const [activeTab, setActiveTab] = useState('agent');
  
  return (
    <div className="h-full p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Glasovni Agent HR
        </h1>
        <p className="text-gray-600 mt-1 text-lg">
          Hrvatski glasovni agent sa vizualizacijom i prepoznavanjem dokumenata
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
        {[
          { id: 'agent', label: 'Agent Workflow', icon: Brain },
          { id: 'pdf', label: 'PDF Izvlačenje', icon: FileText },
          { id: 'search', label: 'Pretraživanje', icon: Search },
          { id: 'online-llm', label: 'Online LLM', icon: Globe }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all font-medium ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="h-[calc(100vh-220px)] overflow-y-auto">
        {activeTab === 'agent' && <AgentWorkflowDemo />}
        {activeTab === 'pdf' && <VisualPDFDemo />}
        {activeTab === 'search' && <VoiceDocumentSearch />}
        {activeTab === 'online-llm' && <OnlineLLMProcessor />}
      </div>
    </div>
  );
}

// Agent Workflow Demo komponenta
const AgentWorkflowDemo = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [demoMode, setDemoMode] = useState('visual');

  const agentSteps = [
    {
      id: 'thinking',
      title: 'Razmišljanje',
      description: 'Agent analizira zadatak i planira pristup',
      color: 'blue',
      duration: 2000,
      logs: [
        'Analiziram korisnikov zahtjev...',
        'Identificiram potrebne alate...',
        'Planiram redoslijed izvršavanja...'
      ]
    },
    {
      id: 'research',
      title: 'Istraživanje',
      description: 'Pretražuje bazu znanja i externe izvore',
      color: 'green',
      duration: 3000,
      logs: [
        'Pretražujem bazu znanja...',
        'Analiziram relevantne dokumente...',
        'Prikupljam kontekst...'
      ]
    },
    {
      id: 'processing',
      title: 'Obrada',
      description: 'Obrađuje podatke i generira rješenja',
      color: 'orange',
      duration: 2500,
      logs: [
        'Obrađujem podatke...',
        'Generiram moguća rješenja...',
        'Evaluiram opcije...'
      ]
    },
    {
      id: 'validation',
      title: 'Validacija',
      description: 'Provjerava rezultate i sigurnost',
      color: 'purple',
      duration: 1500,
      logs: [
        'Validiram rezultate...',
        'Provjeravam sigurnosne aspekte...',
        'Finalizam odgovor...'
      ]
    },
    {
      id: 'complete',
      title: 'Završeno',
      description: 'Agent je završio s izvršavanjem zadatka',
      color: 'green',
      duration: 500,
      logs: [
        'Zadatak uspješno završen!',
        'Rezultati pripremljeni za prikaz.',
        'Agent spreman za sljedeći zadatak.'
      ]
    }
  ];

  const startDemo = () => {
    setIsRunning(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setLogs(['🚀 Agent pokrenuo izvršavanje zadatka...']);
    
    let step = 0;
    const executeStep = () => {
      if (step < agentSteps.length) {
        const currentAgentStep = agentSteps[step];
        setCurrentStep(step);
        
        // Dodaj step logove postupno
        if (currentAgentStep.logs) {
          currentAgentStep.logs.forEach((log, index) => {
            setTimeout(() => {
              setLogs(prev => [...prev, `[${currentAgentStep.title}] ${log}`]);
            }, index * 400);
          });
        }

        setTimeout(() => {
          setCompletedSteps(prev => [...prev, step]);
          step++;
          if (step < agentSteps.length) {
            executeStep();
          } else {
            setIsRunning(false);
            setCurrentStep(-1);
          }
        }, currentAgentStep.duration);
      }
    };
    
    executeStep();
  };

  const resetDemo = () => {
    setIsRunning(false);
    setCurrentStep(-1);
    setCompletedSteps([]);
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Agent Workflow Simulator</h3>
          <div className="flex items-center gap-3">
            <select 
              value={demoMode} 
              onChange={(e) => setDemoMode(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              disabled={isRunning}
            >
              <option value="visual">👁️ Visual Demo</option>
              <option value="streaming">🎯 Real Streaming</option>
              <option value="batch">📦 Batch Processing</option>
            </select>
            
            <button
              onClick={startDemo}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg"
            >
              <Play className="w-4 h-4" />
              Pokreni Demo
            </button>
            <button
              onClick={resetDemo}
              className="flex items-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          {agentSteps.map((step, index) => {
            const isActive = currentStep === index;
            const isCompleted = completedSteps.includes(index);
            
            const colorMap = {
              blue: 'from-blue-500 to-blue-600',
              green: 'from-green-500 to-green-600',
              orange: 'from-orange-500 to-orange-600',
              purple: 'from-purple-500 to-purple-600'
            };
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ 
                  opacity: isActive || isCompleted ? 1 : 0.6,
                  scale: isActive ? 1.05 : 1
                }}
                className={`relative p-6 rounded-xl border-2 transition-all ${
                  isActive 
                    ? 'border-yellow-400 shadow-lg bg-gradient-to-br from-yellow-100 to-yellow-200' 
                    : isCompleted 
                      ? 'border-green-400 bg-gradient-to-br from-green-100 to-green-200'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-3 rounded-full mb-3 ${
                    isActive 
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                      : isCompleted 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}>
                    {isActive ? <Zap className="w-6 h-6" /> :
                     isCompleted ? <CheckCircle className="w-6 h-6" /> :
                     <Brain className="w-6 h-6" />}
                  </div>
                  <h4 className="font-semibold text-sm mb-2">{step.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
                  
                  {isActive && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-2 -right-2"
                    >
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                    </motion.div>
                  )}
                  
                  {isCompleted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2"
                    >
                      <CheckCircle className="w-6 h-6 text-green-500 bg-white rounded-full" />
                    </motion.div>
                  )}
                </div>
                
                {index < agentSteps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                    <ArrowRight className={`w-4 h-4 ${
                      isCompleted ? 'text-green-500' : 'text-gray-300'
                    }`} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Live Logs */}
        <div className="bg-gray-900 rounded-xl p-6 h-64 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-mono font-semibold">Agent Console</span>
          </div>
          <div className="space-y-1 font-mono text-sm">
            <AnimatePresence>
              {logs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-gray-300"
                >
                  <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {log}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Orchestrator Modes</h4>
          <div className="text-blue-800 text-sm space-y-2">
            <p><strong>🎯 Real Streaming:</strong> Rezultati stižu čim se završe</p>
            <p><strong>📦 Batch Processing:</strong> Paralelno izvršavanje, čeka sve taskove</p>
            <p><strong>👁️ Visual Demo:</strong> Step-by-step prikaz</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Hrvatski Glasovni Unos</h4>
          <div className="text-green-800 text-sm space-y-2">
            <p><strong>Pošalji:</strong> "pošalji testnik.pdf"</p>
            <p><strong>Odaberi:</strong> "odaberi ponuda 001"</p>  
            <p><strong>Potvrdi:</strong> "jasan zvuk"</p>
            <p><strong>Poništi:</strong> "poništi", "stop"</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Visual PDF Demo komponenta  
const VisualPDFDemo = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedParagraphs, setExtractedParagraphs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedSection, setHighlightedSection] = useState(null);
  const [floatingTexts, setFloatingTexts] = useState([]);

  const mockPDFPages = [
    {
      id: 1,
      title: "Račun Aluminijski Profili AGS d.o.o.",
      sections: [
        {
          id: 'invoice-1',
          text: "Račun br: 2024-00158 | Datum: 15.03.2024 | Kupac: Građevno poduzeće Rijeka",
          position: { top: '15%', left: '10%', width: '80%' },
          category: 'header'
        },
        {
          id: 'invoice-2', 
          text: "ALP-6060-T5 profil 50x30x2mm - 25 kom x 12.50 EUR = 312.50 EUR",
          position: { top: '35%', left: '10%', width: '75%' },
          category: 'item'
        },
        {
          id: 'invoice-3',
          text: "Prašno lakiranje RAL 7016 - 5.5 m² x 18.00 EUR = 99.00 EUR",
          position: { top: '55%', left: '10%', width: '70%' },
          category: 'service'
        },
        {
          id: 'invoice-4',
          text: "UKUPNO: 411.50 EUR + PDV 25% = 514.38 EUR",
          position: { top: '75%', left: '10%', width: '85%' },
          category: 'total'
        }
      ]
    }
  ];

  const categoryColors = {
    header: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
    item: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
    service: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
    total: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' }
  };

  const startExtraction = async () => {
    setIsExtracting(true);
    setExtractedParagraphs([]);
    setFloatingTexts([]);
    
    for (let pageIndex = 0; pageIndex < mockPDFPages.length; pageIndex++) {
      const page = mockPDFPages[pageIndex];
      setCurrentPage(page.id);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      for (let sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex++) {
        const section = page.sections[sectionIndex];
        
        setHighlightedSection(section.id);
        
        const floatingId = `${section.id}-${Date.now()}`;
        setFloatingTexts(prev => [...prev, {
          id: floatingId,
          text: section.text,
          category: section.category,
          startPosition: section.position,
          timestamp: Date.now()
        }]);
        
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        setExtractedParagraphs(prev => [...prev, {
          id: section.id,
          text: section.text,
          category: section.category,
          page: page.id,
          pageTitle: page.title,
          extractedAt: Date.now()
        }]);
        
        setTimeout(() => {
          setFloatingTexts(prev => prev.filter(ft => ft.id !== floatingId));
        }, 2000);
        
        setHighlightedSection(null);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    setIsExtracting(false);
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-500" />
              Visual PDF Extraction Demo
            </h3>
            <p className="text-gray-600 mt-1">Gledaj kako AI agent izvlači paragrafe iz PDF-a u real-time</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={startExtraction}
              disabled={isExtracting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all shadow-lg"
            >
              <Zap className="w-4 h-4" />
              {isExtracting ? 'Izvlačenje...' : 'Pokreni Izvlačenje'}
            </button>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{currentPage}</div>
            <div className="text-xs text-blue-800">Trenutna stranica</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{extractedParagraphs.length}</div>
            <div className="text-xs text-green-800">Izvučeni paragrafi</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-600">{floatingTexts.length}</div>
            <div className="text-xs text-orange-800">Aktivne animacije</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((extractedParagraphs.length / 4) * 100)}%
            </div>
            <div className="text-xs text-purple-800">Progres</div>
          </div>
        </div>
      </div>

      {/* Main Demo Area */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* PDF Viewer Mock */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <FileText className="w-4 h-4 text-gray-600 ml-2" />
            <span className="text-sm text-gray-700">aluminum-invoice.pdf</span>
          </div>
          
          <div className="relative bg-gray-50 h-96 overflow-hidden">
            {mockPDFPages.find(p => p.id === currentPage)?.sections.map((section) => (
              <motion.div
                key={section.id}
                style={{
                  position: 'absolute',
                  top: section.position.top,
                  left: section.position.left,
                  width: section.position.width,
                }}
                className={`p-2 text-sm text-gray-700 rounded border transition-all duration-300 ${
                  highlightedSection === section.id
                    ? 'bg-yellow-100 border-yellow-400 shadow-lg scale-105 z-10'
                    : 'bg-gray-50 border-gray-200'
                }`}
                animate={{
                  scale: highlightedSection === section.id ? 1.05 : 1
                }}
              >
                {section.text}
              </motion.div>
            ))}
            
            {/* Floating Texts */}
            <AnimatePresence>
              {floatingTexts.map((floatingText) => (
                <motion.div
                  key={floatingText.id}
                  initial={{ 
                    opacity: 1,
                    top: floatingText.startPosition.top,
                    left: floatingText.startPosition.left,
                    position: 'absolute'
                  }}
                  animate={{
                    opacity: 0.8,
                    top: '10%',
                    left: '90%',
                    transform: 'translate(-50%, -50%)'
                  }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="text-xs bg-green-500 text-white p-2 rounded shadow-lg z-20 pointer-events-none max-w-48"
                >
                  📄 {floatingText.category}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <Download className="w-2 h-2 text-white" />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Extracted Results Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-4 py-3 rounded-t-xl">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Izvučeni Sadržaj
            </h4>
          </div>
          
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            <AnimatePresence>
              {extractedParagraphs.map((paragraph, index) => (
                <motion.div
                  key={paragraph.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                  className={`p-3 rounded-lg border-l-4 shadow-sm ${
                    categoryColors[paragraph.category]?.bg || 'bg-gray-100'
                  } ${
                    categoryColors[paragraph.category]?.border || 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      categoryColors[paragraph.category]?.text || 'text-gray-600'
                    }`}>
                      {paragraph.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      Str. {paragraph.page}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{paragraph.text}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    Izvučeno: {new Date(paragraph.extractedAt).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {extractedParagraphs.length === 0 && !isExtracting && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Pokreni demo da vidiš izvlačenje paragrafa</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Voice Document Search komponenta
const VoiceDocumentSearch = () => {
  const [knownDocs, setKnownDocs] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [pendingPickFor, setPendingPickFor] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recogRef = useRef(null);

  // Učitaj poznate dokumente
  useEffect(() => {
    getAllDocs().then(docs => setKnownDocs(docs));
  }, []);

  const speak = (text) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'hr-HR';
    window.speechSynthesis.speak(u);
  };

  const startVoice = () => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) {
      speak('Pregljednik ne podržava glasovni unos.');
      return;
    }
    
    const rec = new SR();
    rec.lang = 'hr-HR';
    rec.interimResults = false;
    rec.onresult = async (ev) => {
      const text = ev.results[0][0].transcript.trim();
      setTranscript(text);
      await handleCommand(text);
    };
    rec.onerror = (e) => console.warn('ASR error', e);
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.start();
    recogRef.current = rec;
  };

  const stopVoice = () => {
    recogRef.current?.stop();
    setIsListening(false);
  };

  const handleCommand = async (text) => {
    const intent = detectIntent(text);
    const { nameGuess, wantsNewest } = extractEntities(text);

    if (intent === 'cancel') {
      setPendingPickFor(null);
      setPendingAction(null);
      speak('U redu, otkazano.');
      return;
    }

    if (intent === 'help') {
      speak('Možeš reći: pošalji testnik.pdf, odaberi ponuda 001, potvrdi, poništi.');
      return;
    }

    if (intent === 'confirm') {
      if (pendingPickFor) {
        await pickAndSend();
        return;
      }
      if (pendingAction) {
        await runSend(pendingAction.docName);
        setPendingAction(null);
        return;
      }
      speak('Nemam što potvrditi.');
      return;
    }

    if (intent === 'send' || intent === 'select') {
      let doc = null;
      if (wantsNewest && knownDocs.length) {
        doc = knownDocs[knownDocs.length - 1];
      }
      if (!doc && nameGuess) {
        doc = fuzzyFindDoc(nameGuess, knownDocs);
      }

      if (doc?.handle || doc?.url) {
        setPendingAction({ intent: 'send', docName: doc.name });
        speak(`Pronašla sam ${doc.name}. Reci: jasan zvuk, za potvrdu.`);
        return;
      }

      // Trebamo klik za odabir
      setPendingPickFor(nameGuess || 'dokument');
      speak('Treba mi odabir. Dodirni gumb i odmah ću poslati.');
      return;
    }

    speak('Nisam sigurna, reci na primjer: pošalji testnik.pdf.');
  };

  const pickAndSend = async () => {
    try {
      if (!hasFileSystemAccess()) {
        speak('Pregljednik ne podržava odabir datoteka.');
        return;
      }
      
      const [handle] = await window.showOpenFilePicker({
        types: [{ 
          description: 'Dokumenti', 
          accept: { 
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/plain': ['.txt'] 
          } 
        }],
        multiple: false,
      });
      
      if (handle) {
        const file = await handle.getFile();
        
        // Dodaj dokument u IndexedDB za buduće korištenje
        const newDoc = await addDoc(file.name, handle);
        setKnownDocs(prev => [...prev, newDoc]);
        
        speak(`Dodala sam ${file.name} u listu poznatih dokumenata.`);
        
        await sendHandle(handle, { query: 'obradi dokument' });
        setPendingPickFor(null);
        speak('Dokument je poslan na obradu.');
      }
    } catch (e) {
      console.warn(e);
      speak('Nisam uspjela odabrati datoteku.');
    }
  };

  const runSend = async (name) => {
    const doc = name ? fuzzyFindDoc(name, knownDocs) : null;
    if (doc?.handle) {
      const hasPermission = await ensureReadPermission(doc.handle);
      if (!hasPermission) {
        speak('Treba odobrenje za čitanje dokumenta.');
        return;
      }
      await sendHandle(doc.handle, { query: `obradi ${name || ''}` });
      speak(`Poslala sam ${doc.name} na obradu.`);
    } else if (doc?.url) {
      await sendReference(doc.url, { query: `obradi ${name || ''}` });
      speak(`Poslala sam ${doc.name} na obradu.`);
    } else {
      speak('Ne mogu naći taj dokument.');
    }
  };

  const sendHandle = async (handle, extra) => {
    const file = await handle.getFile();
    const form = new FormData();
    form.append('file', file, file.name);
    Object.entries(extra).forEach(([k,v]) => form.append(k, String(v)));
    const res = await fetch('/api/agent/smart-document', { method: 'POST', body: form });
    const data = await res.json();
    console.log('API odgovor', data);
  };

  const sendReference = async (url, extra) => {
    const payload = { url, ...extra };
    const res = await fetch('/api/agent/smart-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log('API odgovor', data);
  };

  const addLocalDoc = async () => {
    try {
      if (!hasFileSystemAccess()) {
        speak('Pregljednik ne podržava File System Access API.');
        return;
      }
      
      const [handle] = await window.showOpenFilePicker({
        types: [{ 
          description: 'Dokumenti', 
          accept: { 
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/plain': ['.txt'] 
          } 
        }],
        multiple: false,
      });
      
      if (handle) {
        const file = await handle.getFile();
        const newDoc = await addDoc(file.name, handle);
        setKnownDocs(prev => [...prev, newDoc]);
        speak(`Dodala sam ${file.name} u listu poznatih dokumenata.`);
      }
    } catch (e) {
      console.warn(e);
      speak('Nisam uspjela dodati dokument.');
    }
  };

  const removeDoc = async (id) => {
    await deleteDoc(id);
    setKnownDocs(prev => prev.filter(d => d.id !== id));
    speak('Dokument je uklonjen iz liste.');
  };

  const sendDoc = async (doc) => {
    if (doc.handle) {
      const hasPermission = await ensureReadPermission(doc.handle);
      if (!hasPermission) {
        speak('Treba odobrenje za čitanje dokumenta.');
        return;
      }
      await sendHandle(doc.handle, { query: `obradi ${doc.name}` });
      speak(`Poslala sam ${doc.name} na obradu.`);
    } else if (doc.url) {
      await sendReference(doc.url, { query: `obradi ${doc.name}` });
      speak(`Poslala sam ${doc.name} na obradu.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Control Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Hrvatski Glasovni Unos</h3>
        
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={isListening ? stopVoice : startVoice}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
            }`}
          >
            <Mic className="w-5 h-5" />
            {isListening ? 'Slušam...' : 'Kreni s govorom'}
          </button>
          
          {transcript && (
            <div className="px-4 py-2 bg-gray-100 rounded-lg">
              <span className="text-sm text-gray-600">Posljednja naredba:</span>
              <div className="font-medium">{transcript}</div>
            </div>
          )}
        </div>

        {pendingPickFor && (
          <button
            onClick={pickAndSend}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all"
          >
            🔐 Tap za odabir: {pendingPickFor}
          </button>
        )}
      </div>

      {/* Known Documents */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Poznati Dokumenti</h3>
          <button
            onClick={addLocalDoc}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
          >
            <FileText className="w-4 h-4" />
            Dodaj dokument
          </button>
        </div>
        
        <div className="grid gap-3">
          {knownDocs.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-gray-500">
                    {d.handle ? 'Lokalno' : 'Udaljeno'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeDoc(d.id)}
                className="text-red-500 hover:text-red-700 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
          
          {knownDocs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nema poznatih dokumenata</p>
              <p className="text-sm">Dodaj dokument da možeš glasovno birati</p>
            </div>
          )}
        </div>
      </div>

      {/* Voice Commands Help */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">Glasovne Naredbe</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-800 mb-1">Slanje:</p>
            <ul className="text-blue-700 space-y-1">
              <li>"pošalji testnik.pdf"</li>
              <li>"šalji ponuda 001"</li>
              <li>"pošalji najnoviji dokument"</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-blue-800 mb-1">Kontrola:</p>
            <ul className="text-blue-700 space-y-1">
              <li>"jasan zvuk" (potvrdi)</li>
              <li>"poništi", "stop"</li>
              <li>"pomoć"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Online LLM Processor komponenta - koristi RealPDFSearch funkcionalnost
const OnlineLLMProcessor = () => {
  const [textQuery, setTextQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState(null);
  const [showStats, setShowStats] = useState(false);
  
  const {
    isListening,
    isProcessing, 
    transcript,
    searchResults,
    availableDocuments,
    error,
    backendStats,
    startListening,
    stopListening,
    performTextSearch,
    clearResults,
    refreshDocuments,
    hasResults,
    isReady
  } = useVoiceBackendSearch();

  const handleTextSearch = (e) => {
    e.preventDefault();
    if (textQuery.trim()) {
      performTextSearch(textQuery);
    }
  };

  const handleVoiceSearch = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const openDocumentPage = (filename, pageNumber) => {
    setSelectedPage({ filename, pageNumber, searchTerms: transcript.split(' ') });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Search className="w-6 h-6" />
              ChatGPT Backend Search Engine
            </h3>
            <p className="text-indigo-100 mt-1">
              Pretražuj dokumente glasovnim unosom ili tekstom sa ChatGPT integracijom
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all text-sm"
            >
              {showStats ? 'Sakrij Stats' : 'Prikaži Stats'}
            </button>
            {hasResults && (
              <button
                onClick={clearResults}
                className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all text-sm"
              >
                Očisti Rezultate
              </button>
            )}
            <button
              onClick={refreshDocuments}
              className="px-3 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all text-sm"
            >
              Osvježi
            </button>
          </div>
        </div>

        {/* Search Controls */}
        <div className="flex gap-4">
          {/* Text Search */}
          <form onSubmit={handleTextSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder="Unesite tekst za pretraživanje..."
              className="flex-1 px-4 py-2 rounded-lg bg-white bg-opacity-20 text-white placeholder-gray-200 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
            />
            <button
              type="submit"
              disabled={!textQuery.trim() || isProcessing}
              className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 font-medium"
            >
              Pretraži
            </button>
          </form>

          {/* Voice Search */}
          <button
            onClick={handleVoiceSearch}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-white text-indigo-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              {isListening ? 'Slušam...' : 'Glasovni'}
            </div>
          </button>
        </div>

        {/* Status Line */}
        {(transcript || isProcessing || error) && (
          <div className="mt-4 text-sm">
            {error && (
              <div className="bg-red-500 bg-opacity-20 text-red-100 px-3 py-2 rounded-lg">
                ❌ {error}
              </div>
            )}
            {transcript && !error && (
              <div className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg">
                🎤 Prepoznato: "{transcript}"
              </div>
            )}
            {isProcessing && (
              <div className="bg-yellow-500 bg-opacity-20 text-yellow-100 px-3 py-2 rounded-lg">
                ⏳ Obrađujem zahtjev...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Panel */}
      {showStats && backendStats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Backend Statistike</h4>
            <div className="text-sm text-gray-500">
              {backendStats.lastScanned && `Zadnji scan: ${new Date(backendStats.lastScanned).toLocaleTimeString()}`}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="font-bold text-blue-600">{backendStats.totalDocuments}</div>
              <div className="text-gray-600">Ukupno dokumenata</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="font-bold text-green-600">{availableDocuments.length}</div>
              <div className="text-gray-600">Dostupno u bazi</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="font-bold text-purple-600">{Object.keys(backendStats.availableTypes || {}).length}</div>
              <div className="text-gray-600">Tipova datoteka</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="font-bold text-yellow-600">{searchResults.length}</div>
              <div className="text-gray-600">Trenutnih rezultata</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        <AnimatePresence>
          {searchResults.map((result, index) => (
            <motion.div
              key={`${result.type}-${result.timestamp}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
            >
              {/* Result Header */}
              <div className={`px-4 py-3 flex items-center justify-between ${
                result.type === 'backend_processing' ? 'bg-gradient-to-r from-green-500 to-teal-600' :
                result.type === 'general_response' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' :
                result.type === 'document_selected' ? 'bg-gradient-to-r from-purple-500 to-pink-600' :
                result.type === 'document_list' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                result.type === 'help' ? 'bg-gradient-to-r from-gray-500 to-gray-700' :
                'bg-gradient-to-r from-gray-400 to-gray-600'
              } text-white`}>
                <div>
                  <h4 className="font-semibold">
                    {result.type === 'backend_processing' && '🧠 Backend Obrada'}
                    {result.type === 'general_response' && '💬 ChatGPT Odgovor'}
                    {result.type === 'document_selected' && '📄 Odabrani Dokument'}
                    {result.type === 'document_list' && '📚 Dostupni Dokumenti'}
                    {result.type === 'help' && '❓ Pomoć'}
                  </h4>
                  <p className="text-sm opacity-75">Upit: "{result.query}"</p>
                </div>
                <div className="text-xs opacity-75">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {/* Result Content */}
              <div className="p-6">
                {result.type === 'backend_processing' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">{result.document.name}</p>
                        <p className="text-sm text-blue-600">{result.document.type || 'Dokument'}</p>
                      </div>
                    </div>
                    
                    {result.result.error ? (
                      <div className="text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                        <p className="font-medium">Greška:</p>
                        <p className="text-sm mt-1">{result.result.message}</p>
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                          {result.result.response || result.result.analysis || 'Nema odgovora'}
                        </div>
                        {result.result.confidence && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-3">
                            <Target className="w-4 h-4" />
                            <span>Pouzdanost: {result.result.confidence}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {result.type === 'general_response' && (
                  <div className="prose max-w-none">
                    <div className="text-gray-800 whitespace-pre-wrap bg-blue-50 p-4 rounded-lg">
                      {result.response}
                    </div>
                  </div>
                )}

                {result.type === 'document_selected' && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <FileText className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">{result.document.name}</p>
                      <p className="text-sm text-purple-600">{result.document.type || 'Dokument'}</p>
                      {result.document.createdAt && (
                        <p className="text-xs text-gray-500">
                          Kreiran: {new Date(result.document.createdAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {result.type === 'document_list' && (
                  <div className="space-y-2">
                    <p className="text-gray-600 mb-3">Dostupni dokumenti ({result.documents.length}):</p>
                    {result.documents.map((doc, idx) => (
                      <div key={`${doc.id}-${idx}`} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                        <FileText className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.type || 'Dokument'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.type === 'help' && (
                  <div className="space-y-4">
                    <p className="text-gray-600">Dostupne glasovne naredbe:</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {result.helpInfo.commands.map((cmd, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium text-gray-900">"{cmd.command}"</p>
                          <p className="text-sm text-gray-600">{cmd.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!hasResults && !isProcessing && isReady && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <Search className="w-full h-full" />
            </div>
            <p className="text-gray-500 text-lg mb-2">Glasovni pretraživač spreman!</p>
            <p className="text-gray-400 text-sm">
              Koristite glasovni unos ili upišite upit za pretraživanje dokumenata
            </p>
          </div>
        )}
      </div>

      {/* Quick Commands */}
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Brze glasovne naredbe:</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-800 mb-1">Slanje dokumenta:</p>
            <ul className="text-blue-700 space-y-1">
              <li>"pošalji testnik.pdf"</li>
              <li>"šalji ponuda 001"</li>
              <li>"pošalji najnoviji dokument"</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-green-800 mb-1">Odabir dokumenta:</p>
            <ul className="text-green-700 space-y-1">
              <li>"odaberi račun 123"</li>
              <li>"nađi specifikaciju"</li>
              <li>"otvori promar"</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-purple-800 mb-1">Kontrola:</p>
            <ul className="text-purple-700 space-y-1">
              <li>"jasan zvuk" (potvrdi)</li>
              <li>"poništi", "stop"</li>
              <li>"pomoć"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};