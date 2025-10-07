import type { CharacterRace } from '@/types/character';

export const dwarf: CharacterRace = {
  id: 'dwarf',
  name: 'Dwarf',
  description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.',
  traits: ['Darkvision', 'Dwarven Resilience', 'Tool Proficiency'],
  abilityScoreIncrease: { constitution: 2 },
  speed: 25,
  languages: ['Common', 'Dwarvish'],
  backgroundImage: '/dwarf-class-card-background.png',
  subraces: [
    {
      id: 'hill-dwarf',
      name: 'Hill Dwarf',
      description: 'More resilient and intuitive, with extra hit points.',
      abilityScoreIncrease: { wisdom: 1 },
      traits: ['Dwarven Toughness']
    },
    {
      id: 'mountain-dwarf',
      name: 'Mountain Dwarf',
      description: 'Stronger and more accustomed to rugged life, with armor proficiency.',
      abilityScoreIncrease: { strength: 2 },
      traits: ['Dwarven Armor Training']
    },
    {
      id: 'duergar',
      name: 'Duergar (Gray Dwarf)',
      description: 'A subrace from the Deep Caverns with innate magical abilities, including invisibility.',
      abilityScoreIncrease: { strength: 1, constitution: 1 },
      traits: ['Duergar Magic', 'Duergar Resilience', 'Sunlight Sensitivity']
    }
  ]
};
