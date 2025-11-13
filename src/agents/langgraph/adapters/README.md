# LangGraph Adapters

This directory contains adapter modules that bridge LangGraph nodes with existing production systems.

## Overview

The adapters eliminate code duplication by allowing LangGraph nodes to call existing, battle-tested agent implementations rather than reimplementing their logic. This ensures:

1. **Code Reuse**: Leverages existing DungeonMasterAgent and RulesInterpreterAgent classes
2. **Consistency**: Same logic across legacy and LangGraph systems during migration
3. **Maintainability**: Single source of truth for agent behavior
4. **Testing**: Relies on existing test suites instead of duplicating tests

## Files

### agent-adapter.ts

**Purpose**: Bridges LangGraph DMState with existing DungeonMasterAgent and RulesInterpreterAgent classes.

**Key Features**:
- Converts DMState → AgentTask format automatically
- Singleton pattern for efficient resource usage
- Comprehensive error handling and logging
- Type-safe conversions between state formats

**Main Methods**:
- `stateToTask(state)` - Converts DMState to AgentTask format
- `executeDMTask(state)` - Calls DungeonMasterAgent.executeTask()
- `executeRulesTask(state)` - Calls RulesInterpreterAgent.executeTask()
- `executeCustomDMTask(task)` - Execute with manual AgentTask
- `getDMAgent()` - Direct access for specialized methods

**Usage**:
```typescript
import { getAgentAdapter } from './adapters';

// In a LangGraph node
export async function dmNode(state: DMState): Promise<Partial<DMState>> {
  const adapter = getAgentAdapter();
  const result = await adapter.executeDMTask(state);

  return {
    response: result.data?.narrativeResponse,
    error: result.success ? null : result.message
  };
}
```

### message-adapter.ts

**Purpose**: Converts between AgentMessagingService format and LangChain BaseMessage format.

**Key Features**:
- Bidirectional message conversion
- Maintains compatibility during migration
- Preserves message metadata and timestamps

### messaging-compatibility.ts

**Purpose**: Maintains backward compatibility with legacy messaging system during migration.

**Key Features**:
- Bridges LangGraph and legacy agent communication
- Allows gradual migration without breaking existing code
- Provides legacy notification system

## Architecture Decisions

### Why Adapters?

The adapter pattern was chosen to enable a gradual migration from the custom messaging system to LangGraph without:
1. Duplicating agent logic across systems
2. Breaking existing functionality
3. Requiring a "big bang" migration

### State Conversion

The `stateToTask()` method handles several key transformations:

**DMState → AgentTask Mapping**:
- `state.playerInput` → `task.description`
- `state.worldContext` → `task.context.sessionId`, `campaignId`, etc.
- `state.playerIntent` → `task.context.playerIntent`
- `state.worldContext.recentMemories` → `task.context.recentMemories`

**Type Adaptations**:
- `WorldInfo.characterIds[]` → extracts first character as `characterId`
- `WorldInfo.activeNPCs[]` → converts to full NPC objects with IDs
- `playerIntent: string` → converts to `PlayerIntent` object structure
- Adds required `expectedOutput` field for AgentTask

### Error Handling

Different strategies for different agents:
- **DM Agent**: Throws errors (critical path, must succeed)
- **Rules Agent**: Returns error result (non-critical, can continue)

This aligns with the production behavior where DM responses are required but rules validation can be advisory.

## Implementation Notes

### Key Differences from Reference

The actual implementation differs from the migration plan reference in these ways:

1. **playerInput Field**: DMState.playerInput exists as `string | null` (not just in messages array)
2. **AgentTask.expectedOutput**: Required field, added to all task conversions
3. **playerIntent Type**: Changed from `PlayerIntent` object to `string | null` - converted in adapter
4. **WorldContext Structure**: Uses WorldInfo interface with actual field names
5. **Type Safety**: Full TypeScript types imported from actual source files

### Testing Considerations

Use `resetAgentAdapter()` in tests to ensure clean state:

```typescript
import { resetAgentAdapter, getAgentAdapter } from './adapters';

beforeEach(() => {
  resetAgentAdapter(); // Clean slate for each test
});

test('adapter converts state correctly', () => {
  const adapter = getAgentAdapter();
  // ... test logic
});
```

### Performance

The singleton pattern ensures:
- Single DungeonMasterAgent instance (reuses memory manager, response coordinator)
- Single RulesInterpreterAgent instance (reuses validation services)
- Minimal overhead for state conversion (simple object mapping)

## Integration Guide

### Step 1: Replace Direct LLM Calls

**Before** (direct LLM call):
```typescript
export async function dmNode(state: DMState): Promise<Partial<DMState>> {
  const llm = new ChatOpenAI({ modelName: 'gpt-4' });
  const prompt = buildPrompt(state);
  const response = await llm.invoke(prompt);
  // ... parse and format response
}
```

**After** (using adapter):
```typescript
export async function dmNode(state: DMState): Promise<Partial<DMState>> {
  const adapter = getAgentAdapter();
  const result = await adapter.executeDMTask(state);
  return { response: result.data?.narrativeResponse };
}
```

### Step 2: Replace Rules Logic

**Before** (custom validation):
```typescript
function validateAction(action: string): boolean {
  // Custom validation logic
  return action.includes('attack') || action.includes('cast');
}
```

**After** (using adapter):
```typescript
const adapter = getAgentAdapter();
const result = await adapter.executeRulesTask(state);
const validation = result.data?.validationResults;
```

### Step 3: Leverage Specialized Methods

For specialized agent methods not in executeTask flow:

```typescript
const adapter = getAgentAdapter();
const dmAgent = adapter.getDMAgent();

// Access specialized methods
const encounter = dmAgent.planEncounter(input);
await dmAgent.validatePlannedEncounter(spec);
await dmAgent.reportEncounterOutcome(sessionId, spec, resourcesUsed);
```

## Future Enhancements

Potential improvements for the adapter layer:

1. **Caching**: Cache state-to-task conversions for repeated calls
2. **Metrics**: Add performance tracking and metrics collection
3. **Validation**: Add DMState validation before conversion
4. **Batch Operations**: Support batch task execution
5. **Streaming**: Add streaming support for real-time responses

## Related Documentation

- [LangGraph Migration Guide](../MIGRATION_GUIDE.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Agent Types Reference](../../types.ts)
- [State Management](../state.ts)

## Questions?

For questions about the adapter implementation, see:
- Example usage in `agent-adapter.example.ts`
- Test patterns in node tests (`nodes/__tests__/`)
- Migration guide for integration steps
