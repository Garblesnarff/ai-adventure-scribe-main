/**
 * EntityTypeInference - Handles entity type detection and classification
 *
 * Responsibilities:
 * - Infer entity types from names and context
 * - Classify entities as person, place, item, organization, creature, or concept
 */

import { EntityType } from '../types';

export class EntityTypeInference {
  /**
   * Infer entity type from name and context
   */
  inferEntityType(text: string): EntityType {
    const lowerText = text.toLowerCase();

    if (this.isPersonName(lowerText)) return 'person';
    if (this.isPlaceName(lowerText)) return 'place';
    if (this.isItemName(lowerText)) return 'item';
    if (this.isOrganizationName(lowerText)) return 'organization';
    if (this.isCreatureName(lowerText)) return 'creature';
    if (this.isConceptName(lowerText)) return 'concept';

    return 'person'; // Default to person for unknown
  }

  /**
   * Check if name matches person patterns
   */
  isPersonName(name: string): boolean {
    const personIndicators = [
      'jonathani', 'elizabeth', 'michael', 'jane', 'mary', 'john', 'david',
      'aragorn', 'celebrim', 'drizzt', 'frank', 'samantha', 'rebecca'
    ];

    return personIndicators.some(indicator => name.toLowerCase().includes(indicator)) ||
           (name.match(/^[A-Z][a-z]+$/) !== null && name.length >= 2 && name.length <= 15);
  }

  /**
   * Check if name matches place patterns
   */
  isPlaceName(name: string): boolean {
    const placeIndicators = [
      'tavern', 'inn', 'castle', 'dungeon', 'forest', 'mountain', 'river',
      'city', 'village', 'kingdom', 'temple', 'church', 'marketplace'
    ];

    return placeIndicators.includes(name.toLowerCase()) ||
           name.match(/(?:\w+)(?:\s+\([^/]+)|\s+([^/]+)\/)/) !== null;
  }

  /**
   * Check if name matches item patterns
   */
  isItemName(name: string): boolean {
    const itemIndicators = [
      'sword', 'shield', 'armor', 'potion', 'scroll', 'key', 'coin',
      'ring', 'amulet', 'wand', 'staff', 'bow', 'arrow'
    ];

    return itemIndicators.includes(name.toLowerCase());
  }

  /**
   * Check if name matches organization patterns
   */
  isOrganizationName(name: string): boolean {
    const orgIndicators = [
      'guild', 'company', 'order', 'faction', 'army', 'council',
      'ministry', 'tribe', 'households', 'corporation'
    ];

    return orgIndicators.some(indicator => name.toLowerCase().includes(indicator));
  }

  /**
   * Check if name matches creature patterns
   */
  isCreatureName(name: string): boolean {
    const creatureIndicators = [
      'dragon', 'goblin', 'orc', 'elf', 'dwarf', 'halfling', 'giant',
      'wolf', 'bear', 'lion', 'tiger', 'eagle', 'serpent'
    ];

    return creatureIndicators.includes(name.toLowerCase());
  }

  /**
   * Check if name matches concept patterns
   */
  isConceptName(name: string): boolean {
    const conceptIndicators = [
      'magic', 'arcane', 'divine', 'holy', 'ancient', 'legendary'
    ];

    return conceptIndicators.includes(name.toLowerCase());
  }
}
