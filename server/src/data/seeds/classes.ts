// Core D&D 5E Classes with Spellcasting Information
export const classes = [
  {
    name: 'Barbarian',
    hit_die: 12,
    primary_ability: 'strength',
    description: 'A primal warrior of unchecked ferocity.',
    spellcasting_ability: null,
    caster_type: null,
    spell_slots_start_level: null,
    ritual_casting: false,
    spellcasting_focus_type: null
  },
  {
    name: 'Bard',
    hit_die: 8,
    primary_ability: 'charisma',
    description: 'A master of song, speech, and the magic they contain.',
    spellcasting_ability: 'CHA',
    caster_type: 'full',
    spell_slots_start_level: 1,
    ritual_casting: true,
    spellcasting_focus_type: 'arcane'
  },
  {
    name: 'Cleric',
    hit_die: 8,
    primary_ability: 'wisdom',
    description: 'A priestly champion who wields divine magic.',
    spellcasting_ability: 'WIS',
    caster_type: 'full',
    spell_slots_start_level: 1,
    ritual_casting: true,
    spellcasting_focus_type: 'divine'
  },
  {
    name: 'Druid',
    hit_die: 8,
    primary_ability: 'wisdom',
    description: 'A priest of nature, wielding elemental forces.',
    spellcasting_ability: 'WIS',
    caster_type: 'full',
    spell_slots_start_level: 1,
    ritual_casting: true,
    spellcasting_focus_type: 'druidic'
  },
  {
    name: 'Fighter',
    hit_die: 10,
    primary_ability: 'strength',
    description: 'A master of martial combat, skilled with weapons and armor.',
    spellcasting_ability: null,
    caster_type: null,
    spell_slots_start_level: null,
    ritual_casting: false,
    spellcasting_focus_type: null
  },
  {
    name: 'Monk',
    hit_die: 8,
    primary_ability: 'dexterity',
    description: 'A master of martial arts, harnessing inner power.',
    spellcasting_ability: null,
    caster_type: null,
    spell_slots_start_level: null,
    ritual_casting: false,
    spellcasting_focus_type: null
  },
  {
    name: 'Paladin',
    hit_die: 10,
    primary_ability: 'strength',
    description: 'A holy warrior bound to a sacred oath.',
    spellcasting_ability: 'CHA',
    caster_type: 'half',
    spell_slots_start_level: 2,
    ritual_casting: false,
    spellcasting_focus_type: 'divine'
  },
  {
    name: 'Ranger',
    hit_die: 10,
    primary_ability: 'dexterity',
    description: 'A warrior of the wilderness.',
    spellcasting_ability: 'WIS',
    caster_type: 'half',
    spell_slots_start_level: 2,
    ritual_casting: false,
    spellcasting_focus_type: 'druidic'
  },
  {
    name: 'Rogue',
    hit_die: 8,
    primary_ability: 'dexterity',
    description: 'A scoundrel who uses stealth and trickery.',
    spellcasting_ability: null,
    caster_type: null,
    spell_slots_start_level: null,
    ritual_casting: false,
    spellcasting_focus_type: null
  },
  {
    name: 'Sorcerer',
    hit_die: 6,
    primary_ability: 'charisma',
    description: 'A spellcaster who draws on inherent magic.',
    spellcasting_ability: 'CHA',
    caster_type: 'full',
    spell_slots_start_level: 1,
    ritual_casting: false,
    spellcasting_focus_type: 'arcane'
  },
  {
    name: 'Warlock',
    hit_die: 8,
    primary_ability: 'charisma',
    description: 'A wielder of magic derived from a bargain with an extraplanar entity.',
    spellcasting_ability: 'CHA',
    caster_type: 'pact',
    spell_slots_start_level: 1,
    ritual_casting: false,
    spellcasting_focus_type: 'arcane'
  },
  {
    name: 'Wizard',
    hit_die: 6,
    primary_ability: 'intelligence',
    description: 'A scholarly magic-user capable of manipulating reality.',
    spellcasting_ability: 'INT',
    caster_type: 'full',
    spell_slots_start_level: 1,
    ritual_casting: true,
    spellcasting_focus_type: 'arcane'
  }
];
