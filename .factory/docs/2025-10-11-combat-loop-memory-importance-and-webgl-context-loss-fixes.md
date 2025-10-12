# Implementation Plan: Combat Loop, Memory Importance Range, and WebGL Context Loss

## Overview
This plan addresses three critical issues identified in the codebase:
1. **Redundant AI calls during combat** - Multiple Gemini API calls triggered by combat detection
2. **Memory importance scores exceeding 1-5 range** - Values 1-10 being saved causing warnings
3. **WebGL context loss in 3D dice renderer** - Missing context loss handlers in DiceRollEmbed

## Implementation Strategy

### Phase 1: Memory Importance Normalization (1h)
**File: `src/utils/memory/classification.ts`**
- Add normalization logic to convert 1-10 scores to 1-5 range
- Implement `Math.min(5, Math.max(1, Math.round(raw / 2)))` 
- Update docstring to clarify expected ranges

### Phase 2: WebGL Context Loss Recovery (1-2h)  
**File: `src/components/DiceRollEmbed.tsx`**
- Add context loss event handlers with state management
- Implement fallback UI component for context loss scenarios
- Use Canvas key-based remount strategy for recovery
- Provide user-friendly messaging during restoration

### Phase 3: AI Call Deduplication (3-4h)
**File: `src/services/ai-service.ts`**
- Implement in-flight call deduplication with 2s TTL
- Add `inFlight` Map with unique key generation
- Cache identical requests to prevent duplicate API calls

**File: `src/hooks/use-ai-response.ts`**
- Add message signature deduplication using ref tracking
- Implement idempotent phase transitions from `gameState.isInCombat` to `gameState.currentPhase !== 'combat'`

**File: `src/hooks/use-combat-ai-integration.ts`**
- Add `isStartingCombatRef` guard flag to prevent duplicate combat starts
- Implement stateful blocking for concurrent combat detection

### Phase 4: Combat Narration Throttling (1-2h)
**File: `src/services/ai-execution/LocalFallbackStrategy.ts`**
- Add environment variable `VITE_ENABLE_COMBAT_DM_NARRATION` (default false)
- Implement per-session cooldown (5s) for combat narration
- Return lightweight stub重复调用时避免重复AI调用

**File: `src/hooks/use-combat-ai-integration.ts`**
- Limit narration to `ROUND_START` events only
- Implement throttling logic to prevent excessive AI calls

### Phase 5: Testing & Validation (2h)
- Unit tests for importance score normalization
- Manual testing for WebGL context recovery
- Integration tests for combat flow deduplication
- E2E verification of single Gemini call per message

## Technical Controls

### Feature Flags
- `VITE_ENABLE_COMBAT_DM_NARRATION=false` (DEV default)
- Debug logging for dedupe cache hits/misses

### Risk Mitigation
- 2s TTL prevents over-deduplication of rapid messages
- Separate commits enable selective rollback
- Context loss handlers are minimally invasive

### Acceptance Criteria
- ✅ Single Gemini call per player message during combat
- ✅ No importance score >5 warnings for 48h
- ✅ Dice 3D recovers gracefully from context loss
- ✅ Combat transitions occur exactly once per trigger

## Rollback Plan
Each work unit in separate commit allows targeted rollback. Feature flag provides immediate disable for combat narration if issues arise.

**Estimated Total: 8-11 hours**