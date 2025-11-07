# LangGraph Nodes

This directory contains the individual node implementations for the DM agent workflow graph.

## Overview

Each node is a pure function that takes the current graph state and returns a partial state update. Nodes are executed sequentially by the LangGraph orchestrator.

## Node Files

### intent-detector.ts (153 lines)

**Purpose:** Analyzes player input to determine their intent/action type.

**Input:**
- `state.playerInput` - The player's message

**Output:**
- `state.playerIntent` - Detected intent type (attack, social, exploration, etc.)

**Process:**
1. Uses Gemini AI to analyze player message
2. Parses JSON response with intent classification
3. Falls back to keyword detection if AI fails
4. Returns intent type with confidence score

**Intent Types:**
- `attack` - Combat actions
- `social` - Conversations, persuasion
- `exploration` - Searching, investigating
- `spellcast` - Casting spells
- `skill_check` - Using skills
- `movement` - Simple movement
- `other` - Miscellaneous actions

### rules-validator.ts (240 lines)

**Purpose:** Validates player actions against D&D 5E rules.

**Input:**
- `state.playerInput` - The player's message
- `state.playerIntent` - Detected intent type
- `state.worldContext` - Campaign/character context

**Output:**
- `state.rulesValidation` - Validation result with reasoning
- `state.requiresDiceRoll` - Dice roll request if needed

**Process:**
1. Determines if action requires dice roll based on intent
2. Uses Gemini AI to validate against D&D 5E rules
3. Generates dice roll request with formula and DC
4. Falls back to simple validation if AI fails

**Dice Roll Detection:**
- Attack actions → 1d20 attack roll
- Skill checks → 1d20 + modifier (DC 15 default)
- Saving throws → 1d20 + modifier
- Movement → No roll needed

### response-generator.ts (219 lines)

**Purpose:** Generates the final DM narrative response.

**Input:**
- `state.playerInput` - Original player message
- `state.playerIntent` - Detected intent
- `state.rulesValidation` - Validation results
- `state.requiresDiceRoll` - Dice roll status
- `state.worldContext` - Game context and memories

**Output:**
- `state.response` - Structured narrative response

**Process:**
1. Builds comprehensive prompt with all context
2. Uses Gemini AI to generate narrative
3. Parses JSON response with description, NPCs, actions
4. Falls back to plain text if parsing fails

**Response Structure:**
```typescript
{
  description: string;        // Main narrative (2-3 paragraphs)
  atmosphere: string;         // Environmental mood
  npcs: Array<{              // NPCs present
    name: string;
    dialogue?: string;
  }>;
  availableActions: string[]; // Next possible actions
  consequences: string[];     // Immediate results
}
```

## Integration with Existing Systems

### AI Services

All nodes use the existing AI service infrastructure:
- `@/services/ai/shared/utils` - Gemini manager with API key rotation
- `@/services/ai/shared/prompts` - Shared prompt templates
- `@/config/ai` - Model configuration

### Rules System

The rules validator integrates with:
- `@/domains/combat/` - Combat rules and dice rolling
- `@/agents/rules/services/` - Rule validation services

### Memory System

The response generator uses:
- `state.worldContext.recentMemories` - Previous events for context
- Future: `@/agents/services/memory/` - Enhanced memory manager

## Error Handling

All nodes include:
- Try-catch blocks for error isolation
- Fallback logic when AI fails
- Detailed error logging
- Graceful degradation (simple logic when AI unavailable)

## Testing

Test file: `__tests__/graph-integration.test.ts`

Tests cover:
- Intent detection for various action types
- Rules validation with dice rolls
- Response generation with context
- Error handling for edge cases
- Conditional logic flow

## Node Design Principles

1. **Pure Functions:** Nodes take state, return partial state update
2. **No Side Effects:** All I/O through state object
3. **Error Isolation:** Errors don't crash the graph
4. **Fallback Logic:** Continue even if AI unavailable
5. **Under 250 Lines:** Each file stays focused and maintainable

## Conditional Edges

The graph uses conditional logic between nodes:

```
detect_intent
  ├─ Error? → end_with_error
  └─ Success → validate_rules

validate_rules
  ├─ Error? → end_with_error
  ├─ Dice roll needed? → request_dice_roll (PAUSES)
  └─ No roll needed → generate_response

request_dice_roll (human-in-the-loop)
  └─ Always → generate_response

generate_response
  └─ Always → END

end_with_error
  └─ Always → END
```

## Human-in-the-Loop

The `request_dice_roll` node pauses execution:

1. Graph detects `state.requiresDiceRoll`
2. Execution pauses at `request_dice_roll` node
3. Frontend shows dice roller UI
4. User rolls dice
5. Result passed back to graph
6. Execution continues to `generate_response`

See `dm-graph.ts` for implementation details.

## Performance

Each node is optimized for speed:
- Intent detection: ~1-3 seconds (AI call)
- Rules validation: ~2-4 seconds (AI call + rules lookup)
- Response generation: ~3-5 seconds (AI call with context)

Total graph execution: **~6-12 seconds** for complete workflow

## Future Enhancements

- [ ] Add memory retrieval node (semantic search)
- [ ] Add combat state tracking node
- [ ] Add world generation node (NPCs, locations)
- [ ] Add multi-agent coordination (narrator, rules interpreter)
- [ ] Add caching for common intents
- [ ] Add batch processing for multiple players

## Related Files

- `../dm-graph.ts` - Graph definition and orchestration
- `../state.ts` - State type definitions
- `../config.ts` - Configuration and timeouts
- `../checkpointer.ts` - State persistence
- `../examples/basic-usage.ts` - Usage examples
