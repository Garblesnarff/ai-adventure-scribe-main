import type { CharacterRace } from '@/types/character';

export const gnome: CharacterRace = {
  id: 'gnome',
  name: 'Gnome',
  description: 'Gnomes are whimsical, inventive creatures known for their curiosity and love of gadgets.',
  traits: ['Darkvision', 'Gnome Cunning'],
  abilityScoreIncrease: { intelligence: 2 },
  speed: 25,
  languages: ['Common', 'Gnomish'],
  backgroundImage: '/gnome-class-card-background.png',
  subraces: [
    {
      id: 'forest-gnome',
      name: 'Forest Gnome',
      description: 'Have a natural knack for illusion and communicating with small beasts.',
      backgroundImage: '/forest-gnome-gnome-sub-race-card-background.png',
      abilityScoreIncrease: { dexterity: 1 },
      traits: ['Natural Illusionist', 'Speak with Small Beasts'],
      cantrips: ['minor-illusion']
    },
    {
      id: 'rock-gnome',
      name: 'Rock Gnome',
      description: 'Natural tinkerers and inventors with expertise in clockwork devices.',
      backgroundImage: '/rock-gnome-gnome-sub-race-card-background.png',
      abilityScoreIncrease: { constitution: 1 },
      traits: ["Tinker's Lore", 'Tinker']
    },
    {
      id: 'deep-gnome',
      name: 'Deep Gnome (Svirfneblin)',
      description: 'Dwellers of the Deep Caverns, with superior darkvision and natural stealth.',
      backgroundImage: '/deep-gnome-gnome-sub-race-card-background.png',
      abilityScoreIncrease: { dexterity: 2 },
      traits: ['Stone Camouflage', 'Gnome Cunning']
    }
  ]
};
