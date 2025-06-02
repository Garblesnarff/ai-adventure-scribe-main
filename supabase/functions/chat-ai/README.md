# Chat AI Edge Function

## Purpose

This Supabase Edge Function is responsible for handling real-time chat interactions that may not be part of the core Dungeon Master narrative generation. It's designed to provide conversational AI capabilities, potentially for direct player-to-DM non-gameplay queries, out-of-character discussions, or specific chat features.

## Structure and Important Files

- **`index.ts`**: The main Deno server entry point for this Edge Function. It handles incoming HTTP requests.
- **`ai-handler.ts`**: Contains the core logic for interacting with the chosen Large Language Model (LLM), currently Google Gemini. This includes formatting the request to the LLM and processing its response.
- **`memory-utils.ts`**: Provides utility functions for fetching, scoring, and formatting relevant memories to be included as context in the LLM prompt. This helps the chat AI maintain conversational context.
- **`memory-selection.ts`**: (If present, or logic within `memory-utils.ts`) Contains specific algorithms or strategies for selecting the most relevant memories for the current chat turn.
- **`types.ts`**: Defines TypeScript types and interfaces specific to the inputs (e.g., chat history, session ID) and outputs (e.g., AI-generated message) of this function.

## How Components Interact

- The frontend client invokes this Edge Function via `supabase.functions.invoke('chat-ai', { body: payload })`.
- `index.ts` receives the request, extracts the chat messages and session ID.
- It uses `memory-utils.ts` to fetch and prepare relevant memories associated with the session.
- The chat history and memory context are passed to `ai-handler.ts`.
- `ai-handler.ts` formats this information into a prompt suitable for Google Gemini (or the configured LLM) and makes the API call.
- The LLM's response is returned to `index.ts`, which then sends it back to the client.
- Memory importance might be updated based on the AI's response using `memory-utils.ts`.

## Usage Example (Client-side invocation)

```typescript
// Conceptual example:
import { supabase } from '@/integrations/supabase/client';

async function sendChatMessage(messages: ChatMessage[], sessionId: string) {
  const { data, error } = await supabase.functions.invoke('chat-ai', {
    body: { messages, sessionId }
  });

  if (error) {
    console.error("Error sending chat message:", error);
    return null;
  }
  // data would contain the AI's response, e.g., data.text
  return data;
}
```

## Notes

- This function is distinct from `dm-agent-execute` which handles core gameplay narrative. `chat-ai` is more for supplementary conversational AI.
- It leverages a memory system to provide contextually relevant responses.
- Ensure API keys (e.g., for Gemini) are securely managed via environment variables, likely accessed using the `get-secret` function or directly within the Deno environment.
- See the main `/supabase/functions/README.md` for the overall Edge Functions architecture.
