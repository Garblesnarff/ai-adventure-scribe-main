import { Spell } from '@/types/character';
import { cantrips } from './cantrips';
import { firstLevelSpells } from './level1';
import { classSpellMappings } from './mappings';

export const allSpells: Spell[] = [...cantrips, ...firstLevelSpells];

export const getClassSpells = (className: string): { cantrips: Spell[]; spells: Spell[] } => {
  const normalizedClassName = className.charAt(0).toUpperCase() + className.slice(1).toLowerCase();
  const mapping = (classSpellMappings as any)[normalizedClassName];
  if (!mapping) return { cantrips: [], spells: [] };
  return {
    cantrips: cantrips.filter(spell => mapping.cantrips.includes(spell.id)),
    spells: firstLevelSpells.filter(spell => mapping.spells.includes(spell.id))
  };
};

export const getSpellsBySchool = (school: string): Spell[] => allSpells.filter(spell => spell.school === school);
export const getSpellsByLevel = (level: number): Spell[] => allSpells.filter(spell => spell.level === level);
export const getRitualSpells = (): Spell[] => allSpells.filter(spell => spell.ritual);
export const getConcentrationSpells = (): Spell[] => allSpells.filter(spell => spell.concentration);

export const searchSpells = (query: string): Spell[] => {
  const q = query.toLowerCase();
  return allSpells.filter(spell => spell.name.toLowerCase().includes(q) || spell.description.toLowerCase().includes(q));
};

export const getSpellById = (id: string): Spell | undefined => allSpells.find(spell => spell.id === id);

export const validateSpellSelection = (
  className: string,
  selectedCantrips: string[],
  selectedSpells: string[]
): { valid: boolean; errors: string[] } => {
  const classSpells = getClassSpells(className);
  const errors: string[] = [];
  selectedCantrips.forEach(id => {
    if (!classSpells.cantrips.some(c => c.id === id)) errors.push(`${id} is not available as a cantrip for ${className}`);
  });
  selectedSpells.forEach(id => {
    if (!classSpells.spells.some(s => s.id === id)) errors.push(`${id} is not available as a 1st level spell for ${className}`);
  });
  return { valid: errors.length === 0, errors };
};
