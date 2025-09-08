import { Spell } from '@/types/character';

/**
 * D&D 5E Cantrips (Level 0 spells) organized by class
 */
export const cantrips: Spell[] = [
  // Wizard Cantrips
  {
    id: 'fire-bolt',
    name: 'Fire Bolt',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You hurl a mote of fire at a creature or object within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 fire damage.',
    damage: '1d10'
  },
  {
    id: 'mage-hand',
    name: 'Mage Hand',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'A spectral, floating hand appears at a point you choose within range. The hand lasts for the duration or until you dismiss it as an action.',
    concentration: true
  },
  {
    id: 'prestidigitation',
    name: 'Prestidigitation',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '10 feet',
    components: 'V, S',
    duration: 'Up to 1 hour',
    description: 'This spell is a minor magical trick that novice spellcasters use for practice. You create one of several minor magical effects within range.'
  },
  {
    id: 'minor-illusion',
    name: 'Minor Illusion',
    level: 0,
    school: 'Illusion',
    castingTime: '1 action',
    range: '30 feet',
    components: 'S, M (a bit of fleece)',
    duration: 'Concentration, up to 1 minute',
    description: 'You create a sound or an image of an object within range that lasts for the duration.',
    concentration: true
  },
  {
    id: 'light',
    name: 'Light',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, M (a firefly or phosphorescent moss)',
    duration: '1 hour',
    description: 'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.'
  },
  {
    id: 'ray-of-frost',
    name: 'Ray of Frost',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A frigid beam of blue-white light streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, it takes 1d8 cold damage, and its speed is reduced by 10 feet until the start of your next turn.',
    damage: '1d8'
  },
  // Cleric Cantrips
  {
    id: 'sacred-flame',
    name: 'Sacred Flame',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage.',
    damage: '1d8'
  },
  {
    id: 'guidance',
    name: 'Guidance',
    level: 0,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.',
    concentration: true
  },
  {
    id: 'thaumaturgy',
    name: 'Thaumaturgy',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V',
    duration: 'Up to 1 minute',
    description: 'You manifest a minor wonder, a sign of supernatural power, within range. You create one of several magical effects within range.'
  },
  // Bard Cantrips
  {
    id: 'vicious-mockery',
    name: 'Vicious Mockery',
    level: 0,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'You unleash a string of insults laced with subtle enchantments at a creature you can see within range. If the target can hear you (though it need not understand you), it must succeed on a Wisdom saving throw or take 1d4 psychic damage and have disadvantage on the next attack roll it makes before the end of its next turn.',
    damage: '1d4'
  },
  {
    id: 'minor-illusion',
    name: 'Minor Illusion',
    level: 0,
    school: 'Illusion',
    castingTime: '1 action',
    range: '30 feet',
    components: 'S, M (a bit of fleece)',
    duration: 'Concentration, up to 1 minute',
    description: 'You create a sound or an image of an object within range that lasts for the duration.',
    concentration: true
  },
  // Druid Cantrips
  {
    id: 'druidcraft',
    name: 'Druidcraft',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'Whispering to the spirits of nature, you create one of several minor effects: predict weather, make a flower bloom, create a sensory effect, or light/snuff a small flame.'
  },
  {
    id: 'thorn-whip',
    name: 'Thorn Whip',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S, M (the stem of a thorny plant)',
    duration: 'Instantaneous',
    description: 'You create a long, vine-like whip covered in thorns that lashes out at your command toward a creature in range.',
    damage: '1d6'
  },
  {
    id: 'produce-flame',
    name: 'Produce Flame',
    level: 0,
    school: 'Conjuration',
    castingTime: '1 action',
    range: 'Self',
    components: 'V, S',
    duration: '10 minutes',
    description: 'A flickering flame appears in your hand. The flame remains there for the duration and harms neither you nor your equipment.',
    damage: '1d8'
  },
  // Sorcerer/Warlock Cantrips
  {
    id: 'eldritch-blast',
    name: 'Eldritch Blast',
    level: 0,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A beam of crackling energy streaks toward a creature within range. Make a ranged spell attack against the target. On a hit, the target takes 1d10 force damage.',
    damage: '1d10'
  },
  {
    id: 'chill-touch',
    name: 'Chill Touch',
    level: 0,
    school: 'Necromancy',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You create a ghostly, skeletal hand in the space of a creature within range.',
    damage: '1d8'
  },
  {
    id: 'mending',
    name: 'Mending',
    level: 0,
    school: 'Transmutation',
    castingTime: '1 minute',
    range: 'Touch',
    components: 'V, S, M (two lodestones)',
    duration: 'Instantaneous',
    description: 'This spell repairs a single break or tear in an object you touch.'
  }
];

/**
 * D&D 5E 1st Level Spells organized by class
 */
export const firstLevelSpells: Spell[] = [
  // Wizard 1st Level Spells
  {
    id: 'magic-missile',
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.',
    damage: '1d4+1'
  },
  {
    id: 'shield',
    name: 'Shield',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 reaction',
    range: 'Self',
    components: 'V, S',
    duration: '1 round',
    description: 'An invisible barrier of magical force appears and protects you. Until the start of your next turn, you have a +5 bonus to AC, including against the triggering attack, and you take no damage from magic missile.'
  },
  {
    id: 'burning-hands',
    name: 'Burning Hands',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (15-foot cone)',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'As you hold your hands with thumbs touching and fingers spread, a thin sheet of flames shoots forth from your outstretched fingertips. Each creature in a 15-foot cone must make a Dexterity saving throw. A creature takes 3d6 fire damage on a failed save, or half as much damage on a successful one.',
    damage: '3d6'
  },
  {
    id: 'sleep',
    name: 'Sleep',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '90 feet',
    components: 'V, S, M (a pinch of fine sand, rose petals, or a cricket)',
    duration: '1 minute',
    description: 'This spell sends creatures into a magical slumber. Roll 5d8; the result is how many hit points of creatures this spell can affect.'
  },
  // Cleric 1st Level Spells
  {
    id: 'cure-wounds',
    name: 'Cure Wounds',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A creature you touch regains a number of hit points equal to 1d8 + your spellcasting ability modifier.',
    damage: '1d8'
  },
  {
    id: 'bless',
    name: 'Bless',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S, M (a sprinkling of holy water)',
    duration: 'Concentration, up to 1 minute',
    description: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.',
    concentration: true
  },
  {
    id: 'command',
    name: 'Command',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V',
    duration: '1 round',
    description: 'You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom saving throw or follow the command on its next turn.'
  },
  // Bard 1st Level Spells
  {
    id: 'healing-word',
    name: 'Healing Word',
    level: 1,
    school: 'Evocation',
    castingTime: '1 bonus action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'A creature of your choice that you can see within range regains hit points equal to 1d4 + your spellcasting ability modifier.',
    damage: '1d4'
  },
  {
    id: 'thunderwave',
    name: 'Thunderwave',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: 'Self (15-foot cube)',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'A wave of thunderous force sweeps out from you. Each creature in a 15-foot cube originating from you must make a Constitution saving throw. On a failed save, a creature takes 2d8 thunder damage and is pushed 10 feet away from you.',
    damage: '2d8'
  },
  {
    id: 'dissonant-whispers',
    name: 'Dissonant Whispers',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V',
    duration: 'Instantaneous',
    description: 'You whisper a discordant melody that only one creature of your choice within range can hear, wracking it with terrible pain. The target must make a Wisdom saving throw. On a failed save, it takes 3d6 psychic damage and must immediately use its reaction, if available, to move as far as its speed allows away from you.',
    damage: '3d6'
  },
  // Druid 1st Level Spells
  {
    id: 'entangle',
    name: 'Entangle',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '90 feet',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'Grasping weeds and vines sprout from the ground in a 20-foot square starting from a point within range.',
    concentration: true
  },
  {
    id: 'faerie-fire',
    name: 'Faerie Fire',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V',
    duration: 'Concentration, up to 1 minute',
    description: 'Each object in a 20-foot cube within range is outlined in blue, green, or violet light.',
    concentration: true
  },
  {
    id: 'goodberry',
    name: 'Goodberry',
    level: 1,
    school: 'Transmutation',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S, M (a sprig of mistletoe)',
    duration: '24 hours',
    description: 'Up to ten berries appear in your hand and are infused with magic for the duration.'
  },
  // Paladin 1st Level Spells
  {
    id: 'divine-favor',
    name: 'Divine Favor',
    level: 1,
    school: 'Evocation',
    castingTime: '1 bonus action',
    range: 'Self',
    components: 'V, S',
    duration: 'Concentration, up to 1 minute',
    description: 'Your prayer empowers you with divine radiance. Until the spell ends, your weapon attacks deal an extra 1d4 radiant damage.',
    concentration: true
  },
  {
    id: 'protection-from-evil-and-good',
    name: 'Protection from Evil and Good',
    level: 1,
    school: 'Abjuration',
    castingTime: '1 action',
    range: 'Touch',
    components: 'V, S, M (holy water or powdered silver and iron)',
    duration: 'Concentration, up to 10 minutes',
    description: 'Until the spell ends, one willing creature you touch is protected against certain types of creatures.',
    concentration: true
  },
  // Ranger 1st Level Spells
  {
    id: 'hunters-mark',
    name: 'Hunter\'s Mark',
    level: 1,
    school: 'Divination',
    castingTime: '1 bonus action',
    range: '90 feet',
    components: 'V',
    duration: 'Concentration, up to 1 hour',
    description: 'You choose a creature you can see within range and mystically mark it as your quarry.',
    concentration: true
  },
  {
    id: 'animal-friendship',
    name: 'Animal Friendship',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 action',
    range: '30 feet',
    components: 'V, S, M (a morsel of food)',
    duration: '24 hours',
    description: 'This spell lets you convince a beast that you mean it no harm.'
  },
  // Sorcerer 1st Level Spells
  {
    id: 'chaos-bolt',
    name: 'Chaos Bolt',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '120 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You hurl an undulating, warbling mass of chaotic energy at one creature in range.',
    damage: '2d8'
  },
  {
    id: 'chromatic-orb',
    name: 'Chromatic Orb',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '90 feet',
    components: 'V, S, M (a diamond worth at least 50 gp)',
    duration: 'Instantaneous',
    description: 'You hurl a 4-inch-diameter sphere of energy at a creature that you can see within range.',
    damage: '3d8'
  },
  // Warlock 1st Level Spells
  {
    id: 'hex',
    name: 'Hex',
    level: 1,
    school: 'Enchantment',
    castingTime: '1 bonus action',
    range: '90 feet',
    components: 'V, S, M (the petrified eye of a newt)',
    duration: 'Concentration, up to 1 hour',
    description: 'You place a curse on a creature that you can see within range.',
    concentration: true
  },
  {
    id: 'arms-of-hadar',
    name: 'Arms of Hadar',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 action',
    range: 'Self (10-foot radius)',
    components: 'V, S',
    duration: 'Instantaneous',
    description: 'You invoke the power of Hadar, the Dark Hunger. Tendrils of dark energy erupt from you and batter all creatures within 10 feet of you.'
  },
  // Ritual Spells
  {
    id: 'detect-magic',
    name: 'Detect Magic',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    components: 'V, S',
    duration: 'Concentration, up to 10 minutes',
    description: 'For the duration, you sense the presence of magic within 30 feet of you.',
    concentration: true,
    ritual: true
  },
  {
    id: 'identify',
    name: 'Identify',
    level: 1,
    school: 'Divination',
    castingTime: '1 minute',
    range: 'Touch',
    components: 'V, S, M (a pearl worth at least 100 gp)',
    duration: 'Instantaneous',
    description: 'You choose one object that you must touch throughout the casting of the spell.',
    ritual: true
  },
  {
    id: 'comprehend-languages',
    name: 'Comprehend Languages',
    level: 1,
    school: 'Divination',
    castingTime: '1 action',
    range: 'Self',
    components: 'V, S, M (a pinch of soot and salt)',
    duration: '1 hour',
    description: 'For the duration, you understand the literal meaning of any spoken language that you hear.',
    ritual: true
  },
  {
    id: 'find-familiar',
    name: 'Find Familiar',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 hour',
    range: '10 feet',
    components: 'V, S, M (10 gp worth of charcoal, incense, and herbs)',
    duration: 'Instantaneous',
    description: 'You gain the service of a familiar, a spirit that takes an animal form you choose.',
    ritual: true
  },
  {
    id: 'unseen-servant',
    name: 'Unseen Servant',
    level: 1,
    school: 'Conjuration',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S, M (a piece of string and a bit of wood)',
    duration: '1 hour',
    description: 'This spell creates an invisible, mindless, shapeless force that performs simple tasks.',
    ritual: true
  }
];

/**
 * Get spells available to a specific class at character creation
 */
export const getClassSpells = (className: string): { cantrips: Spell[], spells: Spell[] } => {
  const wizardCantrips = ['fire-bolt', 'mage-hand', 'prestidigitation', 'minor-illusion', 'light', 'ray-of-frost'];
  const wizardSpells = ['magic-missile', 'shield', 'burning-hands', 'sleep'];
  
  const clericCantrips = ['sacred-flame', 'guidance', 'thaumaturgy'];
  const clericSpells = ['cure-wounds', 'bless', 'command'];
  
  const bardCantrips = ['vicious-mockery', 'minor-illusion'];
  const bardSpells = ['healing-word', 'thunderwave', 'dissonant-whispers'];
  
  const druidCantrips = ['druidcraft', 'thorn-whip', 'produce-flame', 'guidance'];
  const druidSpells = ['entangle', 'faerie-fire', 'goodberry', 'cure-wounds'];
  
  const paladinCantrips: string[] = []; // Paladins don't get cantrips at 1st level
  const paladinSpells = ['divine-favor', 'protection-from-evil-and-good', 'bless']; // Available at 2nd level
  
  const rangerCantrips: string[] = []; // Rangers don't get cantrips at 1st level
  const rangerSpells = ['hunters-mark', 'animal-friendship', 'goodberry']; // Available at 2nd level
  
  const sorcererCantrips = ['fire-bolt', 'mage-hand', 'prestidigitation', 'ray-of-frost', 'chill-touch', 'mending'];
  const sorcererSpells = ['magic-missile', 'shield', 'chaos-bolt', 'chromatic-orb'];
  
  const warlockCantrips = ['eldritch-blast', 'chill-touch', 'mage-hand', 'prestidigitation'];
  const warlockSpells = ['hex', 'arms-of-hadar'];
  
  switch (className) {
    case 'Wizard':
      return {
        cantrips: cantrips.filter(spell => wizardCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => wizardSpells.includes(spell.id))
      };
    case 'Cleric':
      return {
        cantrips: cantrips.filter(spell => clericCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => clericSpells.includes(spell.id))
      };
    case 'Bard':
      return {
        cantrips: cantrips.filter(spell => bardCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => bardSpells.includes(spell.id))
      };
    case 'Druid':
      return {
        cantrips: cantrips.filter(spell => druidCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => druidSpells.includes(spell.id))
      };
    case 'Paladin':
      return {
        cantrips: cantrips.filter(spell => paladinCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => paladinSpells.includes(spell.id))
      };
    case 'Ranger':
      return {
        cantrips: cantrips.filter(spell => rangerCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => rangerSpells.includes(spell.id))
      };
    case 'Sorcerer':
      return {
        cantrips: cantrips.filter(spell => sorcererCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => sorcererSpells.includes(spell.id))
      };
    case 'Warlock':
      return {
        cantrips: cantrips.filter(spell => warlockCantrips.includes(spell.id)),
        spells: firstLevelSpells.filter(spell => warlockSpells.includes(spell.id))
      };
    default:
      return { cantrips: [], spells: [] };
  }
};

/**
 * Get all spells (cantrips and 1st level) for easy lookup
 */
export const allSpells: Spell[] = [...cantrips, ...firstLevelSpells];