import type { AIExecutionStrategy } from './AIExecutionStrategy';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

export class EdgeFunctionStrategy implements AIExecutionStrategy {
  readonly name = 'supabase-edge-function';
  readonly priority: number;

  constructor(priority: number = 10) {
    this.priority = priority;
  }

  canExecute(): boolean {
    return true;
  }

  async execute(functionName: string, payload?: Record<string, unknown>): Promise<any> {
    logger.debug(`[EdgeFunctionStrategy] Calling ${functionName}`, payload);
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (error) {
      logger.error(`[EdgeFunctionStrategy] ${functionName} failed`, error);
      throw error;
    }

    logger.debug(`[EdgeFunctionStrategy] ${functionName} response`, data);
    return data;
  }
}
