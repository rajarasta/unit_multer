import { useState, useEffect, useMemo } from 'react';
import { sendChatMessage } from '../../LLMServerManager/llmBridge';
import { useLLMSession } from '../../LLMServerManager/llmSessionStore';

const useMultiInputChat = (extractTextFromUnit, unitStates) => {
  const { activeSession } = useLLMSession ? useLLMSession() : { activeSession: null };

  const [multiOpen, setMultiOpen] = useState(false);
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [input3, setInput3] = useState('');
  const [response, setResponse] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [model, setModel] = useState(activeSession?.selectedModel || 'openai-oss-20b');
  const [baseUrl, setBaseUrl] = useState(activeSession?.baseUrl || 'http://10.71.21.136:1234');
  const [lastRequestPreview, setLastRequestPreview] = useState('');

  const combinedPrompt = useMemo(() => {
    return [
      input1 && `# Input 1\n${input1}`,
      input2 && `# Input 2\n${input2}`,
      input3 && `# Input 3\n${input3}`,
      'Make a short story inspired by these inputs. Take your time in thinking.'
    ].filter(Boolean).join('\n\n');
  }, [input1, input2, input3]);

  // Prefill inputs from Units 1–3 when opening the drawer (only if empty)
  useEffect(() => {
    if (multiOpen && extractTextFromUnit && unitStates) {
      const u1 = extractTextFromUnit(unitStates[1]);
      const u2 = extractTextFromUnit(unitStates[2]);
      const u3 = extractTextFromUnit(unitStates[3]);
      if (!input1 && u1) setInput1(u1);
      if (!input2 && u2) setInput2(u2);
      if (!input3 && u3) setInput3(u3);
    }
  }, [multiOpen, extractTextFromUnit, unitStates, input1, input2, input3]);

  const sendCombinedMessage = async () => {
    setIsSending(true);
    setError(null);
    setResponse('');

    try {
      const sessionLike = {
        activeSession: {
          sessionId: 'multiinput-local',
          engineType: 'lm_studio',
          baseUrl,
          apiKey: '',
          selectedModel: model,
          systemPrompt: '',
          modelParams: {
            temperature: 0.7,
            max_tokens: 1024,
            top_p: 0.95,
            top_k: 50,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop: []
          }
        }
      };

      setLastRequestPreview(combinedPrompt);
      const res = await sendChatMessage(combinedPrompt, { session: sessionLike });

      if (res.success) {
        setResponse(res.data?.content || '');
      } else {
        setError(res.error?.message || 'LLM error');
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setIsSending(false);
    }
  };

  const fillFromUnits = () => {
    if (extractTextFromUnit && unitStates) {
      setInput1(extractTextFromUnit(unitStates[1]));
      setInput2(extractTextFromUnit(unitStates[2]));
      setInput3(extractTextFromUnit(unitStates[3]));
    }
  };

  const clearInputs = () => {
    setInput1('');
    setInput2('');
    setInput3('');
    setResponse('');
    setError(null);
    setLastRequestPreview('');
  };

  return {
    // State
    multiOpen,
    setMultiOpen,
    input1,
    setInput1,
    input2,
    setInput2,
    input3,
    setInput3,
    response,
    setResponse,
    isSending,
    error,
    setError,
    model,
    setModel,
    baseUrl,
    setBaseUrl,
    lastRequestPreview,
    combinedPrompt,

    // Actions
    sendCombinedMessage,
    fillFromUnits,
    clearInputs
  };
};

export default useMultiInputChat;