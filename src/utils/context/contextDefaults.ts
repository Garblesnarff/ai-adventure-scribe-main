import type { GameContext } from '@/types/game';

/**
 * Creates a default context with fallback values
 */
export const createDefaultContext = (): GameContext => ({
  campaign: {
    basic: {
      name: 'Unnamed Campaign',
      status: 'active',
    },
    setting: {
      era: 'unspecified',
      location: 'unknown',
      atmosphere: 'neutral',
    },
    thematicElements: {
      mainThemes: [],
      recurringMotifs: [],
      keyLocations: [],
      importantNPCs: [],
    },
  },
  memories: {
    recent: [],
    locations: [],
    characters: [],
    plot: [],
    currentLocation: undefined,
    activeNPCs: [],
  },
});
