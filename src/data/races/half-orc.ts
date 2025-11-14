import type { CharacterRace } from '@/types/character';

import { getHeightWeightRange } from '@/data/appearance/physicalTraits';

const ranges = getHeightWeightRange('half-orc');
const heightRange: [number, number] = ranges
  ? ([...ranges.heightRange] as [number, number])
  : [60, 78];
const weightRange: [number, number] = ranges
  ? ([...ranges.weightRange] as [number, number])
  : [144, 380];

export const halfOrc: CharacterRace = {
  id: 'half-orc',
  name: 'Half-Orc',
  description:
    'Half-orcs most often live among orcs. Of the other races, humans are most likely to accept half-orcs.',
  traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'],
  abilityScoreIncrease: { strength: 2, constitution: 1 },
  speed: 30,
  languages: ['Common', 'Orc'],
  heightRange,
  weightRange,
  backgroundImage: '/images/races/base/halforc-class-card-background.png',
  subraces: [],
};
