import type { CharacterRace } from '@/types/character';

import { getHeightWeightRange } from '@/data/appearance/physicalTraits';

const ranges = getHeightWeightRange('tiefling');
const heightRange: [number, number] = ranges
  ? ([...ranges.heightRange] as [number, number])
  : [59, 73];
const weightRange: [number, number] = ranges
  ? ([...ranges.weightRange] as [number, number])
  : [114, 238];

export const tiefling: CharacterRace = {
  id: 'tiefling',
  name: 'Tiefling',
  description: 'Tieflings are the infernal bloodline of humans and fiends.',
  traits: ['Hellish Resistance', 'Infernal Legacy'],
  abilityScoreIncrease: { intelligence: 1, charisma: 2 },
  speed: 30,
  languages: ['Common', 'Infernal'],
  heightRange,
  weightRange,
  backgroundImage: '/images/races/base/tiefling-class-card-background.png',
  subraces: [
    {
      id: 'standard-tiefling',
      name: 'Standard Tiefling',
      description: "The Player's Handbook version with standard traits.",
      abilityScoreIncrease: {},
      traits: ['Thaumaturgy'],
      cantrips: ['thaumaturgy'],
      spells: ['hellish-rebuke'],
    },
  ],
};
