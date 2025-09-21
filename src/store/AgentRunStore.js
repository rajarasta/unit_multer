import { create } from 'zustand';

export const useAgentRunStore = create((set) => ({
  activeRuns: {},
  addRun: (runId, plan, initialBounds) => {
    if (!runId || !plan) {
      return;
    }
    set((state) => ({
      activeRuns: {
        ...state.activeRuns,
        [runId]: {
          runId,
          plan,
          initialBounds: initialBounds || null,
          createdAt: Date.now(),
        },
      },
    }));
  },
  updateRun: (runId, data) => {
    if (!runId || !data) {
      return;
    }
    set((state) => {
      if (!state.activeRuns[runId]) {
        return state;
      }
      return {
        activeRuns: {
          ...state.activeRuns,
          [runId]: {
            ...state.activeRuns[runId],
            ...data,
          },
        },
      };
    });
  },
  removeRun: (runId) => {
    if (!runId) {
      return;
    }
    set((state) => {
      if (!state.activeRuns[runId]) {
        return state;
      }
      const updated = { ...state.activeRuns };
      delete updated[runId];
      return { activeRuns: updated };
    });
  },
  clearAllRuns: () => set({ activeRuns: {} }),
}));

export default useAgentRunStore;
