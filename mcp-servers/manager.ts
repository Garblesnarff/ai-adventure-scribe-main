/**
 * MCP Server Manager
 *
 * Manages the lifecycle of Model Context Protocol (MCP) servers for different game systems.
 * Provides tools, resources, and prompts to AI Dungeon Masters for running tabletop RPG sessions.
 *
 * Supports: D&D 5E, OSE Classic, Cairn, and Knave
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
import { EventEmitter } from 'events';

/**
 * Supported game systems
 */
export type GameSystem = 'dnd5e' | 'ose_classic' | 'cairn' | 'knave';

/**
 * Server health status
 */
export interface ServerHealth {
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopped';
  uptime: number;
  lastCheck: Date;
  gameSystem: GameSystem;
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  gameSystem: GameSystem;
  port?: number;
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
}

/**
 * Game System Data Provider Interface
 * Each game system implements this to provide its specific data
 */
export interface GameSystemDataProvider {
  getClasses(): any[];
  getRaces?(): any[];
  getBackgrounds?(): any[];
  getSpells?(): any[];
  getEquipment(): any[];
  calculateAbilityModifier(score: number): number;
  calculateProficiencyBonus(level: number): number;
  calculateHitPoints(className: string, level: number, conMod: number): number;
  rollInitiative(dexMod: number): number;
  getRulesReference(topic: string): string;
}

/**
 * MCP Server Manager
 *
 * Handles starting, stopping, and managing MCP servers for different game systems.
 */
export class MCPServerManager extends EventEmitter {
  private server: Server | null = null;
  private config: MCPServerConfig;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private startTime: Date | null = null;
  private dataProvider: GameSystemDataProvider;

  constructor(config: MCPServerConfig, dataProvider: GameSystemDataProvider) {
    super();
    this.config = config;
    this.dataProvider = dataProvider;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.server) {
      throw new Error('Server is already running');
    }

    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.startTime = new Date();
    this.emit('starting', { gameSystem: this.config.gameSystem });

    // Register handlers
    this.registerToolHandlers();
    this.registerResourceHandlers();
    this.registerPromptHandlers();

    // Connect transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Start health checks if enabled
    if (this.config.enableHealthChecks) {
      this.startHealthChecks();
    }

    this.emit('started', { gameSystem: this.config.gameSystem });
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      throw new Error('Server is not running');
    }

    this.emit('stopping', { gameSystem: this.config.gameSystem });

    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    await this.server.close();
    this.server = null;
    this.startTime = null;

    this.emit('stopped', { gameSystem: this.config.gameSystem });
  }

  /**
   * Restart the MCP server
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
    this.emit('restarted', { gameSystem: this.config.gameSystem });
  }

  /**
   * Get server health status
   */
  getHealth(): ServerHealth {
    if (!this.server || !this.startTime) {
      return {
        status: 'stopped',
        uptime: 0,
        lastCheck: new Date(),
        gameSystem: this.config.gameSystem,
      };
    }

    const uptime = Date.now() - this.startTime.getTime();

    return {
      status: 'healthy',
      uptime,
      lastCheck: new Date(),
      gameSystem: this.config.gameSystem,
    };
  }

  /**
   * Register tool handlers for game mechanics
   */
  private registerToolHandlers(): void {
    if (!this.server) return;

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'roll_dice',
          description: `Roll dice using standard RPG notation (e.g., "2d6+3", "1d20", "4d8-2")`,
          inputSchema: {
            type: 'object',
            properties: {
              notation: {
                type: 'string',
                description: 'Dice notation (e.g., "2d6+3")',
              },
              reason: {
                type: 'string',
                description: 'Why the roll is being made (e.g., "attack roll", "saving throw")',
              },
            },
            required: ['notation'],
          },
        },
        {
          name: 'get_character_classes',
          description: `Get all available character classes for ${this.config.gameSystem}`,
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_races',
          description: `Get all available character races for ${this.config.gameSystem}`,
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_spells',
          description: `Get spells filtered by level and/or class`,
          inputSchema: {
            type: 'object',
            properties: {
              level: {
                type: 'number',
                description: 'Spell level (0-9)',
              },
              className: {
                type: 'string',
                description: 'Filter by character class',
              },
            },
          },
        },
        {
          name: 'calculate_ability_modifier',
          description: `Calculate ability modifier from ability score using ${this.config.gameSystem} rules`,
          inputSchema: {
            type: 'object',
            properties: {
              score: {
                type: 'number',
                description: 'Ability score value',
              },
            },
            required: ['score'],
          },
        },
        {
          name: 'calculate_proficiency_bonus',
          description: `Calculate proficiency bonus for a given level`,
          inputSchema: {
            type: 'object',
            properties: {
              level: {
                type: 'number',
                description: 'Character level',
              },
            },
            required: ['level'],
          },
        },
        {
          name: 'calculate_hit_points',
          description: `Calculate hit points for a character`,
          inputSchema: {
            type: 'object',
            properties: {
              className: {
                type: 'string',
                description: 'Character class name',
              },
              level: {
                type: 'number',
                description: 'Character level',
              },
              constitutionModifier: {
                type: 'number',
                description: 'Constitution modifier',
              },
            },
            required: ['className', 'level', 'constitutionModifier'],
          },
        },
        {
          name: 'roll_initiative',
          description: `Roll initiative for combat`,
          inputSchema: {
            type: 'object',
            properties: {
              dexterityModifier: {
                type: 'number',
                description: 'Dexterity modifier to add to the roll',
              },
            },
            required: ['dexterityModifier'],
          },
        },
        {
          name: 'get_rules_reference',
          description: `Get rules reference for a specific topic in ${this.config.gameSystem}`,
          inputSchema: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Rules topic (e.g., "combat", "spellcasting", "resting")',
              },
            },
            required: ['topic'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'roll_dice':
            return this.handleRollDice(args);
          case 'get_character_classes':
            return this.handleGetClasses();
          case 'get_races':
            return this.handleGetRaces();
          case 'get_spells':
            return this.handleGetSpells(args);
          case 'calculate_ability_modifier':
            return this.handleCalculateAbilityModifier(args);
          case 'calculate_proficiency_bonus':
            return this.handleCalculateProficiencyBonus(args);
          case 'calculate_hit_points':
            return this.handleCalculateHitPoints(args);
          case 'roll_initiative':
            return this.handleRollInitiative(args);
          case 'get_rules_reference':
            return this.handleGetRulesReference(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Register resource handlers for game data
   */
  private registerResourceHandlers(): void {
    if (!this.server) return;

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: `game://${this.config.gameSystem}/classes`,
          name: 'Character Classes',
          description: `All available character classes in ${this.config.gameSystem}`,
          mimeType: 'application/json',
        },
        {
          uri: `game://${this.config.gameSystem}/races`,
          name: 'Character Races',
          description: `All available character races in ${this.config.gameSystem}`,
          mimeType: 'application/json',
        },
        {
          uri: `game://${this.config.gameSystem}/equipment`,
          name: 'Equipment',
          description: `All available equipment in ${this.config.gameSystem}`,
          mimeType: 'application/json',
        },
        {
          uri: `game://${this.config.gameSystem}/rules`,
          name: 'Game Rules',
          description: `Core rules and mechanics for ${this.config.gameSystem}`,
          mimeType: 'text/markdown',
        },
      ],
    }));

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        if (uri.endsWith('/classes')) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.dataProvider.getClasses(), null, 2),
              },
            ],
          };
        } else if (uri.endsWith('/races')) {
          const races = this.dataProvider.getRaces?.() || [];
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(races, null, 2),
              },
            ],
          };
        } else if (uri.endsWith('/equipment')) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(this.dataProvider.getEquipment(), null, 2),
              },
            ],
          };
        } else if (uri.endsWith('/rules')) {
          return {
            contents: [
              {
                uri,
                mimeType: 'text/markdown',
                text: this.dataProvider.getRulesReference('all'),
              },
            ],
          };
        }

        throw new Error(`Unknown resource: ${uri}`);
      } catch (error: any) {
        throw new Error(`Failed to read resource: ${error.message}`);
      }
    });
  }

  /**
   * Register prompt handlers for AI DM assistance
   */
  private registerPromptHandlers(): void {
    if (!this.server) return;

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'start_session',
          description: `Start a new ${this.config.gameSystem} game session`,
          arguments: [
            {
              name: 'campaign_name',
              description: 'Name of the campaign',
              required: true,
            },
            {
              name: 'setting',
              description: 'Campaign setting description',
              required: false,
            },
          ],
        },
        {
          name: 'create_npc',
          description: `Create a new NPC for ${this.config.gameSystem}`,
          arguments: [
            {
              name: 'name',
              description: 'NPC name',
              required: true,
            },
            {
              name: 'role',
              description: 'NPC role (e.g., "merchant", "guard", "villain")',
              required: true,
            },
            {
              name: 'level',
              description: 'NPC level',
              required: false,
            },
          ],
        },
        {
          name: 'generate_encounter',
          description: `Generate a combat encounter for ${this.config.gameSystem}`,
          arguments: [
            {
              name: 'party_level',
              description: 'Average party level',
              required: true,
            },
            {
              name: 'party_size',
              description: 'Number of players',
              required: true,
            },
            {
              name: 'difficulty',
              description: 'Encounter difficulty (easy, medium, hard, deadly)',
              required: false,
            },
          ],
        },
        {
          name: 'describe_location',
          description: `Generate a location description for ${this.config.gameSystem}`,
          arguments: [
            {
              name: 'location_type',
              description: 'Type of location (e.g., "tavern", "dungeon", "forest")',
              required: true,
            },
            {
              name: 'atmosphere',
              description: 'Desired atmosphere (e.g., "mysterious", "cheerful", "dangerous")',
              required: false,
            },
          ],
        },
      ],
    }));

    // Handle prompt gets
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const gameSystemName = this.getGameSystemDisplayName();

      switch (name) {
        case 'start_session':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Start a new ${gameSystemName} session called "${args?.campaign_name || 'Untitled Campaign'}"${
                    args?.setting ? ` set in ${args.setting}` : ''
                  }. Provide an engaging introduction and set the scene for the players.`,
                },
              },
            ],
          };

        case 'create_npc':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Create a ${gameSystemName} NPC named "${args?.name}" who is a ${args?.role}${
                    args?.level ? ` at level ${args.level}` : ''
                  }. Include personality traits, motivations, and stat block.`,
                },
              },
            ],
          };

        case 'generate_encounter':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Generate a ${args?.difficulty || 'medium'} difficulty combat encounter for ${gameSystemName} for a party of ${
                    args?.party_size
                  } level ${args?.party_level} characters. Include enemy stat blocks and tactical considerations.`,
                },
              },
            ],
          };

        case 'describe_location':
          return {
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Describe a ${args?.location_type} for a ${gameSystemName} campaign${
                    args?.atmosphere ? ` with a ${args.atmosphere} atmosphere` : ''
                  }. Include sensory details, notable features, and potential plot hooks.`,
                },
              },
            ],
          };

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    });
  }

  /**
   * Tool handler implementations
   */

  private handleRollDice(args: any): any {
    const { notation, reason } = args;
    const result = this.rollDice(notation);

    return {
      content: [
        {
          type: 'text',
          text: `Rolled ${notation}${reason ? ` for ${reason}` : ''}: ${result.total}\nRolls: ${result.rolls.join(', ')}${
            result.modifier !== 0 ? ` (modifier: ${result.modifier > 0 ? '+' : ''}${result.modifier})` : ''
          }`,
        },
      ],
    };
  }

  private handleGetClasses(): any {
    const classes = this.dataProvider.getClasses();
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(classes, null, 2),
        },
      ],
    };
  }

  private handleGetRaces(): any {
    const races = this.dataProvider.getRaces?.() || [];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(races, null, 2),
        },
      ],
    };
  }

  private handleGetSpells(args: any): any {
    const spells = this.dataProvider.getSpells?.() || [];
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(spells, null, 2),
        },
      ],
    };
  }

  private handleCalculateAbilityModifier(args: any): any {
    const { score } = args;
    const modifier = this.dataProvider.calculateAbilityModifier(score);
    return {
      content: [
        {
          type: 'text',
          text: `Ability score ${score} has a modifier of ${modifier > 0 ? '+' : ''}${modifier}`,
        },
      ],
    };
  }

  private handleCalculateProficiencyBonus(args: any): any {
    const { level } = args;
    const bonus = this.dataProvider.calculateProficiencyBonus(level);
    return {
      content: [
        {
          type: 'text',
          text: `Proficiency bonus at level ${level}: +${bonus}`,
        },
      ],
    };
  }

  private handleCalculateHitPoints(args: any): any {
    const { className, level, constitutionModifier } = args;
    const hp = this.dataProvider.calculateHitPoints(className, level, constitutionModifier);
    return {
      content: [
        {
          type: 'text',
          text: `Hit points for level ${level} ${className} with CON modifier ${constitutionModifier}: ${hp} HP`,
        },
      ],
    };
  }

  private handleRollInitiative(args: any): any {
    const { dexterityModifier } = args;
    const roll = this.dataProvider.rollInitiative(dexterityModifier);
    return {
      content: [
        {
          type: 'text',
          text: `Initiative roll: ${roll} (DEX modifier: ${dexterityModifier > 0 ? '+' : ''}${dexterityModifier})`,
        },
      ],
    };
  }

  private handleGetRulesReference(args: any): any {
    const { topic } = args;
    const rules = this.dataProvider.getRulesReference(topic);
    return {
      content: [
        {
          type: 'text',
          text: rules,
        },
      ],
    };
  }

  /**
   * Utility functions
   */

  private rollDice(notation: string): { total: number; rolls: number[]; modifier: number } {
    const match = notation.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) {
      throw new Error(`Invalid dice notation: ${notation}`);
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;

    return { total, rolls, modifier };
  }

  private getGameSystemDisplayName(): string {
    const names: Record<GameSystem, string> = {
      dnd5e: 'D&D 5E',
      ose_classic: 'Old-School Essentials Classic',
      cairn: 'Cairn',
      knave: 'Knave',
    };
    return names[this.config.gameSystem];
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const interval = this.config.healthCheckInterval || 30000; // Default 30s

    this.healthCheckTimer = setInterval(() => {
      const health = this.getHealth();
      this.emit('healthCheck', health);

      if (health.status === 'unhealthy') {
        this.emit('unhealthy', health);
      }
    }, interval);
  }
}

/**
 * Create and start an MCP server for a specific game system
 */
export async function createMCPServer(
  gameSystem: GameSystem,
  dataProvider: GameSystemDataProvider
): Promise<MCPServerManager> {
  const config: MCPServerConfig = {
    name: `ai-adventure-scribe-${gameSystem}`,
    version: '1.0.0',
    gameSystem,
    enableHealthChecks: true,
    healthCheckInterval: 30000,
  };

  const manager = new MCPServerManager(config, dataProvider);

  // Set up event logging
  manager.on('starting', () => {
    console.error(`[MCP] Starting ${gameSystem} server...`);
  });

  manager.on('started', () => {
    console.error(`[MCP] ${gameSystem} server started successfully`);
  });

  manager.on('stopping', () => {
    console.error(`[MCP] Stopping ${gameSystem} server...`);
  });

  manager.on('stopped', () => {
    console.error(`[MCP] ${gameSystem} server stopped`);
  });

  manager.on('unhealthy', (health) => {
    console.error(`[MCP] Server unhealthy:`, health);
  });

  await manager.start();

  return manager;
}

/**
 * Main entry point when run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const gameSystem = (process.env.GAME_SYSTEM || 'dnd5e') as GameSystem;

  console.error(`Starting MCP server for ${gameSystem}...`);

  // This would be imported from the appropriate provider
  // For now, this is a placeholder
  const provider: GameSystemDataProvider = {
    getClasses: () => [],
    getEquipment: () => [],
    calculateAbilityModifier: (score: number) => Math.floor((score - 10) / 2),
    calculateProficiencyBonus: (level: number) => Math.ceil(level / 4) + 1,
    calculateHitPoints: (className: string, level: number, conMod: number) => 10 * level + conMod * level,
    rollInitiative: (dexMod: number) => Math.floor(Math.random() * 20) + 1 + dexMod,
    getRulesReference: (topic: string) => `Rules for ${topic}`,
  };

  createMCPServer(gameSystem, provider).catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}
