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
    },
    suggestedPersonalityTraits: [
      "I idolize a particular hero of my faith, and constantly refer to that person's deeds and example.",
      "I can find common ground between the fiercest enemies, especially if rumbling in the background are rumors of threats to the world."
    ],
    suggestedIdeals: [
      "My devotion to my faith is tempered by a strong sense of right and wrong, and every injustice causes me to clash with the wrongdoers."
    ],
    suggestedBonds: [
      "I owe my life to the priest who took me in when my parents were killed by heretics."
    ],
    suggestedFlaws: [
      "I am inflexible in my thinking."
    ]
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
    },
    suggestedPersonalityTraits: [
      "I don't pay attention to the laws of the land in order to avoid drawing unwanted attention to myself.",
      "I always have a plan for what to do when things go wrong."
    ],
    suggestedIdeals: [
      "Gold is the only real measure of a person's worth."
    ],
    suggestedBonds: [
      "I'm loyal to my captain first, everyone else second, no exceptions."
    ],
    suggestedFlaws: [
      "When I see something valuable, I can't think about anything but how to steal it."
    ]
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
    },
    suggestedPersonalityTraits: [
      "My eloquent flattery makes everyone important person feel like the center of the universe.",
      "I am a member of an aristocratic family, and under the laws of the kingdom I possess a title."
    ],
    suggestedIdeals: [
      "My family, my class, my home — these things must be protected against all threats."
    ],
    suggestedBonds: [
      "I have a family crest tattooed on my arm."
    ],
    suggestedFlaws: [
      "I secretly believe that everyone is beneath me."
    ]
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
    },
    suggestedPersonalityTraits: [
      "I'm convinced that people are always trying to steal my secrets.",
      "I've been searching my whole life for the answer to a certain question."
    ],
    suggestedIdeals: [
      "Knowledge. The path to power and self-improvement is through knowledge."
    ],
    suggestedBonds: [
      "All that I have I share with anyone in need for the greater good."
    ],
    suggestedFlaws: [
      "I speak in riddles and use terms others don't understand."
    ]
  }
];
