import { AlertTriangle, Home, RotateCcw, Save } from 'lucide-react';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';

/**
 * Props for the CharacterCreationErrorFallback component
 */
interface CharacterCreationErrorFallbackProps {
  error?: Error;
  reset?: () => void;
  showReturnToCharacters?: boolean;
}

/**
 * CharacterCreationErrorFallback Component
 *
 * Specialized error fallback UI for character creation errors.
 * Provides context-specific recovery options for character creation failures.
 *
 * Features:
 * - Character creation themed error messaging
 * - Multiple recovery options (restart wizard, return to character list, return home)
 * - User-friendly error descriptions
 * - Maintains app navigation
 * - Suggests saving draft/progress when possible
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   level="feature"
 *   fallback={<CharacterCreationErrorFallback error={error} reset={reset} />}
 * >
 *   <CharacterWizard />
 * </ErrorBoundary>
 * ```
 */
export const CharacterCreationErrorFallback: React.FC<CharacterCreationErrorFallbackProps> = ({
  error,
  reset,
  showReturnToCharacters = true,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');

  const handleReturnHome = () => {
    navigate('/app');
  };

  const handleReturnToCharacters = () => {
    if (campaignId) {
      navigate(`/app/campaigns/${campaignId}/characters`);
    } else {
      navigate('/app/characters');
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] bg-background p-4">
      <div className="max-w-lg w-full p-8 bg-card border border-destructive/20 rounded-lg shadow-lg">
        {/* Error Icon and Title */}
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-semibold">Character Creation Error</h2>
            <p className="text-sm text-muted-foreground">
              Something went wrong during character creation
            </p>
          </div>
        </div>

        {/* Error Description */}
        <div className="mb-6 p-4 bg-muted/50 rounded border border-muted">
          <p className="text-sm text-foreground mb-2">
            Don't worry - you can restart the character creation wizard or return to your character
            list. Any progress may need to be re-entered.
          </p>

          <div className="flex items-start gap-2 mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
            <Save className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Tip:</strong> Consider taking screenshots of your character details before
              restarting, so you don't lose your creative choices.
            </p>
          </div>

          {error && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">Error: {error.message}</p>
          )}
        </div>

        {/* Recovery Options */}
        <div className="space-y-2">
          {reset && (
            <Button onClick={reset} variant="default" className="w-full" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Character Creation
            </Button>
          )}

          {showReturnToCharacters && (
            <Button
              onClick={handleReturnToCharacters}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Home className="h-4 w-4 mr-2" />
              {campaignId ? 'Return to Campaign Characters' : 'Return to Character List'}
            </Button>
          )}

          <Button onClick={handleReturnHome} variant="outline" className="w-full" size="lg">
            <Home className="h-4 w-4 mr-2" />
            Return to Home
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
