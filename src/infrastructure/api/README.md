# API Infrastructure Layer

This directory contains all API client configurations and provides a unified interface for backend communication.

## Overview

The API layer provides three types of clients:
- **tRPC Client**: Type-safe RPC calls with React Query integration
- **REST Client**: Traditional REST API client for LLM operations
- **CrewAI Client**: Python DM service client for structured D&D responses

## Directory Structure

```
src/infrastructure/api/
├── trpc-client.ts      # tRPC React client configuration
├── trpc-hooks.ts       # tRPC convenience hooks
├── trpc-provider.tsx   # tRPC + React Query provider component
├── trpc-types.ts       # tRPC AppRouter type definitions
├── rest-client.ts      # REST API client (LLM operations)
├── crewai-client.ts    # CrewAI Python service client
├── types.ts            # Centralized type exports
├── index.ts            # Public API exports
└── README.md           # This file
```

## Usage

### Importing from the API Layer

Always import from the top-level `@/infrastructure/api` module:

```typescript
import {
  trpc,
  TRPCProvider,
  llmApiClient,
  crewAIClient
} from '@/infrastructure/api';
```

### tRPC Usage

#### 1. Setup Provider

Wrap your app with the `TRPCProvider` (must be inside `AuthProvider`):

```tsx
import { TRPCProvider } from '@/infrastructure/api';

function App() {
  return (
    <AuthProvider>
      <TRPCProvider>
        <YourApp />
      </TRPCProvider>
    </AuthProvider>
  );
}
```

#### 2. Use tRPC Hooks in Components

```tsx
import { trpc } from '@/infrastructure/api';

function BlogList() {
  const { data, isLoading, error } = trpc.blog.getPosts.useQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.map(post => <li key={post.id}>{post.title}</li>)}
    </ul>
  );
}
```

#### 3. Use tRPC Mutations

```tsx
import { trpc } from '@/infrastructure/api';

function CreatePost() {
  const createPost = trpc.blog.createPost.useMutation();

  const handleSubmit = async (title: string, content: string) => {
    await createPost.mutateAsync({ title, content });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### 4. Cache Manipulation

```tsx
import { useTRPCUtils } from '@/infrastructure/api';

function RefreshButton() {
  const utils = useTRPCUtils();

  const handleRefresh = () => {
    // Invalidate cache to refetch
    utils.blog.getPosts.invalidate();
  };

  return <button onClick={handleRefresh}>Refresh</button>;
}
```

### REST Client Usage

The REST client provides authenticated API calls for LLM operations:

```typescript
import { llmApiClient } from '@/infrastructure/api';

// Generate text
const text = await llmApiClient.generateText({
  prompt: 'Write a story about dragons',
  model: 'gpt-4',
  maxTokens: 500,
  temperature: 0.7,
  provider: 'openrouter',
});

// Generate image
const imageUrl = await llmApiClient.generateImage({
  prompt: 'A majestic dragon',
  quality: 'high',
});

// Append image to message
await llmApiClient.appendMessageImage({
  messageId: 'msg_123',
  image: { url: imageUrl, prompt: 'A majestic dragon' },
});
```

### CrewAI Client Usage

The CrewAI client communicates with the Python DM service:

```typescript
import { crewAIClient } from '@/infrastructure/api';

const response = await crewAIClient.respond('session_123', {
  playerAction: 'I attack the goblin',
  character: characterData,
  context: campaignContext,
});

console.log(response.text); // DM narrative
console.log(response.roll_requests); // Dice rolls needed
console.log(response.narration_segments); // Voice segments
```

## Type Exports

All API-related types are available from the main export:

```typescript
import type {
  AppRouter,
  LLMHistoryMessage,
  GenerateTextParams,
  CrewAIRollRequest,
  CrewAIResponse,
} from '@/infrastructure/api';
```

## Features

### tRPC Features
- Type-safe API calls with full IntelliSense
- Automatic request batching for performance
- React Query integration (caching, refetching, optimistic updates)
- Automatic authentication header injection
- Error handling and retry logic

### REST Client Features
- Authenticated requests with Supabase tokens
- Automatic provider fallback (OpenRouter ↔ Gemini)
- Offline detection
- Image generation with reference image support

### CrewAI Client Features
- Timeout handling (30s default)
- Structured D&D responses
- Dice roll request parsing
- Voice narration segments

## Configuration

### Environment Variables

```bash
# tRPC API endpoint
VITE_TRPC_API_URL=/api/trpc

# REST API base URL
VITE_API_URL=http://localhost:8888

# LLM provider preference
VITE_LLM_PROVIDER=openrouter # or 'gemini'

# CrewAI service URL
VITE_CREWAI_BASE_URL=http://localhost:8000
```

## Best Practices

1. **Always import from top-level**: Use `@/infrastructure/api` not individual files
2. **Use tRPC for new endpoints**: Prefer type-safe tRPC over REST when possible
3. **Handle loading states**: Always check `isLoading` and `error` from queries
4. **Invalidate caches**: Use `utils.*.invalidate()` after mutations
5. **Type everything**: Leverage TypeScript for compile-time safety

## Migration Notes

This layer consolidates previously scattered API clients:
- `src/lib/trpc/*` → `src/infrastructure/api/trpc-*.ts`
- `src/services/llm-api-client.ts` → `src/infrastructure/api/rest-client.ts`
- `src/services/crewai/crewai-client.ts` → `src/infrastructure/api/crewai-client.ts`

After Phase C5, all imports will be updated to use `@/infrastructure/api`.
