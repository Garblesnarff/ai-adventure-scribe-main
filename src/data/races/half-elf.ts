import type { CharacterRace } from '@/types/character';

import { getHeightWeightRange } from '@/data/appearance/physicalTraits';

const ranges = getHeightWeightRange('half-elf');
const heightRange: [number, number] = ranges
  ? ([...ranges.heightRange] as [number, number])
  : [59, 73];
const weightRange: [number, number] = ranges
  ? ([...ranges.weightRange] as [number, number])
  : [114, 238];

export const halfElf: CharacterRace = {
  id: 'half-elf',
  name: 'Half-Elf',
  description:
    'Half-elves combine what some say are the best qualities of their elf and human parents.',
  traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
  abilityScoreIncrease: { charisma: 2 },
  speed: 30,
  languages: ['Common', 'Elvish', 'One extra language of your choice'],
  heightRange,
  weightRange,
  backgroundImage: '/images/races/base/halfelf-class-card-background.png',
  subraces: [],
};
