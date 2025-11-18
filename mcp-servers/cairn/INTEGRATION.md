# Integration Guide

This guide explains how to integrate the Cairn MCP server with various applications and the existing Cairn rules engine.

## Table of Contents

- [MCP Client Configuration](#mcp-client-configuration)
- [Integration with Cairn Rules Engine](#integration-with-cairn-rules-engine)
- [Claude Desktop Integration](#claude-desktop-integration)
- [Custom Application Integration](#custom-application-integration)
- [Testing the Server](#testing-the-server)

---

## MCP Client Configuration

### Basic Configuration

Add to your MCP client's configuration file (typically `mcp-config.json` or similar):

```json
{
  "mcpServers": {
    "cairn": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-servers/cairn/dist/index.js"],
      "env": {}
    }
  }
}
```

### Using npm/npx

If the package is installed globally or in your project:

```json
{
  "mcpServers": {
    "cairn": {
      "command": "npx",
      "args": ["@ai-adventure-scribe/mcp-cairn"],
      "env": {}
    }
  }
}
```

---

## Integration with Cairn Rules Engine

The MCP server complements the existing Cairn rules engine at `/server/src/rules/cairn/`.

### Architecture

```
┌─────────────────────────────────────┐
│   AI Adventure Scribe Application   │
└─────────────────────────────────────┘
              │         │
              │         │
    ┌─────────┘         └─────────┐
    │                             │
    v                             v
┌─────────────────┐     ┌─────────────────┐
│  Cairn Rules    │     │  Cairn MCP      │
│  Engine         │     │  Server         │
│  (Server-side)  │     │  (Client-side)  │
└─────────────────┘     └─────────────────┘
```

### When to Use Each

#### Use Cairn Rules Engine (`/server/src/rules/cairn/`) when:
- Running server-authoritative combat
- Need deterministic results (with seeds)
- Managing full encounter state
- Running automated tests
- Processing multiple actions in sequence

#### Use Cairn MCP Server (`/mcp-servers/cairn/`) when:
- AI agent needs to understand Cairn rules
- Quick reference lookups needed
- Client-side rule validation
- Interactive rule explanations
- Standalone tool integration

### Shared Concepts

Both systems implement the same core Cairn mechanics:

1. **Saving Throws**: d20 ≤ ability score
2. **Combat**: Auto-hit, roll damage, subtract armor
3. **Critical Damage**: HP < 0 triggers STR save
4. **Inventory**: 10-slot system with fatigue
5. **Rest**: Short (HP) vs Long (HP + fatigue)

### Example: Hybrid Usage

```typescript
import { resolveAction } from './server/src/rules/cairn';
import { mcpClient } from '@modelcontextprotocol/sdk';

// Server-authoritative combat with deterministic RNG
const combatResult = resolveAction({
  seed: encounterSeed,
  encounter: currentEncounter,
  actors: allActors,
  actorId: attackerId,
  targetId: defenderId,
  action: 'attack',
  payload: { weapon, impaired: false }
});

// AI assistant explains the result using MCP
const explanation = await mcpClient.callTool('cairn_combat', {
  situation: `${attacker.name} hits ${defender.name} for ${combatResult.damage.finalDamage} damage`
});
```

---

## Claude Desktop Integration

### Configuration

Add to Claude Desktop's MCP configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cairn-rpg": {
      "command": "node",
      "args": ["/path/to/mcp-servers/cairn/dist/index.js"]
    }
  }
}
```

### Usage in Claude

Once configured, Claude can use the server automatically:

```
User: I'm playing Cairn. My character (STR 10) takes 7 damage
      and has 4 HP with 1 armor. What happens?

Claude: Let me resolve that damage for you.
        [Calls apply_damage tool]

        Your armor reduces the damage from 7 to 6. With only 4 HP,
        you drop to 0 HP with 2 excess damage.

        This triggers Critical Damage! Let me resolve that...
        [Calls resolve_critical_damage tool]

        The 2 excess damage reduces your STR from 10 to 8.
        Rolling STR save... [rolls] 6 vs 8 - Success!

        You survive but gain a scar. Rolling on the table...
        [Calls roll_scar tool]

        You gain the "Walloped" scar - you're Deprived until you rest.
```

---

## Custom Application Integration

### TypeScript/JavaScript

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Create client
const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/mcp-servers/cairn/dist/index.js']
});

const client = new Client({
  name: 'my-cairn-app',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// Call tools
const result = await client.callTool({
  name: 'resolve_save',
  arguments: {
    ability: 'dex',
    abilityScore: 12
  }
});

console.log(result);

// Read resources
const weapons = await client.readResource({
  uri: 'cairn://equipment/weapons'
});

console.log(weapons);

// Get prompts
const combatGuide = await client.getPrompt({
  name: 'cairn_combat',
  arguments: {
    situation: 'Ambushed in a narrow corridor'
  }
});

console.log(combatGuide);
```

### Python

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# Create server parameters
server_params = StdioServerParameters(
    command="node",
    args=["/path/to/mcp-servers/cairn/dist/index.js"]
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        # Initialize
        await session.initialize()

        # Call tool
        result = await session.call_tool(
            "resolve_save",
            arguments={
                "ability": "dex",
                "abilityScore": 12
            }
        )

        print(result)

        # Read resource
        weapons = await session.read_resource(
            "cairn://equipment/weapons"
        )

        print(weapons)
```

---

## Testing the Server

### Manual Testing

1. Start the server:
```bash
cd mcp-servers/cairn
npm run build
npm start
```

2. Send JSON-RPC requests via stdin:
```json
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"resolve_save","arguments":{"ability":"str","abilityScore":10}}}
```

### Automated Testing

Create a test script:

```typescript
// test.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/index.js']
  });

  const client = new Client({ name: 'test', version: '1.0.0' }, {});
  await client.connect(transport);

  // Test save
  const save = await client.callTool({
    name: 'resolve_save',
    arguments: { ability: 'str', abilityScore: 10 }
  });
  console.log('Save:', save);

  // Test attack
  const attack = await client.callTool({
    name: 'resolve_attack',
    arguments: { weaponDice: '1d6' }
  });
  console.log('Attack:', attack);

  // Test resource
  const weapons = await client.readResource({
    uri: 'cairn://equipment/weapons'
  });
  console.log('Weapons:', weapons);

  process.exit(0);
}

test().catch(console.error);
```

Run:
```bash
npx tsx test.ts
```

---

## Environment Variables

The server supports these optional environment variables:

- `LOG_LEVEL`: Set logging verbosity (error, warn, info, debug)
- `DATA_DIR`: Override data directory location

Example:
```json
{
  "mcpServers": {
    "cairn": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "LOG_LEVEL": "debug",
        "DATA_DIR": "/custom/data/path"
      }
    }
  }
}
```

---

## Troubleshooting

### Server Won't Start

1. Check Node.js version: `node --version` (should be 16+)
2. Verify build: `npm run build`
3. Check permissions on executable
4. Verify data files exist in `src/data/`

### Tools Not Working

1. Check input schema matches documentation
2. Verify all required parameters provided
3. Check server logs for errors
4. Test with simple example first

### Resources Not Loading

1. Verify URI format: `cairn://resource/path`
2. Check data files are valid JSON
3. Ensure server built successfully

---

## Best Practices

1. **Always build before running**: `npm run build`
2. **Use absolute paths** in configuration
3. **Handle errors gracefully** in your application
4. **Cache resource data** for performance
5. **Validate tool results** before applying to game state
6. **Use prompts** for AI context, tools for mechanics
7. **Keep MCP server stateless** - manage state in your app

---

## Next Steps

- Review [EXAMPLES.md](./EXAMPLES.md) for usage scenarios
- Check [README.md](./README.md) for API reference
- Explore the Cairn rules engine in `/server/src/rules/cairn/`
- Build your own MCP integration!
