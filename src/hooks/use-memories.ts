/**
 * useMemories Hook
 *
 * This hook serves as a central point for interacting with the game's memory system.
 * It combines functionalities for memory creation (including extraction from content)
 * and memory retrieval, by leveraging more specialized hooks like `useMemoryCreation`
 * and `useMemoryRetrieval`.
 *
 * Main Hook:
 * - useMemories: Provides an aggregated API for memory operations.
 *
 * Key Dependencies:
 * - useMemoryCreation hook (`./memory/useMemoryCreation.ts`)
 * - useMemoryRetrieval hook (`./memory/useMemoryRetrieval.ts`)
 *
 * @author AI Dungeon Master Team
 */

// Project Hooks
import { useMemoryCreation } from './memory/useMemoryCreation';
import { useMemoryRetrieval } from './memory/useMemoryRetrieval';

/**
 * Primary hook for managing game memories
 * @param sessionId - Current game session ID
 */
export const useMemories = (sessionId: string | null) => {
  const { data: memories = [], isLoading } = useMemoryRetrieval(sessionId);
  const { createMemory, extractMemories } = useMemoryCreation(sessionId);

  return {
    memories,
    isLoading,
    createMemory,
    extractMemories,
  };
};
