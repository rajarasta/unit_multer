import React, { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Layers,
  Zap,
  Activity
} from 'lucide-react';
import VoiceRecorder from "./VoiceRecorder";
import PipelineViewer from "./PipelineViewer";
import FormPreview from "./FormPreview";
import VisualPDFDemo from "./VisualPDFDemo";

export default function VoiceTab() {
  const [transcript, setTranscript] = useState("");
  const [multimodalResult, setMultimodalResult] = useState(null);
  const [draftJson, setDraftJson] = useState(null);
  const [finalJson, setFinalJson] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Agent Demo states
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [visualLogs, setVisualLogs] = useState([]);
  const [showVisualDemo, setShowVisualDemo] = useState(false);
  const [showPDFDemo, setShowPDFDemo] = useState(false);

  const agentSteps = [
    {
      id: 'input',
      title: 'Unos',
      description: 'Prijem i procesiranje korisničkog zahtjeva',
      progress: 0,
      color: 'from-blue-500 to-cyan-500',
      duration: 2000
    },
    {
      id: 'analysis', 
      title: 'Analiza',
      description: 'Dubinska analiza sadržaja i konteksta',
      progress: 0,
      color: 'from-purple-500 to-pink-500',
      duration: 3000
    },
    {
      id: 'matching',
      title: 'Prepoznavanje',
      description: 'Prepoznavanje i mapiranje dokumenata',
      progress: 0,
      color: 'from-green-500 to-emerald-500',
      duration: 2500
    },
    {
      id: 'processing',
      title: 'Obrada',
      description: 'AI obrada i generiranje rezultata',
      progress: 0,
      color: 'from-orange-500 to-red-500',
      duration: 4000
    },
    {
      id: 'completion',
      title: 'Gotovo',
      description: 'Finalizacija i priprema rezultata',
      progress: 0,
      color: 'from-teal-500 to-green-500',
      duration: 500
    }
  ];

  const [stepProgress, setStepProgress] = useState({});
  
  const startVisualDemo = () => {
    setShowVisualDemo(true);
    setIsProcessing(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setStepProgress({});
    setVisualLogs(['⚡ Pokrećem Smart Progress Tracking...']);
    
    let stepIndex = 0;
    const executeStep = () => {
      if (stepIndex < agentSteps.length) {
        const step = agentSteps[stepIndex];
        setCurrentStep(stepIndex);
        
        // Add step logs
        setVisualLogs(prev => [...prev, `[${step.title}] ${step.description}`]);
        
        // Animate progress bar
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15 + 5;
          if (progress > 100) progress = 100;
          
          setStepProgress(prev => ({
            ...prev,
            [stepIndex]: progress
          }));
          
          if (progress >= 100) {
            clearInterval(progressInterval);
          }
        }, step.duration / 10);
        
        setTimeout(() => {
          setCompletedSteps(prev => [...prev, stepIndex]);
          setStepProgress(prev => ({
            ...prev,
            [stepIndex]: 100
          }));
          stepIndex++;
          if (stepIndex < agentSteps.length) {
            executeStep();
          } else {
            setIsProcessing(false);
            setCurrentStep(-1);
          }
        }, step.duration);
      }
    };
    
    executeStep();
  };

  const handleTranscript = async (multimodalResult) => {
    console.log('🧩 Received multimodal result:', multimodalResult);
    
    // Start visual demo if enabled
    if (showVisualDemo) {
      startVisualDemo();
    }
    
    setMultimodalResult(multimodalResult);
    setLoading(false);
    
    // Extract transcript for display
    const transcriptText = multimodalResult.transcript?.text || 
                          JSON.stringify(multimodalResult.transcript?.json) || 
                          "Nema transkripta";
    setTranscript(transcriptText);
    
    // Add processing logs based on result type
    if (multimodalResult.stage) {
      // Smart document processing
      setLogs(prev => [
        ...prev,
        `🎤 Audio transkripcija: ✅`,
        `🎯 Document matching: ${multimodalResult.documentMatch?.matchedDocument ? '✅' : '❌'}`,
        `📄 Dokument: ${multimodalResult.selectedDocument?.filename || 'Nije pronađen'}`,
        `🔍 Analiza: ${multimodalResult.analysis ? '✅' : '❌'}`,
        `📊 Stage: ${multimodalResult.stage}`
      ]);
    } else {
      // Multimodal processing
      setLogs(prev => [
        ...prev,
        `🎤 Audio obrađen: ${multimodalResult.transcript ? '✅' : '❌'}`,
        `📁 Datoteke analizirane: ${multimodalResult.fileAnalyses?.length || 0}`,
        `🔗 Kombinirana analiza: ${multimodalResult.combinedAnalysis ? '✅' : '❌'}`,
        `📋 Akcije izvučene: ${multimodalResult.actionItems?.length || 0}`
      ]);
    }

    // Use appropriate result as draft based on processing type
    if (multimodalResult.stage) {
      // Smart document processing - use analysis result
      if (multimodalResult.analysis) {
        setDraftJson({
          type: "smart_document",
          document: multimodalResult.selectedDocument?.filename,
          analysis: multimodalResult.analysis,
          command: multimodalResult.documentMatch?.command,
          stage: multimodalResult.stage,
          status: "draft"
        });
      }
    } else if (multimodalResult.combinedAnalysis) {
      // Multimodal processing
      setDraftJson(multimodalResult.combinedAnalysis);
    } else if (multimodalResult.transcript) {
      // Simple transcription
      setDraftJson(multimodalResult.transcript);
    }
  };

  const handleConfirm = async (fields) => {
    setLoading(true);
    
    // Check if we have smart document result
    if (draftJson?.type === "smart_document") {
      setLogs((prev) => [...prev, "✅ Smart document analiza potvrđena"]);
      
      // For smart documents, we already have the final analysis
      setFinalJson({
        type: "smart_document_confirmed",
        document: draftJson.document,
        analysis: draftJson.analysis,
        command: draftJson.command,
        fields: fields,
        status: "final",
        confirmed: true,
        timestamp: new Date().toISOString()
      });
      
      setLogs((prev) => [...prev, "📄 Dokument uspješno obrađen", "✅ Akcija završena"]);
      setLoading(false);
      return;
    }
    
    // Fallback to original LLM confirm for other types
    setLogs((prev) => [...prev, "📤 Šaljem potvrdu na OpenAI"]);

    try {
      const res = await fetch("http://localhost:3002/api/llm/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: transcript, fields }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setFinalJson(data);
      setLogs((prev) => [...prev, "✅ Final JSON vraćen"]);
      
      // Simulacija izvršavanja
      setTimeout(() => {
        setLogs((prev) => [...prev, "🔄 Izvršavam akciju...", "✅ Akcija završena"]);
      }, 1000);
    } catch (error) {
      console.error("Confirm error:", error);
      setLogs((prev) => [...prev, `❌ Greška: ${error.message}`]);
      
      // Smart document fallback if LLM confirm fails
      if (draftJson?.analysis) {
        setLogs((prev) => [...prev, "🔄 Koristim smart document rezultat kao finalni"]);
        setFinalJson({
          type: "smart_document_fallback",
          analysis: draftJson.analysis,
          fields: fields,
          status: "final",
          confirmed: true,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTranscript("");
    setDraftJson(null);
    setFinalJson(null);
    setLogs([]);
  };

  return (
    <div className="h-full p-6 bg-gray-50">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Glasovni Agent</h1>
          <p className="text-gray-600 mt-1">OpenAI Agent pipeline za glasovne naredbe</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowVisualDemo(!showVisualDemo)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-medium shadow-lg ${
              showVisualDemo 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-blue-300' 
                : 'bg-white text-gray-700 hover:shadow-xl border border-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            Smart Progress
          </motion.button>
          <motion.button
            onClick={() => setShowPDFDemo(!showPDFDemo)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-medium shadow-lg ${
              showPDFDemo 
                ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-green-300' 
                : 'bg-white text-gray-700 hover:shadow-xl border border-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Document Flow
          </motion.button>
          <motion.button
            onClick={handleReset}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-all border border-gray-200 shadow-lg hover:shadow-xl font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </motion.button>
        </div>
      </div>

      {/* Visual Agent Demo */}
      {showVisualDemo && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white rounded-2xl p-8 shadow-2xl border border-gray-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Smart Progress Tracking
              </h3>
              <p className="text-gray-600 mt-2 text-lg">
                Prati napredak kroz dinamičke animirane kartice
              </p>
            </div>
            <motion.button
              onClick={startVisualDemo}
              disabled={isProcessing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`px-8 py-4 rounded-2xl transition-all font-semibold text-lg shadow-lg ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                  Obrađuje...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5" />
                  Pokreni Tracking
                </div>
              )}
            </motion.button>
          </div>

          {/* Dynamic Progress Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {agentSteps.map((step, index) => {
              const isActive = currentStep === index;
              const isCompleted = completedSteps.includes(index);
              const progress = stepProgress[index] || 0;
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: isActive ? 1.05 : 1,
                    rotateY: isActive ? [0, 5, 0] : 0
                  }}
                  transition={{ 
                    duration: 0.5,
                    rotateY: { duration: 2, repeat: isActive ? Infinity : 0 }
                  }}
                  className="relative"
                >
                  <div className={`relative p-6 rounded-2xl border-2 transition-all duration-500 ${
                    isActive 
                      ? 'border-transparent shadow-2xl transform' 
                      : isCompleted
                      ? 'border-green-200 bg-green-50 shadow-lg'
                      : 'border-white border-opacity-30 bg-white bg-opacity-20'
                  }`}
                  style={{
                    background: isActive ? `linear-gradient(135deg, ${step.color.replace('from-', '').replace(' to-', ', ')})` : undefined
                  }}
                  >
                    {/* Progress Circle */}
                    <div className="flex justify-center mb-4">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={isActive || isCompleted ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}
                            strokeWidth="4"
                          />
                          <motion.circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={isActive || isCompleted ? 'white' : '#10B981'}
                            strokeWidth="4"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: '0 176' }}
                            animate={{ 
                              strokeDasharray: `${(progress / 100) * 176} 176`,
                              opacity: progress > 0 ? 1 : 0
                            }}
                            transition={{ duration: 0.5 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${
                            isActive ? 'text-white' : isCompleted ? 'text-green-600' : 'text-gray-400'
                          }`}>
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Step Info */}
                    <div className="text-center">
                      <h4 className={`font-bold text-lg mb-2 ${
                        isActive ? 'text-white' : isCompleted ? 'text-green-800' : 'text-white text-opacity-90'
                      }`}>
                        {step.title}
                      </h4>
                      <p className={`text-sm leading-relaxed ${
                        isActive ? 'text-white text-opacity-90' : isCompleted ? 'text-green-600' : 'text-white text-opacity-70'
                      }`}>
                        {step.description}
                      </p>
                    </div>

                    {/* Active Pulse Effect */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 border-2 border-white border-opacity-50 rounded-2xl"
                        animate={{ 
                          scale: [1, 1.05, 1],
                          opacity: [0.5, 0.8, 0.5]
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}

                    {/* Completion Badge */}
                    {isCompleted && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg"
                      >
                        ✓
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Live Activity Feed */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-3 h-3 bg-green-400 rounded-full"
              />
              <span className="text-green-400 font-mono font-semibold text-lg">Live Activity</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              <AnimatePresence>
                {visualLogs.map((log, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -30, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 30, scale: 0.9 }}
                    className="text-gray-300 font-mono text-sm"
                  >
                    <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> 
                    <span className="ml-2">{log}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Visual PDF Demo */}
      {showPDFDemo && (
        <div className="mb-6">
          <VisualPDFDemo />
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        {/* Lijevi panel - Voice Input */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-sm h-fit">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Glasovni unos
            </h3>
            <VoiceRecorder onTranscript={handleTranscript} loading={loading} />
          </div>

          {transcript && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Transkript
              </h4>
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 border-l-4 border-blue-400">
                {transcript}
              </div>
            </div>
          )}

          {multimodalResult?.fileAnalyses && multimodalResult.fileAnalyses.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Analizirane datoteke
              </h4>
              <div className="space-y-3">
                {multimodalResult.fileAnalyses.map((fileAnalysis, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">
                        <span className="inline-flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          {fileAnalysis.filename}
                        </span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {fileAnalysis.analysis?.type || 'N/A'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {fileAnalysis.analysis?.text?.substring(0, 150) || 
                       JSON.stringify(fileAnalysis.analysis?.json)?.substring(0, 150) ||
                       'Nema analize'}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {multimodalResult?.actionItems && multimodalResult.actionItems.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Preporučene akcije
              </h4>
              <div className="space-y-2">
                {multimodalResult.actionItems.map((action, index) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span className="text-gray-700">{action.description || action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Document Results */}
          {multimodalResult?.stage && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                Smart Document Processing
              </h4>
              
              {/* Document Match */}
              {multimodalResult.documentMatch && (
                <div className="mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-800 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                      Matched Document
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      multimodalResult.documentMatch.matchedDocument ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {multimodalResult.documentMatch.matchedDocument ? 'Found' : 'Not Found'}
                    </span>
                  </div>
                  {multimodalResult.documentMatch.matchedDocument ? (
                    <div className="text-sm text-gray-700">
                      <div><strong>File:</strong> {multimodalResult.documentMatch.matchedDocument.filename}</div>
                      <div><strong>Confidence:</strong> {(multimodalResult.documentMatch.matchedDocument.confidence * 100).toFixed(1)}%</div>
                      <div><strong>Action:</strong> {multimodalResult.documentMatch.command?.action}</div>
                      <div><strong>Query:</strong> {multimodalResult.documentMatch.command?.query}</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">
                      Document not found in registry
                    </div>
                  )}
                </div>
              )}

              {/* Document Analysis */}
              {multimodalResult.selectedDocument && (
                <div className="mb-4 p-3 bg-green-50 rounded border-l-4 border-green-400">
                  <div className="font-medium text-green-800 mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                    Document Analysis
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div><strong>Document:</strong> {multimodalResult.selectedDocument.filename}</div>
                    <div><strong>Type:</strong> {multimodalResult.selectedDocument.type}</div>
                    <div><strong>Size:</strong> {(multimodalResult.selectedDocument.size / 1024).toFixed(1)}KB</div>
                  </div>
                  
                  {multimodalResult.analysis && (
                    <div className="mt-3 p-2 bg-white rounded border text-xs">
                      <div className="font-medium mb-1">Analysis Result:</div>
                      <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                        {multimodalResult.analysis.rawResponse || JSON.stringify(multimodalResult.analysis, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Processing Stages */}
              {multimodalResult.processing && (
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <div className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                    Processing Stages
                  </div>
                  <div className="space-y-1 text-gray-600">
                    <div>• {multimodalResult.processing.stage1}</div>
                    <div>• {multimodalResult.processing.stage2}</div>
                    <div>• Status: <span className="font-medium">{multimodalResult.stage}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Centralni panel - Pipeline Viewer */}
        <div className="col-span-5">
          <div className="bg-white p-4 rounded-lg shadow-sm h-full">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              Pipeline pregled
            </h3>
            <PipelineViewer
              draftJson={draftJson}
              finalJson={finalJson}
              logs={logs}
              loading={loading}
            />
          </div>
        </div>

        {/* Desni panel - Form Preview */}
        <div className="col-span-4">
          {draftJson ? (
            <div className="bg-white p-4 rounded-lg shadow-sm h-full">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                Pregled i uređivanje
              </h3>
              <FormPreview 
                draft={draftJson} 
                onConfirm={handleConfirm}
                loading={loading}
              />
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg shadow-sm h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full"></div>
                  </div>
                </div>
                <p>Snimite glasovnu naredbu da počnete</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}