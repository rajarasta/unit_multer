import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Bell, Search, Plus, Download, Share, Brain, Send } from 'lucide-react';
import Unit from './Unit';
import { sendChatMessage } from './LLMServerManager/llmBridge';
import { useLLMSession } from './LLMServerManager/llmSessionStore';

const PlaceholderTab = () => {
  const [unitStates, setUnitStates] = useState({
    1: { type: 'empty', content: null },
    2: { type: 'empty', content: null },
    3: { type: 'empty', content: null },
    4: { type: 'empty', content: null }
  });

  // Multi-input chat UI state
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

  const extractTextFromUnit = useCallback((u) => {
    if (!u) return '';
    if (typeof u.content === 'string') return u.content;
    if (u && u.content && typeof u.content === 'object' && 'name' in u.content) {
      return `[${u.type}] File: ${u.content.name}`;
    }
    return u?.type ? `[${u.type}]` : '';
  }, []);

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
    if (multiOpen) {
      const u1 = extractTextFromUnit(unitStates[1]);
      const u2 = extractTextFromUnit(unitStates[2]);
      const u3 = extractTextFromUnit(unitStates[3]);
      if (!input1 && u1) setInput1(u1);
      if (!input2 && u2) setInput2(u2);
      if (!input3 && u3) setInput3(u3);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multiOpen]);

  const staticIcons = [
    { icon: Settings, label: 'Settings' },
    { icon: Brain, label: 'Multi-Input Chat', onClick: () => setMultiOpen(v => !v) }
  ];

  const handleContentChange = useCallback((unitId, type, content) => {
    setUnitStates(prev => ({
      ...prev,
      [unitId]: { type, content }
    }));
  }, []);

  return (
    <div className="h-screen flex -m-6 mb-0">
        {/* Main Container - 2x2 Grid */}
        <div className="flex-1 p-1">
          <div className="grid grid-cols-2 grid-rows-2 gap-1 min-h-full">
            {[1, 2, 3, 4].map((unitId, index) => (
              <motion.div
                key={unitId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="h-full"
              >
                <Unit
                  id={unitId}
                  onContentChange={handleContentChange}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-16 bg-slate-50 border-l border-slate-200 flex flex-col items-center py-4 space-y-3 relative">
          {staticIcons.map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 group"
              title={action.label}
              onClick={action.onClick}
            >
              <action.icon 
                size={20} 
                className="text-slate-600 group-hover:text-slate-800 transition-colors" 
              />
            </motion.button>
          ))}
        </div>

        {/* Multi-Input Chat Drawer */}
        <AnimatePresence>
          {multiOpen && (
            <motion.div
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="fixed right-16 top-0 h-full w-96 bg-white border-l border-slate-200 shadow-xl z-40"
            >
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={18} className="text-purple-600" />
                    <span className="text-sm font-semibold text-slate-700">Multi-Input Chat</span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600" onClick={() => setMultiOpen(false)}>✕</button>
                </div>

                <div className="p-3 space-y-2 overflow-auto">
                  <div>
                    <label className="text-xs text-slate-500">Base URL</label>
                    <input
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Model</label>
                    <input
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Input 1</label>
                    <textarea value={input1} onChange={e => setInput1(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Input 2</label>
                    <textarea value={input2} onChange={e => setInput2(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Input 3</label>
                    <textarea value={input3} onChange={e => setInput3(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded text-xs" />
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="text-[11px] text-slate-400">Chars: {combinedPrompt.length}</div>
                    <button
                      disabled={isSending || combinedPrompt.trim().length === 0}
                      onClick={async () => {
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
                      }}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs text-white ${isSending ? 'bg-slate-400' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                      <Send size={14} />
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>

                  {/* Quick fill from Units */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="px-2 py-1 text-[11px] border rounded text-slate-600 hover:bg-slate-50"
                      onClick={() => {
                        setInput1(extractTextFromUnit(unitStates[1]));
                        setInput2(extractTextFromUnit(unitStates[2]));
                        setInput3(extractTextFromUnit(unitStates[3]));
                      }}
                    >Use Units 1–3</button>
                    <span className="text-[11px] text-slate-400">Tip: Prefill pulls text from Units 1–3.</span>
                  </div>

                  {error && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-2">{error}</div>
                  )}

                  {response && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-slate-600 mb-1">Response</div>
                      <div className="text-xs whitespace-pre-wrap p-2 border rounded bg-slate-50 max-h-48 overflow-auto">{response}</div>
                    </div>
                  )}

                  {lastRequestPreview && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-slate-600 mb-1">Sent Prompt Preview</div>
                      <div className="text-[11px] whitespace-pre-wrap p-2 border rounded bg-slate-50 max-h-40 overflow-auto">{lastRequestPreview}</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

    </div>
  );
};

export default PlaceholderTab;
