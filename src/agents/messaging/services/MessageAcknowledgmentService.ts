/**
 * Message Acknowledgment Service
 *
 * This file defines the MessageAcknowledgmentService class, a singleton service
 * responsible for managing the acknowledgment lifecycle of messages within the
 * agent messaging system. It interacts with database functions for persistence
 * and timeout handlers for managing acknowledgment expirations.
 *
 * Main Class:
 * - MessageAcknowledgmentService: Manages message acknowledgments.
 *
 * Key Dependencies:
 * - Acknowledgment DB functions (`./acknowledgment/db.ts`)
 * - Timeout handler (`./acknowledgment/timeout.ts`)
 * - AcknowledgmentStatus type (`./acknowledgment/types.ts`)
 *
 * @author AI Dungeon Master Team
 */

// Project Utilities & Types (assuming kebab-case for .ts files)
import {
  createAcknowledgment,
  updateAcknowledgment,
  getAcknowledgmentStatus,
} from './acknowledgment/db';
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
    error?: string,
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
