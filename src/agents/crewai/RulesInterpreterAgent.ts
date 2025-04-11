import { CrewAIAgentBridge } from './types/base';
import { AgentMessage } from './types/communication';
import { MessageHandler } from './handlers/MessageHandler';
import { RulesInterpreterTools } from './tools/RulesInterpreterTools';
import { RulesMemoryManager } from './memory/RulesMemoryManager';
import { RulesTaskExecutor } from './tasks/RulesTaskExecutor';
import { CrewAITask } from './types/tasks';

export class CrewAIRulesInterpreterAgent implements CrewAIAgentBridge {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  verbose: boolean;
  allowDelegation: boolean;
  crewAIConfig: any;

  private messageHandler: MessageHandler;
  private memoryManager: RulesMemoryManager;
  private toolManager: RulesInterpreterTools;
  private taskExecutor: RulesTaskExecutor;

  constructor(sessionId: string) {
    this.initializeBaseProperties();
    this.initializeManagers(sessionId);
    this.crewAIConfig = this.initializeCrewAIConfig();
  }

  private initializeBaseProperties(): void {
    this.id = 'crew_rules_interpreter_1';
    this.role = 'Rules Interpreter';
    this.goal = 'Ensure accurate interpretation and application of D&D 5E rules with advanced AI capabilities';
    this.backstory = 'An expert rules interpreter enhanced with CrewAI capabilities for comprehensive game mechanics management';
    this.verbose = true;
    this.allowDelegation = true;
  }

  private initializeManagers(sessionId: string): void {
    this.memoryManager = new RulesMemoryManager(sessionId);
    this.messageHandler = new MessageHandler();
    this.toolManager = new RulesInterpreterTools(this.memoryManager.getMemoryAdapter());
    this.taskExecutor = new RulesTaskExecutor(this.memoryManager.getMemoryAdapter());
  }

  private initializeCrewAIConfig() {
    return {
      tools: this.toolManager.getTools(),
      memory: this.memoryManager.initializeMemory(),
      communicate: this.communicate.bind(this)
    };
  }

  private async communicate(message: AgentMessage): Promise<void> {
    try {
      await this.messageHandler.sendMessage(message);
    } catch (error) {
      console.error('Error in Rules Interpreter communication:', error);
      throw error;
    }
  }

  async executeTask(task: any): Promise<any> {
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