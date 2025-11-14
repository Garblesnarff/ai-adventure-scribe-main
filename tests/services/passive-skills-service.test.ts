import { describe, it, expect } from 'vitest';
import {
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
} from '../../src/services/passive-skills-service';
import type { Character } from '../../src/types/character';
import type { Scene } from '../../src/services/passive-skills-service';

describe('PassiveSkillsService', () => {
  describe('calculatePassiveSkill', () => {
    it('should calculate passive skill with D&D 5E formula', () => {
      // Formula: 10 + ability modifier + proficiency bonus (if proficient)
      // Ability score 14 = +2 modifier
      // Proficiency bonus = 3
      expect(calculatePassiveSkill(14, 3, true)).toBe(15); // 10 + 2 + 3
      expect(calculatePassiveSkill(14, 3, false)).toBe(12); // 10 + 2 + 0
    });

    it('should handle low ability scores correctly', () => {
      // Ability score 8 = -1 modifier
      expect(calculatePassiveSkill(8, 2, true)).toBe(11); // 10 + (-1) + 2
      expect(calculatePassiveSkill(8, 2, false)).toBe(9); // 10 + (-1) + 0
    });

    it('should handle high ability scores correctly', () => {
      // Ability score 20 = +5 modifier
      expect(calculatePassiveSkill(20, 6, true)).toBe(21); // 10 + 5 + 6
      expect(calculatePassiveSkill(20, 6, false)).toBe(15); // 10 + 5 + 0
    });

    it('should handle average ability scores (10)', () => {
      // Ability score 10 = +0 modifier
      expect(calculatePassiveSkill(10, 2, true)).toBe(12); // 10 + 0 + 2
      expect(calculatePassiveSkill(10, 2, false)).toBe(10); // 10 + 0 + 0
    });

    it('should calculate modifiers correctly for all ability scores', () => {
      // Test the ability modifier calculation for various scores
      expect(calculatePassiveSkill(1, 2, false)).toBe(5);   // 10 + (-5) + 0
      expect(calculatePassiveSkill(9, 2, false)).toBe(9);   // 10 + (-1) + 0
      expect(calculatePassiveSkill(11, 2, false)).toBe(10); // 10 + 0 + 0
      expect(calculatePassiveSkill(12, 2, false)).toBe(11); // 10 + 1 + 0
      expect(calculatePassiveSkill(13, 2, false)).toBe(11); // 10 + 1 + 0
      expect(calculatePassiveSkill(16, 2, false)).toBe(13); // 10 + 3 + 0
    });
  });

  describe('Character Passive Skill Calculations', () => {
    const createTestCharacter = (
      wisdom: number,
      intelligence: number,
      level: number,
      proficiencies: string[]
    ): Character => ({
      id: 'test-char-1',
      name: 'Test Character',
      level,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: intelligence, modifier: Math.floor((intelligence - 10) / 2), savingThrow: false },
        wisdom: { score: wisdom, modifier: Math.floor((wisdom - 10) / 2), savingThrow: false },
        charisma: { score: 10, modifier: 0, savingThrow: false },
      },
      skillProficiencies: proficiencies,
    });

    describe('calculatePassivePerception', () => {
      it('should calculate passive Perception for proficient character', () => {
        const character = createTestCharacter(16, 10, 5, ['Perception', 'Athletics']);
        // Wisdom 16 = +3 modifier, Level 5 = +3 proficiency, is proficient
        // 10 + 3 + 3 = 16
        expect(calculatePassivePerception(character)).toBe(16);
      });

      it('should calculate passive Perception for non-proficient character', () => {
        const character = createTestCharacter(14, 10, 3, ['Athletics', 'Stealth']);
        // Wisdom 14 = +2 modifier, Level 3 = +2 proficiency, NOT proficient
        // 10 + 2 + 0 = 12
        expect(calculatePassivePerception(character)).toBe(12);
      });

      it('should return 10 for character with no ability scores', () => {
        const character: Character = {
          id: 'incomplete-char',
          name: 'Incomplete',
          level: 1,
        };
        expect(calculatePassivePerception(character)).toBe(10);
      });
    });

    describe('calculatePassiveInsight', () => {
      it('should calculate passive Insight for proficient character', () => {
        const character = createTestCharacter(18, 10, 9, ['Insight', 'Perception']);
        // Wisdom 18 = +4 modifier, Level 9 = +4 proficiency, is proficient
        // 10 + 4 + 4 = 18
        expect(calculatePassiveInsight(character)).toBe(18);
      });

      it('should calculate passive Insight for non-proficient character', () => {
        const character = createTestCharacter(12, 10, 1, ['Athletics']);
        // Wisdom 12 = +1 modifier, Level 1 = +2 proficiency, NOT proficient
        // 10 + 1 + 0 = 11
        expect(calculatePassiveInsight(character)).toBe(11);
      });
    });

    describe('calculatePassiveInvestigation', () => {
      it('should calculate passive Investigation for proficient character', () => {
        const character = createTestCharacter(10, 16, 13, ['Investigation', 'Arcana']);
        // Intelligence 16 = +3 modifier, Level 13 = +5 proficiency, is proficient
        // 10 + 3 + 5 = 18
        expect(calculatePassiveInvestigation(character)).toBe(18);
      });

      it('should calculate passive Investigation for non-proficient character', () => {
        const character = createTestCharacter(10, 14, 5, ['History', 'Religion']);
        // Intelligence 14 = +2 modifier, Level 5 = +3 proficiency, NOT proficient
        // 10 + 2 + 0 = 12
        expect(calculatePassiveInvestigation(character)).toBe(12);
      });
    });

    describe('getCharacterPassiveScores', () => {
      it('should return all three passive scores', () => {
        const character = createTestCharacter(16, 14, 5, ['Perception', 'Investigation']);
        const scores = getCharacterPassiveScores(character);

        expect(scores.perception).toBe(16); // 10 + 3 (Wis mod) + 3 (prof)
        expect(scores.insight).toBe(13);    // 10 + 3 (Wis mod) + 0
        expect(scores.investigation).toBe(15); // 10 + 2 (Int mod) + 3 (prof)
      });
    });
  });

  describe('Passive Check Functions', () => {
    const createTestCharacter = (
      wisdom: number,
      intelligence: number,
      level: number,
      proficiencies: string[]
    ): Character => ({
      id: 'test-char-1',
      name: 'Aragorn',
      level,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: intelligence, modifier: Math.floor((intelligence - 10) / 2), savingThrow: false },
        wisdom: { score: wisdom, modifier: Math.floor((wisdom - 10) / 2), savingThrow: false },
        charisma: { score: 10, modifier: 0, savingThrow: false },
      },
      skillProficiencies: proficiencies,
    });

    describe('checkPassivePerception', () => {
      it('should succeed when passive score meets DC', () => {
        const character = createTestCharacter(16, 10, 5, ['Perception']);
        const result = checkPassivePerception(character, 15);

        expect(result.success).toBe(true);
        expect(result.passiveScore).toBe(16);
        expect(result.dc).toBe(15);
        expect(result.margin).toBe(1);
        expect(result.skillName).toBe('Perception');
        expect(result.characterName).toBe('Aragorn');
      });

      it('should fail when passive score is below DC', () => {
        const character = createTestCharacter(10, 10, 1, []);
        const result = checkPassivePerception(character, 15);

        expect(result.success).toBe(false);
        expect(result.passiveScore).toBe(10);
        expect(result.dc).toBe(15);
        expect(result.margin).toBe(-5);
      });
    });

    describe('checkPassiveInsight', () => {
      it('should succeed when passive score exceeds DC', () => {
        const character = createTestCharacter(18, 10, 5, ['Insight']);
        const result = checkPassiveInsight(character, 14);

        expect(result.success).toBe(true);
        expect(result.passiveScore).toBe(15); // 10 + 4 + 3
        expect(result.margin).toBe(1);
      });
    });

    describe('checkPassiveInvestigation', () => {
      it('should succeed when passive score equals DC', () => {
        const character = createTestCharacter(10, 16, 5, ['Investigation']);
        const result = checkPassiveInvestigation(character, 16);

        expect(result.success).toBe(true);
        expect(result.passiveScore).toBe(16);
        expect(result.margin).toBe(0);
      });
    });
  });

  describe('evaluatePassiveChecks', () => {
    const createTestCharacter = (
      name: string,
      wisdom: number,
      intelligence: number,
      level: number,
      proficiencies: string[]
    ): Character => ({
      id: `char-${name}`,
      name,
      level,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: intelligence, modifier: Math.floor((intelligence - 10) / 2), savingThrow: false },
        wisdom: { score: wisdom, modifier: Math.floor((wisdom - 10) / 2), savingThrow: false },
        charisma: { score: 10, modifier: 0, savingThrow: false },
      },
      skillProficiencies: proficiencies,
    });

    it('should evaluate all three passive checks for multiple characters', () => {
      const characters = [
        createTestCharacter('Ranger', 16, 12, 5, ['Perception']),
        createTestCharacter('Wizard', 12, 18, 5, ['Investigation', 'Arcana']),
        createTestCharacter('Cleric', 18, 10, 5, ['Insight', 'Religion']),
      ];

      const scene: Scene = {
        perceptionDC: 14,
        insightDC: 16,
        investigationDC: 17,
      };

      const results = evaluatePassiveChecks(characters, scene);

      expect(results.perception).toHaveLength(3);
      expect(results.insight).toHaveLength(3);
      expect(results.investigation).toHaveLength(3);

      // Ranger should pass Perception (16 vs DC 14)
      expect(results.perception[0].success).toBe(true);

      // Cleric should pass Insight (15 vs DC 16) - wait, let me recalculate
      // Cleric: Wisdom 18 = +4, Level 5 = +3 prof, has Insight proficiency
      // 10 + 4 + 3 = 17, so should pass DC 16
      expect(results.insight[2].success).toBe(true);

      // Wizard should pass Investigation (10 + 4 + 3 = 17 vs DC 17)
      expect(results.investigation[1].success).toBe(true);
    });

    it('should only check skills with defined DCs', () => {
      const characters = [
        createTestCharacter('Fighter', 12, 10, 3, []),
      ];

      const scene: Scene = {
        perceptionDC: 12,
        // No insight or investigation DCs
      };

      const results = evaluatePassiveChecks(characters, scene);

      expect(results.perception).toHaveLength(1);
      expect(results.insight).toHaveLength(0);
      expect(results.investigation).toHaveLength(0);
    });

    it('should handle empty character array', () => {
      const scene: Scene = {
        perceptionDC: 15,
        insightDC: 14,
        investigationDC: 13,
      };

      const results = evaluatePassiveChecks([], scene);

      expect(results.perception).toHaveLength(0);
      expect(results.insight).toHaveLength(0);
      expect(results.investigation).toHaveLength(0);
    });
  });

  describe('getPassiveCheckNarration', () => {
    const createTestCharacter = (
      name: string,
      wisdom: number,
      intelligence: number,
      level: number,
      proficiencies: string[]
    ): Character => ({
      id: `char-${name}`,
      name,
      level,
      abilityScores: {
        strength: { score: 10, modifier: 0, savingThrow: false },
        dexterity: { score: 10, modifier: 0, savingThrow: false },
        constitution: { score: 10, modifier: 0, savingThrow: false },
        intelligence: { score: intelligence, modifier: Math.floor((intelligence - 10) / 2), savingThrow: false },
        wisdom: { score: wisdom, modifier: Math.floor((wisdom - 10) / 2), savingThrow: false },
        charisma: { score: 10, modifier: 0, savingThrow: false },
      },
      skillProficiencies: proficiencies,
    });

    it('should generate narration for successful passive checks', () => {
      const characters = [
        createTestCharacter('Legolas', 18, 12, 5, ['Perception']),
      ];

      const scene: Scene = {
        perceptionDC: 14,
        perceptionDetails: 'subtle scuff marks on the floor leading to a hidden door',
      };

      const results = evaluatePassiveChecks(characters, scene);
      const narrations = getPassiveCheckNarration(results, scene);

      expect(narrations).toHaveLength(1);
      expect(narrations[0]).toContain('Legolas');
      expect(narrations[0]).toContain('Passive Perception');
      expect(narrations[0]).toContain('subtle scuff marks on the floor leading to a hidden door');
    });

    it('should not generate narration for failed checks', () => {
      const characters = [
        createTestCharacter('Commoner', 10, 10, 1, []),
      ];

      const scene: Scene = {
        perceptionDC: 20, // Too high for the commoner
        perceptionDetails: 'well-hidden trap',
      };

      const results = evaluatePassiveChecks(characters, scene);
      const narrations = getPassiveCheckNarration(results, scene);

      expect(narrations).toHaveLength(0);
    });

    it('should generate narrations for multiple successful characters', () => {
      const characters = [
        createTestCharacter('Gandalf', 20, 20, 17, ['Insight', 'Investigation', 'Perception']),
        createTestCharacter('Aragorn', 16, 12, 10, ['Perception', 'Survival']),
      ];

      const scene: Scene = {
        perceptionDC: 14,
        perceptionDetails: 'orc tracks in the mud',
        insightDC: 15,
        insightDetails: 'the merchant is lying about the prices',
      };

      const results = evaluatePassiveChecks(characters, scene);
      const narrations = getPassiveCheckNarration(results, scene);

      expect(narrations.length).toBeGreaterThan(0);
      expect(narrations.some(n => n.includes('Perception') && n.includes('orc tracks'))).toBe(true);
      expect(narrations.some(n => n.includes('Insight') && n.includes('merchant is lying'))).toBe(true);
    });

    it('should return empty array when no scene details are provided', () => {
      const characters = [
        createTestCharacter('Hero', 16, 14, 5, ['Perception']),
      ];

      const scene: Scene = {
        perceptionDC: 12,
        // No perceptionDetails
      };

      const results = evaluatePassiveChecks(characters, scene);
      const narrations = getPassiveCheckNarration(results, scene);

      expect(narrations).toHaveLength(0);
    });
  });

  describe('D&D 5E Rules Compliance', () => {
    it('should match official D&D 5E proficiency bonus progression', () => {
      // Test characters at different levels to ensure proficiency bonus is correct
      const testAtLevel = (level: number, expectedProf: number, wisdom: number = 14) => {
        const character: Character = {
          id: 'test',
          name: 'Test',
          level,
          abilityScores: {
            strength: { score: 10, modifier: 0, savingThrow: false },
            dexterity: { score: 10, modifier: 0, savingThrow: false },
            constitution: { score: 10, modifier: 0, savingThrow: false },
            intelligence: { score: 10, modifier: 0, savingThrow: false },
            wisdom: { score: wisdom, modifier: Math.floor((wisdom - 10) / 2), savingThrow: false },
            charisma: { score: 10, modifier: 0, savingThrow: false },
          },
          skillProficiencies: ['Perception'],
        };
        const passive = calculatePassivePerception(character);
        const wisModifier = Math.floor((wisdom - 10) / 2);
        expect(passive).toBe(10 + wisModifier + expectedProf);
      };

      testAtLevel(1, 2);   // Levels 1-4: +2
      testAtLevel(4, 2);
      testAtLevel(5, 3);   // Levels 5-8: +3
      testAtLevel(8, 3);
      testAtLevel(9, 4);   // Levels 9-12: +4
      testAtLevel(12, 4);
      testAtLevel(13, 5);  // Levels 13-16: +5
      testAtLevel(16, 5);
      testAtLevel(17, 6);  // Levels 17-20: +6
      testAtLevel(20, 6);
    });

    it('should calculate ability modifiers according to D&D 5E rules', () => {
      // Test the formula: (ability score - 10) / 2, rounded down
      const testCases = [
        { score: 1, expectedMod: -5 },
        { score: 8, expectedMod: -1 },
        { score: 9, expectedMod: -1 },
        { score: 10, expectedMod: 0 },
        { score: 11, expectedMod: 0 },
        { score: 12, expectedMod: 1 },
        { score: 13, expectedMod: 1 },
        { score: 14, expectedMod: 2 },
        { score: 15, expectedMod: 2 },
        { score: 16, expectedMod: 3 },
        { score: 18, expectedMod: 4 },
        { score: 20, expectedMod: 5 },
      ];

      testCases.forEach(({ score, expectedMod }) => {
        const passive = calculatePassiveSkill(score, 0, false);
        expect(passive).toBe(10 + expectedMod);
      });
    });
  });
});
