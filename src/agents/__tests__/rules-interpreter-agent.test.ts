import { RulesInterpreterAgent } from '../rules-interpreter-agent';
import { Character } from '@/types/character';

describe('RulesInterpreterAgent', () => {
  let agent: RulesInterpreterAgent;
  let mockCharacter: Character;

  beforeEach(() => {
    agent = new RulesInterpreterAgent();
    mockCharacter = {
      id: '1',
      name: 'Test Character',
      level: 5,
      hitPoints: {
        current: 50,
        maximum: 50,
        temporary: 10,
      },
      deathSaves: {
        successes: 0,
        failures: 0,
      },
      activeConditions: [],
      abilityScores: {
        strength: { score: 16, modifier: 3, savingThrow: false },
        dexterity: { score: 14, modifier: 2, savingThrow: true },
        constitution: { score: 15, modifier: 2, savingThrow: false },
        intelligence: { score: 12, modifier: 1, savingThrow: false },
        wisdom: { score: 10, modifier: 0, savingThrow: true },
        charisma: { score: 8, modifier: -1, savingThrow: false },
      },
      savingThrowProficiencies: ['dexterity', 'wisdom'],
    };
  });

  describe('applyDamage', () => {
    it('should first reduce temporary hit points', () => {
      const updatedCharacter = agent.applyDamage(mockCharacter, 15);
      expect(updatedCharacter.hitPoints.temporary).toBe(0);
      expect(updatedCharacter.hitPoints.current).toBe(45);
    });

    it('should not go below 0 hit points', () => {
      const updatedCharacter = agent.applyDamage(mockCharacter, 100);
      expect(updatedCharacter.hitPoints.current).toBe(0);
    });

    it('should apply the Unconscious condition at 0 HP', () => {
      const updatedCharacter = agent.applyDamage(mockCharacter, 100);
      expect(updatedCharacter.activeConditions).toContain('Unconscious');
    });
  });

  describe('applyHealing', () => {
    it('should increase current hit points', () => {
      mockCharacter.hitPoints.current = 20;
      const updatedCharacter = agent.applyHealing(mockCharacter, 10);
      expect(updatedCharacter.hitPoints.current).toBe(30);
    });

    it('should not exceed maximum hit points', () => {
      const updatedCharacter = agent.applyHealing(mockCharacter, 20);
      expect(updatedCharacter.hitPoints.current).toBe(50);
    });
  });

  describe('handleDeathSavingThrow', () => {
    it('should handle a successful death save', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Roll of 11
      const updatedCharacter = agent.handleDeathSavingThrow(mockCharacter);
      expect(updatedCharacter.deathSaves.successes).toBe(1);
      expect(updatedCharacter.deathSaves.failures).toBe(0);
      jest.spyOn(Math, 'random').mockRestore();
    });

    it('should handle a failed death save', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.2); // Roll of 5
      const updatedCharacter = agent.handleDeathSavingThrow(mockCharacter);
      expect(updatedCharacter.deathSaves.successes).toBe(0);
      expect(updatedCharacter.deathSaves.failures).toBe(1);
      jest.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('handleSavingThrow', () => {
    it('should calculate saving throws correctly', () => {
      // Mock the random number generator for this test
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // This will result in a roll of 11
      const result = agent.handleSavingThrow(mockCharacter, 'dexterity', 15);
      expect(result.roll).toBe(11);
      // Modifier (2) + Proficiency (3) = 5. 11 + 5 = 16.
      expect(result.total).toBe(16);
      expect(result.success).toBe(true);
      jest.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('applyCondition and removeCondition', () => {
    it('should apply and remove conditions', () => {
      let updatedCharacter = agent.applyCondition(mockCharacter, 'Poisoned');
      expect(updatedCharacter.activeConditions).toContain('Poisoned');
      updatedCharacter = agent.removeCondition(updatedCharacter, 'Poisoned');
      expect(updatedCharacter.activeConditions).not.toContain('Poisoned');
    });
  });
});
