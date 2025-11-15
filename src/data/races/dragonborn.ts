import type { CharacterRace } from '@/types/character';

import { getHeightWeightRange } from '@/data/appearance/physicalTraits';

const ranges = getHeightWeightRange('dragonborn');
const heightRange: [number, number] = ranges
  ? ([...ranges.heightRange] as [number, number])
  : [68, 82];
const weightRange: [number, number] = ranges
  ? ([...ranges.weightRange] as [number, number])
  : [179, 367];

export const dragonborn: CharacterRace = {
  id: 'dragonborn',
  name: 'Dragonborn',
  description:
    'Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail.',
  traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
  abilityScoreIncrease: { strength: 2, charisma: 1 },
  speed: 30,
  languages: ['Common', 'Draconic'],
  heightRange,
  weightRange,
  backgroundImage: '/images/races/base/dragonborn-class-card-background.png',
  subraces: [],
};
