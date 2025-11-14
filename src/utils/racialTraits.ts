/**
 * Racial Traits Definitions and Utilities
 *
 * Defines all D&D 5e racial traits and their combat effects
 */

import type { RacialTrait, DamageType } from '@/types/combat';

/**
 * Get racial traits for a given race
 */
export function getRacialTraits(race: string): RacialTrait[] {
  const raceTraits: Record<string, RacialTrait[]> = {
    halfling: [
      {
        name: 'lucky',
        description:
          'When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
        type: 'passive',
        usesPerRest: 'none',
      },
      {
        name: 'brave',
        description: 'You have advantage on saving throws against being frightened.',
        type: 'passive',
        usesPerRest: 'none',
      },
    ],

    dragonborn: [
      {
        name: 'draconic_resistance',
        description:
          'You have resistance to the damage type associated with your draconic ancestry.',
        type: 'passive',
        usesPerRest: 'none',
        damageType: 'fire', // This would be determined by ancestry
      },
      {
        name: 'breath_weapon',
        description: 'You can use your action to exhale destructive energy.',
        type: 'active',
        usesPerRest: 'short',
        maxUses: 1,
        currentUses: 1,
        saveDC: 8, // Base + Con modifier + proficiency bonus
      },
    ],

    tiefling: [
      {
        name: 'hellish_resistance',
        description: 'You have resistance to fire damage.',
        type: 'passive',
        usesPerRest: 'none',
        damageType: 'fire',
      },
      {
        name: 'infernal_legacy',
        description:
          'You know the thaumaturgy cantrip. You can cast hellish rebuke once per day at 2nd level, and darkness once per day at 3rd level.',
        type: 'active',
        usesPerRest: 'long',
        maxUses: 2,
        currentUses: 2,
      },
    ],

    'half-orc': [
      {
        name: 'relentless_endurance',
        description:
          'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead.',
        type: 'reaction',
        usesPerRest: 'long',
        maxUses: 1,
        currentUses: 1,
      },
    ],

    elf: [
      {
        name: 'fey_ancestry',
        description:
          "You have advantage on saving throws against being charmed, and magic can't put you to sleep.",
        type: 'passive',
        usesPerRest: 'none',
      },
      {
        name: 'trance',
        description:
          "Elves don't need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day.",
        type: 'passive',
        usesPerRest: 'none',
      },
    ],

    dwarf: [
      {
        name: 'poison_resistance',
        description:
          'You have advantage on saving throws against poison, and you have resistance against poison damage.',
        type: 'passive',
        usesPerRest: 'none',
        damageType: 'poison',
      },
      {
        name: 'stonecunning',
        description:
          'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.',
        type: 'passive',
        usesPerRest: 'none',
      },
    ],
  };

  return raceTraits[race.toLowerCase()] || [];
}

/**
 * Check if a racial trait provides damage resistance
 */
export function getRacialResistances(racialTraits: RacialTrait[]): DamageType[] {
  return racialTraits
    .filter((trait) => trait.type === 'passive' && trait.damageType)
    .map((trait) => trait.damageType!)
    .filter(Boolean);
}

/**
 * Check if a racial trait provides advantage on saves
 */
export function hasRacialSaveAdvantage(racialTraits: RacialTrait[], saveType: string): boolean {
  // Check for specific advantages (brave against fear, fey ancestry against charm)
  if (saveType === 'frightened') {
    return racialTraits.some((trait) => trait.name === 'brave');
  }

  if (saveType === 'charmed') {
    return racialTraits.some((trait) => trait.name === 'fey_ancestry');
  }

  if (saveType === 'poison') {
    return racialTraits.some((trait) => trait.name === 'poison_resistance');
  }

  return false;
}

/**
 * Check if halfling lucky applies to a roll
 */
export function shouldApplyHalflingLucky(racialTraits: RacialTrait[], rollResult: number): boolean {
  const hasLucky = racialTraits.some((trait) => trait.name === 'lucky');
  return hasLucky && rollResult === 1;
}

/**
 * Get breath weapon save DC for dragonborn
 */
export function getBreathWeaponSaveDC(
  constitutionModifier: number,
  proficiencyBonus: number,
): number {
  return 8 + constitutionModifier + proficiencyBonus;
}

/**
 * Check if a trait can be used (has uses remaining)
 */
export function canUseRacialTrait(trait: RacialTrait): boolean {
  if (trait.type === 'passive') return true;
  if (!trait.maxUses) return true;

  return (trait.currentUses || 0) > 0;
}

/**
 * Use a racial trait (decrement uses)
 */
export function useRacialTrait(trait: RacialTrait): RacialTrait {
  if (trait.currentUses !== undefined && trait.currentUses > 0) {
    return {
      ...trait,
      currentUses: trait.currentUses - 1,
    };
  }
  return trait;
}

/**
 * Restore racial trait uses on rest
 */
export function restoreRacialTraits(
  traits: RacialTrait[],
  restType: 'short' | 'long',
): RacialTrait[] {
  return traits.map((trait) => {
    if (trait.usesPerRest === restType || (restType === 'long' && trait.usesPerRest === 'short')) {
      return {
        ...trait,
        currentUses: trait.maxUses || 0,
      };
    }
    return trait;
  });
}
