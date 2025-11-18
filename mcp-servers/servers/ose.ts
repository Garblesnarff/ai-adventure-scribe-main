/**
 * Old-School Essentials Classic MCP Server Entry Point
 *
 * Launches an MCP server with OSE Classic game system data and mechanics.
 */

import { createMCPServer, GameSystemDataProvider } from '../manager.js';

const oseProvider: GameSystemDataProvider = {
  getClasses: () => {
    return [
      {
        id: 'fighter',
        name: 'Fighter',
        description: 'A warrior skilled in combat',
        hitDie: 8,
        primaryAbility: 'Strength',
        saves: 'Fighter',
      },
      {
        id: 'magic-user',
        name: 'Magic-User',
        description: 'A practitioner of arcane magic',
        hitDie: 4,
        primaryAbility: 'Intelligence',
        saves: 'Magic-User',
      },
      {
        id: 'cleric',
        name: 'Cleric',
        description: 'A holy warrior blessed by the gods',
        hitDie: 6,
        primaryAbility: 'Wisdom',
        saves: 'Cleric',
      },
      {
        id: 'thief',
        name: 'Thief',
        description: 'A skilled rogue and scout',
        hitDie: 4,
        primaryAbility: 'Dexterity',
        saves: 'Thief',
      },
    ];
  },

  getRaces: () => {
    return [
      {
        id: 'dwarf',
        name: 'Dwarf',
        description: 'Stout demi-humans who dwell underground',
        hitDie: 8,
        levelLimit: 12,
      },
      {
        id: 'elf',
        name: 'Elf',
        description: 'Slender, fey demi-humans',
        hitDie: 6,
        levelLimit: 10,
      },
      {
        id: 'halfling',
        name: 'Halfling',
        description: 'Small, peaceful demi-humans',
        hitDie: 6,
        levelLimit: 8,
      },
    ];
  },

  getEquipment: () => {
    return [
      {
        id: 'sword',
        name: 'Sword',
        type: 'weapon',
        damage: '1d8',
        cost: { amount: 10, currency: 'gp' },
        weight: 10,
      },
      {
        id: 'chain-mail',
        name: 'Chain Mail',
        type: 'armor',
        armorClass: 5,
        cost: { amount: 40, currency: 'gp' },
        weight: 40,
      },
      {
        id: 'shield',
        name: 'Shield',
        type: 'armor',
        armorClass: -1,
        cost: { amount: 10, currency: 'gp' },
        weight: 10,
      },
    ];
  },

  calculateAbilityModifier: (score: number): number => {
    // OSE uses the classic B/X modifiers
    if (score <= 3) return -3;
    if (score <= 5) return -2;
    if (score <= 8) return -1;
    if (score <= 12) return 0;
    if (score <= 15) return 1;
    if (score <= 17) return 2;
    return 3;
  },

  calculateProficiencyBonus: (level: number): number => {
    // OSE doesn't have proficiency bonus, but we can return THAC0 improvement
    // or saving throw bonus
    return Math.floor(level / 3);
  },

  calculateHitPoints: (className: string, level: number, conMod: number): number => {
    // Hit die by class
    const hitDice: Record<string, number> = {
      fighter: 8,
      'magic-user': 4,
      cleric: 6,
      thief: 4,
      dwarf: 8,
      elf: 6,
      halfling: 6,
    };

    const hitDie = hitDice[className.toLowerCase()] || 6;

    // OSE: Roll hit die per level (we'll use average) + CON modifier per level
    const averageRoll = Math.floor(hitDie / 2) + 1;
    return level * (averageRoll + conMod);
  },

  rollInitiative: (dexMod: number): number => {
    // OSE uses 1d6 for initiative (group-based, but we'll use individual)
    return Math.floor(Math.random() * 6) + 1 + dexMod;
  },

  getRulesReference: (topic: string): string => {
    const rules: Record<string, string> = {
      combat: `# Combat Rules (OSE Classic)

## Combat Sequence
1. **Declare Spells** - Players declare spells
2. **Initiative** - Each side rolls 1d6 (higher goes first)
3. **Winning Side Acts** - Movement, missile attacks, spells
4. **Losing Side Acts** - Movement, missile attacks, spells
5. **Melee Combat** - Resolve melee attacks
6. **Next Round** - Repeat

## Attack Rolls
1. Roll 1d20
2. Add/subtract modifiers (Strength for melee, Dexterity for missile)
3. Compare to THAC0 (To Hit Armor Class 0)
4. If roll ≥ (THAC0 - target AC), the attack hits

## Armor Class
- Lower AC is better
- Unarmored: AC 9
- Leather: AC 7
- Chain mail: AC 5
- Plate mail: AC 3
- Shield: -1 to AC

## Damage
Roll weapon damage dice and apply to target HP
`,
      spellcasting: `# Spellcasting Rules (OSE Classic)

## Casting Spells
1. **Memorization** - Spells must be memorized after rest
2. **Declaration** - Declare spell at start of round
3. **Casting** - Cast during initiative phase
4. **Disruption** - Taking damage disrupts the spell

## Spell Levels
- Magic-Users: Levels 1-6
- Clerics: Levels 1-5

## Memorization
- After 8 hours rest, choose spells to memorize
- Number of spells based on class level and spell level
- Once cast, spell is forgotten until re-memorized

## Reversible Spells
Some cleric spells can be cast in reverse (e.g., Cure Light Wounds / Cause Light Wounds)
`,
      resting: `# Resting Rules (OSE Classic)

## Rest
- **1 turn (10 minutes)**: Must rest 1 turn per 5 turns of exploration
- **8 hours**: Full rest required daily
  - Regain all hit points
  - Re-memorize spells

## Healing
- Natural healing: 1d3 HP per day of rest
- Magical healing: Potions, spells
`,
      all: `# OSE Classic Core Rules Reference

This is a comprehensive rules reference. Use get_rules_reference with specific topics:
- combat
- spellcasting
- resting
- ability_checks
- saving_throws
- thac0
`,
    };

    return rules[topic] || rules.all;
  },
};

// Start the OSE MCP server
console.error('[OSE Classic MCP Server] Starting...');

createMCPServer('ose_classic', oseProvider)
  .then(() => {
    console.error('[OSE Classic MCP Server] Ready to serve!');
  })
  .catch((error) => {
    console.error('[OSE Classic MCP Server] Failed to start:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('[OSE Classic MCP Server] Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[OSE Classic MCP Server] Shutting down...');
  process.exit(0);
});
