import type { CharacterRace } from '@/types/character';

export const astralborn: CharacterRace = {
  id: 'astralborn',
  name: 'Astralborn',
  description: 'Psionic humanoids from the astral realm.',
  traits: ['Psionic Resistance', 'Mental Discipline'],
  abilityScoreIncrease: { intelligence: 2 },
  speed: 30,
  languages: ['Common', 'Astral'],
  backgroundImage: '/images/races/base/astralborn-class-card-background.png',
  subraces: [
    {
      id: 'astral-warrior',
      name: 'Astral Warrior',
      description: 'Fierce warriors with psionic abilities.',
      abilityScoreIncrease: { strength: 1 },
      traits: ['Astral Knowledge', 'Warrior Psionics', 'Precise Strike'],
    },
    {
      id: 'astral-monk',
      name: 'Astral Monk',
      description: 'Disciplined monks with psionic abilities.',
      abilityScoreIncrease: { wisdom: 1 },
      traits: ['Mental Discipline', 'Monk Psionics', 'Psychic Blades'],
    },
  ],
};
