import { useState, useEffect, useRef } from 'react';

import type { ChatMessage } from '@/types/game';
import type { RefObject } from 'react';

import logger from '@/lib/logger';

const SCROLL_THRESHOLD = 100; // px from top to trigger load more

/**
 * Hook to manage auto-scroll behavior and pagination trigger
 * Automatically scrolls to bottom when new messages arrive unless user scrolled up
 * Triggers loadMore when user scrolls near the top
 */
export const useScrollBehavior = (
  messagesRef: RefObject<HTMLDivElement>,
  messages: ChatMessage[],
  hasMore?: boolean,
  loadMore?: () => void,
  isFetchingMore?: boolean,
) => {
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const previousScrollHeightRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);

  // Handle scroll events for pagination and user scroll detection
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      setIsUserScrolledUp(!atBottom);
      const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setScrollProgress(Math.max(0, Math.min(1, progress)));

      // Trigger load more when scrolling near top
      if (
        el.scrollTop < SCROLL_THRESHOLD &&
        hasMore &&
        loadMore &&
        !isFetchingMore &&
        !isLoadingMoreRef.current
      ) {
        logger.info('[useScrollBehavior] Near top, loading more messages');
        isLoadingMoreRef.current = true;
        previousScrollHeightRef.current = el.scrollHeight;
        loadMore();
      }
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messagesRef, hasMore, loadMore, isFetchingMore]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    const el = messagesRef.current;
    if (!el || isUserScrolledUp) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isUserScrolledUp, messagesRef]);

  // Preserve scroll position after loading more messages
  useEffect(() => {
    const el = messagesRef.current;
    if (!el || !isLoadingMoreRef.current || isFetchingMore) return;

    // After new messages are loaded, restore scroll position
    const newScrollHeight = el.scrollHeight;
    const scrollDiff = newScrollHeight - previousScrollHeightRef.current;

    if (scrollDiff > 0) {
      logger.info('[useScrollBehavior] Restoring scroll position after load more');
      el.scrollTop += scrollDiff;
    }

    isLoadingMoreRef.current = false;
  }, [messages, isFetchingMore, messagesRef]);

  return { isUserScrolledUp, scrollProgress };
};
