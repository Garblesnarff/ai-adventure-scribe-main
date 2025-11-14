import { Json } from '@/integrations/supabase/types';

export enum MessageType {
  TASK = 'TASK',
  RESULT = 'RESULT',
  QUERY = 'QUERY',
  RESPONSE = 'RESPONSE',
  STATE_UPDATE = 'STATE_UPDATE',
}

export enum MessagePriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
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

export interface MessageQueueConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutDuration: number;
  maxQueueSize: number;
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
