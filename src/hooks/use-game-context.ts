import { useQuery } from '@tanstack/react-query';
import { buildGameContext, validateGameContext, createDefaultContext } from '@/utils/context/gameContextBuilder';

/**
 * Hook for managing game context
 * Handles fetching, caching, and validating context data
 */
export const useGameContext = (
  campaignId: string | undefined,
  characterId: string | undefined,
  sessionId: string | undefined
) => {
  return useQuery({
    queryKey: ['gameContext', campaignId, characterId, sessionId],
    queryFn: async () => {
      if (!campaignId || !sessionId) {
        console.error('[Context] Missing required IDs');
        return createDefaultContext();
      }

      const context = await buildGameContext(
        campaignId,
        characterId || '',
        sessionId
      );

      if (!context || !validateGameContext(context)) {
        console.error('[Context] Invalid context, using defaults');
        return createDefaultContext();
      }

      return context;
    },
    enabled: !!campaignId && !!sessionId,
  });
};