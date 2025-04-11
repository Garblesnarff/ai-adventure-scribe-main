# React Hooks

This directory contains **custom React hooks** used throughout the AI Dungeon Master application to manage game state, audio, AI interactions, and UI behavior.

---

## **Purpose**

Provide **reusable, composable logic** for managing complex state and side effects, encapsulating functionality such as:

- Game session lifecycle
- Audio recording and playback
- AI response handling
- Character data management
- Memory management
- UI state (e.g., mobile detection, toast notifications)

---

## **Important Hooks**

- **`use-game-session.ts`**  
  Manages game session creation, expiration, cleanup, and summary generation.

- **`useAgentSystem.ts`**  
  Coordinates AI agent interactions and task execution.

- **`useAIResponse.ts`**  
  Handles AI response fetching and state.

- **`useAudioState.ts`**  
  Manages audio recording, playback, and state.

- **`useCharacterData.ts`**  
  Loads and manages character data.

- **`useCharacterSave.ts`**  
  Handles saving character data to storage or backend.

- **`useGameContext.ts`**  
  Provides access to global game context.

- **`useMemories.ts`**  
  Manages retrieval and storage of game memories.

- **`useMessageQueue.ts`**  
  Queues and manages outgoing/incoming messages.

- **`useMessages.ts`**  
  Handles message list state and updates.

- **`usePointBuy.ts`**  
  Manages character stat allocation via point buy system.

- **`use-toast.ts`**  
  Provides toast notification API.

- **`use-mobile.tsx`**  
  Detects mobile device viewport and state.

- **`memory/`**  
  Hooks for memory creation, filtering, and retrieval.

---

## **How Hooks Interact**

- Hooks often **consume React Contexts** (e.g., Campaign, Character, Memory, Message).
- Hooks **call Supabase APIs** or other services for data persistence.
- Hooks are **composed inside components** to manage UI and game logic.
- Some hooks **wrap or extend** other hooks for specialized behavior.

---

## **Usage Example**

```typescript
import { useGameSession } from '@/hooks/use-game-session';

const { sessionId, sessionState } = useGameSession();
```

---

## **Notes**

- Follow the coding standards for naming (`use-something.ts`), documentation, and modularity.
- See `src/contexts/` for related context providers.
- See `src/agents/` for AI agent logic invoked by hooks.
