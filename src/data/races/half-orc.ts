import type { CharacterRace } from '@/types/character';

export const halfOrc: CharacterRace = {
  id: 'half-orc',
  name: 'Half-Orc',
  description: 'Half-orcs most often live among orcs. Of the other races, humans are most likely to accept half-orcs.',
  traits: ['Darkvision', 'Relentless Endurance', 'Savage Attacks'],
  abilityScoreIncrease: { strength: 2, constitution: 1 },
  speed: 30,
  languages: ['Common', 'Orc'],
  backgroundImage: '/halforc-class-card-background.png',
  subraces: []
};
