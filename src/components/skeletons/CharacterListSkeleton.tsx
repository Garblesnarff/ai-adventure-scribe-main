/**
 * CharacterListSkeleton Component
 *
 * Loading skeleton for character list display.
 * Shows placeholder character cards while data is being fetched.
 */

import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * CharacterListSkeleton - Skeleton loader for character grid
 *
 * Displays animated placeholders matching the character card layout.
 * Shows 6 skeleton cards in a responsive grid.
 */
export const CharacterListSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-card rounded-lg shadow-md overflow-hidden">
          {/* Character Image */}
          <Skeleton className="h-48 w-full" />

          {/* Character Info */}
          <div className="p-4 space-y-3">
            {/* Name */}
            <Skeleton className="h-6 w-3/4" />

            {/* Race and Class */}
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Level */}
            <Skeleton className="h-4 w-16" />

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
