import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

/**
 * Props for the GameErrorFallback component
 */
interface GameErrorFallbackProps {
  error?: Error;
  reset?: () => void;
}

/**
 * GameErrorFallback Component
 *
 * Specialized error fallback UI for game session errors.
 * Provides context-specific recovery options for game-related failures.
 *
 * Features:
 * - Game-themed error messaging
 * - Multiple recovery options (restart session, return home, reload)
 * - User-friendly error descriptions
 * - Maintains app navigation
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   level="feature"
 *   fallback={<GameErrorFallback error={error} reset={reset} />}
 * >
 *   <GameContent />
 * </ErrorBoundary>
 * ```
 */
export const GameErrorFallback: React.FC<GameErrorFallbackProps> = ({ error, reset }) => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    navigate('/app');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background p-4">
      <div className="max-w-lg w-full p-8 bg-card border border-destructive/20 rounded-lg shadow-lg">
        {/* Error Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-semibold">Game Session Error</h2>
            <p className="text-sm text-muted-foreground">
              Your adventure encountered an unexpected problem
            </p>
          </div>
        </div>

        {/* Error Description */}
        <div className="mb-6 p-4 bg-muted/50 rounded border border-muted">
          <p className="text-sm text-foreground mb-2">
            Don't worry - your progress has been saved. You can try one of the following options to
            continue:
          </p>

          {error && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">Error: {error.message}</p>
          )}
        </div>

        {/* Recovery Options */}
        <div className="space-y-2">
          {reset && (
            <Button onClick={reset} variant="default" className="w-full" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Game Session
            </Button>
          )}

          <Button onClick={handleReturnHome} variant="outline" className="w-full" size="lg">
            <Home className="h-4 w-4 mr-2" />
            Return to Campaign Hub
          </Button>

          <Button onClick={handleReload} variant="ghost" className="w-full" size="sm">
            Reload Page
          </Button>
        </div>

        {/* Development Error Details */}
        {import.meta.env.DEV && error?.stack && (
          <details className="mt-6 p-3 bg-muted rounded text-xs">
            <summary className="cursor-pointer font-medium mb-2 text-muted-foreground">
              Error Stack (Development Only)
            </summary>
            <pre className="whitespace-pre-wrap overflow-x-auto text-xs">{error.stack}</pre>
          </details>
        )}
      </div>
    </div>
  );
};
