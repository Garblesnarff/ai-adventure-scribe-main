/**
 * Error Handler Utility
 *
 * Provides standardized error handling across the application with:
 * - Consistent logging via logger utility
 * - User-friendly toast notifications
 * - Flexible error handling options
 * - Function wrapper for async operations
 *
 * @author AI Dungeon Master Team
 */

import { toast } from 'sonner';

import logger from '@/lib/logger';

/**
 * Options for customizing error handling behavior
 */
export interface ErrorHandlerOptions {
  /** User-facing error message to display in toast */
  userMessage?: string;
  /** Log level for the error (defaults to 'error') */
  logLevel?: 'error' | 'warn' | 'info';
  /** Whether to show a toast notification (defaults to true) */
  showToast?: boolean;
  /** Custom callback to execute after error is handled */
  onError?: (error: unknown) => void;
  /** Additional context to include in logs */
  context?: Record<string, unknown>;
}

/**
 * Standardized error handling function
 * Logs the error and optionally displays a toast notification
 *
 * @param error - The error that occurred (Error object or unknown)
 * @param options - Configuration options for error handling
 *
 * @example
 * ```typescript
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleAsyncError(error, {
 *     userMessage: 'Failed to load data',
 *     context: { userId: user.id }
 *   });
 * }
 * ```
 */
export function handleAsyncError(error: unknown, options: ErrorHandlerOptions = {}): void {
  const {
    userMessage = 'An error occurred',
    logLevel = 'error',
    showToast = true,
    onError,
    context,
  } = options;

  // Extract error message
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Build log context
  const logContext: Record<string, unknown> = {
    error,
    errorMessage,
    ...context,
  };

  // Log the error with appropriate level
  logger[logLevel](`Error: ${userMessage}`, logContext);

  // Show user feedback via toast
  if (showToast) {
    toast.error(userMessage, {
      description: errorMessage,
      duration: 5000,
    });
  }

  // Execute custom error handler if provided
  if (onError) {
    try {
      onError(error);
    } catch (handlerError) {
      logger.error('Error in custom error handler:', handlerError);
    }
  }
}

/**
 * Wraps an async function with standardized error handling
 * Returns a new function with the same signature that automatically catches and handles errors
 *
 * @param fn - The async function to wrap
 * @param options - Configuration options for error handling
 * @returns Wrapped function with error handling
 *
 * @example
 * ```typescript
 * const safeLoadData = withErrorHandling(
 *   async (userId: string) => {
 *     const data = await fetchUserData(userId);
 *     return data;
 *   },
 *   { userMessage: 'Failed to load user data' }
 * );
 *
 * // Use the wrapped function
 * await safeLoadData('user-123');
 * ```
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ErrorHandlerOptions,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleAsyncError(error, options);
      throw error; // Re-throw to allow caller to handle if needed
    }
  }) as T;
}

/**
 * Specialized error handler for API/network errors
 * Provides more detailed error messages based on HTTP status codes
 *
 * @param error - The error that occurred
 * @param options - Configuration options for error handling
 */
export function handleAPIError(error: unknown, options: ErrorHandlerOptions = {}): void {
  let userMessage = options.userMessage || 'Network request failed';

  // Check for common HTTP error patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      userMessage = 'Network connection error. Please check your internet connection.';
    } else if (message.includes('timeout')) {
      userMessage = 'Request timed out. Please try again.';
    } else if (message.includes('unauthorized') || message.includes('401')) {
      userMessage = 'Authentication required. Please sign in again.';
    } else if (message.includes('forbidden') || message.includes('403')) {
      userMessage = 'You do not have permission to perform this action.';
    } else if (message.includes('not found') || message.includes('404')) {
      userMessage = 'The requested resource was not found.';
    } else if (message.includes('500') || message.includes('server error')) {
      userMessage = 'Server error. Please try again later.';
    }
  }

  handleAsyncError(error, {
    ...options,
    userMessage,
  });
}

/**
 * Error handler for validation errors
 * Used when user input fails validation
 *
 * @param message - Validation error message
 * @param options - Configuration options for error handling
 */
export function handleValidationError(
  message: string,
  options: Omit<ErrorHandlerOptions, 'userMessage'> = {},
): void {
  logger.warn('Validation error:', message);

  if (options.showToast !== false) {
    toast.error('Validation Error', {
      description: message,
      duration: 4000,
    });
  }

  if (options.onError) {
    options.onError(new Error(message));
  }
}
