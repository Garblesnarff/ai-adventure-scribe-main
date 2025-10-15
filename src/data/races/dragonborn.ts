import type { CharacterRace } from '@/types/character';

export const dragonborn: CharacterRace = {
  id: 'dragonborn',
  name: 'Dragonborn',
  description:
    'Dragonborn look very much like dragons standing erect in humanoid form, though they lack wings or a tail.',
  traits: ['Draconic Ancestry', 'Breath Weapon', 'Damage Resistance'],
  abilityScoreIncrease: { strength: 2, charisma: 1 },
  speed: 30,
  languages: ['Common', 'Draconic'],
  backgroundImage: '/images/races/base/dragonborn-class-card-background.png',
  subraces: []
};
