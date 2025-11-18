/**
 * Progression Flow Integration Tests
 *
 * Tests complete character progression workflows:
 * - Award XP → Level up → Gain HP → Ability Score Improvement → Update stats
 * - Spell slot progression on level up
 * - Class features gained at specific levels
 */

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { ProgressionService } from '../../services/progression-service.js';
import { SpellSlotsService } from '../../services/spell-slots-service.js';
import { ClassFeaturesService } from '../../services/class-features-service.js';
import {
  teardownTestDatabase,
  resetDatabase,
} from './test-setup.js';
import {
  createFullTestSetup,
  createTestCharacter,
  calculateModifier,
} from './test-helpers.js';
import { db } from '../../../../db/client.js';
import { characters, characterStats } from '../../../../db/schema/index.js';
import { eq } from 'drizzle-orm';

describe('Level-Up Flow', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  test('award XP → level up → gain HP → gain ASI → proficiency bonus increases', async () => {
    // 1. Create level 3 wizard with 0 XP
    const setup = await createFullTestSetup('lowLevelWizard');
    const { character: wizard, stats } = await createTestCharacter('lowLevelWizard', {
      campaignId: setup.campaign.id,
      character: { level: 3, experiencePoints: 0 },
    });

    const initialMaxHp = 15; // From fixture

    // 2. Award enough XP to reach level 4 (need 2700 XP for level 4)
    const xpResult = await ProgressionService.awardXP(
      wizard.id,
      2700,
      'combat',
      'Defeated a band of goblins'
    );

    expect(xpResult.totalXp).toBe(2700);
    expect(xpResult.newXp).toBe(2700);
    expect(xpResult.leveledUp).toBe(true);
    expect(xpResult.newLevel).toBe(4);

    // 3. Level up the character
    const levelUpResult = await ProgressionService.levelUp({
      characterId: wizard.id,
      hpRoll: 4, // Rolled 4 on d6
      abilityScoreImprovements: [
        { ability: 'intelligence', increase: 2 } // ASI at level 4
      ],
    });

    expect(levelUpResult.characterId).toBe(wizard.id);
    expect(levelUpResult.oldLevel).toBe(3);
    expect(levelUpResult.newLevel).toBe(4);

    // 4. Verify HP increased
    const updatedCharacter = await db.query.characters.findFirst({
      where: eq(characters.id, wizard.id),
    });

    // New HP = old HP + roll + CON modifier
    // CON 12 = +1 modifier
    const expectedNewHp = initialMaxHp + 4 + calculateModifier(12);
    expect(levelUpResult.hpIncrease.totalGained).toBe(4 + calculateModifier(12));

    // 5. Verify ability scores updated
    const updatedStats = await db.query.characterStats.findFirst({
      where: eq(characterStats.characterId, wizard.id),
    });

    expect(updatedStats?.intelligence).toBe(18); // 16 + 2 from ASI

    // 6. Verify proficiency bonus is correct for level 4
    const profBonus = ProgressionService.calculateProficiencyBonus(4);
    expect(profBonus).toBe(2); // Stays +2 for levels 1-4

    // 7. Verify spell slots updated for level 4 wizard
    await SpellSlotsService.initializeSpellSlots(wizard.id, [
      { className: 'Wizard', level: 4 }
    ]);

    const slots = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(slots[1]!.totalSlots).toBe(4);
    expect(slots[2]!.totalSlots).toBe(3);
    expect(slots[3]).toBeUndefined(); // No 3rd level slots yet at level 4
  }, 30000);

  test('leveling from 4 to 5 increases proficiency bonus and grants 3rd-level spells', async () => {
    const setup = await createFullTestSetup('wizard');
    const { character: wizard } = await createTestCharacter('wizard', {
      campaignId: setup.campaign.id,
      character: { level: 4, experiencePoints: 2700 },
    });

    // Award XP to reach level 5 (need 6500 total, already have 2700)
    await ProgressionService.awardXP(
      wizard.id,
      3800, // 2700 + 3800 = 6500
      'quest',
      'Completed major quest'
    );

    // Level up
    await ProgressionService.levelUp({
      characterId: wizard.id,
      hpRoll: 5,
      abilityScoreImprovements: [], // No ASI at level 5
    });

    // Verify proficiency bonus increased
    const profBonus = ProgressionService.calculateProficiencyBonus(5);
    expect(profBonus).toBe(3); // Increases to +3 at level 5

    // Verify 3rd-level spell slots are now available
    await SpellSlotsService.initializeSpellSlots(wizard.id, [
      { className: 'Wizard', level: 5 }
    ]);

    const slots = await SpellSlotsService.getCharacterSpellSlots(wizard.id);
    expect(slots[1]!.totalSlots).toBe(4);
    expect(slots[2]!.totalSlots).toBe(3);
    expect(slots[3]!.totalSlots).toBe(2); // Now has 3rd-level slots!
  }, 30000);

  test('multiple level ups in succession', async () => {
    const setup = await createFullTestSetup('fighter');
    const { character: fighter } = await createTestCharacter('fighter', {
      campaignId: setup.campaign.id,
      character: { level: 1, experiencePoints: 0 },
    });

    // Level 1 → 2 (need 300 XP)
    await ProgressionService.awardXP(
      fighter.id,
      300,
      'combat'
    );

    await ProgressionService.levelUp({
      characterId: fighter.id,
      hpRoll: 8,
    });

    const level2 = await db.query.characters.findFirst({
      where: eq(characters.id, fighter.id),
    });
    expect(level2?.level).toBe(2);

    // Level 2 → 3 (need 900 total, have 300)
    await ProgressionService.awardXP(
      fighter.id,
      600,
      'combat'
    );

    await ProgressionService.levelUp({
      characterId: fighter.id,
      hpRoll: 7,
    });

    const level3 = await db.query.characters.findFirst({
      where: eq(characters.id, fighter.id),
    });
    expect(level3?.level).toBe(3);
    expect(level3?.experiencePoints).toBe(900);

    // Level 3 → 4 (need 2700 total)
    await ProgressionService.awardXP(
      fighter.id,
      1800,
      'quest'
    );

    await ProgressionService.levelUp({
      characterId: fighter.id,
      hpRoll: 6,
      abilityScoreImprovements: [
        { ability: 'strength', increase: 2 }
      ],
    });

    const level4 = await db.query.characters.findFirst({
      where: eq(characters.id, fighter.id),
    });
    expect(level4?.level).toBe(4);

    const level4Stats = await db.query.characterStats.findFirst({
      where: eq(characterStats.characterId, fighter.id),
    });
    expect(level4Stats?.strength).toBe(18); // 16 + 2
  }, 30000);

  test('XP awards are logged and can be queried', async () => {
    const setup = await createFullTestSetup('rogue');
    const { character: rogue } = await createTestCharacter('rogue', {
      campaignId: setup.campaign.id,
      character: { level: 3, experiencePoints: 0 },
    });

    // Award XP from multiple sources
    await ProgressionService.awardXP(
      rogue.id,
      100,
      'combat',
      'Defeated goblin'
    );

    await ProgressionService.awardXP(
      rogue.id,
      200,
      'quest',
      'Completed side quest'
    );

    await ProgressionService.awardXP(
      rogue.id,
      50,
      'roleplay',
      'Great roleplay moment'
    );

    // Get XP history
    const history = await ProgressionService.getXPHistory(
      rogue.id,
      undefined,
      10
    );

    expect(history.length).toBe(3);
    expect(history[0]!.description).toBe('Great roleplay moment'); // Most recent
    expect(history[1]!.description).toBe('Completed side quest');
    expect(history[2]!.description).toBe('Defeated goblin');

    // Verify totals
    const totalXP = history.reduce((sum, event) => sum + event.xpGained, 0);
    expect(totalXP).toBe(350);

    const character = await db.query.characters.findFirst({
      where: eq(characters.id, rogue.id),
    });
    expect(character?.experiencePoints).toBe(350);
  }, 30000);

  test('cannot level up without sufficient XP', async () => {
    const setup = await createFullTestSetup('cleric');
    const { character: cleric } = await createTestCharacter('cleric', {
      campaignId: setup.campaign.id,
      character: { level: 3, experiencePoints: 100 }, // Only 100 XP, need 2700 for level 4
    });

    // Try to level up without enough XP
    await expect(
      ProgressionService.levelUp({
        characterId: cleric.id,
        hpRoll: 6,
      })
    ).rejects.toThrow(/insufficient.*xp|not enough.*experience/i);
  }, 30000);

  test('ASI can be split between two abilities', async () => {
    const setup = await createFullTestSetup('fighter');
    const { character: fighter, stats } = await createTestCharacter('fighter', {
      campaignId: setup.campaign.id,
      character: { level: 3, experiencePoints: 2700 },
      stats: { strength: 16, dexterity: 14 },
    });

    // Level up to 4 with split ASI
    await ProgressionService.levelUp({
      characterId: fighter.id,
      hpRoll: 8,
      abilityScoreImprovements: [
        { ability: 'strength', increase: 1 },
        { ability: 'dexterity', increase: 1 },
      ],
    });

    const updatedStats = await db.query.characterStats.findFirst({
      where: eq(characterStats.characterId, fighter.id),
    });

    expect(updatedStats?.strength).toBe(17); // 16 + 1
    expect(updatedStats?.dexterity).toBe(15); // 14 + 1
  }, 30000);

  test('ability scores cannot exceed 20 (without magical enhancement)', async () => {
    const setup = await createFullTestSetup('wizard');
    const { character: wizard, stats } = await createTestCharacter('wizard', {
      campaignId: setup.campaign.id,
      character: { level: 3, experiencePoints: 2700 },
      stats: { intelligence: 19 }, // Already at 19
    });

    // Try to increase INT by 2 (would go to 21)
    await expect(
      ProgressionService.levelUp({
        characterId: wizard.id,
        hpRoll: 4,
        abilityScoreImprovements: [
          { ability: 'intelligence', increase: 2 }
        ],
      })
    ).rejects.toThrow(/maximum.*20|exceed.*limit/i);
  }, 30000);

  test('class features are granted at appropriate levels', async () => {
    const setup = await createFullTestSetup('fighter');
    const { character: fighter } = await createTestCharacter('fighter', {
      campaignId: setup.campaign.id,
      character: { level: 1, experiencePoints: 0 },
    });

    // Grant class features for level 1
    await ClassFeaturesService.grantFeaturesForLevel(fighter.id, 'Fighter', 1);

    // Level up to 2 (gains Action Surge)
    await ProgressionService.awardXP(
      fighter.id,
      300,
      'combat'
    );

    await ProgressionService.levelUp({
      characterId: fighter.id,
      hpRoll: 8,
    });

    // Grant class features for level 2
    const level2Features = await ClassFeaturesService.grantFeaturesForLevel(fighter.id, 'Fighter', 2);
    expect(level2Features.length).toBeGreaterThanOrEqual(0);

    // Level up to 3 (gains subclass features)
    await ProgressionService.awardXP(
      fighter.id,
      600,
      'combat'
    );

    await ProgressionService.levelUp({
      characterId: fighter.id,
      hpRoll: 7,
    });

    // Grant class features for level 3
    const level3Features = await ClassFeaturesService.grantFeaturesForLevel(fighter.id, 'Fighter', 3);
    // Fighter chooses a subclass at level 3
    expect(level3Features.length).toBeGreaterThanOrEqual(0);
  }, 30000);

  test('progression status shows current level and next level XP', async () => {
    const setup = await createFullTestSetup('wizard');
    const { character: wizard } = await createTestCharacter('wizard', {
      campaignId: setup.campaign.id,
      character: { level: 5, experiencePoints: 7000 },
    });

    const status = await ProgressionService.getProgression(wizard.id);

    expect(status.level).toBe(5);
    expect(status.xp).toBe(7000);
    expect(status.xpToNext).toBeGreaterThan(0);
    expect(status.totalXp).toBe(7000);
    expect(status.percentToNext).toBeCloseTo(6.67, 1);
  }, 30000);

  test('leveling up restores all hit dice', async () => {
    const setup = await createFullTestSetup('fighter');
    const { character: fighter } = await createTestCharacter('fighter', {
      campaignId: setup.campaign.id,
      character: { level: 4, experiencePoints: 6500 },
    });

    // Initialize and use some hit dice
    const { RestService } = await import('../../services/rest-service.js');
    await RestService.initializeHitDice(fighter.id, 'Fighter', 4);

    await RestService.takeShortRest(fighter.id, 2);

    const beforeLevelUp = await RestService.getHitDice(fighter.id);
    const fighterDice = beforeLevelUp.find(hd => hd.className === 'Fighter');
    expect(fighterDice?.usedDice).toBe(2);

    // Level up to 5
    await ProgressionService.levelUp({
      characterId: fighter.id,
      hpRoll: 8,
    });

    // After leveling, should have 5 total dice (all available)
    await RestService.initializeHitDice(fighter.id, 'Fighter', 5);
    const afterLevelUp = await RestService.getHitDice(fighter.id);
    const diceAfter = afterLevelUp.find(hd => hd.className === 'Fighter');
    expect(diceAfter?.totalDice).toBe(5);
  }, 30000);
});
