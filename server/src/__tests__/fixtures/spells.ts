/**
 * Spell Slot Test Fixtures
 *
 * Pre-configured spell slot data for unit tests
 * Based on D&D 5E spell slot mechanics
 */

/**
 * Character Spell Slot interface (from Supabase schema)
 */
export interface CharacterSpellSlot {
  id: string;
  character_id: string;
  spell_level: number;
  total_slots: number;
  used_slots: number;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Spell Slot Usage Log interface (from Supabase schema)
 */
export interface SpellSlotUsageLog {
  id: string;
  character_id: string;
  session_id?: string;
  spell_name: string;
  spell_level: number;
  slot_level_used: number;
  timestamp: Date;
}

/**
 * Level 5 Wizard spell slots (full caster)
 * PHB pg. 114: Level 5 = 4 1st, 3 2nd, 2 3rd level slots
 */
export const wizardLevel5SpellSlots: CharacterSpellSlot[] = [
  {
    id: 'fixture-spell-slot-wizard-1',
    character_id: 'fixture-wizard-5',
    spell_level: 1,
    total_slots: 4,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'fixture-spell-slot-wizard-2',
    character_id: 'fixture-wizard-5',
    spell_level: 2,
    total_slots: 3,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'fixture-spell-slot-wizard-3',
    character_id: 'fixture-wizard-5',
    spell_level: 3,
    total_slots: 2,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
];

/**
 * Wizard with some slots used
 */
export const wizardLevel5SpellSlotsPartiallyUsed: CharacterSpellSlot[] = [
  {
    id: 'fixture-spell-slot-wizard-1',
    character_id: 'fixture-wizard-5',
    spell_level: 1,
    total_slots: 4,
    used_slots: 2,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'fixture-spell-slot-wizard-2',
    character_id: 'fixture-wizard-5',
    spell_level: 2,
    total_slots: 3,
    used_slots: 1,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'fixture-spell-slot-wizard-3',
    character_id: 'fixture-wizard-5',
    spell_level: 3,
    total_slots: 2,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
];

/**
 * Level 10 Paladin spell slots (half caster)
 * Half casters divide level by 2: level 10 / 2 = 5 caster level
 * Level 5 caster = 4 1st, 3 2nd, 2 3rd level slots
 */
export const paladinLevel10SpellSlots: CharacterSpellSlot[] = [
  {
    id: 'fixture-spell-slot-paladin-1',
    character_id: 'fixture-paladin-10',
    spell_level: 1,
    total_slots: 4,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'fixture-spell-slot-paladin-2',
    character_id: 'fixture-paladin-10',
    spell_level: 2,
    total_slots: 3,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'fixture-spell-slot-paladin-3',
    character_id: 'fixture-paladin-10',
    spell_level: 3,
    total_slots: 2,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
];

/**
 * Level 1 Cleric spell slots (starting caster)
 * Level 1 = 2 1st level slots
 */
export const clericLevel1SpellSlots: CharacterSpellSlot[] = [
  {
    id: 'fixture-spell-slot-cleric-1',
    character_id: 'fixture-cleric-1',
    spell_level: 1,
    total_slots: 2,
    used_slots: 0,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
];

/**
 * Sample spell slot usage logs
 */
export const sampleUsageLog: SpellSlotUsageLog[] = [
  {
    id: 'fixture-usage-log-1',
    character_id: 'fixture-wizard-5',
    session_id: 'fixture-session-1',
    spell_name: 'Magic Missile',
    spell_level: 1,
    slot_level_used: 1,
    timestamp: new Date('2024-01-01T10:00:00Z'),
  },
  {
    id: 'fixture-usage-log-2',
    character_id: 'fixture-wizard-5',
    session_id: 'fixture-session-1',
    spell_name: 'Fireball',
    spell_level: 3,
    slot_level_used: 3,
    timestamp: new Date('2024-01-01T10:15:00Z'),
  },
  {
    id: 'fixture-usage-log-3',
    character_id: 'fixture-wizard-5',
    session_id: 'fixture-session-1',
    spell_name: 'Magic Missile',
    spell_level: 1,
    slot_level_used: 2, // Upcast to level 2
    timestamp: new Date('2024-01-01T10:30:00Z'),
  },
];

/**
 * Exported collection of all spell slot fixtures
 */
export const spellSlots = {
  wizardLevel5: wizardLevel5SpellSlots,
  wizardLevel5PartiallyUsed: wizardLevel5SpellSlotsPartiallyUsed,
  paladinLevel10: paladinLevel10SpellSlots,
  clericLevel1: clericLevel1SpellSlots,
  usageLog: sampleUsageLog,
};
