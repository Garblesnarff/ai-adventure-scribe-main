import { bardLevel1Spells } from './bard';
import { clericLevel1Spells } from './cleric';
import { druidLevel1Spells } from './druid';
import { paladinLevel1Spells } from './paladin';
import { rangerLevel1Spells } from './ranger';
import { sorcererLevel1Spells } from './sorcerer';
import { warlockLevel1Spells } from './warlock';
import { wizardLevel1Spells } from './wizard';

import type { Spell } from '@/types/character';

export const firstLevelSpells: Spell[] = [
  ...wizardLevel1Spells,
  ...clericLevel1Spells,
  ...bardLevel1Spells,
  ...druidLevel1Spells,
  ...sorcererLevel1Spells,
  ...warlockLevel1Spells,
  ...paladinLevel1Spells,
  ...rangerLevel1Spells,
];
