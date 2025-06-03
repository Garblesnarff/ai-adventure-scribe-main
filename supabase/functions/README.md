# Supabase Edge Functions

## Purpose

This directory contains all the serverless Edge Functions deployed to Supabase for the AI Dungeon Master application. These functions handle backend logic, AI computations, interactions with external services (like LLMs), and database operations that are better suited for a server environment rather than the client-side.

## Structure and Important Subdirectories

Each subdirectory typically represents a distinct Edge Function with its own specific purpose:

- **`chat-ai/`**: Handles real-time chat interactions, possibly using an LLM for generating responses in a conversational context (distinct from core DM narrative).
- **`dm-agent-execute/`**: The core function for the AI Dungeon Master. It takes player actions and game context, interacts with the primary LLM (Google Gemini) to generate narrative, game state changes, and NPC responses.
- **`generate-campaign-description/`**: An AI-powered function to automatically generate compelling descriptions for new campaigns based on user inputs.
- **`generate-embedding/`**: Generates vector embeddings for text content (e.g., memories, dialogue) to support semantic search and similarity calculations, crucial for the memory system.
- **`get-secret/`**: A utility function to securely retrieve sensitive secrets (like API keys) from environment variables within the Supabase environment, making them available to other functions.
- **`rules-interpreter-execute/`**: (Likely) Executes logic related to interpreting and enforcing game rules, possibly interacting with an LLM or a predefined rules engine.
- **`text-to-speech/`**: Provides text-to-speech (TTS) functionality, converting text (e.g., AI DM narration) into audible speech.

Common files within each function's directory:
- **`index.ts`**: The main entry point for the Edge Function.
- **`handler.ts` or similar**: Contains the core logic of the function.
- **`types.ts`**: TypeScript definitions specific to that function's inputs and outputs.
- **`*.test.ts`**: Unit or integration tests for the function.

## How Functions Interact

- Frontend clients (React application) invoke these Edge Functions using the Supabase client library (`supabase.functions.invoke()`).
- Functions like `dm-agent-execute` and `chat-ai` make external API calls to LLMs (e.g., Google Gemini).
- `generate-embedding` might be called by other functions or services when new text content needs to be vectorized for memory storage.
- `get-secret` is often called by other functions at their initialization to fetch necessary API keys.
- These functions interact with the Supabase database to read game state, save progress, store memories, etc.

## Usage Example (Client-side invocation)

```typescript
// Conceptual example from the frontend client:
import { supabase } from '@/integrations/supabase/client';

async function getDMResponse(playerAction: string, currentContext: any) {
  const { data, error } = await supabase.functions.invoke('dm-agent-execute', {
    body: {
      task: { description: playerAction },
      agentContext: currentContext
    }
  });

  if (error) {
    console.error("Error calling dm-agent-execute:", error);
    return null;
  }
  return data;
}
```

## Notes

- Edge Functions are written in TypeScript and run in a Deno environment on Supabase.
- Each function is independently deployable and scalable.
- Ensure proper error handling and security (e.g., CORS headers, authentication checks) within each function.
- Refer to individual README.md files within each function's subdirectory for more detailed information.
- The `config.toml` file in this directory (and potentially in each function's folder) is used for Supabase function configuration.
