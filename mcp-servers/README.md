# AI Adventure Scribe - MCP Servers

Model Context Protocol (MCP) servers for AI Adventure Scribe, providing game system-specific tools, resources, and prompts to AI Dungeon Masters.

## Overview

These MCP servers expose tabletop RPG game mechanics and data through the Model Context Protocol, allowing AI assistants like Claude to act as knowledgeable Dungeon Masters with access to accurate game rules, character data, and dice rolling capabilities.

### Supported Game Systems

- **D&D 5E** - Dungeons & Dragons 5th Edition
- **OSE Classic** - Old-School Essentials Classic
- **Cairn** - Cairn RPG
- **Knave** - Knave RPG

## Architecture

```
┌─────────────────────┐
│  Claude Desktop /   │
│  AI Assistant       │
└──────────┬──────────┘
           │ MCP Protocol
           │
┌──────────▼──────────┐
│  MCP Server Manager │
│  (manager.ts)       │
└──────────┬──────────┘
           │
     ┌─────┴─────┬─────────┬─────────┐
     │           │         │         │
┌────▼───┐  ┌───▼────┐ ┌──▼─────┐ ┌─▼──────┐
│ D&D 5E │  │  OSE   │ │ Cairn  │ │ Knave  │
│ Server │  │ Server │ │ Server │ │ Server │
└────┬───┘  └───┬────┘ └──┬─────┘ └─┬──────┘
     │          │          │         │
┌────▼──────────▼──────────▼─────────▼───┐
│    Game System Data Providers          │
│    (classes, races, spells, rules)     │
└────────────────────────────────────────┘
```

## Features

### Tools

Each game system server provides these tools:

- **`roll_dice`** - Roll dice using standard RPG notation (e.g., "2d6+3", "1d20")
- **`get_character_classes`** - Retrieve all available character classes
- **`get_races`** - Get all available character races/ancestries
- **`get_spells`** - Fetch spells filtered by level and/or class
- **`calculate_ability_modifier`** - Calculate ability modifiers from scores
- **`calculate_proficiency_bonus`** - Calculate proficiency bonus by level
- **`calculate_hit_points`** - Calculate HP for a character
- **`roll_initiative`** - Roll initiative for combat
- **`get_rules_reference`** - Get rules documentation for specific topics

### Resources

Resources provide read-only access to game data:

- **`game://{system}/classes`** - Complete class information
- **`game://{system}/races`** - Complete race/ancestry information
- **`game://{system}/equipment`** - Weapons, armor, and gear
- **`game://{system}/rules`** - Core game rules and mechanics

### Prompts

Pre-configured prompts for common DM tasks:

- **`start_session`** - Begin a new game session
- **`create_npc`** - Generate NPCs with stats and personality
- **`generate_encounter`** - Create balanced combat encounters
- **`describe_location`** - Generate atmospheric location descriptions

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript 5+

### Setup

1. **Install dependencies:**

```bash
cd mcp-servers
npm install
```

2. **Build the servers:**

```bash
npm run build
```

3. **Configure Claude Desktop:**

Edit your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

Add the server configuration (update the path):

```json
{
  "mcpServers": {
    "ai-adventure-scribe-dnd5e": {
      "command": "node",
      "args": [
        "/absolute/path/to/ai-adventure-scribe/mcp-servers/dist/servers/dnd5e.js"
      ],
      "env": {
        "GAME_SYSTEM": "dnd5e"
      }
    }
  }
}
```

See `config.json` for complete configuration examples for all game systems.

4. **Restart Claude Desktop**

## Usage

### Running Individual Servers

#### Development Mode (with hot reload):

```bash
# D&D 5E
npm run dev:dnd5e

# Old-School Essentials
npm run dev:ose

# Cairn
npm run dev:cairn

# Knave
npm run dev:knave
```

#### Production Mode:

```bash
# D&D 5E
npm run start:dnd5e

# Old-School Essentials
npm run start:ose

# Cairn
npm run start:cairn

# Knave
npm run start:knave
```

### Using with Claude Desktop

Once configured, Claude will automatically have access to the tools, resources, and prompts. You can interact naturally:

**Example Interactions:**

```
You: Roll 2d6+3 for my attack
Claude: *uses roll_dice tool*
       Rolled 2d6+3 for attack: 11
       Rolls: 4, 4 (modifier: +3)

You: What classes are available in D&D 5E?
Claude: *uses get_character_classes tool*
       Here are the available classes: Fighter, Wizard, Rogue...

You: Create a level 5 fighter character
Claude: *uses calculate_hit_points, calculate_proficiency_bonus*
       Level 5 Fighter would have:
       - Hit Points: 42 (with +2 CON mod)
       - Proficiency Bonus: +3
       ...
```

### Programmatic Usage

```typescript
import { createMCPServer, GameSystemDataProvider } from './manager';

// Create a data provider for your game system
const provider: GameSystemDataProvider = {
  getClasses: () => [...],
  getEquipment: () => [...],
  calculateAbilityModifier: (score) => Math.floor((score - 10) / 2),
  // ... implement other methods
};

// Start the server
const server = await createMCPServer('dnd5e', provider);

// Listen to events
server.on('started', () => {
  console.log('Server is ready!');
});

server.on('healthCheck', (health) => {
  console.log('Health:', health);
});

// Stop the server
await server.stop();
```

## Tool Examples

### Rolling Dice

```json
{
  "tool": "roll_dice",
  "arguments": {
    "notation": "2d6+3",
    "reason": "attack roll"
  }
}
```

### Getting Classes

```json
{
  "tool": "get_character_classes",
  "arguments": {}
}
```

### Calculating Ability Modifier

```json
{
  "tool": "calculate_ability_modifier",
  "arguments": {
    "score": 16
  }
}
```

### Getting Rules Reference

```json
{
  "tool": "get_rules_reference",
  "arguments": {
    "topic": "combat"
  }
}
```

## Resource Examples

### Reading Character Classes

```json
{
  "method": "resources/read",
  "params": {
    "uri": "game://dnd5e/classes"
  }
}
```

### Reading Game Rules

```json
{
  "method": "resources/read",
  "params": {
    "uri": "game://dnd5e/rules"
  }
}
```

## Prompt Examples

### Starting a Session

```json
{
  "prompt": "start_session",
  "arguments": {
    "campaign_name": "The Lost Mines",
    "setting": "Forgotten Realms"
  }
}
```

### Creating an NPC

```json
{
  "prompt": "create_npc",
  "arguments": {
    "name": "Gundren Rockseeker",
    "role": "quest_giver",
    "level": 3
  }
}
```

### Generating an Encounter

```json
{
  "prompt": "generate_encounter",
  "arguments": {
    "party_level": 3,
    "party_size": 4,
    "difficulty": "medium"
  }
}
```

## Health Checks

The server manager provides automatic health monitoring:

- Health checks run every 30 seconds (configurable)
- Tracks server uptime
- Emits events on health status changes
- Logs unhealthy states for debugging

```typescript
server.on('healthCheck', (health) => {
  console.log(health);
  // {
  //   status: 'healthy',
  //   uptime: 120000,
  //   lastCheck: Date,
  //   gameSystem: 'dnd5e'
  // }
});
```

## Server Lifecycle

### Start

```typescript
await server.start();
// Emits: 'starting' -> 'started'
```

### Stop

```typescript
await server.stop();
// Emits: 'stopping' -> 'stopped'
```

### Restart

```typescript
await server.restart();
// Emits: 'stopping' -> 'stopped' -> 'starting' -> 'started' -> 'restarted'
```

## Configuration

### MCPServerConfig

```typescript
interface MCPServerConfig {
  name: string;                    // Server name
  version: string;                 // Server version
  gameSystem: GameSystem;          // Game system identifier
  port?: number;                   // Optional port (for HTTP transport)
  enableHealthChecks?: boolean;    // Enable health monitoring
  healthCheckInterval?: number;    // Health check interval in ms
}
```

### Environment Variables

- **`GAME_SYSTEM`** - Game system to load (dnd5e, ose_classic, cairn, knave)
- **`LOG_LEVEL`** - Logging level (debug, info, warn, error)
- **`HEALTH_CHECK_INTERVAL`** - Health check interval in milliseconds

## Game System Differences

### D&D 5E
- Full spellcasting system (0-9th level spells)
- Character classes with subclasses
- Races with subraces
- Backgrounds and feats
- Complex ability modifier calculation

### OSE Classic
- Simpler class system
- Classic races (dwarf, elf, halfling)
- Lower level range (1-14)
- Old-school saving throws
- Descending AC (optional)

### Cairn
- Classless system
- Only 3 ability scores (STR, DEX, WIL)
- Inventory-based progression
- Simple combat mechanics
- No levels, HP based on direct damage

### Knave
- Classless system
- 6 ability scores (traditional)
- Slot-based inventory
- Level 1-10 range
- Item-based character progression

## Development

### Project Structure

```
mcp-servers/
├── manager.ts           # Core server manager
├── servers/
│   ├── dnd5e.ts        # D&D 5E server
│   ├── ose.ts          # OSE server
│   ├── cairn.ts        # Cairn server
│   └── knave.ts        # Knave server
├── providers/
│   ├── dnd5e.ts        # D&D 5E data provider
│   ├── ose.ts          # OSE data provider
│   ├── cairn.ts        # Cairn data provider
│   └── knave.ts        # Knave data provider
├── types.ts             # Shared TypeScript types
├── utils.ts             # Shared utilities
├── package.json
├── tsconfig.json
├── config.json          # Claude Desktop config
└── README.md
```

### Adding a New Game System

1. **Create data provider** in `providers/{system}.ts`
2. **Implement `GameSystemDataProvider` interface**
3. **Create server entry point** in `servers/{system}.ts`
4. **Add npm scripts** to `package.json`
5. **Update config.json** with new server
6. **Document** game system differences

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

### Linting

```bash
npm run lint            # Check for issues
npm run lint:fix        # Auto-fix issues
```

## Troubleshooting

### Server Won't Start

1. Check that Node.js 18+ is installed: `node --version`
2. Verify dependencies are installed: `npm install`
3. Build the project: `npm run build`
4. Check Claude Desktop config path is correct
5. Look for errors in Claude Desktop logs

### Tools Not Available

1. Restart Claude Desktop after config changes
2. Verify the server process is running
3. Check that the path in config.json is absolute
4. Ensure the built files exist in `dist/`

### Performance Issues

1. Reduce health check frequency
2. Disable health checks if not needed
3. Use production builds (not dev mode)
4. Check system resources (CPU, memory)

## Security Considerations

- Servers run locally on your machine
- No network exposure (stdio transport)
- No authentication required (local-only)
- Data providers should validate all inputs
- Dice rolls use cryptographically secure random numbers

## Contributing

We welcome contributions! To add features or fix bugs:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Claude Desktop Documentation](https://claude.ai/desktop)
- [D&D 5E SRD](https://dnd.wizards.com/resources/systems-reference-document)
- [Old-School Essentials](https://necroticgnome.com/collections/old-school-essentials)
- [Cairn RPG](https://cairnrpg.com/)
- [Knave RPG](https://questingbeast.itch.io/knave)

## Support

For issues, questions, or feature requests:

- **GitHub Issues:** [Create an issue](https://github.com/yourusername/ai-adventure-scribe/issues)
- **Discussions:** [Join the discussion](https://github.com/yourusername/ai-adventure-scribe/discussions)
- **Discord:** [Join our community](#)

## Changelog

### Version 1.0.0 (2025-01-XX)

- Initial release
- Support for D&D 5E, OSE Classic, Cairn, and Knave
- Full MCP protocol implementation
- Tools, resources, and prompts
- Health monitoring
- Claude Desktop integration

---

**Made with ❤️ by the AI Adventure Scribe team**
