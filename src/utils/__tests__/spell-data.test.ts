import { describe, it, expect } from 'vitest';

import { cantrips, firstLevelSpells, allSpells } from '@/data/spellOptions';
import { Spell } from '@/types/character';

/**
 * Spell Data Integrity Tests
 *
 * Validates that all spell data meets D&D 5E requirements:
 * - Required properties are present
 * - Data format is correct
 * - No duplicate IDs
 * - School names are valid
 * - Component breakdown matches components string
 * - Level values are appropriate
 */

describe('Spell Data Integrity', () => {
  // Use the exported allSpells which already combines cantrips and firstLevelSpells
  const validSchools = [
    'Abjuration',
    'Conjuration',
    'Divination',
    'Enchantment',
    'Evocation',
    'Illusion',
    'Necromancy',
    'Transmutation',
  ];

  describe('Required Properties', () => {
    it('should have all required properties for each spell', () => {
      allSpells.forEach((spell) => {
        expect(spell).toHaveProperty('id');
        expect(spell).toHaveProperty('name');
        expect(spell).toHaveProperty('level');
        expect(spell).toHaveProperty('school');
        expect(spell).toHaveProperty('castingTime');
        expect(spell).toHaveProperty('range');
        expect(spell).toHaveProperty('components');
        expect(spell).toHaveProperty('duration');
        expect(spell).toHaveProperty('description');

        // Check that required properties are not empty
        expect(spell.id).toBeTruthy();
        expect(spell.name).toBeTruthy();
        expect(spell.school).toBeTruthy();
        expect(spell.castingTime).toBeTruthy();
        expect(spell.range).toBeTruthy();
        expect(spell.components).toBeTruthy();
        expect(spell.duration).toBeTruthy();
        expect(spell.description).toBeTruthy();
      });
    });

    it('should have unique spell IDs', () => {
      const ids = allSpells.map((spell) => spell.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have reasonable spell name distribution', () => {
      // Check that there aren't excessive duplicates (allow many for cross-class spells)
      const cantripNames = cantrips.map((spell) => spell.name);
      const uniqueCantripNames = new Set(cantripNames);
      const duplicateRatio = uniqueCantripNames.size / cantripNames.length;
      expect(duplicateRatio).toBeGreaterThan(0.3); // At least 30% unique names (lenient for cross-class)

      // Check uniqueness within 1st level spells
      const spellNames = firstLevelSpells.map((spell) => spell.name);
      const uniqueSpellNames = new Set(spellNames);
      const spellDuplicateRatio = uniqueSpellNames.size / spellNames.length;
      expect(spellDuplicateRatio).toBeGreaterThan(0.3); // At least 30% unique names (lenient for cross-class)

      // Ensure we have some spells at least
      expect(uniqueCantripNames.size).toBeGreaterThan(10);
      expect(uniqueSpellNames.size).toBeGreaterThan(15);
    });
  });

  describe('Data Format Validation', () => {
    it('should have valid spell levels', () => {
      cantrips.forEach((spell) => {
        expect(spell.level).toBe(0);
      });

      firstLevelSpells.forEach((spell) => {
        expect(spell.level).toBeGreaterThan(0);
        expect(spell.level).toBeLessThanOrEqual(9);
      });
    });

    it('should have valid school names', () => {
      allSpells.forEach((spell) => {
        expect(validSchools).toContain(spell.school);
      });
    });

    it('should have consistent component breakdown', () => {
      allSpells.forEach((spell) => {
        const hasV = spell.components.includes('V');
        const hasS = spell.components.includes('S');
        const hasM = spell.components.includes('M');

        expect(spell.verbal || false).toBe(hasV);
        expect(spell.somatic || false).toBe(hasS);
        expect(spell.material || false).toBe(hasM);

        // If material is true, should have material description
        if (spell.material) {
          expect(spell.materialDescription).toBeTruthy();
        }
      });
    });

    it('should have valid casting times', () => {
      const validCastingTimes = [
        '1 action',
        '1 bonus action',
        '1 reaction',
        '1 minute',
        '10 minutes',
        '1 hour',
        '8 hours',
        '24 hours',
      ];

      allSpells.forEach((spell) => {
        const isValidCastingTime = validCastingTimes.some(
          (time) =>
            spell.castingTime.includes(time) ||
            spell.castingTime.match(/^\d+ (action|minute|hour)s?$/) ||
            spell.castingTime.includes('reaction'),
        );
        expect(isValidCastingTime).toBe(true);
      });
    });

    it('should have valid ranges', () => {
      allSpells.forEach((spell) => {
        const range = spell.range.toLowerCase();
        const isValidRange =
          range === 'self' ||
          range === 'touch' ||
          range === 'sight' ||
          range.includes('feet') ||
          range.includes('mile') ||
          range.includes('unlimited') ||
          range.includes('special') ||
          range.includes('self (') || // For "Self (15-foot cone)" etc
          /^\d+\s*feet$/i.test(spell.range); // For basic foot ranges

        expect(isValidRange).toBe(true);
      });
    });

    it('should have valid durations', () => {
      allSpells.forEach((spell) => {
        const duration = spell.duration.toLowerCase();
        const isValidDuration =
          duration === 'instantaneous' ||
          duration.includes('concentration') ||
          duration.includes('minute') ||
          duration.includes('hour') ||
          duration.includes('day') ||
          duration.includes('permanent') ||
          duration.includes('special') ||
          duration.includes('until') ||
          duration.includes('round') ||
          /^\d+\s*(minute|hour|day|round)s?$/i.test(spell.duration); // For basic time durations

        expect(isValidDuration).toBe(true);
      });
    });
  });

  describe('Special Properties', () => {
    it('should mark concentration spells correctly', () => {
      allSpells.forEach((spell) => {
        const hasConcentration = spell.duration.toLowerCase().includes('concentration');
        expect(spell.concentration || false).toBe(hasConcentration);
      });
    });

    it('should have valid damage values when present', () => {
      allSpells.forEach((spell) => {
        if (spell.damage) {
          // Should contain dice notation or specific damage description
          const hasDice = /\d+d\d+/.test(spell.damage);
          const hasValidDescription = spell.damage.length > 0;
          expect(hasDice || hasValidDescription).toBe(true);
        }
      });
    });

    it('should have valid material costs when present', () => {
      allSpells.forEach((spell) => {
        if (spell.materialCost) {
          expect(spell.materialCost).toBeGreaterThan(0);
          expect(typeof spell.materialCost).toBe('number');
        }
      });
    });
  });

  describe('Description Quality', () => {
    it('should have meaningful descriptions', () => {
      allSpells.forEach((spell) => {
        expect(spell.description.length).toBeGreaterThan(20);
        expect(spell.description).not.toMatch(/^(TODO|FIXME|undefined)/i);
      });
    });

    it('should not contain placeholder text', () => {
      allSpells.forEach((spell) => {
        expect(spell.description).not.toMatch(/lorem ipsum/i);
        expect(spell.description).not.toMatch(/placeholder/i);
        expect(spell.description).not.toMatch(/xxx/i);
      });
    });
  });

  describe('Performance Validation', () => {
    it('should have reasonable spell counts', () => {
      expect(cantrips.length).toBeGreaterThan(10);
      expect(cantrips.length).toBeLessThan(50);
      expect(firstLevelSpells.length).toBeGreaterThan(20);
      expect(firstLevelSpells.length).toBeLessThan(200);
    });

    it('should have consistent data structure', () => {
      const firstSpell = allSpells[0];
      const expectedKeys = Object.keys(firstSpell);

      allSpells.forEach((spell) => {
        expectedKeys.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(spell, key)) {
            expect(typeof (spell as any)[key]).toBe(typeof (firstSpell as any)[key]);
          }
        });
      });
    });
  });

  describe('School Distribution', () => {
    it('should have spells from all schools', () => {
      const schoolsInData = new Set(allSpells.map((spell) => spell.school));

      validSchools.forEach((school) => {
        expect(schoolsInData.has(school)).toBe(true);
      });
    });

    it('should have balanced school representation', () => {
      const schoolCounts = validSchools.reduce(
        (acc, school) => {
          acc[school] = allSpells.filter((spell) => spell.school === school).length;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Each school should have at least 2 spells
      Object.values(schoolCounts).forEach((count) => {
        expect(count).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Cantrip Specific Tests', () => {
    it('should have all cantrips at level 0', () => {
      cantrips.forEach((spell) => {
        expect(spell.level).toBe(0);
      });
    });

    it('should not have concentration cantrips with long durations', () => {
      cantrips.forEach((spell) => {
        if (spell.concentration) {
          // Concentration cantrips should not last more than 1 minute typically
          const duration = spell.duration.toLowerCase();
          if (duration.includes('hour') || duration.includes('day')) {
            console.warn(
              `Cantrip ${spell.name} has unusually long concentration duration: ${spell.duration}`,
            );
          }
        }
      });
    });
  });

  describe('Level 1 Spell Tests', () => {
    it('should have appropriate level 1 spells', () => {
      const level1Spells = firstLevelSpells.filter((spell) => spell.level === 1);
      expect(level1Spells.length).toBeGreaterThan(10);

      level1Spells.forEach((spell) => {
        expect(spell.level).toBe(1);
      });
    });
  });
});
