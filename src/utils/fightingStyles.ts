/**
 * Fighting Styles for D&D 5e
 *
 * Handles all fighting styles and their combat effects
 */

import type { DiceRoll } from './diceUtils';
import type {
  FightingStyle,
  FightingStyleName,
  CombatParticipant,
  WeaponProperties,
} from '@/types/combat';

/**
 * All fighting styles and their effects
 */
export const FIGHTING_STYLES: Record<FightingStyleName, FightingStyle> = {
  defense: {
    name: 'defense',
    description: 'While you are wearing armor, you gain a +1 bonus to AC.',
    effect: {
      acBonus: 1,
    },
  },

  dueling: {
    name: 'dueling',
    description:
      'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.',
    effect: {
      damageBonus: 2,
    },
  },

  great_weapon_fighting: {
    name: 'great_weapon_fighting',
    description:
      'When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll.',
    effect: {
      rerollDamage: true,
    },
  },

  protection: {
    name: 'protection',
    description:
      'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll.',
    effect: {
      protectionReaction: true,
    },
  },

  archery: {
    name: 'archery',
    description: 'You gain a +2 bonus to attack rolls you make with ranged weapons.',
    effect: {
      attackBonus: 2,
    },
  },

  two_weapon_fighting: {
    name: 'two_weapon_fighting',
    description:
      'When you fight with two weapons, you can add your ability modifier to the damage of the second attack.',
    effect: {
      damageBonus: 0, // Applied specifically to off-hand attacks
    },
  },

  blessed_warrior: {
    name: 'blessed_warrior',
    description: 'You learn two cantrips of your choice from the cleric spell list.',
    effect: {},
  },

  blind_fighting: {
    name: 'blind_fighting',
    description: 'You have blindsight with a range of 10 feet.',
    effect: {},
  },
};

/**
 * Check if participant has a specific fighting style
 */
export function hasFightingStyle(
  participant: CombatParticipant,
  styleName: FightingStyleName,
): boolean {
  return participant.fightingStyles?.some((style) => style.name === styleName) || false;
}

/**
 * Get all fighting styles for a participant
 */
export function getFightingStyles(participant: CombatParticipant): FightingStyle[] {
  return participant.fightingStyles || [];
}

/**
 * Add fighting style to participant
 */
export function addFightingStyle(
  participant: CombatParticipant,
  styleName: FightingStyleName,
): CombatParticipant {
  const existingStyles = participant.fightingStyles || [];

  // Don't add duplicate styles
  if (existingStyles.some((style) => style.name === styleName)) {
    return participant;
  }

  const newStyle = FIGHTING_STYLES[styleName];

  return {
    ...participant,
    fightingStyles: [...existingStyles, newStyle],
  };
}

/**
 * Calculate AC bonus from fighting styles
 */
export function getFightingStyleACBonus(participant: CombatParticipant): number {
  let bonus = 0;

  // Defense fighting style
  if (hasFightingStyle(participant, 'defense')) {
    bonus += 1;
  }

  return bonus;
}

/**
 * Calculate attack roll bonus from fighting styles
 */
export function getFightingStyleAttackBonus(
  participant: CombatParticipant,
  isRangedAttack: boolean = false,
): number {
  let bonus = 0;

  // Archery fighting style
  if (isRangedAttack && hasFightingStyle(participant, 'archery')) {
    bonus += 2;
  }

  return bonus;
}

/**
 * Calculate damage bonus from fighting styles
 */
export function getFightingStyleDamageBonus(
  participant: CombatParticipant,
  weapon: { properties: WeaponProperties },
  isOffHandAttack: boolean = false,
): number {
  let bonus = 0;

  // Dueling fighting style
  if (hasFightingStyle(participant, 'dueling')) {
    // Only applies when wielding one-handed weapon with no other weapons
    const isOneHanded = !weapon.properties.twoHanded;
    const hasOffHandWeapon = participant.offHandWeapon !== undefined;

    if (isOneHanded && !hasOffHandWeapon && !isOffHandAttack) {
      bonus += 2;
    }
  }

  // Two-weapon fighting style (applies to off-hand attacks)
  if (isOffHandAttack && hasFightingStyle(participant, 'two_weapon_fighting')) {
    // This allows adding ability modifier to off-hand damage
    // The actual modifier is applied in the two-weapon fighting system
    // This just indicates the style is active
  }

  return bonus;
}

/**
 * Apply Great Weapon Fighting to damage rolls
 */
export function applyGreatWeaponFighting(
  participant: CombatParticipant,
  damageRoll: DiceRoll,
  weapon: { properties: WeaponProperties },
): DiceRoll {
  // Only applies to two-handed melee weapons
  if (!weapon.properties.twoHanded || !hasFightingStyle(participant, 'great_weapon_fighting')) {
    return damageRoll;
  }

  // Reroll 1s and 2s on damage dice
  const newResults = damageRoll.results.map((roll) => {
    if (roll === 1 || roll === 2) {
      // Reroll once
      const reroll = Math.floor(Math.random() * damageRoll.dieType) + 1;
      return reroll;
    }
    return roll;
  });

  const newTotal = newResults.reduce((sum, roll) => sum + roll, 0) + damageRoll.modifier;

  return {
    ...damageRoll,
    results: [...damageRoll.results], // Keep original for transparency
    keptResults: newResults,
    total: newTotal,
  };
}

/**
 * Check if Protection fighting style can be used
 */
export function canUseProtection(
  participant: CombatParticipant,
  ally: CombatParticipant,
  attacker: CombatParticipant,
): {
  canUse: boolean;
  reason?: string;
} {
  if (!hasFightingStyle(participant, 'protection')) {
    return { canUse: false, reason: 'No Protection fighting style' };
  }

  if (participant.reactionTaken) {
    return { canUse: false, reason: 'Reaction already used this turn' };
  }

  // Must have shield equipped (simplified check)
  const hasShield = participant.armorClass >= 16; // Simplified shield detection
  if (!hasShield) {
    return { canUse: false, reason: 'Must have a shield equipped' };
  }

  // Must be within 5 feet of ally (simplified)
  const isWithinRange = true; // Would check actual positioning
  if (!isWithinRange) {
    return { canUse: false, reason: 'Ally must be within 5 feet' };
  }

  // Must be able to see the attacker
  const canSeeAttacker = true; // Would check vision and line of sight
  if (!canSeeAttacker) {
    return { canUse: false, reason: 'Cannot see the attacker' };
  }

  return { canUse: true };
}

/**
 * Apply Blind Fighting benefits
 */
export function applyBlindFighting(participant: CombatParticipant): CombatParticipant {
  if (!hasFightingStyle(participant, 'blind_fighting')) {
    return participant;
  }

  // Grant blindsight 10 feet
  const currentVisions = participant.visionTypes || [];
  const hasBlindSight = currentVisions.some((v) => v.type === 'blindsight');

  if (!hasBlindSight) {
    return {
      ...participant,
      visionTypes: [...currentVisions, { type: 'blindsight', range: 10 }],
    };
  }

  return participant;
}

/**
 * Get available cantrips from Blessed Warrior
 */
export function getBlessedWarriorCantrips(participant: CombatParticipant): string[] {
  if (!hasFightingStyle(participant, 'blessed_warrior')) {
    return [];
  }

  // In a real implementation, this would be stored on the character
  // For now, return some common options
  return ['guidance', 'thaumaturgy', 'sacred_flame', 'word_of_radiance'];
}

/**
 * Check if weapon qualifies for specific fighting style
 */
export function weaponQualifiesForStyle(
  weapon: { properties: WeaponProperties },
  styleName: FightingStyleName,
): boolean {
  switch (styleName) {
    case 'dueling':
      // Must be one-handed melee weapon
      return !weapon.properties.twoHanded;

    case 'great_weapon_fighting':
      // Must be two-handed melee weapon
      return weapon.properties.twoHanded || weapon.properties.versatile;

    case 'two_weapon_fighting':
      // Must be light weapon (or have Dual Wielder feat)
      return weapon.properties.light || false;

    default:
      return true;
  }
}

/**
 * Get fighting style recommendations for a character build
 */
export function getFightingStyleRecommendations(
  characterClass: string,
  weaponPreference: 'one-handed' | 'two-handed' | 'ranged' | 'dual-wield',
): FightingStyleName[] {
  const recommendations: FightingStyleName[] = [];

  switch (weaponPreference) {
    case 'one-handed':
      recommendations.push('dueling', 'defense', 'protection');
      break;

    case 'two-handed':
      recommendations.push('great_weapon_fighting', 'defense');
      break;

    case 'ranged':
      recommendations.push('archery', 'defense');
      break;

    case 'dual-wield':
      recommendations.push('two_weapon_fighting', 'defense');
      break;
  }

  // Class-specific recommendations
  if (characterClass.toLowerCase() === 'paladin') {
    recommendations.push('blessed_warrior');
  }

  // Blind Fighting is good for any build in certain campaigns
  recommendations.push('blind_fighting');

  return recommendations;
}

/**
 * Calculate total AC including fighting style bonuses
 */
export function getTotalAC(participant: CombatParticipant): number {
  let totalAC = participant.armorClass;

  // Add fighting style bonuses
  totalAC += getFightingStyleACBonus(participant);

  // Add other bonuses (shields, cover, etc.)
  if (participant.cover) {
    totalAC += participant.cover.acBonus;
  }

  return totalAC;
}
