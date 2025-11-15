import { describe, expect, it } from 'vitest';

import { calculateRange, getHeightWeightRange } from './physicalTraits';

describe('physicalTraits height/weight calculations', () => {
  it('computes elf ranges to match PHB min/max', () => {
    const elf = getHeightWeightRange('elf');
    expect(elf?.heightRange).toEqual([56, 74]);
    expect(elf?.weightRange).toEqual([92, 170]);
  });

  it('computes dwarf ranges to match PHB min/max', () => {
    const dwarf = getHeightWeightRange('dwarf');
    expect(dwarf?.heightRange).toEqual([50, 56]);
    expect(dwarf?.weightRange).toEqual([154, 246]);
  });

  it('computes dragonborn ranges to match PHB min/max', () => {
    const dragonborn = getHeightWeightRange('dragonborn');
    expect(dragonborn?.heightRange).toEqual([68, 82]);
    expect(dragonborn?.weightRange).toEqual([179, 367]);
  });

  it('supports manual dice definitions', () => {
    const custom = calculateRange({
      baseHeightInches: 40,
      heightModifier: { count: 1, sides: 4 },
      baseWeightPounds: 60,
      weightModifierDice: { count: 1, sides: 4 },
      weightMultiplierDice: { count: 1, sides: 6 },
    });
    expect(custom.heightRange).toEqual([41, 44]);
    expect(custom.weightRange).toEqual([61, 84]);
  });
});
