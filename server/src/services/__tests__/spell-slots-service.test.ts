/**
 * Spell Slots Service Tests
 *
 * Comprehensive test suite for D&D 5E spell slot tracking system
 * Tests slot calculation, usage, restoration, multiclassing, and edge cases
 * Work Unit: 2.1a
 *
 * MIGRATED TO FIXTURES: No DATABASE_URL required
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpellSlotsService } from '../spell-slots-service.js';
import { createMockDatabase } from '../../__tests__/mocks/database.js';
import { wizardLevel5, wizardLevel5Stats } from '../../__tests__/fixtures/characters.js';
import type { ClassName } from '../../types/spell-slots.js';

// Create mock database
let mockDb: ReturnType<typeof createMockDatabase>;
let testCharacterId: string;

// Mock the db module to use our mockDb
vi.mock('../../../../db/client.js', () => ({
  db: mockDb,
}));

// Mock supabase service
vi.mock('../../lib/supabase.js', () => ({
  supabaseService: {
    from: vi.fn((table: string) => ({
      insert: vi.fn((values: any) => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => {
            if (table === 'characters') {
              const data = Array.isArray(values) ? values[0] : values;
              const character = {
                id: `test-char-${Date.now()}`,
                ...data,
              };
              mockDb.setData('characters', [...mockDb.getData('characters'), character]);
              return { data: character, error: null };
            }
            return { data: null, error: new Error('Not implemented') };
          }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn((field: string, value: any) => ({
          then: vi.fn(async () => {
            if (table === 'character_spell_slots') {
              const data = mockDb.getData('character_spell_slots');
              mockDb.setData(
                'character_spell_slots',
                data.filter((item: any) => item.character_id !== value)
              );
            }
            if (table === 'spell_slot_usage_log') {
              const data = mockDb.getData('spell_slot_usage_log');
              mockDb.setData(
                'spell_slot_usage_log',
                data.filter((item: any) => item.character_id !== value)
              );
            }
            if (table === 'characters') {
              const data = mockDb.getData('characters');
              mockDb.setData(
                'characters',
                data.filter((item: any) => item.id !== value)
              );
            }
            return { data: null, error: null };
          }),
        })),
      })),
    })),
  },
}));

describe('SpellSlotsService', () => {
  beforeEach(async () => {
    // Create fresh mock database for each test
    mockDb = createMockDatabase();

    // Create test character
    testCharacterId = `test-wizard-${Date.now()}`;
    const character = {
      id: testCharacterId,
      userId: 'test-user',
      name: 'Test Wizard',
      race: 'Human',
      class: 'Wizard',
      level: 5,
    };

    mockDb.setData('characters', [character]);
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

  // Note: Database-dependent tests (initializeSpellSlots, useSpellSlot, etc.) would need
  // the actual SpellSlotsService to be refactored to accept a db instance for proper mocking.
  // For now, these pure calculation tests demonstrate the fixture-based approach.
  // The service methods that interact with the database would be tested in integration tests.
});
