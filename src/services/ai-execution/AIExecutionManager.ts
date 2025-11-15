import type { AIExecutionStrategy } from './AIExecutionStrategy';

import logger from '@/lib/logger';

interface ExecutionOptions {
  fallbackOnFailure?: boolean;
}

export class AIExecutionManager {
  private strategies: AIExecutionStrategy[];

  constructor(strategies: AIExecutionStrategy[]) {
    this.strategies = [...strategies].sort((a, b) => a.priority - b.priority);
  }

  public async execute(
    functionName: string,
    payload?: Record<string, unknown>,
    options: ExecutionOptions = { fallbackOnFailure: true },
  ): Promise<any> {
    const applicable = this.strategies.filter((strategy) => strategy.canExecute(functionName));
    if (!applicable.length) {
      throw new Error(`No execution strategy available for ${functionName}`);
    }

    let lastError: unknown;

    for (const strategy of applicable) {
      try {
        logger.debug(`[AIExecutionManager] Executing ${functionName} via ${strategy.name}`);
        return await strategy.execute(functionName, payload);
      } catch (error) {
        lastError = error;
        logger.warn(`[AIExecutionManager] Strategy ${strategy.name} failed`, error);
        if (!options.fallbackOnFailure) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`All strategies failed for ${functionName}`);
  }
}
