import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  mockWizard,
  mockCleric,
  mockHuman,
  createMockCharacter,
  generateLargeSpellDataset,
} from '@/__tests__/helpers/spell-test-helpers';
import { spellApi } from '@/services/spellApi';
import {
  validateSpellSelection,
  validateMulticlassSpellSelection,
  getSpellcastingInfo,
  getRacialSpells,
} from '@/utils/spell-validation';

/**
 * Spell Validation Performance Tests
 *
 * Tests to ensure spell validation functions perform well under load and with large datasets.
 * Critical for maintaining responsive UI during character creation and spell selection.
 *
 * Performance targets:
 * - Basic validation: < 10ms
 * - Large spell lists (1000+ spells): < 100ms
 * - Multiclass calculations: < 50ms
 * - Memory usage: < 50MB for large datasets
 */

// Mock the spell API for performance testing
vi.mock('@/services/spellApi', () => ({
  spellApi: {
    calculateMulticlassCasterLevel: vi.fn(),
    getClassSpells: vi.fn(),
    validateSpellForClass: vi.fn(),
  },
}));

describe('Spell Validation Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Validation Performance', () => {
    it('should validate wizard spells in under 10ms', () => {
      const wizardCharacter = createMockCharacter('Performance Wizard', mockWizard, mockHuman);

      const startTime = performance.now();

      const result = validateSpellSelection(
        wizardCharacter,
        ['mage-hand', 'prestidigitation', 'light'],
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(executionTime).toBeLessThan(10);
    });

    it('should validate cleric spells in under 10ms', () => {
      const clericCharacter = createMockCharacter('Performance Cleric', mockCleric, mockHuman);

      const startTime = performance.now();

      const result = validateSpellSelection(
        clericCharacter,
        ['guidance', 'thaumaturgy', 'sacred-flame'],
        ['cure-wounds'],
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(executionTime).toBeLessThan(10);
    });

    it('should handle multiple validation calls efficiently', () => {
      const wizardCharacter = createMockCharacter('Batch Wizard', mockWizard, mockHuman);
      const iterations = 100;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      expect(averageTime).toBeLessThan(1); // Less than 1ms per validation
      expect(totalTime).toBeLessThan(100); // Total under 100ms
    });
  });

  describe('Large Dataset Performance', () => {
    it('should handle large spell datasets efficiently', () => {
      const largeSpellDataset = generateLargeSpellDataset(1000);
      const wizardCharacter = createMockCharacter('Large Dataset Wizard', mockWizard, mockHuman);

      // Mock a large spell validation scenario
      const cantrips = largeSpellDataset
        .filter((s) => s.level === 0)
        .slice(0, 3)
        .map((s) => s.id);
      const spells = largeSpellDataset
        .filter((s) => s.level === 1)
        .slice(0, 6)
        .map((s) => s.id);

      const startTime = performance.now();

      const result = validateSpellSelection(wizardCharacter, cantrips, spells);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(executionTime).toBeLessThan(100); // Should handle 1000 spells in under 100ms
    });

    it('should maintain performance with very large spell selections', () => {
      const wizardCharacter = createMockCharacter('Large Selection Wizard', mockWizard, mockHuman);

      // Create artificially large selections (beyond normal game limits)
      const manyCantrips = Array(50)
        .fill(0)
        .map((_, i) => `cantrip-${i}`);
      const manySpells = Array(100)
        .fill(0)
        .map((_, i) => `spell-${i}`);

      const startTime = performance.now();

      const result = validateSpellSelection(wizardCharacter, manyCantrips, manySpells);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should still complete quickly even with invalid large selections
      expect(executionTime).toBeLessThan(50);
      expect(result.valid).toBe(false); // Should fail validation but quickly
    });

    it('should efficiently process racial spell calculations', () => {
      const iterations = 1000;

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        getRacialSpells('High Elf');
        getRacialSpells('Tiefling');
        getRacialSpells('Drow');
        getRacialSpells('Forest Gnome');
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // 4000 racial spell lookups in under 100ms
    });
  });

  describe('Multiclass Performance', () => {
    it('should handle multiclass calculations efficiently', async () => {
      const multiclassCharacter = {
        ...createMockCharacter('Multiclass Performance', mockWizard, mockHuman),
        classLevels: [
          { className: 'Wizard', level: 5 },
          { className: 'Cleric', level: 3 },
          { className: 'Paladin', level: 2 },
        ],
      };

      // Mock the API call to return quickly
      vi.mocked(spellApi.calculateMulticlassCasterLevel).mockResolvedValue({
        totalCasterLevel: 8,
        spellSlots: { caster_level: 8 },
        pactMagicSlots: null,
      });

      const startTime = performance.now();

      const result = await validateMulticlassSpellSelection(
        multiclassCharacter,
        ['mage-hand', 'prestidigitation', 'light'],
        ['magic-missile', 'shield'],
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(executionTime).toBeLessThan(50);
    });

    it('should handle multiple multiclass calculations in parallel', async () => {
      const multiclassCharacters = Array(10)
        .fill(0)
        .map((_, i) => ({
          ...createMockCharacter(`Multiclass ${i}`, mockWizard, mockHuman),
          classLevels: [
            { className: 'Wizard', level: i + 1 },
            { className: 'Cleric', level: i + 1 },
          ],
        }));

      vi.mocked(spellApi.calculateMulticlassCasterLevel).mockImplementation(async () => ({
        totalCasterLevel: 5,
        spellSlots: { caster_level: 5 },
        pactMagicSlots: null,
      }));

      const startTime = performance.now();

      const promises = multiclassCharacters.map((character) =>
        validateMulticlassSpellSelection(character, ['mage-hand'], ['magic-missile']),
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.valid)).toBe(true);
      expect(executionTime).toBeLessThan(200); // 10 multiclass calculations in under 200ms
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not leak memory during repeated validations', () => {
      const wizardCharacter = createMockCharacter('Memory Test Wizard', mockWizard, mockHuman);
      const iterations = 1000;

      // Get initial memory usage (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      for (let i = 0; i < iterations; i++) {
        validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );

        // Force garbage collection periodically if available
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB for 1000 validations)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });

    it('should handle large character datasets without excessive memory usage', () => {
      const characters = Array(100)
        .fill(0)
        .map((_, i) => createMockCharacter(`Character ${i}`, mockWizard, mockHuman));

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const startTime = performance.now();

      characters.forEach((character) => {
        validateSpellSelection(
          character,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );
      });

      const endTime = performance.now();
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(500); // 100 characters in under 500ms

      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Under 50MB
      }
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle validation errors quickly', () => {
      const wizardCharacter = createMockCharacter('Error Test Wizard', mockWizard, mockHuman);

      const startTime = performance.now();

      // Create a scenario with many validation errors
      const result = validateSpellSelection(
        wizardCharacter,
        ['invalid1', 'invalid2', 'invalid3', 'invalid4', 'invalid5'], // Too many, all invalid
        [
          'invalid-spell-1',
          'invalid-spell-2',
          'invalid-spell-3',
          'invalid-spell-4',
          'invalid-spell-5',
          'invalid-spell-6',
          'invalid-spell-7',
        ], // Too many, all invalid
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(20); // Error cases should be fast
    });

    it('should handle null/undefined inputs efficiently', () => {
      const startTime = performance.now();

      const testCases = [
        { character: null, cantrips: [], spells: [] },
        { character: undefined, cantrips: null, spells: null },
        {
          character: createMockCharacter('Test', mockWizard, mockHuman),
          cantrips: undefined,
          spells: undefined,
        },
      ];

      testCases.forEach((testCase) => {
        validateSpellSelection(
          testCase.character as any,
          testCase.cantrips as any,
          testCase.spells as any,
        );
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(10); // Should handle edge cases quickly
    });

    it('should maintain performance with deeply nested character data', () => {
      // Create a character with complex nested structure
      const complexCharacter = {
        ...createMockCharacter('Complex Wizard', mockWizard, mockHuman),
        classLevels: Array(20)
          .fill(0)
          .map((_, i) => ({
            className: `Class-${i}`,
            level: i + 1,
            subclassFeatures: Array(10)
              .fill(0)
              .map((_, j) => ({
                name: `Feature-${j}`,
                description: 'A'.repeat(1000), // Large description
              })),
          })),
        customData: {
          // Add some complex nested data
          deeply: {
            nested: {
              data: {
                structure: Array(100)
                  .fill(0)
                  .map((_, i) => ({
                    id: i,
                    value: 'x'.repeat(100),
                  })),
              },
            },
          },
        },
      };

      const startTime = performance.now();

      const result = validateSpellSelection(
        complexCharacter,
        ['mage-hand', 'prestidigitation', 'light'],
        ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(executionTime).toBeLessThan(25); // Should still be fast despite complex data
    });
  });

  describe('Concurrent Validation Performance', () => {
    it('should handle concurrent validations efficiently', async () => {
      const characters = Array(20)
        .fill(0)
        .map((_, i) => createMockCharacter(`Concurrent ${i}`, mockWizard, mockHuman));

      const startTime = performance.now();

      const promises = characters.map((character) =>
        Promise.resolve(
          validateSpellSelection(
            character,
            ['mage-hand', 'prestidigitation', 'light'],
            ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
          ),
        ),
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(20);
      expect(results.every((r) => r.valid)).toBe(true);
      expect(executionTime).toBeLessThan(100); // 20 concurrent validations in under 100ms
    });

    it('should not block the event loop during validation', (done) => {
      const wizardCharacter = createMockCharacter('Event Loop Test', mockWizard, mockHuman);
      let eventLoopBlocked = false;

      // Set up a timer to check if the event loop is blocked
      const timeoutId = setTimeout(() => {
        eventLoopBlocked = true;
      }, 5);

      // Perform intensive validation
      for (let i = 0; i < 1000; i++) {
        validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );
      }

      // Check if the timeout was able to execute
      setTimeout(() => {
        clearTimeout(timeoutId);
        expect(eventLoopBlocked).toBe(false);
        done();
      }, 10);
    });
  });

  describe('Optimization Verification', () => {
    it('should benefit from spellcasting info caching', () => {
      const wizardCharacter = createMockCharacter('Cache Test Wizard', mockWizard, mockHuman);

      // First call should establish any caching
      const startTime1 = performance.now();
      getSpellcastingInfo(mockWizard, 1);
      const endTime1 = performance.now();
      const firstCallTime = endTime1 - startTime1;

      // Subsequent calls should be faster (if caching is implemented)
      const startTime2 = performance.now();
      for (let i = 0; i < 100; i++) {
        getSpellcastingInfo(mockWizard, 1);
      }
      const endTime2 = performance.now();
      const subsequentCallsTime = (endTime2 - startTime2) / 100;

      // Subsequent calls should be at least as fast as the first call
      expect(subsequentCallsTime).toBeLessThanOrEqual(firstCallTime);
    });

    it('should demonstrate performance improvement with optimized validation', () => {
      const wizardCharacter = createMockCharacter('Optimization Test', mockWizard, mockHuman);
      const iterations = 1000;

      // Measure current implementation
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        validateSpellSelection(
          wizardCharacter,
          ['mage-hand', 'prestidigitation', 'light'],
          ['magic-missile', 'shield', 'detect-magic', 'burning-hands', 'sleep', 'color-spray'],
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / iterations;

      // Document current performance for future optimization
      console.log(`Current validation performance: ${averageTime.toFixed(3)}ms per validation`);
      console.log(`Total time for ${iterations} validations: ${totalTime.toFixed(2)}ms`);

      // Ensure it meets current performance requirements
      expect(averageTime).toBeLessThan(2); // Under 2ms per validation
      expect(totalTime).toBeLessThan(2000); // Total under 2 seconds
    });
  });
});
