export const startingGoldByClass: Record<
  string,
  { dice: string; multiplier: number; average: number }
> = {
  barbarian: { dice: '2d4', multiplier: 10, average: 50 },
  bard: { dice: '5d4', multiplier: 10, average: 125 },
  cleric: { dice: '5d4', multiplier: 10, average: 125 },
  druid: { dice: '2d4', multiplier: 10, average: 50 },
  fighter: { dice: '5d4', multiplier: 10, average: 125 },
  monk: { dice: '5d4', multiplier: 1, average: 12.5 },
  paladin: { dice: '5d4', multiplier: 10, average: 125 },
  ranger: { dice: '5d4', multiplier: 10, average: 125 },
  rogue: { dice: '4d4', multiplier: 10, average: 100 },
  sorcerer: { dice: '3d4', multiplier: 10, average: 75 },
  warlock: { dice: '4d4', multiplier: 10, average: 100 },
  wizard: { dice: '4d4', multiplier: 10, average: 100 },
};
