/**
 * Abstract base class for game system providers.
 *
 * This class defines the contract that all game system providers must implement
 * to support character creation, rules calculations, and system-specific features.
 * Each game system (D&D 5e, Pathfinder, etc.) should extend this class and provide
 * concrete implementations of all abstract methods.
 *
 * @abstract
 */

import type { GameSystemConfig } from '@/types/game-systems';

export abstract class GameSystemProvider {
  /**
   * Configuration for this game system.
   * Contains metadata like system ID, name, version, and available features.
   */
  abstract readonly config: GameSystemConfig;

  // ============================================================================
  // Character Creation Data
  // ============================================================================

  /**
   * Returns the available character classes for this game system.
   *
   * @returns Array of class options, or null if the system is classless
   * @example
   * // For D&D 5e
   * getClasses() // Returns [{ id: 'fighter', name: 'Fighter', ... }, ...]
   *
   * // For a classless system
   * getClasses() // Returns null
   */
  abstract getClasses(): any[] | null;

  /**
   * Returns the available character races/species for this game system.
   *
   * @returns Array of race options, or null if the system doesn't use races
   * @example
   * // For D&D 5e
   * getRaces() // Returns [{ id: 'human', name: 'Human', ... }, ...]
   *
   * // For a system without races
   * getRaces() // Returns null
   */
  abstract getRaces(): any[] | null;

  /**
   * Returns the available character backgrounds for this game system.
   *
   * @returns Array of background options, null if not applicable, or empty array if optional
   * @example
   * // For D&D 5e
   * getBackgrounds() // Returns [{ id: 'acolyte', name: 'Acolyte', ... }, ...]
   *
   * // For a system without backgrounds
   * getBackgrounds() // Returns null or []
   */
  abstract getBackgrounds(): any[] | null;

  /**
   * Returns the available spells for this game system.
   * Can be filtered by spell level and/or character class.
   *
   * @param level - Optional spell level to filter by (e.g., 0-9 for D&D 5e)
   * @param className - Optional class name to filter spells available to that class
   * @returns Array of spell options, or null if the system doesn't use spells
   * @example
   * // Get all spells
   * getSpells()
   *
   * // Get 3rd level spells
   * getSpells(3)
   *
   * // Get wizard spells
   * getSpells(undefined, 'wizard')
   *
   * // Get 2nd level wizard spells
   * getSpells(2, 'wizard')
   */
  abstract getSpells(level?: number, className?: string): any[] | null;

  /**
   * Returns the available cantrips (level 0 spells) for this game system.
   * Can be filtered by character class.
   *
   * @param className - Optional class name to filter cantrips available to that class
   * @returns Array of cantrip options, or null if the system doesn't use cantrips
   * @example
   * // Get all cantrips
   * getCantrips()
   *
   * // Get wizard cantrips
   * getCantrips('wizard')
   */
  abstract getCantrips(className?: string): any[] | null;

  /**
   * Returns the available weapons for this game system.
   *
   * @returns Array of weapon options with stats like damage, properties, etc.
   * @example
   * getWeapons() // Returns [{ id: 'longsword', name: 'Longsword', damage: '1d8', ... }, ...]
   */
  abstract getWeapons(): any[];

  /**
   * Returns the available armor for this game system.
   *
   * @returns Array of armor options with stats like AC, type, etc.
   * @example
   * getArmor() // Returns [{ id: 'chain-mail', name: 'Chain Mail', ac: 16, ... }, ...]
   */
  abstract getArmor(): any[];

  /**
   * Returns the available general equipment and gear for this game system.
   *
   * @returns Array of gear/equipment options
   * @example
   * getGear() // Returns [{ id: 'rope', name: 'Rope (50 ft)', cost: '1 gp', ... }, ...]
   */
  abstract getGear(): any[];

  // ============================================================================
  // Calculations
  // ============================================================================

  /**
   * Calculates the ability modifier from an ability score.
   *
   * @param score - The ability score (e.g., Strength, Dexterity)
   * @returns The calculated modifier
   * @example
   * // For D&D 5e: (score - 10) / 2, rounded down
   * calculateAbilityModifier(16) // Returns +3
   * calculateAbilityModifier(8)  // Returns -1
   */
  abstract calculateAbilityModifier(score: number): number;

  /**
   * Calculates the proficiency bonus for a given character level.
   *
   * @param level - The character level
   * @returns The proficiency bonus for that level
   * @example
   * // For D&D 5e
   * calculateProficiencyBonus(1)  // Returns +2
   * calculateProficiencyBonus(5)  // Returns +3
   * calculateProficiencyBonus(9)  // Returns +4
   */
  abstract calculateProficiencyBonus(level: number): number;

  /**
   * Calculates the hit points for a character.
   *
   * @param className - The character's class name
   * @param level - The character level
   * @param conMod - The Constitution modifier
   * @returns The total hit points
   * @example
   * // For D&D 5e Fighter with 14 CON (+2) at level 3
   * calculateHitPoints('fighter', 3, 2) // Returns 10 + 2 + (1d10+2)*2 average
   */
  abstract calculateHitPoints(
    className: string,
    level: number,
    conMod: number
  ): number;

  /**
   * Calculates the armor class for a character.
   *
   * @param baseAC - The base armor class (usually 10)
   * @param dexMod - The Dexterity modifier
   * @param armor - Optional armor being worn
   * @param shield - Whether a shield is equipped
   * @returns The total armor class
   * @example
   * // Unarmored with 14 DEX (+2)
   * calculateArmorClass(10, 2) // Returns 12
   *
   * // Chain mail (AC 16) with 14 DEX (+2) and shield
   * calculateArmorClass(10, 2, chainMail, true) // Returns 18 (16 + 2 for shield)
   */
  abstract calculateArmorClass(
    baseAC: number,
    dexMod: number,
    armor?: any,
    shield?: boolean
  ): number;

  // ============================================================================
  // Character Creation
  // ============================================================================

  /**
   * Returns the ordered list of step IDs for the character creation wizard.
   *
   * @returns Array of step identifiers in the order they should appear
   * @example
   * // For D&D 5e
   * getCharacterCreationSteps()
   * // Returns ['race', 'class', 'abilities', 'description', 'equipment']
   *
   * // For a different system
   * getCharacterCreationSteps()
   * // Returns ['concept', 'attributes', 'skills', 'equipment']
   */
  abstract getCharacterCreationSteps(): string[];

  /**
   * Validates a character object for completeness and rule compliance.
   *
   * @param character - The character data to validate
   * @returns Validation result with success flag and any error messages
   * @example
   * validateCharacter(character)
   * // Returns { isValid: true, errors: [] }
   * // or { isValid: false, errors: ['Missing required field: class', 'Invalid ability score'] }
   */
  abstract validateCharacter(character: any): {
    isValid: boolean;
    errors: string[];
  };

  // ============================================================================
  // System Features
  // ============================================================================

  /**
   * Returns system-specific features and metadata.
   * This can include available subsystems, optional rules, content sources, etc.
   *
   * @returns Object containing system-specific feature flags and configuration
   * @example
   * getSystemFeatures()
   * // Returns {
   * //   hasCantrips: true,
   * //   hasBackgrounds: true,
   * //   abilityScoreMethod: 'point-buy',
   * //   maxLevel: 20,
   * //   contentSources: ['phb', 'xge', 'tce']
   * // }
   */
  abstract getSystemFeatures(): Record<string, any>;
}
