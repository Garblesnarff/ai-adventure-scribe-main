/**
 * Circuit Breaker Service
 *
 * This file defines the CircuitBreakerService class, which implements the
 * circuit breaker pattern. This pattern is used to prevent an application
 * from repeatedly trying to execute an operation that is likely to fail.
 * It monitors failures for a given context (e.g., an external API call)
 * and "opens" the circuit if failures exceed a threshold, temporarily
 * blocking further calls. After a timeout, it enters a "half-open" state
 * to test if the underlying operation is healthy again.
 * This service is a singleton.
 *
 * Main Class:
 * - CircuitBreakerService: Manages circuit breaker states for different contexts.
 *
 * Key Dependencies: None external to standard TypeScript/JavaScript.
 *
 * @author AI Dungeon Master Team
 */

import { logger } from '../../../lib/logger';

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export class CircuitBreakerService {
  private static instance: CircuitBreakerService;
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RESET_TIMEOUT = 60000; // 1 minute
  private states: Map<string, CircuitBreakerState> = new Map();

  private constructor() {}

  public static getInstance(): CircuitBreakerService {
    if (!CircuitBreakerService.instance) {
      CircuitBreakerService.instance = new CircuitBreakerService();
    }
    return CircuitBreakerService.instance;
  }

  public isOpen(context: string): boolean {
    const state = this.getState(context);

    if (state.state === 'OPEN') {
      if (Date.now() - state.lastFailure >= this.RESET_TIMEOUT) {
        state.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }

    return false;
  }

  public recordError(context: string): void {
    const state = this.getState(context);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.FAILURE_THRESHOLD) {
      state.state = 'OPEN';
      logger.warn(`[CircuitBreaker] Circuit opened for ${context}`);
    }
  }

  public recordSuccess(context: string): void {
    const state = this.getState(context);
    if (state.state === 'HALF_OPEN') {
      state.state = 'CLOSED';
      state.failures = 0;
      logger.info(`[CircuitBreaker] Circuit closed for ${context}`);
    }
  }

  private getState(context: string): CircuitBreakerState {
    if (!this.states.has(context)) {
      this.states.set(context, {
        failures: 0,
        lastFailure: 0,
        state: 'CLOSED',
      });
    }
    return this.states.get(context)!;
  }
}
