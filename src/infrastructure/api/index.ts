/**
 * API Infrastructure Layer
 *
 * Central export point for all API client configurations.
 * Provides type-safe clients for tRPC, REST, and CrewAI services.
 *
 * @module infrastructure/api
 *
 * @example
 * ```typescript
 * import { trpc, TRPCProvider, llmApiClient } from '@/infrastructure/api';
 *
 * // Use tRPC hooks in components
 * const { data } = trpc.blog.getPosts.useQuery();
 *
 * // Use REST client for LLM operations
 * const text = await llmApiClient.generateText({ prompt: 'Hello' });
 * ```
 */

// tRPC exports
export { trpc } from './trpc-client';
export { TRPCProvider } from './trpc-provider';
export { useTRPC, useTRPCUtils, useQuery, useMutation } from './trpc-hooks';

// REST API exports
export { llmApiClient } from './rest-client';

// CrewAI exports
export { CrewAIClient, crewAIClient } from './crewai-client';

// Type exports
export type * from './types';
