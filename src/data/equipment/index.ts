export type { Equipment } from './types';
export { weapons } from './weapons';
export { armor } from './armor';
export { shields } from './shields';
export { adventuringGear } from './gear';

import { weapons } from './weapons';
import { armor } from './armor';
import { shields } from './shields';
import { adventuringGear } from './gear';
import type { Equipment } from './types';

export const allEquipment: Equipment[] = [
  ...weapons,
  ...armor,
  ...shields,
  ...adventuringGear,
];
