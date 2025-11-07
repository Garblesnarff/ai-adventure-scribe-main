# LangGraph Agent Orchestration

LangGraph-based agent workflow infrastructure for the D&D AI platform.

## Overview

This directory contains the LangGraph implementation that replaces the custom 300+ file messaging system. LangGraph provides:

- **Clearer Architecture**: Graph-based workflow vs. complex message passing
- **Built-in State Management**: Native state persistence and checkpointing
- **Better Debugging**: LangSmith integration for tracing and visualization
- **Reduced Complexity**: ~10 files vs. 300+ files
- **Production-Ready**: Battle-tested framework from LangChain

## Architecture

### Graph Flow

```
Player Input
    |
    v
[detect_intent] - Analyze player message
    |
    v
[validate_rules] - Check D&D 5E rules
    |
    v
[generate_response] - Create DM narrative
    |
    v
Final Response
```

### State Management

State flows through the graph and accumulates information:

```typescript
DMState {
  messages: BaseMessage[]           // Conversation history
  playerInput: string               // Original input
  playerIntent: string              // Detected intent
  rulesValidation: RuleCheckResult  // Rules check
  worldContext: WorldInfo           // Campaign context
  response: NarrativeResponse       // Final DM response
  requiresDiceRoll: DiceRollRequest // Dice rolls if needed
  error: string                     // Error handling
}
```

## Files

### Core Files

- **state.ts** (177 lines) - State definitions and type interfaces
- **dm-graph.ts** (163 lines) - Main DM agent graph
- **config.ts** (147 lines) - Configuration and settings
- **checkpointer.ts** (162 lines) - State persistence layer

### Node Implementations

- **nodes/intent-detector.ts** (26 lines) - Player intent detection
- **nodes/rules-validator.ts** (26 lines) - D&D rules validation
- **nodes/response-generator.ts** (28 lines) - Narrative generation

## Usage

### Basic Invocation

```typescript
import { invokeDMGraph } from './dm-graph';

const result = await invokeDMGraph(
  "I attack the goblin with my sword",
  {
    campaignId: "camp_123",
    sessionId: "sess_456",
    characterIds: ["char_789"],
  },
  "sess_456" // thread ID for checkpointing
);

console.log(result.response);
```

### Streaming for Real-time Updates

```typescript
import { streamDMGraph } from './dm-graph';

for await (const chunk of streamDMGraph(
  "I search for traps",
  worldContext,
  sessionId
)) {
  console.log('Graph update:', chunk);
}
```

## Configuration

### Environment Variables

```bash
# LangSmith tracing (optional)
VITE_LANGCHAIN_API_KEY=your_key_here

# Checkpoint storage type
VITE_CHECKPOINT_STORAGE=memory|localstorage|supabase
```

### Config Options

See `config.ts` for full configuration:

- **maxIterations**: Maximum graph iterations (default: 10)
- **checkpointInterval**: Save frequency (default: every 5 messages)
- **nodeTimeout**: Individual node timeout (default: 30s)
- **graphTimeout**: Total graph timeout (default: 2m)

## Checkpointing

### Storage Options

1. **Memory** (default) - Fast, lost on reload
2. **LocalStorage** - Persists in browser
3. **Supabase** - Cloud persistence (multi-device)

Checkpoints enable:
- State recovery after crashes
- Resuming interrupted conversations
- Time-travel debugging
- Multi-step workflows

## Migration from Custom Messaging

### Before (Custom System)

```typescript
// Complex message passing
await messagingService.sendMessage(
  senderId,
  receiverId,
  MessageType.TASK,
  payload,
  MessagePriority.HIGH
);

// Wait for acknowledgment
await messagingService.waitForAck(messageId);

// Check offline queue
await queueService.processOfflineQueue();
```

### After (LangGraph)

```typescript
// Simple graph invocation
const result = await invokeDMGraph(
  playerInput,
  worldContext,
  sessionId
);

// State automatically persisted
// No manual queue management
// Built-in error handling
```

## Implementation Status

### Work Unit 6.1 - LangGraph Setup
- [x] LangGraph installation verified
- [x] Directory structure created
- [x] State definitions implemented
- [x] Configuration created
- [x] Checkpointer scaffolded
- [x] Basic graph skeleton compiled

### Work Unit 6.2 - Node Implementations
- [ ] Implement intent detector with LLM
- [ ] Implement rules validator
- [ ] Implement response generator
- [ ] Add memory retrieval node
- [ ] Add dice rolling node

### Work Unit 6.3 - Message Handling Migration (✅ COMPLETED)
- [x] Message adapter (custom ↔ LangChain format)
- [x] Supabase checkpoint persistence
- [x] DMService integration layer
- [x] React hook (useDMService)
- [x] Compatibility layer for gradual migration
- [x] Database migration (agent_checkpoints table)
- [x] Unit tests for message adapter
- [x] Migration guide documentation
- [x] Feature comparison analysis
- [x] Example component migration

### Work Unit 6.4 - Graph Implementation (Next)
- [ ] Implement actual DM graph nodes
- [ ] Integrate with existing agents
- [ ] Replace placeholder responses
- [ ] Performance testing
- [ ] Production deployment

## Comparison: Custom vs LangGraph

| Feature | Custom System | LangGraph |
|---------|---------------|-----------|
| Files | 300+ files | ~10 files |
| Complexity | High | Medium |
| State Management | Manual (IndexedDB) | Built-in |
| Debugging | Custom logs | LangSmith tracing |
| Error Handling | Manual | Built-in retry |
| Message Queue | Custom queue | Not needed |
| Offline Support | Custom sync | Checkpoints |
| Testing | Complex mocking | Simple graph tests |
| Maintenance | High effort | Low effort |

## Testing

### Graph Compilation Test

```typescript
import { dmGraph } from './dm-graph';

// Verify graph compiles
expect(dmGraph).toBeDefined();
```

### Node Execution Test

```typescript
import { detectIntent } from './nodes/intent-detector';

const state = createInitialState("I attack", worldContext);
const result = await detectIntent(state);

expect(result.playerIntent).toBeDefined();
```

## Next Steps

1. Implement actual node logic in Work Unit 6.2
2. Add memory retrieval and dice rolling nodes
3. Integrate with existing DungeonMasterAgent
4. Performance testing and optimization
5. Remove custom messaging system in Work Unit 6.4

## Resources

- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)
- [LangSmith Tracing](https://smith.langchain.com/)
- [State Management Guide](https://langchain-ai.github.io/langgraphjs/concepts/low_level/#state)
- [Checkpointing Guide](https://langchain-ai.github.io/langgraphjs/concepts/persistence/)
