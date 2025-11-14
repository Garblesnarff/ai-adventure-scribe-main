import { cantrips } from './cantrips';
import { firstLevelSpells } from './level1';
import { classSpellMappings } from './mappings';
import { logger } from '../../lib/logger';

import type { Spell } from '@/types/character';

export const allSpells: Spell[] = [...cantrips, ...firstLevelSpells];

export const getClassSpells = (className: string): { cantrips: Spell[]; spells: Spell[] } => {
  const normalizedClassName = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
  const mapping = (classSpellMappings as any)[normalizedClassName];

  // Debug logging for troubleshooting spell loading issues
  if (process.env.NODE_ENV === 'development') {
    logger.debug(
      `🔍 [getClassSpells] Looking up spells for: ${className} -> ${normalizedClassName}`,
    );
    logger.debug(`📊 [getClassSpells] Available mappings:`, Object.keys(classSpellMappings));
    logger.debug(`📋 [getClassSpells] Mapping found:`, !!mapping);
    if (mapping) {
      logger.debug(
        `🎯 [getClassSpells] Expected cantrips: ${mapping.cantrips.length}, spells: ${mapping.spells.length}`,
      );
    }
  }

  if (!mapping) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn(`⚠️ [getClassSpells] No mapping found for class: ${normalizedClassName}`);
    }
    return { cantrips: [], spells: [] };
  }

  const resultCantrips = cantrips.filter((spell) => mapping.cantrips.includes(spell.id));
  const resultSpells = firstLevelSpells.filter((spell) => mapping.spells.includes(spell.id));

  if (process.env.NODE_ENV === 'development') {
    logger.debug(`✅ [getClassSpells] ${normalizedClassName} results:`, {
      cantrips: resultCantrips.length,
      spells: resultSpells.length,
      totalAvailable: `cantrips: ${cantrips.length}, spells: ${firstLevelSpells.length}`,
      missingCantrips: mapping.cantrips.filter((id) => !cantrips.some((spell) => spell.id === id)),
      missingSpells: mapping.spells.filter(
        (id) => !firstLevelSpells.some((spell) => spell.id === id),
      ),
    });
  }

  return {
    cantrips: resultCantrips,
    spells: resultSpells,
  };
};

export const getSpellsBySchool = (school: string): Spell[] =>
  allSpells.filter((spell) => spell.school === school);
export const getSpellsByLevel = (level: number): Spell[] =>
  allSpells.filter((spell) => spell.level === level);
export const getRitualSpells = (): Spell[] => allSpells.filter((spell) => spell.ritual);
export const getConcentrationSpells = (): Spell[] =>
  allSpells.filter((spell) => spell.concentration);

export const searchSpells = (query: string): Spell[] => {
  const q = query.toLowerCase();
  return allSpells.filter(
    (spell) => spell.name.toLowerCase().includes(q) || spell.description.toLowerCase().includes(q),
  );
};

export const getSpellById = (id: string): Spell | undefined =>
  allSpells.find((spell) => spell.id === id);

export const validateSpellSelection = (
  className: string,
  selectedCantrips: string[],
  selectedSpells: string[],
): { valid: boolean; errors: string[] } => {
  const classSpells = getClassSpells(className);
  const errors: string[] = [];
  selectedCantrips.forEach((id) => {
    if (!classSpells.cantrips.some((c) => c.id === id))
      errors.push(`${id} is not available as a cantrip for ${className}`);
  });
  selectedSpells.forEach((id) => {
    if (!classSpells.spells.some((s) => s.id === id))
      errors.push(`${id} is not available as a 1st level spell for ${className}`);
  });
  return { valid: errors.length === 0, errors };
};
