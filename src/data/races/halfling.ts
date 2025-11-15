import type { CharacterRace } from '@/types/character';

import { getHeightWeightRange } from '@/data/appearance/physicalTraits';

const ranges = getHeightWeightRange('halfling');
const heightRange: [number, number] = ranges
  ? ([...ranges.heightRange] as [number, number])
  : [33, 39];
const weightRange: [number, number] = ranges
  ? ([...ranges.weightRange] as [number, number])
  : [37, 43];

export const halfling: CharacterRace = {
  id: 'halfling',
  name: 'Halfling',
  description:
    'The diminutive halflings survive in a world full of larger creatures by avoiding notice or, barring that, avoiding offense.',
  traits: ['Lucky', 'Brave', 'Halfling Nimbleness'],
  abilityScoreIncrease: { dexterity: 2 },
  speed: 25,
  languages: ['Common', 'Halfling'],
  heightRange,
  weightRange,
  backgroundImage: '/images/races/base/halfling-class-card-background.png',
  subraces: [
    {
      id: 'lightfoot-halfling',
      name: 'Lightfoot Halfling',
      description: 'Naturally stealthy and adept at hiding.',
      backgroundImage: '/images/races/subraces/lightfoot-halfling-sub-race-card-background.png',
      abilityScoreIncrease: { charisma: 1 },
      traits: ['Naturally Stealthy'],
    },
    {
      id: 'stout-halfling',
      name: 'Stout Halfling',
      description: 'Hardier than other halflings, with a resistance to poison.',
      backgroundImage: '/images/races/subraces/stout-halfling-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1 },
      traits: ['Stout Resilience'],
    },
  ],
};
