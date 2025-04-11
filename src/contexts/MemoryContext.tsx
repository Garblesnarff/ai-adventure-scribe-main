import React, { createContext, useContext } from 'react';
import { useMemories } from '@/hooks/useMemories';

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
  children: React.ReactNode;
}> = ({ sessionId, children }) => {
  const { memories, isLoading, createMemory, extractMemories } = useMemories(sessionId);

  const value = {
    memories,
    isLoading,
    createMemory,
    extractMemories,
  };

  return (
    <MemoryContext.Provider value={value}>
      {children}
    </MemoryContext.Provider>
  );
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