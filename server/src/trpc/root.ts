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
import { scenesRouter } from './routers/scenes.js';
import { tokensRouter } from './routers/tokens.js';
import { drawingsRouter } from './routers/drawings.js';
import { measurementsRouter } from './routers/measurements.js';
import { charactersRouter } from './routers/characters.js';
import { characterFoldersRouter } from './routers/character-folders.js';
import { fogOfWarRouter } from './routers/fog-of-war.js';
import { visionBlockersRouter } from './routers/vision-blockers.js';

/**
 * Root tRPC router
 * Combines all feature routers
 *
 * Active routers:
 * - blog: Blog CMS operations
 * - scenes: Scene/map management for Foundry VTT-style virtual tabletop
 * - tokens: Token management for Foundry VTT-style virtual tabletop
 * - drawings: Scene drawing operations (annotations, shapes, text)
 * - measurements: Measurement template operations (AoE templates for spells)
 * - characters: Character management, sharing, permissions, export/import
 * - characterFolders: Character folder organization
 * - fogOfWar: User-specific fog of war revelation tracking
 * - visionBlockers: Vision-blocking shapes (walls, doors, windows, terrain)
 *
 * Future routers to be added:
 * - auth: Authentication and user management
 * - campaign: Campaign CRUD operations
 * - session: Game session handling
 * - ai: AI Dungeon Master interactions
 */
export const appRouter = router({
  blog: blogRouter,
  scenes: scenesRouter,
  tokens: tokensRouter,
  drawings: drawingsRouter,
  measurements: measurementsRouter,
  characters: charactersRouter,
  characterFolders: characterFoldersRouter,
  fogOfWar: fogOfWarRouter,
  visionBlockers: visionBlockersRouter,
  // Future routers will be added here as they are created
});

/**
 * Export type definition of API for use in client
 * This type is used by tRPC client to provide end-to-end type safety
 */
export type AppRouter = typeof appRouter;
