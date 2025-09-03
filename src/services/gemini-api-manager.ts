import { GoogleGenerativeAI } from '@google/generative-ai';

interface KeyUsageStats {
  key: string;
  errors: number;
  lastError?: Date;
  successfulCalls: number;
  totalCalls: number;
  isDisabled: boolean;
}

interface GeminiError extends Error {
  status?: number;
  code?: string;
}

export class GeminiApiManager {
  private apiKeys: string[];
  private keyStats: Map<string, KeyUsageStats> = new Map();
  private currentKeyIndex: number = 0;
  private lastRotation: Date = new Date();
  private readonly rotationCooldown = 60 * 1000; // 1 minute cooldown
  private readonly maxErrorsBeforeDisable = 3;
  private readonly errorResetTime = 15 * 60 * 1000; // 15 minutes

  constructor() {
    // Get API keys from environment variable
    const keysString = import.meta.env.VITE_GEMINI_API_KEYS;
    
    if (!keysString) {
      throw new Error('VITE_GEMINI_API_KEYS environment variable not set');
    }

    this.apiKeys = keysString.split(',').map(key => key.trim()).filter(key => key.length > 0);
    
    if (this.apiKeys.length === 0) {
      throw new Error('No valid Gemini API keys found');
    }

    // Initialize stats for each key
    this.apiKeys.forEach(key => {
      this.keyStats.set(key, {
        key: key.substring(0, 10) + '...', // Truncated for logging
        errors: 0,
        successfulCalls: 0,
        totalCalls: 0,
        isDisabled: false,
      });
    });

    console.log(`Gemini API Manager initialized with ${this.apiKeys.length} keys`);
  }

  /**
   * Get the current active API key
   */
  private getCurrentKey(): string {
    // Check if current key is disabled
    const currentKey = this.apiKeys[this.currentKeyIndex];
    const stats = this.keyStats.get(currentKey);
    
    if (stats?.isDisabled) {
      this.rotateToNextAvailableKey();
    }

    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Rotate to the next available key
   */
  private rotateToNextAvailableKey(): boolean {
    const startIndex = this.currentKeyIndex;
    let attempts = 0;

    do {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      attempts++;
      
      const key = this.apiKeys[this.currentKeyIndex];
      const stats = this.keyStats.get(key);
      
      // Check if this key is available (not disabled or errors have reset)
      if (stats && (!stats.isDisabled || this.shouldResetErrors(stats))) {
        if (stats.isDisabled) {
          this.resetKeyErrors(key);
        }
        
        this.lastRotation = new Date();
        console.log(`Rotated to API key: ${stats.key}`);
        return true;
      }
      
    } while (this.currentKeyIndex !== startIndex && attempts < this.apiKeys.length);

    // If we've tried all keys and none are available
    console.warn('All API keys are disabled, using current key anyway');
    return false;
  }

  /**
   * Check if enough time has passed to reset errors for a key
   */
  private shouldResetErrors(stats: KeyUsageStats): boolean {
    if (!stats.lastError) return false;
    return Date.now() - stats.lastError.getTime() > this.errorResetTime;
  }

  /**
   * Reset error count for a key
   */
  private resetKeyErrors(key: string): void {
    const stats = this.keyStats.get(key);
    if (stats) {
      stats.errors = 0;
      stats.isDisabled = false;
      stats.lastError = undefined;
      console.log(`Reset errors for API key: ${stats.key}`);
    }
  }

  /**
   * Record an error for the current key
   */
  private recordError(key: string, error: GeminiError): void {
    const stats = this.keyStats.get(key);
    if (!stats) return;

    stats.errors++;
    stats.totalCalls++;
    stats.lastError = new Date();

    // Disable key if it has too many errors
    if (stats.errors >= this.maxErrorsBeforeDisable) {
      stats.isDisabled = true;
      console.warn(`Disabled API key ${stats.key} due to ${stats.errors} errors`);
    }

    console.error(`API key ${stats.key} error (${stats.errors}/${this.maxErrorsBeforeDisable}):`, error.message);
  }

  /**
   * Record a successful call for the current key
   */
  private recordSuccess(key: string): void {
    const stats = this.keyStats.get(key);
    if (!stats) return;

    stats.successfulCalls++;
    stats.totalCalls++;
  }

  /**
   * Check if error warrants key rotation
   */
  private shouldRotateOnError(error: GeminiError): boolean {
    // Rotate on authentication errors, rate limits, or quota exceeded
    return error.status === 401 || // Unauthorized
           error.status === 403 || // Forbidden
           error.status === 429 || // Too Many Requests
           error.code === 'QUOTA_EXCEEDED' ||
           error.code === 'API_KEY_INVALID';
  }

  /**
   * Create a Gemini AI client with the current key
   */
  private createClient(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }

  /**
   * Execute a function with automatic key rotation on failure
   */
  async executeWithRotation<T>(
    operation: (genAI: GoogleGenerativeAI) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: GeminiError | null = null;
    let attempts = 0;

    while (attempts < maxRetries) {
      const currentKey = this.getCurrentKey();
      const genAI = this.createClient(currentKey);

      try {
        const result = await operation(genAI);
        this.recordSuccess(currentKey);
        return result;
        
      } catch (error) {
        attempts++;
        lastError = error as GeminiError;
        
        this.recordError(currentKey, lastError);
        
        // If this error warrants rotation and we have more attempts
        if (this.shouldRotateOnError(lastError) && attempts < maxRetries) {
          // Only rotate if cooldown period has passed
          if (Date.now() - this.lastRotation.getTime() > this.rotationCooldown) {
            const rotated = this.rotateToNextAvailableKey();
            if (!rotated) {
              // No keys available, break early
              break;
            }
          }
        } else if (attempts >= maxRetries) {
          break;
        }
        
        // Wait before retry (exponential backoff)
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }

    // If we get here, all retries failed
    throw new Error(`All API keys failed after ${attempts} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Get statistics for all keys
   */
  getStats(): KeyUsageStats[] {
    return Array.from(this.keyStats.values());
  }

  /**
   * Get current key info (truncated for security)
   */
  getCurrentKeyInfo(): { index: number; truncatedKey: string; stats: KeyUsageStats | undefined } {
    const currentKey = this.apiKeys[this.currentKeyIndex];
    const stats = this.keyStats.get(currentKey);
    
    return {
      index: this.currentKeyIndex,
      truncatedKey: currentKey.substring(0, 10) + '...',
      stats,
    };
  }
}