import { useMemo } from 'react';

import type { Memory, MemoryType, MemorySubcategory } from '@/components/game/memory/types';

import { isValidMemoryType, isValidMemorySubcategory } from '@/components/game/memory/types';

interface FilterOptions {
  types?: MemoryType[];
  subcategories?: MemorySubcategory[];
  tags?: string[];
  contextId?: string;
  minImportance?: number;
  timeframe?: 'recent' | 'all';
}

const EMPTY_OPTIONS: Readonly<FilterOptions> = {};

const sanitizeFilterOptions = (options: FilterOptions | null | undefined): FilterOptions => {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    return EMPTY_OPTIONS;
  }

  const sanitized: FilterOptions = {};

  if (Array.isArray(options.types)) {
    const validTypes = options.types.filter(
      (type): type is MemoryType => typeof type === 'string' && isValidMemoryType(type),
    );
    if (validTypes.length) {
      sanitized.types = validTypes;
    }
  }

  if (Array.isArray(options.subcategories)) {
    const validSubcategories = options.subcategories.filter(
      (subcategory): subcategory is MemorySubcategory =>
        typeof subcategory === 'string' && isValidMemorySubcategory(subcategory),
    );
    if (validSubcategories.length) {
      sanitized.subcategories = validSubcategories;
    }
  }

  if (Array.isArray(options.tags)) {
    const validTags = options.tags.filter(
      (tag): tag is string => typeof tag === 'string' && tag.length > 0,
    );
    if (validTags.length) {
      sanitized.tags = validTags;
    }
  }

  if (typeof options.contextId === 'string' && options.contextId.trim().length) {
    sanitized.contextId = options.contextId;
  }

  if (typeof options.minImportance === 'number' && Number.isFinite(options.minImportance)) {
    sanitized.minImportance = options.minImportance;
  }

  if (options.timeframe === 'recent' || options.timeframe === 'all') {
    sanitized.timeframe = options.timeframe;
  }

  return sanitized;
};

/**
 * Custom hook for advanced memory filtering and sorting
 */
export const useMemoryFiltering = (
  memories: Memory[] | null | undefined,
  options: FilterOptions | null | undefined = {},
) => {
  const normalizedOptions = useMemo<FilterOptions>(() => sanitizeFilterOptions(options), [options]);

  return useMemo(() => {
    // Handle null/undefined memories array
    if (!memories || !Array.isArray(memories)) {
      return [];
    }

    const validTypes = normalizedOptions.types ?? [];
    const selectedSubcategories = normalizedOptions.subcategories ?? [];
    const selectedTags = normalizedOptions.tags ?? [];
    const contextId = normalizedOptions.contextId;
    const minImportance = normalizedOptions.minImportance;
    const timeframe = normalizedOptions.timeframe;

    let filtered = [...memories];

    // Filter by types (only use valid types to prevent errors)
    if (validTypes.length) {
      filtered = filtered.filter((memory) => validTypes.includes(memory.type));
    }

    // Filter by subcategories
    if (selectedSubcategories.length) {
      filtered = filtered.filter(
        (memory) => memory.subcategory && selectedSubcategories.includes(memory.subcategory),
      );
    }

    // Filter by tags
    if (selectedTags.length) {
      filtered = filtered.filter((memory) =>
        memory.tags?.some((tag) => selectedTags.includes(tag)),
      );
    }

    // Filter by context
    if (contextId) {
      filtered = filtered.filter((memory) => memory.context_id === contextId);
    }

    // Filter by importance
    if (typeof minImportance === 'number') {
      filtered = filtered.filter((memory) => memory.importance >= minImportance);
    }

    // Filter by timeframe
    if (timeframe === 'recent') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      filtered = filtered.filter((memory) => memory.created_at >= oneHourAgo);
    }

    // Sort by importance and recency
    return filtered.sort((a, b) => {
      // Primary sort by importance
      const importanceDiff = (b.importance || 0) - (a.importance || 0);
      if (importanceDiff !== 0) return importanceDiff;

      // Secondary sort by creation date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [memories, normalizedOptions]);
};

/**
 * Groups memories by a specific property
 */
export const groupMemories = (
  memories: Memory[],
  groupBy: 'type' | 'subcategory' | 'contextId' | 'tags',
) => {
  return memories.reduce(
    (groups, memory) => {
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
          memory.tags?.forEach((tag) => {
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
    },
    {} as Record<string, Memory[]>,
  );
};
