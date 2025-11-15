import type { CharacterRace } from '@/types/character';

export const serpentfolk: CharacterRace = {
  id: 'serpentfolk',
  name: 'Serpentfolk',
  description:
    'The serpentine serpentfolk are utterly without emotion. They deal in absolutes and judge others by their strength and cunning.',
  traits: ['Darkvision', 'Innate Spellcasting', 'Magic Resistance', 'Poison Immunity'],
  backgroundImage: '/images/races/base/serpentfolk-class-card-background.png',
  abilityScoreIncrease: { charisma: 2, intelligence: 1 },
  speed: 30,
  languages: ['Common', 'Abyssal', 'Draconic'],
  subraces: [],
};
