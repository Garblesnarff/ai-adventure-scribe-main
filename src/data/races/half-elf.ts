import type { CharacterRace } from '@/types/character';

export const halfElf: CharacterRace = {
  id: 'half-elf',
  name: 'Half-Elf',
  description: 'Half-elves combine what some say are the best qualities of their elf and human parents.',
  traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility'],
  abilityScoreIncrease: { charisma: 2 },
  speed: 30,
  languages: ['Common', 'Elvish', 'One extra language of your choice'],
  backgroundImage: '/images/races/base/halfelf-class-card-background.png',
  subraces: []
};
