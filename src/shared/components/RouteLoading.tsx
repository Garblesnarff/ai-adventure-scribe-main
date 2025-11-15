import React from 'react';
import { FantasyLoader } from '@/components/ui/fantasy-loader';

/**
 * RouteLoading Component
 *
 * Provides a consistent loading UI for lazy-loaded route components.
 * Used as the fallback for React.Suspense boundaries around route chunks.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<RouteLoading />}>
 *   <LazyComponent />
 * </Suspense>
 * ```
 */
export const RouteLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <FantasyLoader
        type="cosmic"
        size="xl"
        label="Loading..."
        tip="Traversing the planes of existence!"
      />
    </div>
  );
};

/**
 * MinimalRouteLoading Component
 *
 * A minimal loading indicator for routes that don't need a full skeleton.
 * Useful for fast-loading routes or nested route transitions.
 */
export const MinimalRouteLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <FantasyLoader
        type="spinner"
        size="default"
        label="Loading..."
      />
    </div>
  );
};
