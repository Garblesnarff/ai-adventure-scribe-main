import type { CharacterRace } from '@/types/character';

export const elementalborn: CharacterRace = {
  id: 'elementalborn',
  name: 'Elementalborn',
  description: 'Humanoids infused with elemental power.',
  traits: ['Elemental Traits'],
  abilityScoreIncrease: {},
  speed: 30,
  languages: ['Common', 'Primordial'],
  backgroundImage: '/images/races/base/elementalborn-class-card-background.png',
  subraces: [
    {
      id: 'air-elementalborn',
      name: 'Air Elementalborn',
      description: 'Can hold their breath indefinitely and have innate levitation magic.',
      backgroundImage:
        '/images/races/subraces/air-elementalborn-elementalborn-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1, dexterity: 1 },
      traits: ['Unending Breath', 'Mingle with the Wind'],
    },
    {
      id: 'earth-elementalborn',
      name: 'Earth Elementalborn',
      description: 'Possess extra strength and can traverse difficult terrain with ease.',
      backgroundImage:
        '/images/races/subraces/earth-elementalborn-elementalborn-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1, strength: 1 },
      traits: ['Earth Walk', 'Merge with Stone'],
    },
    {
      id: 'fire-elementalborn',
      name: 'Fire Elementalborn',
      description: 'Have a resistance to fire and can produce flames.',
      backgroundImage: '/images/races/subraces/fire-elementalborn-elementalborn-sub-race-card.png',
      abilityScoreIncrease: { constitution: 1, intelligence: 1 },
      traits: ['Darkvision', 'Fire Resistance', 'Reach to the Blaze'],
    },
    {
      id: 'water-elementalborn',
      name: 'Water Elementalborn',
      description: 'Can breathe underwater, have a swim speed, and have a resistance to acid.',
      backgroundImage:
        '/images/races/subraces/water-elementalborn-elementalborn-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1, wisdom: 1 },
      traits: ['Amphibious', 'Swim Speed', 'Call to the Wave'],
    },
  ],
};
