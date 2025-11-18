/**
 * Knave RPG MCP Server Entry Point
 *
 * Launches an MCP server with Knave game system data and mechanics.
 */

import { createMCPServer, GameSystemDataProvider } from '../manager.js';

const knaveProvider: GameSystemDataProvider = {
  getClasses: () => {
    // Knave is classless
    return [
      {
        id: 'adventurer',
        name: 'Adventurer',
        description: 'Knave is a classless system. All characters are adventurers who can use any equipment and gain abilities through items.',
        startingGear: ['Choose from equipment list'],
      },
    ];
  },

  getEquipment: () => {
    return [
      {
        id: 'longsword',
        name: 'Longsword',
        type: 'weapon',
        damage: 'd8',
        slots: 1,
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
        id: 'leather-armor',
        name: 'Leather Armor',
        type: 'armor',
        defense: 1,
        slots: 1,
        cost: { amount: 30, currency: 'gp' },
      },
      {
        id: 'shield',
        name: 'Shield',
        type: 'armor',
        defense: 1,
        slots: 1,
        cost: { amount: 10, currency: 'gp' },
      },
      {
        id: 'spellbook',
        name: 'Spellbook (Random Spell)',
        type: 'magic',
        slots: 1,
        cost: { amount: 100, currency: 'gp' },
      },
    ];
  },

  calculateAbilityModifier: (score: number): number => {
    // Knave uses ability scores as both the bonus and defense
    // Defense = 10 + ability score
    // Bonus = ability score
    // But for compatibility with standard modifier calculation:
    return score - 10;
  },

  calculateProficiencyBonus: (level: number): number => {
    // Knave doesn't use proficiency bonus
    // Level adds to ability bonuses
    return level;
  },

  calculateHitPoints: (className: string, level: number, conMod: number): number => {
    // Knave: HP = CON defense value (10 + CON score + level)
    // This is simplified - actual CON score would be needed
    // Assuming average starting CON of 10
    return 10 + 10 + level;
  },

  rollInitiative: (dexMod: number): number => {
    // Knave uses d8 for initiative + DEX bonus
    return Math.floor(Math.random() * 8) + 1 + dexMod;
  },

  getRulesReference: (topic: string): string => {
    const rules: Record<string, string> = {
      combat: `# Combat Rules (Knave)

## Combat Rounds
1. **Initiative** - Roll d8 + DEX bonus
2. **Take Turns** - Highest to lowest
3. **On Your Turn** - Move and take one action

## Actions
- **Attack** - Roll d20 + STR/DEX bonus vs target's Armor defense
- **Cast Spell** - Cast a spell from a held spellbook
- **Other** - Any reasonable action

## Attack Rolls
1. Roll d20
2. Add your STR bonus (melee) or DEX bonus (ranged)
3. If ≥ target's Armor defense, you hit
4. Roll weapon damage

## Armor Defense
Armor Defense = 10 + armor bonuses (from armor + shield + magic)

## Death and Dying
- At 0 HP: unconscious and dying
- Each round, roll d8:
  - 1-2: You die
  - 3-7: Stay unconscious
  - 8: Regain 1 HP and wake up
`,
      magic: `# Magic Rules (Knave)

## Spellbooks
- Each spellbook contains one spell
- Takes 1 inventory slot
- Must be held in hand to cast

## Casting Spells
- No spell slots - cast any held spell
- Can only cast spells from held spellbooks
- Most characters can hold 2 spellbooks (2 hands)

## Learning Spells
- Find spellbooks as treasure
- Can't copy or learn spells
- Spells are tied to physical spellbooks

## Spell Rules
- All spells work as written
- No spell levels - all spells are equally available
- Power comes from having the right spell at the right time
`,
      resting: `# Resting Rules (Knave)

## Full Rest (8 hours)
- Restore all HP
- Restore all lost attribute points

## Rations
- Consume 1 ration per day
- Without rations, cannot rest effectively

## Healing
- Natural healing: full rest restores all HP
- Healing items: potions, spells, etc.
`,
      inventory: `# Inventory Rules (Knave)

## Item Slots
- Characters have CON defense number of item slots
- Small items (e.g., rations): 1 slot
- Normal items (e.g., weapons, armor): 1 slot
- Heavy items (e.g., treasure, large weapons): multiple slots

## Encumbrance
- Items beyond your slots:
  - Reduce movement
  - Disadvantage on physical actions
  - Cannot rest properly

## Treasure
- Coins: 100 coins = 1 slot
- Gems and jewelry: 1 slot per piece
- Magic items: variable slots
`,
      abilities: `# Abilities (Knave)

## Ability Scores
All six abilities: STR, DEX, CON, INT, WIS, CHA

## Ability Bonus
Bonus = Ability Score

## Ability Defense
Defense = 10 + Ability Score + Level

Example: Level 1 character with INT 10
- INT Bonus: 10
- INT Defense: 10 + 10 + 1 = 21

## Saves
Roll d20 + relevant ability bonus
- Must meet or beat a difficulty (usually 15)
- Or opposed by another creature's defense

## Advancement
- Gain XP from treasure (1 XP per 1 GP)
- Level up every 1000 XP
- Gain +1 to all ability bonuses
- Roll d8, if > current max HP, new max HP
`,
      all: `# Knave Core Rules Reference

This is a comprehensive rules reference. Use get_rules_reference with specific topics:
- combat
- magic
- resting
- inventory
- abilities
- saves
`,
    };

    return rules[topic] || rules.all;
  },
};

// Start the Knave MCP server
console.error('[Knave MCP Server] Starting...');

createMCPServer('knave', knaveProvider)
  .then(() => {
    console.error('[Knave MCP Server] Ready to serve!');
  })
  .catch((error) => {
    console.error('[Knave MCP Server] Failed to start:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[Knave MCP Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[Knave MCP Server] Shutting down...');
  process.exit(0);
});
