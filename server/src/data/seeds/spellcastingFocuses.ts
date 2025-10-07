// Basic Spellcasting Focuses
export const spellcastingFocuses = [
  {
    name: 'Arcane Focus',
    focus_type: 'arcane',
    compatible_classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
    cost_gp: 20,
    description: 'A special item—an orb, a crystal, a rod, a specially constructed staff, a wand-like length of wood, or some similar item—designed to channel the power of arcane spells.'
  },
  {
    name: 'Crystal',
    focus_type: 'arcane',
    compatible_classes: ['Bard', 'Sorcerer', 'Warlock', 'Wizard'],
    cost_gp: 10,
    description: 'A crystalline focus for channeling arcane magic.'
  },
  {
    name: 'Druidcraft Focus',
    focus_type: 'druidic',
    compatible_classes: ['Druid', 'Ranger'],
    cost_gp: 0,
    description: 'A druidic focus might be a sprig of mistletoe, a yew wand, a staff, a totem, or some other focus.'
  },
  {
    name: 'Holy Symbol',
    focus_type: 'divine',
    compatible_classes: ['Cleric', 'Paladin'],
    cost_gp: 5,
    description: 'A holy symbol is a representation of a deity or celestial power. It might be an amulet depicting a symbol representing a deity, the same symbol carefully engraved or inlaid as an emblem on a shield, or a tiny box holding a fragment of a sacred relic.'
  },
  {
    name: 'Component Pouch',
    focus_type: 'component_pouch',
    compatible_classes: ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'],
    cost_gp: 25,
    description: 'A component pouch is a small, watertight leather belt pouch that has compartments to hold all the material components and other special items you need to cast your spells, except for those components that have a specific cost.'
  }
];
