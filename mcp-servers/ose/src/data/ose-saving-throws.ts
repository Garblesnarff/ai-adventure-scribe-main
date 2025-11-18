/**
 * OSE Saving Throw Tables
 */

export type SaveCategory = 'death' | 'wands' | 'paralysis' | 'breath' | 'spells';

export interface SavingThrows {
  death: number;
  wands: number;
  paralysis: number;
  breath: number;
  spells: number;
}

export interface ClassSavingThrows {
  className: string;
  levels: Record<number, SavingThrows>;
}

// Saving throw progression by class
export const OSE_SAVING_THROWS: ClassSavingThrows[] = [
  {
    className: 'Cleric',
    levels: {
      1: { death: 11, wands: 12, paralysis: 14, breath: 16, spells: 15 },
      4: { death: 10, wands: 11, paralysis: 13, breath: 15, spells: 14 },
      7: { death: 9, wands: 10, paralysis: 12, breath: 14, spells: 13 },
      10: { death: 8, wands: 9, paralysis: 11, breath: 13, spells: 12 },
      13: { death: 7, wands: 8, paralysis: 10, breath: 12, spells: 11 },
    }
  },
  {
    className: 'Fighter',
    levels: {
      1: { death: 12, wands: 13, paralysis: 14, breath: 15, spells: 16 },
      4: { death: 11, wands: 12, paralysis: 13, breath: 14, spells: 15 },
      7: { death: 10, wands: 11, paralysis: 12, breath: 13, spells: 14 },
      10: { death: 9, wands: 10, paralysis: 11, breath: 12, spells: 13 },
      13: { death: 8, wands: 9, paralysis: 10, breath: 11, spells: 12 },
    }
  },
  {
    className: 'Magic-User',
    levels: {
      1: { death: 13, wands: 14, paralysis: 13, breath: 16, spells: 15 },
      5: { death: 12, wands: 13, paralysis: 12, breath: 15, spells: 14 },
      9: { death: 11, wands: 12, paralysis: 11, breath: 14, spells: 13 },
      13: { death: 10, wands: 11, paralysis: 10, breath: 13, spells: 12 },
    }
  },
  {
    className: 'Thief',
    levels: {
      1: { death: 13, wands: 14, paralysis: 13, breath: 16, spells: 15 },
      4: { death: 12, wands: 13, paralysis: 12, breath: 15, spells: 14 },
      7: { death: 11, wands: 12, paralysis: 11, breath: 14, spells: 13 },
      10: { death: 10, wands: 11, paralysis: 10, breath: 13, spells: 12 },
      13: { death: 9, wands: 10, paralysis: 9, breath: 12, spells: 11 },
    }
  },
  {
    className: 'Dwarf',
    levels: {
      1: { death: 8, wands: 9, paralysis: 10, breath: 13, spells: 12 },
      4: { death: 7, wands: 8, paralysis: 9, breath: 12, spells: 11 },
      7: { death: 6, wands: 7, paralysis: 8, breath: 11, spells: 10 },
      10: { death: 5, wands: 6, paralysis: 7, breath: 10, spells: 9 },
    }
  },
  {
    className: 'Elf',
    levels: {
      1: { death: 12, wands: 13, paralysis: 13, breath: 15, spells: 15 },
      4: { death: 10, wands: 11, paralysis: 11, breath: 13, spells: 12 },
      7: { death: 8, wands: 9, paralysis: 9, breath: 10, spells: 10 },
      10: { death: 6, wands: 7, paralysis: 8, breath: 8, spells: 8 },
    }
  },
  {
    className: 'Halfling',
    levels: {
      1: { death: 8, wands: 9, paralysis: 10, breath: 13, spells: 12 },
      4: { death: 7, wands: 8, paralysis: 9, breath: 12, spells: 11 },
      7: { death: 6, wands: 7, paralysis: 8, breath: 11, spells: 10 },
    }
  }
];

export function getSavingThrowForClass(className: string, level: number): SavingThrows | undefined {
  const classData = OSE_SAVING_THROWS.find(c => c.className === className);
  if (!classData) return undefined;

  // Find the highest level threshold that's <= character level
  const levels = Object.keys(classData.levels)
    .map(Number)
    .sort((a, b) => b - a);

  for (const lvl of levels) {
    if (level >= lvl) {
      return classData.levels[lvl];
    }
  }

  return classData.levels[1];
}
