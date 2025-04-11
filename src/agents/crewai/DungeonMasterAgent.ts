import { CrewAIAgentBridge } from './types/base';
import { AgentMessage } from './types/communication';
import { MessageHandler } from './handlers/MessageHandler';
import { DMAgentTools } from './tools/DMAgentTools';
import { DMMemoryManager } from './memory/DMMemoryManager';
import { DMTaskExecutor } from './tasks/DMTaskExecutor';
import { CrewAITask } from './types/tasks';

/**
 * CrewAI-enabled Dungeon Master Agent
 * Extends the base DM agent with CrewAI capabilities
 */
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
    this.role = 'Dungeon Master';
    this.goal = 'Guide players through an engaging D&D campaign with advanced AI capabilities';
    this.backstory = 'An experienced DM enhanced with CrewAI capabilities for dynamic storytelling';
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