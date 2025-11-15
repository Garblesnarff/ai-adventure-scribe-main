import type { CharacterRace } from '@/types/character';

export const catfolk: CharacterRace = {
  id: 'catfolk',
  name: 'Catfolk',
  description:
    'Hailing from a strange and distant land, wandering tabaxi are catlike humanoids driven by curiosity.',
  traits: ['Feline Agility', "Cat's Claws", "Cat's Talents", 'Darkvision'],
  abilityScoreIncrease: { dexterity: 2, charisma: 1 },
  speed: 30,
  languages: ['Common', 'Choice of One'],
  backgroundImage: '/images/races/base/catfolk-class-card-background.png',
  subraces: [],
};
