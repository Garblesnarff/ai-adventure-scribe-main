# Cairn RPG Model Context Protocol Server

A Model Context Protocol (MCP) server that provides tools, resources, and prompts for the Cairn tabletop RPG system.

## Overview

Cairn is a rules-light adventure game focused on exploration, quick combat, and player choice. This MCP server exposes Cairn's core mechanics through a standardized interface, making it easy to integrate Cairn rules into AI-powered applications.

## Features

### Tools (7)

The server provides the following tools for resolving Cairn mechanics:

1. **`resolve_save`** - Resolve saving throws
   - Roll d20 ≤ ability score
   - Natural 1 = automatic success
   - Natural 20 = automatic failure
   - Supports advantage/disadvantage

2. **`resolve_attack`** - Resolve attacks
   - All attacks auto-hit in Cairn
   - Rolls weapon damage
   - Supports impaired (disadvantage) and enhanced (advantage) conditions

3. **`apply_damage`** - Apply damage with armor reduction
   - Subtracts armor value from damage
   - Tracks HP changes
   - Detects critical damage (HP < 0)

4. **`resolve_critical_damage`** - Resolve critical damage
   - Applies excess damage to STR
   - Rolls STR save to avoid death
   - Rolls on scar table if survived

5. **`roll_scar`** - Roll on scar table
   - Rolls d100 for lasting injury
   - Returns scar description and mechanical effect

6. **`add_fatigue`** - Add fatigue to inventory
   - Tracks inventory slot usage
   - Warns if inventory is full (HP → 0)

7. **`resolve_rest`** - Resolve short/long rest
   - Short rest: restore HP to max
   - Long rest: restore HP and remove all fatigue

### Resources (6)

Access static game data through URIs:

- `cairn://equipment/weapons` - Weapon list with damage dice
- `cairn://equipment/armor` - Armor list (damage reduction 1-3)
- `cairn://equipment/gear` - Adventuring gear
- `cairn://scars` - Scar table (d100)
- `cairn://spellbooks` - Complete spellbook list
- `cairn://traits` - Character backgrounds and traits

### Prompts (3)

Pre-built prompts for common scenarios:

- `cairn_combat` - Combat resolution guide
- `critical_damage` - Critical damage flow
- `inventory_management` - 10-slot inventory template

## Installation

```bash
cd mcp-servers/cairn
npm install
npm run build
```

## Usage

### With MCP Client

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "cairn": {
      "command": "node",
      "args": ["/path/to/mcp-servers/cairn/dist/index.js"]
    }
  }
}
```

### Standalone

```bash
npm start
```

## Development

```bash
# Watch mode
npm run dev

# Build
npm run build
```

## Examples

### Resolve a Saving Throw

```typescript
{
  "name": "resolve_save",
  "arguments": {
    "ability": "dex",
    "abilityScore": 12,
    "advantage": false
  }
}
```

**Response:**
```json
{
  "ability": "dex",
  "targetScore": 12,
  "roll": 8,
  "success": true,
  "message": "Success! Rolled 8 ≤ 12"
}
```

### Resolve an Attack

```typescript
{
  "name": "resolve_attack",
  "arguments": {
    "weaponDice": "1d8",
    "impaired": false,
    "enhanced": true
  }
}
```

**Response:**
```json
{
  "weaponDice": "1d8",
  "damage": 6,
  "rolls": [3, 6],
  "enhanced": true,
  "message": "Attack hits! Rolled 3, 6 = 6 damage"
}
```

### Apply Damage

```typescript
{
  "name": "apply_damage",
  "arguments": {
    "damage": 8,
    "armorValue": 2,
    "currentHp": 5
  }
}
```

**Response:**
```json
{
  "rawDamage": 8,
  "armorReduction": 2,
  "finalDamage": 6,
  "newHp": 0,
  "criticalDamage": true,
  "excessDamage": 1,
  "warning": "CRITICAL DAMAGE! 1 excess damage goes to STR. Make STR save or die!"
}
```

### Resolve Critical Damage

```typescript
{
  "name": "resolve_critical_damage",
  "arguments": {
    "excessDamage": 3,
    "currentStr": 10
  }
}
```

**Response:**
```json
{
  "strLoss": 3,
  "newStr": 7,
  "save": {
    "roll": 5,
    "targetScore": 7,
    "success": true
  },
  "scarRoll": 42,
  "scar": {
    "description": "Diseased",
    "effect": "Deprived until cured"
  },
  "dead": false,
  "message": "Survived! STR: 10 → 7. Rolled 42 on scar table: Diseased"
}
```

## Cairn Rules Summary

### Core Mechanics

- **Abilities**: STR, DEX, WIL (typically 3-18)
- **Saves**: Roll d20 ≤ ability score
- **HP (Hit Protection)**: Represents luck/stamina, not health
- **Inventory**: 10 slots, bulky items take 2 slots
- **Combat**: All attacks hit, roll damage, subtract armor

### Combat Flow

1. Determine initiative (DEX save or narrative)
2. Attacker rolls weapon damage
3. Apply impaired/enhanced conditions
4. Subtract armor from damage
5. Apply remaining damage to HP
6. If HP < 0: Critical Damage
   - Excess damage → STR
   - STR save or die
   - If survived: roll on scar table

### Critical Damage

- Only triggers when HP drops **below 0**
- Excess damage reduces STR
- Must make STR save (d20 ≤ STR)
- Failure or STR = 0 → death
- Success → permanent scar

### Rest

- **Short Rest**: Restore HP to max
- **Long Rest**: Restore HP + remove all fatigue

### Fatigue

- Each fatigue occupies 1 inventory slot
- Gained from spellcasting, deprivation, etc.
- If inventory full when gaining fatigue → HP becomes 0

## Integration with Cairn Rules Engine

This MCP server is designed to work alongside the Cairn rules engine located at:

```
/server/src/rules/cairn/
```

The rules engine provides:
- Deterministic RNG for testing
- Server-authoritative combat resolution
- Full state management for encounters

The MCP server provides:
- Client-side rule resolution
- Quick reference tools
- Standalone rule queries

## License

MIT

## Resources

- [Cairn SRD](https://cairnrpg.com)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
