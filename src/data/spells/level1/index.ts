import { Spell } from '@/types/character';

import { wizardLevel1Spells } from './wizard';
import { clericLevel1Spells } from './cleric';
import { bardLevel1Spells } from './bard';
import { druidLevel1Spells } from './druid';
import { sorcererLevel1Spells } from './sorcerer';
import { warlockLevel1Spells } from './warlock';
import { paladinLevel1Spells } from './paladin';
import { rangerLevel1Spells } from './ranger';

export const firstLevelSpells: Spell[] = [
  ...wizardLevel1Spells,
  ...clericLevel1Spells,
  ...bardLevel1Spells,
  ...druidLevel1Spells,
  ...sorcererLevel1Spells,
  ...warlockLevel1Spells,
  ...paladinLevel1Spells,
  ...rangerLevel1Spells
];
