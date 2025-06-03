# Memory Management Hooks

## Purpose

This directory contains custom React hooks dedicated to managing the game's memory system from the frontend. This includes creating new memories, retrieving existing memories, and potentially filtering or processing them for display or use by AI agents.

## Structure and Important Files

- **`useMemoryCreation.ts`**: A hook responsible for the logic of creating new memories. This likely involves:
    - Taking content (e.g., from player input or AI responses).
    - Processing the content (e.g., classifying its type, calculating importance, generating embeddings via an edge function like `generate-embedding`).
    - Saving the structured memory object to the `memories` table in Supabase.
    - It might expose functions like `createMemory` (for direct creation) and `extractMemories` (for processing text and then creating memories).
- **`useMemoryRetrieval.ts`**: A hook focused on fetching memories from the Supabase database for a given session. It likely uses `useQuery` (from `@tanstack/react-query`) to handle data fetching, caching, and state management for the list of memories.
- **`useMemoryFiltering.ts`**: (As seen in `src/components/game/memory/`) A hook that takes a list of memories and provides utilities or state for filtering them based on criteria like type, importance, or keywords. This is primarily for UI display purposes in the `MemoryPanel`.

*(The main `useMemories.ts` hook in the parent `src/hooks/` directory likely composes `useMemoryCreation.ts` and `useMemoryRetrieval.ts` to provide a unified API for memory operations to the rest of the application, particularly to `MemoryContext`.)*

## How Components Interact

- `MemoryContext` (from `src/contexts/`) likely uses the composed `useMemories` hook (which internally uses `useMemoryCreation` and `useMemoryRetrieval`) to provide memory data and functions to the application.
- Components like `MessageHandler.tsx` use `extractMemories` from `MemoryContext` to process player and AI messages and store them as memories.
- `MemoryPanel.tsx` (from `src/components/game/`) would use `MemoryContext` to get the list of memories (fetched by `useMemoryRetrieval`) and might use `useMemoryFiltering.ts` to allow the user to sort/filter these memories for display.
- The `useAIResponse.ts` hook also fetches memories directly (as seen previously) to provide context to the AI DM, ensuring the AI has access to relevant past events.

## Usage Example

```typescript
// Conceptual example within a component or another hook:
// This functionality is likely abstracted by MemoryContext

import { useMemoryCreation } from '@/hooks/memory/useMemoryCreation'; // Direct use is less common
import { useMemoryRetrieval } from '@/hooks/memory/useMemoryRetrieval'; // Direct use is less common

const MyGameComponent = ({ sessionId }) => {
  // Usually, you'd get these from useMemoryContext, which uses useMemories internally
  const { data: memories, isLoading } = useMemoryRetrieval(sessionId); 
  const { createMemory, extractMemories } = useMemoryCreation(sessionId);

  const handleNewEvent = async (eventText: string) => {
    // This would be called by something like MessageHandler
    await extractMemories(eventText); 
  };

  if (isLoading) return <p>Loading memories...</p>;

  return (
    <div>
      {/* Display memories or use them */}
    </div>
  );
};
```

## Notes

- These hooks are crucial for the game's ability to remember past events and for the AI to maintain narrative consistency.
- `useMemoryCreation.ts` often involves asynchronous operations like calling edge functions for embeddings.
- `useMemoryRetrieval.ts` ensures efficient data fetching and caching for memory display.
- See `src/hooks/README.md` (parent directory) and `src/contexts/MemoryContext.tsx`.
