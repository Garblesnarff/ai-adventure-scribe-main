/**
 * Memory Context
 *
 * This file defines the MemoryContext for managing global memory data (game events,
 * dialogues, observations) within the application. It utilizes the `useMemories` hook
 * to interact with memory storage and provides memory data and manipulation functions
 * to its consuming components.
 *
 * Main Components:
 * - MemoryContext: The React context object.
 * - MemoryProvider: The provider component.
 * - useMemoryContext: Custom hook to consume the context.
 *
 * Key State/Functions Exposed:
 * - memories: Array of memory objects.
 * - isLoading: Boolean indicating if memories are being loaded.
 * - createMemory: Function to add a new memory.
 * - extractMemories: Function to process content and extract new memories.
 *
 * Dependencies:
 * - React
 * - useMemories hook (`@/hooks/use-memories`)
 *
 * @author AI Dungeon Master Team
 */

// SDK Imports
import React, { createContext, useContext } from 'react'; // Added ReactNode

import type { ReactNode } from 'react';

// Project Hooks
import { useMemories } from '@/hooks/use-memories';

// Interfaces and Types (defined in-file, specific to this context)
interface MemoryContextType {
  memories: any[];
  isLoading: boolean;
  createMemory: (memory: any) => void;
  extractMemories: (content: string, type?: string) => Promise<void>;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

/**
 * Provider component for managing memory-related state and operations
 */
export const MemoryProvider: React.FC<{
  sessionId: string | null;
  children: ReactNode; // Used ReactNode
}> = ({ sessionId, children }) => {
  const { memories, isLoading, createMemory, extractMemories } = useMemories(sessionId);

  const value = {
    memories,
    isLoading,
    createMemory,
    extractMemories,
  };

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
};

/**
 * Custom hook for accessing memory context
 * @throws Error if used outside of MemoryProvider
 */
export const useMemoryContext = () => {
  const context = useContext(MemoryContext);
  if (context === undefined) {
    throw new Error('useMemoryContext must be used within a MemoryProvider');
  }
  return context;
};
