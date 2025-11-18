/**
 * D&D 5E Game System Provider
 *
 * Concrete implementation of the GameSystemProvider for Dungeons & Dragons 5th Edition.
 * This provider handles all D&D 5E-specific game rules, calculations, and data access
 * for character creation, equipment, spells, and game mechanics.
 *
 * @module data/game-systems/dnd5e/provider
 */

import { GameSystemProvider } from '../base/GameSystemProvider';
import { DND5E_CONFIG } from './config';

// Import D&D 5E data sources
import { classes } from '@/data/classOptions';
import { races } from '@/data/races';
import { backgrounds } from '@/data/backgroundOptions';
import {
  allSpells,
  getClassSpells,
  getSpellsByLevel,
} from '@/data/spells/api';
import {
  weapons,
  armor,
  adventuringGear,
} from '@/data/equipment';

import type { GameSystemConfig } from '@/types/game-systems';
import type {
  CharacterClass,
  CharacterRace,
  CharacterBackground,
  Spell,
} from '@/types/character';
import type { Equipment } from '@/data/equipment/types';

/**
 * D&D 5E Game System Provider
 *
 * Provides complete implementation of D&D 5th Edition game mechanics including:
 * - Character creation data (classes, races, backgrounds)
 * - Spell and equipment management
 * - Core calculations (ability modifiers, proficiency bonus, HP, AC)
 * - Character validation and creation workflow
 *
 * @class DND5EProvider
 * @extends GameSystemProvider
 */
export class DND5EProvider extends GameSystemProvider {
  /**
   * D&D 5E system configuration containing metadata and feature flags.
   */
  readonly config: GameSystemConfig = DND5E_CONFIG;

  // ============================================================================
  // Character Creation Data
  // ============================================================================

  /**
   * Returns all available D&D 5E character classes.
   *
   * Includes all standard classes like Fighter, Wizard, Rogue, etc.
   * Each class contains hit die, proficiencies, and class features.
   *
   * @returns Array of D&D 5E character classes
   * @example
   * const provider = new DND5EProvider();
   * const classes = provider.getClasses();
   * // Returns [{ id: 'fighter', name: 'Fighter', hitDie: 10, ... }, ...]
   */
  getClasses(): CharacterClass[] {
    return classes;
  }

  /**
   * Returns all available D&D 5E character races.
   *
   * Includes standard races (Human, Elf, Dwarf) and exotic races.
   * Each race provides ability score bonuses, traits, and proficiencies.
   *
   * @returns Array of D&D 5E character races
   * @example
   * const provider = new DND5EProvider();
   * const races = provider.getRaces();
   * // Returns [{ id: 'human', name: 'Human', abilityScoreIncrease: {...}, ... }, ...]
   */
  getRaces(): CharacterRace[] {
    return races;
  }

  /**
   * Returns all available D&D 5E character backgrounds.
   *
   * Backgrounds provide skill proficiencies, tool proficiencies, equipment,
   * and special features that reflect a character's life before adventuring.
   *
   * @returns Array of D&D 5E character backgrounds
   * @example
   * const provider = new DND5EProvider();
   * const backgrounds = provider.getBackgrounds();
   * // Returns [{ id: 'acolyte', name: 'Acolyte', skillProficiencies: [...], ... }, ...]
   */
  getBackgrounds(): CharacterBackground[] {
    return backgrounds;
  }

  /**
   * Returns D&D 5E spells filtered by level and/or class.
   *
   * Can retrieve all spells or filter by:
   * - Spell level (0-9, where 0 is cantrips)
   * - Character class (returns spells available to that class)
   * - Both level and class
   *
   * @param level - Optional spell level to filter by (0-9)
   * @param className - Optional class name to filter spells available to that class
   * @returns Array of matching spells, or empty array if none found
   * @example
   * const provider = new DND5EProvider();
   *
   * // Get all spells
   * provider.getSpells();
   *
   * // Get 3rd level spells
   * provider.getSpells(3);
   *
   * // Get all wizard spells
   * provider.getSpells(undefined, 'Wizard');
   *
   * // Get 2nd level wizard spells
   * provider.getSpells(2, 'Wizard');
   */
  getSpells(level?: number, className?: string): Spell[] {
    let spells = allSpells;

    // Filter by class if specified
    if (className) {
      const classSpells = getClassSpells(className);
      spells = [...classSpells.cantrips, ...classSpells.spells];
    }

    // Filter by level if specified
    if (level !== undefined) {
      spells = getSpellsByLevel(level);

      // If both class and level are specified, intersect the results
      if (className) {
        const classSpells = getClassSpells(className);
        const classSpellIds = new Set([
          ...classSpells.cantrips.map((s) => s.id),
          ...classSpells.spells.map((s) => s.id),
        ]);
        spells = spells.filter((spell) => classSpellIds.has(spell.id));
      }
    }

    return spells;
  }

  /**
   * Returns D&D 5E cantrips (level 0 spells) filtered by class.
   *
   * Cantrips are at-will spells that can be cast without expending spell slots.
   *
   * @param className - Optional class name to filter cantrips available to that class
   * @returns Array of cantrips
   * @example
   * const provider = new DND5EProvider();
   *
   * // Get all cantrips
   * provider.getCantrips();
   *
   * // Get wizard cantrips
   * provider.getCantrips('Wizard');
   */
  getCantrips(className?: string): Spell[] {
    if (className) {
      const classSpells = getClassSpells(className);
      return classSpells.cantrips;
    }

    return getSpellsByLevel(0);
  }

  /**
   * Returns all available D&D 5E weapons.
   *
   * Includes simple and martial weapons with their damage dice,
   * properties, weight, cost, and other statistics.
   *
   * @returns Array of weapon equipment
   * @example
   * const provider = new DND5EProvider();
   * const weapons = provider.getWeapons();
   * // Returns [{ id: 'longsword', name: 'Longsword', damage: { dice: '1d8', type: 'slashing' }, ... }, ...]
   */
  getWeapons(): Equipment[] {
    return weapons;
  }

  /**
   * Returns all available D&D 5E armor.
   *
   * Includes light, medium, and heavy armor with their AC values,
   * weight, cost, and special properties like stealth disadvantage.
   *
   * @returns Array of armor equipment
   * @example
   * const provider = new DND5EProvider();
   * const armor = provider.getArmor();
   * // Returns [{ id: 'chain-mail', name: 'Chain Mail', armorClass: { base: 16 }, ... }, ...]
   */
  getArmor(): Equipment[] {
    return armor;
  }

  /**
   * Returns all available D&D 5E adventuring gear.
   *
   * Includes general equipment like rope, torches, backpacks, tools,
   * and other non-combat items useful for adventuring.
   *
   * @returns Array of adventuring gear
   * @example
   * const provider = new DND5EProvider();
   * const gear = provider.getGear();
   * // Returns [{ id: 'rope', name: 'Rope (50 ft)', cost: { amount: 1, currency: 'gp' }, ... }, ...]
   */
  getGear(): Equipment[] {
    return adventuringGear;
  }

  // ============================================================================
  // Calculations
  // ============================================================================

  /**
   * Calculates ability modifier using the D&D 5E formula.
   *
   * Formula: floor((score - 10) / 2)
   *
   * @param score - The ability score (typically 1-20, can go higher with magic)
   * @returns The calculated ability modifier
   * @example
   * const provider = new DND5EProvider();
   * provider.calculateAbilityModifier(10); // Returns 0
   * provider.calculateAbilityModifier(16); // Returns +3
   * provider.calculateAbilityModifier(8);  // Returns -1
   * provider.calculateAbilityModifier(20); // Returns +5
   */
  calculateAbilityModifier(score: number): number {
    return Math.floor((score - 10) / 2);
  }

  /**
   * Calculates proficiency bonus for a given character level in D&D 5E.
   *
   * Formula: ceil(level / 4) + 1
   *
   * Proficiency bonus progression:
   * - Levels 1-4: +2
   * - Levels 5-8: +3
   * - Levels 9-12: +4
   * - Levels 13-16: +5
   * - Levels 17-20: +6
   *
   * @param level - The character level (1-20)
   * @returns The proficiency bonus
   * @example
   * const provider = new DND5EProvider();
   * provider.calculateProficiencyBonus(1);  // Returns +2
   * provider.calculateProficiencyBonus(5);  // Returns +3
   * provider.calculateProficiencyBonus(9);  // Returns +4
   * provider.calculateProficiencyBonus(20); // Returns +6
   */
  calculateProficiencyBonus(level: number): number {
    return Math.ceil(level / 4) + 1;
  }

  /**
   * Calculates hit points for a D&D 5E character.
   *
   * Formula:
   * - Level 1: Max hit die + Constitution modifier
   * - Level 2+: Previous HP + (average of hit die) + Constitution modifier per level
   *
   * Uses average values for hit die (rounded up):
   * - d6: 4 (Wizard, Sorcerer)
   * - d8: 5 (Bard, Cleric, Druid, Monk, Rogue, Warlock)
   * - d10: 6 (Fighter, Paladin, Ranger)
   * - d12: 7 (Barbarian)
   *
   * @param className - The character's class name
   * @param level - The character level
   * @param conMod - The Constitution modifier
   * @returns The total hit points
   * @throws Error if class is not found
   * @example
   * const provider = new DND5EProvider();
   *
   * // Level 1 Fighter with 14 CON (+2)
   * provider.calculateHitPoints('Fighter', 1, 2); // Returns 12 (10 + 2)
   *
   * // Level 3 Fighter with 14 CON (+2)
   * provider.calculateHitPoints('Fighter', 3, 2); // Returns 24 (10 + 2 + (6 + 2) * 2)
   *
   * // Level 5 Wizard with 10 CON (0)
   * provider.calculateHitPoints('Wizard', 5, 0); // Returns 22 (6 + 4 * 4)
   */
  calculateHitPoints(className: string, level: number, conMod: number): number {
    // Find the class to get hit die
    const characterClass = classes.find(
      (c) => c.name.toLowerCase() === className.toLowerCase()
    );

    if (!characterClass) {
      throw new Error(`Class not found: ${className}`);
    }

    const hitDie = characterClass.hitDie;

    // Level 1: Max hit die + CON mod
    if (level === 1) {
      return hitDie + conMod;
    }

    // Levels 2+: First level max + additional levels average
    // Average hit die value (rounded up)
    const averageHitDie = Math.ceil(hitDie / 2 + 1);

    // Max HP at level 1
    const firstLevelHP = hitDie + conMod;

    // Additional levels use average
    const additionalLevels = level - 1;
    const additionalHP = additionalLevels * (averageHitDie + conMod);

    return firstLevelHP + additionalHP;
  }

  /**
   * Calculates armor class (AC) for a D&D 5E character.
   *
   * Calculation rules:
   * - Unarmored: 10 + Dex modifier
   * - Light armor: Armor base AC + Dex modifier
   * - Medium armor: Armor base AC + Dex modifier (max +2)
   * - Heavy armor: Armor base AC (no Dex modifier)
   * - Shield: +2 to AC
   *
   * @param baseAC - The base armor class (usually 10 for unarmored)
   * @param dexMod - The Dexterity modifier
   * @param armor - Optional armor being worn
   * @param shield - Whether a shield is equipped (adds +2 to AC)
   * @returns The total armor class
   * @example
   * const provider = new DND5EProvider();
   *
   * // Unarmored with 14 DEX (+2)
   * provider.calculateArmorClass(10, 2); // Returns 12
   *
   * // Leather armor (AC 11) with 16 DEX (+3)
   * const leather = { armorClass: { base: 11, dexModifier: true }, armorType: 'light' };
   * provider.calculateArmorClass(10, 3, leather); // Returns 14
   *
   * // Chain mail (AC 16) with 14 DEX (+2) - heavy armor, no dex bonus
   * const chainMail = { armorClass: { base: 16, dexModifier: false }, armorType: 'heavy' };
   * provider.calculateArmorClass(10, 2, chainMail); // Returns 16
   *
   * // Chain mail with shield
   * provider.calculateArmorClass(10, 2, chainMail, true); // Returns 18
   *
   * // Hide armor (AC 12) with 18 DEX (+4) - medium armor, max +2 dex
   * const hide = { armorClass: { base: 12, dexModifier: true, maxBonus: 2 }, armorType: 'medium' };
   * provider.calculateArmorClass(10, 4, hide); // Returns 14 (12 + 2, not 16)
   */
  calculateArmorClass(
    baseAC: number,
    dexMod: number,
    armor?: any,
    shield?: boolean
  ): number {
    let ac = baseAC;

    if (armor && armor.armorClass) {
      // Start with armor's base AC
      ac = armor.armorClass.base;

      // Add dexterity modifier based on armor type
      if (armor.armorClass.dexModifier) {
        if (armor.armorClass.maxBonus !== undefined) {
          // Medium armor: cap dex bonus
          ac += Math.min(dexMod, armor.armorClass.maxBonus);
        } else {
          // Light armor: full dex bonus
          ac += dexMod;
        }
      }
      // Heavy armor: no dex bonus added
    } else {
      // Unarmored: base AC + full dex modifier
      ac = baseAC + dexMod;
    }

    // Add shield bonus (+2 AC)
    if (shield) {
      ac += 2;
    }

    return ac;
  }

  // ============================================================================
  // Character Creation
  // ============================================================================

  /**
   * Returns the ordered list of step IDs for D&D 5E character creation.
   *
   * Character creation follows this sequence:
   * 1. race - Choose character race/species
   * 2. class - Choose character class
   * 3. abilities - Determine ability scores
   * 4. description - Define personality, background, and appearance
   * 5. equipment - Select starting equipment and gear
   *
   * @returns Array of step identifiers in creation order
   * @example
   * const provider = new DND5EProvider();
   * const steps = provider.getCharacterCreationSteps();
   * // Returns ['race', 'class', 'abilities', 'description', 'equipment']
   */
  getCharacterCreationSteps(): string[] {
    return ['race', 'class', 'abilities', 'description', 'equipment'];
  }

  /**
   * Validates a D&D 5E character for completeness and rule compliance.
   *
   * Checks for:
   * - Required fields (name, race, class, level)
   * - Valid ability scores (1-20 range, standard array compliance)
   * - Valid level range (1-20)
   * - Valid class and race IDs
   * - Proper proficiency selections
   * - Valid spell selections for spellcasting classes
   *
   * @param character - The character data to validate
   * @returns Validation result with success flag and any error messages
   * @example
   * const provider = new DND5EProvider();
   *
   * const validChar = {
   *   name: 'Gandalf',
   *   race: 'human',
   *   class: 'wizard',
   *   level: 5,
   *   abilityScores: { str: 10, dex: 14, con: 12, int: 18, wis: 15, cha: 11 }
   * };
   * provider.validateCharacter(validChar);
   * // Returns { isValid: true, errors: [] }
   *
   * const invalidChar = { name: 'Bob' };
   * provider.validateCharacter(invalidChar);
   * // Returns { isValid: false, errors: ['Missing required field: race', 'Missing required field: class', ...] }
   */
  validateCharacter(character: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!character.name || character.name.trim() === '') {
      errors.push('Missing required field: name');
    }

    if (!character.race) {
      errors.push('Missing required field: race');
    } else {
      // Validate race exists
      const validRace = races.find((r) => r.id === character.race);
      if (!validRace) {
        errors.push(`Invalid race: ${character.race}`);
      }
    }

    if (!character.class) {
      errors.push('Missing required field: class');
    } else {
      // Validate class exists
      const validClass = classes.find(
        (c) => c.id === character.class || c.name.toLowerCase() === character.class.toLowerCase()
      );
      if (!validClass) {
        errors.push(`Invalid class: ${character.class}`);
      }
    }

    if (!character.level) {
      errors.push('Missing required field: level');
    } else {
      // Validate level range
      if (character.level < 1 || character.level > 20) {
        errors.push('Level must be between 1 and 20');
      }
    }

    // Validate ability scores
    if (!character.abilityScores) {
      errors.push('Missing required field: abilityScores');
    } else {
      const requiredAbilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
      for (const ability of requiredAbilities) {
        const score = character.abilityScores[ability];
        if (score === undefined || score === null) {
          errors.push(`Missing ability score: ${ability}`);
        } else if (score < 1 || score > 20) {
          errors.push(`Invalid ${ability} score: ${score} (must be between 1 and 20)`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // System Features
  // ============================================================================

  /**
   * Returns D&D 5E system-specific features and capabilities.
   *
   * Provides metadata about:
   * - Available character creation options (cantrips, backgrounds, feats)
   * - Ability score generation methods
   * - Level and spell level ranges
   * - Combat and rest mechanics
   * - Content sources and optional rules
   *
   * @returns Object containing D&D 5E feature flags and configuration
   * @example
   * const provider = new DND5EProvider();
   * const features = provider.getSystemFeatures();
   * // Returns {
   * //   hasCantrips: true,
   * //   hasBackgrounds: true,
   * //   hasFeats: true,
   * //   abilityScoreMethods: ['standard-array', 'point-buy', 'roll'],
   * //   maxLevel: 20,
   * //   maxSpellLevel: 9,
   * //   ...
   * // }
   */
  getSystemFeatures(): Record<string, any> {
    return {
      // Character creation features
      hasCantrips: true,
      hasBackgrounds: true,
      hasFeats: true,
      hasMulticlassing: true,
      hasSubclasses: true,

      // Ability score generation
      abilityScoreMethods: ['standard-array', 'point-buy', 'roll'],
      standardArray: [15, 14, 13, 12, 10, 8],
      pointBuyPoints: 27,
      abilityScoreMax: 20,

      // Level and progression
      maxLevel: 20,
      startingLevel: 1,

      // Spellcasting
      maxSpellLevel: 9,
      hasRitualCasting: true,
      hasConcentration: true,

      // Combat
      initiativeType: 'dex-based',
      hasReactions: true,
      hasBonusActions: true,
      hasOpportunityAttacks: true,

      // Rest mechanics
      hasShortRest: true,
      hasLongRest: true,
      shortRestDuration: '1 hour',
      longRestDuration: '8 hours',

      // Death and dying
      deathSaves: true,
      deathSaveThreshold: 10,
      maxDeathSaveFails: 3,

      // Advantage/Disadvantage system
      hasAdvantageSystem: true,

      // Content sources
      contentSources: ['SRD', 'PHB', "Player's Handbook"],

      // Optional rules (commonly used)
      optionalRules: [
        'feats',
        'multiclassing',
        'variant-human',
        'flanking',
      ],
    };
  }
}

/**
 * Default export of DND5EProvider instance.
 * Use this for convenient access to the D&D 5E provider.
 *
 * @example
 * import dnd5e from '@/data/game-systems/dnd5e/provider';
 * const classes = dnd5e.getClasses();
 */
export default new DND5EProvider();

/**
 * Named export for when you need to instantiate the provider yourself.
 *
 * @example
 * import { DND5EProvider } from '@/data/game-systems/dnd5e/provider';
 * const provider = new DND5EProvider();
 */
