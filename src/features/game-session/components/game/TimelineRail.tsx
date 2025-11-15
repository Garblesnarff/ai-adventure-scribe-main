import React from 'react';

import { useMessageContext } from '@/contexts/MessageContext';
import logger from '@/lib/logger';

interface TimelineRailProps {
  /** Scroll container element that holds the messages */
  rootRef: React.RefObject<HTMLDivElement>;
}

/**
 * TimelineRail
 * A slim, clickable vertical rail that lists markers for each DM message.
 * Clicking a marker scrolls the corresponding message into view within the
 * provided scroll container.
 */
export const TimelineRail: React.FC<TimelineRailProps> = ({ rootRef }) => {
  const { messages = [] } = useMessageContext();
  const [currentId, setCurrentId] = React.useState<string | null>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const lastTopRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const stopTimerRef = React.useRef<number | null>(null);
  const beadCooldownRef = React.useRef<Set<string>>(new Set());
  const beadTimersRef = React.useRef<Map<string, number>>(new Map());
  const indicatorTimerRef = React.useRef<number | null>(null);

  // Build anchors from DM messages (assistant)
  const anchors = React.useMemo(() => {
    return messages
      .map((m, idx) => ({ id: m.id || m.timestamp || String(idx), isDM: m.sender === 'dm' }))
      .filter((x) => x.isDM)
      .map((x) => `m-${x.id}`);
  }, [messages]);

  // Debug logging
  React.useEffect(() => {
    logger.debug('[TimelineRail] Messages:', messages.length);
    logger.debug('[TimelineRail] Anchors:', anchors);
    logger.debug('[TimelineRail] Root ref:', rootRef.current);

    // Check if elements exist
    if (rootRef.current) {
      anchors.forEach((anchor) => {
        const element = rootRef.current!.querySelector(`#${CSS.escape(anchor)}`);
        logger.debug(`[TimelineRail] Element ${anchor}:`, element);
      });
    }
  }, [messages, anchors, rootRef]);

  // Track scroll for indicator + apply transient scrolling state
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const setScrolling = (scrolling: boolean, direction?: 'up' | 'down') => {
      const rail = railRef.current;
      if (!rail) return;
      if (scrolling) rail.setAttribute('data-scrolling', 'true');
      else rail.removeAttribute('data-scrolling');
      if (direction) rail.setAttribute('data-direction', direction);
    };

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollTop = root.scrollTop;
        const scrollHeight = root.scrollHeight - root.clientHeight;
        const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

        const indicator = railRef.current?.querySelector(
          '.scroll-position-indicator',
        ) as HTMLElement | null;
        if (indicator) {
          const railHeight = root.clientHeight - 32;
          const indicatorPosition = Math.max(
            0,
            Math.min(railHeight, scrollPercentage * railHeight),
          );
          indicator.style.transform = `translateY(${indicatorPosition}px)`;

          // Absorb effect: detect overlap between indicator and beads
          const dots = Array.from(
            railRef.current?.querySelectorAll<HTMLButtonElement>('.timeline-dot') || [],
          );
          const indicatorCenter = indicatorPosition + 9; // indicator height ~18px
          const threshold = 10; // px threshold for overlap detection

          for (const dot of dots) {
            const beadId = dot.getAttribute('data-anchor-id') || '';
            if (!beadId) continue;
            if (beadCooldownRef.current.has(beadId)) continue;

            const beadCenter = dot.offsetTop + 7; // dot height ~14px
            if (Math.abs(indicatorCenter - beadCenter) <= threshold) {
              // Mark cooldown to avoid rapid retriggers
              beadCooldownRef.current.add(beadId);
              window.setTimeout(() => beadCooldownRef.current.delete(beadId), 800);

              // Trigger bead absorb animation
              dot.classList.add('absorbing');
              const prevTimer = beadTimersRef.current.get(beadId);
              if (prevTimer) window.clearTimeout(prevTimer);
              const timer = window.setTimeout(() => {
                dot.classList.remove('absorbing');
                beadTimersRef.current.delete(beadId);
              }, 450);
              beadTimersRef.current.set(beadId, timer);

              // Trigger indicator ripple animation
              indicator.classList.add('absorbing');
              if (indicatorTimerRef.current) window.clearTimeout(indicatorTimerRef.current);
              indicatorTimerRef.current = window.setTimeout(() => {
                indicator.classList.remove('absorbing');
              }, 450);
            }
          }
        }

        const dir: 'up' | 'down' = scrollTop > lastTopRef.current ? 'down' : 'up';
        lastTopRef.current = scrollTop;
        setScrolling(true, dir);
        if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = window.setTimeout(() => setScrolling(false), 180);
      });
    };

    root.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      root.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    };
  }, [rootRef]);

  // Observe which DM message is most visible
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = anchors
      .map((id) => root.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null)
      .filter((el): el is HTMLElement => !!el);

    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setCurrentId(visible.target.id);
      },
      { root, threshold: [0.6] },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [anchors, rootRef]);

  const scrollTo = (id: string) => {
    const root = rootRef.current;
    if (!root) return;
    const el = root.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el) return;

    // Calculate the element's position relative to the scroll container
    const elementTop = el.offsetTop - root.offsetTop;
    const middlePosition = elementTop - root.clientHeight / 2 + el.clientHeight / 2;

    root.scrollTo({
      top: middlePosition,
      behavior: 'smooth',
    });
  };

  if (anchors.length === 0) return null;

  return (
    <div ref={railRef} className="timeline-rail" aria-label="DM message timeline">
      <div className="timeline-track">
        {/* Scroll Position Indicator */}
        <div
          className="scroll-position-indicator absolute left-[-8px] w-[18px] h-[18px] bg-gradient-to-br from-infinite-gold to-infinite-gold-dark border-2 border-white shadow-lg rounded-full transition-all duration-100 ease-out z-20 pointer-events-none"
          style={{
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2)',
            top: '0px',
            transform: 'translateY(0px)',
          }}
        />

        {anchors.map((id, i) => (
          <button
            key={id}
            className={`timeline-dot ${currentId === id ? 'active' : ''}`}
            title={`Jump to DM message ${i + 1}`}
            aria-label={`Jump to DM message ${i + 1}`}
            onClick={() => scrollTo(id)}
            data-anchor-id={id}
            style={{ top: `${((i + 1) / (anchors.length + 1)) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineRail;
