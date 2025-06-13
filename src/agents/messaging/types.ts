// Types like QueuedMessage, MessageType, MessagePriority,
// MessageDeliveryStatus, MessageAcknowledgment, OfflineState
// have been moved to src/types/messaging.ts.

export interface MessageQueueConfig {
  maxRetries: number;
  retryDelay: number;
  timeoutDuration: number;
  maxQueueSize: number;
}

// OfflineState moved to src/types/messaging.ts