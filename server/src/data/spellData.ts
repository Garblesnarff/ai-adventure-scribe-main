// Server-side spell data - converted from frontend spellOptions.ts
// This provides comprehensive D&D 5E spell data without requiring database queries

interface Spell {
  id: string;
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  description: string;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  materialComponents?: string;
  concentration: boolean;
  ritual: boolean;
  damage?: boolean;
  attackSave?: string;
  damageEffect?: string;
}

// D&D 5E Cantrips (Level 0 spells)
export const cantrips: Spell[] = [
  {
    id: 'acid-splash',
    name: 'Acid Splash',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Instantaneous',
    description: 'You hurl a bubble of acid. Choose one creature within range, or choose two creatures within range that are within 5 feet of each other. A target must succeed on a Dexterity saving throw or take 1d6 acid damage.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d6'
  },
  {
    id: 'blade-ward',
    name: 'Blade Ward',
    level: 0,
    school: 'Abjuration',
    castingTime: '1 action',
    range: 'Self',
    duration: '1 round',
    description: 'You extend your hand and trace a sigil of warding in the air. Until the end of your next turn, you have resistance against bludgeoning, piercing, and slashing damage dealt by weapon attacks.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false
  },
  {
    id: 'chill-touch',
    name: 'Chill Touch',
    level: 0,
    school: 'Necromancy',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    description: 'You create a ghostly, skeletal hand in the space of a creature within range. Make a ranged spell attack against the creature to assail it with the chill of the grave.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d8'
  },
  {
    id: 'dancing-lights',
    name: 'Dancing Lights',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'You create up to four torch-sized lights within range, making them appear as torches, lanterns, or glowing orbs that hover in the air for the duration.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a bit of phosphorus or wychwood, or a glowworm',
    concentration: true,
    ritual: false
  },
  {
    id: 'druidcraft',
    name: 'Druidcraft',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Instantaneous',
    description: 'Whispering to the spirits of nature, you create one of the following effects within range: You create a tiny, harmless sensory effect that predicts what the weather will be at your location for the next 24 hours.',
    verbal: true,
    somatic: false,
    material: false,
    concentration: false,
    ritual: false
  },
  {
    id: 'eldritch-blast',
    name: 'Eldritch Blast',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    description: 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d10'
  },
  {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    duration: 'Instantaneous',
    description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d10'
  },
  {
    id: 'friends',
    name: 'Friends',
    level: 0,
    school: 'Enchantment',
    castingTime: '1 action',
    range: 'Self',
    duration: 'Concentration, up to 1 minute',
    description: 'For the duration, you have advantage on all Charisma checks directed at one creature of your choice that isn\'t hostile toward you.',
    verbal: false,
    somatic: true,
    material: true,
    materialComponents: 'a small amount of makeup applied to the face as this spell is cast',
    concentration: true,
    ritual: false
  },
  {
    id: 'guidance',
    name: 'Guidance',
    level: 0,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Concentration, up to 1 minute',
    description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: false
  },
  {
    id: 'light',
    name: 'Light',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    duration: '1 hour',
    description: 'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.',
    verbal: true,
    somatic: false,
    material: true,
    materialComponents: 'a firefly or phosphorescent moss',
    concentration: false,
    ritual: false
  },
  {
    id: 'mage-hand',
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: false
  },
  {
    id: 'mending',
    name: 'Mending',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 minute',
    range: 'Touch',
    duration: 'Instantaneous',
    description: 'This spell repairs a single break or tear in an object you touch, such as a broken chain link, two halves of a broken key, a torn cloak, or a leaking wineskin.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'two lodestones',
    concentration: false,
    ritual: false
  },
  {
    id: 'message',
    name: 'Message',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '120 feet',
    duration: '1 round',
    description: 'You point your finger toward a creature within range and whisper a message. The target (and only the target) hears the message and can reply in a whisper that only you can hear.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a short piece of copper wire',
    concentration: false,
    ritual: false
  },
  {
    id: 'minor-illusion',
    name: 'Minor Illusion',
    level: 0,
    school: 'Illusion',
    castingTime: '1 action',
    range: '30 feet',
    duration: '1 minute',
    description: 'You create a sound or an image of an object within range that lasts for the duration. The illusion also ends if you dismiss it as an action or cast this spell again.',
    verbal: false,
    somatic: true,
    material: true,
    materialComponents: 'a bit of fleece',
    concentration: false,
    ritual: false
  },
  {
    id: 'poison-spray',
    name: 'Poison Spray',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '10 feet',
    duration: 'Instantaneous',
    description: 'You extend your hand toward a creature you can see within range and project a puff of noxious gas from your palm. The creature must succeed on a Constitution saving throw or take 1d12 poison damage.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d12'
  },
  {
    id: 'prestidigitation',
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '10 feet',
    duration: 'Up to 1 hour',
    description: 'This spell is a minor magical trick that novice spellcasters use for practice. You create one of the following magical effects within range.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false
  },
  {
    id: 'produce-flame',
    name: 'Produce Flame',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: 'Self',
    duration: '10 minutes',
    description: 'A flickering flame appears in your hand. The flame remains there for the duration and harms neither you nor your equipment.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d8'
  },
  {
    id: 'ray-of-frost',
    name: 'Ray of Frost',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Instantaneous',
    description: 'A frigid beam of blue-white light streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 1d8 cold damage.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d8'
  },
  {
    id: 'resistance',
    name: 'Resistance',
    level: 0,
    school: 'Abjuration',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Concentration, up to 1 minute',
    description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one saving throw of its choice.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a miniature cloak',
    concentration: true,
    ritual: false
  },
  {
    id: 'shocking-grasp',
    name: 'Shocking Grasp',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Instantaneous',
    description: 'Lightning springs from your hand to deliver a shock to a creature you try to touch. Make a melee spell attack against the target.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d8'
  },
  {
    id: 'thorn-whip',
    name: 'Thorn Whip',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Instantaneous',
    description: 'You create a long, vine-like whip covered in thorns that lashes out at your command toward a creature in range.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'the stem of a plant with thorns',
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d6'
  },
  {
    id: 'true-strike',
    name: 'True Strike',
    level: 0,
    school: 'Divination',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Concentration, up to 1 round',
    description: 'You extend your hand and point a finger at a target in range. Your magic grants you a brief insight into the target\'s defenses.',
    verbal: false,
    somatic: true,
    material: false,
    concentration: true,
    ritual: false
  },
  {
    id: 'vicious-mockery',
    name: 'Vicious Mockery',
    level: 0,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Instantaneous',
    description: 'You unleash a string of insults laced with subtle enchantments at a creature you can see within range.',
    verbal: true,
    somatic: false,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '1d4'
  }
];

// D&D 5E 1st Level Spells
export const firstLevelSpells: Spell[] = [
  {
    id: 'animal-friendship',
    name: 'Animal Friendship',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    duration: '24 hours',
    description: 'This spell lets you convince a beast that you mean it no harm. Choose a beast that you can see within range.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a morsel of food',
    concentration: false,
    ritual: false
  },
  {
    id: 'bane',
    name: 'Bane',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'Up to three creatures of your choice that you can see within range must make Charisma saving throws.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a drop of blood',
    concentration: true,
    ritual: false
  },
  {
    id: 'bless',
    name: 'Bless',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a sprinkling of holy water',
    concentration: true,
    ritual: false
  },
  {
    id: 'charm-person',
    name: 'Charm Person',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    duration: '1 hour',
    description: 'You attempt to charm a humanoid you can see within range. It must make a Wisdom saving throw, and it does so with advantage if you or your companions are fighting it.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false
  },
  {
    id: 'comprehend-languages',
    name: 'Comprehend Languages',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    duration: '1 hour',
    description: 'For the duration, you understand the literal meaning of any spoken language that you hear.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a pinch of soot and salt',
    concentration: false,
    ritual: true
  },
  {
    id: 'cure-wounds',
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Instantaneous',
    description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false
  },
  {
    id: 'detect-magic',
    name: 'Detect Magic',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    duration: 'Concentration, up to 10 minutes',
    description: 'For the duration, you sense the presence of magic within 30 feet of you.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: true
  },
  {
    id: 'disguise-self',
    name: 'Disguise Self',
    level: 1,
    school: 'Illusion',
    castingTime: '1 action',
    range: 'Self',
    duration: '1 hour',
    description: 'You make yourself--including your clothing, armor, weapons, and other belongings on your person--look different until the spell ends or until you use your action to dismiss it.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false
  },
  {
    id: 'dissonant-whispers',
    name: 'Dissonant Whispers',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Instantaneous',
    description: 'You whisper a discordant melody that only one creature of your choice within range can hear, wracking it with terrible pain.',
    verbal: true,
    somatic: false,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '3d6'
  },
  {
    id: 'entangle',
    name: 'Entangle',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '90 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'Grasping weeds and vines sprout from the ground in a 20-foot square starting from a point within range.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: false
  },
  {
    id: 'faerie-fire',
    name: 'Faerie Fire',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'Each object in a 20-foot cube within range is outlined in blue, green, or violet light (your choice).',
    verbal: true,
    somatic: false,
    material: false,
    concentration: true,
    ritual: false
  },
  {
    id: 'feather-fall',
    name: 'Feather Fall',
    level: 1,
    school: 'Transmutation',
    castingTime: '1 reaction',
    range: '60 feet',
    duration: '1 minute',
    description: 'Choose up to five falling creatures within range. A falling creature\'s rate of descent slows to 60 feet per round until the spell ends.',
    verbal: true,
    somatic: false,
    material: true,
    materialComponents: 'a small feather or piece of down',
    concentration: false,
    ritual: false
  },
  {
    id: 'goodberry',
    name: 'Goodberry',
    level: 1,
    school: 'Transmutation',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Instantaneous',
    description: 'Up to ten berries appear in your hand and are infused with magic for the duration. A creature can use its action to eat one berry.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a sprig of mistletoe',
    concentration: false,
    ritual: false
  },
  {
    id: 'healing-word',
    name: 'Healing Word',
    level: 1,
    school: 'Evocation',
    castingTime: '1 bonus action',
    range: '60 feet',
    duration: 'Instantaneous',
    description: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.',
    verbal: true,
    somatic: false,
    material: false,
    concentration: false,
    ritual: false
  },
  {
    id: 'heroism',
    name: 'Heroism',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: 'Touch',
    duration: 'Concentration, up to 1 minute',
    description: 'A willing creature you touch is imbued with bravery. Until the spell ends, the creature is immune to being frightened and gains temporary hit points equal to your spellcasting ability modifier at the start of each of its turns.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: true,
    ritual: false
  },
  {
    id: 'identify',
    name: 'Identify',
    level: 1,
    school: 'Divination',
    castingTime: '1 minute',
    range: 'Touch',
    duration: 'Instantaneous',
    description: 'You choose one object that you must touch throughout the casting of the spell. If it is a magic item or some other magic-imbued object, you learn its properties and how to use them.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a pearl worth at least 100 gp and an owl feather',
    concentration: false,
    ritual: true
  },
  {
    id: 'illusory-script',
    name: 'Illusory Script',
    level: 1,
    school: 'Illusion',
    castingTime: '1 minute',
    range: 'Touch',
    duration: '10 days',
    description: 'You write on parchment, paper, or some other suitable writing material and imbue it with a potent illusion that lasts for the duration.',
    verbal: false,
    somatic: true,
    material: true,
    materialComponents: 'a lead-based ink worth at least 10 gp, which the spell consumes',
    concentration: false,
    ritual: true
  },
  {
    id: 'longstrider',
    name: 'Longstrider',
    level: 1,
    school: 'Transmutation',
    castingTime: '1 action',
    range: 'Touch',
    duration: '1 hour',
    description: 'You touch a creature. The target\'s speed increases by 10 feet until the spell ends.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a pinch of dirt',
    concentration: false,
    ritual: false
  },
  {
    id: 'silent-image',
    name: 'Silent Image',
    level: 1,
    school: 'Illusion',
    castingTime: '1 action',
    range: '60 feet',
    duration: 'Concentration, up to 10 minutes',
    description: 'You create the image of an object, a creature, or some other visible phenomenon that is no larger than a 15-foot cube.',
    verbal: false,
    somatic: true,
    material: true,
    materialComponents: 'a bit of fleece',
    concentration: true,
    ritual: false
  },
  {
    id: 'sleep',
    name: 'Sleep',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '90 feet',
    duration: '1 minute',
    description: 'This spell sends creatures into a magical slumber. Roll 5d8; the total is how many hit points of creatures this spell can affect.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'a pinch of fine sand, rose petals, or a cricket',
    concentration: false,
    ritual: false
  },
  {
    id: 'speak-with-animals',
    name: 'Speak with Animals',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    duration: '10 minutes',
    description: 'You gain the ability to comprehend and verbally communicate with beasts for the duration.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: true
  },
  {
    id: 'tashas-hideous-laughter',
    name: 'Tasha\'s Hideous Laughter',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    duration: 'Concentration, up to 1 minute',
    description: 'A creature of your choice that you can see within range perceives everything as hilariously funny and falls into fits of laughter if this spell affects it.',
    verbal: true,
    somatic: true,
    material: true,
    materialComponents: 'tiny tarts and a feather that is waved in the air',
    concentration: true,
    ritual: false
  },
  {
    id: 'thunderwave',
    name: 'Thunderwave',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (15-foot cube)',
    duration: 'Instantaneous',
    description: 'A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw.',
    verbal: true,
    somatic: true,
    material: false,
    concentration: false,
    ritual: false,
    damage: true,
    damageEffect: '2d8'
  }
];

// Class-to-spell mappings for D&D 5E classes
export const classSpellMappings = {
  Bard: {
    cantrips: [
      'blade-ward', 'friends', 'mage-hand', 'mending', 'message',
      'minor-illusion', 'prestidigitation', 'true-strike', 'vicious-mockery'
    ],
    spells: [
      'animal-friendship', 'bane', 'charm-person', 'comprehend-languages',
      'cure-wounds', 'detect-magic', 'disguise-self', 'dissonant-whispers',
      'faerie-fire', 'feather-fall', 'healing-word', 'heroism', 'identify',
      'illusory-script', 'longstrider', 'silent-image', 'sleep',
      'speak-with-animals', 'tashas-hideous-laughter', 'thunderwave'
    ]
  },
  Druid: {
    cantrips: [
      'druidcraft', 'guidance', 'mending', 'poison-spray',
      'produce-flame', 'resistance', 'thorn-whip'
    ],
    spells: [
      'animal-friendship', 'charm-person', 'cure-wounds',
      'detect-magic', 'entangle', 'faerie-fire', 'goodberry', 'healing-word',
      'longstrider', 'speak-with-animals', 'thunderwave'
    ]
  },
  Cleric: {
    cantrips: [
      'guidance', 'light', 'mending', 'resistance', 'thorn-whip'
    ],
    spells: [
      'bless', 'cure-wounds', 'detect-magic', 'healing-word'
    ]
  },
  Sorcerer: {
    cantrips: [
      'acid-splash', 'chill-touch', 'dancing-lights', 'fire-bolt', 'light',
      'mage-hand', 'mending', 'message', 'minor-illusion', 'poison-spray',
      'prestidigitation', 'ray-of-frost', 'shocking-grasp', 'true-strike'
    ],
    spells: [
      'charm-person', 'comprehend-languages', 'detect-magic',
      'disguise-self', 'feather-fall', 'silent-image', 'sleep'
    ]
  },
  Warlock: {
    cantrips: [
      'blade-ward', 'chill-touch', 'eldritch-blast', 'friends',
      'mage-hand', 'minor-illusion', 'prestidigitation'
    ],
    spells: [
      'charm-person', 'comprehend-languages'
    ]
  },
  Wizard: {
    cantrips: [
      'acid-splash', 'chill-touch', 'dancing-lights', 'fire-bolt', 'light',
      'mage-hand', 'mending', 'message', 'minor-illusion', 'poison-spray',
      'prestidigitation', 'ray-of-frost', 'shocking-grasp', 'true-strike'
    ],
    spells: [
      'charm-person', 'comprehend-languages', 'detect-magic',
      'disguise-self', 'feather-fall', 'identify', 'illusory-script',
      'silent-image', 'sleep'
    ]
  }
};

// Get all spells (cantrips + 1st level)
export const allSpells = [...cantrips, ...firstLevelSpells];

// Helper functions
export function getClassSpells(className: string): { cantrips: Spell[], spells: Spell[] } {
  const mapping = classSpellMappings[className as keyof typeof classSpellMappings];

  if (!mapping) {
    return { cantrips: [], spells: [] };
  }

  return {
    cantrips: cantrips.filter(spell => mapping.cantrips.includes(spell.id)),
    spells: firstLevelSpells.filter(spell => mapping.spells.includes(spell.id))
  };
}

export function getSpellById(id: string): Spell | undefined {
  return allSpells.find(spell => spell.id === id);
}

export function getSpellsByLevel(level: number): Spell[] {
  return allSpells.filter(spell => spell.level === level);
}

export function getSpellsBySchool(school: string): Spell[] {
  return allSpells.filter(spell => spell.school === school);
}

// Spell progression data for D&D 5E classes
export const spellProgression = {
  Bard: [
    { character_level: 1, cantrips_known: 2, spells_known: 4, spell_slots_1: 2, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 2, cantrips_known: 2, spells_known: 5, spell_slots_1: 3, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 3, cantrips_known: 2, spells_known: 6, spell_slots_1: 4, spell_slots_2: 2, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 4, cantrips_known: 3, spells_known: 7, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 5, cantrips_known: 3, spells_known: 8, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 2, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 }
  ],
  Druid: [
    { character_level: 1, cantrips_known: 2, spells_prepared_formula: '1 + Wis modifier', spell_slots_1: 2, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 2, cantrips_known: 2, spells_prepared_formula: '2 + Wis modifier', spell_slots_1: 3, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 3, cantrips_known: 2, spells_prepared_formula: '3 + Wis modifier', spell_slots_1: 4, spell_slots_2: 2, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 4, cantrips_known: 3, spells_prepared_formula: '4 + Wis modifier', spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 5, cantrips_known: 3, spells_prepared_formula: '5 + Wis modifier', spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 2, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 }
  ],
  Cleric: [
    { character_level: 1, cantrips_known: 3, spells_prepared_formula: '1 + Wis modifier', spell_slots_1: 2, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 2, cantrips_known: 3, spells_prepared_formula: '2 + Wis modifier', spell_slots_1: 3, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 3, cantrips_known: 3, spells_prepared_formula: '3 + Wis modifier', spell_slots_1: 4, spell_slots_2: 2, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 4, cantrips_known: 4, spells_prepared_formula: '4 + Wis modifier', spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 5, cantrips_known: 4, spells_prepared_formula: '5 + Wis modifier', spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 2, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 }
  ],
  Sorcerer: [
    { character_level: 1, cantrips_known: 4, spells_known: 2, spell_slots_1: 2, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 2, cantrips_known: 4, spells_known: 3, spell_slots_1: 3, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 3, cantrips_known: 4, spells_known: 4, spell_slots_1: 4, spell_slots_2: 2, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 4, cantrips_known: 5, spells_known: 5, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 5, cantrips_known: 5, spells_known: 6, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 2, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 }
  ],
  Warlock: [
    { character_level: 1, cantrips_known: 2, spells_known: 1, spell_slots_1: 1, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 2, cantrips_known: 2, spells_known: 2, spell_slots_1: 2, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 3, cantrips_known: 2, spells_known: 3, spell_slots_1: 0, spell_slots_2: 2, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 4, cantrips_known: 3, spells_known: 4, spell_slots_1: 0, spell_slots_2: 2, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 5, cantrips_known: 3, spells_known: 5, spell_slots_1: 0, spell_slots_2: 0, spell_slots_3: 2, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 }
  ],
  Wizard: [
    { character_level: 1, cantrips_known: 3, spells_prepared_formula: '1 + Int modifier', spell_slots_1: 2, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 2, cantrips_known: 3, spells_prepared_formula: '2 + Int modifier', spell_slots_1: 3, spell_slots_2: 0, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 3, cantrips_known: 3, spells_prepared_formula: '3 + Int modifier', spell_slots_1: 4, spell_slots_2: 2, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 4, cantrips_known: 4, spells_prepared_formula: '4 + Int modifier', spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 0, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 },
    { character_level: 5, cantrips_known: 4, spells_prepared_formula: '5 + Int modifier', spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 2, spell_slots_4: 0, spell_slots_5: 0, spell_slots_6: 0, spell_slots_7: 0, spell_slots_8: 0, spell_slots_9: 0 }
  ]
};

// Spellcasting classes data for D&D 5E
export const spellcastingClasses = [
  {
    id: 'bard',
    name: 'Bard',
    spellcasting_ability: 'Charisma',
    caster_type: 'full',
    spell_slots_start_level: 1
  },
  {
    id: 'cleric',
    name: 'Cleric',
    spellcasting_ability: 'Wisdom',
    caster_type: 'full',
    spell_slots_start_level: 1
  },
  {
    id: 'druid',
    name: 'Druid',
    spellcasting_ability: 'Wisdom',
    caster_type: 'full',
    spell_slots_start_level: 1
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    spellcasting_ability: 'Charisma',
    caster_type: 'full',
    spell_slots_start_level: 1
  },
  {
    id: 'warlock',
    name: 'Warlock',
    spellcasting_ability: 'Charisma',
    caster_type: 'pact',
    spell_slots_start_level: 1
  },
  {
    id: 'wizard',
    name: 'Wizard',
    spellcasting_ability: 'Intelligence',
    caster_type: 'full',
    spell_slots_start_level: 1
  },
  {
    id: 'paladin',
    name: 'Paladin',
    spellcasting_ability: 'Charisma',
    caster_type: 'half',
    spell_slots_start_level: 2
  },
  {
    id: 'ranger',
    name: 'Ranger',
    spellcasting_ability: 'Wisdom',
    caster_type: 'half',
    spell_slots_start_level: 2
  }
];