import 'dotenv/config';
import { createClient } from '../lib/db.js';
import { classes } from '../data/seeds/classes.js';
import { races } from '../data/seeds/races.js';
import { essentialSpells } from '../data/seeds/essentialSpells.js';
import { multiclassSpellSlots } from '../data/seeds/multiclassSpellSlots.js';
import { spellcastingFocuses } from '../data/seeds/spellcastingFocuses.js';

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

// Data moved to server/src/data/seeds/*.ts

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