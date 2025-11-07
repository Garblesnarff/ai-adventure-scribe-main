# LangGraph Test Scenarios Quick Reference

## DMService Integration Tests

### Checkpoint & State Management
| Scenario | Test File | Description |
|----------|-----------|-------------|
| State Persistence | `dm-service.test.ts` | Verify state is saved between messages |
| Checkpoint Restoration | `dm-service.test.ts` | Restore previous conversation state |
| Service Restart Recovery | `dm-service.test.ts` | Load state after service restart |
| History Ordering | `dm-service.test.ts` | Maintain message order |
| History Clearing | `dm-service.test.ts` | Delete all session data |
| Session Isolation | `dm-service.test.ts` | Prevent cross-session contamination |

### Error Handling
| Scenario | Test File | Description |
|----------|-----------|-------------|
| Graph Execution Errors | `dm-service.test.ts` | Handle node failures gracefully |
| Checkpoint Load Failures | `dm-service.test.ts` | Recover from missing checkpoints |
| AI Service Fallback | `dm-service.test.ts` | Use fallback when AI unavailable |
| Empty Input Handling | `dm-service.test.ts` | Validate empty/missing input |
| Streaming Errors | `dm-service.test.ts` | Handle streaming failures |

### Execution Modes
| Scenario | Test File | Description |
|----------|-----------|-------------|
| Non-Streaming Execution | `dm-service.test.ts` | Standard request-response |
| Streaming with Callbacks | `dm-service.test.ts` | Real-time chunk delivery |
| Concurrent Sessions | `dm-service.test.ts` | Multiple parallel executions |
| Thread Consistency | `dm-service.test.ts` | Maintain thread ID format |

---

## Intent Detector Node Tests

### Intent Categories
| Intent Type | Test Coverage | Fallback Keywords |
|-------------|---------------|-------------------|
| Attack | AI + Fallback | attack, hit, strike, shoot, stab |
| Social | AI + Fallback | talk, say, speak, ask, persuade, deceive, intimidate |
| Exploration | AI + Fallback | search, look, investigate, examine, check |
| Spellcast | AI + Fallback | cast, spell |
| Movement | AI + Fallback | move, walk, run, go |
| Skill Check | AI + Fallback | check, attempt |

### Edge Cases
| Scenario | Description |
|----------|-------------|
| Multi-Action Input | "I draw my sword and attack" |
| Conditional Actions | "If guard refuses, I persuade" |
| Ambiguous Input | "I wait and see" |
| Malformed JSON | Handle invalid AI responses |
| Missing Intent Fields | Validate JSON structure |
| High/Low Confidence | Accept all confidence levels |

---

## Rules Validator Node Tests

### D&D 5E Rules Coverage
| Rule Type | Dice Roll | DC/AC | Test Coverage |
|-----------|-----------|-------|---------------|
| Attack Rolls | 1d20 | AC varies | ✅ Full |
| Skill Checks | 1d20 | DC 15 (default) | ✅ Full |
| Saving Throws | 1d20 | DC 15 (default) | ✅ Full |
| Simple Movement | None | N/A | ✅ Full |
| Social Interaction | Varies | Varies | ✅ Full |

### Skill Check Detection
| Skill | Keywords | Roll Required |
|-------|----------|---------------|
| Perception | "perception check" | Yes |
| Investigation | "investigation", "examine" | Yes |
| Stealth | "stealth" | Yes |
| Athletics | "athletics", "jump", "climb" | Yes |
| Persuasion | "persuade" | Yes |

### Invalid Actions
| Scenario | Expected Behavior |
|----------|-------------------|
| Attack While Prone | Suggest "Stand up first" |
| Dual Concentration | Suggest "Drop current spell" |
| Invalid Range | Suggest movement |

---

## Response Generator Node Tests

### Response Components
| Component | Required | Test Coverage |
|-----------|----------|---------------|
| Description | Yes | ✅ Full |
| Atmosphere | Yes | ✅ Full |
| NPCs | Optional | ✅ Full |
| Available Actions | Optional | ✅ Full |
| Consequences | Optional | ✅ Full |

### Scenario Types
| Scenario | Atmosphere | NPCs | Actions Example |
|----------|-----------|------|-----------------|
| Combat | Intense/Tense | Enemies | Attack, Defend, Cast Spell, Run |
| Social | Friendly/Cautious | NPCs | Continue talking, Make offer, Leave |
| Exploration | Mysterious | Rare | Search, Examine, Move on |
| Movement | Neutral | None | Continue, Stop, Turn back |

### Context Integration
| Context Source | Usage in Response |
|----------------|-------------------|
| Player Intent | Acknowledges action type |
| Rules Validation | Explains validity/constraints |
| Dice Roll Request | Prompts for roll |
| Recent Memories | References past events |
| World Context | Sets scene location |

---

## Integration Test Scenarios

### Complete Graph Flows
| Player Action | Intent | Validation | Dice? | Response |
|--------------|--------|------------|-------|----------|
| "I attack goblin" | Attack | Valid | Yes (1d20) | Combat narrative |
| "I persuade guard" | Social | Valid | Maybe | Dialogue response |
| "I search room" | Exploration | Valid | Maybe (DC 15) | Discovery narrative |
| "I walk forward" | Movement | Valid | No | Simple movement |
| "I cast Fireball" | Spellcast | Valid | Yes (Save DC) | Spell result |

### Error Propagation
| Error Source | Graph Behavior | User Experience |
|-------------|----------------|-----------------|
| Intent Detection Fails | Route to error handler | Fallback intent used |
| Validation Throws | Fallback validation | Basic rules applied |
| Response Generation Fails | Error response | Apologetic message |

### Conditional Routing
| Condition | Route Taken |
|-----------|-------------|
| Intent detection succeeds | → validate_rules |
| Intent detection fails | → end_with_error |
| Validation requires dice | → request_dice_roll |
| Validation no dice | → generate_response |
| Invalid action | → generate_response (explains why) |

### Streaming Behavior
| Stream Event | Contains |
|--------------|----------|
| Intent Update | Detected intent |
| Validation Update | Rules check result |
| Response Update | Partial narrative |
| Final Update | Complete response |

---

## Test Execution Examples

### Run All Tests
```bash
npx vitest run src/agents/langgraph/__tests__/**/*.test.ts
```

### Run Specific Category
```bash
# DMService tests only
npx vitest run src/agents/langgraph/__tests__/dm-service.test.ts

# Node tests only  
npx vitest run src/agents/langgraph/nodes/__tests__/**/*.test.ts

# Integration tests only
npx vitest run src/agents/langgraph/__tests__/dm-graph.integration.test.ts
```

### Run Individual Test
```bash
npx vitest run -t "should detect attack intent"
npx vitest run -t "should require dice roll for attack"
npx vitest run -t "should execute full graph"
```

### Watch Mode
```bash
npx vitest watch src/agents/langgraph/__tests__/**/*.test.ts
```

---

## Mock Response Templates

### Intent Detection Mock
```typescript
{
  type: "attack" | "social" | "exploration" | "spellcast" | "movement",
  confidence: 0.0-1.0,
  details: {
    target: "what/who",
    action: "specific action",
    skill: "relevant skill"
  }
}
```

### Rules Validation Mock
```typescript
{
  isValid: true | false,
  reasoning: "explanation",
  needsRoll: true | false,
  rollType: "attack" | "save" | "check",
  rollFormula: "1d20+modifier",
  dc: number | null,
  modifications: ["suggestions"],
  warnings: ["rule warnings"]
}
```

### Response Generation Mock
```typescript
{
  description: "2-3 paragraph narrative",
  atmosphere: "emotional tone",
  npcs: [{ name: "NPC", dialogue: "what they say" }],
  availableActions: ["action1", "action2", "action3"],
  consequences: ["result1", "result2"]
}
```

---

## Common Test Patterns

### Setup Pattern
```typescript
beforeEach(() => {
  mockWorldContext = {
    campaignId: 'test-campaign',
    sessionId: 'test-session',
    characterIds: ['test-char'],
    location: 'Test Location'
  };
});
```

### Cleanup Pattern
```typescript
afterEach(async () => {
  await dmService.clearHistory(sessionId);
});
```

### Mock Verification
```typescript
expect(mockGeminiCallCount).toBeGreaterThan(0);
expect(mockGeminiResponses).toContain('expected value');
```

### Error Assertion
```typescript
expect(result.error).toBeDefined();
expect(result.error).toContain('specific error message');
```

### State Verification
```typescript
expect(result.playerIntent).toBe('attack');
expect(result.rulesValidation.isValid).toBe(true);
expect(result.requiresDiceRoll).toBeDefined();
expect(result.response.description).toBeTruthy();
```

---

## Test Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Could not find table" | DB not configured | Mock checkpointer |
| "Streaming completed without state" | Mock incomplete | Add final state to stream |
| "Expected X to be Y" | Assertion too strict | Relax assertion or improve mock |
| Empty history arrays | Checkpoints not persisting | Verify mock storage |

### Debug Tips

```typescript
// Log mock calls
console.log('Mock calls:', mockGeminiCallCount);
console.log('Responses:', mockGeminiResponses);

// Log state transitions
console.log('State:', JSON.stringify(result, null, 2));

// Verify metadata
expect(result.metadata?.stepCount).toBeGreaterThan(0);
```
