/**
 * Combat Test Fixtures
 *
 * Pre-configured combat encounter, participant, and status data for unit tests
 */

import type {
  CombatEncounter,
  CombatParticipant,
  CombatParticipantStatus,
  CombatParticipantCondition,
  ConditionLibrary,
} from '../../../../db/schema/index.js';

/**
 * Active combat encounter
 */
export const activeEncounter: Partial<CombatEncounter> = {
  id: 'fixture-encounter-1',
  sessionId: 'fixture-session-1',
  status: 'active',
  currentRound: 1,
  currentTurnOrder: 0,
  location: 'Ancient Ruins',
  difficulty: 'medium',
  experienceAwarded: null,
  startedAt: new Date('2024-01-01T10:00:00Z'),
  endedAt: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Completed combat encounter
 */
export const completedEncounter: Partial<CombatEncounter> = {
  id: 'fixture-encounter-2',
  sessionId: 'fixture-session-1',
  status: 'completed',
  currentRound: 5,
  currentTurnOrder: 2,
  location: 'Goblin Cave',
  difficulty: 'easy',
  experienceAwarded: 200,
  startedAt: new Date('2024-01-01T09:00:00Z'),
  endedAt: new Date('2024-01-01T09:30:00Z'),
  createdAt: new Date('2024-01-01T09:00:00Z'),
  updatedAt: new Date('2024-01-01T09:30:00Z'),
};

/**
 * Fighter participant (PC)
 */
export const fighterParticipant: Partial<CombatParticipant> = {
  id: 'fixture-participant-fighter',
  encounterId: 'fixture-encounter-1',
  characterId: 'fixture-fighter-5',
  npcId: null,
  name: 'Test Fighter',
  participantType: 'player',
  initiative: 15,
  initiativeModifier: 2,
  turnOrder: 0,
  isActive: true,
  armorClass: 18,
  maxHp: 45,
  speed: 30,
  damageResistances: [],
  damageImmunities: [],
  damageVulnerabilities: [],
  multiclassInfo: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Status for fighter participant (healthy)
 */
export const fighterStatus: Partial<CombatParticipantStatus> = {
  id: 'fixture-status-fighter',
  participantId: 'fixture-participant-fighter',
  currentHp: 45,
  maxHp: 45,
  tempHp: 0,
  isConscious: true,
  deathSavesSuccesses: 0,
  deathSavesFailures: 0,
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Wizard participant (PC)
 */
export const wizardParticipant: Partial<CombatParticipant> = {
  id: 'fixture-participant-wizard',
  encounterId: 'fixture-encounter-1',
  characterId: 'fixture-wizard-5',
  npcId: null,
  name: 'Test Wizard',
  participantType: 'player',
  initiative: 18,
  initiativeModifier: 3,
  turnOrder: 1,
  isActive: true,
  armorClass: 12,
  maxHp: 22,
  speed: 30,
  damageResistances: [],
  damageImmunities: [],
  damageVulnerabilities: [],
  multiclassInfo: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Status for wizard participant (injured)
 */
export const wizardStatus: Partial<CombatParticipantStatus> = {
  id: 'fixture-status-wizard',
  participantId: 'fixture-participant-wizard',
  currentHp: 15,
  maxHp: 22,
  tempHp: 5,
  isConscious: true,
  deathSavesSuccesses: 0,
  deathSavesFailures: 0,
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Goblin participant (enemy)
 */
export const goblinParticipant: Partial<CombatParticipant> = {
  id: 'fixture-participant-goblin',
  encounterId: 'fixture-encounter-1',
  characterId: null,
  npcId: 'fixture-goblin-1',
  name: 'Goblin',
  participantType: 'enemy',
  initiative: 12,
  initiativeModifier: 2,
  turnOrder: 2,
  isActive: true,
  armorClass: 15,
  maxHp: 7,
  speed: 30,
  damageResistances: [],
  damageImmunities: [],
  damageVulnerabilities: [],
  multiclassInfo: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Status for goblin participant (healthy)
 */
export const goblinStatus: Partial<CombatParticipantStatus> = {
  id: 'fixture-status-goblin',
  participantId: 'fixture-participant-goblin',
  currentHp: 7,
  maxHp: 7,
  tempHp: 0,
  isConscious: true,
  deathSavesSuccesses: 0,
  deathSavesFailures: 0,
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Dragon participant (boss enemy)
 */
export const dragonParticipant: Partial<CombatParticipant> = {
  id: 'fixture-participant-dragon',
  encounterId: 'fixture-encounter-1',
  characterId: null,
  npcId: 'fixture-dragon-1',
  name: 'Young Red Dragon',
  participantType: 'enemy',
  initiative: 10,
  initiativeModifier: 0,
  turnOrder: 3,
  isActive: true,
  armorClass: 18,
  maxHp: 178,
  speed: 40,
  damageResistances: [],
  damageImmunities: ['fire'],
  damageVulnerabilities: ['cold'],
  multiclassInfo: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Status for dragon participant (injured)
 */
export const dragonStatus: Partial<CombatParticipantStatus> = {
  id: 'fixture-status-dragon',
  participantId: 'fixture-participant-dragon',
  currentHp: 100,
  maxHp: 178,
  tempHp: 0,
  isConscious: true,
  deathSavesSuccesses: 0,
  deathSavesFailures: 0,
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Unconscious rogue participant (downed)
 */
export const unconsciousRogueParticipant: Partial<CombatParticipant> = {
  id: 'fixture-participant-rogue-down',
  encounterId: 'fixture-encounter-1',
  characterId: 'fixture-rogue-3',
  npcId: null,
  name: 'Test Rogue',
  participantType: 'player',
  initiative: 20,
  initiativeModifier: 4,
  turnOrder: 4,
  isActive: true,
  armorClass: 15,
  maxHp: 24,
  speed: 30,
  damageResistances: [],
  damageImmunities: [],
  damageVulnerabilities: [],
  multiclassInfo: null,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Status for unconscious rogue (making death saves)
 */
export const unconsciousRogueStatus: Partial<CombatParticipantStatus> = {
  id: 'fixture-status-rogue-down',
  participantId: 'fixture-participant-rogue-down',
  currentHp: 0,
  maxHp: 24,
  tempHp: 0,
  isConscious: false,
  deathSavesSuccesses: 1,
  deathSavesFailures: 2,
  updatedAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Condition: Poisoned
 */
export const conditionPoisoned: Partial<ConditionLibrary> = {
  id: 'fixture-condition-poisoned',
  name: 'Poisoned',
  description: 'A poisoned creature has disadvantage on attack rolls and ability checks.',
  mechanicalEffects: 'Disadvantage on attack rolls and ability checks',
  iconName: 'poison',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Condition: Blinded
 */
export const conditionBlinded: Partial<ConditionLibrary> = {
  id: 'fixture-condition-blinded',
  name: 'Blinded',
  description: 'A blinded creature cannot see and automatically fails any ability check that requires sight.',
  mechanicalEffects: 'Cannot see; auto-fail sight-based checks; attack rolls have disadvantage; attacks against have advantage',
  iconName: 'eye-slash',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

/**
 * Applied condition: Poisoned on wizard
 */
export const wizardPoisonedCondition: Partial<CombatParticipantCondition> = {
  id: 'fixture-applied-condition-1',
  participantId: 'fixture-participant-wizard',
  conditionId: 'fixture-condition-poisoned',
  durationType: 'rounds',
  durationValue: 3,
  saveDc: 15,
  saveAbility: 'constitution',
  appliedAtRound: 1,
  expiresAtRound: 4,
  sourceDescription: 'Poisoned dart trap',
  isActive: true,
  createdAt: new Date('2024-01-01T10:00:00Z'),
};

/**
 * Exported collection of all combat fixtures
 */
export const combat = {
  // Encounters
  activeEncounter,
  completedEncounter,

  // Participants
  fighterParticipant,
  wizardParticipant,
  goblinParticipant,
  dragonParticipant,
  unconsciousRogueParticipant,

  // Statuses
  fighterStatus,
  wizardStatus,
  goblinStatus,
  dragonStatus,
  unconsciousRogueStatus,

  // Conditions
  conditionPoisoned,
  conditionBlinded,
  wizardPoisonedCondition,
};

/**
 * Helper function to create a complete combat scenario
 */
export function createBasicCombatScenario() {
  return {
    encounter: activeEncounter,
    participants: [fighterParticipant, wizardParticipant, goblinParticipant],
    statuses: [fighterStatus, wizardStatus, goblinStatus],
  };
}

/**
 * Helper function to create a boss fight scenario
 */
export function createBossFightScenario() {
  return {
    encounter: activeEncounter,
    participants: [fighterParticipant, wizardParticipant, dragonParticipant],
    statuses: [fighterStatus, wizardStatus, dragonStatus],
  };
}
