import { GeminiApiManager } from './gemini-api-manager';

/**
 * Singleton instance of GeminiApiManager
 * Prevents multiple instantiations and duplicate initialization logs
 */
let instance: GeminiApiManager | null = null;

/**
 * Get the singleton instance of GeminiApiManager
 * Creates the instance on first call, returns existing instance on subsequent calls
 */
export function getGeminiApiManager(): GeminiApiManager {
  if (!instance) {
    instance = new GeminiApiManager();
  }
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetGeminiApiManager(): void {
  instance = null;
}
