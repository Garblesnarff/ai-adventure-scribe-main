/**
 * Browser-compatible stub for Node.js async_hooks module
 *
 * This stub provides a minimal implementation of AsyncLocalStorage
 * for browser environments where the actual async_hooks module is not available.
 *
 * Note: This is a simplified implementation that doesn't provide true
 * async context isolation in browsers. For production use with LangGraph,
 * consider server-side rendering or serverless functions.
 */

class AsyncLocalStorage<T> {
  private store: T | undefined;

  constructor() {
    this.store = undefined;
  }

  run<R>(store: T, callback: () => R): R {
    this.store = store;
    try {
      return callback();
    } finally {
      this.store = undefined;
    }
  }

  getStore(): T | undefined {
    return this.store;
  }

  enterWith(store: T): void {
    this.store = store;
  }

  disable(): void {
    this.store = undefined;
  }

  exit<R>(callback: () => R): R {
    const oldStore = this.store;
    this.store = undefined;
    try {
      return callback();
    } finally {
      this.store = oldStore;
    }
  }
}

export { AsyncLocalStorage };
