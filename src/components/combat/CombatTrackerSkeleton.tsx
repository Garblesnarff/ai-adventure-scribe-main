/**
 * CombatTrackerSkeleton Component
 *
 * Loading skeleton for combat tracker interface.
 * Shows placeholder for initiative order and combat participants.
 */

import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * CombatTrackerSkeleton - Skeleton loader for combat tracker
 *
 * Displays animated placeholders for:
 * - Combat header
 * - Initiative tracker
 * - Participant cards
 * - Action controls
 */
export const CombatTrackerSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Current Turn Indicator */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Initiative Tracker */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-lg p-3 border border-border">
            <div className="flex items-center gap-3">
              {/* Initiative Number */}
              <Skeleton className="h-10 w-10 rounded-full" />

              {/* Participant Info */}
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              {/* HP Bar */}
              <div className="w-24 space-y-1">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
};
