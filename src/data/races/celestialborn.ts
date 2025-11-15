import type { CharacterRace } from '@/types/character';

export const celestialborn: CharacterRace = {
  id: 'celestialborn',
  name: 'Celestialborn',
  description: 'Humanoids touched by celestial power.',
  traits: ['Celestial Revelation', 'Healing Hands', 'Light Cantrip'],
  abilityScoreIncrease: { charisma: 2 },
  speed: 30,
  languages: ['Common', 'Celestial'],
  backgroundImage: '/images/races/base/celestialborn-class-card-background.png',
  subraces: [
    {
      id: 'guardian-celestialborn',
      name: 'Guardian Celestialborn',
      description: 'Can manifest radiant, angelic wings for a short time.',
      abilityScoreIncrease: { wisdom: 1 },
      traits: ['Radiant Soul'],
    },
    {
      id: 'radiant-celestialborn',
      name: 'Radiant Celestialborn',
      description: 'Can unleash a damaging aura of radiant light.',
      abilityScoreIncrease: { constitution: 1 },
      traits: ['Radiant Consumption'],
    },
    {
      id: 'shadow-celestialborn',
      name: 'Shadow Celestialborn',
      description: 'Can cause enemies to become frightened.',
      abilityScoreIncrease: { strength: 1 },
      traits: ['Necrotic Shroud'],
    },
  ],
};
