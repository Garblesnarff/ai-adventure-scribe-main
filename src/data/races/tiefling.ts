import type { CharacterRace } from '@/types/character';

export const tiefling: CharacterRace = {
  id: 'tiefling',
  name: 'Tiefling',
  description: 'Tieflings are the infernal bloodline of humans and fiends.',
  traits: ['Hellish Resistance', 'Infernal Legacy'],
  abilityScoreIncrease: { intelligence: 1, charisma: 2 },
  speed: 30,
  languages: ['Common', 'Infernal'],
  backgroundImage: '/images/races/base/tiefling-class-card-background.png',
  subraces: [
    {
      id: 'standard-tiefling',
      name: 'Standard Tiefling',
      description: "The Player's Handbook version with standard traits.",
      abilityScoreIncrease: {},
      traits: ['Thaumaturgy'],
      cantrips: ['thaumaturgy'],
      spells: ['hellish-rebuke']
    }
  ]
};
