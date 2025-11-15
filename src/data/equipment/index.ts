export type { Equipment } from './types';
export { weapons } from './weapons';
export { armor } from './armor';
export { shields } from './shields';
export { adventuringGear } from './gear';

import { armor } from './armor';
import { adventuringGear } from './gear';
import { shields } from './shields';
import { weapons } from './weapons';

import type { Equipment } from './types';

export const allEquipment: Equipment[] = [...weapons, ...armor, ...shields, ...adventuringGear];
