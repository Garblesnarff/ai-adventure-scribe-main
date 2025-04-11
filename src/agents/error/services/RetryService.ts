import { ErrorMetadata } from '../types';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class RetryService {
  private readonly defaultConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2
  };

  private retryAttempts: Map<string, number> = new Map();

  public async handleRetry(
    operation: () => Promise<any>,
    context: string,
    metadata?: ErrorMetadata,
    config: Partial<RetryConfig> = {}
  ): Promise<any> {
    const retryConfig = { ...this.defaultConfig, ...config };
    let attempts = this.retryAttempts.get(context) || 0;

    while (attempts < retryConfig.maxRetries) {
      try {
        const result = await operation();
        this.retryAttempts.delete(context);
        return result;
      } catch (error) {
        attempts++;
        this.retryAttempts.set(context, attempts);
        
        if (attempts === retryConfig.maxRetries) {
          throw error;
        }

        const delay = this.calculateDelay(attempts, retryConfig);
        console.log(`[RetryService] Attempt ${attempts} failed, retrying in ${delay}ms`);
        await this.delay(delay);
      }
    }
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelay * Math.pow(config.backoffFactor, attempt - 1);
    return Math.min(delay, config.maxDelay);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public clearRetryAttempts(context: string): void {
    this.retryAttempts.delete(context);
  }
}