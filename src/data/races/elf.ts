import type { CharacterRace } from '@/types/character';

export const elf: CharacterRace = {
  id: 'elf',
  name: 'Elf',
  description: 'Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.',
  traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
  abilityScoreIncrease: { dexterity: 2 },
  speed: 30,
  languages: ['Common', 'Elvish'],
  backgroundImage: '/elf-class-card-background.png',
  subraces: [
    {
      id: 'high-elf',
      name: 'High Elf',
      description: 'Masters of magic, they know an extra wizard cantrip.',
      backgroundImage: '/high-elf-elf-sub-race-card-background.png',
      abilityScoreIncrease: { intelligence: 1 },
      traits: ['High Elf Cantrip', 'Weapon Training'],
      bonusCantrip: { source: 'wizard', count: 1 }
    },
    {
      id: 'wood-elf',
      name: 'Wood Elf',
      description: 'Stealthy and swift inhabitants of the forest.',
      backgroundImage: '/wood-elf-elf-sub-race-card-background.png',
      abilityScoreIncrease: { wisdom: 1 },
      traits: ['Fleet of Foot', 'Mask of the Wild']
    },
    {
      id: 'drow',
      name: 'Drow (Dark Elf)',
      description: 'Native to the Deep Caverns, with superior darkvision and innate magic, but sunlight sensitivity.',
      backgroundImage: '/drow-elf-sub-race-card-background.png',
      abilityScoreIncrease: { charisma: 1 },
      traits: ['Superior Darkvision', 'Sunlight Sensitivity', 'Drow Magic'],
      cantrips: ['dancing-lights'],
      spells: ['faerie-fire']
    },
    {
      id: 'eladrin',
      name: 'Eladrin',
      description: 'Elves native to the Feywild, who can teleport and whose moods align with the seasons.',
      backgroundImage: '/eladrin-elf-sub-race-card-background.png',
      abilityScoreIncrease: { charisma: 1 },
      traits: ['Fey Step', 'Seasonal Traits']
    },
    {
      id: 'sea-elf',
      name: 'Sea Elf',
      description: 'Adapted for aquatic life, with a swim speed and the ability to breathe underwater.',
      backgroundImage: '/sea-elf-elf-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1 },
      traits: ['Sea Elf Training', 'Child of the Sea']
    },
    {
      id: 'shadar-kai',
      name: 'Shadar-kai',
      description: 'Elves of the Shadow Realm, who are supernaturally resilient and can teleport.',
      backgroundImage: '/shadar-kai-elf-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1 },
      traits: ['Blessing of the Shadow Queen', 'Necrotic Resistance']
    }
  ]
};
