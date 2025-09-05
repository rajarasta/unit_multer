import { useProjectStore } from '../store/useProjectStore';

class BatchExecutionManager {
  constructor() {
    this.isExecuting = false;
    this.currentTodos = [];
    this.executionPromise = null;
    this.callbacks = {
      onStart: null,
      onProgress: null,
      onComplete: null,
      onError: null
    };
  }

  async executePlan(todos, callbacks = {}) {
    if (this.isExecuting) {
      throw new Error('Batch execution already in progress');
    }

    this.callbacks = { ...this.callbacks, ...callbacks };
    this.currentTodos = [...todos];
    this.isExecuting = true;

    try {
      this.callbacks.onStart?.(this.currentTodos);

      for (let i = 0; i < this.currentTodos.length; i++) {
        const todo = this.currentTodos[i];
        
        // Update todo to in_progress
        todo.status = 'in_progress';
        this.callbacks.onProgress?.(todo, i + 1, this.currentTodos.length);

        // Execute the task (this would be the actual implementation)
        await this.executeTask(todo);

        // Mark as completed
        todo.status = 'completed';
        this.callbacks.onProgress?.(todo, i + 1, this.currentTodos.length);
      }

      this.callbacks.onComplete?.(this.currentTodos);
    } catch (error) {
      this.callbacks.onError?.(error, this.currentTodos);
      throw error;
    } finally {
      this.isExecuting = false;
      this.resetBatchMode();
    }
  }

  async executeTask(todo) {
    // This is where the actual task execution would happen
    // For now, simulate work with a delay
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Executing: ${todo.content}`);
        resolve();
      }, 1000);
    });
  }

  resetBatchMode() {
    const { setBatchExecutionMode, setSkipConfirmations } = useProjectStore.getState();
    setBatchExecutionMode(false);
    setSkipConfirmations(false);
  }

  stop() {
    this.isExecuting = false;
    this.resetBatchMode();
  }

  getStatus() {
    return {
      isExecuting: this.isExecuting,
      currentTodos: this.currentTodos
    };
  }
}

export const batchExecutionManager = new BatchExecutionManager();
export default batchExecutionManager;