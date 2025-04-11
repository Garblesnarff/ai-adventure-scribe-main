import { useMemo } from 'react';
import { Memory } from './types';

/**
 * Custom hook for handling memory filtering and sorting logic
 * @param memories - Array of memory objects
 * @param selectedType - Currently selected memory type filter
 * @returns Filtered and sorted memories array
 */
export const useMemoryFiltering = (memories: Memory[], selectedType: string | null) => {
  return useMemo(() => {
    // Filter memories based on selected type
    const filtered = selectedType
      ? memories.filter((memory) => memory.type === selectedType)
      : memories;

    // Sort memories by importance and creation date
    return [...filtered].sort((a, b) => {
      if (b.importance !== a.importance) {
        return (b.importance || 0) - (a.importance || 0);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [memories, selectedType]);
};