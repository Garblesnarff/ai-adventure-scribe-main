/**
 * CharacterSelectionSkeleton Component
 *
 * Loading skeleton for character selection in modals/dialogs.
 * Shows placeholder character cards while data is being fetched.
 */

import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * CharacterSelectionSkeleton - Skeleton loader for character selection modal
 *
 * Displays animated placeholders matching the character selection card layout.
 * Shows 4 skeleton cards in a responsive grid (optimized for modal display).
 */
export const CharacterSelectionSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg shadow-md overflow-hidden border-2 border-border/60"
        >
          {/* Character Background */}
          <Skeleton className="h-32 w-full" />

          {/* Character Info */}
          <div className="p-4 space-y-3">
            {/* Avatar Circle */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-2">
                {/* Name */}
                <Skeleton className="h-5 w-3/4" />
                {/* Race and Class */}
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex gap-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
            </div>

            {/* Action Button */}
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
