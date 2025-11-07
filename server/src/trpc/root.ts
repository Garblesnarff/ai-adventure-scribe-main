/**
 * tRPC Root Router
 *
 * Combines all feature-specific routers into a single root router.
 * This file is the main entry point for the tRPC API.
 *
 * To add a new router:
 * 1. Create a new router file in ./routers/
 * 2. Import it here
 * 3. Add it to the appRouter definition
 *
 * Example:
 * ```typescript
 * import { campaignRouter } from './routers/campaign.js';
 *
 * export const appRouter = router({
 *   campaign: campaignRouter,
 *   blog: blogRouter,
 * });
 * ```
 */

import { router } from './trpc.js';
import { blogRouter } from './routers/blog.js';

/**
 * Root tRPC router
 * Combines all feature routers
 *
 * Active routers:
 * - blog: Blog CMS operations
 *
 * Future routers to be added:
 * - auth: Authentication and user management
 * - campaign: Campaign CRUD operations
 * - character: Character sheet management
 * - session: Game session handling
 * - ai: AI Dungeon Master interactions
 */
export const appRouter = router({
  blog: blogRouter,
  // Future routers will be added here as they are created
});

/**
 * Export type definition of API for use in client
 * This type is used by tRPC client to provide end-to-end type safety
 */
export type AppRouter = typeof appRouter;
