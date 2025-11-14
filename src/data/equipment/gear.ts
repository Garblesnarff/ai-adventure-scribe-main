import type { Equipment } from './types';

export const adventuringGear: Equipment[] = [
  {
    id: 'backpack',
    name: 'Backpack',
    category: 'gear',
    cost: { amount: 2, currency: 'gp' },
    weight: 5,
    description: 'A leather pack with shoulder straps. Can hold 1 cubic foot or 30 pounds of gear.',
  },
  {
    id: 'bedroll',
    name: 'Bedroll',
    category: 'gear',
    cost: { amount: 1, currency: 'gp' },
    weight: 7,
    description: 'A sleeping bag and blanket for rest during travel.',
  },
  {
    id: 'rope-hemp',
    name: 'Rope, Hemp (50 feet)',
    category: 'gear',
    cost: { amount: 2, currency: 'gp' },
    weight: 10,
    description: 'Hemp rope has 2 hit points and can be burst with a DC 17 Strength check.',
  },
  {
    id: 'torch',
    name: 'Torch',
    category: 'gear',
    cost: { amount: 1, currency: 'cp' },
    weight: 1,
    description:
      'A torch burns for 1 hour, providing bright light in a 20-foot radius and dim light for an additional 20 feet.',
  },
  {
    id: 'rations',
    name: 'Rations (1 day)',
    category: 'consumable',
    cost: { amount: 2, currency: 'sp' },
    weight: 2,
    description: 'Rations consist of dry foods suitable for extended travel.',
  },
  {
    id: 'waterskin',
    name: 'Waterskin',
    category: 'gear',
    cost: { amount: 2, currency: 'gp' },
    weight: 5,
    description: 'A waterskin can hold 4 pints of liquid.',
  },
  {
    id: 'thieves-tools',
    name: "Thieves' Tools",
    category: 'tool',
    cost: { amount: 25, currency: 'gp' },
    weight: 1,
    description:
      'This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers.',
  },
  {
    id: 'healers-kit',
    name: "Healer's Kit",
    category: 'tool',
    cost: { amount: 5, currency: 'gp' },
    weight: 3,
    description:
      'This kit has ten uses. As an action, you can expend one use of the kit to stabilize a creature that has 0 hit points.',
  },
];
