import { AlertTriangle } from 'lucide-react';
import React, { Component } from 'react';

import type { ErrorInfo, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import logger from '@/lib/logger';

/**
 * Props for the ErrorBoundary component
 */
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'app' | 'route' | 'feature' | 'component';
}

/**
 * State for the ErrorBoundary component
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * React Error Boundary for graceful error handling and recovery.
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * @example
 * ```tsx
 * <ErrorBoundary level="app" onError={reportError}>
 *   <App />
 * </ErrorBoundary>
 * ```
 *
 * Features:
 * - Multiple error boundary levels (app, route, feature, component)
 * - Custom fallback UI support
 * - Error logging with context
 * - Reset functionality to recover from errors
 * - Reload page option for critical errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Update state when an error is caught
   * This lifecycle method is called during the render phase
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Log error details when an error is caught
   * This lifecycle method is called during the commit phase
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { level = 'component', onError } = this.props;

    // Log error with context
    logger.error(`[ErrorBoundary:${level}] Component error caught:`, {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
      message: error.message,
      stack: error.stack,
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);
  }

  /**
   * Reset error state to attempt recovery
   */
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  /**
   * Reload the page for critical errors
   */
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
          <div className="max-w-md w-full p-8 bg-card border border-destructive/20 rounded-lg shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>

            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
            </p>

            {/* Show additional error details in development */}
            {import.meta.env.DEV && this.state.error?.stack && (
              <details className="mb-4 p-3 bg-muted rounded text-xs">
                <summary className="cursor-pointer font-medium mb-2">Error Details</summary>
                <pre className="whitespace-pre-wrap overflow-x-auto">{this.state.error.stack}</pre>
              </details>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="default">
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
