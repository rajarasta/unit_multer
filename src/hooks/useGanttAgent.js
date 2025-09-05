import { useState, useCallback, useRef, useEffect } from 'react';
import AgentOrchestrator from '../services/AgentOrchestrator.js';

const GANTT_AGENT_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  WAITING_CONFIRMATION: 'waiting_confirmation',
  COMMITTING: 'committing',
  ERROR: 'error'
};

const PROCESSING_STAGES = [
  { id: 'asr', name: 'Prepoznavanje govora', icon: '🎤' },
  { id: 'intent', name: 'Analiza namjere', icon: '🧠' },
  { id: 'agent', name: 'AI agent', icon: '🤖' },
  { id: 'ui', name: 'Ažuriranje sučelja', icon: '🖥️' }
];

export function useGanttAgent(projectId = null) {
  // Core state
  const [state, setState] = useState(GANTT_AGENT_STATES.IDLE);
  const [draft, setDraft] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [processStages, setProcessStages] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);

  // Refs
  const orchestratorRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const stageTimeoutsRef = useRef(new Map());

  // Initialize orchestrator
  useEffect(() => {
    if (!orchestratorRef.current) {
      orchestratorRef.current = new AgentOrchestrator();
      console.log('🔧 Gantt Agent orchestrator initialized');
    }
    
    return () => {
      // Cleanup any ongoing processes
      stopListening();
      clearAllStageTimeouts();
    };
  }, []);

  // Stage management utilities
  const updateStage = useCallback((stageId, status, data = null) => {
    setProcessStages(prev => {
      const existingIndex = prev.findIndex(s => s.id === stageId);
      const stage = PROCESSING_STAGES.find(s => s.id === stageId);
      
      if (!stage) return prev;
      
      const updatedStage = {
        ...stage,
        status,
        data,
        timestamp: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        const newStages = [...prev];
        newStages[existingIndex] = updatedStage;
        return newStages;
      } else {
        return [...prev, updatedStage];
      }
    });
  }, []);

  const clearAllStageTimeouts = useCallback(() => {
    stageTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    stageTimeoutsRef.current.clear();
  }, []);

  const clearStages = useCallback(() => {
    setProcessStages([]);
    clearAllStageTimeouts();
  }, [clearAllStageTimeouts]);

  // Audio recording utilities
  const startListening = useCallback(async () => {
    try {
      setError(null);
      setIsListening(true);
      setState(GANTT_AGENT_STATES.LISTENING);
      clearStages();
      setTranscript('');
      
      console.log('🎤 Starting audio recording...');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log('🛑 Recording stopped, processing audio...');
        processRecordedAudio();
      };

      mediaRecorderRef.current.start();
      console.log('✅ Recording started');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      setError('Greška pri pokretanju snimanja: ' + error.message);
      setState(GANTT_AGENT_STATES.ERROR);
      setIsListening(false);
    }
  }, [clearStages]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('⏹️ Stopping recording...');
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    setIsListening(false);
  }, []);

  const processRecordedAudio = useCallback(async () => {
    try {
      setState(GANTT_AGENT_STATES.PROCESSING);
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('🎵 Audio blob created:', audioBlob.size, 'bytes');

      // Process through orchestrator
      const result = await orchestratorRef.current.processGanttVoiceCommand({
        audioBlob,
        draftContext: draft,
        projectId
      });

      console.log('✅ Voice command processed:', result);

      if (result.type === 'error') {
        throw new Error(result.error);
      }

      // Update state with results
      setTranscript(result.transcript);
      setLastResponse(result.agent_response);

      // Apply UI patches from agent response
      if (result.agent_response?.ui_patches) {
        await applyUIPatches(result.agent_response.ui_patches);
      }

      // Determine next state based on agent response
      if (result.agent_response?.commit_mode) {
        setState(GANTT_AGENT_STATES.COMMITTING);
      } else if (result.agent_response?.ui_patches?.some(p => p.op === 'set_active_line')) {
        setState(GANTT_AGENT_STATES.WAITING_CONFIRMATION);
      } else {
        setState(GANTT_AGENT_STATES.IDLE);
      }

    } catch (error) {
      console.error('❌ Audio processing error:', error);
      setError('Greška pri obradi glasovne naredbe: ' + error.message);
      setState(GANTT_AGENT_STATES.ERROR);
    }
  }, [draft, projectId]);

  // UI patch application
  const applyUIPatches = useCallback(async (patches) => {
    console.log('🔄 Applying UI patches:', patches.length);
    
    for (const patch of patches) {
      switch (patch.op) {
        case 'init_draft':
          setDraft({
            draftId: patch.draft_id,
            projectId: patch.project_id,
            process: patch.process,
            dateRange: patch.date_range,
            teams: patch.teams,
            workHours: patch.work_hours,
            lines: new Map(),
            activeLineId: null,
            status: 'active',
            created: new Date().toISOString()
          });
          console.log('📋 Draft initialized:', patch.draft_id);
          break;

        case 'upsert_line':
          setDraft(prev => {
            if (!prev) return prev;
            const newLines = new Map(prev.lines);
            newLines.set(patch.line.id, patch.line);
            return { ...prev, lines: newLines };
          });
          console.log('📝 Line upserted:', patch.line.id);
          break;

        case 'set_active_line':
          setDraft(prev => prev ? { ...prev, activeLineId: patch.line_id } : prev);
          console.log('🎯 Active line set:', patch.line_id);
          break;

        case 'mark_line_confirmed':
          setDraft(prev => {
            if (!prev) return prev;
            const newLines = new Map(prev.lines);
            const line = newLines.get(patch.line_id);
            if (line) {
              newLines.set(patch.line_id, { ...line, confirmed: patch.confirmed });
            }
            return { ...prev, lines: newLines };
          });
          console.log('✅ Line confirmed:', patch.line_id);
          break;

        default:
          console.warn('⚠️ Unknown patch operation:', patch.op);
      }
    }
  }, []);

  // Manual text processing (za debugging)
  const processTextCommand = useCallback(async (text) => {
    try {
      setState(GANTT_AGENT_STATES.PROCESSING);
      setError(null);
      clearStages();

      console.log('📝 Processing text command:', text);

      const result = await orchestratorRef.current.processGanttVoiceCommand({
        transcript: text,
        draftContext: draft,
        projectId
      });

      console.log('✅ Text command processed:', result);

      if (result.type === 'error') {
        throw new Error(result.error);
      }

      setTranscript(result.transcript);
      setLastResponse(result.agent_response);

      if (result.agent_response?.ui_patches) {
        await applyUIPatches(result.agent_response.ui_patches);
      }

      setState(GANTT_AGENT_STATES.IDLE);

    } catch (error) {
      console.error('❌ Text processing error:', error);
      setError('Greška pri obradi tekstualne naredbe: ' + error.message);
      setState(GANTT_AGENT_STATES.ERROR);
    }
  }, [draft, projectId, clearStages, applyUIPatches]);

  // Confirm line operation
  const confirmLine = useCallback(async (lineId) => {
    try {
      setState(GANTT_AGENT_STATES.PROCESSING);
      
      const confirmResult = await orchestratorRef.current.processConfirmOperation(
        draft,
        'line_confirm',
        `Potvrđujem liniju ${lineId}`
      );

      console.log('✅ Line confirmed:', confirmResult);
      
      if (confirmResult.updated_draft) {
        setDraft(confirmResult.updated_draft);
      }

      setLastResponse(confirmResult);
      setState(GANTT_AGENT_STATES.IDLE);

    } catch (error) {
      console.error('❌ Confirm line error:', error);
      setError('Greška pri potvrdi linije: ' + error.message);
      setState(GANTT_AGENT_STATES.ERROR);
    }
  }, [draft]);

  // Commit draft to project
  const commitDraft = useCallback(async () => {
    if (!draft || !projectId) {
      throw new Error('Nema draft-a ili projectId za commit');
    }

    try {
      setState(GANTT_AGENT_STATES.COMMITTING);
      
      const commitResult = await orchestratorRef.current.processCommitOperation(
        draft,
        projectId
      );

      console.log('💾 Draft committed:', commitResult);
      
      // Clear draft after successful commit
      setDraft(null);
      setLastResponse(commitResult);
      setState(GANTT_AGENT_STATES.IDLE);

      return commitResult;

    } catch (error) {
      console.error('❌ Commit error:', error);
      setError('Greška pri commit-u: ' + error.message);
      setState(GANTT_AGENT_STATES.ERROR);
      throw error;
    }
  }, [draft, projectId]);

  // Reset agent state
  const resetAgent = useCallback(() => {
    stopListening();
    setState(GANTT_AGENT_STATES.IDLE);
    setDraft(null);
    setLastResponse(null);
    setTranscript('');
    setError(null);
    clearStages();
    console.log('🔄 Gantt Agent reset');
  }, [stopListening, clearStages]);

  return {
    // State
    state,
    draft,
    lastResponse,
    processStages,
    transcript,
    isListening,
    error,

    // Actions
    startListening,
    stopListening,
    processTextCommand,
    confirmLine,
    commitDraft,
    resetAgent,
    clearStages,

    // Utilities
    updateStage,
    applyUIPatches,

    // State checks
    isIdle: state === GANTT_AGENT_STATES.IDLE,
    isProcessing: state === GANTT_AGENT_STATES.PROCESSING,
    isWaitingConfirmation: state === GANTT_AGENT_STATES.WAITING_CONFIRMATION,
    isCommitting: state === GANTT_AGENT_STATES.COMMITTING,
    hasError: state === GANTT_AGENT_STATES.ERROR,

    // Draft info
    hasDraft: !!draft,
    draftId: draft?.draftId,
    activeLineId: draft?.activeLineId,
    linesCount: draft?.lines?.size || 0,
    confirmedLinesCount: draft ? Array.from(draft.lines.values()).filter(l => l.confirmed).length : 0,

    // Agent constants
    STATES: GANTT_AGENT_STATES,
    STAGES: PROCESSING_STAGES
  };
}