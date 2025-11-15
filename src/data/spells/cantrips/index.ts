import { bardCantrips } from './bard';
import { clericCantrips } from './cleric';
import { druidCantrips } from './druid';
import { sorcererCantrips } from './sorcerer';
import { warlockCantrips } from './warlock';
import { wizardCantrips } from './wizard';

import type { Spell } from '@/types/character';

export const cantrips: Spell[] = [
  ...wizardCantrips,
  ...clericCantrips,
  ...bardCantrips,
  ...druidCantrips,
  ...sorcererCantrips,
  ...warlockCantrips,
];
