#!/usr/bin/env node

/**
 * Cairn RPG Model Context Protocol Server
 *
 * Provides tools, resources, and prompts for the Cairn tabletop RPG system.
 *
 * Tools:
 * - resolve_save: Roll-under saves (d20 ≤ ability)
 * - resolve_attack: Auto-hit, roll damage
 * - apply_damage: Damage with armor reduction
 * - resolve_critical_damage: Critical damage when HP < 0
 * - roll_scar: Roll on scar table
 * - add_fatigue: Add fatigue to inventory
 * - resolve_rest: Short/long rest mechanics
 *
 * Resources:
 * - /equipment/weapons: Cairn weapons (damage dice)
 * - /equipment/armor: Cairn armor (1-3 reduction)
 * - /equipment/gear: General adventuring gear
 * - /scars: Scar table (d100)
 * - /spellbooks: Spellbook list
 * - /traits: Character traits/backgrounds
 *
 * Prompts:
 * - cairn_combat: Cairn combat resolution
 * - critical_damage: Critical damage flow
 * - inventory_management: 10-slot inventory template
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
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  SaveParams,
  AttackParams,
  DamageParams,
  CriticalDamageParams,
  ScarRollParams,
  FatigueParams,
  RestParams,
} from './types.js';
import {
  d20,
  d100,
  rollDice,
  rollDamage,
  savingThrow,
  applyDamage,
  findScar,
} from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load data files
const dataDir = join(__dirname, 'data');
const weapons = JSON.parse(readFileSync(join(dataDir, 'weapons.json'), 'utf-8'));
const armor = JSON.parse(readFileSync(join(dataDir, 'armor.json'), 'utf-8'));
const gear = JSON.parse(readFileSync(join(dataDir, 'gear.json'), 'utf-8'));
const scars = JSON.parse(readFileSync(join(dataDir, 'scars.json'), 'utf-8'));
const spellbooks = JSON.parse(readFileSync(join(dataDir, 'spellbooks.json'), 'utf-8'));
const traits = JSON.parse(readFileSync(join(dataDir, 'traits.json'), 'utf-8'));

// Create server instance
const server = new Server(
  {
    name: 'cairn-rpg-server',
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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'resolve_save',
        description: 'Resolve a Cairn saving throw. Roll d20 ≤ ability score. Natural 1 always succeeds, natural 20 always fails.',
        inputSchema: {
          type: 'object',
          properties: {
            ability: {
              type: 'string',
              enum: ['str', 'dex', 'wil'],
              description: 'The ability to save against (STR, DEX, or WIL)',
            },
            abilityScore: {
              type: 'number',
              description: 'The character\'s ability score (3-18)',
              minimum: 1,
              maximum: 20,
            },
            advantage: {
              type: 'boolean',
              description: 'Roll twice and take the lower result (better for roll-under)',
            },
            disadvantage: {
              type: 'boolean',
              description: 'Roll twice and take the higher result (worse for roll-under)',
            },
            modifier: {
              type: 'number',
              description: 'Situational modifier to ability score',
            },
          },
          required: ['ability', 'abilityScore'],
        },
      },
      {
        name: 'resolve_attack',
        description: 'Resolve a Cairn attack. All attacks auto-hit in Cairn - this rolls damage with optional impaired/enhanced conditions.',
        inputSchema: {
          type: 'object',
          properties: {
            weaponDice: {
              type: 'string',
              description: 'Weapon damage dice (e.g., "1d6", "1d8", "1d10")',
              pattern: '^\\d+d\\d+([+-]\\d+)?$',
            },
            impaired: {
              type: 'boolean',
              description: 'Impaired (disadvantage): roll twice, take lower',
            },
            enhanced: {
              type: 'boolean',
              description: 'Enhanced (advantage): roll twice, take higher',
            },
          },
          required: ['weaponDice'],
        },
      },
      {
        name: 'apply_damage',
        description: 'Apply damage to a character with armor reduction. Armor reduces damage before it affects HP.',
        inputSchema: {
          type: 'object',
          properties: {
            damage: {
              type: 'number',
              description: 'Raw damage rolled',
              minimum: 0,
            },
            armorValue: {
              type: 'number',
              description: 'Armor value (1-3 typically)',
              minimum: 0,
              maximum: 3,
              default: 0,
            },
            currentHp: {
              type: 'number',
              description: 'Character\'s current HP',
              minimum: 0,
            },
          },
          required: ['damage', 'currentHp'],
        },
      },
      {
        name: 'resolve_critical_damage',
        description: 'Resolve critical damage when HP drops below 0. Excess damage reduces STR, then roll STR save to avoid death.',
        inputSchema: {
          type: 'object',
          properties: {
            excessDamage: {
              type: 'number',
              description: 'Damage taken beyond 0 HP',
              minimum: 0,
            },
            currentStr: {
              type: 'number',
              description: 'Character\'s current STR score',
              minimum: 1,
              maximum: 20,
            },
          },
          required: ['excessDamage', 'currentStr'],
        },
      },
      {
        name: 'roll_scar',
        description: 'Roll on the Cairn scar table (d100) to determine lasting injury from critical damage.',
        inputSchema: {
          type: 'object',
          properties: {
            roll: {
              type: 'number',
              description: 'Optional: specific roll value (1-100). If not provided, will roll d100.',
              minimum: 1,
              maximum: 100,
            },
          },
        },
      },
      {
        name: 'add_fatigue',
        description: 'Add fatigue to character inventory. Each fatigue takes 1 slot. If inventory is full, HP becomes 0.',
        inputSchema: {
          type: 'object',
          properties: {
            currentSlots: {
              type: 'number',
              description: 'Currently used inventory slots',
              minimum: 0,
            },
            maxSlots: {
              type: 'number',
              description: 'Maximum inventory slots (typically 10)',
              minimum: 1,
            },
          },
          required: ['currentSlots', 'maxSlots'],
        },
      },
      {
        name: 'resolve_rest',
        description: 'Resolve short or long rest. Short rest restores HP. Long rest restores HP and removes all fatigue.',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['short', 'long'],
              description: 'Rest type: short (brief respite) or long (full night\'s sleep)',
            },
            currentHp: {
              type: 'number',
              description: 'Character\'s current HP',
              minimum: 0,
            },
            maxHp: {
              type: 'number',
              description: 'Character\'s maximum HP',
              minimum: 1,
            },
            fatigueCount: {
              type: 'number',
              description: 'Number of fatigue items in inventory',
              minimum: 0,
            },
          },
          required: ['type', 'currentHp', 'maxHp', 'fatigueCount'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'resolve_save': {
        const params = args as unknown as SaveParams;
        const targetScore = params.abilityScore + (params.modifier ?? 0);
        const result = savingThrow(targetScore, params.advantage, params.disadvantage);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ability: params.ability,
                  targetScore,
                  roll: result.roll,
                  secondRoll: result.secondRoll,
                  success: result.success,
                  automatic: result.automatic,
                  message: result.automatic
                    ? result.roll === 1
                      ? 'Natural 1 - Automatic success!'
                      : 'Natural 20 - Automatic failure!'
                    : result.success
                    ? `Success! Rolled ${result.roll} ≤ ${targetScore}`
                    : `Failure! Rolled ${result.roll} > ${targetScore}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'resolve_attack': {
        const params = args as unknown as AttackParams;
        const damageResult = rollDamage(params.weaponDice, params.impaired, params.enhanced);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  weaponDice: params.weaponDice,
                  damage: damageResult.damage,
                  rolls: damageResult.rolls,
                  impaired: params.impaired,
                  enhanced: params.enhanced,
                  message: `Attack hits! Rolled ${damageResult.rolls.join(', ')} = ${damageResult.damage} damage`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'apply_damage': {
        const params = args as unknown as DamageParams;
        const damageResult = applyDamage(params.damage, params.armorValue ?? 0);
        const newHp = Math.max(0, params.currentHp - damageResult.finalDamage);
        const excessDamage = params.currentHp - damageResult.finalDamage < 0
          ? Math.abs(params.currentHp - damageResult.finalDamage)
          : 0;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  rawDamage: damageResult.rawDamage,
                  armorReduction: damageResult.armorReduction,
                  finalDamage: damageResult.finalDamage,
                  newHp,
                  criticalDamage: newHp === 0 && excessDamage > 0,
                  excessDamage,
                  message:
                    damageResult.armorReduction > 0
                      ? `${damageResult.rawDamage} damage - ${damageResult.armorReduction} armor = ${damageResult.finalDamage} damage to HP. HP: ${params.currentHp} → ${newHp}`
                      : `${damageResult.finalDamage} damage to HP. HP: ${params.currentHp} → ${newHp}`,
                  warning:
                    newHp === 0 && excessDamage > 0
                      ? `CRITICAL DAMAGE! ${excessDamage} excess damage goes to STR. Make STR save or die!`
                      : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'resolve_critical_damage': {
        const params = args as unknown as CriticalDamageParams;
        const newStr = Math.max(0, params.currentStr - params.excessDamage);
        const saveResult = savingThrow(newStr);
        const scarRoll = saveResult.success ? d100() : undefined;
        const scar = scarRoll ? findScar(scarRoll, scars) : undefined;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  strLoss: params.excessDamage,
                  newStr,
                  save: {
                    roll: saveResult.roll,
                    targetScore: newStr,
                    success: saveResult.success,
                    automatic: saveResult.automatic,
                  },
                  scarRoll,
                  scar,
                  dead: !saveResult.success || newStr === 0,
                  message: !saveResult.success
                    ? `Failed STR save (rolled ${saveResult.roll} > ${newStr}). Character dies!`
                    : newStr === 0
                    ? 'STR reduced to 0. Character dies!'
                    : `Survived! STR: ${params.currentStr} → ${newStr}. Rolled ${scarRoll} on scar table: ${scar?.description}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'roll_scar': {
        const params = args as unknown as ScarRollParams;
        const roll = params.roll ?? d100();
        const scar = findScar(roll, scars);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  roll,
                  scar,
                  message: `Rolled ${roll} on scar table: ${scar?.description} - ${scar?.effect}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'add_fatigue': {
        const params = args as unknown as FatigueParams;
        const isFull = params.currentSlots >= params.maxSlots;
        const newSlots = isFull ? params.currentSlots : params.currentSlots + 1;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  fatigueAdded: !isFull,
                  inventorySlots: `${newSlots}/${params.maxSlots}`,
                  inventoryFull: isFull,
                  message: isFull
                    ? 'Inventory is full! Cannot add fatigue. HP becomes 0!'
                    : `Added fatigue. Inventory: ${newSlots}/${params.maxSlots} slots used.`,
                  warning: isFull ? 'HP becomes 0 when fatigue cannot be added!' : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'resolve_rest': {
        const params = args as unknown as RestParams;
        const hpRestored = params.maxHp - params.currentHp;
        const fatigueRemoved = params.type === 'long' ? params.fatigueCount : 0;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  restType: params.type,
                  hpRestored,
                  newHp: params.maxHp,
                  fatigueRemoved,
                  effects: [
                    'HP restored to maximum',
                    ...(params.type === 'long' ? ['All fatigue removed'] : []),
                  ],
                  message:
                    params.type === 'short'
                      ? `Short rest complete. HP restored: ${params.currentHp} → ${params.maxHp}`
                      : `Long rest complete. HP restored: ${params.currentHp} → ${params.maxHp}. Removed ${fatigueRemoved} fatigue.`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
          }),
        },
      ],
      isError: true,
    };
  }
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'cairn://equipment/weapons',
        name: 'Cairn Weapons',
        description: 'List of Cairn weapons with damage dice and properties',
        mimeType: 'application/json',
      },
      {
        uri: 'cairn://equipment/armor',
        name: 'Cairn Armor',
        description: 'List of Cairn armor with damage reduction values (1-3)',
        mimeType: 'application/json',
      },
      {
        uri: 'cairn://equipment/gear',
        name: 'Adventuring Gear',
        description: 'General adventuring equipment and supplies',
        mimeType: 'application/json',
      },
      {
        uri: 'cairn://scars',
        name: 'Scar Table',
        description: 'Cairn scar table (d100) for critical damage outcomes',
        mimeType: 'application/json',
      },
      {
        uri: 'cairn://spellbooks',
        name: 'Spellbooks',
        description: 'List of Cairn spellbooks and their effects',
        mimeType: 'application/json',
      },
      {
        uri: 'cairn://traits',
        name: 'Character Traits',
        description: 'Character backgrounds, physique, skin, and hair traits',
        mimeType: 'application/json',
      },
    ],
  };
});

// Handle resource reading
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  switch (uri) {
    case 'cairn://equipment/weapons':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(weapons, null, 2),
          },
        ],
      };

    case 'cairn://equipment/armor':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(armor, null, 2),
          },
        ],
      };

    case 'cairn://equipment/gear':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(gear, null, 2),
          },
        ],
      };

    case 'cairn://scars':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(scars, null, 2),
          },
        ],
      };

    case 'cairn://spellbooks':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(spellbooks, null, 2),
          },
        ],
      };

    case 'cairn://traits':
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(traits, null, 2),
          },
        ],
      };

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'cairn_combat',
        description: 'Guide for resolving combat in Cairn RPG',
        arguments: [
          {
            name: 'situation',
            description: 'Optional: describe the combat situation',
            required: false,
          },
        ],
      },
      {
        name: 'critical_damage',
        description: 'Step-by-step guide for critical damage resolution',
        arguments: [
          {
            name: 'excess_damage',
            description: 'Optional: amount of excess damage',
            required: false,
          },
        ],
      },
      {
        name: 'inventory_management',
        description: 'Template for managing Cairn\'s 10-slot inventory system',
        arguments: [
          {
            name: 'character_name',
            description: 'Optional: character name',
            required: false,
          },
        ],
      },
    ],
  };
});

// Handle prompt requests
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'cairn_combat':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Cairn Combat Resolution

${args?.situation ? `## Situation\n${args.situation}\n\n` : ''}## Combat Flow

**Cairn combat is fast and deadly. Follow these steps:**

1. **Determine Initiative**
   - When it's unclear who acts first, each side makes a DEX save
   - Alternatively, the side that makes sense to go first acts first

2. **Resolve Attacks**
   - All attacks automatically hit in Cairn
   - Roll weapon damage (usually 1d6, 1d8, or 1d10)
   - Apply conditions:
     - **Impaired**: Roll damage twice, take lower (bad position, cover, etc.)
     - **Enhanced**: Roll damage twice, take higher (ideal position, surprise, etc.)
   - **Blast** attacks hit all targets in area, roll separately for each

3. **Apply Damage**
   - Subtract armor value from damage (armor is 1-3)
   - Remaining damage reduces HP first
   - HP represents luck/stamina, not physical wounds

4. **Check for Critical Damage**
   - If damage reduces HP to exactly 0: no critical damage
   - If damage reduces HP below 0: **CRITICAL DAMAGE**
     - Excess damage goes to STR
     - Make STR save or die
     - If save succeeds, roll on scar table (d100)
     - If STR reaches 0, character dies

5. **Continue**
   - Move to next combatant
   - Repeat until combat ends

## Key Rules
- No attack rolls - all attacks hit
- Armor reduces damage, doesn't prevent hits
- HP is luck/stamina, STR is physical health
- Combat is quick and brutal - avoid it when possible!`,
            },
          },
        ],
      };

    case 'critical_damage':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Critical Damage Resolution

${args?.excess_damage ? `## Excess Damage: ${args.excess_damage}\n\n` : ''}## When Critical Damage Occurs

Critical damage happens when HP drops **below 0** (not at 0).

## Step-by-Step Resolution

### 1. Calculate Excess Damage
- If attack deals 8 damage but character only has 5 HP
- Excess damage = 3 (8 - 5)
- HP becomes 0

### 2. Apply to STR
- Subtract excess damage from STR
- Example: STR 12 - 3 excess = STR 9

### 3. Make STR Save
- Roll d20 ≤ new STR score
- Natural 1 = automatic success
- Natural 20 = automatic failure
- **If failed: Character dies**
- **If STR = 0: Character dies**

### 4. Roll on Scar Table (if survived)
- Roll d100
- Character gains a permanent scar with lasting effects
- Scars range from cosmetic to debilitating

## Example Scars
- 1-10: Lasting Scar (cosmetic only)
- 11-20: Rattling Blow (Deprived until rest)
- 31-40: Broken Limb (cannot use until healed)
- 91-100: Knocked Out (unconscious 1d4 hours)

## Important Notes
- Critical damage is **deadly**
- Each scar is permanent
- Multiple scars accumulate
- Consider retreat before HP drops too low!`,
            },
          },
        ],
      };

    case 'inventory_management':
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `# Cairn Inventory Management

${args?.character_name ? `## Character: ${args.character_name}\n\n` : ''}## 10-Slot Inventory System

Characters have **10 inventory slots** (backpack assumed).

### Slot Rules
- Most items take **1 slot**
- Small items can be bundled (e.g., 100 coins = 1 slot)
- **Bulky** items (two-handed weapons, heavy armor) take **2 slots**
- **Petty** items don't take slots (if you have very few)

### Inventory Template

\`\`\`
INVENTORY (□ = empty slot)

1. [ ]
2. [ ]
3. [ ]
4. [ ]
5. [ ]
6. [ ]
7. [ ]
8. [ ]
9. [ ]
10. [ ]
\`\`\`

### Common Starting Loadout

\`\`\`
1. [Sword] 1d8 damage
2. [Shield] +1 Armor
3. [Rations] 3 days
4. [Torch]
5. [Rope] 50ft
6. [Waterskin]
7. [ ] Empty
8. [ ] Empty
9. [ ] Empty
10. [ ] Empty
\`\`\`

### Fatigue System
- **Fatigue** occupies inventory slots (1 slot each)
- Gained from:
  - Casting spells multiple times
  - Lack of sleep/food/water
  - Extreme conditions
- **If inventory is full and you gain fatigue: HP becomes 0!**
- Remove all fatigue with a **long rest**

### Armor & Weapons
- Worn armor doesn't take inventory slots
- Wielded weapons don't take slots
- Extra armor/weapons do take slots

### Tips
- Leave 2-3 slots empty for loot and fatigue
- Bulky items are powerful but costly
- Manage resources carefully
- Consider what you might need vs. what you're carrying`,
            },
          },
        ],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cairn RPG MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
