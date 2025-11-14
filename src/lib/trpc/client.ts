/**
 * tRPC Client Configuration
 *
 * This file initializes the tRPC React client with type safety from the backend.
 * It provides the base configuration for making type-safe API calls.
 *
 * @module lib/trpc/client
 */

import { createTRPCReact } from '@trpc/react-query';

import type { AppRouter } from './router-types';

/**
 * Type-safe tRPC React client
 *
 * This client provides hooks like:
 * - trpc.blog.getPosts.useQuery()
 * - trpc.blog.createPost.useMutation()
 *
 * The types are inferred from the backend AppRouter, ensuring
 * compile-time safety for all API calls.
 *
 * @example
 * ```tsx
 * import { trpc } from '@/lib/trpc/client';
 *
 * function MyComponent() {
 *   const { data, isLoading } = trpc.blog.getPosts.useQuery();
 *   return <div>{data?.map(post => post.title)}</div>;
 * }
 * ```
 */
export const trpc = createTRPCReact<AppRouter>();
