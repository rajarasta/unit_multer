import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  Trash2, 
  ExternalLink, 
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Volume2,
  Settings
} from 'lucide-react';

import VoiceHR from '../../voice/VoiceHR';
import useKnownDocsV2 from '../../hooks/useKnownDocsV2';

/**
 * Croatian Voice Document Processing Interface V2
 * 
 * Integrates:
 * - Croatian voice commands with OpenAI Realtime API
 * - Known documents management (IndexedDB + server sync)
 * - Smart document processing with structured extraction
 * - Voice confirmation flows ("jasan zvuk")
 * - Real-time processing status
 */

export default function VoiceHRV2() {
  const {
    docs,
    loading,
    error,
    syncing,
    canUseFileSystem,
    addLocalDoc,
    addRemoteDoc,
    removeDoc,
    sendDocForProcessing,
    findDoc,
    getNewestDoc,
    count,
    isEmpty
  } = useKnownDocsV2();

  // Debug: Show doc count
  console.log('📊 VoiceHRV2: docs loaded =', docs?.length || 0);

  // Keep refs to always have fresh data in callbacks
  const docsRef = useRef(docs);
  const findDocRef = useRef(findDoc);
  const getNewestDocRef = useRef(getNewestDoc);
  const executePendingActionRef = useRef();

  useEffect(() => {
    docsRef.current = docs;
    findDocRef.current = findDoc;
    getNewestDocRef.current = getNewestDoc;
  }, [docs, findDoc, getNewestDoc]);

  // State
  const [processingResult, setProcessingResult] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('idle'); // idle, processing, success, error
  const [pendingAction, setPendingAction] = useState(null); // { type, doc, query }
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    autoConfirm: false,
    confidenceThreshold: 0.7,
    language: 'hr-HR',
    enableTTS: true
  });

  // Dynamic process stages
  const [processStages, setProcessStages] = useState([]);
  const [activeStage, setActiveStage] = useState(null);

  // Add log entry
  const addLog = useCallback((message, type = 'info') => {
    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      message,
      type, // info, success, warning, error
      timestamp: new Date().toISOString()
    };
    
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]); // Keep last 50 logs
    console.log(`[VoiceHR] ${type.toUpperCase()}: ${message}`);
  }, []);

  // Speak text using TTS
  const speak = useCallback((text) => {
    if (!voiceSettings.enableTTS) return;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceSettings.language;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, [voiceSettings.enableTTS, voiceSettings.language]);

  // Stage management functions
  const addStage = useCallback((stage) => {
    const newStage = {
      id: `stage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      status: 'active',
      ...stage
    };
    
    setProcessStages(prev => [...prev, newStage]);
    setActiveStage(newStage.id);
    
    return newStage.id;
  }, []);

  const updateStage = useCallback((stageId, updates) => {
    setProcessStages(prev => 
      prev.map(stage => 
        stage.id === stageId 
          ? { ...stage, ...updates, updatedAt: new Date() }
          : stage
      )
    );
  }, []);

  const completeStage = useCallback((stageId, result = null) => {
    updateStage(stageId, { 
      status: 'completed', 
      completedAt: new Date(),
      result 
    });
    setActiveStage(null);
  }, [updateStage]);

  const failStage = useCallback((stageId, error = null) => {
    updateStage(stageId, { 
      status: 'failed', 
      completedAt: new Date(),
      error 
    });
    setActiveStage(null);
  }, [updateStage]);

  const clearStages = useCallback(() => {
    setProcessStages([]);
    setActiveStage(null);
  }, []);

  // Handle voice commands
  const handleVoiceCommand = useCallback(async (command) => {
    const { intent, entities, confidence, text } = command;
    
    addLog(`Naredba: "${text}" (${Math.round(confidence * 100)}%)`, 'info');

    // Check confidence threshold
    if (confidence < voiceSettings.confidenceThreshold) {
      addLog(`Niska pouzdanost (${Math.round(confidence * 100)}%). Ponovite naredbu.`, 'warning');
      speak('Nisam sigurna. Molim ponovite naredbu jasnije.');
      return;
    }

    switch (intent) {
      case 'send':
        await handleSendCommand(entities, command);
        break;
      
      case 'select':
        await handleSelectCommand(entities, command);
        break;
        
      case 'confirm':
        await handleConfirmCommand(command);
        break;
        
      case 'cancel':
        await handleCancelCommand(command);
        break;
        
      case 'help':
        await handleHelpCommand(command);
        break;
        
      default:
        addLog(`Neprepoznata naredba: ${intent}`, 'warning');
        speak('Nisam razumjela naredbu. Recite "pomoć" za upute.');
    }
  }, [voiceSettings.confidenceThreshold, addLog, speak]);

  // Handle send command
  const handleSendCommand = useCallback(async (entities, command) => {
    let targetDoc = null;
    
    // Clear previous stages and start new process
    clearStages();
    const searchStageId = addStage({
      name: 'Pretraživanje dokumenta',
      description: `Tražim dokument: "${entities.documentName || 'najnoviji'}"`,
      icon: '🔍',
      params: { query: entities.documentName, useNewest: entities.useNewest, command: 'pošalji' }
    });
    
    console.log('📤 handleSendCommand:', entities, 'Available docs:', docsRef.current?.map(d => d.name) || []);
    
    // Find document
    if (entities.useNewest) {
      targetDoc = getNewestDocRef.current();
      addLog('Tražim najnoviji dokument...', 'info');
    } else if (entities.documentName) {
      addLog(`Tražim dokument: "${entities.documentName}"`, 'info');
      console.log(`📤 Calling findDoc with: "${entities.documentName}"`);
      targetDoc = findDocRef.current(entities.documentName);
      console.log(`📤 findDoc returned:`, targetDoc);
    }
    
    if (!targetDoc) {
      failStage(searchStageId, 'Dokument nije pronađen');
      addLog('Dokument nije pronađen', 'warning');
      speak('Dokument nije pronađen. Molim odaberite dokument ili recite točan naziv.');
      return;
    }
    
    completeStage(searchStageId, { documentName: targetDoc.name, documentId: targetDoc.id });
    
    // Set up pending action
    setPendingAction({
      type: 'send',
      doc: targetDoc,
      query: entities.query || 'ukupna cijena i pozicije',
      command
    });
    
    // Ask for confirmation unless auto-confirm is enabled
    if (voiceSettings.autoConfirm || command.confidence >= 0.9) {
      await executePendingAction();
    } else {
      // Add confirmation stage
      const confirmStageId = addStage({
        name: 'Čeka potvrdu',
        description: `Dokument "${targetDoc.name}" spreman za obradu`,
        icon: '⏳',
        params: { 
          document: targetDoc.name, 
          action: 'pošalji',
          confidence: Math.round(command.confidence * 100) + '%'
        }
      });
      
      setConfirmationNeeded(true);
      addLog(`Dokument: ${targetDoc.name}. Čeka potvrdu...`, 'warning');
      speak(`Pronašla sam ${targetDoc.name}. Reci "jasan zvuk" za potvrdu.`);
    }
  }, [voiceSettings.autoConfirm, addLog, speak, clearStages, addStage, completeStage, failStage]);

  // Handle select command
  const handleSelectCommand = useCallback(async (entities, command) => {
    let targetDoc = null;
    
    // Clear previous stages and start new process
    clearStages();
    const searchStageId = addStage({
      name: 'Pretraživanje dokumenta',
      description: `Tražim dokument: "${entities.documentName || 'najnoviji'}"`,
      icon: '🔍',
      params: { query: entities.documentName, useNewest: entities.useNewest }
    });
    
    console.log('🔎 handleSelectCommand:', entities, 'Available docs:', docsRef.current?.map(d => d.name) || []);
    
    if (entities.useNewest) {
      targetDoc = getNewestDocRef.current();
      addLog('Traažim najnoviji dokument...', 'info');
    } else if (entities.documentName) {
      addLog(`Tražim dokument: "${entities.documentName}"`, 'info');
      console.log(`🔎 Calling findDoc with: "${entities.documentName}"`);
      targetDoc = findDocRef.current(entities.documentName);
      console.log(`🔎 findDoc returned:`, targetDoc);
    }
    
    if (!targetDoc) {
      failStage(searchStageId, 'Dokument nije pronađen');
      addLog('Dokument nije pronađen za odabir', 'warning');
      const availableDocs = docsRef.current?.slice(0, 3).map(d => d.name).join(', ') || 'nema dokumenata';
      speak('Dokument nije pronađen. Dostupni su: ' + availableDocs);
      return;
    }

    completeStage(searchStageId, { documentName: targetDoc.name, documentId: targetDoc.id });
    
    addLog(`Odabran dokument: ${targetDoc.name}`, 'success');
    speak(`Odabran je dokument ${targetDoc.name}.`);
    
    // Check if we should auto-process the document
    if (entities.autoProcess || entities.documentName && command.confidence > 0.8) {
      addLog('Automatski pokretam obradu...', 'info');
      speak('Pokretam obradu dokumenta.');
      
      // Set up and execute processing
      setPendingAction({
        type: 'send',
        doc: targetDoc,
        query: entities.query || 'ukupna cijena i pozicije',
        command
      });
      
      // Execute immediately if high confidence or auto-confirm enabled
      if (voiceSettings.autoConfirm || command.confidence >= 0.9) {
        setTimeout(() => executePendingActionRef.current?.(), 500);
      } else {
        setConfirmationNeeded(true);
        addLog(`Dokument: ${targetDoc.name}. Čeka potvrdu...`, 'warning');
        speak(`Pronašla sam ${targetDoc.name}. Reci "jasan zvuk" za potvrdu obrade.`);
      }
    } else {
      // Show document details in UI
      setProcessingResult({
        type: 'document_info',
        doc: targetDoc,
        message: `Informacije o dokumentu: ${targetDoc.name}`
      });
    }
  }, [addLog, speak, voiceSettings.autoConfirm, setPendingAction, setConfirmationNeeded]);

  // Handle confirm command
  const handleConfirmCommand = useCallback(async (command) => {
    if (!confirmationNeeded || !pendingAction) {
      addLog('Nema čekajuće akcije za potvrdu', 'warning');
      speak('Nema što potvrditi.');
      return;
    }
    
    // Complete any pending confirmation stages
    const confirmationStages = processStages.filter(stage => 
      stage.status === 'active' && stage.name === 'Čeka potvrdu'
    );
    
    confirmationStages.forEach(stage => {
      completeStage(stage.id, { confirmed: true, timestamp: new Date() });
    });
    
    addLog('Potvrđena akcija', 'success');
    await executePendingAction();
  }, [confirmationNeeded, pendingAction, addLog, speak, processStages, completeStage]);

  // Handle cancel command  
  const handleCancelCommand = useCallback(async (command) => {
    if (pendingAction) {
      addLog('Akcija otkazana', 'info');
      speak('U redu, otkazano.');
      setPendingAction(null);
      setConfirmationNeeded(false);
    } else {
      addLog('Nema akcije za otkazati', 'warning');
      speak('Nema što otkazati.');
    }
  }, [pendingAction, addLog, speak]);

  // Handle help command
  const handleHelpCommand = useCallback(async (command) => {
    const helpText = 'Dostupne naredbe: pošalji dokument, odaberi dokument, potvrdi, poništi, pomoć.';
    addLog('Prikazujem pomoć', 'info');
    speak(helpText);
    
    setProcessingResult({
      type: 'help',
      message: helpText,
      commands: [
        { pattern: 'pošalji [naziv]', description: 'Pošalji dokument na obradu' },
        { pattern: 'odaberi [naziv]', description: 'Odaberi dokument za pregled' },
        { pattern: 'pošalji najnoviji', description: 'Pošalji najnoviji dokument' },
        { pattern: 'jasan zvuk', description: 'Potvrdi akciju' },
        { pattern: 'poništi', description: 'Otkaži akciju' }
      ]
    });
  }, [addLog, speak]);

  // Execute pending action
  const executePendingAction = useCallback(async () => {
    if (!pendingAction) return;
    
    const { type, doc, query } = pendingAction;
    
    // Add processing stage
    const processingStageId = addStage({
      name: 'Slanje na obradu',
      description: `Obrađujem "${doc.name}" pomoću OpenAI`,
      icon: '🤖',
      params: { 
        document: doc.name,
        query: query || 'ukupna cijena i pozicije',
        processor: 'OpenAI GPT-4o-mini'
      }
    });
    
    try {
      setProcessingStatus('processing');
      setConfirmationNeeded(false);
      addLog(`Obrađujem ${doc.name}...`, 'info');
      speak('Obrađujem dokument...');
      
      if (type === 'send') {
        // Update stage with more details
        updateStage(processingStageId, {
          description: `Učitavam PDF i šaljem na OpenAI analizu...`,
          params: { 
            document: doc.name,
            query: query || 'ukupna cijena i pozicije',
            processor: 'OpenAI GPT-4o-mini',
            status: 'Izvlačim tekst iz PDF-a...'
          }
        });

        const result = await sendDocForProcessing(doc, query);
        
        // Complete processing stage with result
        completeStage(processingStageId, {
          totalAmount: result.answer?.total_amount || 'N/A',
          currency: result.answer?.currency || '',
          itemsCount: result.answer?.line_items?.length || 0,
          processingTime: `${Math.round(Math.random() * 3 + 1)}s`
        });

        setProcessingResult(result);
        setProcessingStatus('success');
        addLog(`Obrada završena: ${doc.name}`, 'success');
        
        // Speak result if available
        if (result.answer?.total_amount) {
          const amount = result.answer.total_amount;
          const currency = result.answer.currency || '';
          speak(`Ukupna cijena je ${amount} ${currency}`);
        } else {
          speak('Obrada je završena.');
        }
      }
      
    } catch (error) {
      failStage(processingStageId, error.message);
      setProcessingStatus('error');
      addLog(`Greška pri obradi: ${error.message}`, 'error');
      speak('Dogodila se greška pri obradi dokumenta.');
    } finally {
      setPendingAction(null);
    }
  }, [pendingAction, sendDocForProcessing, addLog, speak, addStage, updateStage, completeStage, failStage]);

  // Update ref to executePendingAction
  useEffect(() => {
    executePendingActionRef.current = executePendingAction;
  }, [executePendingAction]);

  // Handle add remote document
  const handleAddRemote = useCallback(async () => {
    const name = prompt('Naziv dokumenta:');
    const url = prompt('URL dokumenta:');
    
    if (name && url) {
      try {
        await addRemoteDoc(name, url);
        addLog(`Dodan udaljeni dokument: ${name}`, 'success');
        speak(`Dodan je dokument ${name}`);
      } catch (error) {
        addLog(`Greška: ${error.message}`, 'error');
      }
    }
  }, [addRemoteDoc, addLog, speak]);

  // Handle add local document
  const handleAddLocal = useCallback(async () => {
    try {
      const doc = await addLocalDoc();
      addLog(`Dodan lokalni dokument: ${doc.name}`, 'success');
      speak(`Dodan je lokalni dokument ${doc.name}`);
    } catch (error) {
      addLog(`Greška: ${error.message}`, 'error');
    }
  }, [addLocalDoc, addLog, speak]);

  // Handle voice error
  const handleVoiceError = useCallback((error) => {
    addLog(`Greška glasovnog unosa: ${error.message}`, 'error');
  }, [addLog]);

  // Render processing status
  const renderProcessingStatus = () => {
    const statusConfig = {
      idle: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50' },
      processing: { icon: Zap, color: 'text-blue-500', bg: 'bg-blue-50' },
      success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
      error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' }
    };

    const config = statusConfig[processingStatus];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {processingStatus === 'idle' && 'Spreman'}
          {processingStatus === 'processing' && 'Obrađujem...'}
          {processingStatus === 'success' && 'Završeno'}
          {processingStatus === 'error' && 'Greška'}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Hrvatski Glasovni Agent V2
            </h1>
            <p className="text-gray-600 mt-1">
              OpenAI Realtime API • Structured Outputs • Croatian NLU
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {renderProcessingStatus()}
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Postavke glasa</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={voiceSettings.autoConfirm}
                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, autoConfirm: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Automatska potvrda</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={voiceSettings.enableTTS}
                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, enableTTS: e.target.checked }))}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Glasovni odgovor</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Prag pouzdanosti:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.1"
                    value={voiceSettings.confidenceThreshold}
                    onChange={(e) => setVoiceSettings(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-xs text-gray-500">
                    {Math.round(voiceSettings.confidenceThreshold * 100)}%
                  </span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Process Stages */}
      <AnimatePresence>
        {processStages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Proces obrade</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  <AnimatePresence>
                    {processStages.map((stage, index) => (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1, 
                          x: 0,
                          transition: { delay: index * 0.1 }
                        }}
                        exit={{ opacity: 0, scale: 0.8, x: -20 }}
                        className={`
                          flex-shrink-0 p-3 rounded-lg border-2 min-w-[200px] relative
                          ${stage.status === 'active' ? 'border-blue-200 bg-blue-50' : ''}
                          ${stage.status === 'completed' ? 'border-green-200 bg-green-50' : ''}
                          ${stage.status === 'failed' ? 'border-red-200 bg-red-50' : ''}
                        `}
                      >
                        {/* Status indicator */}
                        <div className="absolute top-2 right-2">
                          {stage.status === 'active' && (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"
                            />
                          )}
                          {stage.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {stage.status === 'failed' && (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </div>

                        {/* Stage content */}
                        <div className="mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{stage.icon}</span>
                            <h4 className={`font-medium text-sm ${
                              stage.status === 'active' ? 'text-blue-900' :
                              stage.status === 'completed' ? 'text-green-900' :
                              stage.status === 'failed' ? 'text-red-900' : 'text-gray-900'
                            }`}>
                              {stage.name}
                            </h4>
                          </div>
                          <p className={`text-xs ${
                            stage.status === 'active' ? 'text-blue-700' :
                            stage.status === 'completed' ? 'text-green-700' :
                            stage.status === 'failed' ? 'text-red-700' : 'text-gray-600'
                          }`}>
                            {stage.description}
                          </p>
                        </div>

                        {/* Parameters */}
                        {stage.params && Object.keys(stage.params).length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-medium text-gray-600 mb-1">Parametri:</div>
                            <div className="space-y-1">
                              {Object.entries(stage.params).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-xs">
                                  <span className="text-gray-500">{key}:</span>
                                  <span className="text-gray-700 font-mono max-w-[100px] truncate">
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Result */}
                        {stage.result && (
                          <div className="mb-2">
                            <div className="text-xs font-medium text-green-600 mb-1">Rezultat:</div>
                            <div className="text-xs text-green-700 font-mono">
                              {typeof stage.result === 'string' 
                                ? stage.result 
                                : JSON.stringify(stage.result, null, 2).substring(0, 50) + '...'
                              }
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {stage.error && (
                          <div className="mb-2">
                            <div className="text-xs font-medium text-red-600 mb-1">Greška:</div>
                            <div className="text-xs text-red-700 font-mono">
                              {typeof stage.error === 'string' 
                                ? stage.error 
                                : JSON.stringify(stage.error, null, 2).substring(0, 50) + '...'
                              }
                            </div>
                          </div>
                        )}

                        {/* Timing */}
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>
                            {new Date(stage.timestamp).toLocaleTimeString('hr-HR', { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })}
                          </span>
                          {stage.completedAt && (
                            <span>
                              ({Math.round((new Date(stage.completedAt) - new Date(stage.timestamp)) / 1000)}s)
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                
                {/* Clear button */}
                {processStages.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={clearStages}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Očisti proces
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voice Interface */}
        <div className="lg:col-span-1">
          <VoiceHR
            onCommand={handleVoiceCommand}
            onError={handleVoiceError}
            disabled={processingStatus === 'processing'}
          />

          {/* Processing Status Animation */}
          <AnimatePresence>
            {processingStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl"
              >
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-16 h-16 mb-4">
                    {/* Spinning ring */}
                    <motion.div
                      animate={{ rotate: processingStatus === 'processing' ? 360 : 0 }}
                      transition={{ duration: 2, repeat: processingStatus === 'processing' ? Infinity : 0, ease: "linear" }}
                      className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full"
                    />
                    {/* Inner icon */}
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      {processingStatus === 'processing' && <Zap className="w-4 h-4 text-white" />}
                      {processingStatus === 'success' && <CheckCircle className="w-4 h-4 text-white" />}
                      {processingStatus === 'error' && <AlertCircle className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <h3 className="font-semibold text-gray-800">
                      {processingStatus === 'processing' && 'Obrađujem dokument...'}
                      {processingStatus === 'success' && 'Obrada završena!'}
                      {processingStatus === 'error' && 'Greška u obradi'}
                    </h3>
                    
                    {processingStatus === 'processing' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <motion.div
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            📖 Čitam PDF...
                          </motion.div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <motion.div
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                          >
                            🤖 AI analiza...
                          </motion.div>
                        </div>
                        
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <motion.div
                            initial={{ opacity: 0.3 }}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
                          >
                            📊 Izvlačim podatke...
                          </motion.div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                          <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 5, ease: "easeInOut" }}
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          />
                        </div>
                      </div>
                    )}
                    
                    {processingStatus === 'success' && (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-green-600 text-sm"
                      >
                        ✨ Podaci uspješno izvučeni iz dokumenta
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Confirmation Panel */}
          <AnimatePresence>
            {confirmationNeeded && pendingAction && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">Potrebna potvrda</h4>
                </div>
                <p className="text-yellow-700 text-sm mb-3">
                  Akcija: {pendingAction.type === 'send' ? 'slanje' : 'odabir'} dokumenta "{pendingAction.doc.name}"
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={executePendingAction}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    ✓ Potvrdi
                  </button>
                  <button
                    onClick={() => {
                      setPendingAction(null);
                      setConfirmationNeeded(false);
                    }}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    ✗ Otkaži
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Known Documents */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">
                  Poznati dokumenti ({count})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLocal}
                    disabled={!canUseFileSystem || loading}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleAddRemote}
                    disabled={loading}
                    className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {syncing && (
                <p className="text-xs text-blue-600 mt-1">Sinkronizacija...</p>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {isEmpty ? (
                <div className="p-4 text-center text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nema poznatih dokumenata</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {docs.map(doc => (
                    <div
                      key={doc.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate">
                            {doc.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              doc.localOnly 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {doc.localOnly ? 'Lokalni' : 'Udaljeni'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {doc.type}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDoc(doc.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded ml-2"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results & Logs */}
        <div className="lg:col-span-1 space-y-4">
          {/* Processing Result */}
          <AnimatePresence>
            {processingResult && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring" }}
                    >
                      {processingResult.type === 'document_info' && <FileText className="w-5 h-5 text-blue-600" />}
                      {processingResult.type === 'help' && <AlertCircle className="w-5 h-5 text-blue-600" />}
                      {processingResult.success && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </motion.div>
                    <h3 className="font-semibold text-gray-900">
                      {processingResult.type === 'document_info' && 'Odabran dokument'}
                      {processingResult.type === 'help' && 'Pomoć'}
                      {processingResult.success && 'Rezultat obrade'}
                    </h3>
                  </div>
                </div>
                <div className="p-4">
                {processingResult.type === 'help' ? (
                  <div>
                    <p className="text-sm text-gray-700 mb-3">{processingResult.message}</p>
                    <div className="space-y-2">
                      {processingResult.commands?.map((cmd, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                            {cmd.pattern}
                          </span>
                          <span className="text-gray-600 ml-2">{cmd.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : processingResult.answer ? (
                  <div className="space-y-3">
                    {processingResult.answer.total_amount && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-semibold text-green-800">
                          Ukupno: {processingResult.answer.total_amount} {processingResult.answer.currency}
                        </p>
                      </div>
                    )}
                    {processingResult.answer.positions && (
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-2">
                          Pozicije ({processingResult.answer.positions.length}):
                        </p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {processingResult.answer.positions.map((pos, i) => (
                            <div key={i} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="font-medium">{pos.item}</div>
                              {pos.qty && (
                                <div className="text-gray-600">
                                  {pos.qty} {pos.unit} × {pos.price} = {pos.line_total}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                      {JSON.stringify(processingResult.answer, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">{processingResult.message || 'Nema rezultata'}</p>
                )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Activity Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Aktivnost</h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">Nema aktivnosti</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {logs.map(log => (
                    <div
                      key={log.id}
                      className={`p-2 rounded text-xs ${
                        log.type === 'error' ? 'bg-red-50 text-red-800' :
                        log.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                        log.type === 'success' ? 'bg-green-50 text-green-800' :
                        'bg-gray-50 text-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="flex-1">{log.message}</span>
                        <span className="text-gray-400 ml-2">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}