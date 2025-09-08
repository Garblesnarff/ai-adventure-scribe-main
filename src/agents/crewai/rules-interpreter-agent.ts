/**
 * CrewAI Rules Interpreter Agent
 * 
 * This file defines the Rules Interpreter agent specifically tailored for the CrewAI framework.
 * It implements the CrewAIAgentBridge and orchestrates rule interpretation tasks,
 * utilizing specialized tools and memory within the CrewAI environment.
 * 
 * Main Class:
 * - CrewAIRulesInterpreterAgent: Manages rule interpretation tasks using CrewAI patterns.
 * 
 * Key Dependencies:
 * - CrewAI base types (./types/base)
 * - CrewAI communication types (./types/communication)
 * - CrewAI task types (./types/tasks)
 * - MessageHandler (./handlers/message-handler.ts)
 * - RulesInterpreterTools (./tools/rules-interpreter-tools.ts)
 * - RulesMemoryManager (./memory/rules-memory-manager.ts)
 * - RulesTaskExecutor (./tasks/rules-task-executor.ts)
 * 
 * @author AI Dungeon Master Team
 */

// CrewAI Types
import { CrewAIAgentBridge } from './types/base';
import { AgentMessage } from './types/communication';
import { CrewAITask } from './types/tasks';

// CrewAI Components (assuming kebab-case filenames)
import { MessageHandler } from './handlers/message-handler';
import { RulesInterpreterTools } from './tools/rules-interpreter-tools';
import { RulesMemoryManager } from './memory/rules-memory-manager';
import { RulesTaskExecutor } from './tasks/rules-task-executor';

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
    this.goal = 'Ensure accurate interpretation and application of fantasy RPG rules with advanced AI capabilities';
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