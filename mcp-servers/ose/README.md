# OSE MCP Server

Model Context Protocol (MCP) server for Old-School Essentials (OSE) rules and data.

## Overview

This MCP server provides comprehensive access to OSE game mechanics, including:

- **Tools** for rule resolution (attacks, saves, ability checks, initiative, turn undead, spell memorization)
- **Resources** for game data (classes, spells, equipment, saving throws)
- **Prompts** for common OSE scenarios (combat, exploration, Vancian magic)

## Installation

```bash
cd mcp-servers/ose
npm install
npm run build
```

## Usage

### As a Standalone Server

```bash
npm start
```

### In Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ose-rules": {
      "command": "node",
      "args": ["/path/to/ai-adventure-scribe/mcp-servers/ose/dist/index.js"]
    }
  }
}
```

### In Other MCP Clients

The server communicates via stdio and follows the standard MCP protocol.

## Tools

### 1. `resolve_attack`

Resolve an OSE attack roll using THAC0 or ascending AC.

**Parameters:**
- `attacker` - Attacking actor with stats
- `defender` - Defending actor with AC
- `weapon` - Weapon being used
- `ascending` - Use ascending AC (default: true)
- `seed` - Optional seed for deterministic rolls

**Example:**
```json
{
  "attacker": {
    "id": "fighter1",
    "name": "Thorin",
    "level": 3,
    "attackBonus": 2,
    "abilities": { "str": 16, "dex": 12, "con": 14, "int": 10, "wis": 11, "cha": 13 }
  },
  "defender": {
    "id": "goblin1",
    "name": "Goblin",
    "ac": { "base": 13, "ascending": true }
  },
  "weapon": {
    "name": "Sword",
    "melee": true,
    "ranged": false,
    "damageDice": "1d8",
    "damageType": "normal"
  }
}
```

### 2. `resolve_save`

Resolve an OSE saving throw (5 categories).

**Parameters:**
- `actor` - Actor making the save
- `category` - One of: `death`, `wands`, `paralysis`, `breath`, `spells`
- `seed` - Optional seed

### 3. `resolve_ability_check`

Resolve an OSE ability check (roll under ability score on d20).

**Parameters:**
- `actor` - Actor making the check
- `ability` - One of: `str`, `dex`, `con`, `int`, `wis`, `cha`
- `seed` - Optional seed

### 4. `resolve_initiative`

Resolve OSE initiative (d6 or d20).

**Parameters:**
- `actors` - Array of actors rolling initiative
- `useD6` - Use d6 (traditional) or d20 (default: true)
- `seed` - Optional seed

### 5. `turn_undead`

Resolve Cleric turn undead ability.

**Parameters:**
- `cleric` - Cleric attempting to turn
- `undeadHD` - Hit Dice of undead creature
- `seed` - Optional seed

### 6. `memorize_spell`

Memorize a spell using Vancian magic system.

**Parameters:**
- `actor` - Spellcasting actor
- `spellName` - Name of spell
- `level` - Spell level (1-6)

## Resources

### Classes

- `ose://classes/classic` - 7 core OSE Classic Fantasy classes
- `ose://classes/advanced` - 13 additional OSE Advanced Fantasy classes
- `ose://classes/{className}` - Specific class details

### Equipment

- `ose://equipment/weapons` - Complete weapon list
- `ose://equipment/armor` - Armor with ascending/descending AC
- `ose://equipment/adventuring-gear` - Standard adventuring equipment

### Spells

- `ose://spells/arcane/{level}` - Arcane spells by level (1-6)
- `ose://spells/divine/{level}` - Divine spells by level (1-7)

### Saving Throws

- `ose://saving-throws/{className}/{level}` - Saving throw tables

## Prompts

### 1. `ose_combat`

Template for running OSE combat encounters.

**Arguments:**
- `scene` - Description of combat situation

### 2. `ose_exploration`

Template for OSE exploration turns (10 minutes).

**Arguments:**
- `location` - Location being explored

### 3. `vancian_magic`

Template for Vancian spell memorization and casting.

**Arguments:**
- `caster` - Name of spellcasting character
- `level` - Character level

## OSE Rules Reference

### Ability Modifiers
- 3-5: -2
- 6-8: -1
- 9-12: 0
- 13-15: +1
- 16-17: +2
- 18: +3

### Saving Throw Categories
1. **Death Ray/Poison** - Instant death effects
2. **Magic Wands** - Wand attacks
3. **Paralysis/Petrify** - Paralyzation and turning to stone
4. **Breath Attacks** - Dragon breath, etc.
5. **Spells/Rods/Staves** - General magic

### Combat Sequence
1. Declare spells and retreats
2. Roll initiative (d6 per side)
3. Resolve actions in initiative order
4. Check morale if needed

### Exploration Turn (10 minutes)
1. Check for wandering monsters (1-in-6)
2. Perform actions (move, search, listen, etc.)
3. Track time, light, and resources

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Project Structure

```
mcp-servers/ose/
├── src/
│   ├── data/
│   │   ├── ose-classes.ts       # Class definitions
│   │   ├── ose-equipment.ts     # Weapons, armor, gear
│   │   ├── ose-spells.ts        # Spell lists
│   │   └── ose-saving-throws.ts # Saving throw tables
│   ├── rules-adapter.ts         # Rules resolution functions
│   └── index.ts                 # Main MCP server
├── package.json
├── tsconfig.json
└── README.md
```

## License

This MCP server is part of the AI Adventure Scribe project and is compatible with the Open Game License (OGL) under which Old-School Essentials is published.

## References

- [Old-School Essentials SRD](https://oldschoolessentials.necroticgnome.com/srd/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Contributing

This server uses the OSE rules engine from `server/src/rules/ose/` in the main AI Adventure Scribe project. Improvements to the rules engine benefit both the main application and this MCP server.
