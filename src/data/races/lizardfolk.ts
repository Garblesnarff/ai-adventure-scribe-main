import type { CharacterRace } from '@/types/character';

export const lizardfolk: CharacterRace = {
  id: 'lizardfolk',
  name: 'Lizardfolk',
  description:
    'The lizardfolk possess an alien and inscrutable mindset, their desires and thoughts driven by a different logic.',
  traits: [
    'Bite',
    'Cunning Artisan',
    'Hold Breath',
    "Hunter's Lore",
    'Natural Armor',
    'Hungry Jaws',
  ],
  abilityScoreIncrease: { constitution: 2, wisdom: 1 },
  speed: 30,
  languages: ['Common', 'Draconic'],
  backgroundImage: '/images/races/base/lizardfolk-class-card-background.png',
  subraces: [],
};
