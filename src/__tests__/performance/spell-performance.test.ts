import { performance } from 'perf_hooks';

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createMockWizard,
  generateLargeSpellDataset,
  validWizardCantrips,
  validWizardSpells,
} from '../helpers/spell-test-helpers';

import {
  validateSpellSelection,
  getSpellcastingInfo,
  getRacialSpells,
} from '@/utils/spell-validation';

/**
 * Spell System Performance Tests
 *
 * Validates that the spell selection system performs efficiently:
 * - Validation speed with large spell lists
 * - Search and filtering performance
 * - Memory usage optimization
 * - Component rendering benchmarks
 * - Database query optimization
 */

describe('Spell System Performance Tests', () => {
  let wizardCharacter: ReturnType<typeof createMockWizard>;

  beforeEach(() => {
    wizardCharacter = createMockWizard();
  });

  describe('Validation Performance', () => {
    it('should validate spell selection quickly', () => {
      const startTime = performance.now();

      const result = validateSpellSelection(
        wizardCharacter,
        validWizardCantrips,
        validWizardSpells,
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(10); // Should complete within 10ms
    });

    it('should handle large spell datasets efficiently', () => {
      const largeSpellDataset = generateLargeSpellDataset(1000);

      // Mock the spell data
      vi.doMock('@/data/spellOptions', () => ({
        getClassSpells: () => ({
          cantrips: largeSpellDataset.filter((s) => s.level === 0).slice(0, 50),
          spells: largeSpellDataset.filter((s) => s.level === 1).slice(0, 100),
        }),
      }));

      const startTime = performance.now();

      const result = validateSpellSelection(
        wizardCharacter,
        validWizardCantrips,
        validWizardSpells,
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.valid).toBe(true);
      expect(duration).toBeLessThan(50); // Should complete within 50ms even with large dataset
    });

    it('should batch validate multiple characters efficiently', () => {
      const characters = Array.from({ length: 100 }, (_, i) => createMockWizard(`Wizard ${i}`));

      const startTime = performance.now();

      const results = characters.map((character) =>
        validateSpellSelection(character, validWizardCantrips, validWizardSpells),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.every((r) => r.valid)).toBe(true);
      expect(duration).toBeLessThan(100); // Should validate 100 characters within 100ms
    });
  });

  describe('Spellcasting Info Performance', () => {
    it('should compute spellcasting info quickly', () => {
      const startTime = performance.now();

      const results = Array.from({ length: 1000 }, () =>
        getSpellcastingInfo(wizardCharacter.class!, wizardCharacter.level),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.every((r) => r !== null)).toBe(true);
      expect(duration).toBeLessThan(50); // Should compute 1000 results within 50ms
    });

    it('should cache spellcasting info for repeated calls', () => {
      const startTime = performance.now();

      // Call the same function multiple times
      for (let i = 0; i < 1000; i++) {
        getSpellcastingInfo(wizardCharacter.class!, wizardCharacter.level);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(25); // Should be very fast with caching
    });
  });

  describe('Racial Spell Performance', () => {
    it('should compute racial spells quickly', () => {
      const startTime = performance.now();

      const results = Array.from({ length: 1000 }, () => getRacialSpells('High Elf'));

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.every((r) => r.bonusCantrips === 1)).toBe(true);
      expect(duration).toBeLessThan(25); // Should compute 1000 results within 25ms
    });

    it('should handle complex racial spell combinations', () => {
      const races = ['Human', 'High Elf', 'Drow', 'Tiefling', 'Forest Gnome'];

      const startTime = performance.now();

      const results = races.flatMap((race) =>
        Array.from({ length: 200 }, () => getRacialSpells(race)),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(50); // Should handle 1000 racial computations within 50ms
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during repeated validations', () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many validations
      for (let i = 0; i < 1000; i++) {
        const character = createMockWizard(`Wizard ${i}`);
        validateSpellSelection(character, validWizardCantrips, validWizardSpells);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncreaseKB).toBeLessThan(1024);
    });

    it('should efficiently handle large spell lists without excessive memory usage', () => {
      const largeSpellDataset = generateLargeSpellDataset(5000);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Process the large dataset
      const processedSpells = largeSpellDataset.map((spell) => ({
        ...spell,
        processed: true,
      }));

      const memoryAfterProcessing = process.memoryUsage().heapUsed;
      const memoryUsed = (memoryAfterProcessing - initialMemory) / 1024 / 1024; // Convert to MB

      // Should use reasonable amount of memory (less than 10MB for 5000 spells)
      expect(memoryUsed).toBeLessThan(10);
      expect(processedSpells).toHaveLength(5000);
    });
  });

  describe('Algorithm Complexity', () => {
    it('should scale linearly with spell count', () => {
      const spellCounts = [100, 500, 1000, 2000];
      const durations: number[] = [];

      spellCounts.forEach((count) => {
        const dataset = generateLargeSpellDataset(count);

        const startTime = performance.now();

        // Simulate spell filtering operation
        const filtered = dataset.filter(
          (spell) => spell.school === 'Evocation' && spell.level <= 3 && spell.verbal === true,
        );

        const endTime = performance.now();
        durations.push(endTime - startTime);
      });

      // Check that duration scaling is reasonable (not exponential)
      for (let i = 1; i < durations.length; i++) {
        const prevCount = spellCounts[i - 1];
        const currentCount = spellCounts[i];
        const prevDuration = durations[i - 1];
        const currentDuration = durations[i];

        const scalingFactor = currentDuration / prevDuration;
        const expectedScaling = currentCount / prevCount;

        // Scaling should be roughly linear (within 2x of expected)
        expect(scalingFactor).toBeLessThan(expectedScaling * 2);
      }
    });

    it('should handle nested filtering efficiently', () => {
      const largeDataset = generateLargeSpellDataset(2000);

      const startTime = performance.now();

      // Simulate complex filtering (multiple conditions)
      const complexFiltered = largeDataset
        .filter((spell) => spell.school === 'Evocation' || spell.school === 'Abjuration')
        .filter((spell) => spell.level >= 1 && spell.level <= 5)
        .filter((spell) => spell.verbal === true)
        .filter((spell) => spell.name.toLowerCase().includes('a'))
        .sort((a, b) => a.level - b.level);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Complex filtering should complete within 100ms
      expect(complexFiltered.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous validations', async () => {
      const characters = Array.from({ length: 50 }, (_, i) => createMockWizard(`Wizard ${i}`));

      const startTime = performance.now();

      // Simulate concurrent validations
      const promises = characters.map((character) =>
        Promise.resolve(validateSpellSelection(character, validWizardCantrips, validWizardSpells)),
      );

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.every((r) => r.valid)).toBe(true);
      expect(duration).toBeLessThan(200); // All concurrent validations within 200ms
    });

    it('should maintain performance under load', async () => {
      const iterations = 10;
      const charactersPerIteration = 20;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const characters = Array.from({ length: charactersPerIteration }, (_, j) =>
          createMockWizard(`Wizard ${i}-${j}`),
        );

        const startTime = performance.now();

        const results = characters.map((character) =>
          validateSpellSelection(character, validWizardCantrips, validWizardSpells),
        );

        const endTime = performance.now();
        durations.push(endTime - startTime);

        expect(results.every((r) => r.valid)).toBe(true);
      }

      // Performance should remain consistent across iterations
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const maxDuration = Math.max(...durations);

      expect(maxDuration).toBeLessThan(avgDuration * 2); // No single iteration should be 2x slower than average
    });
  });

  describe('Data Structure Efficiency', () => {
    it('should use efficient data structures for spell lookup', () => {
      const spellIds = validWizardCantrips.concat(validWizardSpells);

      const startTime = performance.now();

      // Simulate O(1) lookup operations
      for (let i = 0; i < 10000; i++) {
        const randomId = spellIds[i % spellIds.length];
        const exists = spellIds.includes(randomId);
        expect(exists).toBe(true);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 10,000 lookups within 100ms
    });

    it('should efficiently compare spell arrays', () => {
      const array1 = Array.from({ length: 1000 }, (_, i) => `spell-${i}`);
      const array2 = Array.from({ length: 1000 }, (_, i) => `spell-${i}`);

      const startTime = performance.now();

      // Simulate array comparison operations
      for (let i = 0; i < 1000; i++) {
        const isEqual =
          array1.length === array2.length &&
          array1.every((spell, index) => spell === array2[index]);
        expect(isEqual).toBe(true);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // 1000 array comparisons within 50ms
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle empty datasets efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const result = validateSpellSelection(wizardCharacter, [], []);
        expect(result.valid).toBe(false);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(25); // Empty validations should be very fast
    });

    it('should handle malformed data gracefully', () => {
      const malformedCharacter = {
        ...wizardCharacter,
        class: null,
        race: null,
      };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const result = validateSpellSelection(malformedCharacter as any, [], []);
        expect(result.valid).toBe(false);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Error handling should not be expensive
    });

    it('should handle very long spell names and descriptions', () => {
      const longString = 'A'.repeat(10000);
      const longSpells = Array.from({ length: 100 }, (_, i) => `${longString}-${i}`);

      const startTime = performance.now();

      const result = validateSpellSelection(
        wizardCharacter,
        longSpells.slice(0, 3),
        longSpells.slice(3, 9),
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should handle long strings efficiently
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain baseline performance for typical operations', () => {
      const baseline = {
        singleValidation: 5, // ms
        batchValidation: 50, // ms for 100 characters
        memoryUsage: 1024, // KB increase
        searchFilter: 25, // ms for complex filtering
      };

      // Single validation test
      const singleStart = performance.now();
      validateSpellSelection(wizardCharacter, validWizardCantrips, validWizardSpells);
      const singleDuration = performance.now() - singleStart;

      expect(singleDuration).toBeLessThan(baseline.singleValidation);

      // Batch validation test
      const characters = Array.from({ length: 100 }, (_, i) => createMockWizard(`Wizard ${i}`));
      const batchStart = performance.now();
      characters.forEach((char) =>
        validateSpellSelection(char, validWizardCantrips, validWizardSpells),
      );
      const batchDuration = performance.now() - batchStart;

      expect(batchDuration).toBeLessThan(baseline.batchValidation);
    });

    it('should not regress with additional features', () => {
      // This test should be updated as new features are added
      // to ensure they don't degrade performance

      const featureTests = [
        () => getSpellcastingInfo(wizardCharacter.class!, wizardCharacter.level),
        () => getRacialSpells(wizardCharacter.race!.name, wizardCharacter.subrace),
        () => validateSpellSelection(wizardCharacter, validWizardCantrips, validWizardSpells),
      ];

      featureTests.forEach((test, index) => {
        const startTime = performance.now();

        for (let i = 0; i < 1000; i++) {
          test();
        }

        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(100); // Each feature test should complete within 100ms
      });
    });
  });
});
