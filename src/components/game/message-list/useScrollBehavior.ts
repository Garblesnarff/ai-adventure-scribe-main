import { useState, useEffect, RefObject } from 'react';
import { ChatMessage } from '@/types/game';

/**
 * Hook to manage auto-scroll behavior
 * Automatically scrolls to bottom when new messages arrive unless user scrolled up
 */
export const useScrollBehavior = (messagesRef: RefObject<HTMLDivElement>, messages: ChatMessage[]) => {
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;

    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      setIsUserScrolledUp(!atBottom);
      const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
      setScrollProgress(Math.max(0, Math.min(1, progress)));
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [messagesRef]);

  useEffect(() => {
    const el = messagesRef.current;
    if (!el || isUserScrolledUp) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isUserScrolledUp, messagesRef]);

  return { isUserScrolledUp, scrollProgress };
};
