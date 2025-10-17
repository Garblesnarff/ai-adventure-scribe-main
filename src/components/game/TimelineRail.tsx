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
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (anchors.length === 0) return null;

  return (
    <div className="timeline-rail" aria-label="DM message timeline">
      <div className="timeline-track">
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
