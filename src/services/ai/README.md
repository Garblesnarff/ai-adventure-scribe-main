# AI Service Modules

**Refactored from:** `ai-service.ts` (1,142 lines → 9 focused modules)
**Objective:** Maintain single responsibility, improve maintainability, stay under 200 lines per file

## Architecture Overview

The AI service has been split into focused modules organized by functionality:

```
src/services/ai/
├── index.ts                          # Public API & backward compatibility (121 lines)
├── campaign-generator.ts             # Campaign description generation (66 lines)
├── narration-service.ts              # DM chat & coordination (199 lines)
├── narration-service-impl.ts         # Gemini response generation (198 lines)
├── opening-message-generator.ts      # Opening scene generation (146 lines)
├── conversation-service.ts           # Message persistence (90 lines)
├── api-manager.ts                    # API statistics & diagnostics (48 lines)
└── shared/
    ├── types.ts                      # TypeScript interfaces (72 lines)
    ├── prompts.ts                    # Prompt templates (186 lines)
    └── utils.ts                      # Shared utilities (179 lines)
```

## Module Responsibilities

### 1. `index.ts` - Public API
- Central export file for all modules
- Maintains backward compatibility with `AIService` class
- Allows both old syntax (`AIService.method()`) and new imports

**Exports:**
- Types: `ChatMessage`, `GameContext`, `AIResponse`, etc.
- Functions: `generateCampaignDescription`, `chatWithDM`, `saveChatMessage`, etc.
- Class: `AIService` (backward compatibility wrapper)

### 2. `campaign-generator.ts` - Campaign Generation
- Generates D&D campaign descriptions using AI
- Takes genre, difficulty, length, tone as parameters
- Returns engaging campaign hooks and world-building

**Key Function:**
```typescript
generateCampaignDescription(params: CampaignParams): Promise<string>
```

### 3. `narration-service.ts` - DM Chat Coordination
- Primary entry point for DM interactions
- Handles combat detection, memory retrieval, voice context
- Coordinates between CrewAI (if enabled) and Gemini fallback
- Post-processes responses (memory extraction, world building)

**Key Function:**
```typescript
chatWithDM(params: ChatParams): Promise<AIResponse>
```

### 4. `narration-service-impl.ts` - Gemini Response Generation
- Core Gemini API interaction logic
- Builds comprehensive prompts with context, rules, memories
- Handles structured JSON parsing for voice segments
- Processes voice assignments and post-response tasks

**Key Function:**
```typescript
generateGeminiResponse(...): Promise<AIResponse>
```

### 5. `opening-message-generator.ts` - Opening Scenes
- Creates immersive campaign opening messages
- Integrates character and campaign context
- Generates sensory-rich, engaging introductions with NPC interactions

**Key Function:**
```typescript
generateOpeningMessage(params: { context: GameContext }): Promise<string>
```

### 6. `conversation-service.ts` - Message Persistence
- Saves chat messages to Supabase `dialogue_history` table
- Retrieves conversation history for sessions
- Manages chronological ordering

**Key Functions:**
```typescript
saveChatMessage(params: {...}): Promise<void>
getConversationHistory(sessionId: string): Promise<ChatMessage[]>
```

### 7. `api-manager.ts` - API Diagnostics
- Provides Gemini API manager statistics
- Returns current key info, usage stats, rate limit data
- Useful for debugging and monitoring

**Key Function:**
```typescript
getApiStats(): ApiStats
```

### 8. `shared/types.ts` - Type Definitions
All TypeScript interfaces and types used across modules:
- `ChatMessage` - Conversation history structure
- `GameContext` - Campaign/character context
- `CampaignParams` - Campaign generation parameters
- `AIResponse` - AI response structure with optional features
- `NarrationSegment` - Multi-voice TTS segments
- `ClassEquipment` - D&D class equipment data

### 9. `shared/prompts.ts` - Prompt Templates
Centralized prompt building functions:
- `buildCampaignDescriptionPrompt()` - Campaign generation prompts
- `buildDMPersonaPrompt()` - DM rules and persona
- `buildGameContextPrompt()` - Character/campaign context
- `buildCombatContextPrompt()` - Combat detection context
- `buildResponseStructurePrompt()` - Response formatting rules
- `buildOpeningScenePrompt()` - Opening scene requirements

### 10. `shared/utils.ts` - Shared Utilities
Common functionality:
- `getGeminiManager()` - Access Gemini API manager singleton
- `useCrewAI()` - Check CrewAI feature flag
- `keyFor()` - Generate deduplication cache keys
- `getOrCreateDeduped()` - Request deduplication with TTL
- `getClassEquipment()` - D&D class default equipment
- `addEquipmentContext()` - Add equipment to prompts

## Usage Examples

### Old Usage (Backward Compatible)
```typescript
import { AIService } from '@/services/ai-service';

const description = await AIService.generateCampaignDescription({
  genre: 'Fantasy',
  difficulty: 'Medium',
  length: 'Long',
  tone: 'dark'
});

const response = await AIService.chatWithDM({
  message: 'I attack the goblin!',
  context: gameContext,
  conversationHistory: history
});
```

### New Usage (Preferred)
```typescript
import {
  generateCampaignDescription,
  chatWithDM,
  saveChatMessage,
  getConversationHistory
} from '@/services/ai';

// Generate campaign
const description = await generateCampaignDescription({
  genre: 'Fantasy',
  difficulty: 'Medium',
  length: 'Long',
  tone: 'dark'
});

// Chat with DM
const response = await chatWithDM({
  message: 'I investigate the room',
  context: { campaignId, characterId, sessionId },
  conversationHistory: history
});

// Save message
await saveChatMessage({
  sessionId: 'sess_123',
  role: 'user',
  content: 'Hello!',
  speakerId: 'char_456'
});

// Get history
const messages = await getConversationHistory('sess_123');
```

## Migration Guide

### Updating Imports

**Before:**
```typescript
import { AIService } from '@/services/ai-service';
import type { ChatMessage, GameContext } from '@/services/ai-service';
```

**After (Option 1 - Backward Compatible):**
```typescript
import { AIService } from '@/services/ai';
import type { ChatMessage, GameContext } from '@/services/ai';
```

**After (Option 2 - Preferred New Style):**
```typescript
import {
  generateCampaignDescription,
  chatWithDM,
  saveChatMessage,
  getConversationHistory,
  generateOpeningMessage,
  getApiStats
} from '@/services/ai';
import type { ChatMessage, GameContext, AIResponse } from '@/services/ai';
```

## Key Benefits

1. **Maintainability**: Each module has a single, clear responsibility
2. **Testability**: Smaller modules are easier to unit test
3. **Readability**: Files under 200 lines are easier to understand
4. **Reusability**: Shared utilities and types reduce duplication
5. **Backward Compatibility**: Existing code continues to work without changes
6. **Type Safety**: Full TypeScript support throughout

## Line Count Summary

| Module | Lines | Purpose |
|--------|-------|---------|
| `index.ts` | 121 | Public API & compatibility |
| `campaign-generator.ts` | 66 | Campaign descriptions |
| `narration-service.ts` | 199 | DM chat coordination |
| `narration-service-impl.ts` | 198 | Gemini response generation |
| `opening-message-generator.ts` | 146 | Opening scenes |
| `conversation-service.ts` | 90 | Message persistence |
| `api-manager.ts` | 48 | API diagnostics |
| `shared/types.ts` | 72 | Type definitions |
| `shared/prompts.ts` | 186 | Prompt templates |
| `shared/utils.ts` | 179 | Shared utilities |
| **Total** | **1,305** | Original: 1,142 lines |

*Note: Total is slightly higher due to module headers, JSDoc, and improved documentation*

## Dependencies

### External Dependencies
- `@google/generative-ai` - Gemini API client
- `@/integrations/supabase/client` - Database access
- `@/config/ai` - AI model configuration
- `@/lib/logger` - Logging utilities
- `@/utils/combatDetection` - Combat detection system

### Internal Service Dependencies
- `memory-manager` - Memory retrieval and extraction
- `world-builders/world-builder-service` - World expansion
- `voice-consistency-service` - Multi-voice TTS
- `session-state-service` - Session state management
- `crewai/agent-orchestrator` - CrewAI integration (optional)
- `gemini-api-manager` - API key rotation and rate limiting

## Testing

Each module can be tested independently:

```bash
# Test campaign generation
npm run test src/services/ai/campaign-generator.test.ts

# Test narration service
npm run test src/services/ai/narration-service.test.ts

# Test conversation service
npm run test src/services/ai/conversation-service.test.ts
```

## Future Enhancements

Potential areas for further improvement:
1. Add character generation module (currently not in ai-service.ts)
2. Add combat AI module for tactical decision-making
3. Extract voice context building to separate module
4. Create prompt versioning system for A/B testing
5. Add telemetry and performance monitoring
6. Implement prompt caching for frequently used templates

## Original File

The original `ai-service.ts` (1,142 lines) has been preserved and can be found at:
- **Location:** `/home/wonky/ai-adventure-scribe-main/src/services/ai-service.ts`
- **Status:** Should be deprecated after migration is complete
- **Replacement:** Use `@/services/ai` instead

## Questions?

For questions about this refactoring or to report issues:
1. Check function names match between old and new modules
2. Verify types are properly exported from `shared/types.ts`
3. Ensure imports use `@/services/ai` instead of `@/services/ai-service`
4. Review migration guide above for usage patterns
