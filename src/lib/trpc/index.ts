/**
 * tRPC Client Index
 *
 * Central export point for tRPC client utilities.
 * Import from this file for cleaner imports throughout the app.
 *
 * @module lib/trpc
 */

// Re-export the main tRPC client
export { trpc } from './client';

// Re-export the provider component
export { TRPCProvider } from './Provider';

// Re-export hooks and utilities
export { useTRPC, useTRPCUtils } from './hooks';

// Re-export types
export type { AppRouter } from './router-types';
