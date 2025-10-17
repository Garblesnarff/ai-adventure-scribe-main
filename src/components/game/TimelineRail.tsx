import React from 'react';
import { useMessageContext } from '@/contexts/MessageContext';

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

  // Build anchors from DM messages (assistant)
  const anchors = React.useMemo(() => {
    return messages
      .map((m, idx) => ({ id: m.id || m.timestamp || String(idx), isDM: m.sender === 'dm' }))
      .filter((x) => x.isDM)
      .map((x) => `m-${x.id}`);
  }, [messages]);

  // Debug logging
  React.useEffect(() => {
    console.log('[TimelineRail] Messages:', messages.length);
    console.log('[TimelineRail] Anchors:', anchors);
    console.log('[TimelineRail] Root ref:', rootRef.current);

    // Check if elements exist
    if (rootRef.current) {
      anchors.forEach(anchor => {
        const element = rootRef.current!.querySelector(`#${CSS.escape(anchor)}`);
        console.log(`[TimelineRail] Element ${anchor}:`, element);
      });
    }
  }, [messages, anchors, rootRef]);

  // Track scroll position for the indicator
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleScroll = () => {
      const scrollTop = root.scrollTop;
      const scrollHeight = root.scrollHeight - root.clientHeight;
      const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

      // Update the indicator position
      const indicator = root.parentElement?.querySelector('.scroll-position-indicator') as HTMLElement;
      if (indicator) {
        const railHeight = root.clientHeight - 32; // Account for padding
        const indicatorPosition = Math.max(0, Math.min(railHeight, scrollPercentage * railHeight));
        indicator.style.transform = `translateY(${indicatorPosition}px)`;
      }
    };

    root.addEventListener('scroll', handleScroll, { passive: true });
    // Initial position
    handleScroll();

    return () => root.removeEventListener('scroll', handleScroll);
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
      { root, threshold: [0.6] }
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
    const middlePosition = elementTop - (root.clientHeight / 2) + (el.clientHeight / 2);

    root.scrollTo({
      top: middlePosition,
      behavior: 'smooth'
    });
  };

  if (anchors.length === 0) return null;

  return (
    <div className="timeline-rail" aria-label="DM message timeline">
      <div className="timeline-track">
        {/* Scroll Position Indicator */}
        <div
          className="scroll-position-indicator absolute left-[-8px] w-[18px] h-[18px] bg-gradient-to-br from-infinite-gold to-infinite-gold-dark border-2 border-white shadow-lg rounded-full transition-all duration-100 ease-out z-20 pointer-events-none"
          style={{
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2)',
            top: '0px',
            transform: 'translateY(0px)'
          }}
        />

        {anchors.map((id, i) => (
          <button
            key={id}
            className={`timeline-dot ${currentId === id ? 'active' : ''}`}
            title={`Jump to DM message ${i + 1}`}
            aria-label={`Jump to DM message ${i + 1}`}
            onClick={() => scrollTo(id)}
            style={{ top: `${(i + 1) / (anchors.length + 1) * 100}%` }}
          />
        ))}
      </div>
    </div>
  );
};

export default TimelineRail;
