# React Contexts

This directory contains **React Context providers** for managing global state in the AI Dungeon Master app, including campaign, character, memory, and messaging data.

---

## **Purpose**

Provide **centralized, accessible state** across the app for:

- Current campaign details
- Active character data
- Memory storage and retrieval
- Message history and flow

---

## **Important Files**

- **`CampaignContext.tsx`**  
  Provides campaign data and update functions.

- **`CharacterContext.tsx`**  
  Provides character data and update functions.

- **`MemoryContext.tsx`**  
  Manages game memory storage and retrieval.

- **`MessageContext.tsx`**  
  Manages chat message state and updates.

---

## **How Contexts Interact**

- Contexts are **wrapped around components** in the app root or feature modules.
- Hooks like `useGameSession`, `useMemories`, and `useMessages` **consume these contexts**.
- Contexts **persist and share state** across nested components.
- Contexts can be **combined** to provide a unified game state.

---

## **Usage Example**

```typescript
import { useContext } from 'react';
import { CampaignContext } from '@/contexts/CampaignContext';

const { campaign, setCampaign } = useContext(CampaignContext);
```

---

## **Notes**

- Follow coding standards for naming, documentation, and modularity.
- Contexts should be **kept focused** on a single domain (campaign, character, etc.).
- See `src/hooks/` for hooks that consume these contexts.
