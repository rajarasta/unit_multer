/**
 * useApiIntegration Hook
 * Manages API communication and chat history for IRIS3
 * Handles OpenAI API calls, payload/response tracking, and TTS functionality
 */

import { useState } from 'react';
import { SCHUCO_SYSTEM_PROMPT, PROJEKTIRANJE_SYSTEM_PROMPT, IRIS3_TABS } from '../../../../utils/schutoConstants.js';

export const useApiIntegration = () => {
  const [apiData, setApiData] = useState({
    lastPayload: null,
    lastResponse: null,
    timestamp: null
  });
  const [chatHistory, setChatHistory] = useState([]);

  const processVoiceCommand = async (transcript, activeTab, onProdajaTool, onProjektirangeTool) => {
    let systemPrompt, payload;

    if (activeTab === 'prodaja') {
      systemPrompt = `${SCHUCO_SYSTEM_PROMPT}

Analiziraj transkript: "${transcript}"`;

      payload = {
        command: transcript,
        tool_call: 'schuco_analysis',
        context: {
          active_tab: activeTab,
          system_prompt: systemPrompt,
          location: "Zagreb, Hrvatska",
          timestamp: new Date().toISOString()
        }
      };
    } else if (activeTab === 'projektiranje') {
      systemPrompt = `${PROJEKTIRANJE_SYSTEM_PROMPT}

Komanda: "${transcript}"`;

      payload = {
        command: transcript,
        tool_call: 'projektiranje_details',
        context: {
          active_tab: activeTab,
          system_prompt: systemPrompt,
          timestamp: new Date().toISOString()
        }
      };
    } else {
      systemPrompt = `Ti si AI asistent za IRI S3 sistem (Intelligent Resource Integration - Storage 3).
Tvoja uloga je da pomogneš korisnicima sa pitanjima vezanim za:
- Upravljanje resursima i skladištem
- S3 storage sisteme  
- Prodaju, projektovanje, pripremu i proizvodnju
- Opšta pitanja vezana za poslovne procese

Odgovaraj kratko i jasno na hrvatskom jeziku. Trenutno aktivni tab je: ${IRIS3_TABS.find(t => t.id === activeTab)?.label}`;

      payload = {
        command: transcript,
        context: {
          active_tab: activeTab,
          system_prompt: systemPrompt,
          timestamp: new Date().toISOString()
        }
      };
    }

    // Update API data with payload
    setApiData({
      lastPayload: payload,
      lastResponse: null,
      timestamp: new Date().toLocaleTimeString()
    });

    try {
      const response = await fetch('/api/llm/draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      const llmResponse = result.response || result.message || 'No response';
      
      let finalResponse = llmResponse;
      
      // Execute tab-specific tools
      if (activeTab === 'prodaja' && onProdajaTool) {
        finalResponse = await onProdajaTool(llmResponse, transcript);
      } else if (activeTab === 'projektiranje' && onProjektirangeTool) {
        finalResponse = await onProjektirangeTool(transcript);
      }
      
      // Add to chat history
      const chatEntry = {
        id: Date.now(),
        user: transcript,
        assistant: finalResponse,
        timestamp: new Date().toLocaleTimeString(),
        activeTab: activeTab,
        isToolCall: activeTab === 'prodaja' || activeTab === 'projektiranje'
      };

      setChatHistory(prev => [...prev, chatEntry]);
      
      // Update API data with response
      setApiData(prev => ({
        ...prev,
        lastResponse: {
          status: response.ok ? 'success' : 'error',
          ...result,
          tool_executed: activeTab === 'prodaja' ? 'prodaja_tool' : activeTab === 'projektiranje' ? 'projektiranje_tool' : null
        }
      }));

      // Text-to-speech
      if (window.speechSynthesis && llmResponse) {
        const utterance = new SpeechSynthesisUtterance(llmResponse);
        utterance.lang = 'hr-HR';
        window.speechSynthesis.speak(utterance);
      }

      return finalResponse;

    } catch (error) {
      console.error('OpenAI API Error:', error);
      
      const errorResponse = `Greška pri komunikaciji sa serverom: ${error.message}`;
      
      // Add error to chat history
      setChatHistory(prev => [...prev, {
        id: Date.now(),
        user: transcript,
        assistant: errorResponse,
        timestamp: new Date().toLocaleTimeString(),
        activeTab: activeTab,
        isError: true
      }]);

      // Update API data with error
      setApiData(prev => ({
        ...prev,
        lastResponse: { 
          status: 'error', 
          message: error.message 
        }
      }));

      throw error;
    }
  };

  const updateApiStatus = (action, data = {}) => {
    setApiData({
      lastPayload: { 
        action, 
        timestamp: new Date().toISOString(),
        ...data 
      },
      lastResponse: { 
        status: 'success', 
        message: `${action} completed` 
      },
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const clearChatHistory = () => {
    setChatHistory([]);
  };

  const clearApiData = () => {
    setApiData({
      lastPayload: null,
      lastResponse: null,
      timestamp: null
    });
  };

  return {
    apiData,
    chatHistory,
    processVoiceCommand,
    updateApiStatus,
    clearChatHistory,
    clearApiData,
    setApiData,
    setChatHistory
  };
};

export default useApiIntegration;