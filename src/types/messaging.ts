import { Json } from '@/integrations/supabase/types';

export enum MessageType {
  TASK = 'TASK',
  RESULT = 'RESULT',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
  STATE_UPDATE = 'STATE_UPDATE'
}

export enum MessagePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export interface MessageDeliveryStatus {
  delivered: boolean;
  timestamp: Date;
  attempts: number;
  error?: string;
}

export interface MessageAcknowledgment {
  messageId: string;
  receiverId: string;
  timestamp: Date;
  status: 'received' | 'processed' | 'failed';
}

export interface QueuedMessage {
  id: string;
  type: MessageType;
  content: Json;
  priority: MessagePriority;
  sender: string;
  receiver: string;
  timestamp: Date;
  deliveryStatus: MessageDeliveryStatus;
  acknowledgment?: MessageAcknowledgment;
  retryCount: number;
  maxRetries: number;
}

/**
 * Interface for offline state management
 */
export interface OfflineState {
  isOnline: boolean;
  lastOnlineTimestamp: string;
  lastOfflineTimestamp: string;
  pendingSync: boolean;
  queueSize: number;
  reconnectionAttempts: number;
}

// Sync-related types
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
  resolve: (messages: QueuedMessage[]) => QueuedMessage; // Depends on QueuedMessage from this file
}

export interface MessageSyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  conflictStrategy?: ConflictResolutionStrategy;
  consistencyCheckInterval?: number;
}
