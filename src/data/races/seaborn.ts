import type { CharacterRace } from '@/types/character';

export const seaborn: CharacterRace = {
  id: 'seaborn',
  name: 'Seaborn',
  description:
    'Guardians of the depths, seaborn have spread throughout the oceans, establishing protectorates.',
  traits: ['Amphibious', 'Control Air and Water', 'Emissary of the Sea', 'Guardians of the Depths'],
  abilityScoreIncrease: { strength: 1, constitution: 1, charisma: 1 },
  speed: 30,
  languages: ['Common', 'Primordial'],
  backgroundImage: '/images/races/base/seaborn-class-card-background.png',
  subraces: [],
};
