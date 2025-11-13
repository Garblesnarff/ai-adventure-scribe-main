# LangGraph Migration Plan: Resolving Dual Agent System Technical Debt

**Status**: Planning Phase
**Last Updated**: 2025-01-12
**Owner**: Engineering Team
**Priority**: High

## Executive Summary

This document outlines the complete migration strategy for replacing the legacy custom agent messaging system (300+ files) with LangGraph-based orchestration (~10 files). The migration eliminates technical debt, reduces code complexity by 95%, and provides production-grade state management with Supabase persistence.

### Current State
- **Work Unit 6.1**: ✅ Setup (Complete)
- **Work Unit 6.2**: ⚠️ Node Implementations (Partial - 3/5 nodes complete)
- **Work Unit 6.3**: ✅ Message Handling Migration (Complete)
- **Work Unit 6.4**: ❌ Agent Integration (Not Started)

### Critical Issues
1. **Code Duplication**: LangGraph nodes reimplement logic from existing `DungeonMasterAgent` and `RulesInterpreterAgent` classes
2. **Dual Systems**: Both legacy and LangGraph systems run in parallel, causing confusion
3. **Incomplete Nodes**: Missing memory retrieval and dice rolling nodes
4. **No Integration**: LangGraph doesn't call production-tested agent logic

---

## Phase 1: Complete Work Unit 6.2 (Missing Nodes)

**Timeline**: 2-3 days
**Risk**: Low

### 1.1 Memory Retrieval Node

**File**: `src/agents/langgraph/nodes/memory-retrieval.ts`

**Purpose**: Retrieve relevant memories before response generation

**Integration Point**: Call `EnhancedMemoryManager` from existing agent system

```typescript
import { EnhancedMemoryManager } from '../../services/memory/EnhancedMemoryManager';
import type { DMState, MemoryEntry } from '../state';

export async function retrieveMemories(state: DMState): Promise<Partial<DMState>> {
  const { worldContext, playerInput } = state;

  // Use existing production-tested memory manager
  const memoryManager = new EnhancedMemoryManager(worldContext.sessionId);

  const recentMemories = await memoryManager.retrieveMemories({
    query: playerInput,
    timeframe: 'recent',
    limit: 10,
    types: ['action', 'dialogue', 'description']
  });

  const relevantMemories = await memoryManager.retrieveMemories({
    query: playerInput,
    relevance: 'high',
    limit: 5
  });

  return {
    worldContext: {
      ...worldContext,
      recentMemories: [...recentMemories, ...relevantMemories]
    }
  };
}
```

**Success Criteria**:
- ✅ Retrieves top 10 recent memories
- ✅ Performs semantic search for query relevance
- ✅ Adds memories to `worldContext.recentMemories`
- ✅ Unit tests with 80%+ coverage

### 1.2 Dice Rolling Node

**File**: `src/agents/langgraph/nodes/dice-roller.ts`

**Purpose**: Execute dice rolls when required by rules validation

**Integration Point**: Use existing `@dice-roller/rpg-dice-roller` library

```typescript
import { DiceRoll } from '@dice-roller/rpg-dice-roller';
import type { DMState, DiceRollRequest, DiceRollResult } from '../state';

export async function rollDice(state: DMState): Promise<Partial<DMState>> {
  const { requiresDiceRoll } = state;

  if (!requiresDiceRoll) {
    return {}; // Skip if no roll needed
  }

  const { type, formula, dc, ac, advantage, disadvantage } = requiresDiceRoll;

  let rollFormula = formula || 'd20';

  // Apply advantage/disadvantage
  if (advantage && !disadvantage) {
    rollFormula = '2d20kh1'; // Keep highest
  } else if (disadvantage && !advantage) {
    rollFormula = '2d20kl1'; // Keep lowest
  }

  const roll = new DiceRoll(rollFormula);
  const total = roll.total;

  // Determine success based on type
  let success = false;
  if (type === 'check' || type === 'save') {
    success = dc ? total >= dc : false;
  } else if (type === 'attack') {
    success = ac ? total >= ac : false;
  }

  const result: DiceRollResult = {
    formula: rollFormula,
    total,
    rolls: roll.rolls,
    success,
    dc,
    ac,
    type
  };

  return {
    requiresDiceRoll: null, // Clear request
    metadata: {
      ...state.metadata,
      lastDiceRoll: result
    }
  };
}
```

**Success Criteria**:
- ✅ Executes standard D&D rolls (d20, 2d6, etc.)
- ✅ Handles advantage/disadvantage
- ✅ Compares vs DC/AC for success
- ✅ Stores result in metadata
- ✅ Unit tests with edge cases

### 1.3 Graph Integration

**File**: `src/agents/langgraph/dm-graph.ts`

**Update**: Add new nodes to graph flow

```typescript
import { retrieveMemories } from './nodes/memory-retrieval';
import { rollDice } from './nodes/dice-roller';

// Add to graph builder
builder
  .addNode('detect_intent', detectIntent)
  .addNode('retrieve_memories', retrieveMemories)  // NEW
  .addNode('validate_rules', validateRules)
  .addNode('roll_dice', rollDice)                 // NEW
  .addNode('generate_response', generateResponse)
  .addEdge('detect_intent', 'retrieve_memories')
  .addEdge('retrieve_memories', 'validate_rules')
  .addEdge('validate_rules', 'roll_dice')
  .addEdge('roll_dice', 'generate_response')
  .addEdge('generate_response', END);
```

**Testing**:
```bash
npx vitest run src/agents/langgraph/nodes/__tests__/memory-retrieval.test.ts
npx vitest run src/agents/langgraph/nodes/__tests__/dice-roller.test.ts
npx vitest run src/agents/langgraph/__tests__/dm-graph.test.ts
```

---

## Phase 2: Implement Work Unit 6.4 (Agent Integration)

**Timeline**: 4-5 days
**Risk**: Medium

### 2.1 Problem Analysis

**Current Issue**: Nodes reimplement logic instead of calling existing agent classes.

**Example** (response-generator.ts):
```typescript
// ❌ BAD: Reimplements DM logic
export async function generateResponse(state: DMState): Promise<Partial<DMState>> {
  const prompt = buildPromptFromScratch();
  const responseText = await geminiManager.executeWithRotation(/* ... */);
  return { response: parseNarrative(responseText) };
}
```

**Solution**: Create adapter layer to call `DungeonMasterAgent.executeTask()`

### 2.2 Agent Adapter Layer

**File**: `src/agents/langgraph/adapters/agent-adapter.ts`

**Purpose**: Bridge between LangGraph state and legacy agent interfaces

```typescript
import { DungeonMasterAgent } from '../../dungeon-master-agent';
import { RulesInterpreterAgent } from '../../rules-interpreter-agent';
import type { AgentTask } from '../../types';
import type { DMState } from '../state';

export class AgentAdapter {
  private dmAgent: DungeonMasterAgent;
  private rulesAgent: RulesInterpreterAgent;

  constructor() {
    this.dmAgent = new DungeonMasterAgent();
    this.rulesAgent = new RulesInterpreterAgent();
  }

  /**
   * Convert LangGraph DMState to AgentTask format
   */
  stateToTask(state: DMState): AgentTask {
    return {
      id: `task-${Date.now()}`,
      description: state.playerInput,
      priority: 1,
      createdAt: new Date(),
      context: {
        sessionId: state.worldContext.sessionId,
        campaignId: state.worldContext.campaignId,
        characterId: state.worldContext.characterIds[0],
        gameState: {
          location: {
            name: state.worldContext.location || 'Unknown',
            description: '',
            atmosphere: 'neutral',
            timeOfDay: 'day'
          },
          activeNPCs: [],
          sceneStatus: {
            currentAction: state.playerIntent?.type || 'unknown',
            availableActions: [],
            environmentalEffects: [],
            threatLevel: 'none'
          }
        },
        recentMemories: state.worldContext.recentMemories || [],
        playerIntent: state.playerIntent
      }
    };
  }

  /**
   * Call DungeonMasterAgent with state context
   */
  async executeDMTask(state: DMState) {
    const task = this.stateToTask(state);
    const result = await this.dmAgent.executeTask(task);

    if (!result.success) {
      throw new Error(result.message || 'DM agent task failed');
    }

    return result;
  }

  /**
   * Call RulesInterpreterAgent for validation
   */
  async executeRulesTask(state: DMState) {
    const task = this.stateToTask(state);
    task.context = {
      ...task.context,
      ruleType: state.playerIntent?.type || 'general'
    };

    const result = await this.rulesAgent.executeTask(task);
    return result;
  }
}

// Singleton instance
let adapterInstance: AgentAdapter | null = null;

export function getAgentAdapter(): AgentAdapter {
  if (!adapterInstance) {
    adapterInstance = new AgentAdapter();
  }
  return adapterInstance;
}
```

### 2.3 Refactor Nodes to Use Adapter

**File**: `src/agents/langgraph/nodes/response-generator.ts`

**Before**:
```typescript
export async function generateResponse(state: DMState): Promise<Partial<DMState>> {
  // 220 lines of reimplemented logic
  const prompt = RESPONSE_GENERATION_PROMPT.replace(/* ... */);
  const responseText = await geminiManager.executeWithRotation(/* ... */);
  return { response: parseNarrative(responseText) };
}
```

**After**:
```typescript
import { getAgentAdapter } from '../adapters/agent-adapter';

export async function generateResponse(state: DMState): Promise<Partial<DMState>> {
  const adapter = getAgentAdapter();

  try {
    // Call production-tested DM agent logic
    const result = await adapter.executeDMTask(state);

    if (!result.data?.narrativeResponse) {
      throw new Error('No narrative response from DM agent');
    }

    const { environment, characters, opportunities } = result.data.narrativeResponse;

    return {
      response: {
        description: environment.description,
        atmosphere: environment.atmosphere,
        npcs: characters.activeNPCs,
        dialogue: characters.dialogue,
        availableActions: opportunities.immediate,
        consequences: opportunities.consequences
      }
    };
  } catch (error) {
    logger.error('[ResponseGenerator] DM agent execution failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to generate response'
    };
  }
}
```

**Reduction**: 220 lines → 30 lines (86% reduction)

### 2.4 Refactor Rules Validator

**File**: `src/agents/langgraph/nodes/rules-validator.ts`

**After**:
```typescript
import { getAgentAdapter } from '../adapters/agent-adapter';

export async function validateRules(state: DMState): Promise<Partial<DMState>> {
  const adapter = getAgentAdapter();

  try {
    const result = await adapter.executeRulesTask(state);

    const validation = result.data?.ruleValidation || {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Extract dice roll requirements from validation
    const diceRollRequest = result.data?.requiresDiceRoll || null;

    return {
      rulesValidation: validation,
      requiresDiceRoll: diceRollRequest
    };
  } catch (error) {
    logger.error('[RulesValidator] Rules validation failed:', error);
    return {
      rulesValidation: {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: []
      }
    };
  }
}
```

**Reduction**: 241 lines → 35 lines (85% reduction)

### 2.5 Update dm-service.ts

**File**: `src/agents/langgraph/dm-service.ts`

**Remove placeholder** (lines 117-123):

```typescript
// BEFORE (Placeholder):
// For now, return a placeholder response until graph is implemented
// This will be replaced in Work Unit 6.4 with actual graph invocation
const response = await this.invokeGraph({
  messages: [...previousMessages, userMessage],
  worldContext: context,
  threadId,
  onStream,
});

// AFTER (Real implementation):
const response = await this.invokeGraph({
  messages: [...previousMessages, userMessage],
  worldContext: context,
  threadId,
  onStream,
});
// No changes needed - invokeGraph already calls the graph
```

**Success Criteria**:
- ✅ All nodes use AgentAdapter
- ✅ DungeonMasterAgent logic executed via adapter
- ✅ RulesInterpreterAgent logic executed via adapter
- ✅ No duplicate logic between nodes and agents
- ✅ Integration tests pass

---

## Phase 3: Component Migration

**Timeline**: 5-7 days
**Risk**: High

### 3.1 Migration Strategy

**Approach**: Gradual rollout with feature flags

**File**: `src/lib/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  USE_LANGGRAPH: import.meta.env.VITE_USE_LANGGRAPH === 'true',
  USE_LEGACY_AGENTS: import.meta.env.VITE_USE_LEGACY_AGENTS !== 'false',
  HYBRID_MODE: import.meta.env.VITE_HYBRID_MODE === 'true'
} as const;
```

**Environment Variables** (.env.local):
```bash
# Phase 3.1: Test LangGraph in dev only
VITE_USE_LANGGRAPH=true
VITE_USE_LEGACY_AGENTS=true
VITE_HYBRID_MODE=true

# Phase 3.2: LangGraph primary, legacy fallback
VITE_USE_LANGGRAPH=true
VITE_USE_LEGACY_AGENTS=true
VITE_HYBRID_MODE=false

# Phase 3.3: LangGraph only
VITE_USE_LANGGRAPH=true
VITE_USE_LEGACY_AGENTS=false
VITE_HYBRID_MODE=false
```

### 3.2 Component Updates

**File**: `src/hooks/use-ai-response.ts`

**Before** (uses legacy orchestrator):
```typescript
import { agentOrchestrator } from '@/services/crewai/agent-orchestrator';

export function useAIResponse() {
  const generateResponse = async (message: string) => {
    const result = await agentOrchestrator.generateResponse({
      message,
      context,
      conversationHistory,
      sessionState
    });
    return result;
  };

  return { generateResponse };
}
```

**After** (uses LangGraph with fallback):
```typescript
import { getDMService } from '@/agents/langgraph/dm-service';
import { agentOrchestrator } from '@/services/crewai/agent-orchestrator';
import { FEATURE_FLAGS } from '@/lib/feature-flags';

export function useAIResponse() {
  const generateResponse = async (message: string) => {
    // Use LangGraph if enabled
    if (FEATURE_FLAGS.USE_LANGGRAPH) {
      try {
        const dmService = getDMService();
        const result = await dmService.sendMessage({
          sessionId: context.sessionId,
          message,
          context: {
            campaignId: context.campaignId,
            characterId: context.characterId,
            sessionId: context.sessionId,
            campaignDetails: context.campaignDetails,
            characterDetails: context.characterDetails
          },
          conversationHistory
        });
        return result;
      } catch (error) {
        logger.error('[useAIResponse] LangGraph failed:', error);

        // Fallback to legacy if hybrid mode enabled
        if (FEATURE_FLAGS.HYBRID_MODE || FEATURE_FLAGS.USE_LEGACY_AGENTS) {
          logger.warn('[useAIResponse] Falling back to legacy orchestrator');
          return await agentOrchestrator.generateResponse({
            message,
            context,
            conversationHistory,
            sessionState
          });
        }

        throw error;
      }
    }

    // Use legacy system
    return await agentOrchestrator.generateResponse({
      message,
      context,
      conversationHistory,
      sessionState
    });
  };

  return { generateResponse };
}
```

### 3.3 Components to Migrate

**Priority Order**:

1. **High Priority** (Core gameplay):
   - `src/hooks/use-ai-response.ts` - Main AI interaction
   - `src/components/game/message-input.tsx` - Player input
   - `src/components/game/game-view.tsx` - Message display
   - `src/hooks/use-game-session.ts` - Session management

2. **Medium Priority** (Features):
   - `src/hooks/combat/use-combat-ai-integration.ts` - Combat narration
   - `src/components/spellcasting/spell-cast-form.tsx` - Spell validation
   - `src/hooks/use-memory-context.ts` - Memory retrieval

3. **Low Priority** (Utilities):
   - `src/services/ai-service.ts` - AI provider abstraction
   - `src/contexts/MessageContext.tsx` - Message state management

### 3.4 Testing Strategy

**Test Files**:
```bash
# Unit tests
src/agents/langgraph/__tests__/agent-adapter.test.ts
src/agents/langgraph/__tests__/dm-service.test.ts
src/agents/langgraph/nodes/__tests__/*.test.ts

# Integration tests
src/__tests__/integration/langgraph-migration.test.ts
src/__tests__/integration/agent-adapter.test.ts

# E2E tests
tests/e2e/langgraph-gameplay.spec.ts
```

**Test Scenarios**:
1. ✅ Player sends message → LangGraph processes → response generated
2. ✅ Dice roll required → roll executed → result incorporated
3. ✅ Memory retrieval → semantic search → context added
4. ✅ Rules validation → D&D 5E check → valid/invalid response
5. ✅ Fallback behavior → LangGraph fails → legacy system works
6. ✅ Conversation history → checkpoint loaded → context preserved

**Command**:
```bash
npm run test:integration
npx playwright test tests/e2e/langgraph-gameplay.spec.ts
```

---

## Phase 4: Legacy System Removal

**Timeline**: 3-4 days
**Risk**: Medium

### 4.1 Files to Remove

**Total**: ~300 files in legacy agent system

**Directories**:
- `src/agents/messaging/` - Custom messaging service (10 files)
- `src/agents/error/` - Error handling specific to legacy (8 files)
- `src/agents/offline/` - Offline queue management (5 files)
- `src/agents/crewai/` - CrewAI bridge (15 files)
- `src/services/crewai/` - CrewAI orchestration (6 files)

**Keep** (Production-tested logic):
- `src/agents/dungeon-master-agent.ts` - Core DM logic (called by adapter)
- `src/agents/rules-interpreter-agent.ts` - Rules validation (called by adapter)
- `src/agents/services/memory/` - Memory management
- `src/agents/services/response/` - Response coordination
- `src/agents/services/campaign/` - Campaign context

### 4.2 Removal Checklist

```bash
# Step 1: Verify LangGraph is primary in production
grep -r "VITE_USE_LANGGRAPH=true" .env.production
grep -r "VITE_USE_LEGACY_AGENTS=false" .env.production

# Step 2: Remove legacy messaging
rm -rf src/agents/messaging/
rm -rf src/agents/error/
rm -rf src/agents/offline/

# Step 3: Remove CrewAI bridge
rm -rf src/agents/crewai/
rm -rf src/services/crewai/

# Step 4: Update imports
find src -type f -name "*.ts" -o -name "*.tsx" | xargs grep -l "AgentMessagingService"
# Manually update remaining references

# Step 5: Remove feature flags
# Edit src/lib/feature-flags.ts to remove VITE_USE_LEGACY_AGENTS

# Step 6: Clean up package.json
npm uninstall crewai-client  # If exists
npm audit
```

### 4.3 Deprecation Warnings

**Add warnings before removal** (1 sprint earlier):

```typescript
// src/agents/messaging/agent-messaging-service.ts
export class AgentMessagingService {
  constructor() {
    logger.warn(
      '⚠️ DEPRECATED: AgentMessagingService is deprecated and will be removed in v2.0. ' +
      'Use LangGraph DMService instead. See MIGRATION_GUIDE.md'
    );
  }
}
```

---

## Phase 5: Optimization & Cleanup

**Timeline**: 2-3 days
**Risk**: Low

### 5.1 Performance Optimization

**Checkpointing**: Reduce database writes

```typescript
// src/agents/langgraph/persistence/supabase-checkpointer.ts

// Add batching to reduce write frequency
private writeBuffer: Map<string, Checkpoint> = new Map();
private flushTimer: NodeJS.Timeout | null = null;

async put(config: RunnableConfig, checkpoint: Checkpoint): Promise<void> {
  const threadId = config.configurable?.thread_id;

  // Buffer writes
  this.writeBuffer.set(threadId, checkpoint);

  // Debounce flush
  if (this.flushTimer) clearTimeout(this.flushTimer);
  this.flushTimer = setTimeout(() => this.flush(), 2000);
}

private async flush(): Promise<void> {
  const writes = Array.from(this.writeBuffer.entries());
  this.writeBuffer.clear();

  await Promise.all(
    writes.map(([threadId, checkpoint]) =>
      this.supabase.from('langgraph_checkpoints').upsert({
        thread_id: threadId,
        checkpoint_data: checkpoint,
        updated_at: new Date()
      })
    )
  );
}
```

### 5.2 Code Cleanup

**Remove dead code**:
```bash
# Find unused exports
npm run check-unused-exports

# Remove commented-out legacy code
find src/agents/langgraph -type f -name "*.ts" | xargs grep -l "// OLD:"
```

**Simplify adapters** if all nodes use them consistently.

### 5.3 Documentation Updates

**Files to Update**:
- `src/agents/langgraph/README.md` - Mark all work units complete
- `src/agents/langgraph/MIGRATION_GUIDE.md` - Add final migration date
- `src/agents/langgraph/ARCHITECTURE.md` - Update diagrams
- `AGENTS.md` - Update architecture section
- `CHANGELOG.md` - Document migration completion

---

## Rollback Strategy

### Immediate Rollback (< 1 hour)

**Trigger**: Critical production bug in LangGraph

**Steps**:
```bash
# 1. Flip feature flag in production
VITE_USE_LANGGRAPH=false
VITE_USE_LEGACY_AGENTS=true

# 2. Redeploy frontend
npm run build
# Deploy to hosting

# 3. Monitor error rates
# Check Sentry/logging dashboard
```

### Partial Rollback (< 4 hours)

**Trigger**: Specific component issues

**Steps**:
```bash
# 1. Enable hybrid mode
VITE_USE_LANGGRAPH=true
VITE_USE_LEGACY_AGENTS=true
VITE_HYBRID_MODE=true

# 2. Identify failing component
# Check error logs for specific hook/component

# 3. Revert component changes
git checkout main -- src/hooks/use-ai-response.ts

# 4. Redeploy
```

### Full Rollback (< 8 hours)

**Trigger**: Fundamental architecture issues

**Steps**:
```bash
# 1. Revert all Phase 3 changes
git revert <migration-commit-range>

# 2. Restore legacy system
git checkout main -- src/agents/messaging/
git checkout main -- src/services/crewai/

# 3. Full rebuild and test
npm run build
npm run test

# 4. Redeploy all services
```

---

## Success Metrics

### Code Quality

| Metric | Before | Target | Success Criteria |
|--------|--------|--------|------------------|
| Total Files | 300+ | ~50 | ✅ 85% reduction |
| Lines of Code | ~15,000 | ~3,000 | ✅ 80% reduction |
| Code Duplication | High | Low | ✅ DRY score > 90% |
| Test Coverage | 65% | 85% | ✅ All new code tested |

### Performance

| Metric | Before | Target | Success Criteria |
|--------|--------|--------|------------------|
| Response Time | 2-3s | 1.5-2s | ✅ 25% improvement |
| Memory Usage | ~150MB | ~80MB | ✅ 45% reduction |
| Database Writes | 10/turn | 3/turn | ✅ 70% reduction |

### Reliability

| Metric | Before | Target | Success Criteria |
|--------|--------|--------|------------------|
| Error Rate | 2% | < 0.5% | ✅ 75% reduction |
| Uptime | 99.5% | 99.9% | ✅ 4x improvement |
| Recovery Time | 15min | 5min | ✅ 3x faster |

### User Experience

| Metric | Before | Target | Success Criteria |
|--------|--------|--------|------------------|
| First Response | 3s | 1.5s | ✅ 50% faster |
| Conversation Load | 5s | 1s | ✅ 80% faster |
| Message Accuracy | 92% | 97% | ✅ 5pp improvement |

---

## Timeline Summary

| Phase | Duration | Dependencies | Risk |
|-------|----------|--------------|------|
| **Phase 1**: Complete Work Unit 6.2 | 2-3 days | None | Low |
| **Phase 2**: Implement Work Unit 6.4 | 4-5 days | Phase 1 | Medium |
| **Phase 3**: Component Migration | 5-7 days | Phase 2 | High |
| **Phase 4**: Legacy Removal | 3-4 days | Phase 3 | Medium |
| **Phase 5**: Optimization | 2-3 days | Phase 4 | Low |
| **Total** | **16-22 days** | | |

**Recommended Approach**: 3 sprints (2 weeks each)
- Sprint 1: Phases 1-2
- Sprint 2: Phase 3
- Sprint 3: Phases 4-5

---

## Testing Checklist

### Unit Tests
- [ ] Memory retrieval node (80%+ coverage)
- [ ] Dice rolling node (80%+ coverage)
- [ ] Agent adapter (90%+ coverage)
- [ ] All refactored nodes (80%+ coverage)

### Integration Tests
- [ ] Full graph execution end-to-end
- [ ] Adapter calls DungeonMasterAgent correctly
- [ ] Adapter calls RulesInterpreterAgent correctly
- [ ] Checkpoint persistence works
- [ ] Message history loads correctly

### E2E Tests
- [ ] Player sends message → receives response
- [ ] Dice roll triggered → executes → incorporated
- [ ] Memory retrieved → used in context
- [ ] Multi-turn conversation works
- [ ] Session persistence across reloads

### Regression Tests
- [ ] All existing gameplay features work
- [ ] Combat system functional
- [ ] Spell casting functional
- [ ] Character creation functional
- [ ] Campaign management functional

### Performance Tests
- [ ] Response time < 2s (p95)
- [ ] Memory usage < 100MB
- [ ] Database writes < 5/turn
- [ ] No memory leaks over 100 turns

---

## Risk Mitigation

### High Risk: Component Migration Breaks Production

**Mitigation**:
1. Feature flags allow instant rollback
2. Hybrid mode provides automatic fallback
3. Canary deployment to 10% of users first
4. Comprehensive E2E tests before rollout

**Monitoring**:
- Error rate alerts (> 1%)
- Response time alerts (> 3s)
- User complaint tracking

### Medium Risk: Adapter Performance Issues

**Mitigation**:
1. Load testing before production
2. Caching frequently accessed agent state
3. Async processing for non-critical paths

**Monitoring**:
- Agent execution time metrics
- Database query performance

### Low Risk: Incomplete Legacy Removal

**Mitigation**:
1. Automated dependency analysis
2. Grep for imports before deletion
3. Gradual removal over 2 sprints

---

## Next Steps

1. **Review this plan** with team
2. **Create Beads issues** for each phase
3. **Set up monitoring** for migration metrics
4. **Begin Phase 1** (memory + dice nodes)
5. **Schedule weekly syncs** for progress tracking

---

## Appendix A: File Mapping

### LangGraph Files (Keep & Enhance)
```
src/agents/langgraph/
├── dm-graph.ts                  # Main graph definition
├── dm-service.ts                # Service layer
├── state.ts                     # State types
├── adapters/
│   ├── agent-adapter.ts         # NEW - Bridge to legacy agents
│   └── message-adapter.ts       # Existing - Message conversion
├── nodes/
│   ├── intent-detector.ts       # Existing - Intent detection
│   ├── memory-retrieval.ts      # NEW - Memory node
│   ├── rules-validator.ts       # Refactor - Use adapter
│   ├── dice-roller.ts           # NEW - Dice rolling
│   └── response-generator.ts    # Refactor - Use adapter
└── persistence/
    └── supabase-checkpointer.ts # Existing - State persistence
```

### Legacy Files (Remove After Phase 4)
```
src/agents/messaging/            # DELETE - 10 files
src/agents/error/                # DELETE - 8 files
src/agents/offline/              # DELETE - 5 files
src/agents/crewai/               # DELETE - 15 files
src/services/crewai/             # DELETE - 6 files
```

### Core Agent Files (Keep - Called by Adapter)
```
src/agents/
├── dungeon-master-agent.ts      # KEEP - Core DM logic
├── rules-interpreter-agent.ts   # KEEP - Rules validation
└── services/
    ├── memory/                  # KEEP - Memory management
    ├── response/                # KEEP - Response coordination
    └── campaign/                # KEEP - Campaign context
```

---

## Appendix B: Beads Issue Templates

### Work Unit 6.2.1: Memory Retrieval Node
```bash
bash ./scripts/bd.sh create \
  "Implement memory retrieval node for LangGraph" \
  -p 0 \
  -t feature \
  --assignee engineering \
  -d "Create src/agents/langgraph/nodes/memory-retrieval.ts that calls EnhancedMemoryManager"
```

### Work Unit 6.2.2: Dice Rolling Node
```bash
bash ./scripts/bd.sh create \
  "Implement dice rolling node for LangGraph" \
  -p 0 \
  -t feature \
  --assignee engineering \
  -d "Create src/agents/langgraph/nodes/dice-roller.ts using @dice-roller/rpg-dice-roller"
```

### Work Unit 6.4.1: Agent Adapter
```bash
bash ./scripts/bd.sh create \
  "Create AgentAdapter to bridge LangGraph and legacy agents" \
  -p 0 \
  -t feature \
  --assignee engineering \
  -d "Build src/agents/langgraph/adapters/agent-adapter.ts to call DungeonMasterAgent and RulesInterpreterAgent"
```

### Work Unit 6.4.2: Refactor Nodes
```bash
bash ./scripts/bd.sh create \
  "Refactor LangGraph nodes to use AgentAdapter" \
  -p 0 \
  -t refactor \
  --assignee engineering \
  -d "Update response-generator.ts and rules-validator.ts to call agents instead of reimplementing logic"
```

---

**End of Migration Plan**
