import type { Spell } from '@/types/character';

import { getClassSpells, allSpells, cantrips, firstLevelSpells } from '@/data/spellOptions';

interface SpellProgression {
  character_level: number;
  cantrips_known: number;
  spells_known?: number;
  spells_prepared_formula?: string;
  spell_slots_1: number;
  spell_slots_2: number;
  spell_slots_3: number;
  spell_slots_4: number;
  spell_slots_5: number;
  spell_slots_6: number;
  spell_slots_7: number;
  spell_slots_8: number;
  spell_slots_9: number;
}

interface SpellcastingClass {
  id: string;
  name: string;
  spellcasting_ability: string;
  caster_type: 'full' | 'half' | 'third' | 'pact';
  spell_slots_start_level: number;
}

interface MulticlassSpellSlots {
  caster_level: number;
  spell_slots_1: number;
  spell_slots_2: number;
  spell_slots_3: number;
  spell_slots_4: number;
  spell_slots_5: number;
  spell_slots_6: number;
  spell_slots_7: number;
  spell_slots_8: number;
  spell_slots_9: number;
}

interface MulticlassCalculation {
  totalCasterLevel: number;
  spellSlots: MulticlassSpellSlots | null;
  pactMagicSlots: { level: number; slots: number } | null;
}

interface ApiSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  ritual: boolean;
  concentration: boolean;
  casting_time: string;
  range_text: string;
  duration: string;
  description: string;
  components_verbal: boolean;
  components_somatic: boolean;
  components_material: boolean;
  material_components?: string;
  attack_save?: string;
  damage_effect?: string;
  available_classes?: string[];
  source_feature?: string;
}

// Convert frontend Spell to API-compatible format
function convertSpellToApiFormat(spell: Spell): ApiSpell {
  return {
    id: spell.id,
    name: spell.name,
    level: spell.level,
    school: spell.school,
    ritual: spell.ritual || false,
    concentration: spell.concentration || false,
    casting_time: spell.castingTime,
    range_text: spell.range,
    duration: spell.duration,
    description: spell.description,
    components_verbal: spell.verbal || false,
    components_somatic: spell.somatic || false,
    components_material: spell.material || false,
    material_components: spell.materialComponents || spell.materialDescription || '',
    attack_save: spell.attackSave || '',
    damage_effect: spell.damageEffect || spell.damage || '',
    available_classes: [], // Could be populated if needed
  };
}

// Standard D&D 5E spell progression tables
const spellProgressionTables: Record<string, SpellProgression[]> = {
  Wizard: [
    {
      character_level: 1,
      cantrips_known: 3,
      spells_prepared_formula: '1 + Int modifier',
      spell_slots_1: 2,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 2,
      cantrips_known: 3,
      spells_prepared_formula: '2 + Int modifier',
      spell_slots_1: 3,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 3,
      cantrips_known: 3,
      spells_prepared_formula: '3 + Int modifier',
      spell_slots_1: 4,
      spell_slots_2: 2,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 4,
      cantrips_known: 4,
      spells_prepared_formula: '4 + Int modifier',
      spell_slots_1: 4,
      spell_slots_2: 3,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 5,
      cantrips_known: 4,
      spells_prepared_formula: '5 + Int modifier',
      spell_slots_1: 4,
      spell_slots_2: 3,
      spell_slots_3: 2,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
  ],
  Sorcerer: [
    {
      character_level: 1,
      cantrips_known: 4,
      spells_known: 2,
      spell_slots_1: 2,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 2,
      cantrips_known: 4,
      spells_known: 3,
      spell_slots_1: 3,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 3,
      cantrips_known: 4,
      spells_known: 4,
      spell_slots_1: 4,
      spell_slots_2: 2,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
  ],
  Warlock: [
    {
      character_level: 1,
      cantrips_known: 2,
      spells_known: 2,
      spell_slots_1: 1,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 2,
      cantrips_known: 2,
      spells_known: 3,
      spell_slots_1: 2,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
  ],
  Bard: [
    {
      character_level: 1,
      cantrips_known: 2,
      spells_known: 4,
      spell_slots_1: 2,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 2,
      cantrips_known: 2,
      spells_known: 5,
      spell_slots_1: 3,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
  ],
  Cleric: [
    {
      character_level: 1,
      cantrips_known: 3,
      spells_prepared_formula: '1 + Wis modifier',
      spell_slots_1: 2,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 2,
      cantrips_known: 3,
      spells_prepared_formula: '2 + Wis modifier',
      spell_slots_1: 3,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
  ],
  Druid: [
    {
      character_level: 1,
      cantrips_known: 2,
      spells_prepared_formula: '1 + Wis modifier',
      spell_slots_1: 2,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
    {
      character_level: 2,
      cantrips_known: 2,
      spells_prepared_formula: '2 + Wis modifier',
      spell_slots_1: 3,
      spell_slots_2: 0,
      spell_slots_3: 0,
      spell_slots_4: 0,
      spell_slots_5: 0,
      spell_slots_6: 0,
      spell_slots_7: 0,
      spell_slots_8: 0,
      spell_slots_9: 0,
    },
  ],
};

const spellcastingClasses: SpellcastingClass[] = [
  {
    id: 'wizard',
    name: 'Wizard',
    spellcasting_ability: 'Intelligence',
    caster_type: 'full',
    spell_slots_start_level: 1,
  },
  {
    id: 'sorcerer',
    name: 'Sorcerer',
    spellcasting_ability: 'Charisma',
    caster_type: 'full',
    spell_slots_start_level: 1,
  },
  {
    id: 'warlock',
    name: 'Warlock',
    spellcasting_ability: 'Charisma',
    caster_type: 'pact',
    spell_slots_start_level: 1,
  },
  {
    id: 'bard',
    name: 'Bard',
    spellcasting_ability: 'Charisma',
    caster_type: 'full',
    spell_slots_start_level: 1,
  },
  {
    id: 'cleric',
    name: 'Cleric',
    spellcasting_ability: 'Wisdom',
    caster_type: 'full',
    spell_slots_start_level: 1,
  },
  {
    id: 'druid',
    name: 'Druid',
    spellcasting_ability: 'Wisdom',
    caster_type: 'full',
    spell_slots_start_level: 1,
  },
];

class LocalSpellService {
  // Get all spells with optional filtering
  async getAllSpells(filters?: {
    level?: number;
    school?: string;
    class?: string;
    ritual?: boolean;
    components?: string;
  }): Promise<Spell[]> {
    let filteredSpells = [...allSpells];

    if (filters?.level !== undefined) {
      filteredSpells = filteredSpells.filter((spell) => spell.level === filters.level);
    }

    if (filters?.school) {
      filteredSpells = filteredSpells.filter((spell) => spell.school === filters.school);
    }

    if (filters?.ritual !== undefined) {
      filteredSpells = filteredSpells.filter((spell) => spell.ritual === filters.ritual);
    }

    if (filters?.class) {
      const classSpells = getClassSpells(filters.class);
      const classSpellIds = new Set([
        ...classSpells.cantrips.map((s) => s.id),
        ...classSpells.spells.map((s) => s.id),
      ]);
      filteredSpells = filteredSpells.filter((spell) => classSpellIds.has(spell.id));
    }

    return filteredSpells;
  }

  // Get spells available to a specific class at a specific level
  async getClassSpells(
    className: string,
    level: number = 1,
  ): Promise<{ cantrips: Spell[]; spells: Spell[] }> {
    const classSpells = getClassSpells(className);

    // For character creation, we typically show all available spells regardless of character level
    // The level parameter could be used for higher-level spell access in the future
    return {
      cantrips: classSpells.cantrips,
      spells: classSpells.spells,
    };
  }

  // Get spell progression for a class
  async getSpellProgression(className: string): Promise<SpellProgression[]> {
    return spellProgressionTables[className] || [];
  }

  // Get multiclass spell slots
  async getMulticlassSpellSlots(casterLevel: number): Promise<MulticlassSpellSlots> {
    // Standard multiclass spell slot table
    const spellSlotTable: Record<number, MulticlassSpellSlots> = {
      1: {
        caster_level: 1,
        spell_slots_1: 2,
        spell_slots_2: 0,
        spell_slots_3: 0,
        spell_slots_4: 0,
        spell_slots_5: 0,
        spell_slots_6: 0,
        spell_slots_7: 0,
        spell_slots_8: 0,
        spell_slots_9: 0,
      },
      2: {
        caster_level: 2,
        spell_slots_1: 3,
        spell_slots_2: 0,
        spell_slots_3: 0,
        spell_slots_4: 0,
        spell_slots_5: 0,
        spell_slots_6: 0,
        spell_slots_7: 0,
        spell_slots_8: 0,
        spell_slots_9: 0,
      },
      3: {
        caster_level: 3,
        spell_slots_1: 4,
        spell_slots_2: 2,
        spell_slots_3: 0,
        spell_slots_4: 0,
        spell_slots_5: 0,
        spell_slots_6: 0,
        spell_slots_7: 0,
        spell_slots_8: 0,
        spell_slots_9: 0,
      },
      4: {
        caster_level: 4,
        spell_slots_1: 4,
        spell_slots_2: 3,
        spell_slots_3: 0,
        spell_slots_4: 0,
        spell_slots_5: 0,
        spell_slots_6: 0,
        spell_slots_7: 0,
        spell_slots_8: 0,
        spell_slots_9: 0,
      },
      5: {
        caster_level: 5,
        spell_slots_1: 4,
        spell_slots_2: 3,
        spell_slots_3: 2,
        spell_slots_4: 0,
        spell_slots_5: 0,
        spell_slots_6: 0,
        spell_slots_7: 0,
        spell_slots_8: 0,
        spell_slots_9: 0,
      },
    };

    return spellSlotTable[casterLevel] || spellSlotTable[1];
  }

  // Get all spellcasting classes
  async getSpellcastingClasses(): Promise<SpellcastingClass[]> {
    return spellcastingClasses;
  }

  // Calculate multiclass caster level and spell slots
  async calculateMulticlassCasterLevel(
    classLevels: { className: string; level: number }[],
  ): Promise<MulticlassCalculation> {
    let totalCasterLevel = 0;
    let pactMagicSlots: { level: number; slots: number } | null = null;

    classLevels.forEach(({ className, level }) => {
      const spellcastingClass = spellcastingClasses.find((c) => c.name === className);
      if (spellcastingClass) {
        if (spellcastingClass.caster_type === 'full') {
          totalCasterLevel += level;
        } else if (spellcastingClass.caster_type === 'half') {
          totalCasterLevel += Math.floor(level / 2);
        } else if (spellcastingClass.caster_type === 'third') {
          totalCasterLevel += Math.floor(level / 3);
        } else if (spellcastingClass.caster_type === 'pact') {
          // Warlock uses pact magic, doesn't contribute to multiclass caster level
          pactMagicSlots = {
            level: Math.min(5, Math.ceil(level / 2)),
            slots: level < 2 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4,
          };
        }
      }
    });

    const spellSlots =
      totalCasterLevel > 0 ? await this.getMulticlassSpellSlots(totalCasterLevel) : null;

    return {
      totalCasterLevel,
      spellSlots,
      pactMagicSlots,
    };
  }

  // Get a specific spell by ID
  async getSpellById(spellId: string): Promise<Spell> {
    const spell = allSpells.find((s) => s.id === spellId);
    if (!spell) {
      throw new Error(`Spell with ID ${spellId} not found`);
    }
    return spell;
  }
}

// Export singleton instance
export const localSpellService = new LocalSpellService();

// Export types for use in other files
export type { SpellProgression, SpellcastingClass, MulticlassSpellSlots, MulticlassCalculation };
