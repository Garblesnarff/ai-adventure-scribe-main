import type { CharacterRace } from '@/types/character';

export const dwarf: CharacterRace = {
  id: 'dwarf',
  name: 'Dwarf',
  description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.',
  traits: ['Darkvision', 'Dwarven Resilience', 'Tool Proficiency'],
  abilityScoreIncrease: { constitution: 2 },
  speed: 25,
  languages: ['Common', 'Dwarvish'],
  heightRange: [48, 60],
  weightRange: [130, 170],
  backgroundImage: '/images/races/base/dwarf-class-card-background.png',
  subraces: [
    {
      id: 'hill-dwarf',
      name: 'Hill Dwarf',
      description: 'More resilient and intuitive, with extra hit points.',
      backgroundImage: '/images/races/subraces/hill-dwarf-sub-race-card-background.png',
      abilityScoreIncrease: { wisdom: 1 },
      traits: ['Dwarven Toughness']
    },
    {
      id: 'mountain-dwarf',
      name: 'Mountain Dwarf',
      description: 'Stronger and more accustomed to rugged life, with armor proficiency.',
      backgroundImage: '/images/races/subraces/mountain-dwarf-sub-race-card-background.png',
      abilityScoreIncrease: { strength: 2 },
      traits: ['Dwarven Armor Training']
    },
    {
      id: 'duergar',
      name: 'Duergar (Gray Dwarf)',
      description: 'A subrace from the Deep Caverns with innate magical abilities, including invisibility.',
      backgroundImage: '/images/races/subraces/duergar-dwarf-sub-race-card-background.png',
      abilityScoreIncrease: { strength: 1, constitution: 1 },
      traits: ['Duergar Magic', 'Duergar Resilience', 'Sunlight Sensitivity']
    }
  ]
};
