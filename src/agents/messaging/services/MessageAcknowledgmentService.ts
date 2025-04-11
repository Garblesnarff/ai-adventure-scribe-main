import { createAcknowledgment, updateAcknowledgment, getAcknowledgmentStatus } from './acknowledgment/db';
import { handleTimeout } from './acknowledgment/timeout';
import { AcknowledgmentStatus } from './acknowledgment/types';

export class MessageAcknowledgmentService {
  private static instance: MessageAcknowledgmentService;

  private constructor() {}

  public static getInstance(): MessageAcknowledgmentService {
    if (!MessageAcknowledgmentService.instance) {
      MessageAcknowledgmentService.instance = new MessageAcknowledgmentService();
    }
    return MessageAcknowledgmentService.instance;
  }

  public async createAcknowledgment(messageId: string): Promise<void> {
    return createAcknowledgment(messageId);
  }

  public async updateAcknowledgment(
    messageId: string, 
    status: 'received' | 'processed' | 'failed',
    error?: string
  ): Promise<void> {
    return updateAcknowledgment(messageId, { status, error });
  }

  public async checkAcknowledgmentStatus(messageId: string): Promise<AcknowledgmentStatus | null> {
    return getAcknowledgmentStatus(messageId);
  }

  public async handleTimeout(messageId: string): Promise<void> {
    return handleTimeout(messageId);
  }
}