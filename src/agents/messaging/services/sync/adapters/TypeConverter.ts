import { Json } from '@/integrations/supabase/types';
import { VectorClock, SyncState, MessageSequence, QueuedMessage, SyncStatus } from '../types';
import { MessageType, MessagePriority } from '@/agents/messaging/types';

export class TypeConverter {
  static toJson(value: VectorClock | SyncState): Json {
    return value as unknown as Json;
  }

  static fromJson<T>(value: Json): T {
    return value as unknown as T;
  }

  static messageSequenceFromDb(dbRecord: any): MessageSequence {
    return {
      id: dbRecord.id,
      messageId: dbRecord.message_id,
      sequenceNumber: dbRecord.sequence_number,
      vectorClock: this.fromJson<VectorClock>(dbRecord.vector_clock),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }

  static syncStatusFromDb(dbRecord: any): SyncStatus {
    return {
      id: dbRecord.id,
      agentId: dbRecord.agent_id,
      lastSyncTimestamp: dbRecord.last_sync_timestamp,
      syncState: this.fromJson<SyncState>(dbRecord.sync_state),
      vectorClock: this.fromJson<VectorClock>(dbRecord.vector_clock),
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
    };
  }

  static queuedMessageFromDb(dbRecord: any): QueuedMessage {
    return {
      id: dbRecord.id,
      type: dbRecord.message_type as MessageType,
      content: dbRecord.content,
      priority: MessagePriority.MEDIUM,
      sender: dbRecord.sender_id,
      receiver: dbRecord.receiver_id,
      timestamp: new Date(dbRecord.created_at),
      deliveryStatus: {
        delivered: false,
        timestamp: new Date(),
        attempts: 0,
      },
      retryCount: 0,
      maxRetries: 3,
    };
  }
}
