import { Spell } from '@/types/character';

import { wizardCantrips } from './wizard';
import { clericCantrips } from './cleric';
import { bardCantrips } from './bard';
import { druidCantrips } from './druid';
import { sorcererCantrips } from './sorcerer';
import { warlockCantrips } from './warlock';

export const cantrips: Spell[] = [
  ...wizardCantrips,
  ...clericCantrips,
  ...bardCantrips,
  ...druidCantrips,
  ...sorcererCantrips,
  ...warlockCantrips
];
