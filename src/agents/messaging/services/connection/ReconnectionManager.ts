/**
 * Reconnection Manager
 *
 * This file defines the ReconnectionManager class, responsible for handling
 * the logic of attempting to reconnect to a service after a connection loss.
 * It implements an exponential backoff strategy with jitter to schedule
 * reconnection attempts and emits events related to these attempts.
 *
 * Main Class:
 * - ReconnectionManager: Manages reconnection attempts with backoff.
 *
 * Key Dependencies:
 * - EventEmitter (./event-emitter.ts)
 * - ReconnectionConfig and ReconnectionState types (`./types.ts`)
 *
 * @author AI Dungeon Master Team
 */

// Project Utilities (assuming kebab-case for EventEmitter)
import { EventEmitter } from './event-emitter';

// Project Types
import { ReconnectionConfig, ReconnectionState } from './types';
import { logger } from '../../../../lib/logger';

export class ReconnectionManager {
  private state: ReconnectionState = {
    attempts: 0,
    lastAttempt: null,
    nextAttemptDelay: 0,
  };
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private config: ReconnectionConfig,
    private eventEmitter: EventEmitter,
    private maxAttempts: number = 10,
  ) {}

  public startReconnection(): void {
    if (this.state.attempts >= this.maxAttempts) {
      this.eventEmitter.emit('reconnectionFailure', {
        attempts: this.state.attempts,
        lastAttempt: new Date(),
      });
      return;
    }

    const delay = this.calculateBackoffDelay();
    logger.info(`[ReconnectionManager] Attempting reconnection in ${delay}ms`);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.state.attempts++;
      this.state.lastAttempt = new Date();
      this.eventEmitter.emit('reconnectionAttempt', {
        attempt: this.state.attempts,
        timestamp: new Date(),
      });
    }, delay);
  }

  public reset(): void {
    this.state = {
      attempts: 0,
      lastAttempt: null,
      nextAttemptDelay: 0,
    };
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private calculateBackoffDelay(): number {
    const { initialDelay, maxDelay, factor, jitter } = this.config;
    let delay = initialDelay * Math.pow(factor, this.state.attempts);

    if (jitter) {
      delay = delay * (0.5 + Math.random());
    }

    this.state.nextAttemptDelay = Math.min(delay, maxDelay);
    return this.state.nextAttemptDelay;
  }
}
