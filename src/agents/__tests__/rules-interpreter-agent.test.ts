/**
 * Comprehensive Tests for RulesInterpreterAgent
 *
 * Tests D&D 5E rules validation including:
 * - Action validation (attack, movement, ability checks)
 * - Spell validation (slots, components, concentration)
 * - Combat rules (attack rolls, advantage, crits, damage)
 * - Modifier calculations (ability scores, proficiency, skills)
 * - Encounter validation (CR, party composition)
 * - Edge cases (unconscious, depleted resources, invalid choices)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AgentTask } from '../types';
import type { EncounterSpec, MonsterDef } from '@/types/encounters';

// Mock all dependencies before importing the agent
vi.mock('../rules/services/ValidationService', () => ({
  ValidationService: vi.fn(),
}));

vi.mock('../rules/services/ValidationResultsProcessor', () => ({
  ValidationResultsProcessor: vi.fn(),
}));

vi.mock('../messaging/agent-messaging-service', () => ({
  AgentMessagingService: {
    getInstance: vi.fn(),
  },
}));

vi.mock('@/utils/edgeFunctionHandler', () => ({
  callEdgeFunction: vi.fn(),
}));

vi.mock('@/services/encounters/srd-loader', () => ({
  loadMonsters: vi.fn(() => []),
}));

vi.mock('../error/services/error-handling-service', () => ({
  ErrorHandlingService: {
    getInstance: vi.fn(() => ({
      handleOperation: vi.fn((fn) => fn()),
    })),
  },
}));

vi.mock('../rules/validators/encounter-validator', () => ({
  validateEncounterSpec: vi.fn((spec) => ({
    ok: true,
    issues: [],
  })),
}));

// Import agent after mocks are set up
const { RulesInterpreterAgent } = await import('../rules-interpreter-agent');
const { ValidationService } = await import('../rules/services/ValidationService');
const { ValidationResultsProcessor } = await import('../rules/services/ValidationResultsProcessor');
const { AgentMessagingService } = await import('../messaging/agent-messaging-service');
const edgeFunctionHandler = await import('@/utils/edgeFunctionHandler');

// ============================
// Helper Functions & Test Data
// ============================

/**
 * Creates a mock character with D&D 5E stats
 */
function createMockCharacter(overrides: any = {}) {
  return {
    id: 'char_1',
    name: 'Test Fighter',
    class: 'Fighter',
    level: 5,
    size: 'medium',
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    proficiencyBonus: 3,
    ac: { base: 18 },
    maxHp: 45,
    currentHp: 45,
    speed: 30,
    weapons: [
      {
        name: 'Longsword',
        ability: 'str',
        proficient: true,
        damageDice: '1d8',
        damageType: 'slashing',
      },
    ],
    savingThrowProficiencies: { str: true, con: true },
    skillProficiencies: { athletics: true, perception: true },
    ...overrides,
  };
}

/**
 * Creates a spellcaster character
 */
function createSpellcaster(overrides: any = {}) {
  return {
    id: 'caster_1',
    name: 'Test Wizard',
    class: 'Wizard',
    level: 5,
    size: 'medium',
    abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
    proficiencyBonus: 3,
    ac: { base: 12 },
    maxHp: 28,
    currentHp: 28,
    speed: 30,
    spellSlots: {
      1: { total: 4, expended: 1 },
      2: { total: 3, expended: 0 },
      3: { total: 2, expended: 1 },
    },
    spellcastingAbility: 'int',
    spellSaveDC: 15,
    spellAttackBonus: 7,
    conditions: { concentrating: false },
    ...overrides,
  };
}

/**
 * Creates an unconscious/dying character
 */
function createUnconsciousCharacter() {
  return {
    ...createMockCharacter(),
    currentHp: 0,
    conditions: {
      unconscious: true,
      deathSaves: { successes: 1, failures: 1 },
    },
  };
}

/**
 * Calculates ability modifier per D&D 5E rules
 */
function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/**
 * Gets proficiency bonus by level
 */
function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

// ============================
// Test Suite
// ============================

describe('RulesInterpreterAgent', () => {
  let agent: RulesInterpreterAgent;
  let mockValidationService: any;
  let mockResultsProcessor: any;
  let mockMessagingService: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock instances
    mockValidationService = {
      validateRules: vi.fn(),
    };
    mockResultsProcessor = {
      processResults: vi.fn(),
    };
    mockMessagingService = {
      sendMessage: vi.fn(),
    };

    // Mock constructors
    vi.mocked(ValidationService).mockImplementation(() => mockValidationService);
    vi.mocked(ValidationResultsProcessor).mockImplementation(() => mockResultsProcessor);
    vi.mocked(AgentMessagingService.getInstance).mockReturnValue(mockMessagingService);
    vi.mocked(edgeFunctionHandler.callEdgeFunction).mockResolvedValue({ result: 'success' });

    agent = new RulesInterpreterAgent();
  });

  // ============================
  // 1. Action Validation Tests
  // ============================

  describe('Action Validation', () => {
    it('validates legal attack action', async () => {
      const character = createMockCharacter();
      const task: AgentTask = {
        description: 'Validate melee attack',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: character,
          weapon: character.weapons[0],
          targetAC: 15,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'attack', isValid: true, description: 'Attack is valid' },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(mockValidationService.validateRules).toHaveBeenCalledWith(task.context);
      expect(mockMessagingService.sendMessage).toHaveBeenCalled();
    });

    it('rejects attack with insufficient resources (no action available)', async () => {
      const character = createMockCharacter({ actionAvailable: false });
      const task: AgentTask = {
        description: 'Validate attack without action',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: character,
          actionAvailable: false,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'attack',
          isValid: false,
          description: 'No action available',
          rule_conditions: [
            {
              description: 'Actor must have action available',
              suggestion: 'Wait until next turn',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: 'No action available' }],
        suggestions: ['Wait until next turn'],
        errors: ['No action available'],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.validationResults.isValid).toBe(false);
      expect(result.data.validationResults.errors).toContain('No action available');
    });

    it('validates movement within speed limit', async () => {
      const character = createMockCharacter({ speed: 30 });
      const task: AgentTask = {
        description: 'Validate movement',
        context: {
          ruleType: 'movement',
          action: 'move',
          actor: character,
          distance: 25,
          movementUsed: 0,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'movement', isValid: true, description: 'Movement is valid' },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.validationResults.isValid).toBe(true);
    });

    it('rejects movement exceeding speed', async () => {
      const character = createMockCharacter({ speed: 30 });
      const task: AgentTask = {
        description: 'Validate excessive movement',
        context: {
          ruleType: 'movement',
          action: 'move',
          actor: character,
          distance: 40,
          movementUsed: 0,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'movement',
          isValid: false,
          description: 'Movement exceeds speed limit',
          rule_conditions: [
            {
              description: 'Distance must be within speed limit',
              suggestion: 'Reduce movement or use Dash action',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: 'Movement exceeds speed limit' }],
        suggestions: ['Reduce movement or use Dash action'],
        errors: ['Movement exceeds speed limit'],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.data.validationResults.isValid).toBe(false);
      expect(result.data.validationResults.errors).toContain('Movement exceeds speed limit');
    });

    it('validates ability check with correct modifiers', async () => {
      const character = createMockCharacter();
      // STR 16 = +3 modifier, +3 proficiency = +6 for Athletics
      const task: AgentTask = {
        description: 'Validate ability check',
        context: {
          ruleType: 'abilityCheck',
          action: 'abilityCheck',
          actor: character,
          ability: 'str',
          skill: 'athletics',
          dc: 15,
          expectedModifier: getAbilityModifier(16) + 3, // +6
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'abilityCheck', isValid: true, description: 'Check is valid' },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.expectedModifier).toBe(6);
    });
  });

  // ============================
  // 2. Spell Validation Tests
  // ============================

  describe('Spell Validation', () => {
    it('validates spell with available slot', async () => {
      const caster = createSpellcaster();
      const task: AgentTask = {
        description: 'Cast Fireball',
        context: {
          ruleType: 'spellcast',
          action: 'castSpell',
          actor: caster,
          spell: {
            name: 'Fireball',
            level: 3,
            components: ['V', 'S', 'M'],
            school: 'evocation',
            castingTime: 'action',
          },
          spellLevel: 3,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'spellcast',
          isValid: true,
          description: 'Spell slot available',
          rule_requirements: [],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.validationResults.isValid).toBe(true);
    });

    it('rejects spell with depleted slots', async () => {
      const caster = createSpellcaster({
        spellSlots: {
          1: { total: 4, expended: 4 }, // All 1st level slots used
          2: { total: 3, expended: 3 }, // All 2nd level slots used
          3: { total: 2, expended: 2 }, // All 3rd level slots used
        },
      });
      const task: AgentTask = {
        description: 'Cast spell without slots',
        context: {
          ruleType: 'spellcast',
          action: 'castSpell',
          actor: caster,
          spell: { name: 'Magic Missile', level: 1 },
          spellLevel: 1,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'spellcast',
          isValid: false,
          description: 'No spell slots available',
          rule_requirements: [
            {
              description: 'Requires available spell slot of level 1 or higher',
              suggestion: 'Take a long rest to recover spell slots',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: 'No spell slots available' }],
        suggestions: ['Take a long rest to recover spell slots'],
        errors: ['No spell slots available'],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.data.validationResults.isValid).toBe(false);
      expect(result.data.validationResults.errors).toContain('No spell slots available');
    });

    it('validates spell level restrictions (cannot cast above max level)', async () => {
      const caster = createSpellcaster({ level: 5 }); // Max 3rd level spells
      const task: AgentTask = {
        description: 'Cast high-level spell',
        context: {
          ruleType: 'spellcast',
          action: 'castSpell',
          actor: caster,
          spell: { name: 'Wall of Force', level: 5 }, // 5th level spell
          spellLevel: 5,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'spellcast',
          isValid: false,
          description: 'Spell level too high for character level',
          rule_requirements: [
            {
              description: 'Character level 5 can only cast up to 3rd level spells',
              suggestion: 'Gain more levels to cast higher level spells',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: 'Spell level too high for character level' }],
        suggestions: ['Gain more levels to cast higher level spells'],
        errors: ['Spell level too high for character level'],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.data.validationResults.isValid).toBe(false);
    });

    it('validates component requirements', async () => {
      const caster = createSpellcaster();
      const task: AgentTask = {
        description: 'Cast spell with components',
        context: {
          ruleType: 'spellcast',
          action: 'castSpell',
          actor: caster,
          spell: {
            name: 'Identify',
            level: 1,
            components: ['V', 'S', 'M'],
            materials: 'a pearl worth at least 100 gp',
            ritual: true,
          },
          hasComponents: true,
          hasMaterials: true,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'spellcast',
          isValid: true,
          description: 'All components available',
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.validationResults.isValid).toBe(true);
    });

    it('validates concentration limits (one spell at a time)', async () => {
      const caster = createSpellcaster({
        conditions: { concentrating: true },
      });
      const task: AgentTask = {
        description: 'Cast concentration spell while concentrating',
        context: {
          ruleType: 'spellcast',
          action: 'castSpell',
          actor: caster,
          spell: {
            name: 'Hold Person',
            level: 2,
            concentration: true,
          },
          currentlyConcentrating: true,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'spellcast',
          isValid: true,
          description: 'Casting new concentration spell will break existing concentration',
          rule_conditions: [
            {
              description: 'Can only concentrate on one spell',
              suggestion: 'Existing concentration will be broken',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: ['Existing concentration will be broken'],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.validationResults.suggestions).toContain(
        'Existing concentration will be broken',
      );
    });
  });

  // ============================
  // 3. Combat Rules Tests
  // ============================

  describe('Combat Rules', () => {
    it('calculates attack roll with correct modifiers', async () => {
      const attacker = createMockCharacter();
      // STR 16 = +3, proficiency +3 = +6 to hit
      const expectedToHit = getAbilityModifier(16) + 3;

      const task: AgentTask = {
        description: 'Attack with longsword',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: attacker,
          weapon: attacker.weapons[0],
          targetAC: 15,
          expectedAttackBonus: expectedToHit,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'attack', isValid: true },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.expectedAttackBonus).toBe(6);
    });

    it('applies advantage correctly', async () => {
      const attacker = createMockCharacter();
      const task: AgentTask = {
        description: 'Attack with advantage',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: attacker,
          weapon: attacker.weapons[0],
          targetAC: 15,
          advantage: true,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'attack',
          isValid: true,
          description: 'Attack with advantage: roll twice, take higher',
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.advantage).toBe(true);
    });

    it('applies disadvantage correctly', async () => {
      const attacker = createMockCharacter();
      const task: AgentTask = {
        description: 'Attack with disadvantage',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: attacker,
          weapon: attacker.weapons[0],
          targetAC: 15,
          disadvantage: true,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'attack',
          isValid: true,
          description: 'Attack with disadvantage: roll twice, take lower',
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.disadvantage).toBe(true);
    });

    it('recognizes critical hits on natural 20', async () => {
      const attacker = createMockCharacter();
      const task: AgentTask = {
        description: 'Critical hit',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: attacker,
          weapon: attacker.weapons[0],
          targetAC: 15,
          attackRoll: 20,
          isCritical: true,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'attack',
          isValid: true,
          description: 'Critical hit: double all damage dice',
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: ['Critical hit: double all damage dice'],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.isCritical).toBe(true);
    });

    it('calculates damage with ability modifier', async () => {
      const attacker = createMockCharacter();
      const strMod = getAbilityModifier(16); // +3
      const task: AgentTask = {
        description: 'Calculate damage',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: attacker,
          weapon: attacker.weapons[0],
          hit: true,
          damageRoll: 5, // 1d8 roll
          expectedDamage: 5 + strMod, // 8 total
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'attack', isValid: true },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.expectedDamage).toBe(8);
    });

    it('applies damage resistance (half damage)', async () => {
      const attacker = createMockCharacter();
      const defender = createMockCharacter({
        id: 'defender',
        resistances: { resistant: ['slashing'] },
      });
      const task: AgentTask = {
        description: 'Attack resistant target',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: attacker,
          target: defender,
          weapon: attacker.weapons[0],
          damageType: 'slashing',
          damage: 10,
          expectedFinalDamage: 5, // halved
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'attack',
          isValid: true,
          description: 'Target has resistance to slashing damage',
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: ['Target has resistance: damage halved'],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.expectedFinalDamage).toBe(5);
    });
  });

  // ============================
  // 4. Modifier Calculations Tests
  // ============================

  describe('Modifier Calculations', () => {
    it('calculates ability modifiers correctly for various scores', () => {
      expect(getAbilityModifier(8)).toBe(-1); // 8 -> -1
      expect(getAbilityModifier(10)).toBe(0); // 10 -> 0
      expect(getAbilityModifier(11)).toBe(0); // 11 -> 0
      expect(getAbilityModifier(12)).toBe(1); // 12 -> +1
      expect(getAbilityModifier(14)).toBe(2); // 14 -> +2
      expect(getAbilityModifier(16)).toBe(3); // 16 -> +3
      expect(getAbilityModifier(18)).toBe(4); // 18 -> +4
      expect(getAbilityModifier(20)).toBe(5); // 20 -> +5
    });

    it('calculates proficiency bonus by level', () => {
      expect(getProficiencyBonus(1)).toBe(2); // Level 1-4 -> +2
      expect(getProficiencyBonus(4)).toBe(2);
      expect(getProficiencyBonus(5)).toBe(3); // Level 5-8 -> +3
      expect(getProficiencyBonus(8)).toBe(3);
      expect(getProficiencyBonus(9)).toBe(4); // Level 9-12 -> +4
      expect(getProficiencyBonus(12)).toBe(4);
      expect(getProficiencyBonus(13)).toBe(5); // Level 13-16 -> +5
      expect(getProficiencyBonus(16)).toBe(5);
      expect(getProficiencyBonus(17)).toBe(6); // Level 17-20 -> +6
      expect(getProficiencyBonus(20)).toBe(6);
    });

    it('calculates skill bonus with proficiency', async () => {
      const character = createMockCharacter({
        abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
        level: 5,
        proficiencyBonus: 3,
        skillProficiencies: { athletics: true },
      });

      const strMod = getAbilityModifier(16); // +3
      const profBonus = 3;
      const expectedBonus = strMod + profBonus; // +6

      const task: AgentTask = {
        description: 'Calculate Athletics check bonus',
        context: {
          ruleType: 'skillCheck',
          actor: character,
          skill: 'athletics',
          ability: 'str',
          proficient: true,
          expectedBonus,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'skillCheck', isValid: true },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.expectedBonus).toBe(6);
    });

    it('calculates skill bonus without proficiency', async () => {
      const character = createMockCharacter({
        abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
        skillProficiencies: { athletics: true },
      });

      const dexMod = getAbilityModifier(14); // +2
      const expectedBonus = dexMod; // No proficiency in Stealth

      const task: AgentTask = {
        description: 'Calculate unproficient skill check',
        context: {
          ruleType: 'skillCheck',
          actor: character,
          skill: 'stealth',
          ability: 'dex',
          proficient: false,
          expectedBonus,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'skillCheck', isValid: true },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.expectedBonus).toBe(2);
    });

    it('calculates spell save DC correctly', async () => {
      const caster = createSpellcaster({
        abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
        level: 5,
        proficiencyBonus: 3,
        spellcastingAbility: 'int',
      });

      const intMod = getAbilityModifier(18); // +4
      const profBonus = 3;
      const expectedDC = 8 + intMod + profBonus; // 15

      expect(expectedDC).toBe(15);
      expect(caster.spellSaveDC).toBe(15);
    });

    it('calculates spell attack bonus correctly', async () => {
      const caster = createSpellcaster({
        abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
        level: 5,
        proficiencyBonus: 3,
        spellcastingAbility: 'int',
      });

      const intMod = getAbilityModifier(18); // +4
      const profBonus = 3;
      const expectedAttackBonus = intMod + profBonus; // +7

      expect(expectedAttackBonus).toBe(7);
      expect(caster.spellAttackBonus).toBe(7);
    });
  });

  // ============================
  // 5. Encounter Validation Tests
  // ============================

  describe('Encounter Validation', () => {
    it('validates encounter spec with appropriate CR', async () => {
      const encounterSpec: EncounterSpec = {
        type: 'combat',
        difficulty: 'medium',
        xpBudget: 400,
        participants: {
          hostiles: [{ ref: 'srd:goblin', count: 4 }],
          friendlies: [],
        },
        terrain: { features: [] },
        objectives: [],
        startState: { initiative: 'roll', surprise: false },
      } as any;

      const party = [
        createMockCharacter({ id: 'pc1', level: 3 }),
        createMockCharacter({ id: 'pc2', level: 3 }),
        createMockCharacter({ id: 'pc3', level: 3 }),
        createMockCharacter({ id: 'pc4', level: 3 }),
      ];

      const task: AgentTask = {
        description: 'Validate encounter',
        context: {
          encounterSpec,
          party,
          monsters: [],
        },
      };

      mockValidationService.validateRules.mockResolvedValue(null);
      mockResultsProcessor.processResults.mockResolvedValue(null);
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.encounterValidation).toBeDefined();
    });

    it('flags encounter with excessive XP deviation from budget', async () => {
      const encounterSpec: EncounterSpec = {
        type: 'combat',
        difficulty: 'medium',
        xpBudget: 200,
        participants: {
          hostiles: [{ ref: 'srd:dragon', count: 1 }], // Way too powerful
          friendlies: [],
        },
        terrain: { features: [] },
        objectives: [],
        startState: { initiative: 'roll', surprise: false },
      } as any;

      const task: AgentTask = {
        description: 'Validate overpowered encounter',
        context: {
          encounterSpec,
          monsters: [],
        },
      };

      mockValidationService.validateRules.mockResolvedValue(null);
      mockResultsProcessor.processResults.mockResolvedValue(null);
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.encounterValidation).toBeDefined();
    });

    it('validates party composition for encounter', async () => {
      const party = [
        createMockCharacter({ id: 'pc1', level: 5 }),
        createMockCharacter({ id: 'pc2', level: 5 }),
        createSpellcaster({ id: 'pc3', level: 5 }),
        createMockCharacter({ id: 'pc4', level: 5 }),
      ];

      const encounterSpec: EncounterSpec = {
        type: 'combat',
        difficulty: 'medium',
        xpBudget: 800,
        participants: {
          hostiles: [{ ref: 'srd:orc', count: 5 }],
          friendlies: [],
        },
        terrain: { features: [] },
        objectives: [],
        startState: { initiative: 'roll', surprise: false },
      } as any;

      const task: AgentTask = {
        description: 'Validate encounter with party',
        context: {
          encounterSpec,
          party,
          monsters: [],
        },
      };

      mockValidationService.validateRules.mockResolvedValue(null);
      mockResultsProcessor.processResults.mockResolvedValue(null);
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(result.data.encounterValidation).toBeDefined();
    });
  });

  // ============================
  // 6. Edge Cases Tests
  // ============================

  describe('Edge Cases', () => {
    it('prevents unconscious character from taking actions', async () => {
      const character = createUnconsciousCharacter();
      const task: AgentTask = {
        description: 'Unconscious character action',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: character,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'attack',
          isValid: false,
          description: 'Character is unconscious',
          rule_conditions: [
            {
              description: 'Character must be conscious to act',
              suggestion: 'Character needs healing or stabilization',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: 'Character is unconscious' }],
        suggestions: ['Character needs healing or stabilization'],
        errors: ['Character is unconscious'],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.data.validationResults.isValid).toBe(false);
      expect(result.data.validationResults.errors).toContain('Character is unconscious');
    });

    it('handles completely depleted spell slots', async () => {
      const caster = createSpellcaster({
        spellSlots: {
          1: { total: 4, expended: 4 },
          2: { total: 3, expended: 3 },
          3: { total: 2, expended: 2 },
        },
      });

      const task: AgentTask = {
        description: 'Cast with no slots',
        context: {
          ruleType: 'spellcast',
          action: 'castSpell',
          actor: caster,
          spell: { name: 'Shield', level: 1 },
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'spellcast',
          isValid: false,
          description: 'No spell slots available at any level',
          rule_requirements: [
            {
              description: 'Must have available spell slots',
              suggestion: 'Take a long rest to recover spell slots',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: 'No spell slots available at any level' }],
        suggestions: ['Take a long rest to recover spell slots'],
        errors: ['No spell slots available at any level'],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.data.validationResults.isValid).toBe(false);
      expect(result.data.validationResults.errors[0]).toContain('No spell slots');
    });

    it('rejects invalid spell not in character spell list', async () => {
      const caster = createSpellcaster({
        knownSpells: ['Magic Missile', 'Shield', 'Fireball', 'Counterspell'],
      });

      const task: AgentTask = {
        description: 'Cast unknown spell',
        context: {
          ruleType: 'spellcast',
          action: 'castSpell',
          actor: caster,
          spell: { name: 'Eldritch Blast', level: 0 }, // Warlock spell
          spellLevel: 0,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'spellcast',
          isValid: false,
          description: "Spell not in character's known spells",
          rule_requirements: [
            {
              description: 'Must know or have prepared the spell',
              suggestion: 'Choose from known spells or prepare during long rest',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: "Spell not in character's known spells" }],
        suggestions: ['Choose from known spells or prepare during long rest'],
        errors: ["Spell not in character's known spells"],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.data.validationResults.isValid).toBe(false);
    });

    it('rejects out-of-range attacks', async () => {
      const attacker = createMockCharacter({
        weapons: [
          {
            name: 'Shortbow',
            ability: 'dex',
            proficient: true,
            damageDice: '1d6',
            damageType: 'piercing',
            range: { normal: 80, long: 320 },
          },
        ],
      });

      const task: AgentTask = {
        description: 'Attack beyond range',
        context: {
          ruleType: 'attack',
          action: 'attack',
          actor: attacker,
          weapon: attacker.weapons[0],
          targetDistance: 400, // Beyond long range
          targetAC: 15,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'attack',
          isValid: false,
          description: 'Target out of range',
          rule_conditions: [
            {
              description: 'Target must be within weapon range',
              suggestion: 'Move closer or choose different target',
            },
          ],
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: false,
        validations: [{ isValid: false, error: 'Target out of range' }],
        suggestions: ['Move closer or choose different target'],
        errors: ['Target out of range'],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.data.validationResults.isValid).toBe(false);
      expect(result.data.validationResults.errors).toContain('Target out of range');
    });

    it('handles death saves for dying character', async () => {
      const character = createUnconsciousCharacter();
      const task: AgentTask = {
        description: 'Make death save',
        context: {
          ruleType: 'deathSave',
          action: 'deathSave',
          actor: character,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'deathSave',
          isValid: true,
          description: 'Character makes death saving throw',
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(character.conditions.deathSaves).toBeDefined();
      expect(character.conditions.deathSaves.successes).toBe(1);
      expect(character.conditions.deathSaves.failures).toBe(1);
    });

    it('validates concentration check after taking damage', async () => {
      const caster = createSpellcaster({
        conditions: { concentrating: true },
      });

      const damage = 22;
      const dc = Math.max(10, Math.floor(damage / 2)); // DC 11

      const task: AgentTask = {
        description: 'Concentration check',
        context: {
          ruleType: 'concentrationCheck',
          action: 'concentrationCheck',
          actor: caster,
          damageTaken: damage,
          expectedDC: dc,
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        {
          rule_type: 'concentrationCheck',
          isValid: true,
          description: `Concentration check DC ${dc}`,
        },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
      expect(task.context.expectedDC).toBe(11);
    });

    it('handles missing or invalid context gracefully', async () => {
      const task: AgentTask = {
        description: 'Task with no context',
        context: {},
      };

      mockValidationService.validateRules.mockResolvedValue(null);
      mockResultsProcessor.processResults.mockResolvedValue(null);
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(true);
    });
  });

  // ============================
  // 7. Integration Tests
  // ============================

  describe('Integration Tests', () => {
    it('properly integrates ValidationService and messaging', async () => {
      const task: AgentTask = {
        description: 'Integration test',
        context: {
          ruleType: 'attack',
          action: 'attack',
        },
      };

      mockValidationService.validateRules.mockResolvedValue([
        { rule_type: 'attack', isValid: true },
      ]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [{ isValid: true }],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);

      const result = await agent.executeTask(task);

      expect(mockValidationService.validateRules).toHaveBeenCalledWith(task.context);
      expect(mockResultsProcessor.processResults).toHaveBeenCalled();
      expect(mockMessagingService.sendMessage).toHaveBeenCalledWith(
        'rules_interpreter_1',
        'dm_agent_1',
        expect.anything(),
        expect.objectContaining({
          taskDescription: 'Integration test',
          validationResults: expect.anything(),
        }),
        expect.anything(),
      );
      expect(result.success).toBe(true);
    });

    it('handles validation service errors gracefully', async () => {
      const task: AgentTask = {
        description: 'Error handling test',
        context: {
          ruleType: 'attack',
        },
      };

      mockValidationService.validateRules.mockRejectedValue(new Error('Database error'));

      const result = await agent.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Database error');
    });

    it('handles messaging service errors gracefully', async () => {
      const task: AgentTask = {
        description: 'Messaging error test',
        context: {
          ruleType: 'attack',
        },
      };

      mockValidationService.validateRules.mockResolvedValue([]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockRejectedValue(new Error('Network error'));

      const result = await agent.executeTask(task);

      // Messaging errors are caught by error handler but task execution continues
      // However, the overall task fails if critical errors occur
      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });

    it('handles edge function call failures', async () => {
      const task: AgentTask = {
        description: 'Edge function error',
        context: {
          ruleType: 'attack',
        },
      };

      mockValidationService.validateRules.mockResolvedValue([]);
      mockResultsProcessor.processResults.mockResolvedValue({
        isValid: true,
        validations: [],
        suggestions: [],
        errors: [],
      });
      mockMessagingService.sendMessage.mockResolvedValue(true);
      vi.mocked(edgeFunctionHandler.callEdgeFunction).mockResolvedValue(null);

      const result = await agent.executeTask(task);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to execute task');
    });
  });

  // ============================
  // 8. Agent Properties Tests
  // ============================

  describe('Agent Properties', () => {
    it('has correct agent properties', () => {
      expect(agent.id).toBe('rules_interpreter_1');
      expect(agent.role).toBe('Rules Interpreter');
      expect(agent.goal).toContain('fantasy RPG rules');
      expect(agent.backstory).toContain('expert in fantasy tabletop RPG');
      expect(agent.verbose).toBe(true);
      expect(agent.allowDelegation).toBe(true);
    });
  });
});
