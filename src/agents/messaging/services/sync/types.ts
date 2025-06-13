// All types originally defined in this file (VectorClock, SyncState, MessageSequence, SyncStatus,
// ConflictResolutionStrategy, MessageSyncOptions, and the local QueuedMessage)
// have been moved to src/types/messaging.ts.

// Please update imports to point to '@/types/messaging'.
// For example:
// import { VectorClock, QueuedMessage, MessageType, MessagePriority } from '@/types/messaging';

// Original imports that might no longer be needed here if no types remain:
// import { MessageType, MessagePriority } from '../../types'; // Now from @/types/messaging
// import { Json } from '@/integrations/supabase/types';