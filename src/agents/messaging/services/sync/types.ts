import { MessageType, MessagePriority } from '../../types';
import { Json } from '@/integrations/supabase/types';

export interface VectorClock {
  [agentId: string]: number;
}

export interface SyncState {
  lastSequenceNumber: number;
  vectorClock: VectorClock;
  pendingMessages: string[];
  conflicts: string[];
}

export interface MessageSequence {
  id: string;
  messageId: string;
  sequenceNumber: number;
  vectorClock: VectorClock;
  createdAt: string;
  updatedAt: string;
}

export interface SyncStatus {
  id: string;
  agentId: string;
  lastSyncTimestamp: string;
  syncState: SyncState;
  vectorClock: VectorClock;
  createdAt: string;
  updatedAt: string;
}

export interface ConflictResolutionStrategy {
  type: 'timestamp' | 'priority' | 'custom';
  resolve: (messages: QueuedMessage[]) => QueuedMessage;
}

export interface MessageSyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  conflictStrategy?: ConflictResolutionStrategy;
  consistencyCheckInterval?: number;
}

export interface QueuedMessage {
  id: string;
  type: MessageType;
  content: Json;
  priority: MessagePriority;
  sender: string;
  receiver: string;
  timestamp: Date;
  deliveryStatus: {
    delivered: boolean;
    timestamp: Date;
    attempts: number;
    error?: string;
  };
  retryCount: number;
  maxRetries: number;
}
