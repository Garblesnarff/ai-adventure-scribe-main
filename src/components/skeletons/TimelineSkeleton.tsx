/**
 * TimelineSkeleton Component
 *
 * Loading skeleton for timeline/history displays.
 * Shows placeholder timeline events while data is being fetched.
 */

import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * TimelineSkeleton - Skeleton loader for timeline views
 *
 * Displays animated placeholders for timeline events.
 * Shows 5 skeleton events in a vertical timeline layout.
 */
export const TimelineSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-border/50" />

      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4 relative">
          {/* Timeline dot */}
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0 z-10" />

          {/* Event content */}
          <div className="flex-1 space-y-2 pb-4">
            {/* Timestamp */}
            <Skeleton className="h-4 w-32" />

            {/* Event title */}
            <Skeleton className="h-5 w-3/4" />

            {/* Event description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Event metadata */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
