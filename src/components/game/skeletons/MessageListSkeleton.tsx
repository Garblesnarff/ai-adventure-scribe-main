/**
 * MessageListSkeleton Component
 *
 * Loading skeleton for the message list in game sessions.
 * Displays placeholder messages while chat history is being loaded.
 */

import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * MessageListSkeleton - Skeleton loader for message list
 *
 * Shows animated placeholders for DM and player messages
 * while the actual message history is being fetched.
 */
export const MessageListSkeleton: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* DM Message Skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>

      {/* Player Message Skeleton */}
      <div className="flex gap-3 justify-end">
        <div className="flex-1 space-y-2 flex flex-col items-end">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2 w-full flex flex-col items-end">
            <Skeleton className="h-4 w-3/6" />
            <Skeleton className="h-4 w-2/6" />
          </div>
        </div>
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      </div>

      {/* DM Message Skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
};
