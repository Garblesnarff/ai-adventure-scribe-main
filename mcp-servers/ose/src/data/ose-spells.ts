/**
 * OSE Spell Data for MCP Resources
 */

export interface OSESpell {
  name: string;
  level: number;
  type: 'arcane' | 'divine';
  range: string;
  duration: string;
  description: string;
}

// Sample arcane spells
export const OSE_ARCANE_SPELLS: OSESpell[] = [
  // 1st Level
  { name: 'Charm Person', level: 1, type: 'arcane', range: '120ft', duration: 'Special', description: 'A humanoid must save vs Spells or be charmed.' },
  { name: 'Detect Magic', level: 1, type: 'arcane', range: '60ft', duration: '2 turns', description: 'Magical objects, creatures, or areas are made apparent.' },
  { name: 'Floating Disc', level: 1, type: 'arcane', range: '0', duration: '6 turns', description: 'A 3ft diameter disc of force that follows the caster and can carry 5,000 coins weight.' },
  { name: 'Hold Portal', level: 1, type: 'arcane', range: '10ft', duration: '2d6 turns', description: 'Magically holds shut a door or gate.' },
  { name: 'Light', level: 1, type: 'arcane', range: '120ft', duration: '6 turns + 1/level', description: 'Creates light in 15ft radius.' },
  { name: 'Magic Missile', level: 1, type: 'arcane', range: '150ft', duration: 'Instant', description: '1d6+1 damage per missile. 1 missile at 1st level, +1 every 5 levels.' },
  { name: 'Protection from Evil', level: 1, type: 'arcane', range: '0', duration: '6 turns', description: '+1 AC vs evil creatures, blocks possession and charm.' },
  { name: 'Read Languages', level: 1, type: 'arcane', range: '0', duration: '2 turns', description: 'Read (but not speak) any language, including ciphers and treasure maps.' },
  { name: 'Read Magic', level: 1, type: 'arcane', range: '0', duration: '1 turn', description: 'Decipher magical inscriptions or runes.' },
  { name: 'Shield', level: 1, type: 'arcane', range: '0', duration: '2 turns', description: 'AC 2 vs missiles, AC 4 vs other attacks, immunity to Magic Missile.' },
  { name: 'Sleep', level: 1, type: 'arcane', range: '240ft', duration: '4d4 turns', description: 'Puts 2d8 HD of creatures to sleep.' },
  { name: 'Ventriloquism', level: 1, type: 'arcane', range: '60ft', duration: '2 turns', description: 'Make voice come from another location.' },

  // 2nd Level
  { name: 'Continual Light', level: 2, type: 'arcane', range: '120ft', duration: 'Permanent', description: 'Creates permanent light in 30ft radius.' },
  { name: 'Detect Evil', level: 2, type: 'arcane', range: '60ft', duration: '2 turns', description: 'Detect evil intentions or enchantments.' },
  { name: 'Detect Invisible', level: 2, type: 'arcane', range: '10ft/level', duration: '6 turns', description: 'See invisible creatures and objects.' },
  { name: 'ESP', level: 2, type: 'arcane', range: '60ft', duration: '12 turns', description: 'Read surface thoughts of nearby creatures.' },
  { name: 'Invisibility', level: 2, type: 'arcane', range: '240ft', duration: 'Until dispelled or attack', description: 'Subject becomes invisible.' },
  { name: 'Knock', level: 2, type: 'arcane', range: '60ft', duration: 'Instant', description: 'Opens locked doors, chests, etc.' },
  { name: 'Levitate', level: 2, type: 'arcane', range: '0', duration: '6 turns + 1/level', description: 'Caster moves up or down at 20ft/round.' },
  { name: 'Locate Object', level: 2, type: 'arcane', range: '60ft + 10ft/level', duration: '2 turns', description: 'Sense direction of a known object.' },
  { name: 'Mirror Image', level: 2, type: 'arcane', range: '0', duration: '6 turns', description: 'Creates 1d4 illusory duplicates of caster.' },
  { name: 'Phantasmal Force', level: 2, type: 'arcane', range: '240ft', duration: 'Until dispelled', description: 'Creates realistic illusion.' },
  { name: 'Web', level: 2, type: 'arcane', range: '10ft', duration: '48 turns', description: 'Fills 10ft cube with sticky webs.' },
  { name: 'Wizard Lock', level: 2, type: 'arcane', range: '10ft', duration: 'Permanent', description: 'Permanently locks a door or gate.' },

  // 3rd Level
  { name: 'Clairvoyance', level: 3, type: 'arcane', range: '60ft', duration: '12 turns', description: 'See through the eyes of creatures or into an area.' },
  { name: 'Dispel Magic', level: 3, type: 'arcane', range: '120ft', duration: 'Instant', description: 'Removes magical effects.' },
  { name: 'Fire Ball', level: 3, type: 'arcane', range: '240ft', duration: 'Instant', description: '1d6 damage per caster level in 20ft radius.' },
  { name: 'Fly', level: 3, type: 'arcane', range: '0', duration: '1d6 turns + 1/level', description: 'Fly at 360ft/turn (120ft/round).' },
  { name: 'Haste', level: 3, type: 'arcane', range: '240ft', duration: '3 turns', description: 'Up to 24 creatures move and attack at double speed.' },
  { name: 'Hold Person', level: 3, type: 'arcane', range: '120ft', duration: '1 turn/level', description: 'Paralyzes 1d4 humanoids.' },
  { name: 'Infravision', level: 3, type: 'arcane', range: '0', duration: '1 day', description: 'See heat signatures in 60ft.' },
  { name: 'Invisibility 10ft Radius', level: 3, type: 'arcane', range: '120ft', duration: 'Until dispelled or attack', description: 'All within 10ft become invisible.' },
  { name: 'Lightning Bolt', level: 3, type: 'arcane', range: '180ft', duration: 'Instant', description: '1d6 damage per caster level in line.' },
  { name: 'Protection from Evil 10ft Radius', level: 3, type: 'arcane', range: '0', duration: '12 turns', description: 'As Protection from Evil but affects all within 10ft.' },
  { name: 'Protection from Normal Missiles', level: 3, type: 'arcane', range: '30ft', duration: '12 turns', description: 'Immunity to non-magical missiles.' },
  { name: 'Water Breathing', level: 3, type: 'arcane', range: '30ft', duration: '1 day', description: 'Breathe underwater.' },
];

// Sample divine spells
export const OSE_DIVINE_SPELLS: OSESpell[] = [
  // 1st Level
  { name: 'Cure Light Wounds', level: 1, type: 'divine', range: 'Touch', duration: 'Instant', description: 'Restore 1d6+1 HP or inflict 1d6+1 damage to undead.' },
  { name: 'Detect Evil', level: 1, type: 'divine', range: '120ft', duration: '6 turns', description: 'Detect evil intentions within 120ft.' },
  { name: 'Detect Magic', level: 1, type: 'divine', range: '120ft', duration: '2 turns', description: 'Detect magical auras.' },
  { name: 'Light', level: 1, type: 'divine', range: '120ft', duration: '12 turns', description: 'Creates light in 15ft radius.' },
  { name: 'Protection from Evil', level: 1, type: 'divine', range: 'Touch', duration: '12 turns', description: '+1 AC vs evil, blocks possession and charm.' },
  { name: 'Purify Food and Water', level: 1, type: 'divine', range: '10ft', duration: 'Instant', description: 'Purifies food and water for 12 people.' },
  { name: 'Remove Fear', level: 1, type: 'divine', range: 'Touch', duration: '2 turns', description: 'Calms fear or grants +1 to saves vs fear.' },
  { name: 'Resist Cold', level: 1, type: 'divine', range: '30ft', duration: '6 turns', description: 'Immunity to normal cold, +2 to saves vs magical cold.' },

  // 2nd Level
  { name: 'Bless', level: 2, type: 'divine', range: '60ft', duration: '6 turns', description: 'Allies gain +1 to attack rolls and morale.' },
  { name: 'Find Traps', level: 2, type: 'divine', range: '30ft', duration: '2 turns', description: 'Detect traps at 30ft range.' },
  { name: 'Hold Person', level: 2, type: 'divine', range: '180ft', duration: '9 turns', description: 'Paralyze 1d4 humanoids.' },
  { name: 'Know Alignment', level: 2, type: 'divine', range: '10ft', duration: '1 turn', description: 'Learn alignment of creatures or items.' },
  { name: 'Resist Fire', level: 2, type: 'divine', range: '30ft', duration: '2 turns', description: 'Immunity to normal fire, +2 to saves vs magical fire.' },
  { name: 'Silence 15ft Radius', level: 2, type: 'divine', range: '180ft', duration: '12 turns', description: 'No sound in 15ft radius.' },
  { name: 'Snake Charm', level: 2, type: 'divine', range: '60ft', duration: 'Special', description: 'Charm snakes with HD equal to caster level.' },
  { name: 'Speak with Animals', level: 2, type: 'divine', range: '30ft', duration: '6 turns', description: 'Converse with normal animals.' },

  // 3rd Level
  { name: 'Continual Light', level: 3, type: 'divine', range: '120ft', duration: 'Permanent', description: 'Permanent light in 30ft radius.' },
  { name: 'Cure Disease', level: 3, type: 'divine', range: '30ft', duration: 'Instant', description: 'Cure disease or inflict disease (reverse).' },
  { name: 'Growth of Animals', level: 3, type: 'divine', range: '120ft', duration: '12 turns', description: 'Double size of 1d6 animals.' },
  { name: 'Locate Object', level: 3, type: 'divine', range: '120ft', duration: '6 turns', description: 'Sense direction to known object.' },
  { name: 'Remove Curse', level: 3, type: 'divine', range: 'Touch', duration: 'Instant', description: 'Remove a curse from person or object.' },
  { name: 'Speak with Dead', level: 3, type: 'divine', range: '10ft', duration: '3 questions', description: 'Ask 3 questions of a corpse.' },
  { name: 'Striking', level: 3, type: 'divine', range: '30ft', duration: '1 turn', description: 'Weapon gets +1 to hit and deals 1d6+1 extra damage.' },
];

export function getSpellsByType(type: 'arcane' | 'divine'): OSESpell[] {
  return type === 'arcane' ? OSE_ARCANE_SPELLS : OSE_DIVINE_SPELLS;
}

export function getSpellsByLevel(type: 'arcane' | 'divine', level: number): OSESpell[] {
  const spells = getSpellsByType(type);
  return spells.filter(spell => spell.level === level);
}
