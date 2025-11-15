# Services

## Purpose
Core business logic services for the AI Dungeon Master application. This directory contains all major services for AI integration, character generation, campaign management, combat systems, and game mechanics.

## Key Files
- `ai-service.ts` - Main AI service coordinating all AI operations (DM responses, combat detection, memory management)
- `analytics.ts` - Analytics tracking and telemetry service
- `campaign-image-generator.ts` - AI-powered campaign image generation using Gemini
- `character-background-generator.ts` - Generates rich character backstories using AI
- `character-description-generator.ts` - Creates detailed character descriptions and narratives
- `character-image-generator.ts` - AI-powered character portrait generation
- `character-loader.ts` - Character data loading and caching service
- `characterSpellApi.ts` - API client for character spell management
- `enhancement-ai-generator.ts` - AI service for generating enhancement descriptions
- `enhancement-service.ts` - Service for managing character enhancements and upgrades
- `gallery-service.ts` - Asset gallery management
- `gemini-api-manager.ts` - Manages Gemini API connections, rate limiting, and failover
- `llm-api-client.ts` - Generic LLM API client abstraction
- `memory-manager.ts` - Game session memory management
- `model-usage-tracker.ts` - Tracks AI model usage for billing and analytics
- `openrouter-service.ts` - OpenRouter API integration for alternative LLM providers

## How It Works
The services directory follows a modular architecture where each service handles a specific domain:

**AI Services**: The `ai-service.ts` acts as the main coordinator, managing AI model selection, request deduplication, combat detection, and memory integration. It delegates to specialized services like `gemini-api-manager` for Google Gemini integration and `openrouter-service` for alternative providers.

**Character Services**: Character-related services (`character-loader`, `character-background-generator`, `character-description-generator`, `character-image-generator`) work together to provide comprehensive character creation and management. They utilize AI to generate rich, contextual content while maintaining consistency across the character's profile.

**Subdirectories**: More complex services are organized into subdirectories:
- `ai/` - AI integration utilities and shared components
- `combat/` - Combat system services
- `dice/` - Dice rolling mechanics
- `encounters/` - Encounter generation and management
- `prompts/` - AI prompt templates and management
- `world-builders/` - World building and campaign generation

## Usage Examples
```typescript
// Using the AI service to process player input
import { AIService } from '@/services/ai-service';

const response = await AIService.generateResponse(
  userMessage,
  sessionId,
  campaignId,
  characterId
);

// Generating a character background
import { generateCharacterBackground } from '@/services/character-background-generator';

const background = await generateCharacterBackground({
  race: 'Elf',
  class: 'Wizard',
  alignment: 'Chaotic Good',
  traits: ['curious', 'scholarly']
});

// Managing Gemini API
import { getGeminiApiManager } from '@/services/gemini-api-manager-singleton';

const manager = getGeminiApiManager();
const model = await manager.getModel();
```

## Dependencies
- **@google/generative-ai** - Gemini AI integration
- **Supabase** - Database and storage for session data
- **World Builder Services** - Campaign and world generation
- **Agent Services** - Coordination with AI agents

## Related Documentation
- [AI Services README](./ai/README.md)
- [Combat Services README](./combat/README.md)
- [Encounters README](./encounters/README.md)
- [Prompts README](./prompts/README.md)
- [Agent Services](../agents/services/README.md)

## Maintenance Notes
- Rate limiting is handled at the service level to prevent API quota issues
- Services use request deduplication to prevent duplicate AI calls
- AI model fallback is automatic (Gemini -> OpenRouter)
- Memory management is critical for maintaining session context
