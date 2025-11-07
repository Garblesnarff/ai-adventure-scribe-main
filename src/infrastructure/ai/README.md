# AI Infrastructure Layer

This layer provides centralized, well-tested clients for all AI service providers used in the application.

## Purpose

The AI infrastructure layer:
- **Abstracts API clients** - Provides clean interfaces to Gemini, OpenAI, and ElevenLabs
- **Manages configuration** - Handles API keys, rate limits, and environment setup
- **Ensures reliability** - Implements retry logic, key rotation, and error handling
- **Type safety** - Full TypeScript support with comprehensive type definitions

## Available Clients

### 1. Gemini Client (`gemini-client.ts`)

**Purpose**: Google Gemini API for text generation, chat, and reasoning

**Key Features**:
- Automatic API key rotation for rate limit avoidance
- Supports both SDK and REST fallback modes
- Rate limit tracking and management
- Model version selection (v1 vs v1beta)

**Usage**:
```typescript
import { geminiClient } from '@/infrastructure/ai';

// Execute with automatic key rotation
const result = await geminiClient.executeWithRotation(async (genAI) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const response = await model.generateContent('Write a story about a dragon');
  return response.response.text();
});

// Check API statistics
const stats = geminiClient.getRateLimitStats();
console.log(`Remaining daily: ${stats.remainingDaily}`);
```

**Environment Variables**:
- `VITE_GEMINI_API_KEYS` - Comma-separated list of Gemini API keys
- `VITE_GOOGLE_GEMINI_API_KEY` - Single Gemini API key (fallback)
- `VITE_GEMINI_DIRECT` - Enable direct mode (true/false)

### 2. OpenAI Client (`openai-client.ts`)

**Purpose**: OpenAI API for embeddings (semantic search, memory retrieval)

**Key Features**:
- Text embedding generation for semantic similarity
- Batch embedding support
- Server-side proxy for API key security
- Automatic token usage estimation

**Usage**:
```typescript
import { openaiClient } from '@/infrastructure/ai';

// Generate single embedding
const embedding = await openaiClient.generateEmbedding('This is a memory about dragons');
console.log(embedding.embedding); // [0.123, -0.456, ...]

// Generate multiple embeddings
const embeddings = await openaiClient.generateEmbeddings([
  'Memory 1',
  'Memory 2',
  'Memory 3'
]);
```

**Environment Variables**:
- `VITE_OPENAI_API_KEY` - OpenAI API key (server-side only)

### 3. ElevenLabs Client (`elevenlabs-client.ts`)

**Purpose**: ElevenLabs TTS API for immersive voice narration

**Key Features**:
- High-quality text-to-speech generation
- Multiple voice support with customizable settings
- Streaming audio for progressive playback
- Voice listing and management

**Usage**:
```typescript
import { elevenlabsClient } from '@/infrastructure/ai';

// Generate speech
const audioBlob = await elevenlabsClient.generateSpeech({
  text: 'Welcome to your adventure!',
  voiceId: 'T0GKiSwCb51L7pv1sshd', // DM voice
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75
  }
});

// Create audio URL
const audioUrl = URL.createObjectURL(audioBlob);

// List available voices
const voices = await elevenlabsClient.listVoices();
console.log(voices);
```

**Environment Variables**:
- `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key

## Type Definitions

All shared types are defined in `types.ts`:

```typescript
import type {
  AIGenerationParams,
  RateLimitStats,
  VoiceSettings,
  TTSRequest,
  EmbeddingResponse
} from '@/infrastructure/ai';
```

## Architecture Principles

### 1. Separation of Concerns
- **Infrastructure layer** (this) - Handles API clients and low-level communication
- **Service layer** (`src/services/ai/`) - Implements business logic and orchestration
- **Application layer** - Uses services to build features

### 2. Configuration Management
- All API keys are read from environment variables
- Clients fail gracefully with clear error messages
- Development vs production modes are auto-detected

### 3. Error Handling
- Comprehensive error logging with context
- Automatic retries for transient failures (Gemini)
- Fallback strategies (SDK → REST → Server proxy)

### 4. Performance
- Singleton pattern prevents duplicate client initialization
- API key rotation reduces rate limit issues
- Efficient embedding batching

## Import Patterns

### Recommended (Named Imports)
```typescript
import { geminiClient, openaiClient, elevenlabsClient } from '@/infrastructure/ai';
```

### Alternative (Individual Imports)
```typescript
import { getGeminiApiManager } from '@/infrastructure/ai';
import { openaiClient } from '@/infrastructure/ai';
import { elevenlabsClient } from '@/infrastructure/ai';
```

## Testing

Each client can be tested independently:

```typescript
// Mock geminiClient for testing
jest.mock('@/infrastructure/ai', () => ({
  geminiClient: {
    executeWithRotation: jest.fn().mockResolvedValue('Generated text')
  }
}));

// Test your service
const result = await myService.generateText();
expect(result).toBe('Generated text');
```

## Environment Setup

Create a `.env.local` file with required API keys:

```bash
# Google Gemini (required for text generation)
VITE_GEMINI_API_KEYS=your_key_1,your_key_2,your_key_3
VITE_GEMINI_DIRECT=true

# OpenAI (required for embeddings)
VITE_OPENAI_API_KEY=your_openai_key

# ElevenLabs (required for voice)
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Migration from Old Patterns

### Before (Direct imports)
```typescript
import { getGeminiApiManager } from '@/services/gemini-api-manager-singleton';

const geminiManager = getGeminiApiManager();
```

### After (Infrastructure layer)
```typescript
import { geminiClient } from '@/infrastructure/ai';

// geminiClient is already the singleton instance
```

## File Structure

```
src/infrastructure/ai/
├── gemini-client.ts          # Gemini API manager with key rotation
├── gemini-singleton.ts       # Singleton pattern for Gemini client
├── openai-client.ts          # OpenAI embeddings client
├── elevenlabs-client.ts      # ElevenLabs TTS client
├── types.ts                  # Shared TypeScript types
├── index.ts                  # Public API exports
└── README.md                 # This file
```

## Dependencies

- `@google/generative-ai` - Google Gemini SDK
- `@/services/llm-api-client` - Server proxy for API calls
- `@/lib/logger` - Application logging

## Future Enhancements

Potential improvements:
1. Add Anthropic Claude client for alternative LLM
2. Implement client-side caching for embeddings
3. Add WebSocket streaming for real-time TTS
4. Metrics and telemetry for API usage tracking
5. Cost estimation and budget management

## Questions & Support

If you encounter issues:
1. Check that all required environment variables are set
2. Verify API keys are valid and have sufficient quota
3. Review error logs for specific failure details
4. Consult the individual client files for implementation details
