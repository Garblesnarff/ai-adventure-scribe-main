/**
 * Combat Domain - Public API
 *
 * Framework-agnostic D&D 5e combat logic.
 * Export all public functions and types for use in React contexts or other frameworks.
 */

// ===========================
// Types
// ===========================
export type {
  CombatParticipant,
  CombatEncounter,
  CombatAction,
  Condition,
  ConditionName,
  DamageType,
  DiceRoll,
  ReactionOpportunity,
  DeathSaves,
  DeathSaveResult,
  InitiativeRollResult,
  TurnAdvancementResult,
  DamageCalculationResult,
  ApplyDamageOptions,
  HealingOptions,
  HealingResult,
  AddParticipantOptions,
  AddParticipantResult,
} from './types';

// ===========================
// Initiative Tracker
// ===========================
export {
  rollInitiativeForParticipant,
  rollInitiativeForAll,
  sortByInitiative,
  updateInitiative,
  reorderParticipants,
  getInitiativeOrder,
  getFirstInInitiative,
  groupByInitiative,
} from './InitiativeTracker';

// ===========================
// Turn Manager
// ===========================
export {
  canTakeTurn,
  findNextValidParticipant,
  advanceTurn,
  resetTurnState,
  resetAllTurnStates,
  getCurrentParticipant,
  getCurrentParticipantIndex,
  isParticipantsTurn,
  getTurnOrderNumber,
  processEndOfTurnEffects,
  processStartOfTurnEffects,
} from './TurnManager';

// ===========================
// Participant CRUD
// ===========================
export {
  createParticipant,
  addParticipant,
  removeParticipant,
  updateParticipant,
  findParticipant,
  getParticipantsByType,
  getAliveParticipants,
  getUnconsciousParticipants,
  getDeadParticipants,
  shouldCombatEnd,
} from './ParticipantCRUD';

// ===========================
// Damage and Healing
// ===========================
export {
  calculateDamageWithResistances,
  applyDamage,
  applyHealing,
  applyTemporaryHP,
} from './DamageHealing';

// ===========================
// Conditions
// ===========================
export { addCondition, removeCondition, hasCondition } from './ConditionManager';

// ===========================
// Death Saves
// ===========================
export {
  rollDeathSave,
  isDead,
  isUnconscious,
  isStable,
  stabilize,
  checkMassiveDamage,
} from './DeathSaves';

// ===========================
// Attack Rolls
// ===========================
export { rollAttack, doesAttackHit, rollDamage, getCriticalMultiplier } from './AttackRolls';

// ===========================
// Saving Throws
// ===========================
export { rollSavingThrow, checkConcentration, breakConcentration } from './SavingThrows';
