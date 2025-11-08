/**
 * D&D Reference Data Schema
 *
 * Database tables for D&D 5E reference data.
 * Includes classes, races, spells, and their relationships.
 */
import { pgTable, uuid, text, timestamp, jsonb, index, integer, boolean } from 'drizzle-orm/pg-core';
/**
 * Classes Table
 * D&D 5E class definitions with spellcasting information
 */
export const classes = pgTable('classes', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    hitDie: integer('hit_die').notNull(),
    spellcastingAbility: text('spellcasting_ability'), // 'INT', 'WIS', 'CHA', or NULL
    casterType: text('caster_type'), // 'full', 'half', 'third', 'pact', or NULL
    spellSlotsStartLevel: integer('spell_slots_start_level').default(1),
    ritualCasting: boolean('ritual_casting').default(false),
    spellcastingFocusType: text('spellcasting_focus_type'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    nameIdx: index('idx_classes_name').on(table.name),
    casterTypeIdx: index('idx_classes_caster_type').on(table.casterType),
}));
/**
 * Races Table
 * D&D 5E race definitions with traits
 */
export const races = pgTable('races', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    description: text('description'),
    abilityScoreIncreases: jsonb('ability_score_increases'), // e.g., {"str": 2, "dex": 1}
    traits: jsonb('traits'), // Array of racial traits
    speed: integer('speed').default(30),
    size: text('size').default('Medium'),
    languages: text('languages').array(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    nameIdx: index('idx_races_name').on(table.name),
}));
/**
 * Spells Table
 * Complete D&D 5E spell database with all mechanics
 */
export const spells = pgTable('spells', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    level: integer('level').notNull(), // 0 for cantrips, 1-9 for leveled spells
    school: text('school').notNull(),
    castingTime: text('casting_time').notNull(),
    rangeText: text('range_text').notNull(),
    duration: text('duration').notNull(),
    concentration: boolean('concentration').default(false),
    ritual: boolean('ritual').default(false),
    componentsVerbal: boolean('components_verbal').default(false),
    componentsSomatic: boolean('components_somatic').default(false),
    componentsMaterial: boolean('components_material').default(false),
    materialComponents: text('material_components'),
    materialCostGp: integer('material_cost_gp').default(0),
    materialConsumed: boolean('material_consumed').default(false),
    description: text('description').notNull(),
    higherLevelText: text('higher_level_text'),
    attackType: text('attack_type'), // 'melee', 'ranged', or NULL
    damageType: text('damage_type'),
    damageAtSlotLevel: jsonb('damage_at_slot_level'),
    healAtSlotLevel: jsonb('heal_at_slot_level'),
    areaOfEffect: jsonb('area_of_effect'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    nameIdx: index('idx_spells_name').on(table.name),
    levelIdx: index('idx_spells_level').on(table.level),
    schoolIdx: index('idx_spells_school').on(table.school),
    levelSchoolIdx: index('idx_spells_level_school').on(table.level, table.school),
}));
/**
 * Class Spells Junction Table
 * Many-to-many relationship between classes and their available spells
 */
export const classSpells = pgTable('class_spells', {
    id: uuid('id').primaryKey().defaultRandom(),
    classId: uuid('class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
    spellId: uuid('spell_id').notNull().references(() => spells.id, { onDelete: 'cascade' }),
    spellLevel: integer('spell_level').notNull(),
    sourceFeature: text('source_feature').default('base'), // 'base', 'domain', 'oath', etc.
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    classIdIdx: index('idx_class_spells_class_id').on(table.classId),
    spellIdIdx: index('idx_class_spells_spell_id').on(table.spellId),
}));
/**
 * Character Spells Junction Table
 * Individual character spell selections and preparation status
 * Note: characterId foreign key is not enforced in Drizzle to avoid circular dependency
 */
export const characterSpells = pgTable('character_spells', {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id').notNull(), // References characters.id (not enforced in Drizzle)
    spellId: uuid('spell_id').notNull().references(() => spells.id, { onDelete: 'cascade' }),
    sourceClassId: uuid('source_class_id').notNull().references(() => classes.id, { onDelete: 'cascade' }),
    isPrepared: boolean('is_prepared').default(true),
    isAlwaysPrepared: boolean('is_always_prepared').default(false),
    sourceFeature: text('source_feature').default('base'),
    spellLevelLearned: integer('spell_level_learned'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
}, (table) => ({
    characterIdIdx: index('idx_character_spells_character_id').on(table.characterId),
    spellIdIdx: index('idx_character_spells_spell_id').on(table.spellId),
}));
