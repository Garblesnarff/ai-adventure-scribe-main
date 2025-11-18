/**
 * Knave RPG Game System Provider
 *
 * Implementation of the Knave classless OSR system provider.
 * Knave is a rules-light toolkit that removes character classes entirely,
 * allowing players to define their character through ability scores and equipment choices.
 *
 * @module data/game-systems/knave/provider
 */

import { GameSystemProvider } from '../base/GameSystemProvider';
import type { GameSystemConfig } from '@/types/game-systems';
import { KNAVE_CONFIG } from './config';

/**
 * Knave RPG Game System Provider
 *
 * Provides all methods required for character creation, calculations, and system rules
 * implementation for Knave, a classless OSR system that emphasizes equipment and simplicity.
 *
 * Key characteristics:
 * - Classless character system (no character classes)
 * - No races or racial mechanics
 * - No character backgrounds
 * - Spells are acquired as books and items rather than as class features
 * - Standard d20 ability scores (STR, DEX, CON, INT, WIS, CHA)
 * - AC calculation: 11 + DEX modifier + armor bonus
 * - HP: 1d8 per level (average 4.5 per level, rounded to 5)
 * - Proficiency bonus equals character level
 *
 * @class KnaveProvider
 * @extends {GameSystemProvider}
 */
export class KnaveProvider extends GameSystemProvider {
  /**
   * Returns the configuration for the Knave RPG system.
   *
   * @readonly
   * @type {GameSystemConfig}
   */
  readonly config: GameSystemConfig = KNAVE_CONFIG;

  /**
   * Returns the available character classes for Knave.
   * Knave is a classless system, so this returns null.
   *
   * @returns {null} Knave has no character classes
   */
  getClasses(): null {
    return null;
  }

  /**
   * Returns the available character races for Knave.
   * Knave has no mechanical races, so this returns null.
   *
   * @returns {null} Knave has no character races
   */
  getRaces(): null {
    return null;
  }

  /**
   * Returns the available character backgrounds for Knave.
   * Knave does not use backgrounds, so this returns null.
   *
   * @returns {null} Knave does not use backgrounds
   */
  getBackgrounds(): null {
    return null;
  }

  /**
   * Returns the available spells for Knave.
   * In Knave, spells are acquired as books and items rather than as class features,
   * so this returns null for now. Spells should be handled through the equipment system.
   *
   * @param {number} [level] - Optional spell level (unused)
   * @param {string} [className] - Optional class name (unused)
   * @returns {null} Spells are handled as items in Knave
   */
  getSpells(level?: number, className?: string): null {
    return null;
  }

  /**
   * Returns the available cantrips for Knave.
   * Knave does not use cantrips or spell levels, so this returns null.
   *
   * @param {string} [className] - Optional class name (unused)
   * @returns {null} Knave does not use cantrips
   */
  getCantrips(className?: string): null {
    return null;
  }

  /**
   * Returns the available weapons for Knave.
   * Includes basic OSR weapons suitable for classic dungeon exploration.
   *
   * @returns {Array} Array of weapon options with damage and properties
   */
  getWeapons(): any[] {
    return [
      // Melee Weapons
      {
        id: 'dagger',
        name: 'Dagger',
        type: 'melee',
        damage: '1d4',
        weight: 1,
        cost: '5 gp',
      },
      {
        id: 'mace',
        name: 'Mace',
        type: 'melee',
        damage: '1d6',
        weight: 4,
        cost: '5 gp',
      },
      {
        id: 'hand-axe',
        name: 'Hand Axe',
        type: 'melee',
        damage: '1d6',
        weight: 3,
        cost: '5 gp',
      },
      {
        id: 'shortsword',
        name: 'Shortsword',
        type: 'melee',
        damage: '1d6',
        weight: 3,
        cost: '10 gp',
      },
      {
        id: 'longsword',
        name: 'Longsword',
        type: 'melee',
        damage: '1d8',
        weight: 5,
        cost: '10 gp',
      },
      {
        id: 'greataxe',
        name: 'Greataxe',
        type: 'melee',
        damage: '1d10',
        weight: 7,
        cost: '30 gp',
        properties: ['two-handed'],
      },
      {
        id: 'spear',
        name: 'Spear',
        type: 'melee',
        damage: '1d6',
        weight: 3,
        cost: '5 gp',
        properties: ['versatile', 'thrown'],
      },
      {
        id: 'staff',
        name: 'Staff',
        type: 'melee',
        damage: '1d6',
        weight: 4,
        cost: '5 gp',
        properties: ['two-handed'],
      },

      // Ranged Weapons
      {
        id: 'sling',
        name: 'Sling',
        type: 'ranged',
        damage: '1d4',
        weight: 0,
        cost: '1 sp',
      },
      {
        id: 'shortbow',
        name: 'Shortbow',
        type: 'ranged',
        damage: '1d6',
        weight: 2,
        cost: '25 gp',
      },
      {
        id: 'longbow',
        name: 'Longbow',
        type: 'ranged',
        damage: '1d8',
        weight: 3,
        cost: '50 gp',
      },
      {
        id: 'crossbow',
        name: 'Crossbow',
        type: 'ranged',
        damage: '1d8',
        weight: 5,
        cost: '30 gp',
      },
    ];
  }

  /**
   * Returns the available armor for Knave.
   * Includes basic OSR armor types with armor class bonuses.
   *
   * @returns {Array} Array of armor options with AC values
   */
  getArmor(): any[] {
    return [
      {
        id: 'leather',
        name: 'Leather Armor',
        type: 'light',
        acBonus: 1,
        weight: 10,
        cost: '10 gp',
      },
      {
        id: 'scale',
        name: 'Scale Mail',
        type: 'medium',
        acBonus: 2,
        weight: 25,
        cost: '50 gp',
      },
      {
        id: 'chainmail',
        name: 'Chainmail',
        type: 'medium',
        acBonus: 3,
        weight: 40,
        cost: '75 gp',
      },
      {
        id: 'plate',
        name: 'Plate Armor',
        type: 'heavy',
        acBonus: 4,
        weight: 65,
        cost: '500 gp',
        properties: ['heavy', 'disadvantage-on-stealth'],
      },
      {
        id: 'shield',
        name: 'Shield',
        type: 'accessory',
        acBonus: 1,
        weight: 6,
        cost: '10 gp',
      },
    ];
  }

  /**
   * Returns the available adventuring gear for Knave.
   * Includes common equipment for dungeon exploration and survival.
   *
   * @returns {Array} Array of gear and equipment items
   */
  getGear(): any[] {
    return [
      // Adventuring Essentials
      {
        id: 'rope-50ft',
        name: 'Rope (50 ft)',
        type: 'utility',
        weight: 5,
        cost: '1 gp',
      },
      {
        id: 'backpack',
        name: 'Backpack',
        type: 'container',
        weight: 5,
        cost: '5 gp',
      },
      {
        id: 'waterskin',
        name: 'Waterskin',
        type: 'container',
        weight: 1,
        cost: '5 sp',
      },
      {
        id: 'bedroll',
        name: 'Bedroll',
        type: 'utility',
        weight: 5,
        cost: '1 gp',
      },
      {
        id: 'torch',
        name: 'Torch (10)',
        type: 'light',
        weight: 1,
        cost: '1 gp',
        quantity: 10,
      },
      {
        id: 'lantern',
        name: 'Lantern',
        type: 'light',
        weight: 2,
        cost: '5 gp',
      },
      {
        id: 'oil-flask',
        name: 'Oil Flask',
        type: 'utility',
        weight: 1,
        cost: '1 sp',
      },
      {
        id: 'tinderbox',
        name: 'Tinderbox',
        type: 'utility',
        weight: 1,
        cost: '5 sp',
      },
      {
        id: 'rations',
        name: 'Rations (1 day)',
        type: 'consumable',
        weight: 1,
        cost: '5 sp',
      },
      {
        id: 'crowbar',
        name: 'Crowbar',
        type: 'tool',
        weight: 5,
        cost: '2 gp',
      },
      {
        id: 'holy-symbol',
        name: 'Holy Symbol',
        type: 'religious',
        weight: 1,
        cost: '5 gp',
      },
      {
        id: 'thieves-tools',
        name: "Thieves' Tools",
        type: 'tool',
        weight: 1,
        cost: '25 gp',
      },
      {
        id: 'spellbook',
        name: 'Spellbook (blank)',
        type: 'book',
        weight: 3,
        cost: '50 gp',
      },
      {
        id: 'dice-set',
        name: 'Dice Set',
        type: 'gaming',
        weight: 0,
        cost: '1 sp',
      },
      {
        id: 'caltrops',
        name: 'Caltrops (10)',
        type: 'tool',
        weight: 2,
        cost: '1 gp',
        quantity: 10,
      },
    ];
  }

  /**
   * Calculates the ability modifier from an ability score.
   * Uses the standard D&D formula: (score - 10) / 2, rounded down.
   *
   * @param {number} score - The ability score (3-18)
   * @returns {number} The calculated modifier
   * @example
   * calculateAbilityModifier(16) // Returns 3
   * calculateAbilityModifier(10) // Returns 0
   * calculateAbilityModifier(8)  // Returns -1
   */
  calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Calculates the proficiency bonus for a given character level.
   * In Knave, the proficiency bonus equals the character level.
   *
   * @param {number} level - The character level (1-10)
   * @returns {number} The proficiency bonus
   * @example
   * calculateProficiencyBonus(1)  // Returns 1
   * calculateProficiencyBonus(5)  // Returns 5
   * calculateProficiencyBonus(10) // Returns 10
   */
  calculateProficiencyBonus(level: number): number {
    return level;
  }

  /**
   * Calculates the hit points for a character.
   * Knave uses 1d8 per level with CON modifier applied to all levels.
   * Average of 1d8 is 4.5, rounded to 5 per level for simplicity.
   *
   * @param {string} className - Unused in Knave (classless system)
   * @param {number} level - The character level
   * @param {number} conMod - The Constitution modifier
   * @returns {number} The total hit points
   * @example
   * calculateHitPoints('', 1, 0)  // Returns 5
   * calculateHitPoints('', 3, 2)  // Returns 21 (5+2 + 5+2 + 5+2)
   */
  calculateHitPoints(className: string, level: number, conMod: number): number {
    // 1d8 average is 4.5, rounded to 5 per level
    const hpPerLevel = 5;
    const baseHP = hpPerLevel + conMod;
    return Math.max(1, baseHP * level); // Minimum 1 HP per level
  }

  /**
   * Calculates the armor class for a character.
   * Base AC is 10, plus DEX modifier, plus armor bonus if equipped.
   *
   * @param {number} baseAC - The base armor class (usually 10)
   * @param {number} dexMod - The Dexterity modifier
   * @param {any} [armor] - Optional armor object with acBonus property
   * @param {boolean} [shield] - Whether a shield is equipped (adds 1 to AC)
   * @returns {number} The total armor class
   * @example
   * calculateArmorClass(10, 2)                    // Returns 12 (10 + 2 DEX)
   * calculateArmorClass(10, -1, chainmail, false) // Returns 12 (10 - 1 + 3 chainmail)
   * calculateArmorClass(10, 1, leather, true)     // Returns 12 (10 + 1 + 1 leather + 1 shield)
   */
  calculateArmorClass(
    baseAC: number,
    dexMod: number,
    armor?: any,
    shield?: boolean
  ): number {
    let ac = baseAC + dexMod;

    if (armor?.acBonus) {
      ac += armor.acBonus;
    }

    if (shield) {
      ac += 1;
    }

    return ac;
  }

  /**
   * Returns the ordered steps for character creation in Knave.
   * Follows a logical progression from basic info to finalization.
   *
   * @returns {string[]} Array of character creation step IDs in order
   */
  getCharacterCreationSteps(): string[] {
    return ['basic-info', 'ability-scores', 'equipment', 'finalization'];
  }

  /**
   * Validates a character object for completeness and rule compliance.
   * Checks that all 6 ability scores are set with valid values.
   *
   * @param {any} character - The character data to validate
   * @returns {Object} Validation result with success flag and error messages
   * @returns {boolean} result.isValid - Whether the character is valid
   * @returns {string[]} result.errors - Array of validation error messages
   */
  validateCharacter(character: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if character exists
    if (!character) {
      return {
        isValid: false,
        errors: ['Character data is missing'],
      };
    }

    // Check all 6 ability scores are set
    const requiredAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    const abilities = character.abilities || {};

    for (const ability of requiredAbilities) {
      if (abilities[ability] === undefined || abilities[ability] === null) {
        errors.push(`Missing ability score: ${ability.toUpperCase()}`);
      } else if (typeof abilities[ability] !== 'number') {
        errors.push(`${ability.toUpperCase()} must be a number`);
      } else if (abilities[ability] < 3 || abilities[ability] > 18) {
        errors.push(
          `${ability.toUpperCase()} must be between 3 and 18, got ${abilities[ability]}`
        );
      }
    }

    // Check for basic character name
    if (!character.name || character.name.trim().length === 0) {
      errors.push('Character must have a name');
    }

    // Check character level
    if (character.level === undefined || character.level === null) {
      errors.push('Character must have a level');
    } else if (character.level < 1 || character.level > 10) {
      errors.push('Character level must be between 1 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Returns system-specific features and metadata for Knave.
   *
   * @returns {Object} Object containing system features and configuration
   * @returns {boolean} result.classless - Knave is classless
   * @returns {boolean} result.raceless - Knave has no races
   * @returns {boolean} result.itemBased - Characters are defined by equipment
   * @returns {Object} result.levelRange - Level progression range
   */
  getSystemFeatures(): Record<string, any> {
    return {
      classless: true,
      raceless: true,
      itemBased: true,
      levelRange: {
        min: 1,
        max: 10,
      },
      equipmentDriven: true,
      rollUnderSystem: true,
      spellsAsItems: true,
    };
  }
}
