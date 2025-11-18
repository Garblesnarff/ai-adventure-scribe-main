/**
 * Progression Test Fixtures
 *
 * Pre-configured XP and level progression data for unit tests
 * Based on D&D 5E experience point thresholds (PHB pg. 15)
 */

import type { ExperienceEvent, LevelProgression } from '../../../../db/schema/index.js';

/**
 * Level progression for Fighter (level 5)
 */
export const fighterLevel5Progression: Partial<LevelProgression> = {
  characterId: 'fixture-fighter-5',
  currentLevel: 5,
  currentXp: 6500,
  xpToNextLevel: 14000, // Level 6 threshold
  totalXp: 6500,
  lastLevelUp: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level progression for Wizard (level 5, close to level up)
 */
export const wizardLevel5Progression: Partial<LevelProgression> = {
  characterId: 'fixture-wizard-5',
  currentLevel: 5,
  currentXp: 13500, // Close to 14000 threshold
  xpToNextLevel: 14000,
  totalXp: 13500,
  lastLevelUp: new Date('2023-12-15T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level progression for Rogue (level 3)
 */
export const rogueLevel3Progression: Partial<LevelProgression> = {
  characterId: 'fixture-rogue-3',
  currentLevel: 3,
  currentXp: 900,
  xpToNextLevel: 2700, // Level 4 threshold
  totalXp: 900,
  lastLevelUp: new Date('2023-12-20T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level progression for Cleric (level 1, just started)
 */
export const clericLevel1Progression: Partial<LevelProgression> = {
  characterId: 'fixture-cleric-1',
  currentLevel: 1,
  currentXp: 0,
  xpToNextLevel: 300, // Level 2 threshold
  totalXp: 0,
  lastLevelUp: null,
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Level progression for Paladin (level 10, mid-tier)
 */
export const paladinLevel10Progression: Partial<LevelProgression> = {
  characterId: 'fixture-paladin-10',
  currentLevel: 10,
  currentXp: 64000,
  xpToNextLevel: 85000, // Level 11 threshold
  totalXp: 64000,
  lastLevelUp: new Date('2023-11-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Experience events for Fighter
 */
export const fighterXpEvents: Partial<ExperienceEvent>[] = [
  {
    id: 'fixture-xp-event-1',
    characterId: 'fixture-fighter-5',
    sessionId: 'fixture-session-1',
    xpGained: 200,
    source: 'combat',
    description: 'Defeated goblin raiders',
    timestamp: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'fixture-xp-event-2',
    characterId: 'fixture-fighter-5',
    sessionId: 'fixture-session-1',
    xpGained: 100,
    source: 'roleplay',
    description: 'Negotiated peace with orc tribe',
    timestamp: new Date('2024-01-01T11:00:00Z'),
  },
  {
    id: 'fixture-xp-event-3',
    characterId: 'fixture-fighter-5',
    sessionId: 'fixture-session-1',
    xpGained: 300,
    source: 'quest',
    description: 'Completed the rescue mission',
    timestamp: new Date('2024-01-01T12:00:00Z'),
  },
];

/**
 * Experience events for Wizard
 */
export const wizardXpEvents: Partial<ExperienceEvent>[] = [
  {
    id: 'fixture-xp-event-4',
    characterId: 'fixture-wizard-5',
    sessionId: 'fixture-session-1',
    xpGained: 450,
    source: 'combat',
    description: 'Defeated young red dragon',
    timestamp: new Date('2024-01-01T10:30:00Z'),
  },
  {
    id: 'fixture-xp-event-5',
    characterId: 'fixture-wizard-5',
    sessionId: 'fixture-session-1',
    xpGained: 50,
    source: 'other',
    description: 'Discovered ancient rune',
    timestamp: new Date('2024-01-01T11:30:00Z'),
  },
];

/**
 * Milestone experience event
 */
export const milestoneEvent: Partial<ExperienceEvent> = {
  id: 'fixture-xp-event-milestone',
  characterId: 'fixture-cleric-1',
  sessionId: 'fixture-session-2',
  xpGained: 300,
  source: 'milestone',
  description: 'Reached level 2 (milestone leveling)',
  timestamp: new Date('2024-01-02T10:00:00Z'),
};

/**
 * Large combat XP event
 */
export const largeCombatEvent: Partial<ExperienceEvent> = {
  id: 'fixture-xp-event-boss',
  characterId: 'fixture-paladin-10',
  sessionId: 'fixture-session-3',
  xpGained: 5000,
  source: 'combat',
  description: 'Defeated lich and undead army',
  timestamp: new Date('2024-01-03T10:00:00Z'),
};

/**
 * Exported collection of all progression fixtures
 */
export const progression = {
  // Level progressions
  fighterLevel5: fighterLevel5Progression,
  wizardLevel5: wizardLevel5Progression,
  rogueLevel3: rogueLevel3Progression,
  clericLevel1: clericLevel1Progression,
  paladinLevel10: paladinLevel10Progression,

  // XP events
  fighterXpEvents,
  wizardXpEvents,
  milestoneEvent,
  largeCombatEvent,
};

/**
 * D&D 5E Experience Thresholds (PHB pg. 15)
 * Helper constant for tests
 */
export const XP_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

/**
 * Helper function to calculate XP needed for next level
 */
export function getXpForNextLevel(currentLevel: number): number {
  if (currentLevel >= 20) {
    return Infinity; // Max level
  }
  return XP_THRESHOLDS[currentLevel + 1] || 0;
}

/**
 * Helper function to calculate current level from total XP
 */
export function getLevelFromXp(totalXp: number): number {
  let level = 1;
  for (let i = 20; i >= 1; i--) {
    if (totalXp >= XP_THRESHOLDS[i]!) {
      level = i;
      break;
    }
  }
  return level;
}
