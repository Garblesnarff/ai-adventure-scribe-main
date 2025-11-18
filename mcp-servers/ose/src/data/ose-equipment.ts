/**
 * OSE Equipment Data for MCP Resources
 */

export interface OSEWeapon {
  name: string;
  damage: string;
  type: 'melee' | 'ranged' | 'both';
  cost: string;
  weight: number;
  properties: string[];
  range?: { short: number; medium: number; long: number };
}

export interface OSEArmor {
  name: string;
  acDescending: number;
  acAscending: number;
  cost: string;
  weight: number;
  type: 'light' | 'medium' | 'heavy' | 'shield';
}

export const OSE_WEAPONS: OSEWeapon[] = [
  // Melee Weapons
  { name: 'Battle Axe', damage: '1d8', type: 'melee', cost: '7 gp', weight: 7, properties: ['Two-handed', 'Slow'] },
  { name: 'Club', damage: '1d4', type: 'melee', cost: '3 sp', weight: 5, properties: ['Blunt'] },
  { name: 'Dagger', damage: '1d4', type: 'both', cost: '3 gp', weight: 1, properties: ['Throwable'], range: { short: 10, medium: 20, long: 30 } },
  { name: 'Hand Axe', damage: '1d6', type: 'melee', cost: '4 gp', weight: 5, properties: ['Throwable'], range: { short: 10, medium: 20, long: 30 } },
  { name: 'Javelin', damage: '1d6', type: 'ranged', cost: '1 gp', weight: 2, properties: ['Throwable'], range: { short: 30, medium: 60, long: 90 } },
  { name: 'Lance', damage: '1d6', type: 'melee', cost: '5 gp', weight: 10, properties: ['Mounted', 'Charge'] },
  { name: 'Mace', damage: '1d6', type: 'melee', cost: '5 gp', weight: 5, properties: ['Blunt'] },
  { name: 'Polearm', damage: '1d10', type: 'melee', cost: '7 gp', weight: 15, properties: ['Two-handed', 'Brace vs charge', 'Slow'] },
  { name: 'Short Sword', damage: '1d6', type: 'melee', cost: '7 gp', weight: 3, properties: [] },
  { name: 'Silver Dagger', damage: '1d4', type: 'both', cost: '30 gp', weight: 1, properties: ['Silver', 'Throwable'], range: { short: 10, medium: 20, long: 30 } },
  { name: 'Spear', damage: '1d6', type: 'both', cost: '3 gp', weight: 5, properties: ['Brace vs charge', 'Throwable'], range: { short: 20, medium: 40, long: 60 } },
  { name: 'Staff', damage: '1d4', type: 'melee', cost: '2 sp', weight: 4, properties: ['Blunt', 'Two-handed'] },
  { name: 'Sword', damage: '1d8', type: 'melee', cost: '10 gp', weight: 6, properties: [] },
  { name: 'Two-Handed Sword', damage: '1d10', type: 'melee', cost: '15 gp', weight: 15, properties: ['Two-handed', 'Slow'] },
  { name: 'Warhammer', damage: '1d6', type: 'melee', cost: '5 gp', weight: 6, properties: ['Blunt'] },

  // Ranged Weapons
  { name: 'Long Bow', damage: '1d8', type: 'ranged', cost: '40 gp', weight: 3, properties: ['Two-handed'], range: { short: 70, medium: 140, long: 210 } },
  { name: 'Short Bow', damage: '1d6', type: 'ranged', cost: '25 gp', weight: 3, properties: ['Two-handed'], range: { short: 50, medium: 100, long: 150 } },
  { name: 'Crossbow', damage: '1d6', type: 'ranged', cost: '30 gp', weight: 5, properties: ['Two-handed', 'Slow reload'], range: { short: 60, medium: 120, long: 180 } },
  { name: 'Sling', damage: '1d4', type: 'ranged', cost: '2 sp', weight: 0.5, properties: ['Blunt'], range: { short: 40, medium: 80, long: 160 } },
];

export const OSE_ARMOR: OSEArmor[] = [
  // Armor (Descending AC / Ascending AC)
  { name: 'Unarmored', acDescending: 9, acAscending: 10, cost: '0 gp', weight: 0, type: 'light' },
  { name: 'Leather Armor', acDescending: 7, acAscending: 12, cost: '20 gp', weight: 20, type: 'light' },
  { name: 'Chain Mail', acDescending: 5, acAscending: 14, cost: '40 gp', weight: 40, type: 'medium' },
  { name: 'Plate Mail', acDescending: 3, acAscending: 16, cost: '60 gp', weight: 50, type: 'heavy' },
  { name: 'Shield', acDescending: -1, acAscending: 1, cost: '10 gp', weight: 10, type: 'shield' },
];

export const OSE_ADVENTURING_GEAR = [
  { name: 'Backpack', cost: '5 gp', weight: 2 },
  { name: 'Holy Symbol', cost: '25 gp', weight: 0 },
  { name: 'Holy Water (vial)', cost: '25 gp', weight: 0 },
  { name: 'Iron Spikes (12)', cost: '1 gp', weight: 6 },
  { name: 'Lantern', cost: '10 gp', weight: 3 },
  { name: 'Mirror (hand-sized, steel)', cost: '5 gp', weight: 0.5 },
  { name: 'Oil (1 flask)', cost: '2 gp', weight: 1 },
  { name: 'Pole (10ft wooden)', cost: '1 gp', weight: 8 },
  { name: 'Rations (iron, 7 days)', cost: '15 gp', weight: 7 },
  { name: 'Rations (standard, 7 days)', cost: '5 gp', weight: 20 },
  { name: 'Rope (50ft)', cost: '1 gp', weight: 5 },
  { name: 'Sack (small)', cost: '1 sp', weight: 0.5 },
  { name: 'Sack (large)', cost: '2 sp', weight: 1 },
  { name: 'Stakes (3) and mallet', cost: '3 gp', weight: 3 },
  { name: 'Thieves\' Tools', cost: '25 gp', weight: 1 },
  { name: 'Tinder Box (flint & steel)', cost: '3 gp', weight: 0 },
  { name: 'Torch (6)', cost: '1 gp', weight: 6 },
  { name: 'Waterskin', cost: '1 gp', weight: 1 },
  { name: 'Wine (2 pints)', cost: '1 gp', weight: 2 },
  { name: 'Wolfsbane (1 bunch)', cost: '10 gp', weight: 0 },
];
