/**
 * Two-weapon fighting utility functions for D&D 5e combat
 */

import { getEquippedWeapons } from './equipmentUtils';

import type { CombatParticipant, CombatAction, DamageType } from '@/types/combat';

import { rollAttack, rollDamage } from '@/utils/diceUtils';

/**
 * Checks if a participant can use two-weapon fighting
 * Requirements: Must have light weapons in both hands, not using a shield
 */
export function canUseTwoWeaponFighting(participant: CombatParticipant): boolean {
  const weapons = getEquippedWeapons(participant);
  const mainWeapon = weapons.mainHand;
  const offHandWeapon = weapons.offHand;

  // Must have weapons in both hands
  if (!mainWeapon || !offHandWeapon) {
    return false;
  }

  // Both must be light weapons
  const mainIsLight = !!mainWeapon.weaponProperties?.light;
  const offIsLight = !!offHandWeapon.weaponProperties?.light;

  if (!mainIsLight || !offIsLight) {
    return false;
  }

  // Cannot use if holding a shield or spellcasting focus in off hand
  const offHandIsShield =
    offHandWeapon.category === 'shield' || offHandWeapon.name?.toLowerCase().includes('shield');
  const offHandIsFocus = offHandWeapon.subcategory?.toLowerCase().includes('focus') || false;

  if (offHandIsShield || offHandIsFocus) {
    return false;
  }

  // Check if bonus action is available
  const bonusActionAvailable = !participant.bonusActionTaken;

  return bonusActionAvailable;
}

/**
 * Creates a main hand attack action for two-weapon fighting
 */
export function makeMainHandAttack(
  participant: CombatParticipant,
  targetId?: string,
): Partial<CombatAction> {
  const weapons = getEquippedWeapons(participant);
  const mainWeapon = weapons.mainHand;

  if (!mainWeapon) {
    throw new Error('No main hand weapon equipped');
  }

  // Calculate attack bonus (use DEX if finesse or ranged)
  const getAbilityMod = (p: CombatParticipant, ability: 'strength' | 'dexterity'): number => {
    const base: unknown = p as unknown;
    if (base && typeof base === 'object' && 'abilityScores' in (base as Record<string, unknown>)) {
      const as = (base as Record<string, unknown>).abilityScores;
      if (as && typeof as === 'object' && as !== null) {
        const abilityObj = (as as Record<string, unknown>)[ability];
        if (abilityObj && typeof abilityObj === 'object') {
          const mod = (abilityObj as Record<string, unknown>).modifier;
          if (typeof mod === 'number') return mod;
        }
      }
    }
    return 0;
  };
  const strMod = getAbilityMod(participant, 'strength');
  const dexMod = getAbilityMod(participant, 'dexterity');
  const usesDex = !!mainWeapon.weaponProperties?.finesse || !!mainWeapon.range;
  const abilityModifier = usesDex ? dexMod : strMod;
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const attackBonus = abilityModifier + proficiencyBonus + (mainWeapon.attackBonus || 0);

  // Roll attack
  const attackRoll = rollAttack(attackBonus, {
    advantage: false,
    disadvantage: false,
  });

  // Damage rolls (dice only); add ability modifier separately
  const damageRolls = rollDamage(mainWeapon.damage!.dice, attackRoll.critical, {});
  const diceTotal = damageRolls.reduce(
    (sum, dr) => sum + dr.keptResults.reduce((a, b) => a + b, 0) + dr.modifier,
    0,
  );
  const totalDamage =
    diceTotal +
    abilityModifier +
    (mainWeapon.weaponProperties?.magical ? mainWeapon.magicBonus || 0 : 0);

  return {
    participantId: participant.id,
    targetParticipantId: targetId,
    actionType: 'attack' as const,
    description: `${participant.name} attacks with ${mainWeapon.name} (main hand)`,
    attackRoll,
    damageRolls,
    damageDealt: totalDamage,
    damageType: (mainWeapon.damage!.type as DamageType) || 'slashing',
    timestamp: new Date(),
  };
}

/**
 * Creates an off-hand attack action for two-weapon fighting
 * Note: Off-hand attacks do not add ability modifier to damage
 */
export function makeOffHandAttack(
  participant: CombatParticipant,
  targetId?: string,
): Partial<CombatAction> {
  const weapons = getEquippedWeapons(participant);
  const offHandWeapon = weapons.offHand;

  if (!offHandWeapon) {
    throw new Error('No off-hand weapon equipped');
  }

  // Calculate attack bonus (use DEX if finesse or ranged)
  const getAbilityMod = (p: CombatParticipant, ability: 'strength' | 'dexterity'): number => {
    const base: unknown = p as unknown;
    if (base && typeof base === 'object' && 'abilityScores' in (base as Record<string, unknown>)) {
      const as = (base as Record<string, unknown>).abilityScores;
      if (as && typeof as === 'object' && as !== null) {
        const abilityObj = (as as Record<string, unknown>)[ability];
        if (abilityObj && typeof abilityObj === 'object') {
          const mod = (abilityObj as Record<string, unknown>).modifier;
          if (typeof mod === 'number') return mod;
        }
      }
    }
    return 0;
  };
  const strMod = getAbilityMod(participant, 'strength');
  const dexMod = getAbilityMod(participant, 'dexterity');
  const usesDex = !!offHandWeapon.weaponProperties?.finesse || !!offHandWeapon.range;
  const abilityModifier = usesDex ? dexMod : strMod;
  const proficiencyBonus = Math.floor((participant.level || 1) / 4) + 2;
  const attackBonus = abilityModifier + proficiencyBonus + (offHandWeapon.attackBonus || 0);

  // Roll attack
  const attackRoll = rollAttack(attackBonus, {
    advantage: false,
    disadvantage: false,
  });

  // Damage rolls (dice only); off-hand normally excludes ability mod
  const damageRolls = rollDamage(offHandWeapon.damage!.dice, attackRoll.critical, {});
  const diceTotal = damageRolls.reduce(
    (sum, dr) => sum + dr.keptResults.reduce((a, b) => a + b, 0) + dr.modifier,
    0,
  );
  const hasTWFStyle = participant.fightingStyles?.some((fs) => fs.name === 'two_weapon_fighting');
  const abilityBonus = hasTWFStyle ? abilityModifier : 0;
  const totalDamage =
    diceTotal +
    abilityBonus +
    (offHandWeapon.weaponProperties?.magical ? offHandWeapon.magicBonus || 0 : 0);

  return {
    participantId: participant.id,
    targetParticipantId: targetId,
    actionType: 'off_hand_attack',
    description: `${participant.name} attacks with ${offHandWeapon.name} (off-hand)`,
    attackRoll,
    damageRolls,
    damageDealt: totalDamage,
    damageType: (offHandWeapon.damage!.type as DamageType) || 'slashing',
    timestamp: new Date(),
  };
}

/**
 * Checks if off-hand attack can be made (bonus action available)
 */
export function canMakeOffHandAttack(participant: CombatParticipant): boolean {
  // Check if two-weapon fighting is possible and bonus action is available
  const canTwoWeaponFight = canUseTwoWeaponFighting(participant);
  const bonusActionAvailable = !participant.bonusActionTaken;

  return canTwoWeaponFight && bonusActionAvailable;
}

/**
 * Calculates total attacks possible with two-weapon fighting
 */
export function calculateTwoWeaponAttacks(participant: CombatParticipant): {
  mainHandAttacks: number;
  offHandAttacks: number;
  totalAttacks: number;
} {
  const weapons = getEquippedWeapons(participant);
  const mainWeapon = weapons.mainHand;
  const offHandWeapon = weapons.offHand;

  let mainHandAttacks = 1; // Base action
  let offHandAttacks = 0;

  // Extra Attack feature (level 5+ for most martial classes)
  if (
    participant.level &&
    participant.level >= 5 &&
    ['fighter', 'paladin', 'ranger', 'barbarian'].includes(participant.characterClass || '')
  ) {
    mainHandAttacks += 1;
  }

  // Action Surge for fighters (if available)
  if (
    participant.characterClass === 'fighter' &&
    participant.level &&
    participant.level >= 2 &&
    participant.resources?.action_surge?.currentUses &&
    participant.resources.action_surge.currentUses > 0
  ) {
    mainHandAttacks += 1; // Additional action
  }

  // Off-hand attack if conditions met
  if (canMakeOffHandAttack(participant)) {
    offHandAttacks = 1;
  }

  return {
    mainHandAttacks,
    offHandAttacks,
    totalAttacks: mainHandAttacks + offHandAttacks,
  };
}

/**
 * Gets the attack sequence for two-weapon fighting
 */
export function getTwoWeaponAttackSequence(participant: CombatParticipant): string[] {
  const attacks = calculateTwoWeaponAttacks(participant);
  const sequence: string[] = [];

  // Main hand attacks first (action)
  for (let i = 0; i < attacks.mainHandAttacks; i++) {
    sequence.push('main_hand');
  }

  // Off-hand attack (bonus action)
  if (attacks.offHandAttacks > 0) {
    sequence.push('off_hand');
  }

  return sequence;
}
