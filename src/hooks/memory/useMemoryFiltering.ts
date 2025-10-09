import { useMemo } from 'react';
import { Memory, MemoryType, MemorySubcategory, isValidMemoryType } from '@/components/game/memory/types';

interface FilterOptions {
  types?: MemoryType[];
  subcategories?: MemorySubcategory[];
  tags?: string[];
  contextId?: string;
  minImportance?: number;
  timeframe?: 'recent' | 'all';
}

const EMPTY_OPTIONS: Readonly<FilterOptions> = {};

/**
 * Custom hook for advanced memory filtering and sorting
 */
export const useMemoryFiltering = (
  memories: Memory[] | null | undefined,
  options: FilterOptions | null | undefined = {}
) => {
  const safeOptions = options ?? EMPTY_OPTIONS;

  return useMemo(() => {
    // Handle null/undefined memories array
    if (!memories || !Array.isArray(memories)) {
      return [];
    }
    
    // Validate and filter options
    const validTypes = safeOptions.types?.filter(type => isValidMemoryType(type)) || [];
    
    let filtered = [...memories];

    // Filter by types (only use valid types to prevent errors)
    if (validTypes.length) {
      filtered = filtered.filter(memory => validTypes.includes(memory.type));
    }

    // Filter by subcategories
    if (safeOptions.subcategories?.length) {
      filtered = filtered.filter(memory => 
        memory.subcategory && safeOptions.subcategories?.includes(memory.subcategory)
      );
    }

    // Filter by tags
    if (safeOptions.tags?.length) {
      filtered = filtered.filter(memory => 
        memory.tags?.some(tag => safeOptions.tags?.includes(tag))
      );
    }

    // Filter by context
    if (safeOptions.contextId) {
      filtered = filtered.filter(memory => memory.context_id === safeOptions.contextId);
    }

    // Filter by importance
    if (safeOptions.minImportance !== undefined) {
      filtered = filtered.filter(memory => memory.importance >= safeOptions.minImportance);
    }

    // Filter by timeframe
    if (safeOptions.timeframe === 'recent') {
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
  }, [memories, safeOptions]);
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