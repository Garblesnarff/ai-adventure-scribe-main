/**
 * Cairn RPG MCP Server Entry Point
 *
 * Launches an MCP server with Cairn game system data and mechanics.
 */

import { createMCPServer, GameSystemDataProvider } from '../manager.js';

const cairnProvider: GameSystemDataProvider = {
  getClasses: () => {
    // Cairn is classless, but we can return backgrounds/archetypes
    return [
      {
        id: 'fighter',
        name: 'Fighter Background',
        description: 'Former soldier or warrior',
        startingGear: ['Sword', 'Shield', 'Gambeson'],
      },
      {
        id: 'scholar',
        name: 'Scholar Background',
        description: 'Learned sage or wizard',
        startingGear: ['Spellbook', 'Dagger', 'Writing kit'],
      },
      {
        id: 'thief',
        name: 'Thief Background',
        description: 'Stealthy rogue',
        startingGear: ['Lockpicks', 'Two daggers', 'Dark cloak'],
      },
    ];
  },

  getEquipment: () => {
    return [
      {
        id: 'sword',
        name: 'Sword',
        type: 'weapon',
        damage: 'd8',
        slots: 2,
        cost: { amount: 10, currency: 'gp' },
      },
      {
        id: 'dagger',
        name: 'Dagger',
        type: 'weapon',
        damage: 'd6',
        slots: 1,
        cost: { amount: 5, currency: 'gp' },
      },
      {
        id: 'gambeson',
        name: 'Gambeson',
        type: 'armor',
        armor: 1,
        slots: 1,
        cost: { amount: 15, currency: 'gp' },
      },
      {
        id: 'shield',
        name: 'Shield',
        type: 'armor',
        armor: 1,
        slots: 1,
        cost: { amount: 10, currency: 'gp' },
      },
    ];
  },

  calculateAbilityModifier: (score: number): number => {
    // Cairn doesn't use modifiers in the traditional sense
    // The score itself is used for saves
    // But we can return a simple modifier for compatibility
    if (score <= 6) return -2;
    if (score <= 9) return -1;
    if (score <= 14) return 0;
    if (score <= 17) return 1;
    return 2;
  },

  calculateProficiencyBonus: (level: number): number => {
    // Cairn doesn't have levels or proficiency bonuses
    // Characters progress through scars and equipment
    return 0;
  },

  calculateHitPoints: (className: string, level: number, conMod: number): number => {
    // Cairn uses hit protection (HP), not hit points
    // Starting HP is max hit die (d6) = 6
    // HP doesn't scale with level, but with scars
    return 6;
  },

  rollInitiative: (dexMod: number): number => {
    // Cairn doesn't use initiative - DEX saves determine turn order
    // Higher DEX goes first (we'll simulate with d20 + DEX)
    return Math.floor(Math.random() * 20) + 1 + dexMod;
  },

  getRulesReference: (topic: string): string => {
    const rules: Record<string, string> = {
      combat: `# Combat Rules (Cairn)

## Combat Rounds
1. **Declare Actions** - Each side declares what they're doing
2. **Determine Order** - The side at risk acts first
3. **Resolve Actions** - Roll attacks, saves, etc.

## Attacks
- Attacks always hit
- Roll weapon damage die (e.g., d6 for dagger, d8 for sword)
- Subtract from HP first, then STR if HP is gone

## Saves
When facing danger, roll d20:
- If ≤ relevant ability score, you succeed
- STR: Physical danger, melee combat
- DEX: Dodging, reflexes
- WIL: Mental fortitude, magic

## Critical Damage
When taking STR damage, make a STR save:
- Fail: Take a **Scar** and are incapacitated
- Success: Continue fighting

## Scars
When reduced to 0 STR:
1. Roll on Scars table
2. If a duplicate scar, you die
3. Scars permanently reduce ability scores
4. Scars provide story and character growth
`,
      magic: `# Magic Rules (Cairn)

## Spellbooks
- Spellbooks contain one spell each
- Take up 1 inventory slot
- Must be held to cast

## Casting Spells
- No spell slots - spells can be cast repeatedly
- Spellbooks are fragile and can be lost

## Fatigue
Some spells or actions cause Fatigue:
- Each Fatigue takes up 1 inventory slot
- At 10+ Fatigue, must rest
- Rest removes all Fatigue

## Relics
Magical items with charges or conditions
- More reliable than spellbooks
- Often have drawbacks or costs
`,
      resting: `# Resting Rules (Cairn)

## Rest (8 hours)
- Restore all HP
- Restore all ability scores
- Remove all Fatigue

## Rations
- Consume 1 ration per day
- No ration = gain 1 Fatigue

## Healing
- Full rest (8 hours): restore all HP and ability damage
- No gradual healing - it's all or nothing
`,
      inventory: `# Inventory Rules (Cairn)

## Slots
- 10 inventory slots total
- Most items take 1 slot
- Small items can be bundled (3 per slot)
- Heavy items take 2 slots

## Deprived
If unable to rest or missing rations:
- Cannot recover HP or ability scores
- Become Deprived
- Can lead to death if prolonged
`,
      all: `# Cairn Core Rules Reference

This is a comprehensive rules reference. Use get_rules_reference with specific topics:
- combat
- magic
- resting
- inventory
- saves
- scars
`,
    };

    return rules[topic] || rules.all;
  },
};

// Start the Cairn MCP server
console.error('[Cairn MCP Server] Starting...');

createMCPServer('cairn', cairnProvider)
  .then(() => {
    console.error('[Cairn MCP Server] Ready to serve!');
  })
  .catch((error) => {
    console.error('[Cairn MCP Server] Failed to start:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[Cairn MCP Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[Cairn MCP Server] Shutting down...');
  process.exit(0);
});
