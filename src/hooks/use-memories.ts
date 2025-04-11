/**
 * Main hook for memory system functionality
 * Combines creation and retrieval operations
 */
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