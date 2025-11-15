import type { CharacterRace } from '@/types/character';

import { getHeightWeightRange } from '@/data/appearance/physicalTraits';

const ranges = getHeightWeightRange('gnome');
const heightRange: [number, number] = ranges
  ? ([...ranges.heightRange] as [number, number])
  : [37, 43];
const weightRange: [number, number] = ranges
  ? ([...ranges.weightRange] as [number, number])
  : [37, 43];

export const gnome: CharacterRace = {
  id: 'gnome',
  name: 'Gnome',
  description:
    'Gnomes are whimsical, inventive creatures known for their curiosity and love of gadgets.',
  traits: ['Darkvision', 'Gnome Cunning'],
  abilityScoreIncrease: { intelligence: 2 },
  speed: 25,
  languages: ['Common', 'Gnomish'],
  heightRange,
  weightRange,
  backgroundImage: '/images/races/base/gnome-class-card-background.png',
  subraces: [
    {
      id: 'forest-gnome',
      name: 'Forest Gnome',
      description: 'Have a natural knack for illusion and communicating with small beasts.',
      backgroundImage: '/images/races/subraces/forest-gnome-gnome-sub-race-card-background.png',
      abilityScoreIncrease: { dexterity: 1 },
      traits: ['Natural Illusionist', 'Speak with Small Beasts'],
      cantrips: ['minor-illusion'],
    },
    {
      id: 'rock-gnome',
      name: 'Rock Gnome',
      description: 'Natural tinkerers and inventors with expertise in clockwork devices.',
      backgroundImage: '/images/races/subraces/rock-gnome-gnome-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1 },
      traits: ["Tinker's Lore", 'Tinker'],
    },
    {
      id: 'deep-gnome',
      name: 'Deep Gnome (Svirfneblin)',
      description: 'Dwellers of the Deep Caverns, with superior darkvision and natural stealth.',
      backgroundImage: '/images/races/subraces/deep-gnome-gnome-sub-race-card-background.png',
      abilityScoreIncrease: { dexterity: 2 },
      traits: ['Stone Camouflage', 'Gnome Cunning'],
    },
  ],
};
