# LangGraph Migration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Components                             │
│  (SimpleGameChat, MessageHandler, GameContent, etc.)            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useDMService Hook                             │
│  - TanStack Query integration                                   │
│  - Automatic state management                                   │
│  - Loading/error states                                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DMService                                   │
│  - sendMessage()                                                │
│  - getConversationHistory()                                     │
│  - clearHistory()                                               │
│  - getCheckpointHistory()                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
┌──────────────────────┐ ┌──────────────────────┐
│  LangGraph Adapter   │ │ Supabase Checkpointer│
│  - Message conversion│ │ - State persistence  │
│  - Type mapping      │ │ - Checkpoint history │
└──────────────────────┘ └──────────────────────┘
           │                       │
           ▼                       ▼
┌──────────────────────┐ ┌──────────────────────┐
│  LangChain Messages  │ │  agent_checkpoints   │
│  - HumanMessage      │ │     (Supabase)       │
│  - AIMessage         │ └──────────────────────┘
│  - SystemMessage     │
└──────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DM Graph (Work Unit 6.4)                      │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐             │
│  │  Detect    │──▶│  Validate  │──▶│ Generate   │             │
│  │  Intent    │   │  Rules     │   │ Response   │             │
│  └────────────┘   └────────────┘   └────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Message Flow

### 1. User Input

```
User types: "I attack the goblin"
      │
      ▼
SimpleGameChat component
      │
      ▼
useDMService hook
      │
      ▼
DMService.sendMessage({
  sessionId: 'session-123',
  message: 'I attack the goblin',
  context: { campaignId, characterId, ... }
})
```

### 2. Message Conversion

```
DMService
      │
      ▼
LangGraphMessageAdapter.fromGameMessage({
  role: 'user',
  content: 'I attack the goblin'
})
      │
      ▼
HumanMessage({
  content: 'I attack the goblin',
  additional_kwargs: { timestamp, characterId, ... }
})
```

### 3. Checkpoint Loading

```
SupabaseCheckpointer.get({
  configurable: { thread_id: 'session-123' }
})
      │
      ▼
SELECT * FROM agent_checkpoints
WHERE thread_id = 'session-123'
ORDER BY created_at DESC LIMIT 1
      │
      ▼
Previous messages: [msg1, msg2, msg3]
```

### 4. Graph Invocation (Placeholder)

```
dmGraph.invoke({
  messages: [...previousMessages, newUserMessage],
  worldContext: { campaignId, characterId, ... }
}, {
  configurable: { thread_id: 'session-123' }
})
      │
      ▼
[Placeholder response for now]
      │
      ▼
AIMessage({
  content: 'DM response...',
  additional_kwargs: { ... }
})
```

### 5. Checkpoint Saving

```
SupabaseCheckpointer.put(
  { configurable: { thread_id: 'session-123' } },
  {
    id: 'checkpoint-456',
    channel_values: {
      messages: [...previousMessages, userMsg, aiMsg]
    }
  }
)
      │
      ▼
INSERT INTO agent_checkpoints
(thread_id, checkpoint_id, state, ...)
VALUES ('session-123', 'checkpoint-456', ...)
```

### 6. Response Return

```
DMService returns:
{
  response: 'The goblin dodges your attack!',
  requiresDiceRoll: true,
  suggestedActions: ['Try again', 'Use ability']
}
      │
      ▼
useDMService hook updates:
- messages array (via TanStack Query)
- isSending = false
      │
      ▼
SimpleGameChat re-renders with new message
```

## Data Models

### GameMessage (UI Layer)

```typescript
interface GameMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

### BaseMessage (LangChain Layer)

```typescript
class HumanMessage extends BaseMessage {
  content: string;
  additional_kwargs: {
    id?: string;
    timestamp?: string;
    characterId?: string;
    [key: string]: any;
  };
}
```

### Checkpoint (Persistence Layer)

```typescript
interface Checkpoint {
  id: string;
  channel_values: {
    messages: BaseMessage[];
    [key: string]: any;
  };
}
```

### Database Row (Supabase)

```sql
agent_checkpoints {
  id: uuid
  thread_id: text              -- "session-{session_id}"
  checkpoint_id: text          -- "checkpoint-{uuid}"
  parent_checkpoint_id: text   -- Previous checkpoint
  state: jsonb                 -- Serialized Checkpoint
  metadata: jsonb              -- Additional info
  created_at: timestamptz
  updated_at: timestamptz
}
```

## State Transitions

### New Session

```
1. User starts new game session
   ├─ session_id generated
   ├─ thread_id = "session-{session_id}"
   └─ No checkpoint exists yet

2. First message sent
   ├─ No previous messages to load
   ├─ Graph invoked with single message
   └─ First checkpoint created

3. Checkpoint saved
   ├─ thread_id: "session-123"
   ├─ checkpoint_id: "checkpoint-1"
   └─ state: { messages: [userMsg, aiMsg] }
```

### Continuing Session

```
1. User returns to session
   ├─ thread_id = "session-{session_id}"
   └─ Checkpoint exists

2. Load checkpoint
   ├─ Latest checkpoint retrieved
   ├─ Messages deserialized
   └─ Conversation history restored

3. New message sent
   ├─ Previous messages loaded
   ├─ New message appended
   ├─ Graph invoked with full history
   └─ New checkpoint created

4. Checkpoint chain
   ├─ checkpoint-1 (parent: null)
   ├─ checkpoint-2 (parent: checkpoint-1)
   └─ checkpoint-3 (parent: checkpoint-2)
```

### Session Cleanup

```
1. User ends session
   ├─ Session marked as completed
   └─ Checkpoints remain for history

2. Optional: Clear conversation
   ├─ DMService.clearHistory(sessionId)
   └─ All checkpoints deleted
```

## Migration Strategies

### Strategy 1: LangGraph Only

```typescript
const messaging = createUnifiedMessaging({
  strategy: 'langgraph',
  fallbackToLegacy: false,
});
```

**Flow:**
```
Component → useDMService → DMService → LangGraph → Supabase
```

**Pros:** Clean, no legacy code
**Cons:** No fallback if issues

### Strategy 2: Legacy Only

```typescript
const messaging = createUnifiedMessaging({
  strategy: 'legacy',
});
```

**Flow:**
```
Component → AgentMessagingService → IndexedDB
```

**Pros:** Proven, stable
**Cons:** Missing new features

### Strategy 3: Hybrid (Recommended)

```typescript
const messaging = createUnifiedMessaging({
  strategy: 'hybrid',
  fallbackToLegacy: true,
});
```

**Flow:**
```
Component → UnifiedMessagingService
              │
              ├─ Try: LangGraph → Supabase
              │
              └─ Fallback: Legacy → IndexedDB
```

**Pros:** Safe migration, automatic fallback
**Cons:** Dual code paths temporarily

## Compatibility Layer

### UnifiedMessagingService

Provides consistent API for both systems:

```typescript
class UnifiedMessagingService {
  private legacyService: AgentMessagingService;
  private langgraphService: DMService;
  private strategy: 'legacy' | 'langgraph' | 'hybrid';

  async sendMessage(params) {
    switch (this.strategy) {
      case 'langgraph':
        return this.sendViaLangGraph(params);

      case 'legacy':
        return this.sendViaLegacy(params);

      case 'hybrid':
        try {
          return await this.sendViaLangGraph(params);
        } catch (error) {
          return this.sendViaLegacy(params);
        }
    }
  }
}
```

## Error Handling

### DMService Level

```typescript
try {
  const response = await dmService.sendMessage(config);
} catch (error) {
  if (error.message.includes('Rate limit')) {
    // Handle rate limiting
  } else if (error.message.includes('Database')) {
    // Handle persistence errors
  } else {
    // Generic error handling
  }
}
```

### Hook Level

```typescript
const { sendMessage, error } = useDMService({
  sessionId,
  context,
  onError: (err) => {
    toast.error('Failed to send message', {
      description: err.message,
    });
  },
});

if (error) {
  // Display error state in UI
}
```

### Checkpoint Level

```typescript
class SupabaseCheckpointer {
  async put(config, checkpoint, metadata) {
    try {
      await supabase.from('agent_checkpoints').upsert(...);
    } catch (error) {
      logger.error('Checkpoint save failed:', error);
      throw new CheckpointError('Failed to persist state', error);
    }
  }
}
```

## Performance Optimizations

### 1. Checkpoint Batching

```typescript
// Debounce checkpoint saves
const debouncedSave = debounce(
  (checkpoint) => checkpointer.put(config, checkpoint),
  500
);
```

### 2. Message Caching

```typescript
// TanStack Query automatically caches
const { messages } = useDMService({
  sessionId,
  context,
});
// Subsequent renders use cached data
```

### 3. Lazy Loading

```typescript
// Load LangGraph only when needed
const dmService = lazy(() => import('@/agents/langgraph/dm-service'));
```

### 4. Checkpoint Pruning

```sql
-- Automatic cleanup of old checkpoints
DELETE FROM agent_checkpoints
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Security

### Row Level Security

```sql
-- Users can only access their own session checkpoints
CREATE POLICY "Users can manage their own checkpoints"
  ON agent_checkpoints
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id::text = substring(thread_id from 'session-(.+)')
      AND sessions.player_id = auth.uid()
    )
  );
```

### Data Validation

```typescript
// Type-safe message conversion
const baseMessage = LangGraphMessageAdapter.fromGameMessage(gameMessage);
// TypeScript ensures correct types

// Checkpoint schema validation
const CheckpointSchema = z.object({
  id: z.string(),
  channel_values: z.object({
    messages: z.array(z.any()),
  }),
});
```

## Monitoring

### Metrics to Track

1. **Message Send Latency**
   ```typescript
   const start = Date.now();
   await dmService.sendMessage(config);
   const latency = Date.now() - start;
   metrics.record('message.send.latency', latency);
   ```

2. **Checkpoint Save Frequency**
   ```sql
   SELECT
     DATE_TRUNC('hour', created_at) as hour,
     COUNT(*) as checkpoint_count
   FROM agent_checkpoints
   GROUP BY hour
   ORDER BY hour DESC;
   ```

3. **Error Rates**
   ```typescript
   try {
     await dmService.sendMessage(config);
     metrics.increment('message.send.success');
   } catch (error) {
     metrics.increment('message.send.error');
     metrics.increment(`message.send.error.${error.type}`);
   }
   ```

4. **Storage Usage**
   ```sql
   SELECT
     SUM(pg_column_size(state)) as total_bytes,
     COUNT(*) as checkpoint_count,
     SUM(pg_column_size(state)) / COUNT(*) as avg_bytes
   FROM agent_checkpoints;
   ```

## Rollback Procedure

### Immediate Rollback (< 5 minutes)

```typescript
// Switch to legacy via compatibility layer
const messaging = createUnifiedMessaging({
  strategy: 'legacy',  // Changed from 'langgraph'
});

// Or environment variable
process.env.MESSAGING_STRATEGY = 'legacy';
```

### Code Rollback (< 1 hour)

```bash
# Revert deployment
git revert <migration-commit>
git push origin main

# Database migration remains (harmless)
# Legacy system continues working
```

### Complete Rollback (if necessary)

```sql
-- Remove checkpoint table
DROP TABLE agent_checkpoints CASCADE;
```

```bash
# Remove LangGraph code
rm -rf src/agents/langgraph
git commit -m "Rollback LangGraph migration"
git push origin main
```

## Future Enhancements

### 1. Local Checkpoint Cache

```typescript
class HybridCheckpointer extends SupabaseCheckpointer {
  private localCache = new IndexedDBCache();

  async put(config, checkpoint, metadata) {
    // Save to local cache first
    await this.localCache.put(checkpoint);

    // Sync to Supabase in background
    this.backgroundSync(config, checkpoint, metadata);
  }
}
```

### 2. Checkpoint Branching

```typescript
// Create alternate storyline
const branchId = await dmService.createBranch(sessionId, checkpointId);

// Explore different path
await dmService.sendMessage({
  sessionId: branchId,
  message: 'I choose option B instead',
  context,
});

// Merge or discard branch later
await dmService.mergeBranch(branchId, sessionId);
```

### 3. Time-Travel UI

```tsx
function CheckpointHistory({ sessionId }) {
  const { data: checkpoints } = useCheckpointHistory(sessionId);

  return (
    <div>
      {checkpoints.map(cp => (
        <button onClick={() => restoreCheckpoint(cp.id)}>
          {cp.timestamp} - {cp.messageCount} messages
        </button>
      ))}
    </div>
  );
}
```

### 4. Multi-Agent Graphs

```typescript
// Work Unit 6.4 will implement
const dmGraph = StateGraph({
  nodes: {
    dm_agent: dungeonMasterNode,
    rules_agent: rulesInterpreterNode,
    world_agent: worldStateNode,
  },
  edges: {
    dm_agent: ['rules_agent', 'world_agent'],
    rules_agent: ['dm_agent'],
    world_agent: ['dm_agent'],
  },
});
```

## Summary

This architecture provides:

1. **Clear Separation of Concerns**
   - UI layer (components)
   - Hook layer (React integration)
   - Service layer (DMService)
   - Adapter layer (message conversion)
   - Persistence layer (Supabase)

2. **Gradual Migration Path**
   - Compatibility layer supports all strategies
   - Components migrate one at a time
   - Fallback to legacy if needed

3. **Production-Ready**
   - Error handling at all layers
   - RLS security
   - Performance monitoring
   - Rollback procedures

4. **Future-Proof**
   - Multi-agent ready
   - Time-travel capable
   - Branching support
   - Scalable persistence
