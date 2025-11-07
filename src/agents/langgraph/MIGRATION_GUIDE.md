# LangGraph Migration Guide

This guide walks through migrating from the custom messaging system (35 files) to LangGraph state management.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Component Migration](#component-migration)
5. [Testing](#testing)
6. [Rollback Plan](#rollback-plan)
7. [FAQs](#faqs)

## Overview

### What's Changing

**Before (Custom Messaging):**
```typescript
// Old approach: Manual queue management
const messaging = AgentMessagingService.getInstance();
await messaging.sendMessage('user', 'dm', MessageType.QUERY, content, priority);

// Manual state management
const [messages, setMessages] = useState<ChatMessage[]>([]);
const history = await AIService.getConversationHistory(sessionId);
setMessages(history);
```

**After (LangGraph):**
```typescript
// New approach: Hook-based with automatic state
const { sendMessage, messages, isSending } = useDMService({
  sessionId,
  context: { campaignId, characterId, sessionId },
});

await sendMessage('What is in the room?');
// Messages automatically updated, persisted, and synced
```

### Benefits

1. **75% Less Code**: 5 files vs 35 files
2. **Automatic State Management**: No manual useState/useEffect
3. **Built-in Persistence**: Supabase checkpointing
4. **Better Streaming**: Real-time token delivery
5. **Time-Travel Debugging**: Checkpoint history
6. **Multi-Agent Ready**: Native graph support

## Prerequisites

### 1. Run Database Migration

```bash
# Apply checkpoint table migration
npm run server:migrate

# Or manually apply the SQL
psql $DATABASE_URL < supabase/migrations/20251105_create_agent_checkpoints.sql
```

### 2. Install Dependencies

LangGraph dependencies are already in package.json, but verify:

```bash
npm install @langchain/langgraph @langchain/core
```

### 3. Verify Supabase Connection

Ensure Supabase client is configured:

```typescript
// Should be in src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
```

## Database Setup

### 1. Verify Migration

```sql
-- Check that table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'agent_checkpoints';

-- Should return: agent_checkpoints
```

### 2. Test Checkpoint Storage

```typescript
import { SupabaseCheckpointer } from '@/agents/langgraph/persistence/supabase-checkpointer';

const checkpointer = new SupabaseCheckpointer();

// Save test checkpoint
await checkpointer.put(
  { configurable: { thread_id: 'test-session' } },
  {
    id: 'checkpoint-1',
    channel_values: { messages: [] },
  },
  {}
);

// Load it back
const loaded = await checkpointer.get({
  configurable: { thread_id: 'test-session' }
});

console.log('Checkpoint loaded:', loaded);
```

### 3. Verify RLS Policies

Row Level Security ensures users can only access their own sessions:

```sql
-- Test RLS policy
SELECT * FROM agent_checkpoints
WHERE thread_id = 'session-YOUR_SESSION_ID';

-- Should only return checkpoints for your sessions
```

## Component Migration

### Step-by-Step Migration

#### 1. Import New Hook

**Before:**
```typescript
import { useMessages } from '@/hooks/use-messages';
import { useMessageQueue } from '@/hooks/use-message-queue';
import { AIService } from '@/services/ai';
```

**After:**
```typescript
import { useDMService } from '@/hooks/use-dm-service';
```

#### 2. Replace State Management

**Before:**
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  loadConversationHistory();
}, [sessionId]);

const loadConversationHistory = async () => {
  setIsLoading(true);
  const history = await AIService.getConversationHistory(sessionId);
  setMessages(history);
  setIsLoading(false);
};
```

**After:**
```typescript
const {
  messages,
  isLoadingHistory,
  sendMessage,
  isSending,
} = useDMService({
  sessionId,
  context: {
    campaignId,
    characterId,
    sessionId,
    campaignDetails,
    characterDetails,
  },
});

// That's it! No manual loading needed
```

#### 3. Update Message Sending

**Before:**
```typescript
const sendMessage = async () => {
  setIsSending(true);

  // Save user message
  await AIService.saveChatMessage({
    sessionId,
    role: 'user',
    content: messageContent,
  });

  // Get AI response
  const response = await AIService.chatWithDM({
    message: messageContent,
    context,
    conversationHistory: messages,
  });

  // Save AI response
  await AIService.saveChatMessage({
    sessionId,
    role: 'assistant',
    content: response,
  });

  // Update UI
  setMessages(prev => [...prev, userMessage, aiMessage]);
  setIsSending(false);
};
```

**After:**
```typescript
const handleSend = async () => {
  await sendMessage(messageContent);
  // Done! Everything handled automatically
};
```

#### 4. Add Streaming Support (Optional)

**Before:**
```typescript
// Manual streaming handling
const [streamingMessage, setStreamingMessage] = useState('');

const response = await AIService.chatWithDM({
  message,
  context,
  onStream: (chunk) => {
    setStreamingMessage(prev => prev + chunk);
  },
});
```

**After:**
```typescript
const [streamingMessage, setStreamingMessage] = useState('');

const { sendMessage } = useDMService({
  sessionId,
  context,
  onStream: (chunk) => {
    setStreamingMessage(prev => prev + chunk);
  },
});

// Streaming happens automatically
await sendMessage(content);
```

### Complete Example: SimpleGameChat Migration

See `src/agents/langgraph/examples/SimpleGameChat-migrated.tsx` for full example.

**Key Changes:**
1. Removed 50+ lines of manual state management
2. Replaced AIService calls with useDMService hook
3. Automatic message persistence
4. Better error handling via hook

**Lines of Code:**
- Before: ~250 lines
- After: ~180 lines
- Reduction: 28%

## Migration Checklist

### Phase 1: Preparation

- [ ] Run database migration
- [ ] Verify Supabase connection
- [ ] Test checkpoint storage manually
- [ ] Review feature comparison document
- [ ] Choose migration strategy (all-at-once vs gradual)

### Phase 2: Component Updates

For each component using messaging:

- [ ] Import `useDMService` hook
- [ ] Remove manual message state (`useState<ChatMessage[]>`)
- [ ] Remove `useMessages` and `useMessageQueue` hooks
- [ ] Remove `AIService.getConversationHistory` calls
- [ ] Replace `AIService.chatWithDM` with `sendMessage` from hook
- [ ] Remove manual message persistence code
- [ ] Update loading states (`isLoadingHistory` instead of manual)
- [ ] Update error handling (use hook's error state)
- [ ] Test component thoroughly

### Phase 3: Testing

- [ ] Unit tests for message adapter
- [ ] Integration tests for DMService
- [ ] UI tests for migrated components
- [ ] Load testing (multiple concurrent sessions)
- [ ] Checkpoint restoration testing
- [ ] Error recovery testing

### Phase 4: Deployment

- [ ] Deploy database migration to production
- [ ] Deploy code with feature flag (hybrid mode)
- [ ] Monitor error rates
- [ ] Monitor checkpoint storage usage
- [ ] Verify RLS policies working
- [ ] Enable LangGraph for all users
- [ ] Remove legacy code after 1 week

## Testing

### Unit Tests

```bash
# Run message adapter tests
npm test src/agents/langgraph/__tests__/message-adapter.test.ts

# Expected: All tests pass
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { getDMService } from '@/agents/langgraph/dm-service';

describe('DMService Integration', () => {
  it('should persist conversation across reloads', async () => {
    const dmService = getDMService();
    const sessionId = 'test-session-1';

    // Send first message
    await dmService.sendMessage({
      sessionId,
      message: 'Hello DM',
      context: {
        campaignId: 'test',
        characterId: 'test',
        sessionId,
      },
    });

    // Get conversation history
    const messages = await dmService.getConversationHistory(sessionId);

    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0].content).toBe('Hello DM');
  });

  it('should handle streaming responses', async () => {
    const chunks: string[] = [];
    const dmService = getDMService();

    await dmService.sendMessage({
      sessionId: 'test-session-2',
      message: 'Tell me a story',
      context: {
        campaignId: 'test',
        characterId: 'test',
        sessionId: 'test-session-2',
      },
      onStream: (chunk) => {
        chunks.push(chunk);
      },
    });

    expect(chunks.length).toBeGreaterThan(0);
  });
});
```

### Manual Testing

1. **Create Session**: Start new game session
2. **Send Messages**: Send 5-10 messages back and forth
3. **Reload Page**: Force page refresh
4. **Verify History**: Messages should persist
5. **Check Database**: Verify checkpoints in Supabase

```sql
-- Check your checkpoints
SELECT
  thread_id,
  checkpoint_id,
  jsonb_array_length(state->'channel_values'->'messages') as message_count,
  created_at
FROM agent_checkpoints
WHERE thread_id LIKE 'session-%'
ORDER BY created_at DESC
LIMIT 10;
```

## Rollback Plan

If issues occur during migration:

### Option 1: Hybrid Mode (Recommended)

Use compatibility layer to switch strategies:

```typescript
import { createUnifiedMessaging } from '@/agents/langgraph/adapters/messaging-compatibility';

// Create service with strategy
const messaging = createUnifiedMessaging({
  strategy: 'hybrid', // Try LangGraph, fallback to legacy
  fallbackToLegacy: true,
  enableLogging: true,
});

// Or switch at runtime
messaging.setStrategy('legacy'); // Use old system
messaging.setStrategy('langgraph'); // Use new system
```

### Option 2: Quick Rollback

1. **Revert Code Deploy**: Roll back to previous version
2. **Keep Database Migration**: agent_checkpoints table is harmless
3. **Legacy System Continues**: Old code still works

### Option 3: Full Rollback

```sql
-- Drop checkpoint table if absolutely necessary
DROP TABLE IF EXISTS agent_checkpoints CASCADE;
```

```bash
# Revert code
git revert <migration-commit>
git push origin main
```

## Common Issues

### Issue: "Database not initialized"

**Cause**: Supabase client not configured

**Solution**:
```typescript
// Verify in src/integrations/supabase/client.ts
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10));
```

### Issue: "No checkpoint found for thread"

**Cause**: First message to new session

**Solution**: This is normal. First message creates checkpoint.

```typescript
const messages = await dmService.getConversationHistory(sessionId);
// Returns [] for new sessions - expected behavior
```

### Issue: "Rate limit exceeded"

**Cause**: Too many checkpoint writes

**Solution**: Checkpoints are debounced automatically, but verify:

```typescript
// Check checkpoint count
const history = await dmService.getCheckpointHistory(sessionId);
console.log('Checkpoint count:', history.length);

// Should be ~1 per message, not hundreds
```

### Issue: "RLS policy violation"

**Cause**: User trying to access another user's session

**Solution**: Verify thread_id format includes session ID:

```typescript
// Correct format
const threadId = `session-${sessionId}`;

// RLS policy looks for this format
```

## FAQs

### Q: Do I need to migrate all components at once?

**A:** No. Use hybrid mode to migrate gradually:

```typescript
// Component 1: Use LangGraph
const { sendMessage } = useDMService({ ... });

// Component 2: Still using legacy (temporarily)
const messaging = AgentMessagingService.getInstance();
```

### Q: Will this break existing sessions?

**A:** No. Existing sessions continue working. New checkpoints start fresh.

### Q: What about offline support?

**A:** LangGraph requires network connection. For D&D game sessions, this is acceptable since gameplay requires real-time interaction.

If offline support is critical, use hybrid mode with local caching.

### Q: Can I see the checkpoint history?

**A:** Yes! Use the debugging hook:

```typescript
import { useCheckpointHistory } from '@/hooks/use-dm-service';

const { data: checkpoints } = useCheckpointHistory(sessionId);

console.log('Checkpoint history:', checkpoints);
// Shows all saved states for time-travel debugging
```

### Q: How much does this cost?

**A:** Checkpoint storage:
- ~5KB per checkpoint
- ~50 checkpoints per session
- = ~250KB per session
- Supabase free tier: 500MB
- = ~2000 sessions in free tier

### Q: Can I delete old checkpoints?

**A:** Yes, automatically via retention policy:

```sql
-- Add retention policy (optional)
CREATE OR REPLACE FUNCTION cleanup_old_checkpoints()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_checkpoints
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
SELECT cron.schedule(
  'cleanup-checkpoints',
  '0 2 * * *', -- 2 AM daily
  'SELECT cleanup_old_checkpoints();'
);
```

## Next Steps

After migration:

1. **Monitor Performance**: Track checkpoint save/load times
2. **Gather Metrics**: Message throughput, error rates
3. **User Feedback**: Collect feedback on new system
4. **Optimize**: Add caching, batch writes if needed
5. **Document**: Update team documentation
6. **Remove Legacy**: Delete old messaging code after 2 weeks

## Support

If you encounter issues:

1. Check this guide's Common Issues section
2. Review feature comparison document
3. Check LangGraph documentation
4. Ask in team Slack #ai-development

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Feature Comparison](./MIGRATION_FEATURE_COMPARISON.md)
- [Example Migration](./examples/SimpleGameChat-migrated.tsx)
- [Message Adapter Tests](./__tests__/message-adapter.test.ts)
