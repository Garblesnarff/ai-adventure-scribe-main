/**
 * useGameContext Hook
 *
 * This hook is responsible for fetching, caching, and validating the complete
 * game context. It utilizes functions from `gameContextBuilder` to construct
 * the context and uses `@tanstack/react-query` for data fetching and caching.
 * If context is missing or invalid, it provides a default context.
 *
 * Main Hook:
 * - useGameContext: Provides the overall game context.
 *
 * Key Dependencies:
 * - @tanstack/react-query (useQuery)
 * - Game context builder utilities (`@/utils/context/game-context-builder.ts`)
 *
 * @author AI Dungeon Master Team
 */

// SDK Imports
import { useQuery } from '@tanstack/react-query';

// Project Utilities (assuming kebab-case for gameContextBuilder)
import logger from '@/lib/logger';
import {
  buildGameContext,
  validateGameContext,
  createDefaultContext,
} from '@/utils/context/game-context-builder';

/**
 * Hook for managing game context
 * Handles fetching, caching, and validating context data
 */
export const useGameContext = (
  campaignId: string | undefined,
  characterId: string | undefined,
  sessionId: string | undefined,
) => {
  return useQuery({
    queryKey: ['gameContext', campaignId, characterId, sessionId],
    queryFn: async () => {
      if (!campaignId || !sessionId) {
        logger.error('[Context] Missing required IDs');
        return createDefaultContext();
      }

      const context = await buildGameContext(campaignId, characterId || '', sessionId);

      if (!context || !validateGameContext(context)) {
        logger.error('[Context] Invalid context, using defaults');
        return createDefaultContext();
      }

      return context;
    },
    enabled: !!campaignId && !!sessionId,
  });
};
