import { ReconnectionConfig, ReconnectionState } from './types';
import { EventEmitter } from './EventEmitter';

export class ReconnectionManager {
  private state: ReconnectionState = {
    attempts: 0,
    lastAttempt: null,
    nextAttemptDelay: 0
  };
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private config: ReconnectionConfig,
    private eventEmitter: EventEmitter,
    private maxAttempts: number = 10
  ) {}

  public startReconnection(): void {
    if (this.state.attempts >= this.maxAttempts) {
      this.eventEmitter.emit('reconnectionFailure', {
        attempts: this.state.attempts,
        lastAttempt: new Date()
      });
      return;
    }

    const delay = this.calculateBackoffDelay();
    console.log(`[ReconnectionManager] Attempting reconnection in ${delay}ms`);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.state.attempts++;
      this.state.lastAttempt = new Date();
      this.eventEmitter.emit('reconnectionAttempt', {
        attempt: this.state.attempts,
        timestamp: new Date()
      });
    }, delay);
  }

  public reset(): void {
    this.state = {
      attempts: 0,
      lastAttempt: null,
      nextAttemptDelay: 0
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