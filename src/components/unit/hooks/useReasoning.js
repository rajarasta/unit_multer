import { useState, useRef, useCallback } from 'react';
import { mockLLMService, STATUS_TYPES } from '../../../services/mockLLMService';
import { generateId, canProcessContent } from '../../../utils/helpers';
import { Brain } from 'lucide-react';

export default function useReasoning({ id, setProcessingStatus }) {
  const [reasoningState, setReasoningState] = useState({
    isActive: false,
    reasoningId: null,
    steps: [],
    currentStep: 0,
    status: 'idle',
    result: null,
    error: null
  });

  const reasoningAbortControllerRef = useRef(null);

  const startReasoningProcess = useCallback(async (unitType, content) => {
    if (!canProcessContent(unitType, content) || reasoningState.isActive) {
      return;
    }

    const reasoningId = generateId('reasoning');
    reasoningAbortControllerRef.current = new AbortController();

    setProcessingStatus(prev => ({ ...prev, processing: STATUS_TYPES.PROCESSING.REASONING }));
    setReasoningState({
      isActive: true,
      reasoningId,
      steps: [],
      currentStep: 0,
      status: 'processing',
      result: null,
      error: null
    });

    try {
      await mockLLMService.startReasoning(
        id,
        unitType,
        content,
        (progressData) => {
          setReasoningState(prev => {
            const nextSteps = [...(prev.steps || [])];
            if (progressData && typeof progressData.content === 'string') {
              nextSteps.push({ icon: Brain, text: progressData.content, confidence: progressData.confidence });
            }
            return {
              ...prev,
              steps: progressData.steps || nextSteps,
              currentStep: progressData.step || (progressData.content ? nextSteps.length : prev.currentStep),
              status: progressData.status || prev.status,
              result: progressData.result || prev.result,
              error: progressData.error || prev.error
            };
          });
        }
      );

      setProcessingStatus(prev => ({
        ...prev,
        processing: STATUS_TYPES.PROCESSING.PROCESSED,
        hasProcessedContent: true,
        readyForBigProcessing: true,
        queue: STATUS_TYPES.QUEUE.READY
      }));
    } catch (error) {
      console.error('Reasoning failed:', error);
      setReasoningState(prev => ({ ...prev, status: 'error', error: error.message }));
      setProcessingStatus(prev => ({ ...prev, processing: STATUS_TYPES.PROCESSING.ERROR }));
    }
  }, [id, reasoningState.isActive, setProcessingStatus]);

  const cancelReasoningProcess = useCallback(() => {
    setReasoningState(prev => ({ ...prev, isActive: false, status: 'cancelled' }));
    if (reasoningState.reasoningId && reasoningAbortControllerRef.current) {
      reasoningAbortControllerRef.current.abort();
      mockLLMService.cancelReasoning(reasoningState.reasoningId);
    }
    setProcessingStatus(prev => ({ ...prev, processing: STATUS_TYPES.PROCESSING.CANCELLED }));
  }, [reasoningState.reasoningId, setProcessingStatus]);

  return {
    reasoningState,
    setReasoningState,
    startReasoningProcess,
    cancelReasoningProcess
  };
}

