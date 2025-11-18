/**
 * D&D 5E MCP Server Entry Point
 *
 * Launches an MCP server with D&D 5th Edition game system data and mechanics.
 */

import { createMCPServer, GameSystemDataProvider } from '../manager.js';

// Import D&D 5E data from the main application
// Note: In production, these would be imported from the built application
const dnd5eProvider: GameSystemDataProvider = {
  getClasses: () => {
    // This would import from ../../src/data/classOptions
    return [
      {
        id: 'fighter',
        name: 'Fighter',
        description: 'A master of martial combat',
        hitDie: 10,
        primaryAbility: 'Strength or Dexterity',
        saves: ['Strength', 'Constitution'],
      },
      {
        id: 'wizard',
        name: 'Wizard',
        description: 'A scholarly magic-user',
        hitDie: 6,
        primaryAbility: 'Intelligence',
        saves: ['Intelligence', 'Wisdom'],
      },
      // More classes would be loaded from the data files
    ];
  },

  getRaces: () => {
    // This would import from ../../src/data/races
    return [
      {
        id: 'human',
        name: 'Human',
        description: 'Versatile and ambitious',
        abilityScoreIncrease: { all: 1 },
        speed: 30,
      },
      {
        id: 'elf',
        name: 'Elf',
        description: 'Magical and graceful',
        abilityScoreIncrease: { dexterity: 2 },
        speed: 30,
      },
      // More races would be loaded from the data files
    ];
  },

  getBackgrounds: () => {
    return [
      {
        id: 'acolyte',
        name: 'Acolyte',
        description: 'Served in a temple',
        skillProficiencies: ['Insight', 'Religion'],
      },
      // More backgrounds would be loaded from the data files
    ];
  },

  getSpells: () => {
    return [
      {
        id: 'fireball',
        name: 'Fireball',
        level: 3,
        school: 'Evocation',
        castingTime: '1 action',
        range: '150 feet',
        components: ['V', 'S', 'M'],
        duration: 'Instantaneous',
        description: 'A bright streak flashes from your pointing finger...',
      },
      // More spells would be loaded from the data files
    ];
  },

  getEquipment: () => {
    return [
      {
        id: 'longsword',
        name: 'Longsword',
        type: 'weapon',
        damage: { dice: '1d8', type: 'slashing' },
        properties: ['versatile'],
        cost: { amount: 15, currency: 'gp' },
        weight: 3,
      },
      {
        id: 'chain-mail',
        name: 'Chain Mail',
        type: 'armor',
        armorClass: { base: 16, dexModifier: false },
        cost: { amount: 75, currency: 'gp' },
        weight: 55,
      },
      // More equipment would be loaded from the data files
    ];
  },

  calculateAbilityModifier: (score: number): number => {
    // D&D 5E standard formula
    return Math.floor((score - 10) / 2);
  },

  calculateProficiencyBonus: (level: number): number => {
    // D&D 5E proficiency bonus by level
    // Levels 1-4: +2, 5-8: +3, 9-12: +4, 13-16: +5, 17-20: +6
    return Math.ceil(level / 4) + 1;
  },

  calculateHitPoints: (className: string, level: number, conMod: number): number => {
    // Hit die by class (simplified)
    const hitDice: Record<string, number> = {
      barbarian: 12,
      fighter: 10,
      paladin: 10,
      ranger: 10,
      bard: 8,
      cleric: 8,
      druid: 8,
      monk: 8,
      rogue: 8,
      warlock: 8,
      sorcerer: 6,
      wizard: 6,
    };

    const hitDie = hitDice[className.toLowerCase()] || 8;
    const averageRoll = Math.floor(hitDie / 2) + 1;

    // Level 1: max hit die + CON mod
    if (level === 1) {
      return hitDie + conMod;
    }

    // Additional levels: average + CON mod per level
    return hitDie + conMod + (level - 1) * (averageRoll + conMod);
  },

  rollInitiative: (dexMod: number): number => {
    // 1d20 + Dexterity modifier
    return Math.floor(Math.random() * 20) + 1 + dexMod;
  },

  getRulesReference: (topic: string): string => {
    const rules: Record<string, string> = {
      combat: `# Combat Rules (D&D 5E)

## Combat Steps
1. **Determine Surprise** - Check if any creatures are surprised
2. **Establish Positions** - DM determines where creatures are
3. **Roll Initiative** - Everyone rolls initiative (1d20 + Dex modifier)
4. **Take Turns** - Creatures act in initiative order
5. **Begin Next Round** - Repeat from step 4

## On Your Turn
You can:
- **Move** up to your speed
- Take **one action** (Attack, Cast a Spell, Dash, Disengage, Dodge, Help, Hide, Ready, Search, Use an Object)
- Take **one bonus action** (if you have an ability that uses one)
- Interact with **one object** for free
- Use **reactions** (opportunity attacks, etc.)

## Attack Rolls
1. Roll 1d20 + ability modifier + proficiency bonus (if proficient)
2. Compare to target's AC
3. If equal or higher, the attack hits

## Damage Rolls
Roll the weapon's damage dice + ability modifier

## Advantage/Disadvantage
- **Advantage**: Roll 2d20, use the higher result
- **Disadvantage**: Roll 2d20, use the lower result
`,
      spellcasting: `# Spellcasting Rules (D&D 5E)

## Casting a Spell
1. Choose a spell you have prepared
2. Check if you have a spell slot of the appropriate level
3. Expend the spell slot
4. Follow the spell's casting time, range, components, and duration

## Spell Components
- **V (Verbal)**: Must speak
- **S (Somatic)**: Must use hand gestures
- **M (Material)**: Must have specific materials

## Concentration
Some spells require concentration. You can only concentrate on one spell at a time.
You lose concentration if:
- You cast another concentration spell
- You take damage (make a Constitution save: DC 10 or half damage, whichever is higher)
- You are incapacitated or killed

## Spell Slots
- Regained after a long rest
- Used to cast spells of that level or lower
`,
      resting: `# Resting Rules (D&D 5E)

## Short Rest (1 hour)
- Regain hit points by spending Hit Dice (1d[class hit die] + CON modifier per die)
- Some class features recharge

## Long Rest (8 hours)
- Regain all lost hit points
- Regain all Hit Dice (at least half your total)
- Regain all spell slots
- Some class features recharge
`,
      all: `# D&D 5E Core Rules Reference

This is a comprehensive rules reference. Use get_rules_reference with specific topics:
- combat
- spellcasting
- resting
- ability_checks
- saving_throws
`,
    };

    return rules[topic] || rules.all;
  },
};

// Start the D&D 5E MCP server
console.error('[D&D 5E MCP Server] Starting...');

createMCPServer('dnd5e', dnd5eProvider)
  .then(() => {
    console.error('[D&D 5E MCP Server] Ready to serve!');
  })
  .catch((error) => {
    console.error('[D&D 5E MCP Server] Failed to start:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[D&D 5E MCP Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[D&D 5E MCP Server] Shutting down...');
  process.exit(0);
});
