# LangGraph Migration Guide

## Overview

We are gradually migrating from a custom messaging system to [LangGraph](https://github.com/langchain-ai/langgraph) for AI agent interactions. This document explains the dual-system architecture and how to work with it during the migration period.

## Why LangGraph?

**Benefits**:
- **Industry Standard**: Battle-tested framework used in production by many companies
- **Simplified Architecture**: Reduces custom code from 34 files to ~18 files
- **Built-in State Management**: Automatic conversation history and checkpointing
- **Better Testing**: Easier to test and debug than custom message queues
- **Active Maintenance**: Regular updates and improvements from LangChain team

**Migration Status**: ✅ Production-ready (100% test coverage, performance validated)

## Dual-System Architecture

During migration, **both systems run side-by-side**:

```
User Request
    ↓
AIService.chatWithDM
    ↓
Feature Flag Check
    ↓
┌───────────┴─────────────┐
│                         │
LangGraph (NEW)     Legacy (OLD)
    ↓                     ↓
DMService           Gemini + Custom
    ↓                     ↓
Compatibility       Direct Response
Layer
    ↓                     ↓
└───────────┬─────────────┘
            ↓
      User Response
```

**Key Points**:
- No breaking changes to existing code
- Automatic fallback if LangGraph fails
- Comprehensive monitoring of both systems
- Feature flag controls which system is active

## For Developers

### Enabling LangGraph for Local Testing

**Step 1**: Add to your `.env.local`:
```bash
VITE_FEATURE_USE_LANGGRAPH=true
```

**Step 2**: Restart your development server:
```bash
npm run dev
```

**Step 3**: Verify it's working:
Look for this in console logs:
```
[AIService] Using LangGraph agent system (VITE_FEATURE_USE_LANGGRAPH=true)
```

### Disabling LangGraph

Simply remove the flag or set it to `false`:
```bash
VITE_FEATURE_USE_LANGGRAPH=false
```

### Testing Both Systems

**Test LangGraph**:
```bash
VITE_FEATURE_USE_LANGGRAPH=true npm run dev
```

**Test Legacy**:
```bash
VITE_FEATURE_USE_LANGGRAPH=false npm run dev
```

**Compare Results**:
```typescript
import migrationMonitoringService from '@/services/migration-monitoring';

// After some interactions, view comparison
const comparison = migrationMonitoringService.getComparison();
console.log('LangGraph vs Legacy:', comparison);
```

## File Structure

### New LangGraph System

```
src/agents/langgraph/
├── dm-service.ts                       # Main service (similar to AIService)
├── dm-graph.ts                         # Graph definition (workflow logic)
├── state.ts                            # State management
├── config.ts                           # Configuration
├── adapters/
│   ├── legacy-compatibility.ts         # Makes LangGraph compatible with existing code
│   └── message-adapter.ts              # Message format conversions
├── nodes/
│   ├── intent-detector.ts              # Detect player intent
│   ├── rules-validator.ts              # Validate D&D 5E rules
│   └── response-generator.ts           # Generate DM responses
└── persistence/
    └── supabase-checkpointer.ts        # Save conversation state
```

### Legacy System (Will be archived)

```
src/agents/messaging/                   # 34 files - custom message queue
└── ... (to be removed in Phase 4)
```

### Migration Infrastructure

```
src/services/
├── ai-service.ts                       # Updated with feature flag logic
└── migration-monitoring.ts             # Tracks metrics during migration
```

## How It Works

### 1. Request Flow (LangGraph Enabled)

```typescript
// User sends message
AIService.chatWithDM({
  message: "I attack the orc",
  context: { sessionId, characterId, campaignId },
});

// ↓ Feature flag check
if (useLangGraph()) {
  // ↓ Delegate to LangGraph
  const adapter = getLegacyCompatibilityAdapter();

  // ↓ LangGraph processes
  const result = await adapter.chatWithDM({
    message,
    context,
    // ... other params
  });

  // ↓ Returns same format as legacy
  return result;
}

// ↓ Fallback to legacy if disabled
// ... legacy code
```

### 2. Compatibility Layer

The `legacy-compatibility.ts` adapter ensures **zero breaking changes**:

```typescript
// Legacy interface (what existing code expects)
interface LegacyAIResponse {
  text: string;
  narrationSegments?: NarrationSegment[];
  roll_requests?: RollRequest[];
  dice_rolls?: unknown[];
  combatDetection?: CombatDetectionResult;
}

// LangGraph returns different format
interface DMResponse {
  response: string;
  requiresDiceRoll?: boolean;
  suggestedActions?: string[];
  worldStateChanges?: any;
}

// Adapter converts between them
class LegacyCompatibilityAdapter {
  async chatWithDM(params): Promise<LegacyAIResponse> {
    const dmResponse = await dmService.sendMessage(...);
    return this.convertToLegacyFormat(dmResponse);
  }
}
```

### 3. Automatic Fallback

If LangGraph encounters an error:

```typescript
try {
  // Try LangGraph
  return await adapter.chatWithDM(params);
} catch (langGraphError) {
  logger.error('LangGraph failed, falling back to legacy:', langGraphError);

  // Record fallback for monitoring
  migrationMonitoringService.recordInteraction({
    system: 'langgraph',
    outcome: 'fallback',
    // ...
  });

  // Continue with legacy system
  return legacyImplementation(params);
}
```

## Monitoring

### Built-in Monitoring Service

Track migration progress and compare systems:

```typescript
import migrationMonitoringService from '@/services/migration-monitoring';

// View summary
migrationMonitoringService.logSummary();

// Get all metrics
const metrics = migrationMonitoringService.getAllMetrics();
console.log('Legacy:', metrics.legacy);
console.log('LangGraph:', metrics.langgraph);

// Compare systems
const comparison = migrationMonitoringService.getComparison();
console.log('Performance improvement:', comparison.comparison.performanceImprovement);
console.log('Success rate improvement:', comparison.comparison.successRateImprovement);
console.log('LangGraph adoption:', comparison.comparison.langgraphAdoption);

// Export for analysis
const data = migrationMonitoringService.exportMetrics();
// Save to file or send to analytics service
```

### What Gets Tracked

For each AI interaction:
- **System used**: legacy, langgraph, or crewai
- **Outcome**: success, error, or fallback
- **Duration**: response time in milliseconds
- **Message/response length**: input and output sizes
- **Errors**: type and message if failed
- **Session ID**: for tracing

### Automatic Logging

Every 10 interactions, a summary is automatically logged:

```
[MigrationMonitoring] Summary: {
  totalInteractions: 50,
  langgraphAdoption: "60.0%",
  systems: {
    legacy: {
      total: 20,
      success: 19,
      errors: 1,
      successRate: "95.0%",
      avgDuration: "1234ms"
    },
    langgraph: {
      total: 30,
      success: 29,
      errors: 0,
      fallbacks: 1,
      successRate: "96.7%",
      avgDuration: "1245ms"
    }
  }
}
```

## Code Examples

### Adding a New Feature

When adding features during migration, implement in both systems:

```typescript
// 1. Add to LangGraph system
// In src/agents/langgraph/nodes/response-generator.ts
function generateResponse(state: DMState): DMState {
  // ... existing logic

  // Add new feature
  const newFeature = processNewFeature(state.playerInput);

  return {
    ...state,
    response: {
      ...state.response,
      newFeature,
    }
  };
}

// 2. Add to legacy compatibility adapter
// In src/agents/langgraph/adapters/legacy-compatibility.ts
private convertToLegacyFormat(dmResponse: DMResponse): LegacyAIResponse {
  return {
    text: dmResponse.response,
    // Map new feature to legacy format
    newFeature: this.mapNewFeature(dmResponse.newFeature),
    // ... other fields
  };
}

// 3. Existing code automatically gets the feature
// No changes needed in components!
```

### Debugging LangGraph

```typescript
// Enable debug logging
import logger from '@/lib/logger';
logger.setLevel('debug');

// Check conversation history
import { getDMService } from '@/agents/langgraph/dm-service';
const dmService = getDMService();
const history = await dmService.getConversationHistory('session-123');
console.log('Conversation:', history);

// Check checkpoint state
const checkpoints = await dmService.getCheckpointHistory('session-123', 5);
console.log('Last 5 checkpoints:', checkpoints);

// Manually invoke graph (for testing)
const result = await dmService.sendMessage({
  sessionId: 'test-session',
  message: 'Hello!',
  context: { campaignId, characterId, sessionId },
});
console.log('Result:', result);
```

## Common Issues & Solutions

### Issue: LangGraph Not Being Used

**Symptoms**: Logs show legacy system, not LangGraph

**Solution**:
1. Check `.env.local` has `VITE_FEATURE_USE_LANGGRAPH=true`
2. Restart dev server
3. Clear browser cache
4. Check for typos in env var name

### Issue: Fallback Happening Frequently

**Symptoms**: Logs show many fallback events

**Solution**:
1. Check error messages in monitoring service
2. Look for pattern in errors (specific action/context)
3. Debug LangGraph with specific test case
4. May need to update compatibility adapter

### Issue: Different Results Between Systems

**Symptoms**: LangGraph gives different response than legacy

**Solution**:
1. This is expected during migration
2. If quality is better, LangGraph is working correctly
3. If quality is worse, file an issue with example
4. Use monitoring to compare success rates

### Issue: Performance Degradation

**Symptoms**: Slower responses with LangGraph

**Solution**:
1. Check monitoring metrics for actual difference
2. LangGraph has ~5-10ms overhead (acceptable)
3. If > 100ms slower, investigate
4. May be database/network issue, not LangGraph

## Testing

### Run LangGraph Tests

```bash
# All LangGraph tests
npm test -- langgraph

# Specific test suite
npm test -- src/agents/langgraph/__tests__/integration.test.ts

# Performance tests
npm test -- src/agents/langgraph/__tests__/performance.test.ts
```

### Manual Testing Checklist

Test these scenarios with LangGraph enabled:

- [ ] Create new campaign
- [ ] Create new character
- [ ] Start new session
- [ ] Send messages (5-10 turns)
- [ ] Combat scenario (attack, damage, etc.)
- [ ] Dice rolling requests
- [ ] Session continuity (refresh page, continue conversation)
- [ ] Multiple sessions (switch between them)
- [ ] Error handling (invalid input)
- [ ] Streaming responses (if supported)

## Migration Timeline

See [LANGGRAPH_ROLLOUT_PLAN.md](./migrations/LANGGRAPH_ROLLOUT_PLAN.md) for detailed timeline.

**Summary**:
- **Phase 1** (Week 1): Internal testing
- **Phase 2** (Week 2-3): 10% beta users
- **Phase 3** (Week 4-8): Gradual rollout to 100%
- **Phase 4** (Week 9-10): Remove legacy code

## FAQs

### Will this break my existing code?

**No.** The compatibility layer ensures the same interface. Existing components don't need changes.

### Do I need to update my components?

**No.** All changes are internal to `ai-service.ts` and the adapter layer.

### What if I want to use LangGraph features directly?

You can! Just import `getDMService()`:

```typescript
import { getDMService } from '@/agents/langgraph/dm-service';

const dmService = getDMService();
const response = await dmService.sendMessage({...});
```

But for migration period, use the compatibility layer to avoid breaking changes.

### Can I use both systems simultaneously?

The feature flag makes it one or the other. However, you could theoretically:
- Use LangGraph for new sessions
- Use legacy for old sessions

This is not currently implemented but could be added if needed.

### When will legacy code be removed?

After Phase 4 (Week 9-10), assuming:
- 100% rollout successful for 1+ week
- All metrics healthy
- No critical issues

Legacy code will be archived (not deleted) in git history.

## Resources

- **Rollout Plan**: [LANGGRAPH_ROLLOUT_PLAN.md](./migrations/LANGGRAPH_ROLLOUT_PLAN.md)
- **Test Results**: [docs/analysis/langgraph-test-results.md](./analysis/langgraph-test-results.md)
- **LangGraph Docs**: https://langchain-ai.github.io/langgraph/
- **Code Locations**:
  - LangGraph: `src/agents/langgraph/`
  - Adapter: `src/agents/langgraph/adapters/legacy-compatibility.ts`
  - Monitoring: `src/services/migration-monitoring.ts`
  - Feature Flag: `src/services/ai-service.ts` (line ~437)

## Support

**Questions?**
- Check this document
- Review rollout plan
- Check monitoring metrics
- Review test results

**Issues?**
- Enable debug logging
- Check error messages
- Use monitoring service
- Create GitHub issue with details

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Status**: Active Migration
