import type { CharacterRace } from '@/types/character';

export const ravenfolk: CharacterRace = {
  id: 'ravenfolk',
  name: 'Ravenfolk',
  description: 'Feathered folk who lost their wings long ago now live as cunning mimics.',
  traits: ['Expert Forgery', 'Raven Training', 'Mimicry'],
  abilityScoreIncrease: { dexterity: 2, wisdom: 1 },
  speed: 30,
  languages: ['Common', 'Auran'],
  backgroundImage: '/images/races/base/ravenfolk-class-card-background.png',
  subraces: [],
};
