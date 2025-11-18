#!/usr/bin/env node

/**
 * Model Context Protocol (MCP) Server for Old-School Essentials (OSE)
 *
 * This server exposes OSE rules, data, and mechanics through the MCP protocol.
 * It provides tools for rule resolution, resources for game data, and prompts
 * for common OSE scenarios.
 *
 * @see https://modelcontextprotocol.io/
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  OSE_CLASSIC_CLASSES,
  OSE_ADVANCED_CLASSES,
  ALL_OSE_CLASSES,
  getClassById,
  getClassesByCategory,
} from './data/ose-classes.js';
import {
  OSE_WEAPONS,
  OSE_ARMOR,
  OSE_ADVENTURING_GEAR,
} from './data/ose-equipment.js';
import {
  getSpellsByType,
  getSpellsByLevel,
} from './data/ose-spells.js';
import {
  getSavingThrowForClass,
} from './data/ose-saving-throws.js';
import {
  resolveAttack,
  resolveSavingThrow,
  resolveAbilityCheck,
  resolveInitiative,
  resolveTurnUndead,
  memorizeSpell,
} from './rules-adapter.js';

// Create server instance
const server = new Server(
  {
    name: 'ose-rules-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

/**
 * TOOLS
 * Tools for resolving OSE game mechanics
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'resolve_attack',
        description: 'Resolve an OSE attack roll using THAC0 or ascending AC',
        inputSchema: {
          type: 'object',
          properties: {
            attacker: {
              type: 'object',
              description: 'Attacking actor with stats',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                level: { type: 'number' },
                attackBonus: { type: 'number' },
                abilities: {
                  type: 'object',
                  properties: {
                    str: { type: 'number' },
                    dex: { type: 'number' },
                    con: { type: 'number' },
                    int: { type: 'number' },
                    wis: { type: 'number' },
                    cha: { type: 'number' },
                  },
                },
              },
              required: ['id', 'name', 'level', 'attackBonus', 'abilities'],
            },
            defender: {
              type: 'object',
              description: 'Defending actor with AC',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                ac: {
                  type: 'object',
                  properties: {
                    base: { type: 'number' },
                    ascending: { type: 'boolean' },
                  },
                },
              },
              required: ['id', 'name', 'ac'],
            },
            weapon: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                melee: { type: 'boolean' },
                ranged: { type: 'boolean' },
                damageDice: { type: 'string', description: 'e.g., "1d8"' },
                damageType: { type: 'string' },
              },
              required: ['name', 'melee', 'ranged', 'damageDice', 'damageType'],
            },
            ascending: {
              type: 'boolean',
              description: 'Use ascending AC (true) or descending AC/THAC0 (false)',
              default: true,
            },
            seed: {
              type: 'string',
              description: 'Optional seed for deterministic rolls',
            },
          },
          required: ['attacker', 'defender', 'weapon'],
        },
      },
      {
        name: 'resolve_save',
        description: 'Resolve an OSE saving throw (5 categories: death, wands, paralysis, breath, spells)',
        inputSchema: {
          type: 'object',
          properties: {
            actor: {
              type: 'object',
              description: 'Actor making the save',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                savingThrows: {
                  type: 'object',
                  properties: {
                    death: { type: 'number' },
                    wands: { type: 'number' },
                    paralysis: { type: 'number' },
                    breath: { type: 'number' },
                    spells: { type: 'number' },
                  },
                  required: ['death', 'wands', 'paralysis', 'breath', 'spells'],
                },
              },
              required: ['id', 'name', 'savingThrows'],
            },
            category: {
              type: 'string',
              enum: ['death', 'wands', 'paralysis', 'breath', 'spells'],
              description: 'Saving throw category',
            },
            seed: { type: 'string', description: 'Optional seed for deterministic rolls' },
          },
          required: ['actor', 'category'],
        },
      },
      {
        name: 'resolve_ability_check',
        description: 'Resolve an OSE ability check (roll under ability score on d20)',
        inputSchema: {
          type: 'object',
          properties: {
            actor: {
              type: 'object',
              description: 'Actor making the check',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                abilities: {
                  type: 'object',
                  properties: {
                    str: { type: 'number' },
                    dex: { type: 'number' },
                    con: { type: 'number' },
                    int: { type: 'number' },
                    wis: { type: 'number' },
                    cha: { type: 'number' },
                  },
                  required: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
                },
              },
              required: ['id', 'name', 'abilities'],
            },
            ability: {
              type: 'string',
              enum: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
              description: 'Ability to check',
            },
            seed: { type: 'string', description: 'Optional seed for deterministic rolls' },
          },
          required: ['actor', 'ability'],
        },
      },
      {
        name: 'resolve_initiative',
        description: 'Resolve OSE initiative (d6 or d20, side-based or individual)',
        inputSchema: {
          type: 'object',
          properties: {
            actors: {
              type: 'array',
              description: 'Actors rolling initiative',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  abilities: {
                    type: 'object',
                    properties: {
                      dex: { type: 'number' },
                    },
                  },
                },
              },
            },
            useD6: {
              type: 'boolean',
              description: 'Use d6 (true, traditional) or d20 (false)',
              default: true,
            },
            seed: { type: 'string', description: 'Optional seed for deterministic rolls' },
          },
          required: ['actors'],
        },
      },
      {
        name: 'turn_undead',
        description: 'Resolve Cleric turn undead ability',
        inputSchema: {
          type: 'object',
          properties: {
            cleric: {
              type: 'object',
              description: 'Cleric attempting to turn undead',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                level: { type: 'number' },
                turnUndeadLevel: { type: 'number', description: 'Effective turn undead level (defaults to level)' },
              },
              required: ['id', 'name', 'level'],
            },
            undeadHD: {
              type: 'number',
              description: 'Hit Dice of the undead creature',
            },
            seed: { type: 'string', description: 'Optional seed for deterministic rolls' },
          },
          required: ['cleric', 'undeadHD'],
        },
      },
      {
        name: 'memorize_spell',
        description: 'Memorize a spell using Vancian magic system',
        inputSchema: {
          type: 'object',
          properties: {
            actor: {
              type: 'object',
              description: 'Spellcasting actor',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                spellSlots: {
                  type: 'object',
                  description: 'Available spell slots by level',
                },
                memorizedSpells: {
                  type: 'object',
                  description: 'Currently memorized spells',
                },
              },
              required: ['id', 'name'],
            },
            spellName: {
              type: 'string',
              description: 'Name of the spell to memorize',
            },
            level: {
              type: 'number',
              enum: [1, 2, 3, 4, 5, 6],
              description: 'Spell level (1-6)',
            },
          },
          required: ['actor', 'spellName', 'level'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'resolve_attack': {
        const result = resolveAttack(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'resolve_save': {
        const result = resolveSavingThrow(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'resolve_ability_check': {
        const result = resolveAbilityCheck(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'resolve_initiative': {
        const result = resolveInitiative(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'turn_undead': {
        const result = resolveTurnUndead(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'memorize_spell': {
        const result = memorizeSpell(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * RESOURCES
 * Game data resources for OSE
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'ose://classes/classic',
        name: 'OSE Classic Classes',
        description: '7 core classes from OSE Classic Fantasy',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://classes/advanced',
        name: 'OSE Advanced Classes',
        description: '13 additional classes from OSE Advanced Fantasy',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://equipment/weapons',
        name: 'OSE Weapons',
        description: 'Complete OSE weapon list with damage and properties',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://equipment/armor',
        name: 'OSE Armor',
        description: 'OSE armor with both ascending and descending AC',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://equipment/adventuring-gear',
        name: 'OSE Adventuring Gear',
        description: 'Standard adventuring equipment',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://spells/arcane/1',
        name: 'Arcane Spells - Level 1',
        description: 'First-level arcane spells',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://spells/arcane/2',
        name: 'Arcane Spells - Level 2',
        description: 'Second-level arcane spells',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://spells/arcane/3',
        name: 'Arcane Spells - Level 3',
        description: 'Third-level arcane spells',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://spells/divine/1',
        name: 'Divine Spells - Level 1',
        description: 'First-level divine spells',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://spells/divine/2',
        name: 'Divine Spells - Level 2',
        description: 'Second-level divine spells',
        mimeType: 'application/json',
      },
      {
        uri: 'ose://spells/divine/3',
        name: 'Divine Spells - Level 3',
        description: 'Third-level divine spells',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  try {
    if (uri === 'ose://classes/classic') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(OSE_CLASSIC_CLASSES, null, 2),
          },
        ],
      };
    }

    if (uri === 'ose://classes/advanced') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(OSE_ADVANCED_CLASSES, null, 2),
          },
        ],
      };
    }

    if (uri.startsWith('ose://classes/')) {
      const className = uri.split('/').pop();
      const cls = getClassById(className!);
      if (!cls) {
        throw new Error(`Class not found: ${className}`);
      }
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(cls, null, 2),
          },
        ],
      };
    }

    if (uri === 'ose://equipment/weapons') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(OSE_WEAPONS, null, 2),
          },
        ],
      };
    }

    if (uri === 'ose://equipment/armor') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(OSE_ARMOR, null, 2),
          },
        ],
      };
    }

    if (uri === 'ose://equipment/adventuring-gear') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(OSE_ADVENTURING_GEAR, null, 2),
          },
        ],
      };
    }

    if (uri.startsWith('ose://spells/')) {
      const parts = uri.split('/');
      const type = parts[2] as 'arcane' | 'divine';
      const level = parseInt(parts[3]);
      const spells = getSpellsByLevel(type, level);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(spells, null, 2),
          },
        ],
      };
    }

    if (uri.startsWith('ose://saving-throws/')) {
      const parts = uri.split('/');
      const className = parts[2];
      const level = parseInt(parts[3]);
      const saves = getSavingThrowForClass(className, level);

      if (!saves) {
        throw new Error(`Saving throws not found for ${className} level ${level}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(saves, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource URI: ${uri}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read resource: ${errorMessage}`);
  }
});

/**
 * PROMPTS
 * Pre-built prompts for common OSE scenarios
 */
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'ose_combat',
        description: 'Template for running OSE combat encounters',
        arguments: [
          {
            name: 'scene',
            description: 'Description of the combat situation',
            required: true,
          },
        ],
      },
      {
        name: 'ose_exploration',
        description: 'Template for OSE exploration turns (10 minutes)',
        arguments: [
          {
            name: 'location',
            description: 'Location being explored',
            required: true,
          },
        ],
      },
      {
        name: 'vancian_magic',
        description: 'Template for Vancian spell memorization and casting',
        arguments: [
          {
            name: 'caster',
            description: 'Name of the spellcasting character',
            required: true,
          },
          {
            name: 'level',
            description: 'Character level',
            required: true,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'ose_combat':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# OSE Combat Resolution

**Scene:** ${args?.scene || 'Combat encounter'}

## Combat Procedure (Each Round = 10 seconds)

1. **Declare Spells & Retreats**
   - Spellcasters declare spells
   - Characters planning to retreat declare

2. **Initiative**
   - Roll d6 for each side (or individual d20 if using optional rule)
   - Higher roll goes first
   - Re-roll ties

3. **Actions (in initiative order)**
   - Move up to movement rate
   - Attack OR cast spell OR other action
   - Missile attacks: Check range (short/medium/long)
   - Melee attacks: Can move and attack

4. **Morale Checks**
   - First casualty
   - When half the group is down
   - Other circumstances (GM discretion)

## Attack Resolution
- Roll d20 + attack bonus
- Compare to target's AC (ascending) or THAC0 (descending)
- Natural 20 = automatic hit (critical)
- Natural 1 = automatic miss

## Damage
- Roll weapon damage dice
- Add STR modifier for melee
- Apply any situational modifiers
- Subtract from target's HP

## Special Situations
- **Backstab:** Thief gets +4 to hit, double damage
- **Charging:** +2 to hit with lances on horseback
- **Fighting Withdrawal:** Move backward slowly, maintain defense
- **Full Retreat:** Turn and run, enemies get free attack`,
            },
          },
        ],
      };

    case 'ose_exploration':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# OSE Exploration Turn (10 Minutes)

**Location:** ${args?.location || 'Unknown area'}

## Exploration Turn Procedure

1. **Wandering Monsters**
   - Roll d6: 1 = wandering monster appears
   - Distance: 2d6 × 10 feet (both sides surprised on 1-2)

2. **Actions (choose one per turn)**
   - Move 1/3 normal speed (searching/mapping carefully)
   - Search a 10' × 10' area thoroughly
   - Listen at a door (1-in-6 chance for humans, 2-in-6 for demi-humans)
   - Pick locks (Thief ability)
   - Remove traps (Thief ability)
   - Rest (important for reducing fatigue)
   - Force doors (chance based on STR)

3. **Light & Resources**
   - Torches burn 6 turns (1 hour)
   - Lanterns burn 24 turns (4 hours) per flask of oil
   - Track rations, water, ammunition

4. **Dungeon Features**
   - Doors: Usually stuck (1-in-6 to open)
   - Secret Doors: Elves detect on 1-2 on d6
   - Traps: Various detection chances
   - Room description and contents

## Searching
- **10' × 10' area:** Takes 1 turn
- **Secret doors:** 1-in-6 base chance (2-in-6 for Elves)
- **Traps:** Thief skill or 1-in-6 for others
- **Hidden treasure:** 1-in-6 chance if searching

## Common Hazards
- Pit traps
- Poison needles
- Falling blocks
- Gas traps
- Magical wards`,
            },
          },
        ],
      };

    case 'vancian_magic':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Vancian Magic System (OSE)

**Caster:** ${args?.caster || 'Unknown'}
**Level:** ${args?.level || '1'}

## Spell Memorization

### After 8 Hours Rest
1. Study spellbook for spells known
2. Select spells to memorize (up to spell slot limits)
3. Memorized spells are "loaded" and ready to cast
4. Each spell can only be cast once until re-memorized

### Spell Slots by Level
Consult class tables for spell slots available at each level.

Example (Magic-User):
- Level 1: 1 spell
- Level 2: 2 first-level spells
- Level 3: 2 first-level, 1 second-level
- etc.

## Casting Spells

### Requirements
- Spell must be memorized
- Caster must be able to speak and gesture
- Cannot wear armor (Magic-User/Illusionist)
- Clerics can wear armor

### Casting Process
1. Declare spell at start of round
2. Maintain concentration (if hit, spell may be lost)
3. On caster's initiative, spell takes effect
4. Spell is expended and removed from memory

### Spell Interruption
- If damaged during casting, save vs Spells or lose the spell
- Grappling or silence prevents casting

## Regaining Spells
- Must rest 8+ hours
- Must have access to spellbook (arcane casters)
- Divine casters pray for spells
- Re-memorize desired spells

## Scrolls
- Can be used without memorization
- Spell disappears from scroll after use
- Must be able to read magic (Read Magic spell for first time)
- Thieves can use scrolls at 10th level (10% failure chance per level)

## Spell Research
- Magic-Users can research new spells
- Requires time, money, and GM approval
- Cost: 1,000 gp per spell level
- Time: 2 weeks per spell level`,
            },
          },
        ],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OSE MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
