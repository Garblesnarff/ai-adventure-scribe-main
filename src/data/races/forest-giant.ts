import type { CharacterRace } from '@/types/character';

export const forestGiant: CharacterRace = {
  id: 'forest-giant',
  name: 'Forest Giant',
  description: 'Reclusive forest guardians who prefer to remain hidden among their woodlands.',
  traits: ['Forest Magic', 'Hidden Step', 'Powerful Build', 'Speech of Beast and Leaf'],
  abilityScoreIncrease: { wisdom: 2, strength: 1 },
  speed: 30,
  languages: ['Common', 'Elvish', 'Giant'],
  backgroundImage: '/images/races/base/forestgiant-class-card-background.png',
  subraces: [],
};
