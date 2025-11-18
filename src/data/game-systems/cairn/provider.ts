/**
 * Cairn RPG System Provider
 *
 * This provider implements the game system interface for Cairn, an ultra-light
 * OSR adventure game. Cairn is classless and uses only three ability scores
 * (STR, DEX, WIL) with roll-under saving throws. Characters have no levels,
 * progressing instead through equipment, scars, and narrative advancement.
 *
 * Key Mechanics:
 * - Classless system with background traits
 * - Three ability scores: Strength, Dexterity, Willpower
 * - Roll-under d20 saves (no modifiers)
 * - Hit Protection (HP) rolled once at creation (1d6)
 * - Armor reduces damage (max 3 armor points)
 * - 10 inventory slots for resource management
 * - Anyone can cast spells from spellbooks
 * - Deadly combat with critical damage affecting STR
 *
 * @module data/game-systems/cairn/provider
 */

import { GameSystemProvider } from '../base/GameSystemProvider';
import { CAIRN_CONFIG } from './config';
import type { GameSystemConfig } from '@/types/game-systems';

/**
 * Cairn RPG system provider implementation.
 *
 * Provides data and calculations for Cairn's classless, minimalist gameplay.
 * Cairn strips away traditional RPG complexity in favor of fast character creation,
 * inventory-based resource management, and fiction-first decision making.
 *
 * @class CairnProvider
 * @extends {GameSystemProvider}
 */
export class CairnProvider extends GameSystemProvider {
  /**
   * Configuration for the Cairn game system.
   * Contains metadata, ability scores, and system features.
   */
  readonly config: GameSystemConfig = CAIRN_CONFIG;

  // ============================================================================
  // Character Creation Data
  // ============================================================================

  /**
   * Returns character classes.
   *
   * Cairn is a classless system - all characters follow the same rules.
   * Character identity comes from background traits, equipment, and choices
   * made during play rather than mechanical class features.
   *
   * @returns {null} Always returns null (classless system)
   */
  getClasses(): null {
    return null;
  }

  /**
   * Returns character races/species.
   *
   * Cairn has no mechanical race system - all characters use the same rules
   * regardless of their fictional ancestry. Any racial or cultural background
   * is purely narrative and does not affect game mechanics.
   *
   * @returns {null} Always returns null (no race mechanics)
   */
  getRaces(): null {
    return null;
  }

  /**
   * Returns character backgrounds.
   *
   * In Cairn, backgrounds provide starting equipment packages and narrative
   * traits but no mechanical bonuses. This can be expanded to include specific
   * background options like "Hunter", "Herbalist", "Blacksmith", etc.
   *
   * @returns {any[]} Empty array (backgrounds can be added in future updates)
   */
  getBackgrounds(): any[] {
    // TODO: Implement Cairn background traits and starting equipment packages
    // Examples: Hunter, Herbalist, Blacksmith, Cutpurse, Performer, etc.
    return [];
  }

  /**
   * Returns available spells.
   *
   * Cairn handles spells differently than traditional RPG systems. Spells are
   * contained in physical spellbooks that take up inventory slots. Any character
   * can cast a spell if they possess the spellbook and have a free hand.
   * There are no spell slots or daily limits - spells are items.
   *
   * @param {number} [level] - Not used in Cairn (no spell levels)
   * @param {string} [className] - Not used in Cairn (classless system)
   * @returns {null} Always returns null (spells are items, not a separate list)
   */
  getSpells(level?: number, className?: string): null {
    // Cairn spells are physical spellbooks that occupy inventory slots
    // They should be included in the gear/equipment list rather than
    // as a separate spell system
    return null;
  }

  /**
   * Returns available cantrips.
   *
   * Cairn does not have a cantrip system. All magic comes from spellbooks
   * which are physical items that can be found, bought, or stolen.
   *
   * @param {string} [className] - Not used in Cairn
   * @returns {null} Always returns null (no cantrip system)
   */
  getCantrips(className?: string): null {
    return null;
  }

  /**
   * Returns available weapons with Cairn-specific damage values.
   *
   * Cairn weapons deal damage based on dice size (d6, d8, d10, d12).
   * Most weapons deal d6 damage. Larger weapons (d8+) are often bulky and
   * occupy 2 inventory slots. Damage is dealt directly to HP, and when HP
   * reaches 0, damage goes to STR (critical damage).
   *
   * @returns {any[]} Array of Cairn weapons with damage dice and properties
   */
  getWeapons(): any[] {
    return [
      {
        id: 'dagger',
        name: 'Dagger',
        damage: 'd6',
        slots: 1,
        properties: ['Light', 'Throwable'],
        description: 'A short blade useful in close quarters',
      },
      {
        id: 'staff',
        name: 'Staff',
        damage: 'd6',
        slots: 1,
        properties: ['Two-handed', 'Reach'],
        description: 'A sturdy walking stick that doubles as a weapon',
      },
      {
        id: 'sword',
        name: 'Sword',
        damage: 'd8',
        slots: 1,
        properties: ['Versatile'],
        description: 'A well-balanced blade for combat',
      },
      {
        id: 'spear',
        name: 'Spear',
        damage: 'd8',
        slots: 1,
        properties: ['Reach', 'Throwable'],
        description: 'A long weapon effective at keeping enemies at bay',
      },
      {
        id: 'mace',
        name: 'Mace',
        damage: 'd8',
        slots: 1,
        properties: ['Crushing'],
        description: 'A heavy club with a reinforced head',
      },
      {
        id: 'axe',
        name: 'Axe',
        damage: 'd8',
        slots: 1,
        properties: ['Versatile'],
        description: 'A woodsman\'s tool that serves well in battle',
      },
      {
        id: 'longbow',
        name: 'Longbow',
        damage: 'd8',
        slots: 2,
        properties: ['Two-handed', 'Ranged', 'Bulky'],
        description: 'A powerful ranged weapon requiring strength and skill',
      },
      {
        id: 'crossbow',
        name: 'Crossbow',
        damage: 'd8',
        slots: 2,
        properties: ['Two-handed', 'Ranged', 'Bulky', 'Reload'],
        description: 'A mechanical ranged weapon that trades speed for power',
      },
      {
        id: 'greatsword',
        name: 'Greatsword',
        damage: 'd10',
        slots: 2,
        properties: ['Two-handed', 'Bulky'],
        description: 'A massive two-handed blade',
      },
      {
        id: 'battleaxe',
        name: 'Battle Axe',
        damage: 'd10',
        slots: 2,
        properties: ['Two-handed', 'Bulky'],
        description: 'A large axe designed for war',
      },
      {
        id: 'warhammer',
        name: 'War Hammer',
        damage: 'd10',
        slots: 2,
        properties: ['Two-handed', 'Bulky', 'Crushing'],
        description: 'A heavy hammer for breaking armor and bones',
      },
      {
        id: 'halberd',
        name: 'Halberd',
        damage: 'd10',
        slots: 2,
        properties: ['Two-handed', 'Reach', 'Bulky'],
        description: 'A polearm combining axe and spear',
      },
    ];
  }

  /**
   * Returns available armor.
   *
   * In Cairn, armor reduces incoming damage rather than making you harder to hit.
   * Armor points (0-3) are subtracted from damage before it affects HP.
   * Heavy armor is bulky and may occupy inventory slots or hinder movement.
   *
   * Maximum armor value is 3. Shields provide +1 armor but require a free hand.
   *
   * @returns {any[]} Array of Cairn armor with armor points and properties
   */
  getArmor(): any[] {
    return [
      {
        id: 'no-armor',
        name: 'No Armor',
        armorValue: 0,
        slots: 0,
        properties: [],
        description: 'No protection, maximum mobility',
      },
      {
        id: 'gambeson',
        name: 'Gambeson',
        armorValue: 1,
        slots: 1,
        properties: ['Light'],
        description: 'Quilted cloth armor providing basic protection',
      },
      {
        id: 'brigandine',
        name: 'Brigandine',
        armorValue: 1,
        slots: 1,
        properties: [],
        description: 'Leather reinforced with metal plates',
      },
      {
        id: 'chainmail',
        name: 'Chain Mail',
        armorValue: 2,
        slots: 2,
        properties: ['Bulky'],
        description: 'Interlocking metal rings providing solid protection',
      },
      {
        id: 'plate-armor',
        name: 'Plate Armor',
        armorValue: 3,
        slots: 3,
        properties: ['Bulky', 'Heavy'],
        description: 'Full suit of metal plates, maximum protection',
      },
      {
        id: 'shield',
        name: 'Shield',
        armorValue: 1,
        slots: 1,
        properties: ['Requires free hand', 'Can be splintered to block damage'],
        description: 'Wooden or metal shield adding +1 armor',
      },
    ];
  }

  /**
   * Returns basic adventuring gear.
   *
   * Inventory management is core to Cairn gameplay. Characters have 10 inventory
   * slots. Most items take 1 slot, bulky items take 2 slots, and tiny items can
   * be bundled. When inventory is full, characters become encumbered and unable
   * to move quickly or act freely.
   *
   * @returns {any[]} Array of adventuring gear and equipment
   */
  getGear(): any[] {
    return [
      {
        id: 'torch',
        name: 'Torch',
        slots: 1,
        description: 'Provides light for about an hour',
      },
      {
        id: 'lantern',
        name: 'Lantern',
        slots: 1,
        description: 'Requires oil, provides steady light',
      },
      {
        id: 'oil-flask',
        name: 'Oil Flask',
        slots: 1,
        description: 'Fuel for lanterns or a thrown weapon',
      },
      {
        id: 'rope',
        name: 'Rope (50ft)',
        slots: 1,
        description: 'Essential for climbing and securing',
      },
      {
        id: 'rations',
        name: 'Rations (3 days)',
        slots: 1,
        description: 'Food and water for survival',
      },
      {
        id: 'waterskin',
        name: 'Waterskin',
        slots: 1,
        description: 'Holds water or other liquids',
      },
      {
        id: 'backpack',
        name: 'Backpack',
        slots: 0,
        description: 'Adds 4 additional inventory slots',
      },
      {
        id: 'bedroll',
        name: 'Bedroll',
        slots: 1,
        description: 'For sleeping comfortably',
      },
      {
        id: 'tent',
        name: 'Tent (2-person)',
        slots: 2,
        properties: ['Bulky'],
        description: 'Shelter from the elements',
      },
      {
        id: 'crowbar',
        name: 'Crowbar',
        slots: 1,
        description: 'For prying and breaking',
      },
      {
        id: 'hammer',
        name: 'Hammer',
        slots: 1,
        description: 'Tool for construction and breaking',
      },
      {
        id: 'spikes',
        name: 'Iron Spikes (10)',
        slots: 1,
        description: 'For securing doors or climbing',
      },
      {
        id: 'grappling-hook',
        name: 'Grappling Hook',
        slots: 1,
        description: 'For climbing or pulling',
      },
      {
        id: 'chalk',
        name: 'Chalk',
        slots: 0,
        description: 'For marking paths and surfaces',
      },
      {
        id: 'pole',
        name: 'Pole (10ft)',
        slots: 2,
        properties: ['Bulky'],
        description: 'For prodding and testing',
      },
      {
        id: 'mirror',
        name: 'Hand Mirror',
        slots: 1,
        description: 'Steel mirror for seeing around corners',
      },
      {
        id: 'lockpicks',
        name: 'Lockpicks',
        slots: 1,
        description: 'Tools for opening locks',
      },
      {
        id: 'healing-salve',
        name: 'Healing Salve',
        slots: 1,
        description: 'Restores 1d6 HP when applied during rest',
      },
      {
        id: 'antitoxin',
        name: 'Antitoxin',
        slots: 1,
        description: 'Counters poison effects',
      },
      {
        id: 'manacles',
        name: 'Manacles',
        slots: 1,
        description: 'For restraining prisoners',
      },
    ];
  }

  // ============================================================================
  // Calculations
  // ============================================================================

  /**
   * Calculates ability modifier.
   *
   * Cairn uses roll-under saving throws instead of modifiers. When making a save,
   * characters roll a d20 and try to roll equal to or under their ability score.
   * Therefore, there are no ability modifiers in Cairn.
   *
   * @param {number} score - The ability score (3-18)
   * @returns {number} Always returns 0 (no modifiers in Cairn)
   */
  calculateAbilityModifier(score: number): number {
    // Cairn doesn't use ability modifiers
    // Saves are made by rolling d20 under the ability score
    return 0;
  }

  /**
   * Calculates proficiency bonus.
   *
   * Cairn has no proficiency bonus system. Characters don't have levels or
   * proficiency in skills. Success is determined by fictional positioning,
   * player ingenuity, and roll-under ability saves when necessary.
   *
   * @param {number} level - Character level (not used in Cairn)
   * @returns {number} Always returns 0 (no proficiency bonus)
   */
  calculateProficiencyBonus(level: number): number {
    // Cairn has no proficiency bonus system
    return 0;
  }

  /**
   * Calculates hit points.
   *
   * In Cairn, Hit Protection (HP) is rolled once at character creation (1d6).
   * HP is not calculated based on level or class - it's a fixed value that
   * represents a character's ability to avoid serious harm. When HP reaches 0,
   * damage goes directly to STR (critical damage).
   *
   * HP does not increase with experience. Instead, characters become more
   * effective through better equipment, knowledge, and connections.
   *
   * @param {string} className - Not used (classless system)
   * @param {number} level - Not used (no levels)
   * @param {number} conMod - Not used (no CON modifier)
   * @returns {number} Returns 1 as placeholder (actual HP rolled during creation)
   */
  calculateHitPoints(
    className: string,
    level: number,
    conMod: number
  ): number {
    // HP is rolled once at creation (1d6)
    // It doesn't scale with level or constitution
    // Return 1 as placeholder - actual value should be rolled during character creation
    return 1;
  }

  /**
   * Calculates armor class.
   *
   * Cairn doesn't use Armor Class (AC). Instead, armor provides damage reduction.
   * When a character takes damage, they subtract their armor value (0-3) from
   * the damage before applying it to HP or STR.
   *
   * This method returns the armor value directly since there's no AC calculation.
   *
   * @param {number} baseAC - Not used in Cairn
   * @param {number} dexMod - Not used (no DEX modifier)
   * @param {any} armor - The equipped armor
   * @param {boolean} shield - Whether a shield is equipped
   * @returns {number} The total armor value (0-3)
   */
  calculateArmorClass(
    baseAC: number,
    dexMod: number,
    armor?: any,
    shield?: boolean
  ): number {
    // Cairn uses armor value (damage reduction) instead of AC
    let armorValue = armor?.armorValue || 0;

    // Shield adds +1 armor (max 3 total)
    if (shield) {
      armorValue += 1;
    }

    // Maximum armor value is 3
    return Math.min(armorValue, 3);
  }

  // ============================================================================
  // Character Creation
  // ============================================================================

  /**
   * Returns character creation steps for Cairn.
   *
   * Cairn's character creation is fast and straightforward:
   * 1. Basic Info - Name, appearance, background concept
   * 2. Ability Scores - Roll 3d6 for STR, DEX, WIL (swap two if desired)
   * 3. Hit Protection - Roll 1d6 for starting HP
   * 4. Equipment - Select or roll starting equipment package
   * 5. Traits - Roll or choose character traits and bonds
   * 6. Finalization - Review and complete character
   *
   * @returns {string[]} Ordered array of character creation step identifiers
   */
  getCharacterCreationSteps(): string[] {
    return [
      'basic-info',
      'ability-scores',
      'hit-protection',
      'equipment',
      'traits',
      'finalization',
    ];
  }

  /**
   * Validates a Cairn character for completeness.
   *
   * Checks that required character data is present:
   * - Three ability scores (STR, DEX, WIL) are set and valid (3-18)
   * - Hit Protection (HP) is set and valid (1-6)
   * - Character has a name
   *
   * @param {any} character - The character data to validate
   * @returns {{ isValid: boolean; errors: string[] }} Validation result
   */
  validateCharacter(character: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for name
    if (!character.name || character.name.trim() === '') {
      errors.push('Character must have a name');
    }

    // Check ability scores
    const requiredAbilities = ['str', 'dex', 'wil'];
    for (const ability of requiredAbilities) {
      const score = character.abilityScores?.[ability];
      if (score === undefined || score === null) {
        errors.push(`Missing ${ability.toUpperCase()} score`);
      } else if (score < 3 || score > 18) {
        errors.push(
          `${ability.toUpperCase()} score must be between 3 and 18`
        );
      }
    }

    // Check Hit Protection
    if (!character.hp) {
      errors.push('Character must have Hit Protection (HP) set');
    } else if (character.hp < 1 || character.hp > 6) {
      errors.push('Hit Protection must be between 1 and 6');
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
   * Returns Cairn-specific system features and metadata.
   *
   * Key features:
   * - inventorySlots: 10 base slots for resource management
   * - usesHitProtection: True - uses HP as damage buffer before critical damage
   * - classless: True - no character classes
   * - savingThrowMechanic: 'roll-under' - roll d20 under ability score
   * - noLevels: True - characters don't gain levels
   * - armorAsDamageReduction: True - armor reduces damage instead of avoiding hits
   * - magicAsItems: True - spells are physical spellbooks anyone can use
   *
   * @returns {Record<string, any>} System-specific features and configuration
   */
  getSystemFeatures(): Record<string, any> {
    return {
      inventorySlots: 10,
      usesHitProtection: true,
      classless: true,
      savingThrowMechanic: 'roll-under',
      noLevels: true,
      armorAsDamageReduction: true,
      magicAsItems: true,
      maxArmorValue: 3,
      criticalDamageToSTR: true,
      backgroundsProvideEquipment: true,
    };
  }
}

/**
 * Singleton instance of the Cairn provider.
 * Export this instance for use throughout the application.
 */
export const cairnProvider = new CairnProvider();
