import { CharacterBackground } from '@/types/character';

/**
 * Standard D&D 5E backgrounds with their features and proficiencies
 */
export const backgrounds: CharacterBackground[] = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    description: 'You have spent your life in service to a temple, learning sacred rites and providing sacrifices to the gods.',
    skillProficiencies: ['Insight', 'Religion'],
    toolProficiencies: [],
    languages: 2,
    equipment: [
      'A holy symbol',
      'Prayer book or prayer wheel',
      '5 sticks of incense',
      'Vestments',
      'Common clothes',
      '15 gp'
    ],
    feature: {
      name: 'Shelter of the Faithful',
      description: 'As an acolyte, you command the respect of those who share your faith, and you can perform religious ceremonies.'
    }
  },
  {
    id: 'criminal',
    name: 'Criminal',
    description: 'You have a history of breaking the law and surviving by your wits and skills.',
    skillProficiencies: ['Deception', 'Stealth'],
    toolProficiencies: ["Thieves' tools", 'One type of gaming set'],
    languages: 0,
    equipment: [
      'A crowbar',
      'Dark common clothes with a hood',
      '15 gp'
    ],
    feature: {
      name: 'Criminal Contact',
      description: 'You have a reliable and trustworthy contact who acts as your liaison to a network of criminals.'
    }
  },
  {
    id: 'noble',
    name: 'Noble',
    description: 'You understand wealth, power, and privilege. You carry a noble title and your family owns land.',
    skillProficiencies: ['History', 'Persuasion'],
    toolProficiencies: ['One type of gaming set'],
    languages: 1,
    equipment: [
      'Fine clothes',
      'Signet ring',
      'Scroll of pedigree',
      '25 gp'
    ],
    feature: {
      name: 'Position of Privilege',
      description: 'Thanks to your noble birth, people are inclined to think the best of you.'
    }
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'You spent years learning the lore of the multiverse, studying ancient manuscripts and theories.',
    skillProficiencies: ['Arcana', 'History'],
    toolProficiencies: [],
    languages: 2,
    equipment: [
      'Bottle of black ink',
      'Quill',
      'Small knife',
      'Letter from dead colleague',
      'Common clothes',
      '10 gp'
    ],
    feature: {
      name: 'Researcher',
      description: 'When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it.'
    }
  }
];