/**
 * Model Context Protocol (MCP) Server for Knave RPG
 *
 * This server provides MCP tools, resources, and prompts for the Knave tabletop RPG system.
 * It enables Claude and other AI models to resolve Knave combat, checks, and equipment through
 * standardized MCP interfaces.
 */

// Declare process and console to avoid type errors when @types/node is not available
declare const process: any;
declare const console: any;

/**
 * Tool and Resource definitions
 */

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

interface Resource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  contents?: Array<{
    uri: string;
    mimeType: string;
    text?: string;
  }>;
}

interface Prompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

// Import equipment and utilities
import {
  KNAVE_WEAPONS,
  KNAVE_ARMOR,
  KNAVE_GEAR,
  KNAVE_SPELLS,
  getWeaponsResource,
  getArmorResource,
  getGearResource,
  getSpellsResource,
} from './equipment.js';
import { KNAVE_COMBAT_PROMPT, EQUIPMENT_CHECK_PROMPT, getPromptByName } from './prompts.js';
import {
  resolveAttack,
  resolveSave,
  resolveAbilityCheck,
  resolveInitiative,
  calculateAC,
  calculateHP,
} from './rules-bridge.js';
import { parseAbility } from './state-utils.js';
import type { Actor, Weapon, Armor, Ability } from './types.js';

/**
 * Define MCP Tools
 */

const TOOLS: Record<string, Tool> = {
  resolve_attack: {
    name: 'resolve_attack',
    description:
      'Resolve a Knave attack roll: d20 + level + ability modifier vs target AC. Returns hit/miss, attack total, target AC, and damage if hit.',
    inputSchema: {
      type: 'object',
      properties: {
        attacker: {
          type: 'object',
          description: 'The attacking character',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            level: { type: 'number' },
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
            equippedWeapons: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  ability: { type: 'string' },
                  damageDice: { type: 'string' },
                },
              },
            },
          },
        },
        defender: {
          type: 'object',
          description: 'The defending character',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            abilities: {
              type: 'object',
              properties: {
                dex: { type: 'number' },
              },
            },
            equippedArmor: {
              type: 'object',
              properties: {
                acBonus: { type: 'number' },
              },
            },
          },
        },
        weaponName: {
          type: 'string',
          description: 'Name of the weapon being used',
        },
        seed: {
          type: 'string',
          description: 'Optional seed for deterministic rolls',
        },
      },
      required: ['attacker', 'defender', 'weaponName'],
    },
  },

  resolve_save: {
    name: 'resolve_save',
    description:
      'Resolve a Knave saving throw: d20 + level + ability modifier vs DC. Returns success/failure and total.',
    inputSchema: {
      type: 'object',
      properties: {
        actor: {
          type: 'object',
          description: 'The character making the save',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            level: { type: 'number' },
            abilities: {
              type: 'object',
            },
          },
        },
        ability: {
          type: 'string',
          description: 'Ability to use (str, dex, con, int, wis, cha)',
        },
        dc: {
          type: 'number',
          description: 'Difficulty class to beat',
        },
        seed: {
          type: 'string',
          description: 'Optional seed for deterministic rolls',
        },
      },
      required: ['actor', 'ability', 'dc'],
    },
  },

  resolve_ability_check: {
    name: 'resolve_ability_check',
    description:
      'Resolve a Knave ability check: d20 + ability modifier vs optional DC. Returns success/failure and total.',
    inputSchema: {
      type: 'object',
      properties: {
        actor: {
          type: 'object',
          description: 'The character making the check',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            abilities: {
              type: 'object',
            },
          },
        },
        ability: {
          type: 'string',
          description: 'Ability to use (str, dex, con, int, wis, cha)',
        },
        dc: {
          type: 'number',
          description: 'Optional difficulty class',
        },
        seed: {
          type: 'string',
          description: 'Optional seed for deterministic rolls',
        },
      },
      required: ['actor', 'ability'],
    },
  },

  resolve_initiative: {
    name: 'resolve_initiative',
    description:
      'Resolve initiative order: d20 + DEX modifier for each combatant. Returns sorted initiative order.',
    inputSchema: {
      type: 'object',
      properties: {
        actors: {
          type: 'array',
          description: 'Array of combatants',
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
        seed: {
          type: 'string',
          description: 'Optional seed for deterministic rolls',
        },
      },
      required: ['actors'],
    },
  },

  calculate_ac: {
    name: 'calculate_ac',
    description:
      'Calculate armor class: 11 + armor bonus + DEX modifier. Returns final AC value.',
    inputSchema: {
      type: 'object',
      properties: {
        baseAC: {
          type: 'number',
          description: 'Base AC (default 11)',
        },
        armorBonus: {
          type: 'number',
          description: 'Armor bonus (0 to 4)',
        },
        dexScore: {
          type: 'number',
          description: 'DEX ability score',
        },
      },
      required: ['dexScore'],
    },
  },

  calculate_hp: {
    name: 'calculate_hp',
    description: 'Calculate max HP: 8 per level + (CON modifier × level), minimum 1 HP per level.',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'number',
          description: 'Character level',
        },
        conScore: {
          type: 'number',
          description: 'CON ability score',
        },
      },
      required: ['level', 'conScore'],
    },
  },
};

/**
 * Define MCP Resources
 */

const RESOURCES: Record<string, Resource> = {
  'equipment/weapons': {
    uri: 'knave://equipment/weapons',
    name: 'Knave Weapons',
    description: 'Complete list of Knave weapons with damage dice and properties',
    mimeType: 'application/json',
    contents: [
      {
        uri: 'knave://equipment/weapons',
        mimeType: 'application/json',
        text: getWeaponsResource(),
      },
    ],
  },

  'equipment/armor': {
    uri: 'knave://equipment/armor',
    name: 'Knave Armor',
    description: 'Complete list of Knave armor types with AC bonuses',
    mimeType: 'application/json',
    contents: [
      {
        uri: 'knave://equipment/armor',
        mimeType: 'application/json',
        text: getArmorResource(),
      },
    ],
  },

  'equipment/gear': {
    uri: 'knave://equipment/gear',
    name: 'Knave Gear',
    description: 'General gear and tools for adventurers',
    mimeType: 'application/json',
    contents: [
      {
        uri: 'knave://equipment/gear',
        mimeType: 'application/json',
        text: getGearResource(),
      },
    ],
  },

  'items/spells': {
    uri: 'knave://items/spells',
    name: 'Knave Spells',
    description: 'Spell list for spell-casting characters',
    mimeType: 'application/json',
    contents: [
      {
        uri: 'knave://items/spells',
        mimeType: 'application/json',
        text: getSpellsResource(),
      },
    ],
  },
};

/**
 * Define MCP Prompts
 */

const PROMPTS: Record<string, Prompt> = {
  knave_combat: {
    name: 'knave_combat',
    description: 'Template for running Knave combat encounters with examples',
    arguments: [
      {
        name: 'encounter_summary',
        description: 'Brief description of the combat encounter',
        required: false,
      },
    ],
  },

  equipment_check: {
    name: 'equipment_check',
    description: 'Guide for resolving equipment-based ability checks in Knave',
    arguments: [
      {
        name: 'check_type',
        description: 'Type of check (attack, climb, lock-pick, etc)',
        required: false,
      },
    ],
  },
};

/**
 * Tool handler functions
 */

async function handleResolveAttack(args: Record<string, unknown>): Promise<string> {
  const attacker = args.attacker as Actor;
  const defender = args.defender as Actor;
  const weaponName = args.weaponName as string;
  const seed = args.seed as string | undefined;

  // Find the weapon
  const weapon = KNAVE_WEAPONS[weaponName.toLowerCase().replace(/\s+/g, '_')];
  if (!weapon) {
    return JSON.stringify({
      error: `Weapon not found: ${weaponName}. Available weapons: ${Object.keys(KNAVE_WEAPONS).join(', ')}`,
    });
  }

  const result = resolveAttack(attacker, defender, weapon, seed);
  return JSON.stringify(result, null, 2);
}

async function handleResolveSave(args: Record<string, unknown>): Promise<string> {
  const actor = args.actor as Actor;
  const abilityStr = args.ability as string;
  const dc = args.dc as number;
  const seed = args.seed as string | undefined;

  const ability = parseAbility(abilityStr);
  if (!ability) {
    return JSON.stringify({
      error: `Invalid ability: ${abilityStr}. Valid abilities: str, dex, con, int, wis, cha`,
    });
  }

  const result = resolveSave(actor, ability, dc, seed);
  return JSON.stringify(result, null, 2);
}

async function handleResolveAbilityCheck(args: Record<string, unknown>): Promise<string> {
  const actor = args.actor as Actor;
  const abilityStr = args.ability as string;
  const dc = args.dc as number | undefined;
  const seed = args.seed as string | undefined;

  const ability = parseAbility(abilityStr);
  if (!ability) {
    return JSON.stringify({
      error: `Invalid ability: ${abilityStr}. Valid abilities: str, dex, con, int, wis, cha`,
    });
  }

  const result = resolveAbilityCheck(actor, ability, dc, seed);
  return JSON.stringify(result, null, 2);
}

async function handleResolveInitiative(args: Record<string, unknown>): Promise<string> {
  const actors = args.actors as Actor[];
  const seed = args.seed as string | undefined;

  if (!actors || actors.length === 0) {
    return JSON.stringify({ error: 'At least one actor is required' });
  }

  const result = resolveInitiative(actors, seed);
  return JSON.stringify(result, null, 2);
}

async function handleCalculateAC(args: Record<string, unknown>): Promise<string> {
  const baseAC = (args.baseAC as number) || 11;
  const armorBonus = (args.armorBonus as number) || 0;
  const dexScore = args.dexScore as number;

  if (dexScore === undefined) {
    return JSON.stringify({ error: 'dexScore is required' });
  }

  const ac = calculateAC(baseAC, { name: 'Custom', type: 'armor', acBonus: armorBonus }, dexScore);
  return JSON.stringify({
    baseAC,
    armorBonus,
    dexScore,
    dexModifier: Math.floor((dexScore - 10) / 2),
    finalAC: ac,
  });
}

async function handleCalculateHP(args: Record<string, unknown>): Promise<string> {
  const level = args.level as number;
  const conScore = args.conScore as number;

  if (level === undefined || conScore === undefined) {
    return JSON.stringify({ error: 'level and conScore are required' });
  }

  const maxHp = calculateHP(level, conScore);
  const conMod = Math.floor((conScore - 10) / 2);
  return JSON.stringify({
    level,
    conScore,
    conModifier: conMod,
    hpPerLevel: 8,
    conBonus: conMod * level,
    maxHP: maxHp,
  });
}

/**
 * Main MCP request handler
 */

interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { id, method, params = {} } = request;

  try {
    switch (method) {
      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: Object.values(TOOLS),
          },
        };

      case 'tools/call': {
        const toolName = (params as Record<string, unknown>).name as string;
        const toolArgs = (params as Record<string, unknown>).arguments as Record<string, unknown>;

        let result: string;
        switch (toolName) {
          case 'resolve_attack':
            result = await handleResolveAttack(toolArgs);
            break;
          case 'resolve_save':
            result = await handleResolveSave(toolArgs);
            break;
          case 'resolve_ability_check':
            result = await handleResolveAbilityCheck(toolArgs);
            break;
          case 'resolve_initiative':
            result = await handleResolveInitiative(toolArgs);
            break;
          case 'calculate_ac':
            result = await handleCalculateAC(toolArgs);
            break;
          case 'calculate_hp':
            result = await handleCalculateHP(toolArgs);
            break;
          default:
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32601,
                message: `Unknown tool: ${toolName}`,
              },
            };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: result }] },
        };
      }

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: Object.values(RESOURCES),
          },
        };

      case 'resources/read': {
        const uri = (params as Record<string, unknown>).uri as string;
        const resource = Object.values(RESOURCES).find((r) => r.uri === uri);

        if (!resource) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: `Resource not found: ${uri}`,
            },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: resource.contents,
          },
        };
      }

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: Object.values(PROMPTS),
          },
        };

      case 'prompts/get': {
        const promptName = (params as Record<string, unknown>).name as string;
        const prompt = getPromptByName(promptName);

        if (!prompt) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32602,
              message: `Prompt not found: ${promptName}`,
            },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            messages: [
              {
                role: 'user',
                content: prompt.content,
              },
            ],
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Unknown method: ${method}`,
          },
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
    };
  }
}

/**
 * Server startup
 */

async function main() {
  // Read from stdin, write to stdout
  const lines: string[] = [];

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (chunk: string) => {
    lines.push(...chunk.split('\n'));

    while (lines.length > 0) {
      const line = lines[0];

      if (!line.trim()) {
        lines.shift();
        continue;
      }

      try {
        const request = JSON.parse(line) as MCPRequest;
        lines.shift();

        const response = await handleRequest(request);
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        // Wait for more data if JSON is incomplete
        if (error instanceof SyntaxError && error.message.includes('Unexpected end')) {
          break;
        }
        lines.shift();
        process.stderr.write(`Error processing request: ${error}\n`);
      }
    }
  });

  process.stdin.on('end', () => {
    process.exit(0);
  });
}

main().catch(console.error);
