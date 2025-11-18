# Knave MCP Server

A Model Context Protocol (MCP) server for the Knave tabletop RPG system. Provides tools, resources, and prompts for resolving Knave rules, equipment, and combat mechanics.

## Overview

The Knave MCP server exposes the Knave RPG rules engine through standardized MCP interfaces, enabling Claude and other AI models to:

- Resolve combat mechanics (attacks, saving throws, ability checks)
- Calculate character statistics (AC, HP)
- Access equipment databases (weapons, armor, gear, spells)
- Get guidance on combat and equipment-based checks

## Features

### Tools

1. **`resolve_attack`** - Resolve attack rolls with damage
   - Input: Attacker, defender, weapon name
   - Output: Hit/miss, attack total, target AC, damage (if hit)
   - Formula: d20 + level + ability modifier vs target AC

2. **`resolve_save`** - Resolve saving throws
   - Input: Actor, ability, DC
   - Output: Success/failure, roll total
   - Formula: d20 + level + ability modifier vs DC

3. **`resolve_ability_check`** - Resolve ability checks
   - Input: Actor, ability, optional DC
   - Output: Success/failure, roll total
   - Formula: d20 + ability modifier vs DC

4. **`resolve_initiative`** - Determine turn order
   - Input: Array of combatants
   - Output: Initiative order (highest first)
   - Formula: d20 + DEX modifier for each combatant

5. **`calculate_ac`** - Calculate armor class
   - Input: Base AC, armor bonus, DEX score
   - Output: Final AC value
   - Formula: 11 + armor bonus + DEX modifier

6. **`calculate_hp`** - Calculate maximum HP
   - Input: Level, CON score
   - Output: Maximum HP
   - Formula: 8 per level + (CON modifier × level), minimum 1 HP per level

### Resources

1. **`/equipment/weapons`** - Knave weapons database
   - All weapon types with damage dice and properties
   - Includes: dagger, mace, longsword, greatsword, bows, spear, axe, staff, rapier

2. **`/equipment/armor`** - Knave armor database
   - Armor types and AC bonuses
   - Includes: leather, studded leather, chainmail, plate, shield

3. **`/equipment/gear`** - General gear and tools
   - Adventuring equipment
   - Includes: backpack, rope, torches, lockpicks, rations, etc.

4. **`/items/spells`** - Spell list
   - Spells available to spellcasters
   - Includes: magic missile, burning hands, shield, sleep, detect magic, fireball, lightning bolt, invisibility, heal, cure wounds

### Prompts

1. **`knave_combat`** - Combat resolution template
   - Complete guide for running combat encounters
   - Initiative mechanics, attack resolution, saving throws
   - Rules references and example turns

2. **`equipment_check`** - Equipment-based ability checks
   - Guide for equipment-dependent mechanics
   - When gear enables or enhances checks
   - Weight and carrying capacity considerations

## Installation

```bash
cd mcp-servers/knave
npm install
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

The server reads JSON-RPC 2.0 requests from stdin and writes responses to stdout.

### Example Request: Resolve Attack

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "resolve_attack",
    "arguments": {
      "attacker": {
        "id": "player1",
        "name": "Grimjaw",
        "level": 3,
        "abilities": {
          "str": 16,
          "dex": 10,
          "con": 14,
          "int": 8,
          "wis": 11,
          "cha": 9
        },
        "equippedWeapons": [
          {
            "name": "longsword",
            "ability": "str",
            "damageDice": "1d8"
          }
        ]
      },
      "defender": {
        "id": "monster1",
        "name": "Orc Warrior",
        "abilities": {
          "dex": 12
        },
        "equippedArmor": {
          "acBonus": 2
        }
      },
      "weaponName": "longsword"
    }
  }
}
```

### Example Request: Get Resource

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "resources/read",
  "params": {
    "uri": "knave://equipment/weapons"
  }
}
```

## Knave Rules Summary

### Core Mechanics

**Attack Roll**: d20 + Level + Ability Modifier vs Target AC
- Hit if total ≥ target AC
- On hit: Roll weapon damage

**Saving Throw**: d20 + Level + Ability Modifier vs DC
- Success if total ≥ DC

**Ability Check**: d20 + Ability Modifier vs DC
- Success if total ≥ DC

**Initiative**: d20 + DEX Modifier
- Highest rolls first
- Tiebreakers: DEX modifier, DEX score, random

### Character Statistics

**AC (Armor Class)**: 11 + Armor Bonus + DEX Modifier
- Base: 11 (unarmored)
- Leather: +1, Studded: +2, Chainmail: +3, Plate: +4

**HP (Hit Points)**: 8 per level + (CON Modifier × Level), minimum 1 per level

**Proficiency Bonus**: Equals character level

**Ability Modifier**: (Ability Score - 10) ÷ 2, rounded down

## Knave Equipment

### Weapons

| Weapon | Ability | Damage | Properties |
|--------|---------|--------|-----------|
| Dagger | DEX | 1d4 | light, thrown |
| Mace | STR | 1d6 | one-handed |
| Longsword | STR | 1d8 | one-handed, versatile |
| Greatsword | STR | 1d12 | two-handed, heavy |
| Shortbow | DEX | 1d6 | ranged, two-handed |
| Longbow | DEX | 1d8 | ranged, two-handed, powerful |
| Spear | STR | 1d6 | one-handed, thrown, versatile |
| Hand Axe | STR | 1d6 | light, thrown |
| Staff | STR | 1d6 | two-handed, arcane-focus |
| Rapier | DEX | 1d8 | one-handed, finesse |

### Armor

| Armor | AC Bonus | Weight | Notes |
|-------|----------|--------|-------|
| Leather | +1 | 10 | Light and flexible |
| Studded Leather | +2 | 13 | Balanced protection |
| Chainmail | +3 | 55 | Heavy but durable |
| Plate | +4 | 65 | Maximum protection |
| Shield | +1 | 6 | Additional protection |

## Development

### Project Structure

```
mcp-servers/knave/
├── src/
│   ├── index.ts          # Main MCP server
│   ├── types.ts          # Type definitions
│   ├── rules-bridge.ts   # Rules engine wrapper
│   ├── state-utils.ts    # Utility functions
│   ├── dice.ts           # Dice rolling utilities
│   ├── equipment.ts      # Equipment databases
│   └── prompts.ts        # MCP prompts
├── dist/                 # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
npm run build
```

### Watching for Changes

```bash
npm run dev
```

### Type Checking

```bash
npx tsc --noEmit
```

## Testing

Example using curl (if running as HTTP server):

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d @request.json
```

## Architecture

The MCP server is structured in layers:

1. **MCP Interface** (`index.ts`) - Handles JSON-RPC 2.0 protocol
2. **Rules Bridge** (`rules-bridge.ts`) - Wraps core rules engine functions
3. **Utilities** (`state-utils.ts`, `dice.ts`) - Core calculations and RNG
4. **Equipment** (`equipment.ts`) - Game data and resources
5. **Prompts** (`prompts.ts`) - Guidance templates

## API Reference

### Tool Parameters

#### resolve_attack

```typescript
{
  attacker: Actor;        // Attacking character
  defender: Actor;        // Defending character
  weaponName: string;     // Weapon to use
  seed?: string|number;   // Optional seed for deterministic rolls
}
```

#### resolve_save

```typescript
{
  actor: Actor;           // Character making save
  ability: string;        // Ability (str, dex, con, int, wis, cha)
  dc: number;             // Difficulty class
  seed?: string|number;   // Optional seed
}
```

#### resolve_ability_check

```typescript
{
  actor: Actor;           // Character making check
  ability: string;        // Ability (str, dex, con, int, wis, cha)
  dc?: number;            // Optional difficulty class
  seed?: string|number;   // Optional seed
}
```

#### resolve_initiative

```typescript
{
  actors: Actor[];        // All combatants
  seed?: string|number;   // Optional seed
}
```

#### calculate_ac

```typescript
{
  baseAC?: number;        // Base AC (default: 11)
  armorBonus?: number;    // Armor bonus (0-4)
  dexScore: number;       // DEX ability score
}
```

#### calculate_hp

```typescript
{
  level: number;          // Character level
  conScore: number;       // CON ability score
}
```

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- TypeScript strict mode compliance
- Comprehensive type definitions
- Clear documentation for new features
- Knave rules accuracy
