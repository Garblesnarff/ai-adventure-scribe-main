import type { QueuedMessage } from '../../types';

interface TelemetrySnapshot {
  delivered: number;
  failed: number;
  retried: number;
  deadLetter: number;
  lastError?: string;
}

export class MessageDiagnosticsService {
  private static instance: MessageDiagnosticsService;
  private metrics: TelemetrySnapshot = {
    delivered: 0,
    failed: 0,
    retried: 0,
    deadLetter: 0,
  };
  private deadLetterQueue: QueuedMessage[] = [];

  public static getInstance(): MessageDiagnosticsService {
    if (!MessageDiagnosticsService.instance) {
      MessageDiagnosticsService.instance = new MessageDiagnosticsService();
    }
    return MessageDiagnosticsService.instance;
  }

  public recordDelivery(): void {
    this.metrics.delivered += 1;
  }

  public recordFailure(error?: string): void {
    this.metrics.failed += 1;
    if (error) this.metrics.lastError = error;
  }

  public recordRetry(): void {
    this.metrics.retried += 1;
  }

  public recordDeadLetter(message: QueuedMessage): void {
    this.metrics.deadLetter += 1;
    this.deadLetterQueue.push(message);
  }

  public getSnapshot(): TelemetrySnapshot {
    return { ...this.metrics };
  }

  public getDeadLetterQueue(): QueuedMessage[] {
    return [...this.deadLetterQueue];
  }

  public clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }
}
