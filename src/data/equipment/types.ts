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
  damage?: {
    dice: string;
    type:
      | 'bludgeoning'
      | 'piercing'
      | 'slashing'
      | 'acid'
      | 'cold'
      | 'fire'
      | 'force'
      | 'lightning'
      | 'necrotic'
      | 'poison'
      | 'psychic'
      | 'radiant'
      | 'thunder';
  };
  weaponType?: 'simple' | 'martial';
  attackBonus?: number;
  range?: { normal: number; long?: number };
  weaponProperties?: {
    light?: boolean;
    finesse?: boolean;
    thrown?: boolean;
    twoHanded?: boolean;
    versatile?: boolean;
    reach?: boolean;
    heavy?: boolean;
    loading?: boolean;
    ammunition?: boolean;
    special?: string;
    magical?: boolean;
    silvered?: boolean;
    adamantine?: boolean;
  };
  armorClass?: { base: number; dexModifier?: boolean; maxDexModifier?: number };
  armorType?: 'light' | 'medium' | 'heavy';
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
  isMagic?: boolean;
  magicBonus?: number;
  magicProperties?: string[];
  requiresAttunement?: boolean;
  attunementRequirements?: string;
  magicItemType?: 'weapon' | 'armor' | 'ring' | 'rod' | 'staff' | 'wand' | 'wondrous';
  magicItemRarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';
  magicEffects?: {
    attackBonus?: number;
    damageBonus?: number;
    acBonus?: number;
    saveBonus?: number;
    abilityScoreBonus?: {
      ability: 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';
      bonus: number;
    };
    specialProperties?: string[];
    spellEffects?: {
      spellName: string;
      spellLevel?: number;
      charges?: number;
      maxCharges?: number;
      rechargeRate?: 'daily' | 'dawn' | 'dusk' | 'weekly' | 'monthly';
    }[];
  };
}
