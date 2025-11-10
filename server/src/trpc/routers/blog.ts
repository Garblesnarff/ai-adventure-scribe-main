/**
 * Blog Router (Main Entry Point)
 *
 * Combines blog posts and taxonomy routers into a single namespace.
 * Provides type-safe procedures for blog CMS operations using Drizzle ORM.
 *
 * Architecture:
 * - blog-posts.ts: Post CRUD operations
 * - blog-taxonomy.ts: Category and tag management
 * - blog-schemas.ts: Zod validation schemas
 * - blog-helpers.ts: Utility functions
 *
 * Usage:
 * ```typescript
 * // Client-side
 * trpc.blog.posts.list.useQuery({ page: 1 });
 * trpc.blog.posts.create.useMutation();
 * trpc.blog.taxonomy.getCategories.useQuery();
 * ```
 */

import { router } from '../trpc.js';
import { blogPostsRouter } from './blog-posts.js';
import { blogTaxonomyRouter } from './blog-taxonomy.js';

/**
 * Blog router namespace
 * Groups all blog-related procedures
 */
export const blogRouter = router({
  posts: blogPostsRouter,
  taxonomy: blogTaxonomyRouter,
});

/**
 * Type export for client use
 */
export type BlogRouter = typeof blogRouter;
