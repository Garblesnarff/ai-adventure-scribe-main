/**
 * CrewAI Dungeon Master Agent
 * 
 * This file defines the Dungeon Master agent specifically tailored for the CrewAI framework.
 * It implements the CrewAIAgentBridge and orchestrates DM-specific tools, memory, and task execution
 * within the CrewAI environment.
 * 
 * Main Class:
 * - CrewAIDungeonMasterAgent: Manages DM tasks using CrewAI patterns.
 * 
 * Key Dependencies:
 * - CrewAI base types (./types/base)
 * - CrewAI communication types (./types/communication)
 * - CrewAI task types (./types/tasks)
 * - MessageHandler (./handlers/message-handler.ts)
 * - DMAgentTools (./tools/dm-agent-tools.ts)
 * - DMMemoryManager (./memory/dm-memory-manager.ts)
 * - DMTaskExecutor (./tasks/dm-task-executor.ts)
 * 
 * @author AI Dungeon Master Team
 */

// CrewAI Types
import { CrewAIAgentBridge } from './types/base';
import { AgentMessage } from './types/communication';
import { CrewAITask } from './types/tasks';

// CrewAI Components (assuming kebab-case filenames)
import { DMMemoryManager } from './memory/dm-memory-manager';
import { DMTaskExecutor } from './tasks/dm-task-executor';
import { DMAgentTools } from './tools/dm-agent-tools';
import { MessageHandler } from './handlers/message-handler';


export class CrewAIDungeonMasterAgent implements CrewAIAgentBridge {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  verbose: boolean;
  allowDelegation: boolean;
  crewAIConfig: any;

  private messageHandler: MessageHandler;
  private memoryManager: DMMemoryManager;
  private toolManager: DMAgentTools;
  private taskExecutor: DMTaskExecutor;

  constructor(sessionId: string) {
    this.initializeBaseProperties();
    this.initializeManagers(sessionId);
    this.crewAIConfig = this.initializeCrewAIConfig();
  }

  /**
   * Initialize base agent properties
   */
  private initializeBaseProperties(): void {
    this.id = 'crew_dm_agent_1';
    this.role = 'Game Master';
    this.goal = 'Guide players through an engaging fantasy RPG campaign with advanced AI capabilities';
    this.backstory = 'An experienced GM enhanced with CrewAI capabilities for dynamic storytelling';
    this.verbose = true;
    this.allowDelegation = true;
  }

  /**
   * Initialize managers with session context
   */
  private initializeManagers(sessionId: string): void {
    this.memoryManager = new DMMemoryManager(sessionId);
    this.messageHandler = new MessageHandler();
    this.toolManager = new DMAgentTools(this.memoryManager.getMemoryAdapter());
    this.taskExecutor = new DMTaskExecutor(this.memoryManager.getMemoryAdapter());
  }

  /**
   * Initialize CrewAI configuration
   */
  private initializeCrewAIConfig() {
    return {
      tools: this.toolManager.getTools(),
      memory: this.memoryManager.initializeMemory(),
      communicate: this.communicate.bind(this)
    };
  }

  /**
   * Handle agent communication
   */
  private async communicate(message: AgentMessage): Promise<void> {
    try {
      await this.messageHandler.sendMessage(message);
    } catch (error) {
      console.error('Error in DM agent communication:', error);
      throw error;
    }
  }

  /**
   * Execute a task using CrewAI capabilities
   */
  async executeTask(task: any): Promise<any> {
    // Convert to CrewAI task format
    const crewAITask: CrewAITask = {
      ...task,
      crewAIContext: {
        assignedAgent: this.id,
        priority: task.priority || 'MEDIUM',
        dependencies: task.dependencies || []
      }
    };

    return this.taskExecutor.executeTask(crewAITask);
  }
}