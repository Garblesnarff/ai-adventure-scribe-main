# Old-School Essentials (OSE) Game System Data

This directory contains comprehensive game data for Old-School Essentials (OSE), a modern clone of the B/X edition of the world's most popular fantasy roleplaying game.

## Directory Structure

```
ose/
├── classic/
│   ├── classes.ts        # 7 core classes (4 human + 3 race-as-class)
│   └── index.ts          # Classic Fantasy module exports
├── index.ts              # Main OSE module exports
└── README.md             # This file
```

## Classic Fantasy Classes

OSE Classic Fantasy includes 7 classes:

### Human Classes (4)

1. **Cleric** (d6 HD, WIS prime requisite)
   - Divine spellcasting (levels 1-5)
   - Turn undead ability
   - Combat capable with restrictions (no edged weapons)
   - Maximum level: 14

2. **Fighter** (d8 HD, STR prime requisite)
   - Best combat progression
   - Can use all weapons and armor
   - Highest hit dice
   - Maximum level: 14

3. **Magic-User** (d4 HD, INT prime requisite)
   - Arcane spellcasting (levels 1-6)
   - Lowest hit dice and combat ability
   - Powerful magical abilities
   - Maximum level: 14

4. **Thief** (d4 HD, DEX prime requisite)
   - Special abilities (stealth, climbing, backstab, etc.)
   - Light armor only
   - Skill percentages improve with level
   - Maximum level: 14

### Race-as-Class (3)

5. **Dwarf** (d8 HD, STR prime requisite)
   - Fighter-type combatant
   - Detect construction and traps
   - Infravision 60'
   - Maximum level: 12

6. **Elf** (d6 HD, STR & INT prime requisites)
   - Fighter/Magic-User hybrid
   - Arcane spellcasting (levels 1-5)
   - Detect secret doors
   - Immunity to ghoul paralysis
   - Maximum level: 10

7. **Halfling** (d6 HD, STR & DEX prime requisites)
   - Ranged combat specialist (+1 missile attacks)
   - Superior hiding abilities
   - Initiative bonus
   - Maximum level: 8

## Usage

### Basic Import

```typescript
import { OSE_CLASSIC_CLASSES } from '@/data/game-systems/ose';

// Get all classes
const allClasses = OSE_CLASSIC_CLASSES;
```

### Helper Functions

```typescript
import {
  getOSEClassById,
  getHumanClasses,
  getRaceClasses,
  getSpellcastingClasses,
  calculateXPBonus,
  getSavingThrow,
  getAttackBonus,
  getSpellSlots,
} from '@/data/game-systems/ose';

// Get a specific class
const fighter = getOSEClassById('fighter');

// Get human classes only
const humanClasses = getHumanClasses(); // [Cleric, Fighter, Magic-User, Thief]

// Get race-as-class options
const raceClasses = getRaceClasses(); // [Dwarf, Elf, Halfling]

// Get spellcasting classes
const spellcasters = getSpellcastingClasses(); // [Cleric, Magic-User, Elf]

// Calculate XP bonus from prime requisite
const xpBonus = calculateXPBonus(16); // Returns 10 (10% bonus)

// Get saving throw at a specific level
const deathSave = getSavingThrow(fighter, 5, 'death'); // Returns saving throw target

// Get attack bonus at a specific level
const attackBonus = getAttackBonus(fighter, 7); // Returns +5

// Get spell slots for a spellcasting class
const clericSlots = getSpellSlots(cleric, 5); // Returns [2, 2] (2 first-level, 2 second-level)
```

### Type Checking

```typescript
import { isSpellcaster, isRaceClass } from '@/data/game-systems/ose';
import type { OSEClass } from '@/data/game-systems/ose';

const myClass: OSEClass = getOSEClassById('elf')!;

if (isSpellcaster(myClass)) {
  // TypeScript knows myClass.spellcasting exists
  console.log(myClass.spellcasting.type); // 'arcane'
  console.log(myClass.spellcasting.maxLevel); // 5
}

if (isRaceClass(myClass)) {
  console.log('This is a demi-human race-as-class');
}
```

## OSE vs D&D 5E Differences

OSE uses fundamentally different mechanics from D&D 5E:

### No Skills System
- OSE uses ability checks (roll d20 under ability score)
- Class abilities are specific features, not proficiencies
- No skill selection during character creation

### Prime Requisites
- Instead of affecting spellcasting or combat, prime requisites provide XP bonuses
- 13-15: +5% XP bonus
- 16-18: +10% XP bonus
- Some classes have multiple prime requisites (Elf, Halfling)

### Saving Throws
- Five categories: Death, Wands, Paralysis, Breath Attacks, Spells
- Not based on ability scores
- Improve automatically as you level (roughly every 4 levels)

### Race-as-Class
- Dwarves, Elves, and Halflings are classes, not races
- Combines racial abilities with class features
- Generally lower maximum levels than human classes

### Combat
- Attack bonus progresses differently by class
- THAC0 (To Hit AC 0) system or ascending AC variant
- Initiative is typically d6 by side, not individual

### Hit Dice
- Only three hit die types: d4, d6, d8
- After 9th level, fixed HP bonuses instead of rolling dice
- No Constitution modifier to HP at 1st level in strict OSE

## Class Data Structure

Each `OSEClass` object includes:

```typescript
interface OSEClass {
  id: string;                              // Unique identifier
  name: string;                            // Display name
  description: string;                     // Flavor text
  hitDie: number;                          // 4, 6, or 8
  primeRequisite: OSEAbility[];           // ['STR'], ['WIS'], ['STR', 'INT'], etc.
  maxLevel: number;                        // 8-14 depending on class
  abilities: string[];                     // List of special abilities
  armorProficiency: string;                // Armor description
  weaponRestrictions?: string;             // Weapon limitations
  spellcasting?: OSESpellcasting;         // If applicable
  isRaceClass: boolean;                    // True for Dwarf/Elf/Halfling
  xpRequirements?: number[];               // XP needed for each level
  baseSavingThrows?: Record<...>;         // Saving throw values
  attackBonus?: string;                    // Attack progression description
}
```

## Spellcasting Progression

Spell slots are tracked in the `spellProgression` object:

```typescript
spellProgression: {
  1: [1],           // Level 1: 1 first-level spell
  2: [2],           // Level 2: 2 first-level spells
  3: [2, 1],        // Level 3: 2 first-level, 1 second-level
  // ... etc
}
```

Access them with:

```typescript
const magicUser = getOSEClassById('magic-user')!;
const level5Slots = getSpellSlots(magicUser, 5); // [2, 2, 1]
```

## Future Expansion

This structure can be extended to include:

- OSE Advanced Fantasy classes (additional classes and races)
- Equipment lists and starting gear
- Spell lists (arcane and divine)
- Monster statistics
- Treasure tables
- Domain-specific rules (hex crawls, strongholds, etc.)

## References

- [Old-School Essentials Website](https://oldschoolessentials.necroticgnome.com/)
- [OSE SRD](https://oldschoolessentials.necroticgnome.com/srd/)
- B/X D&D (Moldvay/Cook Basic & Expert Sets, 1981)

## License

This data is compatible with the Open Game License (OGL) under which Old-School Essentials is published. All class names, mechanics, and data follow the OSE SRD which is freely available under the OGL.
