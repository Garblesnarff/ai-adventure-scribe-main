/**
 * Interface for equipment option sets
 */
interface EquipmentOption {
  items: string[];
}

/**
 * Type for mapping character classes to their equipment options
 */
type ClassEquipmentMap = {
  [key: string]: EquipmentOption[];
};

/**
 * Starting equipment options for each character class following D&D 5E rules
 */
const classStartingEquipment: ClassEquipmentMap = {
  Fighter: [
    {
      items: [
        'Chain mail',
        'Martial weapon and shield',
        'Light crossbow and 20 bolts',
        "Dungeoneer's pack",
      ]
    },
    {
      items: [
        'Leather armor',
        'Two martial weapons',
        'Longbow and 20 arrows',
        "Explorer's pack",
      ]
    }
  ],
  Wizard: [
    {
      items: [
        'Quarterstaff',
        'Component pouch',
        'Spellbook',
        "Scholar's pack",
        'Arcane focus',
      ]
    },
    {
      items: [
        'Dagger',
        'Component pouch',
        'Spellbook',
        "Explorer's pack",
        'Arcane focus',
      ]
    }
  ],
  Rogue: [
    {
      items: [
        'Rapier',
        'Shortbow and 20 arrows',
        "Burglar's pack",
        'Leather armor',
        'Two daggers',
        "Thieves' tools",
      ]
    },
    {
      items: [
        'Shortsword',
        'Shortbow and 20 arrows',
        "Explorer's pack",
        'Leather armor',
        'Two daggers',
        "Thieves' tools",
      ]
    }
  ],
  Cleric: [
    {
      items: [
        'Mace',
        'Scale mail',
        'Light crossbow and 20 bolts',
        "Priest's pack",
        'Shield',
        'Holy symbol',
      ]
    },
    {
      items: [
        'Warhammer',
        'Scale mail',
        "Explorer's pack",
        'Shield',
        'Holy symbol',
      ]
    }
  ],
  Bard: [
    {
      items: [
        'Rapier',
        'Leather armor',
        "Diplomat's pack",
        'Lute',
        'Dagger',
      ]
    },
    {
      items: [
        'Longsword',
        'Leather armor',
        "Entertainer's pack",
        'Lute',
        'Dagger',
      ]
    }
  ]
};

/**
 * Gets the starting equipment options for a given character class
 * @param className The name of the character class
 * @returns Array of equipment options for the class
 */
export const getStartingEquipment = (className: string): EquipmentOption[] => {
  return classStartingEquipment[className] || [];
};