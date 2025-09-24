import 'dotenv/config';
import { createClient } from '../lib/db.js';

/**
 * Comprehensive D&D 5E Database Seeding Script
 *
 * This script populates the database with essential D&D 5E data including:
 * - Core classes with spellcasting information
 * - All SRD races
 * - Essential spells for character creation
 * - Multiclass spell slot progression
 * - Basic spellcasting focuses
 *
 * Compatible with both legacy dnd_* tables and new spellcasting schema
 */

// Core D&D 5E Classes with Spellcasting Information
const classes = [
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

// Core D&D 5E Races
const races = [
  { name: 'Dragonborn', description: 'Humanoids with draconic ancestry.' },
  { name: 'Dwarf', description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.' },
  { name: 'Elf', description: 'Magical people of otherworldly grace, living in the world but not entirely part of it.' },
  { name: 'Gnome', description: 'Small folk with boundless energy, curiosity, and magical heritage.' },
  { name: 'Half-Elf', description: 'Caught between two worlds, half-elves combine human and elven traits.' },
  { name: 'Half-Orc', description: 'Savage and fearless, half-orcs combine human ambition with orcish strength.' },
  { name: 'Halfling', description: 'Small and practical people with cheerful dispositions.' },
  { name: 'Human', description: 'Versatile and ambitious, found in nearly every corner of the world.' },
  { name: 'Tiefling', description: 'Touched by infernal heritage, tieflings bear the mark of their fiendish ancestry.' }
];

// Essential Spells for Character Creation (Cross-Class Cantrips and 1st Level Spells)
const essentialSpells = [
  // Common Cantrips
  {
    name: 'Light',
    level: 0,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: 'Touch',
    duration: '1 hour',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: false,
    components_material: true,
    material_components: 'a firefly or phosphorescent moss',
    description: 'You touch one object that is no larger than 10 feet in any dimension. Until the spell ends, the object sheds bright light in a 20-foot radius and dim light for an additional 20 feet.'
  },
  {
    name: 'Guidance',
    level: 0,
    school: 'Divination',
    casting_time: '1 action',
    range_text: 'Touch',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You touch one willing creature. Once before the spell ends, the target can roll a d4 and add the number rolled to one ability check of its choice.'
  },
  {
    name: 'Sacred Flame',
    level: 0,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: '60 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'Flame-like radiance descends on a creature that you can see within range. The target must succeed on a Dexterity saving throw or take 1d8 radiant damage.',
    damage_at_slot_level: {
      "0": "1d8",
      "5": "2d8",
      "11": "3d8",
      "17": "4d8"
    },
    damage_type: 'radiant'
  },
  // Essential 1st Level Spells
  {
    name: 'Bless',
    level: 1,
    school: 'Enchantment',
    casting_time: '1 action',
    range_text: '30 feet',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: true,
    material_components: 'a sprinkling of holy water',
    description: 'You bless up to three creatures of your choice within range. Whenever a target makes an attack roll or a saving throw before the spell ends, the target can roll a d4 and add the number rolled to the attack roll or saving throw.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, you can target one additional creature for each slot level above 1st.'
  },
  {
    name: 'Magic Missile',
    level: 1,
    school: 'Evocation',
    casting_time: '1 action',
    range_text: '120 feet',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    components_verbal: true,
    components_somatic: true,
    components_material: false,
    description: 'You create three glowing darts of magical force. Each dart hits a creature of your choice that you can see within range. A dart deals 1d4 + 1 force damage to its target.',
    higher_level_text: 'When you cast this spell using a spell slot of 2nd level or higher, the spell creates one more dart for each slot level above 1st.',
    damage_at_slot_level: {
      "1": "3 × (1d4 + 1)",
      "2": "4 × (1d4 + 1)",
      "3": "5 × (1d4 + 1)",
      "4": "6 × (1d4 + 1)",
      "5": "7 × (1d4 + 1)",
      "6": "8 × (1d4 + 1)",
      "7": "9 × (1d4 + 1)",
      "8": "10 × (1d4 + 1)",
      "9": "11 × (1d4 + 1)"
    },
    damage_type: 'force'
  }
];

// Multiclass Spell Slot Progression (D&D 5E Rules)
const multiclassSpellSlots = [
  { caster_level: 1, spell_slots_1: 2 },
  { caster_level: 2, spell_slots_1: 3 },
  { caster_level: 3, spell_slots_1: 4, spell_slots_2: 2 },
  { caster_level: 4, spell_slots_1: 4, spell_slots_2: 3 },
  { caster_level: 5, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 2 },
  { caster_level: 6, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3 },
  { caster_level: 7, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 1 },
  { caster_level: 8, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 2 },
  { caster_level: 9, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 1 },
  { caster_level: 10, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2 },
  { caster_level: 11, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1 },
  { caster_level: 12, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1 },
  { caster_level: 13, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1 },
  { caster_level: 14, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1 },
  { caster_level: 15, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1 },
  { caster_level: 16, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1 },
  { caster_level: 17, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 2, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1, spell_slots_9: 1 },
  { caster_level: 18, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 3, spell_slots_6: 1, spell_slots_7: 1, spell_slots_8: 1, spell_slots_9: 1 },
  { caster_level: 19, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 3, spell_slots_6: 2, spell_slots_7: 1, spell_slots_8: 1, spell_slots_9: 1 },
  { caster_level: 20, spell_slots_1: 4, spell_slots_2: 3, spell_slots_3: 3, spell_slots_4: 3, spell_slots_5: 3, spell_slots_6: 2, spell_slots_7: 2, spell_slots_8: 1, spell_slots_9: 1 }
];

// Basic Spellcasting Focuses
const spellcastingFocuses = [
  {
    name: 'Arcane Focus',
    focus_type: 'arcane',
    compatible_classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
    cost_gp: 20,
    description: 'A special item—an orb, a crystal, a rod, a specially constructed staff, a wand-like length of wood, or some similar item—designed to channel the power of arcane spells.'
  },
  {
    name: 'Crystal',
    focus_type: 'arcane',
    compatible_classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
    cost_gp: 10,
    description: 'A crystalline focus for channeling arcane magic.'
  },
  {
    name: 'Druidcraft Focus',
    focus_type: 'druidic',
    compatible_classes: ['Druid', 'Ranger'],
    cost_gp: 0,
    description: 'A druidic focus might be a sprig of mistletoe, a yew wand, a staff, a totem, or some other focus.'
  },
  {
    name: 'Holy Symbol',
    focus_type: 'divine',
    compatible_classes: ['Cleric', 'Paladin'],
    cost_gp: 5,
    description: 'A holy symbol is a representation of a deity or celestial power. It might be an amulet depicting a symbol representing a deity, the same symbol carefully engraved or inlaid as an emblem on a shield, or a tiny box holding a fragment of a sacred relic.'
  },
  {
    name: 'Component Pouch',
    focus_type: 'component_pouch',
    compatible_classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'],
    cost_gp: 25,
    description: 'A component pouch is a small, watertight leather belt pouch that has compartments to hold all the material components and other special items you need to cast your spells, except for those components that have a specific cost.'
  }
];

async function seedLegacyTables(client: any) {
  console.log('Seeding legacy dnd_* tables...');

  // Seed legacy races table
  for (const race of races) {
    await client.query(
      `INSERT INTO dnd_races (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
      [race.name, race.description]
    );
  }

  // Seed legacy classes table
  for (const cls of classes) {
    await client.query(
      `INSERT INTO dnd_classes (name, hit_die, primary_ability, description) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
      [cls.name, cls.hit_die, cls.primary_ability, cls.description]
    );
  }

  // Seed legacy spells table
  for (const spell of essentialSpells) {
    await client.query(
      `INSERT INTO dnd_spells (name, level, school, description) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING`,
      [spell.name, spell.level, spell.school, spell.description]
    );
  }
}

async function seedSpellcastingTables(client: any) {
  console.log('Seeding spellcasting tables...');

  // Check if spellcasting tables exist
  const tablesExist = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'classes'
    ) as classes_exist,
    EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'spells'
    ) as spells_exist
  `);

  if (!tablesExist.rows[0].classes_exist || !tablesExist.rows[0].spells_exist) {
    console.log('Spellcasting tables do not exist, skipping advanced seeding...');
    return;
  }

  const classIds: { [key: string]: string } = {};

  // Seed classes table
  for (const cls of classes) {
    const result = await client.query(
      `INSERT INTO classes (
        name, hit_die, spellcasting_ability, caster_type, spell_slots_start_level,
        ritual_casting, spellcasting_focus_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (name) DO UPDATE SET
        hit_die = EXCLUDED.hit_die,
        spellcasting_ability = EXCLUDED.spellcasting_ability,
        caster_type = EXCLUDED.caster_type,
        spell_slots_start_level = EXCLUDED.spell_slots_start_level,
        ritual_casting = EXCLUDED.ritual_casting,
        spellcasting_focus_type = EXCLUDED.spellcasting_focus_type
      RETURNING id`,
      [cls.name, cls.hit_die, cls.spellcasting_ability, cls.caster_type,
       cls.spell_slots_start_level, cls.ritual_casting, cls.spellcasting_focus_type]
    );
    classIds[cls.name] = result.rows[0].id;
  }

  // Seed spells table
  const spellIds: { [key: string]: string } = {};
  for (const spell of essentialSpells) {
    const result = await client.query(
      `INSERT INTO spells (
        name, level, school, casting_time, range_text, duration, concentration, ritual,
        components_verbal, components_somatic, components_material, material_components,
        description, higher_level_text, damage_at_slot_level, damage_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (name) DO UPDATE SET
        level = EXCLUDED.level,
        school = EXCLUDED.school,
        casting_time = EXCLUDED.casting_time,
        range_text = EXCLUDED.range_text,
        duration = EXCLUDED.duration,
        concentration = EXCLUDED.concentration,
        ritual = EXCLUDED.ritual,
        components_verbal = EXCLUDED.components_verbal,
        components_somatic = EXCLUDED.components_somatic,
        components_material = EXCLUDED.components_material,
        material_components = EXCLUDED.material_components,
        description = EXCLUDED.description,
        higher_level_text = EXCLUDED.higher_level_text,
        damage_at_slot_level = EXCLUDED.damage_at_slot_level,
        damage_type = EXCLUDED.damage_type
      RETURNING id`,
      [
        spell.name, spell.level, spell.school, spell.casting_time, spell.range_text,
        spell.duration, spell.concentration, spell.ritual, spell.components_verbal,
        spell.components_somatic, spell.components_material, spell.material_components || null,
        spell.description, spell.higher_level_text || null,
        spell.damage_at_slot_level ? JSON.stringify(spell.damage_at_slot_level) : null,
        spell.damage_type || null
      ]
    );
    spellIds[spell.name] = result.rows[0].id;
  }

  // Seed multiclass spell slots
  for (const slots of multiclassSpellSlots) {
    await client.query(
      `INSERT INTO multiclass_spell_slots (
        caster_level, spell_slots_1, spell_slots_2, spell_slots_3, spell_slots_4, spell_slots_5,
        spell_slots_6, spell_slots_7, spell_slots_8, spell_slots_9
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (caster_level) DO UPDATE SET
        spell_slots_1 = EXCLUDED.spell_slots_1,
        spell_slots_2 = EXCLUDED.spell_slots_2,
        spell_slots_3 = EXCLUDED.spell_slots_3,
        spell_slots_4 = EXCLUDED.spell_slots_4,
        spell_slots_5 = EXCLUDED.spell_slots_5,
        spell_slots_6 = EXCLUDED.spell_slots_6,
        spell_slots_7 = EXCLUDED.spell_slots_7,
        spell_slots_8 = EXCLUDED.spell_slots_8,
        spell_slots_9 = EXCLUDED.spell_slots_9`,
      [
        slots.caster_level, slots.spell_slots_1 || 0, slots.spell_slots_2 || 0,
        slots.spell_slots_3 || 0, slots.spell_slots_4 || 0, slots.spell_slots_5 || 0,
        slots.spell_slots_6 || 0, slots.spell_slots_7 || 0, slots.spell_slots_8 || 0,
        slots.spell_slots_9 || 0
      ]
    );
  }

  // Seed spellcasting focuses
  for (const focus of spellcastingFocuses) {
    await client.query(
      `INSERT INTO spellcasting_focuses (
        name, focus_type, compatible_classes, cost_gp, description
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE SET
        focus_type = EXCLUDED.focus_type,
        compatible_classes = EXCLUDED.compatible_classes,
        cost_gp = EXCLUDED.cost_gp,
        description = EXCLUDED.description`,
      [
        focus.name, focus.focus_type, JSON.stringify(focus.compatible_classes),
        focus.cost_gp, focus.description
      ]
    );
  }

  // Create some basic class-spell relationships for essential spells
  const spellClassMappings = [
    { spell: 'Light', classes: ['Bard', 'Cleric', 'Sorcerer', 'Wizard'] },
    { spell: 'Guidance', classes: ['Cleric', 'Druid'] },
    { spell: 'Sacred Flame', classes: ['Cleric'] },
    { spell: 'Bless', classes: ['Cleric', 'Paladin'] },
    { spell: 'Magic Missile', classes: ['Sorcerer', 'Wizard'] }
  ];

  for (const mapping of spellClassMappings) {
    if (spellIds[mapping.spell]) {
      for (const className of mapping.classes) {
        if (classIds[className]) {
          await client.query(
            `INSERT INTO class_spells (class_id, spell_id, spell_level, source_feature)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (class_id, spell_id, source_feature) DO NOTHING`,
            [classIds[className], spellIds[mapping.spell], essentialSpells.find(s => s.name === mapping.spell)?.level, 'base']
          );
        }
      }
    }
  }
}

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Aborting seed.');
    process.exit(1);
  }

  const db = createClient();
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    console.log('Starting comprehensive D&D 5E database seeding...');

    // Always seed legacy tables for backward compatibility
    await seedLegacyTables(client);

    // Seed new spellcasting tables if they exist
    await seedSpellcastingTables(client);

    await client.query('COMMIT');
    console.log('✅ Comprehensive seeding completed successfully!');
    console.log(`📊 Seeding Summary:`);
    console.log(`   • Classes: ${classes.length} seeded`);
    console.log(`   • Races: ${races.length} seeded`);
    console.log(`   • Essential Spells: ${essentialSpells.length} seeded`);
    console.log(`   • Multiclass Spell Slots: ${multiclassSpellSlots.length} levels configured`);
    console.log(`   • Spellcasting Focuses: ${spellcastingFocuses.length} seeded`);
    console.log(`   • Legacy tables: ✅ Populated`);
    console.log(`   • Spellcasting tables: ✅ Populated (if they exist)`);

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Comprehensive seeding failed:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.end();
  }
}

run();