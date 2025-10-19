export class CircuitOpenError extends Error {
  public retryAfterSec: number;
  constructor(message: string, retryAfterSec: number) {
    super(message);
    this.name = 'CircuitOpenError';
    this.retryAfterSec = retryAfterSec;
  }
}

export class CircuitBreaker {
  private failureThreshold: number;
  private cooldownMs: number;
  private consecutiveFailures = 0;
  private openUntil = 0; // epoch ms when we can attempt again

  constructor(opts?: { failureThreshold?: number; cooldownMs?: number }) {
    this.failureThreshold = Math.max(1, Math.floor(opts?.failureThreshold ?? Number(process.env.CB_FAILURE_THRESHOLD || 3)));
    this.cooldownMs = Math.max(1000, Math.floor(opts?.cooldownMs ?? Number(process.env.CB_COOLDOWN_MS || 30_000)));
  }

  allowOrThrow(): void {
    const now = Date.now();
    if (now < this.openUntil) {
      const retryAfterSec = Math.ceil((this.openUntil - now) / 1000);
      throw new CircuitOpenError('Circuit breaker is open', retryAfterSec);
    }
  }

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    this.allowOrThrow();
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (e) {
      this.onFailure();
      throw e;
    }
  }

  onSuccess() {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  onFailure() {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.openUntil = Date.now() + this.cooldownMs;
      this.consecutiveFailures = 0; // reset after opening
    }
  }
}

const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(key: string, opts?: { failureThreshold?: number; cooldownMs?: number }): CircuitBreaker {
  if (!breakers.has(key)) breakers.set(key, new CircuitBreaker(opts));
  return breakers.get(key)!;
}
