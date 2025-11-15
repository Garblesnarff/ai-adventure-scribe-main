import type { EncounterGenerationInput, EncounterSpec } from '@/types/encounters';

export function generateSocialEncounter(input: EncounterGenerationInput): EncounterSpec {
  return {
    type: 'social',
    difficulty: input.requestedDifficulty ?? 'medium',
    xpBudget: 0,
    participants: { hostiles: [], friendlies: [{ ref: 'srd:commoner', count: 1 }] },
    terrain: { biome: input.world.biome, features: [] },
    objectives: ['negotiate information'],
    startState: { initiative: 'fixed', surprise: false },
    followUps: ['gain-clue'],
  };
}

export function generateExplorationEncounter(input: EncounterGenerationInput): EncounterSpec {
  return {
    type: 'exploration',
    difficulty: input.requestedDifficulty ?? 'medium',
    xpBudget: 0,
    participants: { hostiles: [], friendlies: [] },
    terrain: { biome: input.world.biome, features: ['difficult terrain'] },
    objectives: ['overcome hazard'],
    startState: { initiative: 'fixed', surprise: false },
    followUps: ['progress-journey'],
    hazards: [
      {
        id: 'pitfall',
        description: 'Concealed pit with spikes',
        save: { ability: 'dex', dc: 13, timing: 'trigger' },
      },
    ],
  };
}
