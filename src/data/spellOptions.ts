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
    default:
      return { cantrips: [], spells: [] };
  }
};

/**
 * Get all spells (cantrips and 1st level) for easy lookup
 */
export const allSpells: Spell[] = [...cantrips, ...firstLevelSpells];