/**
 * Combat Flow Integration Tests
 *
 * Tests complete combat workflows from start to finish:
 * - Start combat → Initiative → Attack → Damage → HP → Death saves
 * - Conditions and their effects
 * - Multiple combats in parallel
 */

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { CombatInitiativeService } from '../../services/combat-initiative-service.js';
import { CombatHPService } from '../../services/combat-hp-service.js';
import { CombatAttackService } from '../../services/combat-attack-service.js';
import { ConditionsService } from '../../services/conditions-service.js';
import {
  teardownTestDatabase,
  resetDatabase,
} from './test-setup.js';
import {
  createFullTestSetup,
  createTestCharacter,
  createTestNPC,
  createCombatParticipantWithStatus,
  createCombatScenario,
  rollD20,
  calculateModifier,
} from './test-helpers.js';
import { testCharacters, testMonsters } from './test-fixtures.js';
import { db } from '../../../../db/client.js';
import { combatEncounters } from '../../../../db/schema/index.js';

describe('Complete Combat Flow', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test('full combat encounter: start → attack → damage → unconscious → death save → revive', async () => {
    // 1. Create session and characters
    const setup = await createFullTestSetup('fighter');
    const { character: fighter, stats: fighterStats } = await createTestCharacter('fighter', {
      campaignId: setup.campaign.id,
    });
    const goblin = await createTestNPC('goblin');

    // 2. Start combat
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: [],
    });

    // Manually add participants for more control
    const fighterParticipant = await createCombatParticipantWithStatus(combat!.id, {
      characterId: fighter.id,
      name: 'Test Fighter',
      participantType: 'player',
      initiativeModifier: calculateModifier(fighterStats.dexterity),
      armorClass: testCharacters.fighter.armorClass,
      maxHp: testCharacters.fighter.maxHp,
      speed: testCharacters.fighter.speed,
    });

    const goblinParticipant = await createCombatParticipantWithStatus(combat!.id, {
      npcId: goblin.id,
      name: 'Goblin',
      participantType: 'monster',
      initiativeModifier: testMonsters.goblin.initiativeModifier,
      armorClass: testMonsters.goblin.armorClass,
      maxHp: testMonsters.goblin.maxHp,
      speed: testMonsters.goblin.speed,
    });

    expect(combat!.status).toBe('active');

    // 3. Roll initiative
    await CombatInitiativeService.rollInitiative(combat!.id, fighterParticipant.id, 15);
    await CombatInitiativeService.rollInitiative(combat!.id, goblinParticipant.id, 12);

    // Verify turn order
    const combatState = await CombatInitiativeService.getCombatState(combat!.id);
    expect(combatState.turnOrder.length).toBe(2);
    expect(combatState.turnOrder[0]!.participant.id).toBe(fighterParticipant.id); // Higher initiative

    // 4. Reduce goblin HP to near death
    await CombatHPService.applyDamage(goblinParticipant.id, {
      damageAmount: testMonsters.goblin.maxHp,
      damageType: 'slashing',
      sourceParticipantId: fighterParticipant.id,
      sourceDescription: 'Longsword attack',
    });

    // 5. Goblin should be unconscious at 0 HP
    const statusAfterDamage = await CombatHPService.getParticipantStatus(goblinParticipant.id);
    expect(statusAfterDamage).toBeDefined();
    expect(statusAfterDamage!.isConscious).toBe(false);
    expect(statusAfterDamage!.currentHp).toBe(0);
    expect(statusAfterDamage!.deathSavesSuccesses).toBe(0);
    expect(statusAfterDamage!.deathSavesFailures).toBe(0);

    // 6. Roll death saves (3 successes to stabilize)
    const deathSave1 = await CombatHPService.rollDeathSave(goblinParticipant.id, 15); // Success
    expect(deathSave1.isSuccess).toBe(true);
    expect(deathSave1.successes).toBe(1);
    expect(deathSave1.failures).toBe(0);

    const deathSave2 = await CombatHPService.rollDeathSave(goblinParticipant.id, 12); // Success
    expect(deathSave2.isSuccess).toBe(true);
    expect(deathSave2.successes).toBe(2);

    const deathSave3 = await CombatHPService.rollDeathSave(goblinParticipant.id, 18); // Success
    expect(deathSave3.isSuccess).toBe(true);
    expect(deathSave3.successes).toBe(3);
    expect(deathSave3.isStabilized).toBe(true);

    const statusAfterSaves = await CombatHPService.getParticipantStatus(goblinParticipant.id);
    expect(statusAfterSaves).toBeDefined();
    expect(statusAfterSaves!.isConscious).toBe(false); // Still unconscious but stabilized
    expect(statusAfterSaves!.deathSavesSuccesses).toBe(3);

    // 7. Heal goblin to revive
    const healResult = await CombatHPService.healDamage(goblinParticipant.id, 5, 'healing potion');
    expect(healResult.wasRevived).toBe(true);
    expect(healResult.isConscious).toBe(true);
    expect(healResult.newCurrentHp).toBe(5);

    const finalStatus = await CombatHPService.getParticipantStatus(goblinParticipant.id);
    expect(finalStatus).toBeDefined();
    expect(finalStatus!.isConscious).toBe(true);
    expect(finalStatus!.currentHp).toBe(5);
    expect(finalStatus!.deathSavesSuccesses).toBe(0); // Cleared on revival
    expect(finalStatus!.deathSavesFailures).toBe(0);

    // 8. End combat
    const endedCombat = await CombatInitiativeService.endCombat(combat!.id);
    expect(endedCombat.status).toBe('completed');
    expect(endedCombat.endedAt).toBeTruthy();
  }, 30000);

  test('death save critical failure (natural 1) counts as 2 failures', async () => {
    const setup = await createFullTestSetup('wizard');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: ['goblin'],
    });

    const goblin = participants[0]!;

    // Reduce to 0 HP
    await CombatHPService.applyDamage(goblin!.id, {
      damageAmount: testMonsters.goblin.maxHp,
      damageType: 'bludgeoning',
    });

    // Roll natural 1 (2 failures)
    const critFail = await CombatHPService.rollDeathSave(goblin!.id, 1);
    expect(critFail.isCritical).toBe(true);
    expect(critFail.isSuccess).toBe(false);
    expect(critFail.failures).toBe(2);

    // One more failure should kill
    const finalFail = await CombatHPService.rollDeathSave(goblin!.id, 5);
    expect(finalFail.failures).toBe(3);
    expect(finalFail.isDead).toBe(true);
  }, 30000);

  test('death save critical success (natural 20) revives with 1 HP', async () => {
    const setup = await createFullTestSetup('rogue');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: ['goblin'],
    });

    const goblin = participants[0]!;

    // Reduce to 0 HP
    await CombatHPService.applyDamage(goblin!.id, {
      damageAmount: testMonsters.goblin.maxHp,
      damageType: 'piercing',
    });

    const status = await CombatHPService.getParticipantStatus(goblin!.id);
    expect(status).toBeDefined();
    expect(status!.isConscious).toBe(false);

    // Roll natural 20 (instant revival with 1 HP)
    const critSuccess = await CombatHPService.rollDeathSave(goblin!.id, 20);
    expect(critSuccess.isCritical).toBe(true);
    expect(critSuccess.isSuccess).toBe(true);
    expect(critSuccess.wasRevived).toBe(true);
    expect(critSuccess.newCurrentHp).toBe(1);

    const revivedStatus = await CombatHPService.getParticipantStatus(goblin!.id);
    expect(revivedStatus).toBeDefined();
    expect(revivedStatus!.isConscious).toBe(true);
    expect(revivedStatus!.currentHp).toBe(1);
  }, 30000);

  test('massive damage causes instant death', async () => {
    const setup = await createFullTestSetup('wizard');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: ['goblin'],
    });

    const goblin = participants[0]!;

    // First, reduce to 0 HP
    await CombatHPService.applyDamage(goblin!.id, {
      damageAmount: testMonsters.goblin.maxHp,
      damageType: 'slashing',
    });

    const unconscious = await CombatHPService.getParticipantStatus(goblin!.id);
    expect(unconscious).toBeDefined();
    expect(unconscious!.currentHp).toBe(0);
    expect(unconscious!.isConscious).toBe(false);

    // Now apply massive damage (>= max HP while at 0)
    const massiveDamageResult = await CombatHPService.applyDamage(goblin!.id, {
      damageAmount: testMonsters.goblin.maxHp,
      damageType: 'slashing',
    });

    expect(massiveDamageResult.massiveDamage).toBe(true);
    expect(massiveDamageResult.isDead).toBe(true);

    const deadStatus = await CombatHPService.getParticipantStatus(goblin!.id);
    expect(deadStatus).toBeDefined();
    expect(deadStatus!.deathSavesFailures).toBe(3); // Auto-killed
  }, 30000);

  test('temporary HP shields damage before real HP', async () => {
    const setup = await createFullTestSetup('wizard');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: ['goblin'],
    });

    const goblin = participants[0]!;

    // Give goblin 5 temp HP
    await CombatHPService.setTempHP(goblin!.id, 5);

    const withTempHp = await CombatHPService.getParticipantStatus(goblin!.id);
    expect(withTempHp).toBeDefined();
    expect(withTempHp!.tempHp).toBe(5);
    expect(withTempHp!.currentHp).toBe(testMonsters.goblin.maxHp);

    // Apply 3 damage (should only affect temp HP)
    const damage1 = await CombatHPService.applyDamage(goblin!.id, {
      damageAmount: 3,
      damageType: 'fire',
    });

    expect(damage1.tempHpLost).toBe(3);
    expect(damage1.hpLost).toBe(0);
    expect(damage1.newTempHp).toBe(2);
    expect(damage1.newCurrentHp).toBe(testMonsters.goblin.maxHp);

    // Apply 5 more damage (2 temp HP + 3 real HP)
    const damage2 = await CombatHPService.applyDamage(goblin!.id, {
      damageAmount: 5,
      damageType: 'cold',
    });

    expect(damage2.tempHpLost).toBe(2);
    expect(damage2.hpLost).toBe(3);
    expect(damage2.newTempHp).toBe(0);
    expect(damage2.newCurrentHp).toBe(testMonsters.goblin.maxHp - 3);
  }, 30000);

  test('damage resistance halves damage', async () => {
    const setup = await createFullTestSetup('fighter');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: [],
    });

    // Create a goblin with fire resistance
    const goblin = await createTestNPC('goblin');
    const resistantGoblin = await createCombatParticipantWithStatus(combat!.id, {
      npcId: goblin.id,
      name: 'Fire-Resistant Goblin',
      participantType: 'monster',
      initiativeModifier: 2,
      armorClass: 15,
      maxHp: 20,
      damageResistances: ['fire'],
    });

    // Apply 10 fire damage (should be halved to 5)
    const result = await CombatHPService.applyDamage(resistantGoblin.id, {
      damageAmount: 10,
      damageType: 'fire',
    });

    expect(result.originalDamage).toBe(10);
    expect(result.modifiedDamage).toBe(5); // Halved
    expect(result.wasResisted).toBe(true);
    expect(result.newCurrentHp).toBe(15); // 20 - 5
  }, 30000);

  test('damage vulnerability doubles damage', async () => {
    const setup = await createFullTestSetup('fighter');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: [],
    });

    // Create a goblin with cold vulnerability
    const goblin = await createTestNPC('goblin');
    const vulnerableGoblin = await createCombatParticipantWithStatus(combat!.id, {
      npcId: goblin.id,
      name: 'Cold-Vulnerable Goblin',
      participantType: 'monster',
      initiativeModifier: 2,
      armorClass: 15,
      maxHp: 20,
      damageVulnerabilities: ['cold'],
    });

    // Apply 5 cold damage (should be doubled to 10)
    const result = await CombatHPService.applyDamage(vulnerableGoblin.id, {
      damageAmount: 5,
      damageType: 'cold',
    });

    expect(result.originalDamage).toBe(5);
    expect(result.modifiedDamage).toBe(10); // Doubled
    expect(result.wasVulnerable).toBe(true);
    expect(result.newCurrentHp).toBe(10); // 20 - 10
  }, 30000);

  test('damage immunity negates all damage', async () => {
    const setup = await createFullTestSetup('fighter');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: [],
    });

    // Create a goblin with poison immunity
    const goblin = await createTestNPC('goblin');
    const immuneGoblin = await createCombatParticipantWithStatus(combat!.id, {
      npcId: goblin.id,
      name: 'Poison-Immune Goblin',
      participantType: 'monster',
      initiativeModifier: 2,
      armorClass: 15,
      maxHp: 20,
      damageImmunities: ['poison'],
    });

    // Apply 10 poison damage (should be negated)
    const result = await CombatHPService.applyDamage(immuneGoblin.id, {
      damageAmount: 10,
      damageType: 'poison',
    });

    expect(result.originalDamage).toBe(10);
    expect(result.modifiedDamage).toBe(0); // Negated
    expect(result.wasImmune).toBe(true);
    expect(result.newCurrentHp).toBe(20); // No damage taken
  }, 30000);

  test('multiple combats in parallel sessions do not interfere', async () => {
    // Create 3 separate sessions with combats
    const setup1 = await createFullTestSetup('fighter');
    const setup2 = await createFullTestSetup('wizard');
    const setup3 = await createFullTestSetup('rogue');

    const { combat: combat1 } = await createCombatScenario(setup1.session.id, {
      characters: [],
      monsters: ['goblin', 'goblin'],
    });

    const { combat: combat2 } = await createCombatScenario(setup2.session.id, {
      characters: [],
      monsters: ['orc'],
    });

    const { combat: combat3 } = await createCombatScenario(setup3.session.id, {
      characters: [],
      monsters: ['goblin', 'orc'],
    });

    // Verify each combat has correct participants
    const state1 = await CombatInitiativeService.getCombatState(combat1!.id);
    const state2 = await CombatInitiativeService.getCombatState(combat2!.id);
    const state3 = await CombatInitiativeService.getCombatState(combat3!.id);

    expect(state1.participants.length).toBe(2); // 2 goblins
    expect(state2.participants.length).toBe(1); // 1 orc
    expect(state3.participants.length).toBe(2); // 1 goblin + 1 orc

    // Advance turn in combat1
    await CombatInitiativeService.rollInitiative(combat1!.id, state1.participants[0]!.id, 15);
    await CombatInitiativeService.rollInitiative(combat1!.id, state1.participants[1]!.id, 10);
    await CombatInitiativeService.advanceTurn(combat1!.id);

    // Verify combat2 and combat3 are unaffected
    const state2After = await CombatInitiativeService.getCombatState(combat2!.id);
    const state3After = await CombatInitiativeService.getCombatState(combat3!.id);

    expect(state2After.encounter.currentRound).toBe(1);
    expect(state2After.encounter.currentTurnOrder).toBe(0);
    expect(state3After.encounter.currentRound).toBe(1);
    expect(state3After.encounter.currentTurnOrder).toBe(0);

    // End combat1 and verify others are still active
    await CombatInitiativeService.endCombat(combat1!.id);

    const finalState1 = await CombatInitiativeService.getCombatState(combat1!.id);
    const finalState2 = await CombatInitiativeService.getCombatState(combat2!.id);
    const finalState3 = await CombatInitiativeService.getCombatState(combat3!.id);

    expect(finalState1.encounter.status).toBe('completed');
    expect(finalState2.encounter.status).toBe('active');
    expect(finalState3.encounter.status).toBe('active');
  }, 30000);

  test('initiative order is maintained correctly', async () => {
    const setup = await createFullTestSetup('fighter');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: ['goblin', 'orc', 'goblin'],
    });

    // Roll specific initiatives
    await CombatInitiativeService.rollInitiative(combat!.id, participants[0]!.id, 20); // Goblin 1: 20
    await CombatInitiativeService.rollInitiative(combat!.id, participants[1]!.id, 15); // Orc: 15
    await CombatInitiativeService.rollInitiative(combat!.id, participants[2]!.id, 10); // Goblin 2: 10

    const state = await CombatInitiativeService.getCombatState(combat!.id);

    // Verify order: highest initiative first
    expect(state.turnOrder[0]!.participant.initiative).toBe(20);
    expect(state.turnOrder[1]!.participant.initiative).toBe(15);
    expect(state.turnOrder[2]!.participant.initiative).toBe(10);

    // Advance through all turns and verify round increments
    await CombatInitiativeService.advanceTurn(combat!.id); // Turn 0 → 1
    await CombatInitiativeService.advanceTurn(combat!.id); // Turn 1 → 2
    const result = await CombatInitiativeService.advanceTurn(combat!.id); // Turn 2 → 0, round++

    expect(result.newRound).toBe(true);
    expect(result.roundNumber).toBe(2);

    const finalState = await CombatInitiativeService.getCombatState(combat!.id);
    expect(finalState.encounter.currentRound).toBe(2);
    expect(finalState.encounter.currentTurnOrder).toBe(0);
  }, 30000);

  test('healing cannot exceed max HP', async () => {
    const setup = await createFullTestSetup('fighter');
    const { combat, participants } = await createCombatScenario(setup.session.id, {
      characters: [],
      monsters: ['goblin'],
    });

    const goblin = participants[0]!;

    // Damage goblin
    await CombatHPService.applyDamage(goblin!.id, {
      damageAmount: 5,
      damageType: 'slashing',
    });

    const damaged = await CombatHPService.getParticipantStatus(goblin!.id);
    expect(damaged).toBeDefined();
    expect(damaged!.currentHp).toBe(testMonsters.goblin.maxHp - 5);

    // Try to heal 10 HP (more than needed)
    const healResult = await CombatHPService.healDamage(goblin!.id, 10);

    expect(healResult.healingAmount).toBe(10);
    expect(healResult.healingApplied).toBe(5); // Only 5 was actually needed
    expect(healResult.overheal).toBe(5);
    expect(healResult.newCurrentHp).toBe(testMonsters.goblin.maxHp);

    const healed = await CombatHPService.getParticipantStatus(goblin!.id);
    expect(healed).toBeDefined();
    expect(healed!.currentHp).toBe(testMonsters.goblin.maxHp);
  }, 30000);
});
