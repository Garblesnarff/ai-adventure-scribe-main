import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';

import type { ChatMessage, MessageContext } from '@/types/game';

import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';

const PAGE_SIZE = 50;

/**
 * Custom hook for fetching and managing game messages with pagination
 * @param sessionId - Current game session ID
 * @returns Query result containing messages array, loading state, pagination functions
 */
export const useMessages = (sessionId: string | null) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);

  const query = useQuery({
    queryKey: ['messages', sessionId, page],
    queryFn: async () => {
      if (!sessionId) return { messages: [], hasMore: false };

      // Calculate range for pagination
      // For chat interfaces, we want newest messages first when paginating history
      // But we display oldest to newest, so we reverse the query
      const start = page * PAGE_SIZE;
      const end = start + PAGE_SIZE - 1;

      logger.info(`[useMessages] Fetching messages page ${page}, range ${start}-${end}`);

      // Single JOIN query to get messages with character data
      // Order by sequence_number descending to get newest first, then reverse for display
      // Sequence numbers ensure proper ordering even with concurrent multi-tab inserts
      const { data, error, count } = await supabase
        .from('dialogue_history')
        .select(
          `
          *,
          game_sessions!inner(
            id,
            character_id,
            characters(
              id,
              name,
              avatar_url
            )
          )
        `,
          { count: 'exact' },
        )
        .eq('session_id', sessionId)
        .order('sequence_number', { ascending: false })
        .range(start, end);

      if (error) {
        logger.error('Error fetching messages:', error);
        return { messages: [], hasMore: false };
      }

      const messages = (data || []).map((msg) => {
        // Extract character data from the nested structure
        const characterData = (msg.game_sessions as any)?.characters;

        return {
          text: msg.message,
          sender: msg.speaker_type as ChatMessage['sender'],
          id: msg.id,
          timestamp: msg.timestamp,
          context: msg.context as MessageContext,
          images: Array.isArray((msg as any).images) ? (msg as any).images : undefined,
          characterName:
            msg.speaker_type === 'player' && characterData ? characterData.name : undefined,
          characterAvatar:
            msg.speaker_type === 'player' && characterData ? characterData.avatar_url : undefined,
        };
      });

      // Reverse to get oldest to newest for display
      const reversedMessages = messages.reverse();

      // Check if there are more messages
      const totalMessages = count || 0;
      const loadedCount = (page + 1) * PAGE_SIZE;
      const moreAvailable = loadedCount < totalMessages;

      logger.info(
        `[useMessages] Loaded ${messages.length} messages, total: ${totalMessages}, hasMore: ${moreAvailable}`,
      );

      return { messages: reversedMessages, hasMore: moreAvailable };
    },
    enabled: !!sessionId,
    keepPreviousData: true,
  });

  // Update allMessages whenever query data changes
  useEffect(() => {
    if (query.data?.messages) {
      setAllMessages((prev) => {
        // Prepend older messages to the beginning when loading more history
        if (page === 0) {
          return query.data.messages;
        }
        // Merge new page with existing messages, avoiding duplicates
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = query.data.messages.filter((m) => !existingIds.has(m.id));
        return [...newMessages, ...prev];
      });
      setHasMore(query.data.hasMore);
    }
  }, [query.data, page]);

  // Load more messages (next page)
  const loadMore = useCallback(() => {
    if (hasMore && !query.isFetching) {
      logger.info('[useMessages] Loading more messages, current page:', page);
      setPage((prev) => prev + 1);
    }
  }, [hasMore, query.isFetching, page]);

  // Reset pagination when session changes
  const resetPagination = useCallback(() => {
    logger.info('[useMessages] Resetting pagination');
    setPage(0);
    setHasMore(true);
    setAllMessages([]);
  }, []);

  const addMessage = async (message: ChatMessage) => {
    if (!sessionId) return;

    try {
      const contextData = message.context
        ? {
            location: message.context.location || null,
            emotion: message.context.emotion || null,
            intent: message.context.intent || null,
          }
        : {};

      const { error } = await supabase.from('dialogue_history').insert({
        session_id: sessionId,
        message: message.text,
        speaker_type: message.sender,
        context: contextData,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        logger.error('Error adding message:', error);
        throw error;
      }

      // Invalidate all message queries to refetch
      await queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
    } catch (error) {
      logger.error('Failed to add message:', error);
      throw error;
    }
  };

  return {
    data: allMessages,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    hasMore,
    loadMore,
    resetPagination,
    addMessage,
  };
};
