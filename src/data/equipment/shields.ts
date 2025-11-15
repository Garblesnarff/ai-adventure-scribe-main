import type { Equipment } from './types';

export const shields: Equipment[] = [
  {
    id: 'shield',
    name: 'Shield',
    category: 'shield',
    cost: { amount: 10, currency: 'gp' },
    weight: 6,
    armorClass: { base: 2, dexModifier: false },
    description:
      'A shield is made from wood or metal and is carried in one hand. Wielding a shield increases your Armor Class by 2.',
  },
];
