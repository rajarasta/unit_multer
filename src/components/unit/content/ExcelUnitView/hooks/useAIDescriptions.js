import { useState, useCallback, useEffect } from 'react';
import { useAgentOverlay } from '../../../../../hooks/useAgentOverlay';

const useAIDescriptions = () => {
  // AI Description suggestion states
  const [activeDescriptionRow, setActiveDescriptionRow] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [updatedDescriptions, setUpdatedDescriptions] = useState({});

  // Agent Overlay hook
  const { showAgent, hideAgent } = useAgentOverlay();

  // Handle description click for AI suggestions
  const handleDescriptionClick = useCallback(async (rowIndex, cellIndex, description) => {
    console.log(`💭 Clicked description in row ${rowIndex}:`, description);

    if (!description || description.toString().trim() === '') {
      return;
    }

    const rowKey = `${rowIndex}-${cellIndex}`;

    // Toggle suggestions if clicking same description
    if (activeDescriptionRow === rowKey) {
      setActiveDescriptionRow(null);
      setAiSuggestions([]);
      return;
    }

    setActiveDescriptionRow(rowKey);
    setIsLoadingSuggestions(true);
    setAiSuggestions([]);

    try {
      // Call AI service for description suggestions
      const suggestions = await getDescriptionSuggestions(description.toString());
      setAiSuggestions(suggestions);
    } catch (err) {
      console.error('❌ Failed to get AI suggestions:', err);
      setAiSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [activeDescriptionRow]);

  // AI service call function
  const getDescriptionSuggestions = useCallback(async (description) => {
    // This will use the specified model: 11.settings.chatgpt.openai.20.boss
    const prompt = `Analiziraj ovaj opis iz troškovnika: "${description}"

Istraži šta ovaj opis znači i predloži bolji opis koji bi bio:
1. Jasniji i precizniji
2. Više tehnički specificni
3. Lakši za razumijevanje

Vrati samo 1 prijedlog u novom redu, bez dodatnih objašnjenja.`;

    const response = await fetch('/api/llm/draft', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: prompt,
        model: '11.settings.chatgpt.openai.20.boss',
        context: {
          type: 'description_analysis',
          original_description: description
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Parse the suggestions from the response
    const suggestions = result.response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.length > 0)
      .slice(0, 3); // Take only first 3 suggestions

    return suggestions;
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion) => {
    if (!activeDescriptionRow) return;

    const [rowIndex, cellIndex] = activeDescriptionRow.split('-').map(Number);
    const key = `${rowIndex}-${cellIndex}`;

    setUpdatedDescriptions(prev => ({
      ...prev,
      [key]: suggestion
    }));

    // Clear active suggestions
    setActiveDescriptionRow(null);
    setAiSuggestions([]);

    console.log(`✅ Updated description for row ${rowIndex}, cell ${cellIndex}:`, suggestion);
  }, [activeDescriptionRow]);

  // Handle description click with Agent Overlay
  const handleDescriptionAgentClick = useCallback((rowIndex, cellIndex, description) => {
    console.log(`🤖 Agent analysis for row ${rowIndex}:`, description);

    if (!description || description.toString().trim() === '') {
      return;
    }

    showAgent(
      description.toString(),
      `ExcelUnit-Row${rowIndex}-Cell${cellIndex}`,
      'http://10.71.21.136:1234/v1/chat/completions'
    );
  }, [showAgent]);

  // Listen for agent suggestions
  useEffect(() => {
    const handleAgentSuggestion = (event) => {
      const { suggestion, originalInput } = event.detail;
      console.log(`🤖 Agent suggestion received:`, suggestion);

      // Find the active description row and update it
      if (activeDescriptionRow) {
        const [rowIndex, cellIndex] = activeDescriptionRow.split('-').map(Number);
        const key = `${rowIndex}-${cellIndex}`;

        setUpdatedDescriptions(prev => ({
          ...prev,
          [key]: suggestion.description
        }));
      }

      hideAgent(); // Close agent overlay
    };

    window.addEventListener('agent-suggestion-selected', handleAgentSuggestion);

    return () => {
      window.removeEventListener('agent-suggestion-selected', handleAgentSuggestion);
    };
  }, [activeDescriptionRow, hideAgent]);

  return {
    // State
    activeDescriptionRow,
    aiSuggestions,
    isLoadingSuggestions,
    updatedDescriptions,
    setUpdatedDescriptions,

    // Actions
    handleDescriptionClick,
    handleSuggestionSelect,
    handleDescriptionAgentClick,
    getDescriptionSuggestions
  };
};

export default useAIDescriptions;