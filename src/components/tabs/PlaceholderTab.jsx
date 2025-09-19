import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Bell, Search, Plus, Download, Share, Brain, Send, Activity, Type, Image, FileText, Table, Archive, File, Merge } from 'lucide-react';
import Unit from './Unit';
import { sendChatMessage } from './LLMServerManager/llmBridge';
import { useLLMSession } from './LLMServerManager/llmSessionStore';
import useConnectionStore from '../../store/useConnectionStore';
import SettingsModal from '../SettingsModal';
import { agentAnalyzeCombinedContent } from '../../utils/agentHelpers';
import { GoogleGenAI } from '@google/genai';

const PlaceholderTab = () => {
  const [unitStates, setUnitStates] = useState({
    1: { type: 'empty', content: null },
    2: { type: 'empty', content: null },
    3: { type: 'empty', content: null },
    4: { type: 'empty', content: null }
  });

  // Multi-phase icon states for dynamic functionality
  const [iconStates, setIconStates] = useState({});
  const [clickCounts, setClickCounts] = useState({});
  const [focusedUnitId, setFocusedUnitId] = useState(null);

  // Fusion icon states for multi-unit processing
  const [fusionIconStates, setFusionIconStates] = useState({});
  const [fusionClickCounts, setFusionClickCounts] = useState({});
  const [focusedFusionId, setFocusedFusionId] = useState(null);

  // Use persistent connection store
  const {
    getUnitConnection,
    getAllGroups,
    createConnectionGroup,
    removeUnitFromGroup,
    recoverConnections,
    getStats
  } = useConnectionStore();

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

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);

  // Multi-phase icon management
  useEffect(() => {
    const handleUnitProcessed = (event) => {
      const { unitId, unitType, content, hasProcessedContent } = event.detail;
      if (hasProcessedContent) {
        setIconStates(prev => ({
          ...prev,
          [unitId]: 'unprocessed'
        }));
        setClickCounts(prev => ({
          ...prev,
          [unitId]: 0
        }));
      }
    };

    const handleUnitReset = (event) => {
      const { unitId } = event.detail;
      setIconStates(prev => {
        const newStates = { ...prev };
        delete newStates[unitId];
        return newStates;
      });
      setClickCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[unitId];
        return newCounts;
      });
      if (focusedUnitId === unitId) {
        setFocusedUnitId(null);
      }
    };

    const handleReasoningStart = (event) => {
      const { unitId } = event.detail;
      setIconStates(prev => ({
        ...prev,
        [unitId]: 'processing'
      }));
    };

    const handleReasoningComplete = (event) => {
      const { unitId, success } = event.detail;
      setIconStates(prev => ({
        ...prev,
        [unitId]: success ? 'completed' : 'error'
      }));
    };

    const handleReasoningError = (event) => {
      const { unitId } = event.detail;
      setIconStates(prev => ({
        ...prev,
        [unitId]: 'error'
      }));
    };

    // Fusion icon processing event handlers
    const handleFusionProcessingStart = (event) => {
      const { fusionId } = event.detail;
      setFusionIconStates(prev => ({
        ...prev,
        [fusionId]: 'processing'
      }));
    };

    const handleFusionProcessingComplete = (event) => {
      const { fusionId, success } = event.detail;
      setFusionIconStates(prev => ({
        ...prev,
        [fusionId]: success ? 'completed' : 'error'
      }));
    };

    const handleFusionProcessingError = (event) => {
      const { fusionId } = event.detail;
      setFusionIconStates(prev => ({
        ...prev,
        [fusionId]: 'error'
      }));
    };

    const handleFusionReset = (event) => {
      const { fusionId } = event.detail;
      setFusionIconStates(prev => {
        const newStates = { ...prev };
        delete newStates[fusionId];
        return newStates;
      });
      setFusionClickCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[fusionId];
        return newCounts;
      });
      if (focusedFusionId === fusionId) {
        setFocusedFusionId(null);
      }
    };

    window.addEventListener('unit-processed', handleUnitProcessed);
    window.addEventListener('unit-reset', handleUnitReset);
    window.addEventListener('reasoning-started', handleReasoningStart);
    window.addEventListener('reasoning-completed', handleReasoningComplete);
    window.addEventListener('reasoning-error', handleReasoningError);

    // Fusion event listeners
    window.addEventListener('fusion-processing-start', handleFusionProcessingStart);
    window.addEventListener('fusion-processing-complete', handleFusionProcessingComplete);
    window.addEventListener('fusion-processing-error', handleFusionProcessingError);
    window.addEventListener('fusion-reset', handleFusionReset);

    return () => {
      window.removeEventListener('unit-processed', handleUnitProcessed);
      window.removeEventListener('unit-reset', handleUnitReset);
      window.removeEventListener('reasoning-started', handleReasoningStart);
      window.removeEventListener('reasoning-completed', handleReasoningComplete);
      window.removeEventListener('reasoning-error', handleReasoningError);

      // Fusion event cleanup
      window.removeEventListener('fusion-processing-start', handleFusionProcessingStart);
      window.removeEventListener('fusion-processing-complete', handleFusionProcessingComplete);
      window.removeEventListener('fusion-processing-error', handleFusionProcessingError);
      window.removeEventListener('fusion-reset', handleFusionReset);
    };
  }, [focusedUnitId, focusedFusionId]);

  const extractTextFromUnit = useCallback((u) => {
    if (!u) return '';
    if (typeof u.content === 'string') return u.content;
    if (u && u.content && typeof u.content === 'object' && 'name' in u.content) {
      return `[${u.type}] File: ${u.content.name}`;
    }
    return u?.type ? `[${u.type}]` : '';
  }, []);

  // Log function (needs to be defined before other functions that use it)
  const addLog = useCallback((type, message) => {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }, []);

  // Helper to collect combined data for multimodal processing using events
  const collectCombinedData = useCallback(async (unitIds) => {
    return new Promise((resolve) => {
      const requestId = `data-request-${Date.now()}`;
      const collectedData = {
        imageFile: null,
        textContent: '',
        circles: [],
        units: []
      };
      const responses = new Map();

      // Ensure unitIds are numbers
      const numericUnitIds = unitIds.map(id => Number(id));
      console.log(`🔄 Original unitIds: ${JSON.stringify(unitIds)} (${unitIds.map(u => typeof u).join(', ')})`);
      console.log(`🔄 Numeric unitIds: ${JSON.stringify(numericUnitIds)} (${numericUnitIds.map(u => typeof u).join(', ')})`);

      const handleResponse = (event) => {
        const { requestId: responseRequestId, unitId, data } = event.detail;
        console.log(`📥 Received response from Unit ${unitId}:`, data);
        if (responseRequestId === requestId) {
          responses.set(unitId, data);

          // Check if we have all responses
          if (responses.size === numericUnitIds.length) {
            console.log(`✅ Collected all ${numericUnitIds.length} responses, processing...`);
            // Process collected data
            numericUnitIds.forEach(unitId => {
              const unitData = responses.get(unitId);
              if (!unitData) return;

              collectedData.units.push({ id: unitId, type: unitData.type });

              // Collect image file and circles
              if (unitData.type === 'image' && unitData.content) {
                collectedData.imageFile = unitData.content;
                if (unitData.annotations && unitData.annotations.circles) {
                  collectedData.circles = unitData.annotations.circles;
                }
              }

              // Collect text content
              if (unitData.type === 'text' && unitData.content) {
                if (collectedData.textContent) {
                  collectedData.textContent += '\n\n--- Unit ' + unitId + ' ---\n' + unitData.content;
                } else {
                  collectedData.textContent = '--- Unit ' + unitId + ' ---\n' + unitData.content;
                }
              }
            });

            window.removeEventListener('unit-data-response', handleResponse);
            console.log(`🎯 Final collected data:`, collectedData);
            resolve(collectedData);
          }
        }
      };

      window.addEventListener('unit-data-response', handleResponse);

      // Request data from all units
      console.log(`🔄 Requesting data from units: ${numericUnitIds.join(', ')} with requestId: ${requestId}`);
      window.dispatchEvent(new CustomEvent('unit-data-request', {
        detail: { requestId, unitIds: numericUnitIds }
      }));

      // Timeout after 1 minute
      setTimeout(() => {
        console.log(`⏰ Timeout reached! Collected ${responses.size}/${numericUnitIds.length} responses`);
        console.log(`⏰ Missing responses from units:`, numericUnitIds.filter(id => !responses.has(id)));
        window.removeEventListener('unit-data-response', handleResponse);
        resolve(collectedData);
      }, 60000);
    });
  }, []);

  // Process combined units with HF Agent
  const processCombinedUnits = useCallback(async (unitIds, groupId) => {
    try {
      const combinedData = await collectCombinedData(unitIds);

      // Validate we have required data
      if (!combinedData.imageFile && !combinedData.textContent) {
        addLog('warning', `Nema sadržaja za kombiniranu analizu: imageFile=${!!combinedData.imageFile}, textContent="${combinedData.textContent}", units=${combinedData.units.length}`);
        console.log('🔍 Detailed collection data:', combinedData);
        return;
      }

      // Get HF Agent URL from settings or default
      const agentUrl = 'http://127.0.0.1:7001'; // TODO: Get from settings

      addLog('info', `Pokretanje kombiniranih analiza za grupe ${groupId}...`);

      // Show progress indication on connected units
      unitIds.forEach(unitId => {
        window.dispatchEvent(new CustomEvent('unit-processing-start', {
          detail: { unitId, type: 'multimodal' }
        }));
      });

      // Enhanced multimodal call with explicit analysis type
      const result = await agentAnalyzeCombinedContent(combinedData, {
        agentUrl,
        analysisType: 'multimodal_combined', // Explicit multimodal flag
        onProgress: (message, progress) => {
          console.log(`🤖 HF Agent: ${message} (${progress}%)`);
          addLog('info', `HF Agent: ${message}`);
        }
      });

      addLog('success', `Kombinirana analiza završena! Grupa ${groupId}: ${result.summary || 'Analiza uspešna'}`);

      // Show results in connected units
      unitIds.forEach(unitId => {
        window.dispatchEvent(new CustomEvent('unit-processing-complete', {
          detail: { unitId, result, type: 'multimodal' }
        }));
      });

      // Optionally display result in a modal or overlay
      console.log('🤖 HF Agent multimodal result:', result);

    } catch (error) {
      addLog('error', `Greška u kombiniranoj analizi: ${error.message}`);

      // Reset processing state on units
      unitIds.forEach(unitId => {
        window.dispatchEvent(new CustomEvent('unit-processing-error', {
          detail: { unitId, error: error.message, type: 'multimodal' }
        }));
      });
    }
  }, [collectCombinedData, addLog]);

  // Process combined units with Gemini 3 (new multiphase fusion processing)
  const processCombinedUnitsWithGemini = useCallback(async (unitIds, groupId) => {
    const fusionId = `fusion-${groupId}`;

    try {
      // Start fusion processing state
      window.dispatchEvent(new CustomEvent('fusion-processing-start', {
        detail: { fusionId }
      }));

      const combinedData = await collectCombinedData(unitIds);

      // Validate we have required data
      if (!combinedData.imageFile && !combinedData.textContent) {
        addLog('warning', `🔍 Gemini: Nema sadržaja - imageFile=${!!combinedData.imageFile}, textContent="${combinedData.textContent}", units=${combinedData.units.length}`);
        console.log('🔍 Gemini collection data:', combinedData);
        window.dispatchEvent(new CustomEvent('fusion-processing-error', {
          detail: { fusionId, error: 'Nema sadržaja za analizu' }
        }));
        return;
      }

      addLog('info', `🔮 Pokretanje Gemini 3 analize za fusion grupu ${groupId}...`);

      // Initialize Gemini API with new SDK
      const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API ključ nije postavljen u VITE_GOOGLE_AI_API_KEY');
      }

      const ai = new GoogleGenAI({ apiKey });
      const model = 'gemini-2.5-flash';

      // Prepare multimodal content for Gemini
      const parts = [];

      // Add text content if available
      if (combinedData.textContent) {
        parts.push({
          text: `Analiziraj sljedeći sadržaj:\n\n${combinedData.textContent}`
        });
      }

      // Add image content if available
      if (combinedData.imageFile) {
        // Convert image file to base64 if needed
        const imageData = await new Promise((resolve) => {
          try {
            if (typeof combinedData.imageFile === 'string') {
              // Already base64
              resolve(combinedData.imageFile.replace(/^data:image\/[^;]+;base64,/, ''));
            } else if (combinedData.imageFile && combinedData.imageFile.constructor && combinedData.imageFile.constructor.name === 'File') {
              // Convert File to base64 - avoid instanceof
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
              };
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(combinedData.imageFile);
            } else if (combinedData.imageFile.size !== undefined && combinedData.imageFile.type !== undefined) {
              // Looks like a File object, try to read it
              const reader = new FileReader();
              reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
              };
              reader.onerror = () => resolve(null);
              reader.readAsDataURL(combinedData.imageFile);
            } else {
              console.log('🔍 Unknown image file type:', typeof combinedData.imageFile, combinedData.imageFile);
              resolve(null);
            }
          } catch (error) {
            console.error('🔍 Error processing image file:', error);
            resolve(null);
          }
        });

        if (imageData) {
          parts.push({
            inlineData: {
              mimeType: "image/jpeg", // Adjust based on actual image type
              data: imageData
            }
          });
        }
      }

      // Add analysis prompt
      parts.push({
        text: `Molim te analiziraj gore navedeni sadržaj (tekst ${combinedData.textContent ? '✓' : '✗'}, slika ${combinedData.imageFile ? '✓' : '✗'}).
Daj detaljnu analizu i zaključke na hrvatskom jeziku.
Fokusiraj se na povezanost između elemenata ako su oba prisutna.`
      });

      // Call Gemini 3 API
      addLog('info', '🤖 Pozivam Gemini 3 API...');
      console.log('🔍 Gemini parts:', parts);

      try {
        // Combine all text parts for new SDK
        let contentText = '';
        const imageParts = [];

        parts.forEach(part => {
          if (part.text) {
            contentText += part.text + '\n\n';
          } else if (part.inlineData) {
            imageParts.push(part);
          }
        });

        // Use multimodal approach with @google/genai SDK
        let response;
        if (imageParts.length > 0) {
          // Multimodal request with image and text
          console.log(`🔮 Gemini: Sending multimodal request (text: ${contentText.length} chars, images: ${imageParts.length})`);
          response = await ai.models.generateContent({
            model: model,
            contents: [
              {
                parts: [
                  { text: contentText.trim() },
                  ...imageParts.map(img => ({
                    inlineData: {
                      mimeType: img.inlineData.mimeType,
                      data: img.inlineData.data
                    }
                  }))
                ]
              }
            ]
          });
        } else {
          // Text-only request
          console.log(`🔮 Gemini: Sending text-only request (${contentText.length} chars)`);
          response = await ai.models.generateContent({
            model: model,
            contents: contentText.trim()
          });
        }

        const analysisResult = response.text;
        console.log('🔮 Gemini response received:', analysisResult.substring(0, 100) + '...');

        addLog('success', `✅ Gemini 3 analiza završena! Grupa ${groupId}`);

        // Dispatch success event
      window.dispatchEvent(new CustomEvent('fusion-processing-complete', {
        detail: {
          fusionId,
          success: true,
          result: {
            summary: analysisResult.substring(0, 100) + '...', // First 100 chars
            fullContent: analysisResult,
            source: 'Gemini 3',
            timestamp: new Date().toISOString()
          }
        }
      }));

      // Also show results in individual units for legacy compatibility
      unitIds.forEach(unitId => {
        window.dispatchEvent(new CustomEvent('unit-processing-complete', {
          detail: {
            unitId,
            result: {
              content: analysisResult,
              source: 'Gemini 3 Fusion',
              timestamp: new Date().toISOString()
            },
            type: 'fusion-multimodal'
          }
        }));
      });

      console.log('🔮 Gemini 3 fusion result:', { groupId, result: analysisResult });

      } catch (geminiError) {
        console.error('🔮 Gemini API error:', geminiError);
        throw geminiError; // Re-throw to be caught by outer catch
      }

    } catch (error) {
      addLog('error', `❌ Greška u Gemini 3 analizi: ${error.message}`);

      // Dispatch error event
      window.dispatchEvent(new CustomEvent('fusion-processing-error', {
        detail: { fusionId, error: error.message }
      }));

      // Reset processing state on units
      unitIds.forEach(unitId => {
        window.dispatchEvent(new CustomEvent('unit-processing-error', {
          detail: { unitId, error: error.message, type: 'fusion-multimodal' }
        }));
      });
    }
  }, [collectCombinedData, addLog]);

  // Dynamic activity state calculation
  const getUnitsActivityState = useCallback(() => {
    const units = Object.values(unitStates);
    const hasContent = units.some(u => u.type !== 'empty');
    const hasProcessing = units.some(u => u.isProcessing);
    const hasConnections = units.some(u => u.isConnected);

    if (hasProcessing) return 'processing';
    if (hasConnections) return 'connected';
    if (hasContent) return 'active';
    return 'idle';
  }, [unitStates]);

  // Generate dynamic icons for Units with content - NEW: Preserve individual + add fusion
  const getDynamicUnitIcons = useCallback(() => {
    const icons = [];
    const allGroups = getAllGroups();

    // First, add individual unit icons (always present when unit has content)
    Object.entries(unitStates)
      .filter(([id, unit]) => unit.type !== 'empty')
      .forEach(([id, unit]) => {
        const unitId = parseInt(id);
        const connection = getUnitConnection(unitId);

        const getUnitIcon = () => {
          switch (unit.type) {
            case 'text': return Type;
            case 'image': return Image;
            case 'pdf': return FileText;
            case 'table': return Table;
            case 'dwg': return Archive;
            case 'file': return File;
            default: return FileText;
          }
        };

        const currentClickCount = clickCounts[unitId] || 0;
        const currentState = iconStates[unitId] || 'unprocessed';

        icons.push({
          id: `unit-${id}`,
          unitId: unitId,
          icon: getUnitIcon(),
          label: `Unit ${id} - ${unit.type}${connection ? ' (Connected)' : ''}`,
          onClick: () => {
            const newClickCount = currentClickCount + 1;
            setClickCounts(prev => ({
              ...prev,
              [unitId]: newClickCount
            }));

            if (newClickCount === 1) {
              // First click: Focus on unit
              setFocusedUnitId(unitId);
              setIconStates(prev => ({
                ...prev,
                [unitId]: 'focused'
              }));

              // Scroll and focus unit
              window.dispatchEvent(new CustomEvent('focus-unit', {
                detail: { unitId }
              }));

              // Reset click count after timeout
              setTimeout(() => {
                setClickCounts(prev => {
                  if (prev[unitId] === 1) {
                    return { ...prev, [unitId]: 0 };
                  }
                  return prev;
                });
              }, 2000);

            } else if (newClickCount === 2) {
              // Second click: Start LLM processing
              setIconStates(prev => ({
                ...prev,
                [unitId]: 'processing'
              }));

              // Trigger LLM processing
              window.dispatchEvent(new CustomEvent('trigger-unit-reasoning', {
                detail: {
                  unitId,
                  useSelectedModel: true,
                  modelConfig: { modelId: 'local-llm' }
                }
              }));

              // Reset click count
              setClickCounts(prev => ({
                ...prev,
                [unitId]: 0
              }));
            }
          },
          onRightClick: () => {
            // Legacy right-click reasoning support
            window.dispatchEvent(new CustomEvent('trigger-unit-reasoning', {
              detail: { unitId: unitId }
            }));
          },
          contentType: unit.type,
          hasContent: true,
          isConnected: !!connection,
          connectionColor: connection?.group?.color,
          // Add multi-phase state properties
          currentState: currentState,
          clickCount: currentClickCount,
          isFocused: focusedUnitId === unitId
        });
      });

    // Second, add fusion buttons for connection groups
    Object.entries(allGroups).forEach(([groupId, group]) => {
      // Only show fusion button if all units in group have content
      const groupHasAllContent = group.units.every(unitId =>
        unitStates[unitId] && unitStates[unitId].type !== 'empty'
      );

      if (groupHasAllContent) {
        const groupTypes = group.units.map(unitId => unitStates[unitId]?.type).filter(Boolean);
        const fusionId = `fusion-${groupId}`;

        // Get fusion state management
        const currentFusionClickCount = fusionClickCounts[fusionId] || 0;
        const currentFusionState = fusionIconStates[fusionId] || 'unprocessed';

        icons.push({
          id: fusionId,
          unitIds: group.units,
          icon: Merge,
          label: `Fusion Group (${group.units.join(', ')})`,
          onClick: () => {
            const newFusionClickCount = currentFusionClickCount + 1;
            setFusionClickCounts(prev => ({
              ...prev,
              [fusionId]: newFusionClickCount
            }));

            if (newFusionClickCount === 1) {
              // First click: Focus on fusion group
              setFocusedFusionId(fusionId);
              setFusionIconStates(prev => ({
                ...prev,
                [fusionId]: 'focused'
              }));

              // Highlight all units in group
              group.units.forEach(unitId => {
                const unitElement = document.querySelector(`[data-unit-id="${unitId}"]`);
                if (unitElement) {
                  unitElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  unitElement.style.animation = 'pulse 1s ease-in-out 2';
                }
              });

              // Reset click count after timeout
              setTimeout(() => {
                setFusionClickCounts(prev => {
                  if (prev[fusionId] === 1) {
                    return { ...prev, [fusionId]: 0 };
                  }
                  return prev;
                });
              }, 2000);

            } else if (newFusionClickCount === 2) {
              // Second click: Start Gemini 3 processing
              setFusionIconStates(prev => ({
                ...prev,
                [fusionId]: 'processing'
              }));

              // Trigger multimodal processing - fallback to Gemini due to HF Agent model issues
              if (groupTypes.includes('image') && groupTypes.includes('text')) {
                // TODO: Fix HF Agent Qwen2-VL configuration issue, for now use Gemini
                console.log(`🎯 Fusion: Using Gemini API for multimodal analysis (HF Agent model error)`);
                processCombinedUnitsWithGemini(group.units, groupId);

                // Commented out until HF Agent model is fixed:
                // console.log(`🎯 Fusion: Using HF Agent for multimodal analysis (${groupTypes.join(' + ')})`);
                // processCombinedUnits(group.units, groupId);
              } else {
                // Use Gemini for text-only or single-modal content
                console.log(`🎯 Fusion: Using Gemini API for ${groupTypes.join(' + ')} analysis`);
                processCombinedUnitsWithGemini(group.units, groupId);
              }

              // Reset click count
              setFusionClickCounts(prev => ({
                ...prev,
                [fusionId]: 0
              }));
            }
          },
          onRightClick: () => {
            // Right-click: Always use Gemini (alternative processing method)
            processCombinedUnitsWithGemini(group.units, groupId);
          },
          connectionColor: group.color,
          isConnected: true,
          isFusion: true,
          types: groupTypes,
          groupSize: group.units.length,
          // Add multi-phase state properties for fusion
          currentState: currentFusionState,
          clickCount: currentFusionClickCount,
          isFocused: focusedFusionId === fusionId
        });
      }
    });

    return icons;
  }, [unitStates, getAllGroups, getUnitConnection, iconStates, clickCounts, focusedUnitId, fusionIconStates, fusionClickCounts, focusedFusionId]);

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
    { icon: Settings, label: 'Settings', onClick: () => setShowSettings(true) },
    { icon: Brain, label: 'Multi-Input Chat', onClick: () => setMultiOpen(v => !v) },
    {
      icon: Activity,
      label: 'Unit Activity Monitor',
      onClick: () => console.log('Activity state:', getUnitsActivityState()),
      dynamicState: getUnitsActivityState()
    }
  ];

  const handleContentChange = useCallback((unitId, type, content) => {
    setUnitStates(prev => ({
      ...prev,
      [unitId]: { type, content }
    }));
  }, []);

  // Listen for unit connections and integrate with connection store
  useEffect(() => {
    const handleUnitConnection = (event) => {
      const { sourceUnitId, targetUnitId } = event.detail;
      // Create new connection group with both units
      createConnectionGroup([sourceUnitId, targetUnitId], 'manual');
    };

    const handleUnitDisconnection = (event) => {
      const { unitId } = event.detail;
      // Remove unit from its group
      removeUnitFromGroup(unitId);
    };

    // Recovery: restore connections on component mount
    const handleRecovery = () => {
      recoverConnections();
    };

    window.addEventListener('unit-connected', handleUnitConnection);
    window.addEventListener('unit-disconnected', handleUnitDisconnection);

    // Trigger recovery on mount
    setTimeout(handleRecovery, 100);

    return () => {
      window.removeEventListener('unit-connected', handleUnitConnection);
      window.removeEventListener('unit-disconnected', handleUnitDisconnection);
    };
  }, [createConnectionGroup, removeUnitFromGroup, recoverConnections]);

  return (
    <>
      {/* Pulse animation CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
        }
      `}</style>

      <div className="h-screen flex -ml-6 -mt-6 mb-0 overflow-hidden">
        {/* Main Container - 2x2 Grid */}
        <div className="flex-1 pl-0 pr-20 pt-0 pb-3 overflow-auto">
          <div className="grid grid-cols-2 grid-rows-2 gap-6 h-fit min-h-full">
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
          {/* Static Icons */}
          {staticIcons.map((action, index) => {
            const getDynamicStyles = () => {
              if (!action.dynamicState) return "text-slate-600 group-hover:text-slate-800";

              switch (action.dynamicState) {
                case 'processing':
                  return "text-purple-600 group-hover:text-purple-700";
                case 'connected':
                  return "text-green-500 group-hover:text-green-600";
                case 'active':
                  return "text-blue-500 group-hover:text-blue-600";
                case 'idle':
                default:
                  return "text-slate-400 group-hover:text-slate-600";
              }
            };

            const getAnimationProps = () => {
              if (!action.dynamicState) return {};

              switch (action.dynamicState) {
                case 'processing':
                  return {
                    animate: {
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360]
                    },
                    transition: {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }
                  };
                case 'connected':
                  return {
                    animate: {
                      boxShadow: [
                        "0 0 0 rgba(34, 197, 94, 0)",
                        "0 0 20px rgba(34, 197, 94, 0.4)",
                        "0 0 0 rgba(34, 197, 94, 0)"
                      ]
                    },
                    transition: {
                      duration: 2,
                      repeat: Infinity
                    }
                  };
                case 'active':
                  return {
                    animate: {
                      scale: [1, 1.05, 1]
                    },
                    transition: {
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }
                  };
                default:
                  return {};
              }
            };

            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 group"
                title={`${action.label}${action.dynamicState ? ` (${action.dynamicState})` : ''}`}
                onClick={action.onClick}
                {...getAnimationProps()}
              >
                <action.icon
                  size={20}
                  className={`transition-colors ${getDynamicStyles()}`}
                />
              </motion.button>
            );
          })}

          {/* Separator for dynamic icons */}
          {getDynamicUnitIcons().length > 0 && (
            <div className="w-full h-px bg-slate-300 my-2"></div>
          )}

          {/* Dynamic Unit Icons */}
          <AnimatePresence>
            {getDynamicUnitIcons().map((unitIcon, index) => {
              const getStateClass = () => {
                switch (unitIcon.currentState) {
                  case 'focused':
                    return 'dynamic-icon-focused';
                  case 'processing':
                    return 'dynamic-icon-processing';
                  case 'completed':
                    return 'dynamic-icon-completed';
                  case 'error':
                    return 'dynamic-icon-error';
                  default:
                    return 'dynamic-icon-idle';
                }
              };

              return (
                <motion.button
                  key={unitIcon.id}
                  initial={{ opacity: 0, scale: 0.8, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                className={`relative p-1.5 rounded-lg transition-all duration-300 border group ${getStateClass()} ${
                  unitIcon.isConnected
                    ? `border-2`
                    : 'bg-white border-slate-200'
                } ${unitIcon.isFocused ? 'ring-2 ring-blue-400' : ''}`}
                style={{
                  backgroundColor: unitIcon.isConnected ? unitIcon.connectionColor : undefined,
                  borderColor: unitIcon.isConnected ? unitIcon.connectionColor : undefined,
                  boxShadow: unitIcon.isConnected
                    ? `0 0 20px ${unitIcon.connectionColor}60, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`
                    : undefined
                }}
                title={`${unitIcon.label} - ${
                  unitIcon.isFusion ? (
                    unitIcon.currentState === 'unprocessed' && unitIcon.clickCount === 0 ?
                      unitIcon.types.includes('image') && unitIcon.types.includes('text') ?
                        'Click to focus, double-click for Gemini multimodal analysis (image+text)' :
                        'Click to focus, double-click for Gemini analysis' :
                    unitIcon.currentState === 'focused' ?
                      unitIcon.types.includes('image') && unitIcon.types.includes('text') ?
                        'Fusion focused - Click again for Gemini multimodal processing' :
                        'Fusion focused - Click again for Gemini processing' :
                    unitIcon.currentState === 'processing' ?
                      unitIcon.types.includes('image') && unitIcon.types.includes('text') ?
                        'Processing with Gemini multimodal AI (image+text)...' :
                        'Processing with Gemini AI...' :
                    unitIcon.currentState === 'completed' ? 'Multimodal fusion analysis completed' :
                    unitIcon.currentState === 'error' ? 'Fusion processing failed' : 'Right-click for alternative processing'
                  ) : (
                    unitIcon.currentState === 'unprocessed' && unitIcon.clickCount === 0 ? 'Click to focus, double-click to process' :
                    unitIcon.currentState === 'focused' ? 'Focused - Click again to process' :
                    unitIcon.currentState === 'processing' ? 'Processing with local LLM...' :
                    unitIcon.currentState === 'completed' ? 'Processing completed' :
                    unitIcon.currentState === 'error' ? 'Processing failed' : ''
                  )
                }`}
                onClick={unitIcon.onClick}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (unitIcon.onRightClick) {
                    unitIcon.onRightClick();
                  }
                }}
              >
                <unitIcon.icon
                  size={14}
                  className={`transition-colors ${
                    unitIcon.isConnected
                      ? 'text-white'
                      : unitIcon.contentType === 'text' ? 'text-blue-500' :
                        unitIcon.contentType === 'image' ? 'text-green-500' :
                        unitIcon.contentType === 'pdf' ? 'text-red-500' :
                        unitIcon.contentType === 'table' ? 'text-purple-500' :
                        unitIcon.contentType === 'dwg' ? 'text-cyan-500' :
                        'text-orange-500'
                  } ${unitIcon.currentState === 'processing' ? 'animate-spin' : ''}`}
                />

                {/* Unit number badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                  className={`absolute -top-1 -right-1 ${
                    unitIcon.isFusion
                      ? 'w-6 h-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold'
                      : unitIcon.isConnected
                      ? 'w-4 h-4 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-bold'
                      : 'w-4 h-4 bg-slate-600 text-white text-xs rounded-full flex items-center justify-center font-medium'
                  }`}
                >
                  {unitIcon.isFusion
                    ? `×${unitIcon.groupSize}`
                    : unitIcon.isConnected
                    ? '●'
                    : unitIcon.unitId}
                </motion.div>

                {/* Click count indicator */}
                {unitIcon.clickCount > 0 && unitIcon.clickCount < 2 && !unitIcon.isFusion && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    {unitIcon.clickCount}
                  </motion.div>
                )}

                {/* Fusion click count indicator */}
                {unitIcon.clickCount > 0 && unitIcon.clickCount < 2 && unitIcon.isFusion && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -left-1 w-4 h-4 bg-purple-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                  >
                    {unitIcon.clickCount}
                  </motion.div>
                )}

                {/* Content type indicator dots */}
                {unitIcon.isFusion ? (
                  // Show multiple dots for fusion button
                  <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                    {unitIcon.types.slice(0, 3).map((type, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: index * 0.1 + 0.3 + i * 0.1 }}
                        className={`w-1.5 h-1.5 rounded-full ${
                          type === 'text' ? 'bg-blue-400' :
                          type === 'image' ? 'bg-green-400' :
                          type === 'pdf' ? 'bg-red-400' :
                          type === 'table' ? 'bg-purple-400' :
                          type === 'dwg' ? 'bg-cyan-400' :
                          'bg-orange-400'
                        }`}
                      />
                    ))}
                    {unitIcon.types.length > 3 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 flex items-center justify-center">
                        <span className="text-[6px] text-white font-bold">+</span>
                      </div>
                    )}
                  </div>
                ) : unitIcon.isConnected ? (
                  // Show connection indicator for connected individual units
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full border border-white"
                    style={{ backgroundColor: unitIcon.connectionColor }}
                  />
                ) : (
                  // Show content type for individual units
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${
                      unitIcon.contentType === 'text' ? 'bg-blue-500' :
                      unitIcon.contentType === 'image' ? 'bg-green-500' :
                      unitIcon.contentType === 'pdf' ? 'bg-red-500' :
                      unitIcon.contentType === 'table' ? 'bg-purple-500' :
                      unitIcon.contentType === 'dwg' ? 'bg-cyan-500' :
                      'bg-orange-500'
                    }`}
                  />
                )}
              </motion.button>
              );
            })}
          </AnimatePresence>
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

                <div className="p-3 space-y-2">
                  <div>
                    <label className="text-xs text-slate-500">Base URL</label>
                    <input
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Model</label>
                    <input
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="w-full mt-1 px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-800 placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Input 1</label>
                    <textarea value={input1} onChange={e => setInput1(e.target.value)} rows={3} className="w-full mt-1 p-2 border border-slate-300 rounded text-xs bg-white text-slate-800 placeholder-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Input 2</label>
                    <textarea value={input2} onChange={e => setInput2(e.target.value)} rows={3} className="w-full mt-1 p-2 border border-slate-300 rounded text-xs bg-white text-slate-800 placeholder-slate-400" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Input 3</label>
                    <textarea value={input3} onChange={e => setInput3(e.target.value)} rows={3} className="w-full mt-1 p-2 border border-slate-300 rounded text-xs bg-white text-slate-800 placeholder-slate-400" />
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
                      <div className="text-xs whitespace-pre-wrap p-2 border rounded bg-slate-50 h-32">{response}</div>
                    </div>
                  )}

                  {lastRequestPreview && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-slate-600 mb-1">Sent Prompt Preview</div>
                      <div className="text-[11px] whitespace-pre-wrap p-2 border rounded bg-slate-50 h-24">{lastRequestPreview}</div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
            />
          )}
        </AnimatePresence>

      </div>
    </>
  );
};

export default PlaceholderTab;
