/**
 * Spell Lookup Service
 *
 * Provides utilities to lookup full spell objects from spell IDs stored in character data.
 * Handles both kebab-case IDs and UUID mappings for database compatibility.
 *
 * @author AI Dungeon Master Team
 */

import { REVERSE_SPELL_ID_MAPPING } from './spell-id-mapping';

import type { Spell, Character } from '@/types/character';

import { allSpells } from '@/data/spellOptions';
import logger from '@/lib/logger';

/**
 * Interface for character spell data
 */
export interface CharacterSpellDisplay extends Spell {
  is_prepared?: boolean;
  source_feature?: string;
}

/**
 * Lookup a spell by ID (supports both kebab-case and UUID formats)
 * @param spellId - The spell ID to lookup
 * @param createFallback - Whether to create a fallback spell if not found (default: true)
 * @returns Spell object or fallback spell if not found
 */
export function getSpellById(spellId: string, createFallback: boolean = true): Spell | null {
  if (!spellId) return null;

  try {
    // First try direct lookup by kebab-case ID
    const spell = allSpells.find((spell) => spell?.id === spellId);
    if (spell) return spell;

    // If not found, check if it's a UUID that needs mapping to kebab-case
    const kebabId = REVERSE_SPELL_ID_MAPPING[spellId];
    if (kebabId) {
      const mappedSpell = allSpells.find((spell) => spell?.id === kebabId);
      if (mappedSpell) return mappedSpell;
    }

    // Log missing spells for debugging
    logger.warn(`[SpellLookup] Spell not found: ${spellId}`, {
      directLookup: !!spell,
      uuidMapping: kebabId,
      availableSpellCount: allSpells?.length || 0,
      createFallback,
    });

    // Return a fallback spell if requested
    if (createFallback) {
      return createFallbackSpell(spellId);
    }

    return null;
  } catch (error) {
    logger.error(`[SpellLookup] Error looking up spell ${spellId}:`, error);

    // Return fallback spell on error if requested
    if (createFallback) {
      return createFallbackSpell(spellId);
    }

    return null;
  }
}

/**
 * Lookup multiple spells by their IDs
 * @param spellIds - Array of spell IDs
 * @param createFallback - Whether to create fallback spells for missing IDs (default: true)
 * @returns Array of spell objects (with fallbacks if enabled)
 */
export function getSpellsByIds(spellIds: string[], createFallback: boolean = true): Spell[] {
  if (!Array.isArray(spellIds) || spellIds.length === 0) {
    logger.warn('[SpellLookup] Invalid or empty spellIds array provided');
    return [];
  }

  try {
    const spells = spellIds
      .filter((id) => id && typeof id === 'string') // Filter out invalid IDs
      .map((id) => getSpellById(id, createFallback))
      .filter((spell): spell is Spell => spell !== null);

    const foundCount = spells.length;
    const requestedCount = spellIds.length;
    const validIdCount = spellIds.filter((id) => id && typeof id === 'string').length;

    if (foundCount < validIdCount) {
      const foundIds = spells.map((s) => s.id);
      const missingIds = spellIds.filter(
        (id) => id && typeof id === 'string' && !foundIds.includes(id),
      );

      logger.info(`[SpellLookup] Found ${foundCount}/${validIdCount} spells`, {
        requested: spellIds,
        found: foundIds,
        missing: missingIds,
        createFallback,
      });
    } else {
      logger.info(`[SpellLookup] Successfully found all ${foundCount} spells`);
    }

    return spells;
  } catch (error) {
    logger.error('[SpellLookup] Error in getSpellsByIds:', error);
    return [];
  }
}

/**
 * Get character spells organized by type
 * @param character - Character object with spell arrays
 * @returns Organized spell data for display
 */
export function getCharacterSpells(character: any): {
  cantrips: CharacterSpellDisplay[];
  knownSpells: CharacterSpellDisplay[];
  preparedSpells: CharacterSpellDisplay[];
  ritualSpells: CharacterSpellDisplay[];
  allSpells: CharacterSpellDisplay[];
} {
  type CharacterWithSpells = Pick<
    Character,
    'name' | 'cantrips' | 'knownSpells' | 'preparedSpells' | 'ritualSpells'
  >;
  const c = character as CharacterWithSpells | null;
  // Validate character input
  if (!c || typeof c !== 'object') {
    logger.warn('[SpellLookup] Invalid character object provided');
    return {
      cantrips: [],
      knownSpells: [],
      preparedSpells: [],
      ritualSpells: [],
      allSpells: [],
    };
  }

  try {
    logger.info('[SpellLookup] Processing character spells:', {
      cantrips: c?.cantrips?.length || 0,
      knownSpells: c?.knownSpells?.length || 0,
      preparedSpells: c?.preparedSpells?.length || 0,
      ritualSpells: c?.ritualSpells?.length || 0,
      characterName: c?.name || 'Unknown',
    });

    // Get spells from each category with error handling
    const cantrips = getSpellsByIds(c?.cantrips || [], true).map((spell) => ({
      ...spell,
      source_feature: 'Class Cantrips',
    }));

    const knownSpells = getSpellsByIds(c?.knownSpells || [], true).map((spell) => ({
      ...spell,
      source_feature: 'Known Spells',
    }));

    const preparedSpells = getSpellsByIds(c?.preparedSpells || [], true).map((spell) => ({
      ...spell,
      is_prepared: true,
      source_feature: 'Prepared Spells',
    }));

    const ritualSpells = getSpellsByIds(c?.ritualSpells || [], true).map((spell) => ({
      ...spell,
      source_feature: 'Ritual Spells',
    }));

    // Combine all spells, avoiding duplicates
    const allSpellsMap = new Map<string, CharacterSpellDisplay>();

    [...cantrips, ...knownSpells, ...preparedSpells, ...ritualSpells].forEach((spell) => {
      if (!spell?.id) {
        logger.warn('[SpellLookup] Skipping spell without valid ID:', spell);
        return;
      }

      const existingSpell = allSpellsMap.get(spell.id);
      if (existingSpell) {
        // Merge properties, preferring prepared status and combining sources
        const sources = [existingSpell.source_feature, spell.source_feature]
          .filter(Boolean)
          .filter((value, index, array) => array.indexOf(value) === index);

        allSpellsMap.set(spell.id, {
          ...existingSpell,
          is_prepared: existingSpell.is_prepared || spell.is_prepared,
          source_feature: sources.join(', '),
        });
      } else {
        allSpellsMap.set(spell.id, spell);
      }
    });

    const allSpells = Array.from(allSpellsMap.values());

    logger.info('[SpellLookup] Character spells processed:', {
      cantripsFound: cantrips.length,
      knownSpellsFound: knownSpells.length,
      preparedSpellsFound: preparedSpells.length,
      ritualSpellsFound: ritualSpells.length,
      totalUniqueSpells: allSpells.length,
      spellNames: allSpells.map((s) => s?.name || 'Unknown').slice(0, 10), // Limit log size
    });

    return {
      cantrips,
      knownSpells,
      preparedSpells,
      ritualSpells,
      allSpells,
    };
  } catch (error) {
    logger.error('[SpellLookup] Error processing character spells:', error);

    // Return empty arrays on error
    return {
      cantrips: [],
      knownSpells: [],
      preparedSpells: [],
      ritualSpells: [],
      allSpells: [],
    };
  }
}

/**
 * Create a fallback spell object for missing spells
 * @param spellId - The missing spell ID
 * @returns Basic spell object
 */
export function createFallbackSpell(spellId: string): Spell {
  return {
    id: spellId,
    name: spellId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    level: 0,
    school: 'Unknown',
    castingTime: 'Unknown',
    range: 'Unknown',
    components: 'Unknown',
    verbal: false,
    somatic: false,
    material: false,
    duration: 'Unknown',
    description: 'Spell data not available. This spell may need to be added to the spell database.',
    concentration: false,
    ritual: false,
  };
}

/**
 * Get all available spells for reference
 * @returns All spells in the database
 */
export function getAllSpells(): Spell[] {
  return [...allSpells];
}

/**
 * Search spells by name, school, or level
 * @param query - Search query
 * @param level - Optional level filter
 * @returns Filtered spell array
 */
export function searchSpells(query: string, level?: number): Spell[] {
  const searchTerm = query.toLowerCase();

  return allSpells.filter((spell) => {
    const matchesQuery =
      spell.name.toLowerCase().includes(searchTerm) ||
      spell.school.toLowerCase().includes(searchTerm) ||
      spell.description.toLowerCase().includes(searchTerm);

    const matchesLevel = level === undefined || spell.level === level;

    return matchesQuery && matchesLevel;
  });
}
