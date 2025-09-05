import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Codex environment configuration store
// Persists UI-configurable collaboration flags/preferences
export const useCodexConfigStore = create(
  persist(
    (set, get) => ({
      // Preferences (defaults per user request)
      discovery: 'deep',           // none|min|standard|deep
      docs_priority: 'instrukcijski dokumenti',
      run_tests: 'on-request',     // auto|on-request|never
      plan: 'on',                  // on|off
      changes: 'allowed',          // read-only|allowed
      verbosity: 'high',           // low|normal|high
      stack_hint: 'none',          // e.g. Node/Express, Python/Django, etc.

      // Actions
      setConfig: (partial) => set(partial),
      resetDefaults: () => set({
        discovery: 'deep',
        docs_priority: 'instrukcijski dokumenti',
        run_tests: 'on-request',
        plan: 'on',
        changes: 'allowed',
        verbosity: 'high',
        stack_hint: 'none',
      }),

      // Build a runtime snapshot for display/export
      snapshot: () => ({
        discovery: get().discovery,
        docs_priority: get().docs_priority,
        run_tests: get().run_tests,
        plan: get().plan,
        changes: get().changes,
        verbosity: get().verbosity,
        stack_hint: get().stack_hint,
        generatedAt: new Date().toISOString(),
      }),
    }),
    { name: 'codex-config' }
  )
);

