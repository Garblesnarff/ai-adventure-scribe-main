/**
 * Message Context
 *
 * This file defines the MessageContext for managing the state of chat messages
 * within the game interface. It leverages `useMessages` for fetching message history
 * and `useMessageQueue` for sending new messages and managing their persistence.
 *
 * Main Components:
 * - MessageContext: The React context object.
 * - MessageProvider: The provider component.
 * - useMessageContext: Custom hook to consume the context.
 *
 * Key State/Functions Exposed:
 * - messages: Array of ChatMessage objects.
 * - isLoading: Boolean indicating if messages are being loaded.
 * - sendMessage: Function to send a new message.
 * - queueStatus: Status of the message sending queue.
 *
 * Dependencies:
 * - React
 * - useMessages hook (`@/hooks/use-messages`)
 * - useMessageQueue hook (`@/hooks/use-message-queue`)
 * - ChatMessage type (`@/types/game`)
 *
 * @author AI Dungeon Master Team
 */

// SDK Imports
import React, { createContext, useContext } from 'react'; // Added ReactNode

import type { ChatMessage } from '@/types/game';
import type { ReactNode } from 'react';

// Project Hooks
import { useMessageQueue } from '@/hooks/use-message-queue';
import { useMessages } from '@/hooks/use-messages';

// Project Types

// Interfaces and Types (defined in-file, specific to this context)
interface MessageContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  sendMessage: (message: ChatMessage) => Promise<void>;
  queueStatus: 'idle' | 'processing' | 'error' | 'retrying';
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

/**
 * Provider component for managing message-related state and operations
 */
export const MessageProvider: React.FC<{
  sessionId: string | null;
  children: ReactNode; // Used ReactNode
}> = ({ sessionId, children }) => {
  const { data: messages = [], isLoading, isFetching, hasMore, loadMore } = useMessages(sessionId);
  const { messageMutation, queueStatus } = useMessageQueue(sessionId);

  const value: MessageContextType = {
    messages,
    isLoading,
    isFetchingMore: isFetching && !isLoading,
    hasMore,
    loadMore,
    sendMessage: messageMutation.mutateAsync,
    queueStatus,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
};

/**
 * Custom hook for accessing message context
 * @throws Error if used outside of MessageProvider
 */
export const useMessageContext = () => {
  const context = useContext(MessageContext);
  if (context === undefined) {
    throw new Error('useMessageContext must be used within a MessageProvider');
  }
  return context;
};
