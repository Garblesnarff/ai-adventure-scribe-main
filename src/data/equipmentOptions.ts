/**
 * D&D 5E Equipment System
 * Comprehensive equipment data with AC calculations, pricing, and properties
 */

export interface Equipment {
  id: string;
  name: string;
  category: 'weapon' | 'armor' | 'shield' | 'tool' | 'gear' | 'consumable';
  subcategory?: string;
  cost: {
    amount: number;
    currency: 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
  };
  weight?: number;
  description: string;
  properties?: string[];
  // Weapon specific
  damage?: {
    dice: string;
    type: 'bludgeoning' | 'piercing' | 'slashing' | 'acid' | 'cold' | 'fire' | 'force' | 'lightning' | 'necrotic' | 'poison' | 'psychic' | 'radiant' | 'thunder';
  };
  weaponType?: 'simple' | 'martial';
  range?: {
    normal: number;
    long?: number;
  };
  // Armor specific
  armorClass?: {
    base: number;
    dexModifier?: boolean;
    maxDexModifier?: number;
  };
  armorType?: 'light' | 'medium' | 'heavy';
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
}

/**
 * Starting gold by class (in gold pieces)
 */
export const startingGoldByClass: Record<string, { dice: string; multiplier: number; average: number }> = {
  barbarian: { dice: '2d4', multiplier: 10, average: 50 },
  bard: { dice: '5d4', multiplier: 10, average: 125 },
  cleric: { dice: '5d4', multiplier: 10, average: 125 },
  druid: { dice: '2d4', multiplier: 10, average: 50 },
  fighter: { dice: '5d4', multiplier: 10, average: 125 },
  monk: { dice: '5d4', multiplier: 1, average: 12.5 },
  paladin: { dice: '5d4', multiplier: 10, average: 125 },
  ranger: { dice: '5d4', multiplier: 10, average: 125 },
  rogue: { dice: '4d4', multiplier: 10, average: 100 },
  sorcerer: { dice: '3d4', multiplier: 10, average: 75 },
  warlock: { dice: '4d4', multiplier: 10, average: 100 },
  wizard: { dice: '4d4', multiplier: 10, average: 100 }
};

/**
 * Weapons
 */
export const weapons: Equipment[] = [
  // Simple Melee Weapons
  {
    id: 'club',
    name: 'Club',
    category: 'weapon',
    subcategory: 'simple melee',
    weaponType: 'simple',
    cost: { amount: 1, currency: 'sp' },
    weight: 2,
    damage: { dice: '1d4', type: 'bludgeoning' },
    properties: ['Light'],
    description: 'A simple wooden club.'
  },
  {
    id: 'dagger',
    name: 'Dagger',
    category: 'weapon',
    subcategory: 'simple melee',
    weaponType: 'simple',
    cost: { amount: 2, currency: 'gp' },
    weight: 1,
    damage: { dice: '1d4', type: 'piercing' },
    properties: ['Finesse', 'Light', 'Thrown (20/60)'],
    range: { normal: 20, long: 60 },
    description: 'A sharp, lightweight blade.'
  },
  {
    id: 'handaxe',
    name: 'Handaxe',
    category: 'weapon',
    subcategory: 'simple melee',
    weaponType: 'simple',
    cost: { amount: 5, currency: 'gp' },
    weight: 2,
    damage: { dice: '1d6', type: 'slashing' },
    properties: ['Light', 'Thrown (20/60)'],
    range: { normal: 20, long: 60 },
    description: 'A small axe for one-handed use.'
  },
  {
    id: 'mace',
    name: 'Mace',
    category: 'weapon',
    subcategory: 'simple melee',
    weaponType: 'simple',
    cost: { amount: 5, currency: 'gp' },
    weight: 4,
    damage: { dice: '1d6', type: 'bludgeoning' },
    properties: [],
    description: 'A heavy-headed weapon on a wooden handle.'
  },
  {
    id: 'quarterstaff',
    name: 'Quarterstaff',
    category: 'weapon',
    subcategory: 'simple melee',
    weaponType: 'simple',
    cost: { amount: 2, currency: 'sp' },
    weight: 4,
    damage: { dice: '1d6', type: 'bludgeoning' },
    properties: ['Versatile (1d8)'],
    description: 'A simple wooden staff.'
  },

  // Simple Ranged Weapons
  {
    id: 'light-crossbow',
    name: 'Light Crossbow',
    category: 'weapon',
    subcategory: 'simple ranged',
    weaponType: 'simple',
    cost: { amount: 25, currency: 'gp' },
    weight: 5,
    damage: { dice: '1d8', type: 'piercing' },
    properties: ['Ammunition (80/320)', 'Loading', 'Two-handed'],
    range: { normal: 80, long: 320 },
    description: 'A mechanical bow that fires bolts.'
  },
  {
    id: 'shortbow',
    name: 'Shortbow',
    category: 'weapon',
    subcategory: 'simple ranged',
    weaponType: 'simple',
    cost: { amount: 25, currency: 'gp' },
    weight: 2,
    damage: { dice: '1d6', type: 'piercing' },
    properties: ['Ammunition (80/320)', 'Two-handed'],
    range: { normal: 80, long: 320 },
    description: 'A smaller bow for easier handling.'
  },

  // Martial Melee Weapons
  {
    id: 'longsword',
    name: 'Longsword',
    category: 'weapon',
    subcategory: 'martial melee',
    weaponType: 'martial',
    cost: { amount: 15, currency: 'gp' },
    weight: 3,
    damage: { dice: '1d8', type: 'slashing' },
    properties: ['Versatile (1d10)'],
    description: 'A classic knightly sword.'
  },
  {
    id: 'rapier',
    name: 'Rapier',
    category: 'weapon',
    subcategory: 'martial melee',
    weaponType: 'martial',
    cost: { amount: 25, currency: 'gp' },
    weight: 2,
    damage: { dice: '1d8', type: 'piercing' },
    properties: ['Finesse'],
    description: 'A slender, sharply pointed sword.'
  },
  {
    id: 'scimitar',
    name: 'Scimitar',
    category: 'weapon',
    subcategory: 'martial melee',
    weaponType: 'martial',
    cost: { amount: 25, currency: 'gp' },
    weight: 3,
    damage: { dice: '1d6', type: 'slashing' },
    properties: ['Finesse', 'Light'],
    description: 'A curved, single-edged blade.'
  },
  {
    id: 'greatsword',
    name: 'Greatsword',
    category: 'weapon',
    subcategory: 'martial melee',
    weaponType: 'martial',
    cost: { amount: 50, currency: 'gp' },
    weight: 6,
    damage: { dice: '2d6', type: 'slashing' },
    properties: ['Heavy', 'Two-handed'],
    description: 'A massive two-handed sword.'
  },

  // Martial Ranged Weapons
  {
    id: 'longbow',
    name: 'Longbow',
    category: 'weapon',
    subcategory: 'martial ranged',
    weaponType: 'martial',
    cost: { amount: 50, currency: 'gp' },
    weight: 2,
    damage: { dice: '1d8', type: 'piercing' },
    properties: ['Ammunition (150/600)', 'Heavy', 'Two-handed'],
    range: { normal: 150, long: 600 },
    description: 'A tall bow with great range and power.'
  },
  {
    id: 'heavy-crossbow',
    name: 'Heavy Crossbow',
    category: 'weapon',
    subcategory: 'martial ranged',
    weaponType: 'martial',
    cost: { amount: 50, currency: 'gp' },
    weight: 18,
    damage: { dice: '1d10', type: 'piercing' },
    properties: ['Ammunition (100/400)', 'Heavy', 'Loading', 'Two-handed'],
    range: { normal: 100, long: 400 },
    description: 'A powerful crossbow requiring significant strength.'
  }
];

/**
 * Armor
 */
export const armor: Equipment[] = [
  // Light Armor
  {
    id: 'padded-armor',
    name: 'Padded Armor',
    category: 'armor',
    armorType: 'light',
    cost: { amount: 5, currency: 'gp' },
    weight: 8,
    armorClass: { base: 11, dexModifier: true },
    stealthDisadvantage: true,
    description: 'Quilted layers of cloth and batting.'
  },
  {
    id: 'leather-armor',
    name: 'Leather Armor',
    category: 'armor',
    armorType: 'light',
    cost: { amount: 10, currency: 'gp' },
    weight: 10,
    armorClass: { base: 11, dexModifier: true },
    description: 'Soft and flexible leather armor.'
  },
  {
    id: 'studded-leather',
    name: 'Studded Leather',
    category: 'armor',
    armorType: 'light',
    cost: { amount: 45, currency: 'gp' },
    weight: 13,
    armorClass: { base: 12, dexModifier: true },
    description: 'Leather armor reinforced with metal studs.'
  },

  // Medium Armor
  {
    id: 'hide-armor',
    name: 'Hide Armor',
    category: 'armor',
    armorType: 'medium',
    cost: { amount: 10, currency: 'gp' },
    weight: 12,
    armorClass: { base: 12, dexModifier: true, maxDexModifier: 2 },
    description: 'Crude armor made from thick furs and pelts.'
  },
  {
    id: 'chain-shirt',
    name: 'Chain Shirt',
    category: 'armor',
    armorType: 'medium',
    cost: { amount: 50, currency: 'gp' },
    weight: 20,
    armorClass: { base: 13, dexModifier: true, maxDexModifier: 2 },
    description: 'A shirt made of interlocking metal rings.'
  },
  {
    id: 'scale-mail',
    name: 'Scale Mail',
    category: 'armor',
    armorType: 'medium',
    cost: { amount: 50, currency: 'gp' },
    weight: 45,
    armorClass: { base: 14, dexModifier: true, maxDexModifier: 2 },
    stealthDisadvantage: true,
    description: 'Armor consisting of a coat of leather covered with overlapping pieces of metal.'
  },
  {
    id: 'breastplate',
    name: 'Breastplate',
    category: 'armor',
    armorType: 'medium',
    cost: { amount: 400, currency: 'gp' },
    weight: 20,
    armorClass: { base: 14, dexModifier: true, maxDexModifier: 2 },
    description: 'A fitted metal chest piece worn with supple leather.'
  },
  {
    id: 'half-plate',
    name: 'Half Plate',
    category: 'armor',
    armorType: 'medium',
    cost: { amount: 750, currency: 'gp' },
    weight: 40,
    armorClass: { base: 15, dexModifier: true, maxDexModifier: 2 },
    stealthDisadvantage: true,
    description: 'Partial plate armor covering the most vital areas.'
  },

  // Heavy Armor
  {
    id: 'ring-mail',
    name: 'Ring Mail',
    category: 'armor',
    armorType: 'heavy',
    cost: { amount: 30, currency: 'gp' },
    weight: 40,
    armorClass: { base: 14, dexModifier: false },
    stealthDisadvantage: true,
    description: 'Leather armor with heavy rings sewn into it.'
  },
  {
    id: 'chain-mail',
    name: 'Chain Mail',
    category: 'armor',
    armorType: 'heavy',
    cost: { amount: 75, currency: 'gp' },
    weight: 55,
    armorClass: { base: 16, dexModifier: false },
    strengthRequirement: 13,
    stealthDisadvantage: true,
    description: 'A complete suit of interlocking metal rings.'
  },
  {
    id: 'splint-armor',
    name: 'Splint Armor',
    category: 'armor',
    armorType: 'heavy',
    cost: { amount: 200, currency: 'gp' },
    weight: 60,
    armorClass: { base: 17, dexModifier: false },
    strengthRequirement: 15,
    stealthDisadvantage: true,
    description: 'Armor made of narrow vertical strips of metal.'
  },
  {
    id: 'plate-armor',
    name: 'Plate Armor',
    category: 'armor',
    armorType: 'heavy',
    cost: { amount: 1500, currency: 'gp' },
    weight: 65,
    armorClass: { base: 18, dexModifier: false },
    strengthRequirement: 15,
    stealthDisadvantage: true,
    description: 'The finest and most protective armor, consisting of shaped, interlocking metal plates.'
  }
];

/**
 * Shields
 */
export const shields: Equipment[] = [
  {
    id: 'shield',
    name: 'Shield',
    category: 'shield',
    cost: { amount: 10, currency: 'gp' },
    weight: 6,
    armorClass: { base: 2, dexModifier: false },
    description: 'A shield is made from wood or metal and is carried in one hand. Wielding a shield increases your Armor Class by 2.'
  }
];

/**
 * Adventuring Gear
 */
export const adventuringGear: Equipment[] = [
  {
    id: 'backpack',
    name: 'Backpack',
    category: 'gear',
    cost: { amount: 2, currency: 'gp' },
    weight: 5,
    description: 'A leather pack with shoulder straps. Can hold 1 cubic foot or 30 pounds of gear.'
  },
  {
    id: 'bedroll',
    name: 'Bedroll',
    category: 'gear',
    cost: { amount: 1, currency: 'gp' },
    weight: 7,
    description: 'A sleeping bag and blanket for rest during travel.'
  },
  {
    id: 'rope-hemp',
    name: 'Rope, Hemp (50 feet)',
    category: 'gear',
    cost: { amount: 2, currency: 'gp' },
    weight: 10,
    description: 'Hemp rope has 2 hit points and can be burst with a DC 17 Strength check.'
  },
  {
    id: 'torch',
    name: 'Torch',
    category: 'gear',
    cost: { amount: 1, currency: 'cp' },
    weight: 1,
    description: 'A torch burns for 1 hour, providing bright light in a 20-foot radius and dim light for an additional 20 feet.'
  },
  {
    id: 'rations',
    name: 'Rations (1 day)',
    category: 'consumable',
    cost: { amount: 2, currency: 'sp' },
    weight: 2,
    description: 'Rations consist of dry foods suitable for extended travel.'
  },
  {
    id: 'waterskin',
    name: 'Waterskin',
    category: 'gear',
    cost: { amount: 2, currency: 'gp' },
    weight: 5,
    description: 'A waterskin can hold 4 pints of liquid.'
  },
  {
    id: 'thieves-tools',
    name: "Thieves' Tools",
    category: 'tool',
    cost: { amount: 25, currency: 'gp' },
    weight: 1,
    description: 'This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a set of narrow-bladed scissors, and a pair of pliers.'
  },
  {
    id: 'healers-kit',
    name: "Healer's Kit",
    category: 'tool',
    cost: { amount: 5, currency: 'gp' },
    weight: 3,
    description: 'This kit has ten uses. As an action, you can expend one use of the kit to stabilize a creature that has 0 hit points.'
  }
];

/**
 * All equipment combined
 */
export const allEquipment: Equipment[] = [
  ...weapons,
  ...armor,
  ...shields,
  ...adventuringGear
];

/**
 * Helper functions
 */
export function calculateArmorClass(
  equippedArmor: Equipment | null,
  equippedShield: Equipment | null,
  dexModifier: number,
  otherBonuses: number = 0
): number {
  let ac = 10 + dexModifier; // Base AC

  if (equippedArmor && equippedArmor.armorClass) {
    const armorAC = equippedArmor.armorClass;
    ac = armorAC.base;

    if (armorAC.dexModifier) {
      const maxDex = armorAC.maxDexModifier !== undefined ? armorAC.maxDexModifier : Infinity;
      ac += Math.min(dexModifier, maxDex);
    }
  }

  if (equippedShield && equippedShield.armorClass) {
    ac += equippedShield.armorClass.base;
  }

  return ac + otherBonuses;
}

export function getEquipmentByCategory(category: Equipment['category']): Equipment[] {
  return allEquipment.filter(item => item.category === category);
}

export function getWeaponsByType(weaponType: 'simple' | 'martial'): Equipment[] {
  return weapons.filter(weapon => weapon.weaponType === weaponType);
}

export function getArmorByType(armorType: 'light' | 'medium' | 'heavy'): Equipment[] {
  return armor.filter(a => a.armorType === armorType);
}

export function convertCurrency(amount: number, fromCurrency: Equipment['cost']['currency'], toCurrency: Equipment['cost']['currency']): number {
  const rates: Record<Equipment['cost']['currency'], number> = {
    cp: 1,
    sp: 10,
    ep: 50,
    gp: 100,
    pp: 1000
  };
  
  const valueInCopper = amount * rates[fromCurrency];
  return valueInCopper / rates[toCurrency];
}

export function formatCurrency(cost: Equipment['cost']): string {
  const { amount, currency } = cost;
  return `${amount} ${currency}`;
}

/**
 * Get starting equipment for a character class
 */
export function getStartingEquipment(className: string): Equipment[] {
  const classId = className.toLowerCase();
  const packages: Record<string, string[]> = {
    fighter: [
      'chain-mail', 'shield', 'longsword', 'handaxe', 'handaxe', 
      'light-crossbow'
    ],
    wizard: [
      'dagger', 'quarterstaff'
    ],
    rogue: [
      'leather-armor', 'dagger', 'dagger', 'thieves-tools', 
      'shortbow'
    ],
    cleric: [
      'chain-shirt', 'shield', 'mace', 'light-crossbow'
    ],
    barbarian: [
      'leather-armor', 'shield', 'handaxe', 'handaxe'
    ],
    bard: [
      'leather-armor', 'dagger', 'rapier'
    ],
    druid: [
      'leather-armor', 'shield', 'scimitar'
    ],
    monk: [
      'dagger'
    ],
    paladin: [
      'chain-mail', 'shield', 'longsword'
    ],
    ranger: [
      'leather-armor', 'dagger', 'dagger', 'longbow'
    ],
    sorcerer: [
      'dagger', 'dagger', 'light-crossbow'
    ],
    warlock: [
      'leather-armor', 'dagger', 'light-crossbow'
    ]
  };

  const equipmentIds = packages[classId] || [];
  return equipmentIds.map(id => {
    const item = allEquipment.find(eq => eq.id === id);
    return item || {
      id,
      name: id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      category: 'gear' as const,
      cost: { amount: 0, currency: 'gp' as const },
      description: `Starting ${className} equipment`
    };
  });
}