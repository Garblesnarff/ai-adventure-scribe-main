import { Character, AbilityScores } from '@/types/character';

/**
 * Transforms ability scores for database storage
 * Adds required fields and converts from ability score object to flat structure
 * @param abilityScores - The character's ability scores
 * @param characterId - The unique identifier of the character
 * @returns Object formatted for character_stats table
 */
export const transformAbilityScoresForStorage = (
  abilityScores: AbilityScores,
  characterId: string
) => {
  // Calculate base armor class (10 + dexterity modifier)
  const baseArmorClass = 10 + (abilityScores.dexterity.modifier || 0);
  
  // Calculate base hit points (we'll use constitution modifier + 8 for level 1)
  const baseHitPoints = 8 + (abilityScores.constitution.modifier || 0);

  return {
    character_id: characterId,
    strength: abilityScores.strength.score,
    dexterity: abilityScores.dexterity.score,
    constitution: abilityScores.constitution.score,
    intelligence: abilityScores.intelligence.score,
    wisdom: abilityScores.wisdom.score,
    charisma: abilityScores.charisma.score,
    armor_class: baseArmorClass,
    current_hit_points: baseHitPoints,
    max_hit_points: baseHitPoints,
  };
};

/**
 * Transforms equipment data for database storage
 * @param equipment - Array of equipment items
 * @param characterId - The unique identifier of the character
 * @returns Array of equipment objects formatted for character_equipment table
 */
export const transformEquipmentForStorage = (equipment: string[], characterId: string) => {
  return equipment.map(item => ({
    character_id: characterId,
    item_name: item,
    item_type: 'starting_equipment',
  }));
};