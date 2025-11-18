/**
 * Example: Using the MCP Server Manager Programmatically
 *
 * This example shows how to create and manage MCP servers in your code.
 */

import { MCPServerManager, GameSystemDataProvider } from './manager.js';

// Example 1: Create a simple data provider
const exampleProvider: GameSystemDataProvider = {
  getClasses: () => [
    { id: 'fighter', name: 'Fighter', hitDie: 10 },
    { id: 'wizard', name: 'Wizard', hitDie: 6 },
  ],

  getEquipment: () => [
    { id: 'sword', name: 'Sword', type: 'weapon', damage: '1d8' },
    { id: 'armor', name: 'Leather Armor', type: 'armor', ac: 11 },
  ],

  calculateAbilityModifier: (score: number) => Math.floor((score - 10) / 2),
  calculateProficiencyBonus: (level: number) => Math.ceil(level / 4) + 1,
  calculateHitPoints: (className: string, level: number, conMod: number) => {
    const hitDice: Record<string, number> = { fighter: 10, wizard: 6 };
    const hitDie = hitDice[className.toLowerCase()] || 8;
    return hitDie + conMod + (level - 1) * (Math.floor(hitDie / 2) + 1 + conMod);
  },
  rollInitiative: (dexMod: number) => Math.floor(Math.random() * 20) + 1 + dexMod,
  getRulesReference: (topic: string) => `Rules for ${topic}`,
};

// Example 2: Create and start a server
async function startServer() {
  const config = {
    name: 'example-mcp-server',
    version: '1.0.0',
    gameSystem: 'dnd5e' as const,
    enableHealthChecks: true,
    healthCheckInterval: 30000,
  };

  const manager = new MCPServerManager(config, exampleProvider);

  // Set up event listeners
  manager.on('starting', () => {
    console.log('Server is starting...');
  });

  manager.on('started', () => {
    console.log('Server started successfully!');
  });

  manager.on('healthCheck', (health) => {
    console.log('Health check:', health);
  });

  manager.on('unhealthy', (health) => {
    console.error('Server is unhealthy:', health);
  });

  manager.on('stopped', () => {
    console.log('Server stopped');
  });

  // Start the server
  try {
    await manager.start();
    console.log('Server is running!');

    // Check health
    const health = manager.getHealth();
    console.log('Initial health:', health);

    // Server will run until stopped or process exits
    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('Shutting down...');
      await manager.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Example 3: Managing multiple servers
async function multiServerExample() {
  const systems = ['dnd5e', 'ose_classic', 'cairn', 'knave'] as const;
  const servers: MCPServerManager[] = [];

  for (const system of systems) {
    const config = {
      name: `mcp-${system}`,
      version: '1.0.0',
      gameSystem: system,
      enableHealthChecks: true,
    };

    const manager = new MCPServerManager(config, exampleProvider);
    await manager.start();
    servers.push(manager);

    console.log(`Started ${system} server`);
  }

  // Monitor all servers
  setInterval(() => {
    for (const server of servers) {
      const health = server.getHealth();
      console.log(`${health.gameSystem}: ${health.status} (uptime: ${health.uptime}ms)`);
    }
  }, 60000); // Every minute

  // Cleanup on exit
  process.on('SIGINT', async () => {
    console.log('Stopping all servers...');
    for (const server of servers) {
      await server.stop();
    }
    process.exit(0);
  });
}

// Example 4: Restart on failure
async function autoRestartExample() {
  const config = {
    name: 'auto-restart-server',
    version: '1.0.0',
    gameSystem: 'dnd5e' as const,
    enableHealthChecks: true,
    healthCheckInterval: 10000,
  };

  const manager = new MCPServerManager(config, exampleProvider);

  let restartAttempts = 0;
  const maxRestarts = 3;

  manager.on('unhealthy', async (health) => {
    console.error('Server unhealthy, attempting restart...');

    if (restartAttempts < maxRestarts) {
      try {
        await manager.restart();
        restartAttempts = 0; // Reset on successful restart
        console.log('Server restarted successfully');
      } catch (error) {
        restartAttempts++;
        console.error(`Restart failed (${restartAttempts}/${maxRestarts}):`, error);

        if (restartAttempts >= maxRestarts) {
          console.error('Max restart attempts reached, exiting');
          process.exit(1);
        }
      }
    }
  });

  await manager.start();
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  const example = process.argv[2] || 'start';

  switch (example) {
    case 'start':
      startServer();
      break;
    case 'multi':
      multiServerExample();
      break;
    case 'restart':
      autoRestartExample();
      break;
    default:
      console.log('Usage: tsx example.ts [start|multi|restart]');
      process.exit(1);
  }
}
