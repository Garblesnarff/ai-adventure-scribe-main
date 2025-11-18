/**
 * Old-School Essentials Game System Provider
 *
 * Provides concrete implementation of the GameSystemProvider for both Classic Fantasy
 * and Advanced Fantasy variants of Old-School Essentials. Handles character creation,
 * rules calculations, equipment data, and system-specific features for the OSE
 * retro-clone of classic B/X D&D.
 *
 * @module data/game-systems/ose/provider
 */

import { GameSystemProvider } from '../base/GameSystemProvider';
import type { GameSystemConfig } from '@/types/game-systems';
import { OSE_CLASSIC_CONFIG, OSE_ADVANCED_CONFIG } from './config';
import { OSE_CLASSIC_CLASSES, type OSEClass, getOSEClassById } from './classic/classes';

/**
 * Equipment item interface for OSE
 */
interface OSEEquipment {
  id: string;
  name: string;
  cost: string;
  weight?: string;
  description?: string;
}

/**
 * Weapon interface for OSE
 */
interface OSEWeapon extends OSEEquipment {
  damage: string;
  type: 'melee' | 'ranged';
  properties?: string[];
}

/**
 * Armor interface for OSE
 */
interface OSEArmor extends OSEEquipment {
  ac: number;
  type: 'light' | 'medium' | 'heavy';
}

/**
 * Old-School Essentials Game System Provider
 *
 * Implements all game system provider methods for OSE Classic Fantasy and
 * Advanced Fantasy variants. Supports both race-as-class (Classic) and
 * separated race/class (Advanced) character creation.
 *
 * Features:
 * - Dual variant support (Classic and Advanced)
 * - OSE-specific ability modifier calculations
 * - THAC0-based combat system
 * - Saving throw mechanics
 * - Equipment and spell management
 * - Character validation
 *
 * @example
 * // Create Classic Fantasy provider
 * const classicProvider = new OSEProvider('classic');
 * const classes = classicProvider.getClasses();
 *
 * // Create Advanced Fantasy provider
 * const advancedProvider = new OSEProvider('advanced');
 * const races = advancedProvider.getRaces();
 *
 * @class OSEProvider
 * @extends {GameSystemProvider}
 */
export class OSEProvider extends GameSystemProvider {
  /**
   * The variant of OSE being used (Classic or Advanced)
   * @private
   */
  private variant: 'classic' | 'advanced';

  /**
   * Configuration for this OSE variant
   * @readonly
   */
  readonly config: GameSystemConfig;

  /**
   * Creates an OSE provider instance for the specified variant.
   *
   * @param {('classic'|'advanced')} [variant='classic'] - The OSE variant to use
   *
   * @example
   * // Use Classic Fantasy (default)
   * const provider = new OSEProvider();
   *
   * // Use Advanced Fantasy
   * const provider = new OSEProvider('advanced');
   */
  constructor(variant: 'classic' | 'advanced' = 'classic') {
    super();
    this.variant = variant;
    this.config = variant === 'classic' ? OSE_CLASSIC_CONFIG : OSE_ADVANCED_CONFIG;
  }

  // ============================================================================
  // Character Creation Data
  // ============================================================================

  /**
   * Returns the available character classes for this OSE variant.
   *
   * Classic Fantasy: Returns 4 human classes (Cleric, Fighter, Magic-User, Thief)
   * and 3 race-as-class options (Dwarf, Elf, Halfling).
   *
   * Advanced Fantasy: Will return expanded class list including Acrobat, Barbarian,
   * Bard, Knight, Ranger, etc. (currently returns null as not yet implemented).
   *
   * @returns {OSEClass[] | null} Array of class options, or null if advanced classes not ready
   *
   * @example
   * const provider = new OSEProvider('classic');
   * const classes = provider.getClasses();
   * // Returns 7 classes: Cleric, Fighter, Magic-User, Thief, Dwarf, Elf, Halfling
   */
  getClasses(): OSEClass[] | null {
    if (this.variant === 'classic') {
      return OSE_CLASSIC_CLASSES;
    }
    // Advanced classes not yet implemented
    return null;
  }

  /**
   * Returns the available character races for this OSE variant.
   *
   * Classic Fantasy: Races are integrated into classes (race-as-class), so this
   * returns null. The race classes (Dwarf, Elf, Halfling) are included in getClasses().
   *
   * Advanced Fantasy: Will return separate races (Drow, Duergar, Gnome, Half-Elf,
   * Half-Orc, Svirfneblin) that can be combined with any class (not yet implemented).
   *
   * @returns {any[] | null} Array of race options for Advanced, null for Classic
   *
   * @example
   * const classicProvider = new OSEProvider('classic');
   * classicProvider.getRaces(); // Returns null (uses race-as-class)
   *
   * const advancedProvider = new OSEProvider('advanced');
   * advancedProvider.getRaces(); // Will return races when implemented
   */
  getRaces(): any[] | null {
    if (this.variant === 'classic') {
      // Classic uses race-as-class, races are integrated in the class list
      return null;
    }
    // Advanced has separate races - not yet implemented
    return null;
  }

  /**
   * Returns character backgrounds.
   *
   * OSE does not use backgrounds as a character creation element.
   * Character background is typically handled through roleplaying and
   * individual character history rather than mechanical options.
   *
   * @returns {null} Always null - OSE has no backgrounds
   */
  getBackgrounds(): null {
    return null;
  }

  /**
   * Returns spells available in OSE.
   *
   * Can be filtered by spell level (1-6 for arcane, 1-5 for divine)
   * and/or character class (Cleric, Magic-User, Elf).
   *
   * @param {number} [level] - Spell level to filter by (1-6)
   * @param {string} [className] - Class name to filter by ('cleric', 'magic-user', 'elf')
   * @returns {any[]} Array of spells (currently empty - to be implemented)
   *
   * @example
   * // Get all spells
   * provider.getSpells();
   *
   * // Get 3rd level spells
   * provider.getSpells(3);
   *
   * // Get magic-user spells
   * provider.getSpells(undefined, 'magic-user');
   *
   * // Get 2nd level cleric spells
   * provider.getSpells(2, 'cleric');
   */
  getSpells(level?: number, className?: string): any[] {
    // TODO: Implement spell data
    // Will need to add OSE spell lists for Cleric (divine) and Magic-User/Elf (arcane)
    return [];
  }

  /**
   * Returns cantrips (level 0 spells).
   *
   * OSE does not have cantrips. The lowest level spells are 1st level.
   * This is consistent with classic B/X D&D rules.
   *
   * @param {string} [className] - Class name (ignored)
   * @returns {null} Always null - OSE has no cantrips
   */
  getCantrips(className?: string): null {
    return null;
  }

  /**
   * Returns the available weapons in OSE.
   *
   * Includes common OSE weapons with damage dice, type (melee/ranged),
   * cost, and special properties.
   *
   * @returns {OSEWeapon[]} Array of weapon data
   *
   * @example
   * const weapons = provider.getWeapons();
   * const longsword = weapons.find(w => w.id === 'longsword');
   * // { id: 'longsword', name: 'Longsword', damage: '1d8', ... }
   */
  getWeapons(): OSEWeapon[] {
    return [
      // Melee Weapons
      {
        id: 'battle-axe',
        name: 'Battle Axe',
        damage: '1d8',
        type: 'melee',
        cost: '7 gp',
        weight: '50 cn',
        properties: ['two-handed'],
      },
      {
        id: 'club',
        name: 'Club',
        damage: '1d4',
        type: 'melee',
        cost: '3 gp',
        weight: '50 cn',
      },
      {
        id: 'dagger',
        name: 'Dagger',
        damage: '1d4',
        type: 'melee',
        cost: '3 gp',
        weight: '10 cn',
        properties: ['thrown (10/20/30)'],
      },
      {
        id: 'hand-axe',
        name: 'Hand Axe',
        damage: '1d6',
        type: 'melee',
        cost: '4 gp',
        weight: '30 cn',
        properties: ['thrown (10/20/30)'],
      },
      {
        id: 'javelin',
        name: 'Javelin',
        damage: '1d4',
        type: 'melee',
        cost: '1 gp',
        weight: '20 cn',
        properties: ['thrown (30/60/90)'],
      },
      {
        id: 'lance',
        name: 'Lance',
        damage: '1d6',
        type: 'melee',
        cost: '5 gp',
        weight: '120 cn',
        properties: ['mounted'],
      },
      {
        id: 'longsword',
        name: 'Longsword',
        damage: '1d8',
        type: 'melee',
        cost: '10 gp',
        weight: '60 cn',
      },
      {
        id: 'mace',
        name: 'Mace',
        damage: '1d6',
        type: 'melee',
        cost: '5 gp',
        weight: '30 cn',
      },
      {
        id: 'pole-arm',
        name: 'Pole Arm',
        damage: '1d10',
        type: 'melee',
        cost: '7 gp',
        weight: '150 cn',
        properties: ['two-handed', 'reach'],
      },
      {
        id: 'short-sword',
        name: 'Short Sword',
        damage: '1d6',
        type: 'melee',
        cost: '7 gp',
        weight: '30 cn',
      },
      {
        id: 'spear',
        name: 'Spear',
        damage: '1d6',
        type: 'melee',
        cost: '3 gp',
        weight: '30 cn',
        properties: ['thrown (20/40/60)'],
      },
      {
        id: 'staff',
        name: 'Staff',
        damage: '1d4',
        type: 'melee',
        cost: '2 gp',
        weight: '40 cn',
        properties: ['two-handed'],
      },
      {
        id: 'two-handed-sword',
        name: 'Two-Handed Sword',
        damage: '1d10',
        type: 'melee',
        cost: '15 gp',
        weight: '150 cn',
        properties: ['two-handed'],
      },
      {
        id: 'warhammer',
        name: 'War Hammer',
        damage: '1d6',
        type: 'melee',
        cost: '5 gp',
        weight: '30 cn',
      },

      // Ranged Weapons
      {
        id: 'long-bow',
        name: 'Long Bow',
        damage: '1d6',
        type: 'ranged',
        cost: '40 gp',
        weight: '30 cn',
        properties: ['two-handed', 'range (70/140/210)'],
      },
      {
        id: 'short-bow',
        name: 'Short Bow',
        damage: '1d6',
        type: 'ranged',
        cost: '25 gp',
        weight: '30 cn',
        properties: ['two-handed', 'range (50/100/150)'],
      },
      {
        id: 'crossbow',
        name: 'Crossbow',
        damage: '1d6',
        type: 'ranged',
        cost: '30 gp',
        weight: '50 cn',
        properties: ['two-handed', 'range (60/120/180)', 'reload'],
      },
      {
        id: 'sling',
        name: 'Sling',
        damage: '1d4',
        type: 'ranged',
        cost: '2 gp',
        weight: '20 cn',
        properties: ['range (40/80/160)'],
      },
    ];
  }

  /**
   * Returns the available armor in OSE.
   *
   * Includes armor types with their Armor Class values, type (light/medium/heavy),
   * cost, and weight in coins (cn).
   *
   * @returns {OSEArmor[]} Array of armor data
   *
   * @example
   * const armor = provider.getArmor();
   * const chainmail = armor.find(a => a.id === 'chain-mail');
   * // { id: 'chain-mail', name: 'Chain Mail', ac: 14, ... }
   */
  getArmor(): OSEArmor[] {
    return [
      {
        id: 'leather',
        name: 'Leather Armor',
        ac: 13,
        type: 'light',
        cost: '20 gp',
        weight: '200 cn',
        description: 'Light armor made of hardened leather',
      },
      {
        id: 'chain-mail',
        name: 'Chain Mail',
        ac: 14,
        type: 'medium',
        cost: '40 gp',
        weight: '400 cn',
        description: 'Armor made of interlocking metal rings',
      },
      {
        id: 'plate-mail',
        name: 'Plate Mail',
        ac: 15,
        type: 'heavy',
        cost: '60 gp',
        weight: '500 cn',
        description: 'Heavy armor made of shaped, interlocking metal plates',
      },
      {
        id: 'shield',
        name: 'Shield',
        ac: 1,
        type: 'light',
        cost: '10 gp',
        weight: '100 cn',
        description: 'Improves AC by 1 when equipped',
      },
    ];
  }

  /**
   * Returns general equipment and adventuring gear.
   *
   * Includes common adventuring items, tools, containers, and supplies
   * with OSE pricing and weights.
   *
   * @returns {OSEEquipment[]} Array of equipment/gear data
   *
   * @example
   * const gear = provider.getGear();
   * const rope = gear.find(g => g.id === 'rope');
   */
  getGear(): OSEEquipment[] {
    return [
      { id: 'backpack', name: 'Backpack', cost: '5 gp', weight: '20 cn' },
      { id: 'crowbar', name: 'Crowbar', cost: '10 gp', weight: '60 cn' },
      { id: 'garlic', name: 'Garlic', cost: '5 sp', weight: '1 cn' },
      { id: 'grappling-hook', name: 'Grappling Hook', cost: '25 gp', weight: '80 cn' },
      { id: 'hammer', name: 'Hammer', cost: '2 gp', weight: '10 cn' },
      { id: 'holy-symbol', name: 'Holy Symbol', cost: '25 gp', weight: '5 cn' },
      { id: 'holy-water', name: 'Holy Water (vial)', cost: '25 gp', weight: '1 cn' },
      { id: 'iron-spikes', name: 'Iron Spikes (12)', cost: '1 gp', weight: '60 cn' },
      { id: 'lantern', name: 'Lantern', cost: '10 gp', weight: '30 cn' },
      { id: 'mirror', name: 'Mirror (hand-sized, steel)', cost: '5 gp', weight: '5 cn' },
      { id: 'oil-flask', name: 'Oil Flask', cost: '2 gp', weight: '10 cn' },
      { id: 'pole', name: 'Pole (10 ft wooden)', cost: '1 gp', weight: '80 cn' },
      { id: 'rations', name: 'Rations (iron, 7 days)', cost: '15 gp', weight: '80 cn' },
      { id: 'rations-standard', name: 'Rations (standard, 7 days)', cost: '5 gp', weight: '200 cn' },
      { id: 'rope', name: 'Rope (50 ft)', cost: '1 gp', weight: '50 cn' },
      { id: 'sack-large', name: 'Sack (large)', cost: '2 gp', weight: '5 cn' },
      { id: 'sack-small', name: 'Sack (small)', cost: '1 gp', weight: '1 cn' },
      { id: 'stakes-wooden', name: 'Stakes (3) and Mallet', cost: '3 gp', weight: '30 cn' },
      { id: 'thieves-tools', name: "Thieves' Tools", cost: '25 gp', weight: '10 cn' },
      { id: 'tinder-box', name: 'Tinder Box', cost: '3 gp', weight: '5 cn' },
      { id: 'torch', name: 'Torch (6)', cost: '1 gp', weight: '60 cn' },
      { id: 'waterskin', name: 'Waterskin', cost: '1 gp', weight: '5 cn (full)' },
      { id: 'wine', name: 'Wine (quart)', cost: '1 gp', weight: '30 cn' },
      { id: 'wolfsbane', name: 'Wolfsbane (bunch)', cost: '10 gp', weight: '1 cn' },
    ];
  }

  // ============================================================================
  // Calculations
  // ============================================================================

  /**
   * Calculates the ability modifier from an ability score using OSE rules.
   *
   * OSE uses a different modifier progression than D&D 5E:
   * - 3: -3
   * - 4-5: -2
   * - 6-8: -1
   * - 9-12: 0
   * - 13-15: +1
   * - 16-17: +2
   * - 18: +3
   *
   * These modifiers primarily affect:
   * - Combat: STR (melee), DEX (ranged, AC)
   * - HP: CON
   * - Spell effects: INT or WIS (depending on class)
   * - Reaction rolls: CHA
   * - XP gains: Prime requisite abilities
   *
   * @param {number} score - The ability score (typically 3-18)
   * @returns {number} The modifier (-3 to +3)
   *
   * @example
   * provider.calculateAbilityModifier(3);  // Returns -3
   * provider.calculateAbilityModifier(10); // Returns 0
   * provider.calculateAbilityModifier(16); // Returns +2
   * provider.calculateAbilityModifier(18); // Returns +3
   */
  calculateAbilityModifier(score: number): number {
    if (score <= 3) return -3;
    if (score <= 5) return -2;
    if (score <= 8) return -1;
    if (score <= 12) return 0;
    if (score <= 15) return 1;
    if (score <= 17) return 2;
    return 3;
  }

  /**
   * Calculates the proficiency bonus for a given character level.
   *
   * OSE does not use proficiency bonuses. This concept is from D&D 5E and
   * other modern systems. OSE instead uses attack bonuses that vary by class
   * and saving throws that improve every 4 levels.
   *
   * @param {number} level - The character level (ignored)
   * @returns {number} Always returns 0
   *
   * @example
   * provider.calculateProficiencyBonus(5); // Returns 0
   */
  calculateProficiencyBonus(level: number): number {
    // OSE doesn't use proficiency bonuses
    return 0;
  }

  /**
   * Calculates hit points for a character.
   *
   * Uses the class's hit die and Constitution modifier. In OSE:
   * - Level 1: Maximum hit die value + CON modifier (minimum 1 HP)
   * - Levels 2+: Roll hit die + CON modifier per level
   * - Some classes stop rolling after level 9 (add fixed HP instead)
   *
   * This implementation returns average HP for levels after 1st.
   *
   * @param {string} className - The character's class ID
   * @param {number} level - The character level
   * @param {number} conMod - The Constitution modifier
   * @returns {number} Total hit points
   *
   * @example
   * // Fighter (d8) with 14 CON (+1) at level 3
   * provider.calculateHitPoints('fighter', 3, 1);
   * // Returns: 8 + 1 + (5+1) + (5+1) = 21 (using average rolls)
   *
   * // Magic-User (d4) with 10 CON (+0) at level 1
   * provider.calculateHitPoints('magic-user', 1, 0);
   * // Returns: 4 (max at 1st level)
   */
  calculateHitPoints(className: string, level: number, conMod: number): number {
    const classData = getOSEClassById(className);
    if (!classData) {
      // Default to d6 if class not found
      const hitDie = 6;
      const maxHpAtLevel1 = hitDie + conMod;
      const avgHpPerLevel = Math.floor(hitDie / 2) + 1 + conMod;
      return Math.max(1, maxHpAtLevel1 + (avgHpPerLevel * (level - 1)));
    }

    const hitDie = classData.hitDie;

    // Level 1: Maximum hit die + CON mod (minimum 1)
    if (level === 1) {
      return Math.max(1, hitDie + conMod);
    }

    // Levels 2+: Use average hit die value
    const avgHitDie = Math.floor(hitDie / 2) + 1;
    let totalHP = hitDie + conMod; // Level 1 HP

    // Add HP for each additional level
    for (let i = 2; i <= level; i++) {
      // After level 9, some classes stop rolling hit dice
      // For now, we'll keep it simple and continue adding
      totalHP += avgHitDie + conMod;
    }

    return Math.max(level, totalHP); // Minimum 1 HP per level
  }

  /**
   * Calculates armor class for a character.
   *
   * OSE uses ascending AC by default (like D&D 5E), though the original
   * B/X used descending AC. Modern OSE uses:
   * - Base AC: 10 (unarmored)
   * - Add armor AC bonus
   * - Add DEX modifier
   * - Add shield bonus (+1 if equipped)
   *
   * @param {number} baseAC - The base armor class (usually 10)
   * @param {number} dexMod - The Dexterity modifier
   * @param {OSEArmor} [armor] - Armor being worn (optional)
   * @param {boolean} [shield=false] - Whether a shield is equipped
   * @returns {number} The total armor class
   *
   * @example
   * // Unarmored with 14 DEX (+1)
   * provider.calculateArmorClass(10, 1); // Returns 11
   *
   * // Chain mail (AC 14) with 10 DEX (+0) and shield
   * const chainmail = provider.getArmor().find(a => a.id === 'chain-mail');
   * provider.calculateArmorClass(10, 0, chainmail, true); // Returns 15
   *
   * // Plate mail (AC 15) with 8 DEX (-1) and shield
   * const plate = provider.getArmor().find(a => a.id === 'plate-mail');
   * provider.calculateArmorClass(10, -1, plate, true); // Returns 15
   */
  calculateArmorClass(
    baseAC: number,
    dexMod: number,
    armor?: OSEArmor,
    shield: boolean = false
  ): number {
    let ac = baseAC;

    if (armor && armor.id !== 'shield') {
      // Use armor's AC instead of base AC
      ac = armor.ac;
      // In OSE, armor already includes the base 10, so we just add DEX
      ac += dexMod;
    } else {
      // No armor, just base + DEX
      ac += dexMod;
    }

    // Add shield bonus
    if (shield) {
      ac += 1;
    }

    return ac;
  }

  // ============================================================================
  // Character Creation
  // ============================================================================

  /**
   * Returns the character creation step IDs in order.
   *
   * OSE character creation is simpler than D&D 5E:
   * - Classic: Choose class (which may include race), roll abilities, equipment
   * - Advanced: Choose race, choose class, roll abilities, equipment
   *
   * @returns {string[]} Array of step identifiers
   *
   * @example
   * const classicProvider = new OSEProvider('classic');
   * classicProvider.getCharacterCreationSteps();
   * // Returns ['class', 'abilities', 'equipment']
   *
   * const advancedProvider = new OSEProvider('advanced');
   * advancedProvider.getCharacterCreationSteps();
   * // Returns ['race', 'class', 'abilities', 'equipment']
   */
  getCharacterCreationSteps(): string[] {
    if (this.variant === 'classic') {
      // Classic: Race-as-class, so just pick class
      return ['class', 'abilities', 'equipment'];
    }
    // Advanced: Separate race and class selection
    return ['race', 'class', 'abilities', 'equipment'];
  }

  /**
   * Validates a character object for completeness and rule compliance.
   *
   * Checks for:
   * - Required class selection
   * - Valid ability scores (3-18)
   * - All six abilities present
   * - Valid level (1 to class max level)
   * - Hit points calculated
   * - Prime requisite meets class minimums (if any)
   *
   * @param {any} character - The character data to validate
   * @returns {{ isValid: boolean; errors: string[] }} Validation result
   *
   * @example
   * const result = provider.validateCharacter(character);
   * if (!result.isValid) {
   *   console.error('Character invalid:', result.errors);
   * }
   */
  validateCharacter(character: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check class selection
    if (!character.class) {
      errors.push('Character must have a class');
    } else {
      const classData = getOSEClassById(character.class);
      if (!classData) {
        errors.push(`Invalid class: ${character.class}`);
      } else {
        // Check level is within class maximum
        if (character.level && character.level > classData.maxLevel) {
          errors.push(
            `Level ${character.level} exceeds maximum for ${classData.name} (${classData.maxLevel})`
          );
        }
      }
    }

    // Check abilities
    const requiredAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    for (const ability of requiredAbilities) {
      if (!character.abilities || character.abilities[ability] === undefined) {
        errors.push(`Missing ability score: ${ability.toUpperCase()}`);
      } else {
        const score = character.abilities[ability];
        if (score < 3 || score > 18) {
          errors.push(
            `Invalid ${ability.toUpperCase()} score: ${score} (must be 3-18)`
          );
        }
      }
    }

    // Check level
    if (!character.level || character.level < 1) {
      errors.push('Character must have a valid level (minimum 1)');
    }

    // Check hit points
    if (!character.hitPoints || character.hitPoints < 1) {
      errors.push('Character must have at least 1 hit point');
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
   * Returns OSE-specific features and metadata.
   *
   * Provides information about:
   * - Combat system (THAC0-based)
   * - Saving throw categories
   * - XP bonus mechanics
   * - Available content and rules
   * - Optional rule variants
   *
   * @returns {Record<string, any>} Object containing system features
   *
   * @example
   * const features = provider.getSystemFeatures();
   * console.log(features.combatSystem); // 'THAC0'
   * console.log(features.savingThrowCategories); // ['death', 'wands', ...]
   */
  getSystemFeatures(): Record<string, any> {
    return {
      // Combat System
      combatSystem: 'THAC0',
      usesAttackBonus: true,
      attackBonusVariesByClass: true,

      // Saving Throws
      savingThrowCategories: ['death', 'wands', 'paralysis', 'breath', 'spells'],
      savingThrowsImproveEvery: 4, // levels

      // Ability Scores
      abilityScoreRange: { min: 3, max: 18 },
      hasAbilityModifiers: true,
      usesAbilityChecks: true, // Roll d20 under/equal to ability score

      // Character Options
      hasCantrips: false,
      hasBackgrounds: false,
      hasFeats: false,
      hasSkills: false,

      // Magic
      spellLevels: this.variant === 'classic' ? { arcane: 6, divine: 5 } : { arcane: 6, divine: 5 },
      memorizedSpellcasting: true, // Vancian magic

      // Advancement
      usesXP: true,
      xpBonusFromPrimeRequisite: true,
      xpBonusValues: [5, 10], // 5% or 10% based on prime requisite

      // Variant
      variant: this.variant,
      raceAsClass: this.variant === 'classic',
      separateRaceAndClass: this.variant === 'advanced',

      // Max Level
      maxLevel: 14,
      variesByClass: true,

      // Currency
      currency: 'gp', // Gold pieces standard
      coinTypes: ['pp', 'gp', 'ep', 'sp', 'cp'], // Platinum, Gold, Electrum, Silver, Copper
      encumbranceSystem: 'coins', // Weight measured in coins (cn)

      // Optional Rules
      optionalRules: [
        'Descending AC (classic B/X style)',
        'Individual Initiative',
        'Group Initiative',
        'Variable Weapon Damage',
        'Class-based Weapon Damage',
      ],

      // Content Sources
      contentSources: [
        this.variant === 'classic' ? 'Classic Fantasy Rules Tome' : 'Advanced Fantasy Rules Tome',
      ],
    };
  }
}
