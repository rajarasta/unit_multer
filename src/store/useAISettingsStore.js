import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Global AI settings (agent mode + local LLM config)
export const useAISettingsStore = create(
  persist(
    (set, get) => ({
      // Agent source: 'server' uses remote SaaS (OpenAI, etc.), 'local' uses local LLM session
      llmMode: 'server', // 'server' | 'local'

      // Local LLM defaults (can be overridden from UI)
      localBaseUrl: 'http://10.255.130.136:1234',
      localModelsRoot: 'E:\\Modeli',
      selectedLocalModel: '',

      // Voice command toggle (global)
      voiceEnabled: true,

      setLLMMode: (mode) => set({ llmMode: mode }),
      setLocalBaseUrl: (url) => set({ localBaseUrl: url }),
      setLocalModelsRoot: (root) => set({ localModelsRoot: root }),
      setSelectedLocalModel: (model) => set({ selectedLocalModel: model }),
      setVoiceEnabled: (on) => set({ voiceEnabled: !!on }),

      snapshot: () => ({
        llmMode: get().llmMode,
        localBaseUrl: get().localBaseUrl,
        localModelsRoot: get().localModelsRoot,
        selectedLocalModel: get().selectedLocalModel,
        voiceEnabled: get().voiceEnabled,
        generatedAt: new Date().toISOString(),
      }),
    }),
    { name: 'ai-settings' }
  )
);

