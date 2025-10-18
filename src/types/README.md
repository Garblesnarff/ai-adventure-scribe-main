# Shared Types

This directory contains **TypeScript type definitions and interfaces** shared across the AI Dungeon Master app.

---

## **Purpose**

Provide **strongly-typed contracts** for:

- AI agents and their tasks/results
- Campaign and character data
- Game state and memory structures
- Dialogue and messaging formats

---

## **Important Files**

- **`agent.ts`**  
  Types for AI agent interfaces, tasks, and results.

- **`campaign.ts`**  
  Types for campaign metadata and structure.

- **`character.ts`**  
  Types for character attributes, stats, and inventory.

- **`dialogue.ts`**  
  Types for dialogue history and message formats.

- **`dm.ts`**
  Types specific to Dungeon Master agent logic.

- **`blog.ts`**
  Types for blog authors, posts, categories, tags, and role assignments.

- **`game.ts`**
  Types for overall game state and flow.


- **`gameState.ts`**  
  Detailed game state structure, including location, NPCs, and scene status.

- **`memory.ts`**  
  Types for memory storage, retrieval, and classification.

---

## **How Types Are Used**

- Imported by **hooks**, **components**, **agents**, and **services**.
- Enforce **type safety** across API calls, state management, and AI interactions.
- Facilitate **refactoring** and **code navigation**.

---

## **Usage Example**

```typescript
import { Character } from '@/types/character';

const hero: Character = {
  id: 'abc123',
  name: 'Aragorn',
  class: 'Ranger',
  // ...
};
```

---

## **Notes**

- Keep types **modular and focused**.
- Use **interfaces** for extensibility.
- Add JSDoc comments for complex types.
