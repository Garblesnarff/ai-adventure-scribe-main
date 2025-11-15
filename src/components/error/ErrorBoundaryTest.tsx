import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Z_INDEX } from '@/constants/z-index';

/**
 * ErrorBoundaryTest Component
 *
 * Test component for verifying error boundaries work correctly.
 * Throws an error when the button is clicked to trigger error boundary.
 *
 * Usage:
 * 1. Import this component into any page/component wrapped with ErrorBoundary
 * 2. Click "Trigger Test Error" button
 * 3. Verify error boundary catches the error and shows fallback UI
 * 4. Verify "Try Again" button resets error state
 * 5. Remove this component after testing
 *
 * @example
 * ```tsx
 * import { ErrorBoundaryTest } from '@/components/error/ErrorBoundaryTest';
 *
 * // In development mode only
 * {import.meta.env.DEV && <ErrorBoundaryTest />}
 * ```
 */
export const ErrorBoundaryTest: React.FC = () => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    // This will be caught by the nearest error boundary
    throw new Error('Test error: This is an intentional error to test error boundaries');
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-[${Z_INDEX.LOADING_OVERLAY}] p-4 bg-card border-2 border-destructive rounded-lg shadow-lg`}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold text-destructive">Error Boundary Test</p>
        <p className="text-xs text-muted-foreground">Development only</p>
        <Button
          onClick={() => setShouldError(true)}
          variant="destructive"
          size="sm"
          className="w-full"
        >
          Trigger Test Error
        </Button>
      </div>
    </div>
  );
};

/**
 * AsyncErrorBoundaryTest Component
 *
 * Test component for verifying error boundaries work with async errors.
 * Note: Error boundaries do NOT catch async errors directly.
 * This demonstrates that async errors need try-catch handling.
 */
export const AsyncErrorBoundaryTest: React.FC = () => {
  const [error, setError] = useState<Error | null>(null);

  const handleAsyncError = async () => {
    try {
      // Simulate async operation that fails
      await new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Async error: This should NOT be caught by error boundary')),
          100,
        ),
      );
    } catch (err) {
      // Async errors need to be handled with try-catch
      // Then can be thrown in render to be caught by error boundary
      setError(err as Error);
    }
  };

  // Now throw in render phase to be caught by error boundary
  if (error) {
    throw error;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-[${Z_INDEX.LOADING_OVERLAY}] p-4 bg-card border-2 border-yellow-500 rounded-lg shadow-lg`}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold text-yellow-600">Async Error Test</p>
        <p className="text-xs text-muted-foreground">Development only</p>
        <Button onClick={handleAsyncError} variant="outline" size="sm" className="w-full">
          Trigger Async Error
        </Button>
      </div>
    </div>
  );
};
