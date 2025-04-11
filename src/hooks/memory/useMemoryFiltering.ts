import { useMemo } from 'react';
import { Memory, MemoryType, MemorySubcategory } from '@/components/game/memory/types';

interface FilterOptions {
  types?: MemoryType[];
  subcategories?: MemorySubcategory[];
  tags?: string[];
  contextId?: string;
  minImportance?: number;
  timeframe?: 'recent' | 'all';
}

/**
 * Custom hook for advanced memory filtering and sorting
 */
export const useMemoryFiltering = (
  memories: Memory[],
  options: FilterOptions = {}
) => {
  return useMemo(() => {
    let filtered = [...memories];

    // Filter by types
    if (options.types?.length) {
      filtered = filtered.filter(memory => options.types?.includes(memory.type));
    }

    // Filter by subcategories
    if (options.subcategories?.length) {
      filtered = filtered.filter(memory => 
        memory.subcategory && options.subcategories?.includes(memory.subcategory)
      );
    }

    // Filter by tags
    if (options.tags?.length) {
      filtered = filtered.filter(memory => 
        memory.tags?.some(tag => options.tags?.includes(tag))
      );
    }

    // Filter by context
    if (options.contextId) {
      filtered = filtered.filter(memory => memory.context_id === options.contextId);
    }

    // Filter by importance
    if (options.minImportance !== undefined) {
      filtered = filtered.filter(memory => memory.importance >= options.minImportance);
    }

    // Filter by timeframe
    if (options.timeframe === 'recent') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      filtered = filtered.filter(memory => memory.created_at >= oneHourAgo);
    }

    // Sort by importance and recency
    return filtered.sort((a, b) => {
      // Primary sort by importance
      const importanceDiff = (b.importance || 0) - (a.importance || 0);
      if (importanceDiff !== 0) return importanceDiff;

      // Secondary sort by creation date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [memories, options]);
};

/**
 * Groups memories by a specific property
 */
export const groupMemories = (
  memories: Memory[],
  groupBy: 'type' | 'subcategory' | 'contextId' | 'tags'
) => {
  return memories.reduce((groups, memory) => {
    let key: string;
    
    switch (groupBy) {
      case 'type':
        key = memory.type;
        break;
      case 'subcategory':
        key = memory.subcategory || 'general';
        break;
      case 'contextId':
        key = memory.context_id || 'none';
        break;
      case 'tags':
        memory.tags?.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(memory);
        });
        return groups;
      default:
        key = 'other';
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(memory);
    return groups;
  }, {} as Record<string, Memory[]>);
};