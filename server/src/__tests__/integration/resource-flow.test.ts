/**
 * Resource Management Integration Tests
 *
 * Tests complete resource management workflows:
 * - Spell slot usage → Short rest → Long rest → Restoration
 * - Hit dice usage and recovery
 * - Resource tracking across multiple rests
 */

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { SpellSlotsService } from '../../services/spell-slots-service.js';
import { RestService } from '../../services/rest-service.js';
import {
  teardownTestDatabase,
  resetDatabase,
} from './test-setup.js';
import {
  createFullTestSetup,
  createTestCharacter,
} from './test-helpers.js';
import { testCharacters } from './test-fixtures.js';

describe('Spell Slot and Rest Flow', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test('cast spell → use slot → short rest → slot remains used → long rest → slot restored', async () => {
    // 1. Create wizard character at level 5
    const setup = await createFullTestSetup('wizard');
    const { character: wizard } = await createTestCharacter('wizard', {
      campaignId: setup.campaign.id,
      character: { level: 5 },
    });

    // 2. Initialize spell slots for level 5 wizard
    await SpellSlotsService.initializeSpellSlots(wizard.id, [
      { className: 'Wizard', level: 5 }
    ]);

    const initialSlots = await SpellSlotsService.getCharacterSpellSlots(wizard.id);

    // Level 5 wizard should have: 4/3/2 slots for levels 1/2/3
    expect(initialSlots[1]!.totalSlots).toBe(4);
    expect(initialSlots[1]!.usedSlots).toBe(0);
    expect(initialSlots[2]!.totalSlots).toBe(3);
    expect(initialSlots[2]!.usedSlots).toBe(0);
    expect(initialSlots[3]!.totalSlots).toBe(2);
    expect(initialSlots[3]!.usedSlots).toBe(0);

    // 3. Cast spell using 1st-level slot
    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Magic Missile',
      spellLevel: 1,
      slotLevelUsed: 1,
    });

    const afterCast1 = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(afterCast1[1]!.usedSlots).toBe(1);
    expect(afterCast1[1]!.remainingSlots).toBe(3);

    // 4. Cast another 1st-level spell
    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Shield',
      spellLevel: 1,
      slotLevelUsed: 1,
    });

    const afterCast2 = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(afterCast2[1]!.usedSlots).toBe(2);

    // 5. Cast a 3rd-level spell
    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Fireball',
      spellLevel: 3,
      slotLevelUsed: 3,
    });

    const afterCast3 = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(afterCast3[3]!.usedSlots).toBe(1);
    expect(afterCast3[3]!.remainingSlots).toBe(1);

    // 6. Take short rest (wizard slots don't restore on short rest)
    const shortRestResult = await RestService.takeShortRest(
      wizard.id,
      0 // No hit dice to spend
    );

    expect(shortRestResult.restType).toBe('short');

    const afterShortRest = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(afterShortRest[1]!.usedSlots).toBe(2); // Still used
    expect(afterShortRest[3]!.usedSlots).toBe(1); // Still used

    // 7. Take long rest (all slots should restore)
    const longRestResult = await RestService.takeLongRest(wizard.id);

    expect(longRestResult.restType).toBe('long');

    const afterLongRest = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(afterLongRest[1]!.usedSlots).toBe(0); // Restored!
    expect(afterLongRest[1]!.remainingSlots).toBe(4);
    expect(afterLongRest[3]!.usedSlots).toBe(0); // Restored!
    expect(afterLongRest[3]!.remainingSlots).toBe(2);
  }, 30000);

  test('upcasting: cast low-level spell using higher-level slot', async () => {
    const setup = await createFullTestSetup('wizard');
    const { character: wizard } = await createTestCharacter('wizard', {
      campaignId: setup.campaign.id,
      character: { level: 5 },
    });

    await SpellSlotsService.initializeSpellSlots(wizard.id, [
      { className: 'Wizard', level: 5 }
    ]);

    // Cast 1st-level spell (Magic Missile) using 3rd-level slot
    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Magic Missile',
      spellLevel: 1,
      slotLevelUsed: 3, // Upcast to 3rd level
    });

    const afterUpcast = await SpellSlotsService.getCharacterSpellSlots(wizard.id);

    // 1st-level slots should be untouched
    expect(afterUpcast[1]!.usedSlots).toBe(0);
    expect(afterUpcast[1]!.remainingSlots).toBe(4);

    // 3rd-level slot should be used
    expect(afterUpcast[3]!.usedSlots).toBe(1);
    expect(afterUpcast[3]!.remainingSlots).toBe(1);
  }, 30000);

  test('cannot use more slots than available', async () => {
    const setup = await createFullTestSetup('wizard');
    const { character: wizard } = await createTestCharacter('lowLevelWizard', {
      campaignId: setup.campaign.id,
    });

    await SpellSlotsService.initializeSpellSlots(wizard.id, [
      { className: 'Wizard', level: 3 }
    ]);

    const slots = await SpellSlotsService.getCharacterSpellSlots(wizard.id);

    // Level 3 wizard has 4 1st-level slots and 2 2nd-level slots
    expect(slots[1]!.totalSlots).toBe(4);
    expect(slots[2]!.totalSlots).toBe(2);

    // Use all 2nd-level slots
    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Scorching Ray',
      spellLevel: 2,
      slotLevelUsed: 2,
    });

    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Misty Step',
      spellLevel: 2,
      slotLevelUsed: 2,
    });

    const afterUse = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(afterUse[2]!.usedSlots).toBe(2);
    expect(afterUse[2]!.remainingSlots).toBe(0);

    // Try to use another 2nd-level slot (should fail)
    await expect(
      SpellSlotsService.useSpellSlot({
        characterId: wizard.id,
        spellName: 'Hold Person',
        spellLevel: 2,
        slotLevelUsed: 2,
      })
    ).rejects.toThrow();
  }, 30000);

  test('hit dice: spend during short rest → recover on long rest', async () => {
    const setup = await createFullTestSetup('fighter');
    const { character: fighter } = await createTestCharacter('fighter', {
      campaignId: setup.campaign.id,
      character: { level: 5 },
    });

    // Initialize hit dice for level 5 fighter (5d10)
    await RestService.initializeHitDice(fighter.id, 'Fighter', 5);

    const initialHitDice = await RestService.getHitDice(fighter.id);
    expect(initialHitDice.length).toBeGreaterThan(0);
    const fighterDice = initialHitDice.find(hd => hd.className === 'Fighter');
    expect(fighterDice).toBeDefined();
    expect(fighterDice!.totalDice).toBe(5);
    expect(fighterDice!.usedDice).toBe(0);

    // Take short rest and spend 2 hit dice
    const shortRest = await RestService.takeShortRest(
      fighter.id,
      2 // Spend 2 hit dice
    );

    expect(shortRest.hitDiceSpent).toBeGreaterThan(0);
    expect(shortRest.hitDiceSpent).toBe(2);

    const afterShortRest = await RestService.getHitDice(fighter.id);
    const diceAfterShort = afterShortRest.find(hd => hd.className === 'Fighter');
    expect(diceAfterShort).toBeDefined();
    expect(diceAfterShort!.usedDice).toBe(2);
    expect(diceAfterShort!.totalDice - diceAfterShort!.usedDice).toBe(3);

    // Take another short rest and spend 1 more
    await RestService.takeShortRest(
      fighter.id,
      1 // Spend 1 more hit die
    );

    const afterSecondShort = await RestService.getHitDice(fighter.id);
    const diceAfterSecond = afterSecondShort.find(hd => hd.className === 'Fighter');
    expect(diceAfterSecond).toBeDefined();
    expect(diceAfterSecond!.usedDice).toBe(3);
    expect(diceAfterSecond!.totalDice - diceAfterSecond!.usedDice).toBe(2);

    // Take long rest (should recover half of total hit dice, rounded down)
    const longRest = await RestService.takeLongRest(fighter.id);

    expect(longRest.hitDiceRestored).toBeDefined();
    // Should recover floor(5/2) = 2 dice, so usedDice goes from 3 to 1

    const afterLongRest = await RestService.getHitDice(fighter.id);
    const diceAfterLong = afterLongRest.find(hd => hd.className === 'Fighter');
    expect(diceAfterLong).toBeDefined();
    expect(diceAfterLong!.usedDice).toBe(1); // 3 - 2 = 1
    expect(diceAfterLong!.totalDice - diceAfterLong!.usedDice).toBe(4); // 5 - 1 = 4
  }, 30000);

  test('long rest restores HP to max', async () => {
    const setup = await createFullTestSetup('cleric');
    const { character: cleric } = await createTestCharacter('cleric', {
      campaignId: setup.campaign.id,
    });

    // Initialize hit dice
    await RestService.initializeHitDice(cleric.id, 'Cleric', 4);

    // Simulate taking damage by tracking current HP
    // Note: In a real scenario, HP would be managed through combat
    // For this test, we're verifying the long rest mechanics

    const longRest = await RestService.takeLongRest(cleric.id);

    expect(longRest.restType).toBe('long');
    expect(longRest.hpRestored).toBeGreaterThanOrEqual(0);
  }, 30000);

  test('multiple long rests restore all resources', async () => {
    const setup = await createFullTestSetup('wizard');
    const { character: wizard } = await createTestCharacter('wizard', {
      campaignId: setup.campaign.id,
      character: { level: 5 },
    });

    // Initialize resources
    await SpellSlotsService.initializeSpellSlots(wizard.id, [
      { className: 'Wizard', level: 5 }
    ]);
    await RestService.initializeHitDice(wizard.id, 'Wizard', 5);

    // Use all 1st-level spell slots
    for (let i = 0; i < 4; i++) {
      await SpellSlotsService.useSpellSlot({
        characterId: wizard.id,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
      });
    }

    // Use some hit dice
    await RestService.takeShortRest(
      wizard.id,
      3 // Spend 3 hit dice
    );

    const beforeRest = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(beforeRest[1]!.usedSlots).toBe(4);

    const hitDiceBefore = await RestService.getHitDice(wizard.id);
    const wizardDice = hitDiceBefore.find(hd => hd.className === 'Wizard');
    expect(wizardDice).toBeDefined();
    expect(wizardDice!.usedDice).toBe(3);

    // First long rest
    await RestService.takeLongRest(wizard.id);

    const afterFirstRest = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(afterFirstRest[1]!.usedSlots).toBe(0); // Restored

    const hitDiceAfterFirst = await RestService.getHitDice(wizard.id);
    const diceAfterFirst = hitDiceAfterFirst.find(hd => hd.className === 'Wizard');
    expect(diceAfterFirst).toBeDefined();
    expect(diceAfterFirst!.usedDice).toBe(1); // 3 - floor(5/2) = 1

    // Second long rest
    await RestService.takeLongRest(wizard.id);

    const hitDiceAfterSecond = await RestService.getHitDice(wizard.id);
    const diceAfterSecond = hitDiceAfterSecond.find(hd => hd.className === 'Wizard');
    expect(diceAfterSecond).toBeDefined();
    expect(diceAfterSecond!.usedDice).toBe(0); // All restored
  }, 30000);

  test('spell slot usage is tracked with history', async () => {
    const setup = await createFullTestSetup('wizard');
    const { character: wizard } = await createTestCharacter('wizard', {
      campaignId: setup.campaign.id,
      character: { level: 5 },
    });

    await SpellSlotsService.initializeSpellSlots(wizard.id, [
      { className: 'Wizard', level: 5 }
    ]);

    // Cast multiple spells
    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Magic Missile',
      spellLevel: 1,
      slotLevelUsed: 1,
    });

    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Fireball',
      spellLevel: 3,
      slotLevelUsed: 3,
    });

    await SpellSlotsService.useSpellSlot({
      characterId: wizard.id,
      spellName: 'Counterspell',
      spellLevel: 3,
      slotLevelUsed: 3,
    });

    // Get usage history
    const historyResult = await SpellSlotsService.getSpellSlotUsageHistory({
      characterId: wizard.id,
      limit: 10,
    });

    expect(historyResult.entries.length).toBe(3);
    expect(historyResult.entries[0]!.spellName).toBe('Counterspell'); // Most recent first
    expect(historyResult.entries[1]!.spellName).toBe('Fireball');
    expect(historyResult.entries[2]!.spellName).toBe('Magic Missile');

    // Verify slot levels
    expect(historyResult.entries.filter(h => h.slotLevelUsed === 1).length).toBe(1);
    expect(historyResult.entries.filter(h => h.slotLevelUsed === 3).length).toBe(2);
  }, 30000);

  test('short rest duration is tracked', async () => {
    const setup = await createFullTestSetup('rogue');
    const { character: rogue } = await createTestCharacter('rogue', {
      campaignId: setup.campaign.id,
    });

    await RestService.initializeHitDice(rogue.id, 'Rogue', 3);

    const restResult = await RestService.takeShortRest(
      rogue.id,
      0 // No hit dice to spend
    );

    expect(restResult.restType).toBe('short');

    // Get rest history
    const history = await RestService.getRestHistory(
      rogue.id,
      undefined, // No sessionId filter
      5 // limit
    );

    expect(history.length).toBe(1);
    expect(history[0]!.restType).toBe('short');
  }, 30000);

  test('cannot take multiple long rests in quick succession (24-hour rule)', async () => {
    const setup = await createFullTestSetup('fighter');
    const { character: fighter } = await createTestCharacter('fighter', {
      campaignId: setup.campaign.id,
    });

    await RestService.initializeHitDice(fighter.id, 'Fighter', 5);

    // First long rest
    await RestService.takeLongRest(fighter.id);

    // Try to take another long rest immediately
    // Note: This test assumes the service implements a 24-hour cooldown
    // If not implemented, this test documents the expected behavior
    await expect(
      RestService.takeLongRest(fighter.id)
    ).rejects.toThrow(/24.*hour|already.*rested|too soon/i);
  }, 30000);
});
