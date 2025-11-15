import type { CharacterBackground } from '@/types/character';

/**
 * Standard D&D 5E backgrounds with their features and proficiencies
 */
export const backgrounds: CharacterBackground[] = [
  {
    id: 'acolyte',
    name: 'Acolyte',
    description:
      'You have spent your life in service to a temple, learning sacred rites and providing sacrifices to the gods.',
    skillProficiencies: ['Insight', 'Religion'],
    toolProficiencies: [],
    languages: 2,
    equipment: [
      'A holy symbol',
      'Prayer book or prayer wheel',
      '5 sticks of incense',
      'Vestments',
      'Common clothes',
      '15 gp',
    ],
    feature: {
      name: 'Shelter of the Faithful',
      description:
        'As an acolyte, you command the respect of those who share your faith, and you can perform religious ceremonies.',
    },
    suggestedPersonalityTraits: [
      "I idolize a particular hero of my faith, and constantly refer to that person's deeds and example.",
      'I can find common ground between the fiercest enemies, especially if rumbling in the background are rumors of threats to the world.',
    ],
    suggestedIdeals: [
      'My devotion to my faith is tempered by a strong sense of right and wrong, and every injustice causes me to clash with the wrongdoers.',
    ],
    suggestedBonds: [
      'I owe my life to the priest who took me in when my parents were killed by heretics.',
    ],
    suggestedFlaws: ['I am inflexible in my thinking.'],
  },
  {
    id: 'criminal',
    name: 'Criminal',
    description: 'You have a history of breaking the law and surviving by your wits and skills.',
    skillProficiencies: ['Deception', 'Stealth'],
    toolProficiencies: ["Thieves' tools", 'One type of gaming set'],
    languages: 0,
    equipment: ['A crowbar', 'Dark common clothes with a hood', '15 gp'],
    feature: {
      name: 'Criminal Contact',
      description:
        'You have a reliable and trustworthy contact who acts as your liaison to a network of criminals.',
    },
    suggestedPersonalityTraits: [
      "I don't pay attention to the laws of the land in order to avoid drawing unwanted attention to myself.",
      'I always have a plan for what to do when things go wrong.',
    ],
    suggestedIdeals: ["Gold is the only real measure of a person's worth."],
    suggestedBonds: ["I'm loyal to my captain first, everyone else second, no exceptions."],
    suggestedFlaws: [
      "When I see something valuable, I can't think about anything but how to steal it.",
    ],
  },
  {
    id: 'noble',
    name: 'Noble',
    description:
      'You understand wealth, power, and privilege. You carry a noble title and your family owns land.',
    skillProficiencies: ['History', 'Persuasion'],
    toolProficiencies: ['One type of gaming set'],
    languages: 1,
    equipment: ['Fine clothes', 'Signet ring', 'Scroll of pedigree', '25 gp'],
    feature: {
      name: 'Position of Privilege',
      description: 'Thanks to your noble birth, people are inclined to think the best of you.',
    },
    suggestedPersonalityTraits: [
      'My eloquent flattery makes everyone important person feel like the center of the universe.',
      'I am a member of an aristocratic family, and under the laws of the kingdom I possess a title.',
    ],
    suggestedIdeals: [
      'My family, my class, my home — these things must be protected against all threats.',
    ],
    suggestedBonds: ['I have a family crest tattooed on my arm.'],
    suggestedFlaws: ['I secretly believe that everyone is beneath me.'],
  },
  {
    id: 'sage',
    name: 'Sage',
    description:
      'You spent years learning the lore of the multiverse, studying ancient manuscripts and theories.',
    skillProficiencies: ['Arcana', 'History'],
    toolProficiencies: [],
    languages: 2,
    equipment: [
      'Bottle of black ink',
      'Quill',
      'Small knife',
      'Letter from dead colleague',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'Researcher',
      description:
        'When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it.',
    },
    suggestedPersonalityTraits: [
      "I'm convinced that people are always trying to steal my secrets.",
      "I've been searching my whole life for the answer to a certain question.",
    ],
    suggestedIdeals: ['Knowledge. The path to power and self-improvement is through knowledge.'],
    suggestedBonds: ['All that I have I share with anyone in need for the greater good.'],
    suggestedFlaws: ["I speak in riddles and use terms others don't understand."],
  },
  {
    id: 'guild-artisan',
    name: 'Guild Artisan',
    description:
      "You are a member of an artisan's guild, skilled in a particular field and closely associated with other artisans.",
    skillProficiencies: ['Insight', 'Persuasion'],
    toolProficiencies: ["One type of artisan's tools"],
    languages: 1,
    equipment: [
      "Set of artisan's tools",
      'Letter of introduction from your guild',
      "Traveler's clothes",
      '15 gp',
    ],
    feature: {
      name: 'Guild Membership',
      description:
        'As an established and respected member of a guild, you can rely on certain benefits that membership provides.',
    },
    suggestedPersonalityTraits: [
      "I believe that anything worth doing is worth doing right. I can't help it—I'm a perfectionist.",
      "I'm a snob who looks down on those who can't appreciate fine art.",
    ],
    suggestedIdeals: [
      'Community. It is the duty of all civilized people to strengthen the bonds of community and the security of civilization.',
    ],
    suggestedBonds: [
      'The workshop where I learned my trade is the most important place in the world to me.',
    ],
    suggestedFlaws: ["I'll do anything to get my hands on something rare or priceless."],
  },
  {
    id: 'hermit',
    name: 'Hermit',
    description:
      'You lived in seclusion for a formative part of your life, finding quiet contemplation and perhaps the answers you sought.',
    skillProficiencies: ['Medicine', 'Religion'],
    toolProficiencies: ['Herbalism kit'],
    languages: 1,
    equipment: [
      'Herbalism kit',
      'Scroll case with spiritual writings',
      'Winter blanket',
      "Traveler's clothes",
      '5 gp',
    ],
    feature: {
      name: 'Discovery',
      description:
        'The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery.',
    },
    suggestedPersonalityTraits: [
      "I've been isolated for so long that I rarely speak, preferring gestures and the occasional grunt.",
      'I am utterly serene, even in the face of disaster.',
    ],
    suggestedIdeals: ["Self-Knowledge. If you know yourself, there's nothing left to know."],
    suggestedBonds: [
      'My isolation gave me great insight into a great evil that only I can destroy.',
    ],
    suggestedFlaws: [
      'I harbor dark, bloodthirsty thoughts that my isolation and meditation failed to quell.',
    ],
  },
  {
    id: 'entertainer',
    name: 'Entertainer',
    description:
      'You thrive in front of an audience, knowing how to entrance them, entertain them, and even inspire them.',
    skillProficiencies: ['Acrobatics', 'Performance'],
    toolProficiencies: ['Disguise kit', 'One type of musical instrument'],
    languages: 0,
    equipment: [
      'Musical instrument of your choice',
      'Costume',
      'Disguise kit',
      "Traveler's clothes",
      '15 gp',
    ],
    feature: {
      name: 'By Popular Demand',
      description:
        "You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble's court.",
    },
    suggestedPersonalityTraits: [
      'I know a story relevant to almost every situation.',
      'Whenever I come to a new place, I collect local rumors and spread gossip.',
    ],
    suggestedIdeals: ['Beauty. When I perform, I make the world better than it was.'],
    suggestedBonds: [
      'My instrument is my most treasured possession, and it reminds me of someone I love.',
    ],
    suggestedFlaws: ['I’ll do anything to win fame and renown.'],
  },
  {
    id: 'folk-hero',
    name: 'Folk Hero',
    description:
      'You come from a humble social rank, but you are destined for so much more. Already the people of your home village regard you as their champion.',
    skillProficiencies: ['Animal Handling', 'Survival'],
    toolProficiencies: ["One type of artisan's tools", 'Vehicles (land)'],
    languages: 0,
    equipment: [
      "Set of artisan's tools",
      'Shovel',
      "Set of artisan's clothes",
      'Belt pouch',
      '10 gp',
    ],
    feature: {
      name: 'Rustic Hospitality',
      description:
        'Since you come from the ranks of the common folk, you fit in among them with ease.',
    },
    suggestedPersonalityTraits: [
      'I judge people by their actions, not their words.',
      "If someone is in trouble, I'm always ready to lend help.",
    ],
    suggestedIdeals: ['Respect. People deserve to be treated with dignity and respect.'],
    suggestedBonds: ['I worked the land, I love the land, and I will protect the land.'],
    suggestedFlaws: ['The tyrant who rules my land will stop at nothing to see me killed.'],
  },
  {
    id: 'soldier',
    name: 'Soldier',
    description:
      'War has been your life for as long as you care to remember. You trained as a youth, studied the use of weapons and armor.',
    skillProficiencies: ['Athletics', 'Intimidation'],
    toolProficiencies: ['One type of gaming set', 'Vehicles (land)'],
    languages: 0,
    equipment: [
      'Insignia of rank',
      'Trophy from fallen enemy',
      'Deck of cards',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: 'Military Rank',
      description:
        'You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence.',
    },
    suggestedPersonalityTraits: [
      'I can stare down a hell hound without flinching.',
      'I enjoy being strong and like breaking things.',
    ],
    suggestedIdeals: ['Greater Good. Our lot is to lay down our lives in defense of others.'],
    suggestedBonds: [
      'I’ll never forget the crushing defeat my company suffered or the enemies who dealt it.',
    ],
    suggestedFlaws: [
      'I made a terrible mistake in combat that cost many lives—and I would do anything to keep that mistake secret.',
    ],
  },
  {
    id: 'outlander',
    name: 'Outlander',
    description:
      'You grew up in the wilds, far from civilization and the comforts of town and technology.',
    skillProficiencies: ['Athletics', 'Survival'],
    toolProficiencies: ['One type of musical instrument'],
    languages: 1,
    equipment: ['Staff', 'Hunting trap', "Traveler's clothes", 'Belt pouch', '10 gp'],
    feature: {
      name: 'Wanderer',
      description:
        'You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you.',
    },
    suggestedPersonalityTraits: [
      "I've watched so many people come and go that I've learned not to get too attached.",
      'I feel far more comfortable around animals than people.',
    ],
    suggestedIdeals: ['Life is like the seasons, in constant change, and we must change with it.'],
    suggestedBonds: [
      'My family, clan, or tribe is the most important thing in my life, even when they are far from me.',
    ],
    suggestedFlaws: ['I am too enamored of ale, wine, and other intoxicants.'],
  },
  {
    id: 'sailor',
    name: 'Sailor',
    description:
      'You sailed on a seagoing vessel for years. In that time, you faced down mighty storms, monsters of the deep, and those who wanted to sink your craft.',
    skillProficiencies: ['Athletics', 'Perception'],
    toolProficiencies: ["Navigator's tools", 'Vehicles (water)'],
    languages: 0,
    equipment: [
      'Belaying pin (club)',
      '50 feet of silk rope',
      'Lucky charm',
      'Common clothes',
      '10 gp',
    ],
    feature: {
      name: "Ship's Passage",
      description:
        'When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions.',
    },
    suggestedPersonalityTraits: [
      'My friends know they can rely on me, no matter what.',
      'I work hard so that I can play hard when the work is done.',
    ],
    suggestedIdeals: ['Freedom. The sea is freedom—the freedom to go anywhere and do anything.'],
    suggestedBonds: ["I'm loyal to my captain first, everything else second."],
    suggestedFlaws: ["I can't help but pocket loose coins and other trinkets I come across."],
  },
  {
    id: 'urchin',
    name: 'Urchin',
    description:
      'You grew up on the streets alone, orphaned, and poor. You had no one to watch over you or provide for you, so you learned to provide for yourself.',
    skillProficiencies: ['Sleight of Hand', 'Stealth'],
    toolProficiencies: ['Disguise kit', "Thieves' tools"],
    languages: 0,
    equipment: ['Small knife', 'Map of your home city', 'Pet mouse', 'Common clothes', '10 gp'],
    feature: {
      name: 'City Secrets',
      description:
        'You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss.',
    },
    suggestedPersonalityTraits: [
      'I hide scraps of food and trinkets away in my pockets.',
      'I ask a lot of questions.',
    ],
    suggestedIdeals: [
      'Community. We have to take care of each other, because no one else is going to do it.',
    ],
    suggestedBonds: ['I owe my survival to another urchin who taught me to live on the streets.'],
    suggestedFlaws: [
      "Gold seems like a lot of money to me, and I'll do just about anything for more of it.",
    ],
  },
];
