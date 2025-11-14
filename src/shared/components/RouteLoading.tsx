import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';

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
      <div className="max-w-4xl w-full space-y-6">
        {/* Header skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
        </div>
      </div>
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
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};
