/**
 * tRPC Provider Component
 *
 * This component wraps the application with tRPC and React Query providers,
 * enabling type-safe API calls throughout the component tree.
 *
 * Features:
 * - Automatic authentication header injection from Supabase
 * - Batched HTTP requests for performance
 * - React Query integration with sensible defaults
 * - Error handling and retry logic
 *
 * @module lib/trpc/Provider
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState, useMemo } from 'react';

import { trpc } from './client';

import type { ReactNode } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import logger from '@/lib/logger';

/**
 * Props for TRPCProvider component
 */
interface TRPCProviderProps {
  children: ReactNode;
}

/**
 * Configuration for the API endpoint
 * Uses environment variable or defaults to /api/trpc
 */
const API_URL = (import.meta as any).env?.VITE_TRPC_API_URL || '/api/trpc';

/**
 * TRPCProvider Component
 *
 * Provides tRPC client and React Query context to the application.
 * Must be rendered inside AuthProvider to access authentication state.
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <TRPCProvider>
 *     <App />
 *   </TRPCProvider>
 * </AuthProvider>
 * ```
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  const { session } = useAuth();

  /**
   * Create a stable QueryClient instance
   * Configured with defaults for caching and retry behavior
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is fresh for 5 minutes before refetching
            staleTime: 1000 * 60 * 5,
            // Only retry failed requests once
            retry: 1,
            // Refetch on window focus in production
            refetchOnWindowFocus: (import.meta as any).env?.MODE === 'production',
          },
          mutations: {
            // Don't retry mutations by default
            retry: false,
            // Log mutation errors
            onError: (error) => {
              logger.error('tRPC mutation error:', error);
            },
          },
        },
      }),
  );

  /**
   * Create tRPC client with authentication and batching
   * Memoized to prevent unnecessary recreations
   */
  const trpcClient = useMemo(() => {
    return trpc.createClient({
      links: [
        httpBatchLink({
          url: API_URL,
          /**
           * Add authentication headers to every request
           * Includes Supabase access token if user is authenticated
           */
          headers() {
            const headers: Record<string, string> = {
              'content-type': 'application/json',
            };

            // Add authorization header if user is authenticated
            if (session?.access_token) {
              headers.authorization = `Bearer ${session.access_token}`;
            }

            return headers;
          },
          /**
           * Handle fetch errors
           */
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include', // Include cookies for CORS
            }).catch((error) => {
              logger.error('tRPC fetch error:', error);
              throw error;
            });
          },
        }),
      ],
    });
  }, [session?.access_token]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
