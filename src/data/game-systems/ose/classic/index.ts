/**
 * OSE Classic Fantasy Module Index
 *
 * Exports all OSE Classic Fantasy game data including classes,
 * helper functions, and type definitions.
 */

export {
  OSE_CLASSIC_CLASSES,
  getOSEClassById,
  getHumanClasses,
  getRaceClasses,
  getClassesByPrimeRequisite,
  getSpellcastingClasses,
  calculateXPBonus,
  getSavingThrow,
  getAttackBonus,
  getSpellSlots,
  isSpellcaster,
  isRaceClass,
} from './classes';

export type {
  OSEClass,
  OSEAbility,
  OSESavingThrowCategory,
  OSESpellcasting,
} from './classes';
