import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Code, 
  Zap, 
  Shield, 
  Layers, 
  GitBranch,
  Server,
  Database,
  Eye,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Play,
  Pause,
  RotateCcw,
  Brain,
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Target,
  Zap as Lightning,
  MousePointer,
  Download,
  Mic
} from 'lucide-react';
import { useAgentOrchestrator } from '../../hooks/useAgentStream';
import { useVoicePDFSearch } from '../../hooks/useVoicePDFSearch';
import { PDFPageViewer, PDFSearchResultCard } from '../PDFViewer';

// Agent Demo Component
const AgentWorkflowDemo = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [demoMode, setDemoMode] = useState('streaming'); // 'streaming' | 'batch' | 'routing'
  const intervalRef = useRef(null);
  
  const { 
    results, 
    isProcessing, 
    orchestratorStats, 
    error,
    processLocalStream,
    processBatch,
    routeRequest 
  } = useAgentOrchestrator();

  const agentSteps = [
    {
      id: 'thinking',
      title: 'Razmišljanje',
      description: 'Agent analizira zadatak i planira pristup',
      icon: Brain,
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
      icon: Search,
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
      icon: FileText,
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
      icon: CheckCircle,
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
      icon: CheckCircle,
      color: 'green',
      duration: 500,
      logs: [
        'Zadatak uspješno završen!',
        'Rezultati pripremljenni za prikaz.',
        'Agent spreman za sljedeći zadatak.'
      ]
    }
  ];

  // Sample tasks za orchestrator demo
  const sampleTasks = [
    { 
      prompt: "Analiziraj troškovnik za projekt aluminijskih profila",
      file: null 
    },
    { 
      prompt: "Provjeri dostupnost materijala u skladištu",
      file: { mimetype: "image/png", name: "warehouse_scan.png" }
    },
    { 
      prompt: null,
      file: { mimetype: "audio/webm", name: "voice_request.webm" }
    },
    { 
      prompt: "Generiraj izvještaj o statusu projekta",
      file: null 
    }
  ];

  const startRealDemo = async () => {
    setIsRunning(true);
    setLogs(['🎯 Pokretanje pravog agent orchestratora...']);
    
    try {
      if (demoMode === 'streaming') {
        setLogs(prev => [...prev, '📡 Streaming mode - rezultati stižu u real-time']);
        await processLocalStream(sampleTasks);
      } else if (demoMode === 'batch') {
        setLogs(prev => [...prev, '📦 Batch mode - čeka se da svi zadaci završe']);
        await processBatch(sampleTasks);
      } else if (demoMode === 'routing') {
        setLogs(prev => [...prev, '🎯 Single routing demo']);
        const result = await routeRequest(sampleTasks[0]);
        console.log('Route result:', result);
      }
    } catch (err) {
      setLogs(prev => [...prev, `❌ Greška: ${err.message}`]);
    }
  };

  const startDemo = () => {
    if (demoMode === 'visual') {
      // Stari vizualni demo
      setIsRunning(true);
      setCurrentStep(0);
      setCompletedSteps([]);
      setLogs(['🚀 Agent pokrenuo izvršavanje zadatka...']);
      
      let step = 0;
      const executeStep = () => {
        if (step < agentSteps.length && step >= 0) {
          const currentAgentStep = agentSteps[step];
          if (!currentAgentStep) return;
          
          setCurrentStep(step);
          
          // Add step logs gradually - provjeri da logs postoji
          if (currentAgentStep.logs && currentAgentStep.logs.length > 0) {
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
          }, currentAgentStep.duration || 1000);
        }
      };
      
      executeStep();
    } else {
      // Pravi orchestrator demo
      startRealDemo();
    }
  };

  // Prati orchestrator rezultate
  useEffect(() => {
    if (results && results.length > 0) {
      results.forEach((result, index) => {
        if (result && result.status === 'completed' && result.data) {
          const taskType = result.data.type || 'unknown';
          const model = result.data.model || 'unknown';
          const processingTime = result.data.processingTime || 0;
          
          setLogs(prev => [...prev, 
            `✅ Task ${index + 1} (${taskType}) completed via ${model} in ${processingTime}ms`
          ]);
        } else if (result && result.status === 'failed') {
          setLogs(prev => [...prev, 
            `❌ Task ${index + 1} failed: ${result.error || 'Unknown error'}`
          ]);
        }
      });
    }
  }, [results]);

  // Prati orchestrator statistike
  useEffect(() => {
    if (orchestratorStats) {
      setLogs(prev => [...prev, 
        `📊 Završeno: ${orchestratorStats.completed}/${orchestratorStats.totalTasks} u ${orchestratorStats.totalDuration}ms`
      ]);
      setIsRunning(false);
    }
  }, [orchestratorStats]);

  // Prati greške
  useEffect(() => {
    if (error) {
      setLogs(prev => [...prev, `❌ Orchestrator greška: ${error}`]);
      setIsRunning(false);
    }
  }, [error]);

  const resetDemo = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setCompletedSteps([]);
    setLogs([]);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Agent Workflow Simulator</h3>
          <div className="flex items-center gap-3">
            {/* Mode Selector */}
            <select 
              value={demoMode} 
              onChange={(e) => setDemoMode(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white"
              disabled={isRunning || isProcessing}
            >
              <option value="visual">Visual Demo</option>
              <option value="streaming">🎯 Real Streaming</option>
              <option value="batch">📦 Batch Processing</option>
              <option value="routing">🔀 Smart Routing</option>
            </select>
            
            <button
              onClick={startDemo}
              disabled={isRunning || isProcessing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-4 h-4" />
              {demoMode === 'visual' ? 'Pokreni Demo' : 'Pokreni Orchestrator'}
            </button>
            <button
              onClick={resetDemo}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Orchestrator Stats */}
        {orchestratorStats && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span className="font-medium">Orchestrator Results:</span>
              <span>{orchestratorStats.completed}/{orchestratorStats.totalTasks} completed</span>
              <span>({orchestratorStats.totalDuration}ms)</span>
              {orchestratorStats.mode && <span className="text-green-600">Mode: {orchestratorStats.mode}</span>}
            </div>
          </div>
        )}

        {/* Real-time Results Display */}
        {demoMode !== 'visual' && results.length > 0 && (
          <div className="mb-4 grid gap-2">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-2 rounded text-sm border ${
                  result?.status === 'completed' 
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : result?.status === 'failed'
                      ? 'bg-red-50 border-red-200 text-red-800'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                {result?.status === 'completed' && result.data && (
                  <div>
                    <div className="font-medium">Task {index + 1}: {result.data.type || 'completed'}</div>
                    <div className="text-xs">
                      Model: {result.data.model || 'unknown'} | 
                      Time: {result.data.processingTime || 0}ms
                    </div>
                  </div>
                )}
                {result?.status === 'failed' && (
                  <div className="font-medium">Task {index + 1}: Failed - {result.error || 'Unknown error'}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Workflow Steps */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          {agentSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === index;
            const isCompleted = completedSteps.includes(index);
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0.5, scale: 0.95 }}
                animate={{ 
                  opacity: isActive || isCompleted ? 1 : 0.5,
                  scale: isActive ? 1.05 : 1
                }}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  isActive 
                    ? step.color === 'blue' ? 'border-blue-500 bg-blue-50' 
                      : step.color === 'green' ? 'border-green-500 bg-green-50'
                      : step.color === 'orange' ? 'border-orange-500 bg-orange-50'
                      : step.color === 'purple' ? 'border-purple-500 bg-purple-50'
                      : 'border-blue-500 bg-blue-50'
                    : isCompleted 
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`p-2 rounded-full mb-2 ${
                    isActive 
                      ? step.color === 'blue' ? 'bg-blue-500 text-white'
                        : step.color === 'green' ? 'bg-green-500 text-white'
                        : step.color === 'orange' ? 'bg-orange-500 text-white'
                        : step.color === 'purple' ? 'bg-purple-500 text-white'
                        : 'bg-blue-500 text-white'
                      : isCompleted 
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-gray-600">{step.description}</p>
                  
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
        <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-mono">Agent Console</span>
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Orchestrator Modes</h4>
          <div className="text-blue-800 text-sm space-y-2">
            <p><strong>🎯 Real Streaming:</strong> Promise.allSettled + SSE - rezultati stižu čim se završe</p>
            <p><strong>📦 Batch Processing:</strong> Paralelno izvršavanje, čeka sve taskove</p>
            <p><strong>🔀 Smart Routing:</strong> Auto-detektira tip inputa → šalje na pravi model</p>
            <p><strong>👁️ Visual Demo:</strong> Jednostavan step-by-step prikaz</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Routing Logic</h4>
          <div className="text-green-800 text-sm space-y-2">
            <p><strong>Audio Files:</strong> → Whisper-1 (transcription)</p>
            <p><strong>Image Files:</strong> → GPT-4o-mini (vision analysis)</p>  
            <p><strong>Complex Text:</strong> → o1-preview (reasoning)</p>
            <p><strong>Simple Text:</strong> → GPT-4o-mini (completion)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Visual PDF Demo Component with floating animations
const VisualPDFDemo = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedParagraphs, setExtractedParagraphs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedSection, setHighlightedSection] = useState(null);
  const [floatingTexts, setFloatingTexts] = useState([]);

  // Mock PDF stranice s realisticnim sadržajem
  const mockPDFPages = [
    {
      id: 1,
      title: "Specifikacija Aluminijskih Profila",
      sections: [
        {
          id: 'spec-1',
          text: "Profil ALP-6060-T5 dimenzija 50x30x2mm za strukturne aplikacije u građevinarstvu.",
          position: { top: '15%', left: '10%', width: '80%' },
          category: 'specification'
        },
        {
          id: 'spec-2', 
          text: "Minimalna debljina zida 2.0mm u skladu s EN 755-2 standardom za aluminijske legure.",
          position: { top: '35%', left: '10%', width: '75%' },
          category: 'standard'
        },
        {
          id: 'spec-3',
          text: "Površinska obrada: anodizacija 15μm ili prašno lakiranje prema RAL paleti.",
          position: { top: '55%', left: '10%', width: '70%' },
          category: 'treatment'
        },
        {
          id: 'spec-4',
          text: "Cijena: 12.50 EUR/m za standardne duljine 6000mm. Dostava 3-5 radnih dana.",
          position: { top: '75%', left: '10%', width: '85%' },
          category: 'pricing'
        }
      ]
    },
    {
      id: 2,
      title: "Tehnički Uvjeti Ugradnje",
      sections: [
        {
          id: 'tech-1',
          text: "Temperatura ugradnje između +5°C i +35°C s relativnom vlagom do 65%.",
          position: { top: '20%', left: '15%', width: '70%' },
          category: 'conditions'
        },
        {
          id: 'tech-2',
          text: "Koristi se M6 vijak od nehrđajućeg čelika za spajanje profila s betonskim elementima.",
          position: { top: '40%', left: '10%', width: '80%' },
          category: 'installation'
        },
        {
          id: 'tech-3',
          text: "Slobodni razmak između profila mora biti minimalno 3mm za temperaturno širenje.",
          position: { top: '60%', left: '12%', width: '75%' },
          category: 'spacing'
        }
      ]
    },
    {
      id: 3,
      title: "Kontrola Kvalitete i Certifikacija",
      sections: [
        {
          id: 'qa-1',
          text: "Svaki profil prolazi kontrolu dimenzija s tolerancijom ±0.1mm prema ISO 9001.",
          position: { top: '25%', left: '8%', width: '85%' },
          category: 'quality'
        },
        {
          id: 'qa-2',
          text: "Certifikat o kakvoći uključuje kemijski sastav legure i mehanička svojstva materijala.",
          position: { top: '45%', left: '10%', width: '80%' },
          category: 'certification'
        },
        {
          id: 'qa-3',
          text: "Jamstvo na proizvod 15 godina za strukturnu upotrebu u vanjskim uvjetima.",
          position: { top: '65%', left: '12%', width: '75%' },
          category: 'warranty'
        }
      ]
    }
  ];

  const categoryColors = {
    specification: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
    standard: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
    treatment: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
    pricing: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
    conditions: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
    installation: { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
    spacing: { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800' },
    quality: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800' },
    certification: { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
    warranty: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-800' }
  };

  const startExtraction = async () => {
    setIsExtracting(true);
    setExtractedParagraphs([]);
    setFloatingTexts([]);
    
    // Simulacija izvlačenja paragrafa s različitim brzinama
    for (let pageIndex = 0; pageIndex < mockPDFPages.length; pageIndex++) {
      const page = mockPDFPages[pageIndex];
      setCurrentPage(page.id);
      
      await new Promise(resolve => setTimeout(resolve, 800)); // Čekanje između stranica
      
      for (let sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex++) {
        const section = page.sections[sectionIndex];
        
        // Highlight trenutni odjeljak
        setHighlightedSection(section.id);
        
        // Kreiraj floating text animaciju
        const floatingId = `${section.id}-${Date.now()}`;
        setFloatingTexts(prev => [...prev, {
          id: floatingId,
          text: section.text,
          category: section.category,
          startPosition: section.position,
          timestamp: Date.now()
        }]);
        
        // Čekaj da animacija završi prije sljedećeg
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        
        // Dodaj u extracted paragraphs
        setExtractedParagraphs(prev => [...prev, {
          id: section.id,
          text: section.text,
          category: section.category,
          page: page.id,
          pageTitle: page.title,
          extractedAt: Date.now()
        }]);
        
        // Ukloni floating text nakon dodavanja
        setTimeout(() => {
          setFloatingTexts(prev => prev.filter(ft => ft.id !== floatingId));
        }, 2000);
      }
    }
    
    setIsExtracting(false);
    setHighlightedSection(null);
  };

  const resetDemo = () => {
    setIsExtracting(false);
    setExtractedParagraphs([]);
    setFloatingTexts([]);
    setCurrentPage(1);
    setHighlightedSection(null);
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
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
            >
              <Lightning className="w-4 h-4" />
              {isExtracting ? 'Izvlačenje...' : 'Pokreni Izvlačenje'}
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
            <div className="text-xs text-orange-800">Active animacije</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((extractedParagraphs.length / 10) * 100)}%
            </div>
            <div className="text-xs text-purple-800">Progres</div>
          </div>
        </div>
      </div>

      {/* Main Demo Area */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* PDF Viewer Mock */}
        <div className="relative">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <FileText className="w-4 h-4 text-gray-600 ml-2" />
              <span className="text-sm text-gray-700">aluminum-specifications.pdf</span>
            </div>

            <div className="relative h-96 overflow-hidden bg-white">
              <AnimatePresence>
                {mockPDFPages
                  .filter(page => page.id === currentPage)
                  .map(page => (
                    <motion.div
                      key={page.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      className="absolute inset-0 p-4"
                    >
                      {/* Page Title */}
                      <div className="text-center mb-6">
                        <h4 className="text-lg font-bold text-gray-900">{page.title}</h4>
                        <div className="w-16 h-0.5 bg-blue-500 mx-auto mt-2"></div>
                      </div>

                      {/* Page Sections */}
                      {page.sections.map(section => (
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
                            scale: highlightedSection === section.id ? 1.02 : 1,
                            boxShadow: highlightedSection === section.id 
                              ? '0 10px 25px rgba(0,0,0,0.1)' 
                              : '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          {section.text}
                          
                          {highlightedSection === section.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="absolute -top-2 -right-2"
                            >
                              <Target className="w-5 h-5 text-yellow-600" />
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  ))}
              </AnimatePresence>

              {/* Floating Texts Animation */}
              <AnimatePresence>
                {floatingTexts.map(floatingText => (
                  <motion.div
                    key={floatingText.id}
                    initial={{
                      opacity: 1,
                      x: floatingText.startPosition.left,
                      y: floatingText.startPosition.top,
                      scale: 1
                    }}
                    animate={{
                      opacity: [1, 0.8, 0],
                      x: '50%',
                      y: '10%',
                      scale: [1, 1.1, 0.8]
                    }}
                    transition={{
                      duration: 2,
                      ease: [0.25, 0.46, 0.45, 0.94]
                    }}
                    className={`absolute pointer-events-none p-3 rounded-lg border-2 shadow-xl z-20 ${
                      categoryColors[floatingText.category]?.bg || 'bg-blue-100'
                    } ${
                      categoryColors[floatingText.category]?.border || 'border-blue-300'
                    } ${
                      categoryColors[floatingText.category]?.text || 'text-blue-800'
                    }`}
                    style={{
                      maxWidth: '300px',
                      fontSize: '12px'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3 h-3" />
                      <span className="font-semibold text-xs uppercase tracking-wide">
                        {floatingText.category}
                      </span>
                    </div>
                    <div>{floatingText.text.substring(0, 80)}...</div>
                    
                    <motion.div
                      animate={{ rotate: 360 }}
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
                      Str. {paragraph.page} • {paragraph.pageTitle}
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

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Inteligencija
          </h4>
          <p className="text-blue-800 text-sm">
            Agent automatski prepoznaje različite tipove sadržaja i kategorizira ih prema važnosti.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <Lightning className="w-4 h-4" />
            Real-time Obrada
          </h4>
          <p className="text-green-800 text-sm">
            Paragrafi se izvlače u stvarnom vremenu s vizualnim animacijama za bolji UX.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Precizno Targeting
          </h4>
          <p className="text-purple-800 text-sm">
            Svaki paragraf je precizno lociran i kategoriziran prema sadržaju i važnosti.
          </p>
        </div>
      </div>
    </div>
  );
};

// Real PDF Search Component s glasovnim pretraživanjem
const RealPDFSearch = () => {
  const [textQuery, setTextQuery] = useState('');
  const [selectedPage, setSelectedPage] = useState(null);
  const [showStats, setShowStats] = useState(false);
  
  const {
    isListening,
    isProcessing, 
    transcript,
    searchResults,
    error,
    engineStats,
    startListening,
    stopListening,
    performTextSearch,
    clearResults,
    getLoadedPDFs,
    hasResults,
    isReady
  } = useVoicePDFSearch();

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

  const openPDFPage = (filename, pageNumber) => {
    setSelectedPage({ filename, pageNumber, searchTerms: transcript.split(' ') });
  };

  const loadedPDFs = getLoadedPDFs();

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Search className="w-6 h-6" />
              Real PDF Search Engine
            </h3>
            <p className="text-indigo-100 mt-1">
              Pretražuj stvarne PDF račune glasovnim unosom ili tekstom
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
                className="px-3 py-2 bg-red-500 bg-opacity-80 text-white rounded-lg hover:bg-opacity-100 transition-all text-sm"
              >
                Očisti
              </button>
            )}
          </div>
        </div>

        {/* Search Controls */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Text Search */}
          <form onSubmit={handleTextSearch} className="flex gap-2">
            <input
              type="text"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder="Upiši pretraživanje (npr. 'ponuda AGS', 'aluminium profil'...)"
              className="flex-1 px-4 py-2 rounded-lg text-gray-900 placeholder-gray-500"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !textQuery.trim()}
              className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Voice Search */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleVoiceSearch}
              disabled={!isReady}
              className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : isReady
                    ? 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                    : 'bg-gray-400 bg-opacity-50 text-gray-300 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Mic className="w-4 h-4" />
                {isListening ? 'Slušam...' : 'Glasovno pretraživanje'}
              </div>
            </button>
            
            {transcript && (
              <div className="px-3 py-2 bg-white bg-opacity-20 rounded-lg text-sm">
                "{transcript}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engine Stats */}
      {showStats && engineStats && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <h4 className="font-semibold text-gray-900 mb-3">PDF Search Engine Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{engineStats.totalPDFs}</div>
              <div className="text-xs text-blue-800">PDF fajlova</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{engineStats.totalPages}</div>
              <div className="text-xs text-green-800">Indeksiranih stranica</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{loadedPDFs.length}</div>
              <div className="text-xs text-purple-800">Učitanih dokumenata</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">
                {engineStats.isInitialized ? '✅' : '⏳'}
              </div>
              <div className="text-xs text-orange-800">Engine status</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Status & Error Messages */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3"
          >
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-blue-800">Pretražujem PDF dokumente...</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-800">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results */}
      {hasResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              Pronađeno {searchResults.length} rezultata
            </h4>
            <span className="text-sm text-gray-500">
              Pretraživanje: "{transcript || textQuery}"
            </span>
          </div>

          <div className="grid gap-4">
            <AnimatePresence>
              {searchResults.map((result, index) => (
                <PDFSearchResultCard
                  key={`${result.filename}-${result.pageNumber}-${index}`}
                  result={result}
                  onViewPage={openPDFPage}
                  searchQuery={transcript || textQuery}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasResults && !isProcessing && !error && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Pretraži stvarne PDF račune
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Koristi glasovno pretraživanje ili unesi tekst da pretražiš sve PDF dokumente 
            iz backend/Računi direktorija
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 max-w-lg mx-auto text-sm text-gray-500">
            <div>💡 "ponuda AGS"</div>
            <div>💡 "aluminium profil"</div> 
            <div>💡 "predračun broj"</div>
          </div>
        </div>
      )}

      {/* Loaded PDFs Preview */}
      {loadedPDFs.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Dostupni PDF dokumenti ({loadedPDFs.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {loadedPDFs.slice(0, 8).map(pdf => (
              <div key={pdf.filename} className="p-2 bg-white rounded border text-center">
                <div className="font-medium truncate" title={pdf.filename}>
                  {pdf.filename.replace('.pdf', '')}
                </div>
                <div className="text-gray-500">{pdf.totalPages} str.</div>
              </div>
            ))}
            {loadedPDFs.length > 8 && (
              <div className="p-2 bg-white rounded border text-center text-gray-500">
                +{loadedPDFs.length - 8} više...
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Page Viewer Modal */}
      <AnimatePresence>
        {selectedPage && (
          <PDFPageViewer
            filename={selectedPage.filename}
            pageNumber={selectedPage.pageNumber}
            searchTerms={selectedPage.searchTerms}
            onClose={() => setSelectedPage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const AIAgentGuide = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(null);
  const contentRef = useRef(null);

  const sections = [
    { id: 'overview', title: 'Overview', icon: BookOpen },
    { id: 'demo', title: 'Agent Demo', icon: Zap },
    { id: 'visual-demo', title: 'Visual PDF Demo', icon: FileText },
    { id: 'real-pdf', title: 'Real PDF Search', icon: Search },
    { id: 'backend', title: 'Backend Architecture', icon: Server },
    { id: 'streaming', title: 'Streaming Responses', icon: Zap },
    { id: 'visualization', title: 'Visualization Libraries', icon: Eye },
    { id: 'security', title: 'Security', icon: Shield },
    { id: 'ui-patterns', title: 'UI Patterns', icon: Layers },
    { id: 'realtime', title: 'Real-time Updates', icon: Database },
    { id: 'state', title: 'State Management', icon: GitBranch },
    { id: 'errors', title: 'Error Handling', icon: Code },
    { id: 'frameworks', title: 'Open-source Frameworks', icon: ExternalLink }
  ];

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const CodeBlock = ({ code, language = 'javascript', id }) => (
    <div className="relative bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">{language}</span>
        <button
          onClick={() => copyToClipboard(code, id)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {copiedCode === id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );

  const SectionContent = () => {
    switch (activeSection) {
      case 'demo':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Agent Workflow Demonstration</h2>
            <p className="text-gray-600 leading-relaxed">
              Ovaj interaktivni demo prikazuje kako AI agent obrađuje zadatke korak po korak. 
              Možete vidjeti proces razmišljanja, istraživanja i validacije rezultata u stvarnom vremenu.
            </p>
            <AgentWorkflowDemo />
          </div>
        );

      case 'visual-demo':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Visual PDF Extraction Demo</h2>
            <p className="text-gray-600 leading-relaxed">
              Gledaj kako AI agent u stvarnom vremenu izvlači i kategorizira sadržaj iz PDF dokumenata. 
              Svaki paragraf zapliva iz stranice s dinamičkim animacijama za maksimalnu vizualnu privlačnost.
            </p>
            <VisualPDFDemo />
          </div>
        );

      case 'real-pdf':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Real PDF Search Engine</h2>
            <p className="text-gray-600 leading-relaxed">
              Pretražuj stvarne PDF dokumente iz backend/Računi direktorija pomoću glasovnih komandi ili teksta. 
              Sistem automatski indeksira sve PDF-ove i omogućuje precizno pretraživanje s prikazom rezultata.
            </p>
            <RealPDFSearch />
          </div>
        );
        
      case 'overview':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Building ChatGPT-like Agent Systems in React</h2>
            <p className="text-gray-600 leading-relaxed">
              This comprehensive research report provides production-ready patterns, code examples, and best practices 
              for implementing AI agent systems in React applications with full backend orchestration and frontend visualization. 
              All solutions are immediately implementable and tested in production environments.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Key Takeaways</h3>
              <ul className="space-y-1 text-blue-800 text-sm">
                <li>• Backend architecture scales from prototype to production</li>
                <li>• Server-Sent Events outperform WebSockets for most AI scenarios</li>
                <li>• React Flow and assistant-ui lead visualization libraries</li>
                <li>• Multiple defense layers required for secure agent tools</li>
                <li>• Progressive disclosure manages UI complexity effectively</li>
              </ul>
            </div>
          </div>
        );

      case 'backend':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Backend Architecture Patterns</h2>
            <p className="text-gray-600">
              Modern AI agent systems require thoughtful backend architecture decisions. Based on production 
              implementations from Microsoft, OpenAI, and leading tech companies, the optimal approach starts 
              with a <strong>monolithic architecture for prototyping</strong>, then migrates to 
              <strong>microservices for production scale</strong>.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Technology Stack</h3>
              <p className="text-green-800 text-sm">
                <strong>FastAPI</strong> (Python) and <strong>Express</strong> (Node.js) dominate production deployments. 
                FastAPI offers superior async performance with type safety, while Express provides mature ecosystem integration.
              </p>
            </div>

            <CodeBlock
              language="python"
              id="fastapi-agent"
              code={`# Production FastAPI agent orchestration
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncpg

class ProductionAgentAPI:
    @asynccontextmanager
    async def lifespan(self, app: FastAPI):
        # Initialize connection pools and orchestrator
        self.db_pool = await asyncpg.create_pool(
            "postgresql://...", 
            min_size=5, 
            max_size=20
        )
        self.agent_orchestrator = AgentOrchestrator(self.db_pool)
        await self.agent_orchestrator.initialize()
        
        app.state.db_pool = self.db_pool
        app.state.agent_orchestrator = self.agent_orchestrator
        yield
        
        # Graceful shutdown
        await self.agent_orchestrator.shutdown()
        await self.db_pool.close()
    
    def create_app(self) -> FastAPI:
        app = FastAPI(title="Production Agent System", lifespan=self.lifespan)
        
        @app.post("/api/v1/conversations/{conversation_id}/messages")
        async def send_message(conversation_id: str, message: dict):
            result = await app.state.agent_orchestrator.execute_conversation(
                conversation_id=conversation_id,
                message=message["content"],
                context=message.get("context", {})
            )
            return result
        
        return app`}
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Microsoft's Production Patterns</h3>
              <p className="text-yellow-800 text-sm mb-2">Five critical orchestration patterns handle 90% of production use cases:</p>
              <ul className="space-y-1 text-yellow-800 text-sm">
                <li><strong>Sequential:</strong> Linear pipelines</li>
                <li><strong>Concurrent:</strong> Parallel execution</li>
                <li><strong>Group Chat:</strong> Collaborative agents</li>
                <li><strong>Handoff:</strong> Dynamic delegation</li>
                <li><strong>Magentic:</strong> Open-ended problem solving</li>
              </ul>
            </div>
          </div>
        );

      case 'streaming':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Streaming Responses with Server-Sent Events</h2>
            <p className="text-gray-600">
              Industry analysis from 2024-2025 reveals <strong>Server-Sent Events (SSE) outperform WebSockets</strong> for most AI agent scenarios. 
              SSE provides automatic reconnection, better scaling characteristics (10,000+ concurrent connections per server), 
              and simpler implementation while maintaining real-time capabilities.
            </p>

            <CodeBlock
              language="typescript"
              id="sse-hook"
              code={`// Production-ready SSE React hook with automatic reconnection
export function useSSE<T = any>({
  url,
  options = {},
  maxRetries = 5,
  retryDelay = 1000
}: SSEOptions): SSEHookReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed'>('closed');
  const [retryCount, setRetryCount] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');
    setError(null);

    try {
      const eventSource = new EventSource(url, options);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionState('open');
        setRetryCount(0);
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
        } catch (parseError) {
          setData(event.data as T);
        }
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        setConnectionState('closed');
        
        // Implement exponential backoff
        if (retryCount < maxRetries) {
          const delay = Math.min(retryDelay * Math.pow(2, retryCount), 30000);
          
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, delay);
        }
      };

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create EventSource'));
      setConnectionState('closed');
    }
  }, [url, options, retryCount, maxRetries, retryDelay]);

  return { data, error, isConnected, connectionState, retryCount, reconnect };
}`}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Vercel AI SDK</h3>
              <p className="text-blue-800 text-sm">
                For token-by-token streaming, the <strong>Vercel AI SDK</strong> provides the most robust implementation 
                with built-in error handling and type safety. It supports OpenAI, Anthropic, and custom models seamlessly.
              </p>
            </div>
          </div>
        );

      case 'visualization':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">React Flow and assistant-ui Lead Visualization</h2>
            <p className="text-gray-600">
              <strong>React Flow</strong> (30.8K GitHub stars, 1.86M weekly downloads) dominates workflow visualization 
              with production-ready components for agent DAGs. Its custom node types, built-in dragging/zooming, 
              and TypeScript support make it ideal for visualizing agent reasoning steps and tool dependencies.
            </p>

            <CodeBlock
              language="jsx"
              id="agent-interface"
              code={`// Complete agent interface with workflow visualization
import { useChat } from '@ai-sdk/react';
import { ReactFlow } from 'reactflow';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

const AgentInterface = () => {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  
  return (
    <div className="flex h-screen">
      {/* Workflow Visualization */}
      <div className="w-1/3 border-r">
        <ReactFlow nodes={workflowNodes} edges={workflowEdges} />
      </div>
      
      {/* Chat Interface */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(message => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </motion.div>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <input
            value={input}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="Ask your agent..."
          />
        </form>
      </div>
    </div>
  );
};`}
            />

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">assistant-ui</h3>
              <p className="text-purple-800 text-sm">
                For chat interfaces, <strong>assistant-ui</strong> provides purpose-built components for AI conversations 
                with streaming support, tool call visualization, and accessibility built-in. It follows Radix UI patterns for composability.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">Animation Libraries</h3>
              <p className="text-orange-800 text-sm">
                <strong>Motion</strong> (formerly Framer Motion) provides the smoothest animations with spring physics, 
                while <strong>react-markdown</strong> with <strong>react-syntax-highlighter</strong> handles rich content rendering perfectly.
              </p>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Secure Agent Tools Require Multiple Defense Layers</h2>
            <p className="text-gray-600">
              Production agent tools accessing backend data must implement comprehensive security patterns. 
              LangChain's <strong>InjectedToolArg</strong> pattern prevents exposing sensitive parameters to the LLM while maintaining functionality.
            </p>

            <CodeBlock
              language="python"
              id="security-middleware"
              code={`from langchain_core.tools import tool, InjectedToolArg
from functools import wraps
import time
from collections import defaultdict

class ToolSecurityMiddleware:
    def __init__(self):
        self.rate_limits = defaultdict(list)
        self.permissions_cache = {}
        
    def rate_limit(self, calls_per_minute: int = 60):
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                user_id = kwargs.get('user_id') or 'anonymous'
                now = time.time()
                
                # Clean old entries
                cutoff = now - 60
                self.rate_limits[user_id] = [
                    timestamp for timestamp in self.rate_limits[user_id]
                    if timestamp > cutoff
                ]
                
                # Check rate limit
                if len(self.rate_limits[user_id]) >= calls_per_minute:
                    return "Rate limit exceeded. Please wait before making more requests."
                
                # Record this call
                self.rate_limits[user_id].append(now)
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator
    
    def require_permission(self, permission: str):
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                user_id = kwargs.get('user_id')
                if not self.check_permission(user_id, permission):
                    return f"Access denied: Missing permission '{permission}'"
                return await func(*args, **kwargs)
            return wrapper
        return decorator

# Secure tool implementation
security = ToolSecurityMiddleware()

@security.rate_limit(calls_per_minute=30)
@security.require_permission("database_read")
@tool
async def secure_database_query(
    query: str,
    user_id: InjectedToolArg  # Hidden from LLM
) -> str:
    """Execute database query with user context and security."""
    # Validate query safety
    if not is_safe_query(query):
        return "Error: Query contains unsafe operations"
    
    # Execute with user context
    result = await execute_secure_query(query, user_id)
    return result`}
            />

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">Critical Security Patterns</h3>
              <ul className="space-y-1 text-red-800 text-sm">
                <li>• <strong>Circuit breaker patterns</strong> and <strong>exponential backoff</strong> protect against cascade failures</li>
                <li>• <strong>Redis-based caching</strong> reduces backend load</li>
                <li>• <strong>Transaction support</strong> with rollback capabilities ensures data consistency</li>
                <li>• <strong>Input validation</strong> and <strong>SQL injection prevention</strong></li>
              </ul>
            </div>
          </div>
        );

      case 'ui-patterns':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">ChatGPT UI Patterns Emphasize Progressive Disclosure</h2>
            <p className="text-gray-600">
              Successful agent interfaces follow established patterns from ChatGPT and Claude. <strong>Progressive disclosure</strong> manages 
              complexity by showing thinking processes in collapsible sections with muted backgrounds (#f8f9fa) and left borders for visual hierarchy.
            </p>

            <CodeBlock
              language="jsx"
              id="thinking-section"
              code={`// Thinking section with progressive disclosure
const ThinkingSection = ({ isVisible, content, status }) => (
  <div className={cn(
    "border-l-4 border-blue-200 bg-gray-50 p-3 text-sm",
    "transition-all duration-300",
    isVisible ? "opacity-100 max-h-none" : "opacity-50 max-h-20 overflow-hidden"
  )}>
    <div className="flex items-center gap-2 mb-2">
      <Brain className="h-4 w-4 text-blue-600" />
      <span className="font-medium text-gray-700">Thinking...</span>
      {status.type === "running" && <Spinner className="h-3 w-3" />}
    </div>
    <div className="text-gray-600 whitespace-pre-wrap">{content}</div>
    <button 
      onClick={toggleVisibility}
      className="text-blue-600 text-xs mt-2 hover:underline"
    >
      {isVisible ? "Collapse" : "Expand"} reasoning
    </button>
  </div>
);`}
            />

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Status-Driven Rendering</h3>
              <p className="text-gray-600 text-sm mb-2">Tool calls display with status-driven rendering:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span><strong>Blue</strong> for running (#0f62fe)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span><strong>Green</strong> for success (#198038)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span><strong>Red</strong> for errors (#da1e28)</span>
                </div>
              </div>
              <p className="text-gray-600 text-xs mt-2">
                Parameters show in collapsible JSON viewers to reduce visual noise while maintaining transparency.
              </p>
            </div>
          </div>
        );

      case 'state':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Zustand Excels at React State Management</h2>
            <p className="text-gray-600">
              <strong>Zustand</strong> outperforms Redux for agent workflows with 70% less boilerplate and superior TypeScript integration. 
              Its middleware stack provides persistence, devtools, and optimistic updates out of the box.
            </p>

            <CodeBlock
              language="typescript"
              id="zustand-store"
              code={`// Production-ready Zustand store for agent state
import { create } from 'zustand'
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface AgentState {
  conversations: Record<string, Conversation>
  activeConversationId: string | null
  isProcessing: boolean
  retryQueue: RetryableAction[]
  metrics: PerformanceMetrics
  
  // Actions with optimistic updates
  sendMessage: (conversationId: string, content: string) => Promise<void>
  addOptimisticMessage: (conversationId: string, content: string) => string
  rollbackOptimisticMessage: (tempId: string) => void
  retryFailedMessage: (messageId: string) => Promise<void>
}

const useAgentStore = create<AgentState>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          conversations: {},
          activeConversationId: null,
          isProcessing: false,
          retryQueue: [],
          metrics: { responseTime: [], errorRate: 0 },
          
          sendMessage: async (conversationId, content) => {
            const tempId = get().addOptimisticMessage(conversationId, content);
            
            try {
              const response = await fetch(\`/api/conversations/\${conversationId}/messages\`, {
                method: 'POST',
                body: JSON.stringify({ content })
              });
              
              if (!response.ok) throw new Error('Failed to send message');
              
              const data = await response.json();
              
              set(state => {
                // Replace optimistic message with actual response
                const conversation = state.conversations[conversationId];
                const messageIndex = conversation.messages.findIndex(m => m.id === tempId);
                if (messageIndex !== -1) {
                  conversation.messages[messageIndex] = data.message;
                }
              });
              
            } catch (error) {
              get().rollbackOptimisticMessage(tempId);
              throw error;
            }
          },
          
          addOptimisticMessage: (conversationId, content) => {
            const tempId = \`temp_\${Date.now()}\`;
            
            set(state => {
              if (!state.conversations[conversationId]) {
                state.conversations[conversationId] = { messages: [] };
              }
              
              state.conversations[conversationId].messages.push({
                id: tempId,
                content,
                role: 'user',
                timestamp: Date.now(),
                status: 'sending'
              });
            });
            
            return tempId;
          },
          
          rollbackOptimisticMessage: (tempId) => {
            set(state => {
              Object.values(state.conversations).forEach(conversation => {
                const index = conversation.messages.findIndex(m => m.id === tempId);
                if (index !== -1) {
                  conversation.messages.splice(index, 1);
                }
              });
            });
          }
        }))
      ),
      { name: 'agent-store' }
    )
  )
)`}
            />

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-900 mb-2">Key Benefits</h3>
              <ul className="space-y-1 text-indigo-800 text-sm">
                <li>• <strong>Optimistic updates</strong> provide immediate feedback while maintaining consistency</li>
                <li>• <strong>Immer middleware</strong> enables immutable updates with mutable syntax</li>
                <li>• <strong>Automatic rollback</strong> on failure maintains UI consistency</li>
                <li>• <strong>70% less boilerplate</strong> compared to Redux</li>
              </ul>
            </div>
          </div>
        );

      case 'errors':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Error Handling with Exponential Backoff</h2>
            <p className="text-gray-600">
              Production systems need resilient error handling with user-friendly recovery options. 
              <strong>Exponential backoff with jitter</strong> prevents server overload during retries, 
              while <strong>circuit breakers</strong> protect against cascade failures.
            </p>

            <CodeBlock
              language="typescript"
              id="circuit-breaker"
              code={`class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async call<T>(func: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await func();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
}

// Usage with retry mechanism
async function retryWithBackoff<T>(
  func: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): Promise<T> {
  const circuitBreaker = new CircuitBreaker();
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await circuitBreaker.call(func);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}`}
            />

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">User-Facing Error Messages</h3>
              <p className="text-yellow-800 text-sm">
                Error messages should follow accessibility guidelines with clear recovery actions, 
                proper ARIA attributes, and color-blind safe indicators.
              </p>
            </div>
          </div>
        );

      case 'frameworks':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Open-source Frameworks Accelerate Development</h2>
            <p className="text-gray-600">
              <strong>LangChain</strong> leads with the most comprehensive ecosystem (1000+ integrations) and production monitoring 
              through LangSmith. Its modular architecture supports custom tools, memory systems, and evaluation frameworks.
            </p>

            <CodeBlock
              language="python"
              id="langchain-agent"
              code={`from langchain_core.agents import AgentExecutor
from langchain_openai import ChatOpenAI
from langchain.agents import create_structured_chat_agent
from langchain.memory import ConversationSummaryBufferMemory

# Production LangChain agent with memory and tools
class ProductionAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4",
            temperature=0.7,
            streaming=True,
            callbacks=[StreamingStdOutCallbackHandler()]
        )
        
        self.memory = ConversationSummaryBufferMemory(
            llm=self.llm,
            max_token_limit=2000,
            return_messages=True
        )
        
        self.tools = [
            database_query_tool,
            web_search_tool,
            code_execution_tool
        ]
        
        self.agent = create_structured_chat_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=self.create_prompt()
        )
        
        self.executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
            early_stopping_method="generate"
        )
    
    async def run(self, input_text: str, session_id: str):
        # Enable LangSmith tracing
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_PROJECT"] = f"session_{session_id}"
        
        response = await self.executor.arun(input_text)
        return response`}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Microsoft AutoGen</h3>
                <p className="text-green-800 text-sm">
                  Excels at multi-agent collaboration with built-in human-in-the-loop patterns.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">CrewAI</h3>
                <p className="text-blue-800 text-sm">
                  Simplifies role-based workflows with intuitive APIs for defining agent teams.
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a section to view content</div>;
    }
  };

  return (
    <div className="h-full flex bg-gray-50">
      {/* Sidebar Navigation */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">AI Agent Systems Guide</h1>
          <p className="text-sm text-gray-600 mt-1">Production-ready patterns & examples</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-900 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{section.title}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8" ref={contentRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SectionContent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AIAgentGuide;