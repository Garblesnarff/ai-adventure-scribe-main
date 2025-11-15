import type { CharacterRace } from '@/types/character';

import { getHeightWeightRange } from '@/data/appearance/physicalTraits';

const ranges = getHeightWeightRange('human');
const heightRange: [number, number] = ranges
  ? ([...ranges.heightRange] as [number, number])
  : [56, 76];
const weightRange: [number, number] = ranges
  ? ([...ranges.weightRange] as [number, number])
  : [114, 270];

export const human: CharacterRace = {
  id: 'human',
  name: 'Human',
  description: 'Humans are the most adaptable and ambitious people among the common races.',
  traits: ['Versatile'],
  abilityScoreIncrease: {},
  speed: 30,
  languages: ['Common'],
  heightRange,
  weightRange,
  backgroundImage: '/images/races/base/human-class-card-background.png',
  subraces: [
    {
      id: 'standard-human',
      name: 'Standard Human',
      description: 'The most adaptable and ambitious people among the common races.',
      backgroundImage: '/images/races/subraces/standard-human-human-sub-race-card-background.png',
      abilityScoreIncrease: {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        charisma: 1,
      },
      traits: ['Versatile'],
      languages: ['Choice of One'],
    },
    {
      id: 'variant-human',
      name: 'Variant Human',
      description: 'A more customizable version of human with a free feat at 1st level.',
      backgroundImage: '/images/races/subraces/variant-human-human-sub-race-card-background.png',
      abilityScoreIncrease: {},
      traits: ['Skills', 'Feat', 'Extra Language or Tool Proficiency'],
      languages: ['Choice of One or Tool Proficiency'],
      weaponProficiencies: [],
      armorProficiencies: [],
    },
    {
      id: 'custom-lineage',
      name: 'Custom Lineage',
      description: 'A customizable lineage representing non-human ancestry or unique background.',
      backgroundImage: '/images/races/subraces/custom-lineage-human-sub-race-card-background.png',
      abilityScoreIncrease: {},
      traits: ['Variable Size', 'Feat', 'Darkvision or Skill Proficiency'],
      languages: ['Common', 'Choice of One'],
      speed: 30,
    },
  ],
};
