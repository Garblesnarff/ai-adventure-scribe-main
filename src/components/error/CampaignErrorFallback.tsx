import { AlertTriangle, Home, RotateCcw, List } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

/**
 * Props for the CampaignErrorFallback component
 */
interface CampaignErrorFallbackProps {
  error?: Error;
  reset?: () => void;
  showReturnToCampaigns?: boolean;
}

/**
 * CampaignErrorFallback Component
 *
 * Specialized error fallback UI for campaign management errors.
 * Provides context-specific recovery options for campaign-related failures.
 *
 * Features:
 * - Campaign-themed error messaging
 * - Multiple recovery options (retry, return to campaigns, return home)
 * - User-friendly error descriptions
 * - Maintains app navigation
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   level="feature"
 *   fallback={<CampaignErrorFallback error={error} reset={reset} showReturnToCampaigns />}
 * >
 *   <CampaignHub />
 * </ErrorBoundary>
 * ```
 */
export const CampaignErrorFallback: React.FC<CampaignErrorFallbackProps> = ({
  error,
  reset,
  showReturnToCampaigns = true,
}) => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    navigate('/app');
  };

  const handleReturnToCampaigns = () => {
    navigate('/app');
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
            <h2 className="text-2xl font-semibold">Campaign Error</h2>
            <p className="text-sm text-muted-foreground">
              Something went wrong loading this campaign
            </p>
          </div>
        </div>

        {/* Error Description */}
        <div className="mb-6 p-4 bg-muted/50 rounded border border-muted">
          <p className="text-sm text-foreground mb-2">
            Your campaign data is safe. Try one of the following options to continue:
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
              Try Again
            </Button>
          )}

          {showReturnToCampaigns && (
            <Button
              onClick={handleReturnToCampaigns}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <List className="h-4 w-4 mr-2" />
              Return to Campaign List
            </Button>
          )}

          <Button onClick={handleReturnHome} variant="outline" className="w-full" size="lg">
            <Home className="h-4 w-4 mr-2" />
            Return Home
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
