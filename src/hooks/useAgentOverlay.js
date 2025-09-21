import { useState, useCallback } from 'react';

export const useAgentOverlay = () => {
  const [isActive, setIsActive] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [targetComponent, setTargetComponent] = useState('');
  const [endpoint, setEndpoint] = useState('http://10.71.21.136:1234/v1/chat/completions');

  const showAgent = useCallback((input, component = 'unknown', apiEndpoint = 'http://10.71.21.136:1234/v1/chat/completions') => {
    setAgentInput(input);
    setTargetComponent(component);
    setEndpoint(apiEndpoint);
    setIsActive(true);
  }, []);

  const hideAgent = useCallback(() => {
    setIsActive(false);
    // Reset after animation completes
    setTimeout(() => {
      setAgentInput('');
      setTargetComponent('');
      setEndpoint('http://10.71.21.136:1234/v1/chat/completions');
    }, 300);
  }, []);

  return {
    isActive,
    agentInput,
    targetComponent,
    endpoint,
    showAgent,
    hideAgent
  };
};