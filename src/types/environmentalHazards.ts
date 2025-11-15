/**
 * Environmental Hazards System for D&D 5e
 *
 * Data models for environmental hazards, their effects, and interactions
 */

import type { Character } from '@/types/character';
import type { DamageType, ConditionName } from '@/types/combat';

// ===========================
// Environmental Hazard Types
// ===========================

export type EnvironmentalHazardType =
  | 'acid_pool'
  | 'caustic_fog'
  | 'crushing_walls'
  | 'electrified_surface'
  | 'entangling_undergrowth'
  | 'erupting_geyser'
  | 'extreme_cold'
  | 'extreme_heat'
  | 'falling_rocks'
  | 'fiery_pit'
  | 'force_vortex'
  | 'freezing_water'
  | 'grasping_tendrils'
  | 'illusory_terrain'
  | 'lava_flow'
  | 'lightning_storm'
  | 'poisonous_spores'
  | 'quicksand'
  | 'razor_wire'
  | 'slippery_ice'
  | 'spiked_pit'
  | 'sticky_webbing'
  | 'thunder_clap'
  | 'toxic_waste'
  | 'vacuum'
  | 'volcanic_ash'
  | 'whirlpool'
  | 'zone_of_truth';

// ===========================
// Environmental Hazard Data Model
// ===========================

export interface EnvironmentalHazard {
  id: string;
  name: string;
  type: EnvironmentalHazardType;
  description: string;
  // Hazard properties
  isInstant?: boolean; // One-time effect vs. ongoing
  isAreaEffect?: boolean; // Affects an area vs. single target
  areaOfEffect?: {
    shape: 'sphere' | 'cube' | 'cone' | 'line';
    size: number; // in feet
  };
  // Detection properties
  detectDC?: number; // DC to notice the hazard
  detectSkill?: 'perception' | 'investigation' | 'survival';
  // Saving throw properties
  saveDC?: number;
  saveAbility?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  // Damage properties
  damage?: {
    dice: string; // e.g., "2d6"
    type: DamageType;
    onFail: 'half' | 'full'; // damage taken on failed save
    onSuccess: 'none' | 'half'; // damage taken on successful save
  };
  // Condition effects
  conditions?: Array<{
    name: ConditionName;
    duration: number; // rounds, -1 for until removed
    saveEnds?: boolean; // can save to end early
  }>;
  // Special effects
  specialEffects?: string[];
  // Exhaustion effects
  exhaustionLevel?: number; // Level of exhaustion applied (1-6)
  // Movement effects
  movementModifier?: number; // Multiplier to movement speed
  // Duration for ongoing effects
  duration?: number; // rounds for ongoing hazards
  // Recharge properties for hazards that can reset
  rechargeRate?: 'immediate' | 'round' | 'minute' | 'hour' | 'day';
  // Trigger conditions
  trigger?: 'enter' | 'move' | 'action' | 'end_turn' | 'start_turn';
  // Stealth properties
  isHidden?: boolean;
}

// ===========================
// Hazard Interaction Data Model
// ===========================

export interface HazardInteraction {
  hazardId: string;
  characterId: string;
  interactionType: 'detect' | 'trigger' | 'avoid' | 'mitigate';
  rollResult?: number;
  success?: boolean;
  damageDealt?: number;
  conditionsApplied?: ConditionName[];
  exhaustionApplied?: number;
  notes?: string;
  timestamp: string;
}

// ===========================
// Hazard Detection Result
// ===========================

export interface HazardDetectionResult {
  detected: boolean;
  rollResult?: number;
  dc?: number;
  description?: string;
}

// ===========================
// Hazard Save Result
// ===========================

export interface HazardSaveResult {
  saved: boolean;
  rollResult?: number;
  dc?: number;
  damageTaken?: number;
  conditionsApplied?: ConditionName[];
  exhaustionApplied?: number;
  description?: string;
}

// ===========================
// Hazard Manager Interface
// ===========================

export interface HazardManager {
  // Hazard detection
  detectHazard: (character: Character, hazard: EnvironmentalHazard) => HazardDetectionResult;

  // Hazard interaction
  interactWithHazard: (character: Character, hazard: EnvironmentalHazard) => HazardSaveResult;

  // Apply hazard effects
  applyHazardEffects: (
    character: Character,
    hazard: EnvironmentalHazard,
    saveResult: HazardSaveResult,
  ) => Character;

  // Calculate damage
  calculateHazardDamage: (hazard: EnvironmentalHazard, saveSuccess: boolean) => number;

  // Check if character is immune or resistant
  checkImmunities: (
    character: Character,
    hazard: EnvironmentalHazard,
  ) => {
    immune: boolean;
    resistant: boolean;
    vulnerable: boolean;
  };
}
