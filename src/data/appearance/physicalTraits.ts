type Dice = {
  count: number;
  sides: number;
};

interface HeightWeightDice {
  baseHeightInches: number;
  heightModifier: Dice;
  baseWeightPounds: number;
  weightModifierDice: Dice;
  weightMultiplierDice?: Dice; // Defaults to height modifier if omitted
}

interface HeightWeightRange {
  heightRange: [number, number];
  weightRange: [number, number];
}

const RACE_DICE: Record<string, HeightWeightDice> = {
  dwarf: {
    baseHeightInches: 48,
    heightModifier: { count: 2, sides: 4 },
    baseWeightPounds: 150,
    weightModifierDice: { count: 2, sides: 6 },
  },
  elf: {
    baseHeightInches: 54,
    heightModifier: { count: 2, sides: 10 },
    baseWeightPounds: 90,
    weightModifierDice: { count: 1, sides: 4 },
    weightMultiplierDice: { count: 2, sides: 10 },
  },
  halfling: {
    baseHeightInches: 31,
    heightModifier: { count: 2, sides: 4 },
    baseWeightPounds: 35,
    weightModifierDice: { count: 2, sides: 4 },
    weightMultiplierDice: { count: 1, sides: 1 },
  },
  human: {
    baseHeightInches: 56,
    heightModifier: { count: 2, sides: 10 },
    baseWeightPounds: 110,
    weightModifierDice: { count: 2, sides: 4 },
    weightMultiplierDice: { count: 2, sides: 10 },
  },
  dragonborn: {
    baseHeightInches: 66,
    heightModifier: { count: 2, sides: 8 },
    baseWeightPounds: 175,
    weightModifierDice: { count: 2, sides: 6 },
    weightMultiplierDice: { count: 2, sides: 8 },
  },
  gnome: {
    baseHeightInches: 35,
    heightModifier: { count: 2, sides: 4 },
    baseWeightPounds: 35,
    weightModifierDice: { count: 2, sides: 4 },
    weightMultiplierDice: { count: 1, sides: 1 },
  },
  'half-elf': {
    baseHeightInches: 57,
    heightModifier: { count: 2, sides: 8 },
    baseWeightPounds: 110,
    weightModifierDice: { count: 2, sides: 4 },
    weightMultiplierDice: { count: 2, sides: 8 },
  },
  'half-orc': {
    baseHeightInches: 58,
    heightModifier: { count: 2, sides: 10 },
    baseWeightPounds: 140,
    weightModifierDice: { count: 2, sides: 6 },
    weightMultiplierDice: { count: 2, sides: 10 },
  },
  tiefling: {
    baseHeightInches: 57,
    heightModifier: { count: 2, sides: 8 },
    baseWeightPounds: 110,
    weightModifierDice: { count: 2, sides: 4 },
    weightMultiplierDice: { count: 2, sides: 8 },
  },
};

export function calculateRange(diceConfig: HeightWeightDice): HeightWeightRange {
  const {
    baseHeightInches,
    heightModifier,
    baseWeightPounds,
    weightModifierDice,
    weightMultiplierDice,
  } = diceConfig;
  const heightModifierMin = heightModifier.count;
  const heightModifierMax = heightModifier.count * heightModifier.sides;

  const minHeight = baseHeightInches + heightModifierMin;
  const maxHeight = baseHeightInches + heightModifierMax;

  const multiplierDice = weightMultiplierDice ?? heightModifier;
  const weightModifierMin = weightModifierDice.count;
  const weightModifierMax = weightModifierDice.count * weightModifierDice.sides;
  const multiplierMin = multiplierDice.count;
  const multiplierMax = multiplierDice.count * multiplierDice.sides;

  const minWeight = baseWeightPounds + weightModifierMin * multiplierMin;
  const maxWeight = baseWeightPounds + weightModifierMax * multiplierMax;

  return {
    heightRange: [minHeight, maxHeight],
    weightRange: [minWeight, maxWeight],
  };
}

export const RACE_HEIGHT_WEIGHT: Record<string, HeightWeightRange> = Object.fromEntries(
  Object.entries(RACE_DICE).map(([raceId, dice]) => [raceId, calculateRange(dice)]),
);

export function getHeightWeightRange(raceId?: string): HeightWeightRange | undefined {
  if (!raceId) return undefined;
  const normalized = raceId.toLowerCase();
  const lookup = RACE_HEIGHT_WEIGHT[normalized];
  if (lookup) return lookup;
  // Try singular/plural adjustments
  const normalizedWithHyphen = normalized.replace(/\s+/g, '-');
  return RACE_HEIGHT_WEIGHT[normalizedWithHyphen];
}
