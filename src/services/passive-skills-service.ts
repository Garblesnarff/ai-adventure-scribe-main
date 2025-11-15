import { Character, AbilityScores } from '@/types/character';
import { getProficiencyBonus } from '@/data/levelProgression';

/**
 * PassiveSkillsService
 * Implements D&D 5E passive skill checks for automated scene awareness.
 * Formula: Passive Skill = 10 + ability modifier + proficiency bonus (if proficient)
 */

export interface PassiveCheckResult {
  characterId: string;
  characterName: string;
  skillName: string;
  passiveScore: number;
  success: boolean;
  dc: number;
  margin: number; // How much the check exceeded or failed by
}

export interface PassiveSceneCheck {
  perception: PassiveCheckResult[];
  insight: PassiveCheckResult[];
  investigation: PassiveCheckResult[];
}

export interface Scene {
  perceptionDC?: number;
  insightDC?: number;
  investigationDC?: number;
  perceptionDetails?: string;
  insightDetails?: string;
  investigationDetails?: string;
}

/**
 * Calculate ability modifier from ability score
 * Formula: (score - 10) / 2, rounded down
 */
function calculateAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate passive skill score
 * @param abilityScore - The relevant ability score (e.g., Wisdom for Perception)
 * @param proficiencyBonus - Character's proficiency bonus based on level
 * @param isProficient - Whether the character is proficient in this skill
 * @returns Passive skill score (10 + modifier + proficiency if proficient)
 */
export function calculatePassiveSkill(
  abilityScore: number,
  proficiencyBonus: number,
  isProficient: boolean,
): number {
  const abilityModifier = calculateAbilityModifier(abilityScore);
  const proficiency = isProficient ? proficiencyBonus : 0;
  return 10 + abilityModifier + proficiency;
}

/**
 * Calculate passive Perception (Wisdom-based)
 */
export function calculatePassivePerception(character: Character): number {
  if (!character.abilityScores || !character.level) {
    return 10; // Default if character data is incomplete
  }

  const wisdomScore = character.abilityScores.wisdom.score;
  const proficiencyBonus = getProficiencyBonus(character.level);
  const isProficient = character.skillProficiencies?.includes('Perception') || false;

  return calculatePassiveSkill(wisdomScore, proficiencyBonus, isProficient);
}

/**
 * Calculate passive Insight (Wisdom-based)
 */
export function calculatePassiveInsight(character: Character): number {
  if (!character.abilityScores || !character.level) {
    return 10; // Default if character data is incomplete
  }

  const wisdomScore = character.abilityScores.wisdom.score;
  const proficiencyBonus = getProficiencyBonus(character.level);
  const isProficient = character.skillProficiencies?.includes('Insight') || false;

  return calculatePassiveSkill(wisdomScore, proficiencyBonus, isProficient);
}

/**
 * Calculate passive Investigation (Intelligence-based)
 */
export function calculatePassiveInvestigation(character: Character): number {
  if (!character.abilityScores || !character.level) {
    return 10; // Default if character data is incomplete
  }

  const intelligenceScore = character.abilityScores.intelligence.score;
  const proficiencyBonus = getProficiencyBonus(character.level);
  const isProficient = character.skillProficiencies?.includes('Investigation') || false;

  return calculatePassiveSkill(intelligenceScore, proficiencyBonus, isProficient);
}

/**
 * Check a character's passive Perception against a DC
 */
export function checkPassivePerception(character: Character, dc: number): PassiveCheckResult {
  const passiveScore = calculatePassivePerception(character);
  const success = passiveScore >= dc;

  return {
    characterId: character.id || 'unknown',
    characterName: character.name || 'Unknown Character',
    skillName: 'Perception',
    passiveScore,
    success,
    dc,
    margin: passiveScore - dc,
  };
}

/**
 * Check a character's passive Insight against a DC
 */
export function checkPassiveInsight(character: Character, dc: number): PassiveCheckResult {
  const passiveScore = calculatePassiveInsight(character);
  const success = passiveScore >= dc;

  return {
    characterId: character.id || 'unknown',
    characterName: character.name || 'Unknown Character',
    skillName: 'Insight',
    passiveScore,
    success,
    dc,
    margin: passiveScore - dc,
  };
}

/**
 * Check a character's passive Investigation against a DC
 */
export function checkPassiveInvestigation(character: Character, dc: number): PassiveCheckResult {
  const passiveScore = calculatePassiveInvestigation(character);
  const success = passiveScore >= dc;

  return {
    characterId: character.id || 'unknown',
    characterName: character.name || 'Unknown Character',
    skillName: 'Investigation',
    passiveScore,
    success,
    dc,
    margin: passiveScore - dc,
  };
}

/**
 * Evaluate all passive checks for all characters in a scene
 * This is the main function DMs use to determine what characters notice
 *
 * @param characters - Array of characters in the scene
 * @param scene - Scene object with DCs for different passive checks
 * @returns PassiveSceneCheck with results for all characters and all passive skills
 */
export function evaluatePassiveChecks(characters: Character[], scene: Scene): PassiveSceneCheck {
  const results: PassiveSceneCheck = {
    perception: [],
    insight: [],
    investigation: [],
  };

  // Check Perception if DC is set
  if (scene.perceptionDC !== undefined) {
    results.perception = characters.map((char) =>
      checkPassivePerception(char, scene.perceptionDC!),
    );
  }

  // Check Insight if DC is set
  if (scene.insightDC !== undefined) {
    results.insight = characters.map((char) => checkPassiveInsight(char, scene.insightDC!));
  }

  // Check Investigation if DC is set
  if (scene.investigationDC !== undefined) {
    results.investigation = characters.map((char) =>
      checkPassiveInvestigation(char, scene.investigationDC!),
    );
  }

  return results;
}

/**
 * Get successful passive checks for narrative integration
 * Returns an array of strings describing what each character noticed
 *
 * @param sceneCheck - Results from evaluatePassiveChecks
 * @param scene - Scene with details about what can be noticed
 * @returns Array of narrative strings for successful checks
 */
export function getPassiveCheckNarration(sceneCheck: PassiveSceneCheck, scene: Scene): string[] {
  const narrations: string[] = [];

  // Perception successes
  if (scene.perceptionDetails) {
    const successfulChecks = sceneCheck.perception.filter((c) => c.success);
    if (successfulChecks.length > 0) {
      const names = successfulChecks.map((c) => c.characterName).join(', ');
      narrations.push(
        `${names}'s keen awareness (Passive Perception ${successfulChecks[0].passiveScore}) reveals: ${scene.perceptionDetails}`,
      );
    }
  }

  // Insight successes
  if (scene.insightDetails) {
    const successfulChecks = sceneCheck.insight.filter((c) => c.success);
    if (successfulChecks.length > 0) {
      const names = successfulChecks.map((c) => c.characterName).join(', ');
      narrations.push(
        `${names}'s intuition (Passive Insight ${successfulChecks[0].passiveScore}) senses: ${scene.insightDetails}`,
      );
    }
  }

  // Investigation successes
  if (scene.investigationDetails) {
    const successfulChecks = sceneCheck.investigation.filter((c) => c.success);
    if (successfulChecks.length > 0) {
      const names = successfulChecks.map((c) => c.characterName).join(', ');
      narrations.push(
        `${names}'s analytical mind (Passive Investigation ${successfulChecks[0].passiveScore}) notices: ${scene.investigationDetails}`,
      );
    }
  }

  return narrations;
}

/**
 * Helper to get all passive scores for a character
 * Useful for character sheets and debugging
 */
export function getCharacterPassiveScores(character: Character): {
  perception: number;
  insight: number;
  investigation: number;
} {
  return {
    perception: calculatePassivePerception(character),
    insight: calculatePassiveInsight(character),
    investigation: calculatePassiveInvestigation(character),
  };
}

export const PassiveSkillsService = {
  calculatePassiveSkill,
  calculatePassivePerception,
  calculatePassiveInsight,
  calculatePassiveInvestigation,
  checkPassivePerception,
  checkPassiveInsight,
  checkPassiveInvestigation,
  evaluatePassiveChecks,
  getPassiveCheckNarration,
  getCharacterPassiveScores,
};
