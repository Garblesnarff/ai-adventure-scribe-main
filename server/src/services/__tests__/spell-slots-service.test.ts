/**
 * Spell Slots Service Tests
 *
 * Comprehensive test suite for D&D 5E spell slot tracking system
 * Tests slot calculation, usage, restoration, multiclassing, and edge cases
 * Work Unit: 2.1a
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { SpellSlotsService } from '../spell-slots-service.js';
import { supabaseService } from '../../lib/supabase.js';
import type { ClassName } from '../../types/spell-slots.js';

// Test data
let testCharacterId: string;

/**
 * Setup test character
 */
async function createTestCharacter(): Promise<string> {
  const { data, error } = await supabaseService
    .from('characters')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // Test user ID
      campaign_id: null,
      name: 'Test Wizard',
      race: 'Human',
      class: 'Wizard',
      level: 5,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test character: ${error?.message}`);
  }

  return data.id;
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  if (testCharacterId) {
    await supabaseService.from('character_spell_slots').delete().eq('character_id', testCharacterId);
    await supabaseService.from('spell_slot_usage_log').delete().eq('character_id', testCharacterId);
    await supabaseService.from('characters').delete().eq('id', testCharacterId);
  }
}

describe('SpellSlotsService', () => {
  beforeAll(async () => {
    testCharacterId = await createTestCharacter();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Clean spell slots before each test
    await supabaseService.from('character_spell_slots').delete().eq('character_id', testCharacterId);
    await supabaseService.from('spell_slot_usage_log').delete().eq('character_id', testCharacterId);
  });

  describe('calculateSpellSlots', () => {
    describe('Full Casters', () => {
      it('should calculate level 1 Wizard slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Wizard', 1);

        expect(result.className).toBe('Wizard');
        expect(result.level).toBe(1);
        expect(result.casterType).toBe('full');
        expect(result.casterLevel).toBe(1);
        expect(result.slots).toEqual({ 1: 2 });
      });

      it('should calculate level 5 Wizard slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Wizard', 5);

        expect(result.casterLevel).toBe(5);
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
      });

      it('should calculate level 10 Sorcerer slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Sorcerer', 10);

        expect(result.casterLevel).toBe(10);
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 });
      });

      it('should calculate level 15 Cleric slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Cleric', 15);

        expect(result.casterLevel).toBe(15);
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 });
      });

      it('should calculate level 20 Druid slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Druid', 20);

        expect(result.casterLevel).toBe(20);
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 });
      });

      it('should calculate level 20 Bard slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Bard', 20);

        expect(result.casterLevel).toBe(20);
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 });
      });
    });

    describe('Half Casters', () => {
      it('should calculate level 2 Paladin slots correctly (first spell slots)', () => {
        const result = SpellSlotsService.calculateSpellSlots('Paladin', 2);

        expect(result.casterType).toBe('half');
        expect(result.casterLevel).toBe(1); // level 2 / 2 = 1
        expect(result.slots).toEqual({ 1: 2 });
      });

      it('should calculate level 5 Paladin slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Paladin', 5);

        expect(result.casterLevel).toBe(2); // level 5 / 2 = 2.5, rounded down = 2
        expect(result.slots).toEqual({ 1: 3 });
      });

      it('should calculate level 10 Ranger slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Ranger', 10);

        expect(result.casterLevel).toBe(5); // level 10 / 2 = 5
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
      });

      it('should calculate level 20 Paladin slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Paladin', 20);

        expect(result.casterLevel).toBe(10); // level 20 / 2 = 10
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 });
      });
    });

    describe('Third Casters', () => {
      it('should calculate level 3 Eldritch Knight slots correctly (first spell slots)', () => {
        const result = SpellSlotsService.calculateSpellSlots('Eldritch Knight', 3);

        expect(result.casterType).toBe('third');
        expect(result.casterLevel).toBe(1); // level 3 / 3 = 1
        expect(result.slots).toEqual({ 1: 2 });
      });

      it('should calculate level 10 Eldritch Knight slots correctly', () => {
        const result = SpellSlotsService.calculateSpellSlots('Eldritch Knight', 10);

        expect(result.casterLevel).toBe(3); // level 10 / 3 = 3.33, rounded down = 3
        expect(result.slots).toEqual({ 1: 4, 2: 2 });
      });

      it('should calculate level 20 Arcane Trickster slots correctly (max 4th level)', () => {
        const result = SpellSlotsService.calculateSpellSlots('Arcane Trickster', 20);

        expect(result.casterLevel).toBe(6); // level 20 / 3 = 6.67, rounded down = 6
        // Third casters max out at 4th level spells
        expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3 });
        expect(result.slots[5]).toBeUndefined();
      });
    });

    describe('Pact Magic (Warlock)', () => {
      it('should identify Warlock as pact magic', () => {
        const result = SpellSlotsService.calculateSpellSlots('Warlock', 5);

        expect(result.casterType).toBe('pact');
        expect(result.slots).toEqual({});
      });

      it('should handle level 1 Warlock', () => {
        const result = SpellSlotsService.calculateSpellSlots('Warlock', 1);

        expect(result.casterType).toBe('pact');
        expect(result.casterLevel).toBe(1);
      });
    });

    describe('Non-Casters', () => {
      it('should handle Fighter (non-caster)', () => {
        const result = SpellSlotsService.calculateSpellSlots('Fighter', 10);

        expect(result.casterType).toBe('none');
        expect(result.casterLevel).toBe(0);
        expect(result.slots).toEqual({});
      });

      it('should handle Barbarian (non-caster)', () => {
        const result = SpellSlotsService.calculateSpellSlots('Barbarian', 10);

        expect(result.casterType).toBe('none');
        expect(result.slots).toEqual({});
      });
    });

    describe('Edge Cases', () => {
      it('should throw error for invalid level (0)', () => {
        expect(() => SpellSlotsService.calculateSpellSlots('Wizard', 0)).toThrow(
          'Level must be between 1 and 20'
        );
      });

      it('should throw error for invalid level (21)', () => {
        expect(() => SpellSlotsService.calculateSpellSlots('Wizard', 21)).toThrow(
          'Level must be between 1 and 20'
        );
      });

      it('should throw error for invalid class name', () => {
        expect(() =>
          SpellSlotsService.calculateSpellSlots('InvalidClass' as ClassName, 5)
        ).toThrow('Unknown class');
      });
    });
  });

  describe('calculateMulticlassSpellSlots', () => {
    it('should calculate Wizard 3 / Cleric 2 correctly (5 caster levels)', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Wizard', level: 3 },
        { className: 'Cleric', level: 2 },
      ]);

      expect(result.totalCasterLevel).toBe(5);
      expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
    });

    it('should calculate Paladin 8 / Warlock 4 correctly (Warlock separate)', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Paladin', level: 8 },
        { className: 'Warlock', level: 4 },
      ]);

      // Paladin 8 = 4 caster levels
      expect(result.totalCasterLevel).toBe(4);
      expect(result.slots).toEqual({ 1: 4, 2: 3 });

      // Warlock has separate Pact Magic
      expect(result.warlockSlots).toEqual({ slots: 2, level: 2, warlockLevel: 4 });
    });

    it('should calculate Fighter (Eldritch Knight) 12 / Wizard 8 correctly', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Eldritch Knight', level: 12 },
        { className: 'Wizard', level: 8 },
      ]);

      // EK 12 = 4 caster levels, Wizard 8 = 8 caster levels = 12 total
      expect(result.totalCasterLevel).toBe(12);
      expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 });
    });

    it('should calculate Ranger 5 / Druid 3 correctly', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Ranger', level: 5 },
        { className: 'Druid', level: 3 },
      ]);

      // Ranger 5 = 2 caster levels, Druid 3 = 3 caster levels = 5 total
      expect(result.totalCasterLevel).toBe(5);
      expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
    });

    it('should calculate triple multiclass: Wizard 2 / Cleric 2 / Sorcerer 1', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Wizard', level: 2 },
        { className: 'Cleric', level: 2 },
        { className: 'Sorcerer', level: 1 },
      ]);

      // All full casters: 2 + 2 + 1 = 5 caster levels
      expect(result.totalCasterLevel).toBe(5);
      expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
    });

    it('should handle multiclass with non-caster (Fighter 10 / Wizard 5)', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Fighter', level: 10 },
        { className: 'Wizard', level: 5 },
      ]);

      // Fighter = 0 caster levels, Wizard 5 = 5 caster levels
      expect(result.totalCasterLevel).toBe(5);
      expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 2 });
    });

    it('should handle single class (same as calculateSpellSlots)', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Wizard', level: 10 },
      ]);

      expect(result.totalCasterLevel).toBe(10);
      expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 });
    });

    it('should cap caster level at 20', () => {
      const result = SpellSlotsService.calculateMulticlassSpellSlots([
        { className: 'Wizard', level: 20 },
        { className: 'Cleric', level: 20 },
      ]);

      // Would be 40, but capped at 20
      expect(result.totalCasterLevel).toBe(20);
      expect(result.slots).toEqual({ 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 });
    });
  });

  describe('initializeSpellSlots', () => {
    it('should initialize spell slots for level 5 Wizard', async () => {
      const result = await SpellSlotsService.initializeSpellSlots(testCharacterId, [
        { className: 'Wizard', level: 5 },
      ]);

      expect(result.characterId).toBe(testCharacterId);
      expect(result.slots).toHaveLength(3);

      const slot1 = result.slots.find((s) => s.spellLevel === 1);
      const slot2 = result.slots.find((s) => s.spellLevel === 2);
      const slot3 = result.slots.find((s) => s.spellLevel === 3);

      expect(slot1?.totalSlots).toBe(4);
      expect(slot1?.usedSlots).toBe(0);
      expect(slot2?.totalSlots).toBe(3);
      expect(slot2?.usedSlots).toBe(0);
      expect(slot3?.totalSlots).toBe(2);
      expect(slot3?.usedSlots).toBe(0);
    });

    it('should replace existing spell slots on re-initialization', async () => {
      // Initialize as level 3
      await SpellSlotsService.initializeSpellSlots(testCharacterId, [
        { className: 'Wizard', level: 3 },
      ]);

      // Re-initialize as level 5
      const result = await SpellSlotsService.initializeSpellSlots(testCharacterId, [
        { className: 'Wizard', level: 5 },
      ]);

      expect(result.slots).toHaveLength(3);
      const slot1 = result.slots.find((s) => s.spellLevel === 1);
      expect(slot1?.totalSlots).toBe(4); // Level 5 has 4 level 1 slots
    });
  });

  describe('useSpellSlot', () => {
    beforeEach(async () => {
      // Initialize with level 5 Wizard slots
      await SpellSlotsService.initializeSpellSlots(testCharacterId, [
        { className: 'Wizard', level: 5 },
      ]);
    });

    it('should use a spell slot successfully', async () => {
      const result = await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
      });

      expect(result.success).toBe(true);
      expect(result.wasUpcast).toBe(false);
      expect(result.slot.usedSlots).toBe(1);
      expect(result.slot.availableSlots).toBe(3);
      expect(result.logEntry.spellName).toBe('Magic Missile');
      expect(result.logEntry.spellLevel).toBe(1);
      expect(result.logEntry.slotLevelUsed).toBe(1);
    });

    it('should support upcasting (cast level 1 spell with level 2 slot)', async () => {
      const result = await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 2,
      });

      expect(result.success).toBe(true);
      expect(result.wasUpcast).toBe(true);
      expect(result.message).toContain('upcast');
      expect(result.slot.spellLevel).toBe(2); // Used a level 2 slot
      expect(result.slot.usedSlots).toBe(1);
    });

    it('should track multiple spell slot usages', async () => {
      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
      });

      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Shield',
        spellLevel: 1,
        slotLevelUsed: 1,
      });

      const slots = await SpellSlotsService.getCharacterSpellSlots(testCharacterId);
      const slot1 = slots.slots.find((s) => s.spellLevel === 1);
      expect(slot1?.usedSlots).toBe(2);
      expect(slot1?.availableSlots).toBe(2);
    });

    it('should throw error when no slots available', async () => {
      // Use all 4 level 1 slots
      for (let i = 0; i < 4; i++) {
        await SpellSlotsService.useSpellSlot({
          characterId: testCharacterId,
          spellName: 'Magic Missile',
          spellLevel: 1,
          slotLevelUsed: 1,
        });
      }

      // Try to use a 5th slot
      await expect(
        SpellSlotsService.useSpellSlot({
          characterId: testCharacterId,
          spellName: 'Magic Missile',
          spellLevel: 1,
          slotLevelUsed: 1,
        })
      ).rejects.toThrow('No available level 1 spell slots');
    });

    it('should throw error when using lower level slot for higher level spell', async () => {
      await expect(
        SpellSlotsService.useSpellSlot({
          characterId: testCharacterId,
          spellName: 'Fireball',
          spellLevel: 3,
          slotLevelUsed: 2,
        })
      ).rejects.toThrow('Cannot use a level 2 slot for a level 3 spell');
    });

    it('should throw error for invalid spell level', async () => {
      await expect(
        SpellSlotsService.useSpellSlot({
          characterId: testCharacterId,
          spellName: 'Invalid',
          spellLevel: 10,
          slotLevelUsed: 1,
        })
      ).rejects.toThrow('Spell level must be between 0 and 9');
    });

    it('should throw error for invalid slot level', async () => {
      await expect(
        SpellSlotsService.useSpellSlot({
          characterId: testCharacterId,
          spellName: 'Magic Missile',
          spellLevel: 1,
          slotLevelUsed: 10,
        })
      ).rejects.toThrow('Slot level must be between 1 and 9');
    });
  });

  describe('restoreSpellSlots', () => {
    beforeEach(async () => {
      // Initialize with level 5 Wizard slots
      await SpellSlotsService.initializeSpellSlots(testCharacterId, [
        { className: 'Wizard', level: 5 },
      ]);

      // Use some slots
      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
      });
      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
      });
      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Scorching Ray',
        spellLevel: 2,
        slotLevelUsed: 2,
      });
    });

    it('should restore all spell slots (long rest)', async () => {
      const result = await SpellSlotsService.restoreSpellSlots({
        characterId: testCharacterId,
      });

      expect(result.totalRestored).toBe(3);
      expect(result.slotsRestored).toHaveLength(2);

      const slots = await SpellSlotsService.getCharacterSpellSlots(testCharacterId);
      expect(slots.totalUsedSlots).toBe(0);
      expect(slots.totalAvailableSlots).toBe(9); // 4 + 3 + 2
    });

    it('should restore specific spell level slots', async () => {
      const result = await SpellSlotsService.restoreSpellSlots({
        characterId: testCharacterId,
        level: 1,
      });

      expect(result.totalRestored).toBe(2);
      expect(result.slotsRestored).toHaveLength(1);
      expect(result.slotsRestored[0].level).toBe(1);

      const slots = await SpellSlotsService.getCharacterSpellSlots(testCharacterId);
      const slot1 = slots.slots.find((s) => s.spellLevel === 1);
      const slot2 = slots.slots.find((s) => s.spellLevel === 2);

      expect(slot1?.usedSlots).toBe(0);
      expect(slot2?.usedSlots).toBe(1); // Still used
    });

    it('should restore specific amount of slots', async () => {
      const result = await SpellSlotsService.restoreSpellSlots({
        characterId: testCharacterId,
        level: 1,
        amount: 1,
      });

      expect(result.totalRestored).toBe(1);

      const slots = await SpellSlotsService.getCharacterSpellSlots(testCharacterId);
      const slot1 = slots.slots.find((s) => s.spellLevel === 1);
      expect(slot1?.usedSlots).toBe(1); // Restored 1, so 1 still used
    });

    it('should handle restoring when no slots are used', async () => {
      // Restore all first
      await SpellSlotsService.restoreSpellSlots({ characterId: testCharacterId });

      // Try to restore again
      const result = await SpellSlotsService.restoreSpellSlots({
        characterId: testCharacterId,
      });

      expect(result.totalRestored).toBe(0);
      expect(result.slotsRestored).toHaveLength(0);
    });
  });

  describe('canUpcast', () => {
    it('should allow valid upcasting', () => {
      const result = SpellSlotsService.canUpcast('Magic Missile', 1, 2);

      expect(result.canUpcast).toBe(true);
      expect(result.spellLevel).toBe(1);
      expect(result.targetLevel).toBe(2);
    });

    it('should not allow cantrip upcasting', () => {
      const result = SpellSlotsService.canUpcast('Fire Bolt', 0, 1);

      expect(result.canUpcast).toBe(false);
      expect(result.reason).toContain('Cantrips cannot be upcast');
    });

    it('should not allow downcasting', () => {
      const result = SpellSlotsService.canUpcast('Fireball', 3, 2);

      expect(result.canUpcast).toBe(false);
      expect(result.reason).toContain('Target level must be higher');
    });

    it('should not allow same level casting', () => {
      const result = SpellSlotsService.canUpcast('Fireball', 3, 3);

      expect(result.canUpcast).toBe(false);
      expect(result.reason).toContain('Target level must be higher');
    });

    it('should not allow invalid target level', () => {
      const result = SpellSlotsService.canUpcast('Magic Missile', 1, 10);

      expect(result.canUpcast).toBe(false);
      expect(result.reason).toContain('Target level must be between 1 and 9');
    });
  });

  describe('getSpellSlotUsageHistory', () => {
    beforeEach(async () => {
      // Initialize with level 5 Wizard slots
      await SpellSlotsService.initializeSpellSlots(testCharacterId, [
        { className: 'Wizard', level: 5 },
      ]);
    });

    it('should retrieve usage history', async () => {
      // Use some slots
      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
      });

      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Fireball',
        spellLevel: 3,
        slotLevelUsed: 3,
      });

      const history = await SpellSlotsService.getSpellSlotUsageHistory({
        characterId: testCharacterId,
      });

      expect(history.entries).toHaveLength(2);
      expect(history.total).toBe(2);
      expect(history.hasMore).toBe(false);
      expect(history.entries[0].spellName).toBe('Fireball'); // Most recent first
      expect(history.entries[1].spellName).toBe('Magic Missile');
    });

    it('should support pagination with limit', async () => {
      // Use 5 slots
      for (let i = 0; i < 5; i++) {
        await SpellSlotsService.useSpellSlot({
          characterId: testCharacterId,
          spellName: `Spell ${i}`,
          spellLevel: 1,
          slotLevelUsed: 1,
        });
      }

      const history = await SpellSlotsService.getSpellSlotUsageHistory({
        characterId: testCharacterId,
        limit: 3,
      });

      expect(history.entries).toHaveLength(3);
      expect(history.total).toBe(5);
      expect(history.hasMore).toBe(true);
    });

    it('should support pagination with offset', async () => {
      // Use 5 slots
      for (let i = 0; i < 5; i++) {
        await SpellSlotsService.useSpellSlot({
          characterId: testCharacterId,
          spellName: `Spell ${i}`,
          spellLevel: 1,
          slotLevelUsed: 1,
        });
      }

      const history = await SpellSlotsService.getSpellSlotUsageHistory({
        characterId: testCharacterId,
        limit: 2,
        offset: 2,
      });

      expect(history.entries).toHaveLength(2);
      expect(history.total).toBe(5);
      expect(history.hasMore).toBe(true);
    });

    it('should filter by session ID', async () => {
      const sessionId1 = '00000000-0000-0000-0000-000000000001';
      const sessionId2 = '00000000-0000-0000-0000-000000000002';

      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
        sessionId: sessionId1,
      });

      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Fireball',
        spellLevel: 3,
        slotLevelUsed: 3,
        sessionId: sessionId2,
      });

      const history = await SpellSlotsService.getSpellSlotUsageHistory({
        characterId: testCharacterId,
        sessionId: sessionId1,
      });

      expect(history.entries).toHaveLength(1);
      expect(history.entries[0].spellName).toBe('Magic Missile');
    });
  });

  describe('getCharacterSpellSlots', () => {
    it('should return empty slots for character without slots', async () => {
      const result = await SpellSlotsService.getCharacterSpellSlots(testCharacterId);

      expect(result.characterId).toBe(testCharacterId);
      expect(result.slots).toHaveLength(0);
      expect(result.totalAvailableSlots).toBe(0);
      expect(result.totalUsedSlots).toBe(0);
    });

    it('should return spell slots with computed availableSlots', async () => {
      await SpellSlotsService.initializeSpellSlots(testCharacterId, [
        { className: 'Wizard', level: 5 },
      ]);

      // Use one slot
      await SpellSlotsService.useSpellSlot({
        characterId: testCharacterId,
        spellName: 'Magic Missile',
        spellLevel: 1,
        slotLevelUsed: 1,
      });

      const result = await SpellSlotsService.getCharacterSpellSlots(testCharacterId);

      expect(result.slots).toHaveLength(3);
      const slot1 = result.slots.find((s) => s.spellLevel === 1);
      expect(slot1?.totalSlots).toBe(4);
      expect(slot1?.usedSlots).toBe(1);
      expect(slot1?.availableSlots).toBe(3);

      expect(result.totalAvailableSlots).toBe(8); // 3 + 3 + 2
      expect(result.totalUsedSlots).toBe(1);
    });
  });
});
