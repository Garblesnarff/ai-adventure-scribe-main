import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '@/lib/logger';

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

export interface RateLimitStats {
  dailyUsage: number;
  dailyLimit: number;
  recentRequests: number;
  minutelyLimit: number;
  remainingDaily: number;
  remainingMinutely: number;
  resetTime: number; // ms until daily reset
}

export class GeminiApiManager {
  private apiKeys: string[];
  private keyStats: Map<string, KeyUsageStats> = new Map();
  private currentKeyIndex: number = 0; // Start with first key
  private lastRotation: Date = new Date();
  private readonly rotationCooldown = 60 * 1000; // 1 minute cooldown
  private readonly maxErrorsBeforeDisable = 3;
  private readonly errorResetTime = 15 * 60 * 1000; // 15 minutes

  // Free tier rate limiting for gemini-2.5-flash-lite
  private readonly maxRequestsPerMinute = 15;
  private readonly maxRequestsPerDay = 1000;
  private requestTimestamps: Date[] = [];
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();

  /**
   * Check if running in development environment
   */
  private isDevelopment(): boolean {
    return import.meta.env.DEV || import.meta.env.MODE === 'development';
  }

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

    if (this.isDevelopment()) {
      logger.info(`🔑 Gemini API Manager initialized with ${this.apiKeys.length} key(s)`);
    }
  }

  /**
   * Check if we can make a request within rate limits
   */
  private checkRateLimit(): { canProceed: boolean; waitTime?: number } {
    const now = new Date();
    const currentDateString = now.toDateString();
    
    // Reset daily count if it's a new day
    if (this.lastResetDate !== currentDateString) {
      this.dailyRequestCount = 0;
      this.lastResetDate = currentDateString;
      this.requestTimestamps = [];
    }
    
    // Check daily limit
    if (this.dailyRequestCount >= this.maxRequestsPerDay) {
      return { 
        canProceed: false, 
        waitTime: this.getTimeUntilMidnight() 
      };
    }
    
    // Check per-minute limit
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
    
    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimestamps.map(t => t.getTime()));
      const waitTime = oldestRequest + (60 * 1000) - now.getTime();
      return { 
        canProceed: false, 
        waitTime: Math.max(0, waitTime) 
      };
    }
    
    return { canProceed: true };
  }
  
  /**
   * Record a successful request for rate limiting
   */
  private recordRequest(): void {
    const now = new Date();
    this.requestTimestamps.push(now);
    this.dailyRequestCount++;
  }
  
  /**
   * Get milliseconds until midnight for daily reset
   */
  private getTimeUntilMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
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
        if (this.isDevelopment()) {
          logger.info(`Rotated to next API key`);
        }
        return true;
      }
      
    } while (this.currentKeyIndex !== startIndex && attempts < this.apiKeys.length);

    // If we've tried all keys and none are available
    logger.warn('All API keys are disabled, using current key anyway');
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
      if (this.isDevelopment()) {
        logger.info(`Reset errors for API key`);
      }
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
      logger.warn(`API key disabled due to ${stats.errors} errors`);
    }

    if (this.isDevelopment()) {
      logger.error(`API key error (${stats.errors}/${this.maxErrorsBeforeDisable}):`, error.message);
    }
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
    // Check various error formats from Google's API
    type HttpLikeError = { status?: number; code?: string; message?: string; response?: { status?: number; code?: string } };
    const e = error as HttpLikeError;
    const errorStatus = e.status ?? e.response?.status;
    const errorCode = e.code ?? e.response?.code;
    const errorMessage = error.message || '';
    
    // Rotate on authentication errors, rate limits, or quota exceeded
    return errorStatus === 400 || // Bad Request (invalid API key)
           errorStatus === 401 || // Unauthorized
           errorStatus === 403 || // Forbidden
           errorStatus === 429 || // Too Many Requests
           errorCode === 'QUOTA_EXCEEDED' ||
           errorCode === 'API_KEY_INVALID' ||
           errorMessage.includes('API key') ||
           errorMessage.includes('Invalid');
  }

  /**
   * Create a Gemini AI client with the current key
   */
  private createClient(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }

  /**
   * Execute a function with automatic key rotation on failure and rate limiting
   */
  async executeWithRotation<T>(
    operation: (genAI: GoogleGenerativeAI) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    // Check rate limits before attempting request
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.canProceed) {
      const waitTimeMinutes = Math.ceil((rateLimitCheck.waitTime || 0) / 60000);
      throw new Error(
        `Rate limit exceeded. Please wait ${waitTimeMinutes} minute(s) before making another request. ` +
        `Daily usage: ${this.dailyRequestCount}/${this.maxRequestsPerDay}, ` +
        `Recent requests: ${this.requestTimestamps.length}/${this.maxRequestsPerMinute} per minute`
      );
    }
    
    let lastError: GeminiError | null = null;
    let attempts = 0;
    const triedKeys = new Set<string>();

    while (attempts < maxRetries) {
      // Get current key AFTER potential rotation from previous iteration
      const currentKey = this.getCurrentKey();
      const keyStats = this.keyStats.get(currentKey);

      if (this.isDevelopment()) {
        logger.debug(`🔑 Attempt ${attempts + 1}: Using API key (index: ${this.currentKeyIndex})`);
      }

      // Track which keys we've tried
      triedKeys.add(currentKey);

      const genAI = this.createClient(currentKey);

      try {
        const result = await operation(genAI);
        this.recordSuccess(currentKey);
        this.recordRequest(); // Record for rate limiting
        return result;

      } catch (error) {
        attempts++;
        lastError = error as GeminiError;

        // Log full error for debugging in development only
        if (this.isDevelopment()) {
          const e: Partial<{ status?: number; code?: string; message?: string }> = error as Partial<{
            status?: number;
            code?: string;
            message?: string;
          }>;
          logger.error(`Error details:`, {
            status: e.status,
            code: e.code,
            message: e.message
          });
        }

        this.recordError(currentKey, lastError);

        // Always try to rotate to next key if we have more attempts
        if (attempts < maxRetries) {
          if (this.isDevelopment()) {
            logger.info(`🔄 Rotating to next key after error...`);
          }
          const rotated = this.rotateToNextAvailableKey();
          if (!rotated) {
            logger.warn('No more API keys available for rotation');
            // If all keys have been tried, break
            if (triedKeys.size >= this.apiKeys.length) {
              if (this.isDevelopment()) {
                logger.warn('All keys have been tried');
              }
              break;
            }
          }
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
   * Get rate limiting statistics
   */
  getRateLimitStats(): RateLimitStats {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentRequests = this.requestTimestamps.filter(t => t > oneMinuteAgo).length;
    
    return {
      dailyUsage: this.dailyRequestCount,
      dailyLimit: this.maxRequestsPerDay,
      recentRequests,
      minutelyLimit: this.maxRequestsPerMinute,
      remainingDaily: this.maxRequestsPerDay - this.dailyRequestCount,
      remainingMinutely: this.maxRequestsPerMinute - recentRequests,
      resetTime: this.getTimeUntilMidnight(),
    };
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