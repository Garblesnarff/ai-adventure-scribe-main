/**
 * Old-School Essentials (OSE) Game System Module
 *
 * This module provides game data for Old-School Essentials, including
 * both Classic Fantasy and Advanced Fantasy variants.
 */

// Export Classic Fantasy content
export * from './classic';

// Export types
export type {
  OSEClass,
  OSEAbility,
  OSESavingThrowCategory,
  OSESpellcasting,
} from './classic';
