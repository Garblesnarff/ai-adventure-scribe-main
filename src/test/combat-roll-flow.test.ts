/**
 * Test file to verify the complete combat roll flow
 * Tests the integration between prompt instructions, roll state management, and damage roll detection
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { combatAuditSystem } from '../services/combat/CombatAuditSystem';
import { combatSequenceValidator } from '../services/combat/CombatSequenceValidator';
import { rollStateManager } from '../services/combat/rollStateManager';
import { DiceEngine } from '../services/dice/DiceEngine';
import {
  parseRollRequests,
  detectsSuccessfulAttack,
  detectsCriticalHit,
} from '../utils/rollRequestParser';

describe('Combat Roll Flow Integration', () => {
  beforeEach(() => {
    // Clear state before each test
    rollStateManager.clearAllState();
    combatSequenceValidator.clearAllState();
  });

  describe('Attack Roll Detection', () => {
    it('should detect attack roll requests', () => {
      const message = 'Make an attack roll with your longsword (1d20+5) against AC 13';
      const requests = parseRollRequests(message);

      expect(requests).toHaveLength(1);
      expect(requests[0].type).toBe('attack');
      expect(requests[0].formula).toBe('1d20+modifier');
    });

    it('should detect natural language attack requests', () => {
      const message = 'Please roll an attack roll with your dagger';
      const requests = parseRollRequests(message);

      expect(requests).toHaveLength(1);
      expect(requests[0].type).toBe('attack');
    });
  });

  describe('Damage Roll Detection', () => {
    it('should detect explicit damage roll requests', () => {
      const message = 'Roll damage for your longsword (1d8+3)';
      const requests = parseRollRequests(message);

      expect(requests.length).toBeGreaterThan(0);
      const damageRequests = requests.filter((r) => r.type === 'damage');
      expect(damageRequests.length).toBeGreaterThan(0);
      expect(damageRequests[0].formula).toBe('1d8+3');
    });

    it('should detect critical damage requests', () => {
      const message = 'Natural 20! Critical hit! Roll critical damage (2d6+2)';
      const requests = parseRollRequests(message);

      expect(requests.length).toBeGreaterThan(0);
      const damageRequests = requests.filter((r) => r.type === 'damage');
      expect(damageRequests.length).toBeGreaterThan(0);
      expect(damageRequests[0].purpose).toBe('Critical damage roll');
    });

    it('should detect contextual damage requests', () => {
      const message = 'That hits! Now roll damage';
      const requests = parseRollRequests(message);

      expect(requests).toHaveLength(1);
      expect(requests[0].type).toBe('damage');
    });
  });

  describe('Success Detection', () => {
    it('should detect successful attacks', () => {
      const messages = [
        'That hits!',
        '18 hits AC 13',
        'Your blade strikes true',
        'Critical hit!',
        'Natural 20!',
      ];

      messages.forEach((message) => {
        expect(detectsSuccessfulAttack(message)).toBe(true);
      });
    });

    it('should detect critical hits', () => {
      const messages = ['Critical hit!', 'Natural 20!', 'Nat 20', 'crit'];

      messages.forEach((message) => {
        expect(detectsCriticalHit(message)).toBe(true);
      });
    });
  });

  describe('Roll State Management', () => {
    it('should track attack rolls and trigger damage requests', () => {
      // Simulate adding an attack roll
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'longsword',
        targetAC: 13,
        context: 'Attack with longsword',
        actorId: 'player',
      });

      expect(rollStateManager.getPendingRolls()).toHaveLength(1);

      // Simulate successful attack roll
      const result = rollStateManager.recordAttackRoll(rollId, 18, 13);

      expect(result.hit).toBe(true);
      expect(result.critical).toBe(false);
      expect(result.needsDamageRoll).toBe(true);
      expect(rollStateManager.isAwaitingDamage()).toBe(true);
    });

    it('should handle critical hits correctly', () => {
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'shortsword',
        targetAC: 15,
        context: 'Attack with shortsword',
        actorId: 'player',
      });

      // Simulate critical hit (natural 20)
      const result = rollStateManager.recordAttackRoll(rollId, 20, 15);

      expect(result.hit).toBe(true);
      expect(result.critical).toBe(true);
      expect(result.needsDamageRoll).toBe(true);
      expect(rollStateManager.isAwaitingCriticalDamage()).toBe(true);
    });

    it('should clear damage awaiting state after damage roll', () => {
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'longsword',
        targetAC: 13,
        context: 'Attack with longsword',
        actorId: 'player',
      });

      // Hit
      rollStateManager.recordAttackRoll(rollId, 16, 13);
      expect(rollStateManager.isAwaitingDamage()).toBe(true);

      // Record damage
      rollStateManager.recordDamageRoll(rollId, 8, '1d8+3');
      expect(rollStateManager.isAwaitingDamage()).toBe(false);
    });
  });

  describe('Dice Engine Integration', () => {
    it('should get correct weapon damage formulas with character data', () => {
      const testCharacter = {
        abilityScores: {
          strength: { score: 16, modifier: 3, savingThrow: false },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 12, modifier: 1, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
        level: 3,
      };

      expect(DiceEngine.getWeaponDamageFormula('longsword', testCharacter)).toBe('1d8+3');
      expect(DiceEngine.getWeaponDamageFormula('shortsword', testCharacter)).toBe('1d6+3');
      expect(DiceEngine.getWeaponDamageFormula('greatsword', testCharacter)).toBe('2d6+3');
      expect(DiceEngine.getWeaponDamageFormula('rapier', testCharacter)).toBe('1d8+3');
    });

    it('should handle finesse weapons with character data', () => {
      const testCharacter = {
        abilityScores: {
          strength: { score: 14, modifier: 2, savingThrow: false },
          dexterity: { score: 16, modifier: 3, savingThrow: false },
          constitution: { score: 12, modifier: 1, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
      };

      // Finesse weapons should use the higher modifier automatically
      expect(DiceEngine.getWeaponDamageFormula('rapier', testCharacter)).toBe('1d8+3');
      expect(DiceEngine.getWeaponDamageFormula('shortsword', testCharacter)).toBe('1d6+3');

      // Can force dex usage
      expect(DiceEngine.getWeaponDamageFormula('rapier', testCharacter, 'dex')).toBe('1d8+3');
    });

    it('should create proper damage roll requests', () => {
      const testCharacter = {
        abilityScores: {
          strength: { score: 16, modifier: 3, savingThrow: false },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 12, modifier: 1, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
      };

      const normalDamage = DiceEngine.createDamageRollRequest('longsword', false, testCharacter);
      expect(normalDamage.formula).toBe('1d8+3');
      expect(normalDamage.purpose).toBe('Damage roll for longsword');

      const criticalDamage = DiceEngine.createDamageRollRequest('longsword', true, testCharacter);
      expect(criticalDamage.formula).toBe('2d8+3');
      expect(criticalDamage.purpose).toBe('Critical damage roll for longsword');
    });

    it('should create attack roll requests with modifiers', () => {
      const testCharacter = {
        abilityScores: {
          strength: { score: 16, modifier: 3, savingThrow: false },
          dexterity: { score: 14, modifier: 2, savingThrow: false },
          constitution: { score: 12, modifier: 1, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
        level: 3,
      };

      const attackRoll = DiceEngine.createAttackRollRequest('longsword', testCharacter);
      expect(attackRoll.formula).toBe('1d20+5'); // +3 STR + 2 prof bonus
      expect(attackRoll.purpose).toBe('Attack roll with longsword');

      // Finesse weapon with higher dex
      const dexChar = {
        abilityScores: {
          strength: { score: 14, modifier: 2, savingThrow: false },
          dexterity: { score: 16, modifier: 3, savingThrow: false },
          constitution: { score: 12, modifier: 1, savingThrow: false },
          intelligence: { score: 10, modifier: 0, savingThrow: false },
          wisdom: { score: 10, modifier: 0, savingThrow: false },
          charisma: { score: 10, modifier: 0, savingThrow: false },
        },
        level: 3,
      };

      const finessAttack = DiceEngine.createAttackRollRequest('rapier', dexChar);
      expect(finessAttack.formula).toBe('1d20+5'); // +3 DEX + 2 prof bonus
    });

    it('should calculate critical damage correctly', () => {
      const result = DiceEngine.calculateCriticalDamage('1d8+3');
      expect(result.purpose).toBe('critical damage');
      // The actual total will vary due to randomness, but we can check the formula was applied
      expect(result.expression).toContain('2d8');
    });
  });

  describe('Complete Combat Flow Simulation', () => {
    it('should simulate a complete attack -> damage sequence', () => {
      // 1. DM requests attack roll
      const dmMessage = 'Make an attack roll with your longsword (1d20+5) against AC 13';
      const attackRequests = parseRollRequests(dmMessage);
      expect(attackRequests[0].type).toBe('attack');

      // 2. Track the attack roll
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'longsword',
        targetAC: 13,
        context: 'Attack with longsword',
        actorId: 'player',
      });

      // 3. Player rolls and hits
      const attackResult = rollStateManager.recordAttackRoll(rollId, 16, 13);
      expect(attackResult.hit).toBe(true);
      expect(rollStateManager.isAwaitingDamage()).toBe(true);

      // 4. DM responds with hit confirmation and damage request
      const dmResponse =
        '16 hits! Your longsword strikes true. Roll damage for your longsword (1d8+3)';

      // Should detect successful attack
      expect(detectsSuccessfulAttack(dmResponse)).toBe(true);

      // Should detect damage roll request
      const damageRequests = parseRollRequests(dmResponse);
      expect(damageRequests.length).toBeGreaterThan(0);
      const onlyDamageRequests = damageRequests.filter((r) => r.type === 'damage');
      expect(onlyDamageRequests.length).toBeGreaterThan(0);

      // 5. Record damage roll
      rollStateManager.recordDamageRoll(rollId, 7, '1d8+3');
      expect(rollStateManager.isAwaitingDamage()).toBe(false);
    });

    it('should simulate a critical hit sequence', () => {
      // Attack roll
      const rollId = rollStateManager.addPendingRoll({
        type: 'attack',
        weaponName: 'shortsword',
        targetAC: 15,
        context: 'Attack with shortsword',
        actorId: 'player',
      });

      // Critical hit!
      const attackResult = rollStateManager.recordAttackRoll(rollId, 20, 15);
      expect(attackResult.critical).toBe(true);
      expect(rollStateManager.isAwaitingCriticalDamage()).toBe(true);

      // DM response
      const dmResponse = 'Natural 20! Critical hit! Roll critical damage (2d6+2)';

      expect(detectsCriticalHit(dmResponse)).toBe(true);

      const damageRequests = parseRollRequests(dmResponse);
      expect(damageRequests[0].purpose).toBe('Critical damage roll');

      // Record critical damage
      rollStateManager.recordDamageRoll(rollId, 11, '2d6+2');
      expect(rollStateManager.isAwaitingDamage()).toBe(false);
      expect(rollStateManager.isAwaitingCriticalDamage()).toBe(false);
    });
  });

  describe('Initiative Tracking and Turn Order', () => {
    const combatId = 'test-combat-1';

    beforeEach(() => {
      // Clear combat state before each test
      combatSequenceValidator.clearAllState();
    });

    it('should track initiative entries and create turn order', () => {
      // Add players and NPCs
      combatSequenceValidator.addInitiativeEntry(combatId, 'player1', 'Ranger', 18, 3, true);
      combatSequenceValidator.addInitiativeEntry(combatId, 'npc1', 'Orc Warrior', 12, 1, false);
      combatSequenceValidator.addInitiativeEntry(combatId, 'player2', 'Wizard', 15, 2, true);
      combatSequenceValidator.addInitiativeEntry(combatId, 'npc2', 'Goblin Scout', 16, 3, false);

      const turnOrder = combatSequenceValidator.completeInitiativePhase(combatId);

      expect(turnOrder).not.toBeNull();
      expect(turnOrder!.entries).toHaveLength(4);

      // Should be sorted by initiative (highest first)
      expect(turnOrder!.entries[0].initiative).toBe(18);
      expect(turnOrder!.entries[0].actorName).toBe('Ranger');
      expect(turnOrder!.entries[1].initiative).toBe(16);
      expect(turnOrder!.entries[1].actorName).toBe('Goblin Scout');
    });

    it('should handle initiative ties with dex modifier tiebreaker', () => {
      // Same initiative, different dex modifiers
      combatSequenceValidator.addInitiativeEntry(combatId, 'player1', 'Fighter', 15, 1, true);
      combatSequenceValidator.addInitiativeEntry(combatId, 'player2', 'Rogue', 15, 4, true);

      const turnOrder = combatSequenceValidator.completeInitiativePhase(combatId);

      // Higher dex modifier should go first
      expect(turnOrder!.entries[0].actorName).toBe('Rogue');
      expect(turnOrder!.entries[0].dexModifier).toBe(4);
    });

    it('should track current actor and advance turns', () => {
      combatSequenceValidator.addInitiativeEntry(combatId, 'player1', 'Paladin', 14, 0, true);
      combatSequenceValidator.addInitiativeEntry(combatId, 'npc1', 'Dragon', 20, 2, false);

      combatSequenceValidator.completeInitiativePhase(combatId);

      // First turn should be Dragon (highest initiative)
      const currentActor = combatSequenceValidator.getCurrentActor(combatId);
      expect(currentActor!.actorName).toBe('Dragon');
      expect(currentActor!.hasActed).toBe(false);

      // Advance to next turn
      const nextActor = combatSequenceValidator.nextTurn(combatId);
      expect(nextActor!.actorName).toBe('Paladin');
    });

    it('should cycle through rounds correctly', () => {
      combatSequenceValidator.addInitiativeEntry(combatId, 'player1', 'Bard', 12, 3, true);
      combatSequenceValidator.addInitiativeEntry(combatId, 'player2', 'Cleric', 16, 1, true);

      const turnOrder = combatSequenceValidator.completeInitiativePhase(combatId);

      // Start of round 1
      expect(turnOrder!.round).toBe(1);

      // Current actor should be highest initiative (Cleric: 16)
      const currentActor = combatSequenceValidator.getCurrentActor(combatId);
      expect(currentActor!.actorName).toBe('Cleric');

      // First actor (Cleric) takes turn, advance to next
      const secondActor = combatSequenceValidator.nextTurn(combatId);
      expect(secondActor!.actorName).toBe('Bard');

      // Second actor (Bard) takes turn, should cycle back to first actor and increment round
      const newRoundActor = combatSequenceValidator.nextTurn(combatId);
      expect(newRoundActor!.actorName).toBe('Cleric');

      const updatedTurnOrder = combatSequenceValidator.getTurnOrder(combatId);
      expect(updatedTurnOrder!.round).toBe(2);
    });

    it('should detect combat state correctly', () => {
      expect(combatSequenceValidator.isCombatActive(combatId)).toBe(false);

      combatSequenceValidator.addInitiativeEntry(combatId, 'player1', 'Monk', 18, 4, true);
      expect(combatSequenceValidator.isCombatActive(combatId)).toBe(true);

      combatSequenceValidator.endCombat(combatId);
      expect(combatSequenceValidator.isCombatActive(combatId)).toBe(false);
    });

    it('should validate initiative phase completion', () => {
      // Start combat but don't complete initiative
      combatSequenceValidator.addInitiativeEntry(combatId, 'player1', 'Sorcerer', 14, 2, true);

      const combatValidation = combatSequenceValidator.validateCombatState(combatId, 'attack');
      expect(combatValidation.valid).toBe(false);
      expect(combatValidation.reason).toContain('Initiative');

      // Complete initiative phase
      combatSequenceValidator.completeInitiativePhase(combatId);

      const updatedValidation = combatSequenceValidator.validateCombatState(combatId, 'attack');
      expect(updatedValidation.valid).toBe(true);
    });
  });

  describe('Combat Audit System', () => {
    beforeEach(() => {
      combatAuditSystem.clearAuditData();
    });

    it('should track combat actions and detect violations', () => {
      const combatId = 'audit-test-combat';

      // Start combat audit
      combatAuditSystem.startCombatAudit(combatId);

      // Try to make attack without initiative - should create violation
      const attackActionId = combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'attack_roll',
        phase: 'turn',
        data: {
          formula: '1d20+5',
          result: 18,
          targetAC: 15,
          success: true,
          description: 'Attack with longsword',
        },
      });

      // Check for initiative violation
      const violations = combatAuditSystem.getViolations(combatId);
      expect(violations.length).toBeGreaterThan(0);

      const initiativeViolation = violations.find((v) => v.violationType === 'missing_initiative');
      expect(initiativeViolation).toBeTruthy();
      expect(initiativeViolation?.severity).toBe('critical');
      expect(initiativeViolation?.description).toContain('without rolling initiative');
    });

    it('should detect damage without attack violations', () => {
      const combatId = 'damage-violation-test';

      combatAuditSystem.startCombatAudit(combatId);

      // Record initiative first
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'initiative',
        phase: 'initiative',
        data: {
          formula: '1d20+3',
          result: 15,
          description: 'Initiative roll',
        },
      });

      // Try to roll damage without attack
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'damage_roll',
        phase: 'turn',
        data: {
          formula: '1d8+3',
          result: 7,
          description: 'Damage roll',
        },
      });

      const violations = combatAuditSystem.getViolations(combatId);
      const damageViolation = violations.find((v) => v.violationType === 'damage_without_attack');
      expect(damageViolation).toBeTruthy();
      expect(damageViolation?.severity).toBe('critical');
    });

    it('should detect missing AC and DC violations', () => {
      const combatId = 'ac-dc-test';

      combatAuditSystem.startCombatAudit(combatId);

      // Record initiative
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'initiative',
        phase: 'initiative',
        data: {
          formula: '1d20+3',
          result: 15,
          description: 'Initiative roll',
        },
      });

      // Attack without specifying AC
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'attack_roll',
        phase: 'turn',
        data: {
          formula: '1d20+5',
          result: 18,
          // targetAC missing
          success: true,
          description: 'Attack with longsword',
        },
      });

      // Saving throw without DC
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'save',
        phase: 'turn',
        data: {
          formula: '1d20+2',
          result: 14,
          // dc missing
          success: true,
          description: 'Dexterity save',
        },
      });

      const violations = combatAuditSystem.getViolations(combatId);

      const acViolation = violations.find((v) => v.violationType === 'missing_ac');
      expect(acViolation).toBeTruthy();
      expect(acViolation?.severity).toBe('high');

      const dcViolation = violations.find((v) => v.violationType === 'missing_dc');
      expect(dcViolation).toBeTruthy();
      expect(dcViolation?.severity).toBe('high');
    });

    it('should validate dice formulas', () => {
      const combatId = 'formula-test';

      combatAuditSystem.startCombatAudit(combatId);

      // Valid formula - no violation
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'attack_roll',
        phase: 'turn',
        data: {
          formula: '1d20+5',
          result: 18,
          description: 'Valid attack roll',
        },
      });

      // Invalid formula - should create violation
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'damage_roll',
        phase: 'turn',
        data: {
          formula: 'invalid-dice-format',
          result: 7,
          description: 'Invalid damage roll',
        },
      });

      const violations = combatAuditSystem.getViolations(combatId);
      const formulaViolation = violations.find((v) => v.violationType === 'invalid_formula');
      expect(formulaViolation).toBeTruthy();
      expect(formulaViolation?.severity).toBe('medium');
    });

    it('should generate comprehensive audit report', () => {
      const combatId = 'report-test';

      combatAuditSystem.startCombatAudit(combatId);

      // Record some actions with violations
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'attack_roll',
        phase: 'turn',
        data: {
          formula: '1d20+5',
          result: 18,
          description: 'Attack without initiative',
        },
      });

      // Generate report
      const report = combatAuditSystem.generateAuditReport(combatId);

      expect(report.combatId).toBe(combatId);
      expect(report.totalActions).toBe(1);
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.complianceScore).toBeLessThan(100);
      expect(report.summary.initiativeCompliance).toBe(false);
      expect(report.recommendations.length).toBeGreaterThan(0);

      // Check that recommendations include initiative guidance
      const hasInitiativeRecommendation = report.recommendations.some((r) =>
        r.includes('initiative'),
      );
      expect(hasInitiativeRecommendation).toBe(true);
    });

    it('should calculate compliance scores correctly', () => {
      const combatId = 'scoring-test';

      combatAuditSystem.startCombatAudit(combatId);

      // Perfect compliance - initiative first, then valid attack sequence
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'initiative',
        phase: 'initiative',
        data: {
          formula: '1d20+3',
          result: 15,
          description: 'Initiative roll',
        },
      });

      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'attack_roll',
        phase: 'turn',
        data: {
          formula: '1d20+5',
          result: 18,
          targetAC: 15,
          success: true,
          description: 'Attack with longsword',
        },
      });

      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'damage_roll',
        phase: 'turn',
        data: {
          formula: '1d8+3',
          result: 7,
          description: 'Damage roll',
        },
      });

      const report = combatAuditSystem.generateAuditReport(combatId);

      // Should have high compliance score with no critical violations
      expect(report.complianceScore).toBeGreaterThan(80);
      expect(report.summary.initiativeCompliance).toBe(true);
      expect(report.summary.attackSequenceCompliance).toBe(true);
      expect(report.summary.formulaCompliance).toBe(true);
    });

    it('should provide proper rule references and suggestions', () => {
      const combatId = 'guidance-test';

      combatAuditSystem.startCombatAudit(combatId);

      // Create a violation
      combatAuditSystem.recordAction({
        combatId,
        actorId: 'player1',
        actorName: 'Alice',
        actionType: 'attack_roll',
        phase: 'turn',
        data: {
          formula: '1d20+5',
          result: 18,
          description: 'Attack without initiative',
        },
      });

      const violations = combatAuditSystem.getViolations(combatId);
      const violation = violations[0];

      expect(violation.suggestion).toBeTruthy();
      expect(violation.suggestion.length).toBeGreaterThan(0);
      expect(violation.ruleReference).toContain('PHB');
      expect(violation.autoFixable).toBe(true);
    });
  });
});
