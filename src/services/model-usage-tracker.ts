/**
 * Model Usage Tracker Service
 *
 * Tracks usage of free tier AI models to implement proper rate limiting
 * and fallback to paid models when free limits are exhausted.
 *
 * @author AI Dungeon Master Team
 */

import logger from '@/lib/logger';

interface ModelUsage {
  modelId: string;
  dailyLimit: number;
  usageCount: number;
  lastResetDate: string;
}

interface UsageData {
  [modelId: string]: ModelUsage;
}

/**
 * Service class for tracking AI model usage and managing free tier limits
 */
export class ModelUsageTracker {
  private storageKey = 'ai-model-usage-tracker';
  private usageData: UsageData = {};

  constructor() {
    this.loadUsageData();
    this.resetDailyCountsIfNeeded();
  }

  /**
   * Check if a model has remaining free usage for today
   * @param modelId - The model identifier
   * @param dailyLimit - The daily limit for this model
   * @returns True if usage is available, false if limit exceeded
   */
  canUseModel(modelId: string, dailyLimit: number): boolean {
    this.ensureModelExists(modelId, dailyLimit);
    const usage = this.usageData[modelId];

    return usage.usageCount < usage.dailyLimit;
  }

  /**
   * Record usage of a model
   * @param modelId - The model identifier
   * @param dailyLimit - The daily limit for this model
   * @returns The updated usage count
   */
  recordUsage(modelId: string, dailyLimit: number): number {
    this.ensureModelExists(modelId, dailyLimit);
    const usage = this.usageData[modelId];

    usage.usageCount++;
    this.saveUsageData();

    logger.info(`Model usage recorded for ${modelId}: ${usage.usageCount}/${usage.dailyLimit}`);
    return usage.usageCount;
  }

  /**
   * Get remaining usage count for a model
   * @param modelId - The model identifier
   * @param dailyLimit - The daily limit for this model
   * @returns Number of remaining uses today
   */
  getRemainingUsage(modelId: string, dailyLimit: number): number {
    this.ensureModelExists(modelId, dailyLimit);
    const usage = this.usageData[modelId];

    return Math.max(0, usage.dailyLimit - usage.usageCount);
  }

  /**
   * Get current usage stats for a model
   * @param modelId - The model identifier
   * @param dailyLimit - The daily limit for this model
   * @returns Usage statistics
   */
  getUsageStats(
    modelId: string,
    dailyLimit: number,
  ): { used: number; limit: number; remaining: number } {
    this.ensureModelExists(modelId, dailyLimit);
    const usage = this.usageData[modelId];

    return {
      used: usage.usageCount,
      limit: usage.dailyLimit,
      remaining: this.getRemainingUsage(modelId, dailyLimit),
    };
  }

  /**
   * Manually reset usage for a model (for testing or admin purposes)
   * @param modelId - The model identifier
   */
  resetModelUsage(modelId: string): void {
    if (this.usageData[modelId]) {
      this.usageData[modelId].usageCount = 0;
      this.usageData[modelId].lastResetDate = this.getTodayString();
      this.saveUsageData();
      logger.info(`Usage reset for model: ${modelId}`);
    }
  }

  /**
   * Get all tracked models and their usage
   * @returns Object containing usage data for all models
   */
  getAllUsageData(): UsageData {
    return { ...this.usageData };
  }

  /**
   * Ensure a model entry exists in the usage data
   */
  private ensureModelExists(modelId: string, dailyLimit: number): void {
    if (!this.usageData[modelId]) {
      this.usageData[modelId] = {
        modelId,
        dailyLimit,
        usageCount: 0,
        lastResetDate: this.getTodayString(),
      };
      this.saveUsageData();
    }

    // Update daily limit if it has changed
    if (this.usageData[modelId].dailyLimit !== dailyLimit) {
      this.usageData[modelId].dailyLimit = dailyLimit;
      this.saveUsageData();
    }
  }

  /**
   * Load usage data from localStorage
   */
  private loadUsageData(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.usageData = JSON.parse(stored);
      }
    } catch (error) {
      logger.warn('Failed to load usage data from localStorage:', error);
      this.usageData = {};
    }
  }

  /**
   * Save usage data to localStorage
   */
  private saveUsageData(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.usageData));
    } catch (error) {
      logger.error('Failed to save usage data to localStorage:', error);
    }
  }

  /**
   * Reset daily counts if a new day has started
   */
  private resetDailyCountsIfNeeded(): void {
    const today = this.getTodayString();
    let hasChanges = false;

    for (const modelId in this.usageData) {
      const usage = this.usageData[modelId];
      if (usage.lastResetDate !== today) {
        usage.usageCount = 0;
        usage.lastResetDate = today;
        hasChanges = true;
        logger.info(`Daily usage reset for model: ${modelId}`);
      }
    }

    if (hasChanges) {
      this.saveUsageData();
    }
  }

  /**
   * Get today's date as a string (YYYY-MM-DD)
   */
  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }
}

// Export singleton instance
export const modelUsageTracker = new ModelUsageTracker();
