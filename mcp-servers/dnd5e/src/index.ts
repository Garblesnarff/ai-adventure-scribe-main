#!/usr/bin/env node

/**
 * Model Context Protocol Server for D&D 5E Rules
 *
 * This server provides tools, resources, and prompts for D&D 5E game mechanics.
 * It exposes the rules engine for combat resolution, ability checks, and other game mechanics,
 * as well as resources for game data like classes, spells, and equipment.
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
import { z } from 'zod';

import * as dataProvider from './data-provider.js';
import * as rulesAdapter from './rules-adapter.js';
import { Ability, Actor, DamageType, Weapon } from './types.js';

// Create server instance
const server = new Server(
  {
    name: 'dnd5e-rules-server',
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
 * TOOLS - Functions AI can call to resolve game mechanics
 */

// Tool: resolve_attack
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'resolve_attack') {
      const { attacker, defender, weapon, advantage, disadvantage, cover } = args as {
        attacker: Actor;
        defender: Actor;
        weapon: Weapon;
        advantage?: boolean;
        disadvantage?: boolean;
        cover?: 'none' | 'half' | 'three-quarters' | 'full';
      };

      const result = rulesAdapter.resolveAttack({
        attacker,
        defender,
        weapon,
        advantage,
        disadvantage,
        cover,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'resolve_save') {
      const { actor, ability, dc, advantage, disadvantage, proficient } = args as {
        actor: Actor;
        ability: Ability;
        dc: number;
        advantage?: boolean;
        disadvantage?: boolean;
        proficient?: boolean;
      };

      const result = rulesAdapter.resolveSave({
        actor,
        ability,
        dc,
        advantage,
        disadvantage,
        proficient,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'resolve_ability_check') {
      const { actor, ability, dc, advantage, disadvantage, proficient } = args as {
        actor: Actor;
        ability: Ability;
        dc?: number;
        advantage?: boolean;
        disadvantage?: boolean;
        proficient?: boolean;
      };

      const result = rulesAdapter.resolveAbilityCheck({
        actor,
        ability,
        dc,
        advantage,
        disadvantage,
        proficient,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'resolve_initiative') {
      const { actors } = args as { actors: Actor[] };

      const result = rulesAdapter.resolveInitiative(actors);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'resolve_death_save') {
      const result = rulesAdapter.resolveDeathSave();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'resolve_spell_attack') {
      const { caster, target, spellName, spellLevel, advantage, disadvantage } = args as {
        caster: Actor;
        target: Actor;
        spellName: string;
        spellLevel: number;
        advantage?: boolean;
        disadvantage?: boolean;
      };

      const result = rulesAdapter.resolveSpellAttack({
        caster,
        target,
        spellName,
        spellLevel,
        advantage,
        disadvantage,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === 'calculate_damage') {
      const { damage, damageType, target } = args as {
        damage: number;
        damageType: DamageType;
        target: Actor;
      };

      const result = rulesAdapter.calculateDamage({
        damage,
        damageType,
        target,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'resolve_attack',
        description: 'Resolve an attack roll against a target, including hit/miss determination and damage calculation',
        inputSchema: {
          type: 'object',
          properties: {
            attacker: {
              type: 'object',
              description: 'The attacking actor',
            },
            defender: {
              type: 'object',
              description: 'The defending actor',
            },
            weapon: {
              type: 'object',
              description: 'The weapon being used',
            },
            advantage: {
              type: 'boolean',
              description: 'Whether the attack has advantage',
            },
            disadvantage: {
              type: 'boolean',
              description: 'Whether the attack has disadvantage',
            },
            cover: {
              type: 'string',
              enum: ['none', 'half', 'three-quarters', 'full'],
              description: 'Cover level of the target',
            },
          },
          required: ['attacker', 'defender', 'weapon'],
        },
      },
      {
        name: 'resolve_save',
        description: 'Resolve a saving throw against a DC',
        inputSchema: {
          type: 'object',
          properties: {
            actor: { type: 'object', description: 'The actor making the save' },
            ability: { type: 'string', enum: ['str', 'dex', 'con', 'int', 'wis', 'cha'], description: 'Ability used for the save' },
            dc: { type: 'number', description: 'Difficulty Class' },
            advantage: { type: 'boolean' },
            disadvantage: { type: 'boolean' },
            proficient: { type: 'boolean', description: 'Whether the actor is proficient in this save' },
          },
          required: ['actor', 'ability', 'dc'],
        },
      },
      {
        name: 'resolve_ability_check',
        description: 'Resolve an ability check or skill check',
        inputSchema: {
          type: 'object',
          properties: {
            actor: { type: 'object', description: 'The actor making the check' },
            ability: { type: 'string', enum: ['str', 'dex', 'con', 'int', 'wis', 'cha'] },
            dc: { type: 'number', description: 'Optional DC to check against' },
            advantage: { type: 'boolean' },
            disadvantage: { type: 'boolean' },
            proficient: { type: 'boolean', description: 'Whether the actor is proficient' },
          },
          required: ['actor', 'ability'],
        },
      },
      {
        name: 'resolve_initiative',
        description: 'Roll initiative for all actors in an encounter',
        inputSchema: {
          type: 'object',
          properties: {
            actors: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of actors to roll initiative for',
            },
          },
          required: ['actors'],
        },
      },
      {
        name: 'resolve_death_save',
        description: 'Roll a death saving throw for an unconscious character',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'resolve_spell_attack',
        description: 'Resolve a spell attack roll',
        inputSchema: {
          type: 'object',
          properties: {
            caster: { type: 'object', description: 'The spellcaster' },
            target: { type: 'object', description: 'The target' },
            spellName: { type: 'string', description: 'Name of the spell' },
            spellLevel: { type: 'number', description: 'Level of the spell' },
            advantage: { type: 'boolean' },
            disadvantage: { type: 'boolean' },
          },
          required: ['caster', 'target', 'spellName', 'spellLevel'],
        },
      },
      {
        name: 'calculate_damage',
        description: 'Calculate damage after applying resistances, immunities, and vulnerabilities',
        inputSchema: {
          type: 'object',
          properties: {
            damage: { type: 'number', description: 'Base damage amount' },
            damageType: {
              type: 'string',
              enum: ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder'],
            },
            target: { type: 'object', description: 'Target actor' },
          },
          required: ['damage', 'damageType', 'target'],
        },
      },
    ],
  };
});

/**
 * RESOURCES - Data AI can read
 */

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'dnd5e://classes',
        name: 'D&D 5E Classes',
        description: 'List of all D&D 5E classes with their features',
        mimeType: 'application/json',
      },
      {
        uri: 'dnd5e://classes/{className}',
        name: 'D&D 5E Class Details',
        description: 'Detailed information about a specific class',
        mimeType: 'application/json',
      },
      {
        uri: 'dnd5e://spells/level/{level}',
        name: 'Spells by Level',
        description: 'Get all spells of a specific level (0-9)',
        mimeType: 'application/json',
      },
      {
        uri: 'dnd5e://spells/{spellName}',
        name: 'Spell Details',
        description: 'Detailed information about a specific spell',
        mimeType: 'application/json',
      },
      {
        uri: 'dnd5e://conditions',
        name: 'Status Conditions',
        description: 'List of all D&D 5E status conditions',
        mimeType: 'application/json',
      },
      {
        uri: 'dnd5e://equipment/weapons',
        name: 'Weapons',
        description: 'List of all weapons',
        mimeType: 'application/json',
      },
      {
        uri: 'dnd5e://equipment/armor',
        name: 'Armor',
        description: 'List of all armor and shields',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  try {
    if (uri === 'dnd5e://classes') {
      const classes = dataProvider.getAllClasses();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(classes, null, 2),
          },
        ],
      };
    }

    const classMatch = uri.match(/^dnd5e:\/\/classes\/(.+)$/);
    if (classMatch) {
      const className = classMatch[1];
      const classData = dataProvider.getClass(className);
      if (!classData) {
        throw new Error(`Class not found: ${className}`);
      }
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(classData, null, 2),
          },
        ],
      };
    }

    const spellLevelMatch = uri.match(/^dnd5e:\/\/spells\/level\/(\d+)$/);
    if (spellLevelMatch) {
      const level = parseInt(spellLevelMatch[1], 10);
      const spells = dataProvider.getSpellsByLevel(level);
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

    const spellMatch = uri.match(/^dnd5e:\/\/spells\/(.+)$/);
    if (spellMatch) {
      const spellName = spellMatch[1];
      const spell = dataProvider.getSpell(spellName);
      if (!spell) {
        throw new Error(`Spell not found: ${spellName}`);
      }
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(spell, null, 2),
          },
        ],
      };
    }

    if (uri === 'dnd5e://conditions') {
      const conditions = dataProvider.getAllConditions();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(conditions, null, 2),
          },
        ],
      };
    }

    if (uri === 'dnd5e://equipment/weapons') {
      const weapons = dataProvider.getAllWeapons();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(weapons, null, 2),
          },
        ],
      };
    }

    if (uri === 'dnd5e://equipment/armor') {
      const armor = dataProvider.getAllArmor();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(armor, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Error reading resource: ${errorMessage}`);
  }
});

/**
 * PROMPTS - Templates for common tasks
 */

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'combat_turn',
        description: 'Template for resolving a combat turn',
        arguments: [
          {
            name: 'actor_name',
            description: 'Name of the actor taking their turn',
            required: true,
          },
          {
            name: 'action_description',
            description: 'Description of the action being taken',
            required: true,
          },
        ],
      },
      {
        name: 'skill_check',
        description: 'Template for resolving a skill check',
        arguments: [
          {
            name: 'character_name',
            description: 'Name of the character',
            required: true,
          },
          {
            name: 'skill',
            description: 'The skill being used',
            required: true,
          },
          {
            name: 'task',
            description: 'What the character is trying to do',
            required: true,
          },
        ],
      },
      {
        name: 'spellcasting',
        description: 'Template for casting a spell',
        arguments: [
          {
            name: 'caster_name',
            description: 'Name of the spellcaster',
            required: true,
          },
          {
            name: 'spell_name',
            description: 'Name of the spell',
            required: true,
          },
          {
            name: 'target',
            description: 'Target of the spell',
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'combat_turn') {
    const actorName = args?.actor_name || 'the character';
    const actionDescription = args?.action_description || 'takes an action';

    return {
      description: `Resolve a combat turn for ${actorName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `It's ${actorName}'s turn in combat. ${actorName} ${actionDescription}.

Please resolve this turn using the D&D 5E rules:
1. Determine what type of action this is (attack, spell, etc.)
2. Use the appropriate tool (resolve_attack, resolve_spell_attack, etc.)
3. Apply any relevant conditions or modifiers
4. Narrate the outcome

Consider:
- Does the actor have advantage or disadvantage?
- Are there any conditions affecting the actor?
- What is the appropriate DC or AC to beat?`,
          },
        },
      ],
    };
  }

  if (name === 'skill_check') {
    const characterName = args?.character_name || 'the character';
    const skill = args?.skill || 'a skill';
    const task = args?.task || 'attempt something';

    return {
      description: `Resolve a skill check for ${characterName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${characterName} is attempting to ${task} using ${skill}.

Please resolve this skill check:
1. Determine the appropriate ability for this ${skill} check
2. Set an appropriate DC based on the difficulty
3. Use the resolve_ability_check tool
4. Describe the outcome based on success or failure

Consider:
- What is the difficulty of this task? (Easy: DC 10, Medium: DC 15, Hard: DC 20, Very Hard: DC 25)
- Does the character have proficiency in this skill?
- Are there circumstances that grant advantage or disadvantage?`,
          },
        },
      ],
    };
  }

  if (name === 'spellcasting') {
    const casterName = args?.caster_name || 'the spellcaster';
    const spellName = args?.spell_name || 'a spell';
    const target = args?.target || 'a target';

    return {
      description: `Resolve spellcasting for ${casterName}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `${casterName} is casting ${spellName}${target ? ` targeting ${target}` : ''}.

Please resolve this spell:
1. Look up the spell details using the dnd5e://spells/{spellName} resource
2. Check if the caster has the required spell slot
3. If it's an attack spell, use resolve_spell_attack
4. If it requires a saving throw, use resolve_save
5. Apply spell effects and damage
6. Narrate the outcome

Consider:
- What level is the spell being cast at?
- Does the spell require concentration?
- Are there any special conditions or modifiers?`,
          },
        },
      ],
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('D&D 5E MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
