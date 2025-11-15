import type { CharacterRace } from '@/types/character';

export const stoneGiant: CharacterRace = {
  id: 'stone-giant',
  name: 'Stone Giant',
  description: 'Strong and reclusive, stone giants wander the mountain heights in nomadic tribes.',
  traits: ['Natural Athlete', "Stone's Endurance", 'Powerful Build', 'Mountain Born'],
  abilityScoreIncrease: { strength: 2, constitution: 1 },
  speed: 30,
  languages: ['Common', 'Giant'],
  backgroundImage: '/images/races/base/stonegiant-class-card-background.png',
  subraces: [],
};
