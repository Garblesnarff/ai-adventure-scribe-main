# D&D 5E Model Context Protocol Server

A Model Context Protocol (MCP) server that provides D&D 5th Edition rules engine tools, game data resources, and prompt templates for AI assistants.

## Features

### Tools (Functions AI Can Call)

1. **resolve_attack** - Resolve attack rolls
   - Calculates hit/miss, critical hits, and damage
   - Supports advantage/disadvantage
   - Handles cover bonuses

2. **resolve_save** - Resolve saving throws
   - Determines success/failure against DC
   - Applies ability modifiers and proficiency
   - Supports advantage/disadvantage

3. **resolve_ability_check** - Resolve ability checks
   - Handles skill checks and ability checks
   - Optional DC comparison
   - Proficiency and modifier support

4. **resolve_initiative** - Roll initiative
   - Rolls for multiple actors
   - Sorts by initiative order with tiebreakers

5. **resolve_death_save** - Death saving throw
   - Tracks successes and failures
   - Handles critical successes (nat 20) and failures (nat 1)

6. **resolve_spell_attack** - Spell attack resolution
   - Calculates spell attack rolls
   - Uses appropriate spellcasting ability

7. **calculate_damage** - Calculate damage with resistances
   - Applies resistance (half damage)
   - Applies immunity (no damage)
   - Applies vulnerability (double damage)

### Resources (Data AI Can Read)

- `dnd5e://classes` - List all D&D 5E classes
- `dnd5e://classes/{className}` - Get specific class details
- `dnd5e://spells/level/{level}` - Spells by level (0-9)
- `dnd5e://spells/{spellName}` - Specific spell details
- `dnd5e://conditions` - Status conditions (blinded, charmed, etc.)
- `dnd5e://equipment/weapons` - Weapon list
- `dnd5e://equipment/armor` - Armor and shield list

### Prompts (Templates)

1. **combat_turn** - Template for resolving a combat turn
   - Arguments: actor_name, action_description

2. **skill_check** - Template for skill checks
   - Arguments: character_name, skill, task

3. **spellcasting** - Template for casting spells
   - Arguments: caster_name, spell_name, target

## Installation

```bash
cd mcp-servers/dnd5e
npm install
```

## Build

```bash
npm run build
```

This compiles the TypeScript code to JavaScript in the `dist/` directory.

## Running the Server

The server runs on stdio and is designed to be used with MCP clients:

```bash
npm start
```

Or run directly:

```bash
node dist/index.js
```

## Development

Watch mode for development:

```bash
npm run dev
```

## Configuration for MCP Clients

To use this server with an MCP client (like Claude Desktop), add it to your MCP configuration:

```json
{
  "mcpServers": {
    "dnd5e": {
      "command": "node",
      "args": ["/path/to/ai-adventure-scribe/mcp-servers/dnd5e/dist/index.js"]
    }
  }
}
```

### Claude Desktop Configuration

For Claude Desktop, edit your config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dnd5e": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-servers/dnd5e/dist/index.js"]
    }
  }
}
```

## Usage Examples

### Using Tools

Once connected to an MCP client, you can use the tools like this:

**Example: Resolve an attack**

```typescript
const result = await useTool('resolve_attack', {
  attacker: {
    id: 'hero1',
    name: 'Aragorn',
    class: 'fighter',
    level: 5,
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 13 },
    ac: { base: 18 },
    maxHp: 44,
    currentHp: 44,
    speed: 30,
    size: 'medium',
  },
  defender: {
    id: 'orc1',
    name: 'Orc Warrior',
    level: 2,
    abilities: { str: 16, dex: 12, con: 16, int: 7, wis: 11, cha: 10 },
    ac: { base: 13 },
    maxHp: 15,
    currentHp: 15,
    speed: 30,
    size: 'medium',
  },
  weapon: {
    name: 'Longsword',
    ability: 'str',
    proficient: true,
    damageDice: '1d8',
    damageType: 'slashing',
  },
  advantage: true,
});
```

### Using Resources

**Example: Get class information**

```typescript
const classes = await readResource('dnd5e://classes');
const wizardInfo = await readResource('dnd5e://classes/wizard');
```

**Example: Get spell information**

```typescript
const cantrips = await readResource('dnd5e://spells/level/0');
const fireball = await readResource('dnd5e://spells/fireball');
```

### Using Prompts

**Example: Combat turn**

```typescript
const prompt = await getPrompt('combat_turn', {
  actor_name: 'Gandalf',
  action_description: 'casts Fireball at the group of orcs',
});
```

## Architecture

The server is built using the official MCP TypeScript SDK and consists of:

- **src/index.ts** - Main server implementation with MCP handlers
- **src/types.ts** - TypeScript type definitions for D&D 5E entities
- **src/rules-adapter.ts** - Rules engine for game mechanics
- **src/data-provider.ts** - Game data (classes, spells, equipment)

## Data Sources

The server uses D&D 5E SRD (System Reference Document) data, which is freely available under the Open Gaming License.

## Future Enhancements

- [ ] Integration with the full rules engine from `server/src/rules/`
- [ ] More complete spell database
- [ ] Monster stat blocks
- [ ] Magic items
- [ ] Additional game systems (OSE, Cairn, Knave)
- [ ] Character creation tools
- [ ] Encounter building

## License

MIT

## Contributing

Contributions are welcome! Please see the main project's CONTRIBUTING.md file.
