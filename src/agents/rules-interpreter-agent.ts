/**
 * Rules Interpreter Agent
 * 
 * Interprets and enforces game rules.
 * Validates player actions, processes rule results, and communicates with other agents.
 * 
 * Dependencies:
 * - Agent interfaces and types (src/agents/types.ts)
 * - Edge function caller (src/utils/edgeFunctionHandler.ts)
 * - Messaging service (src/agents/messaging/agent-messaging-service.ts)
 * - CrewAI communication types (src/agents/crewai/types/communication.ts)
 * - Error handling services (src/agents/error/services/ErrorHandlingService.ts)
 * - Validation services (src/agents/rules/services/ValidationService.ts)
 * - Validation results processor (src/agents/rules/services/ValidationResultsProcessor.ts)
 * 
 * @author AI Dungeon Master Team
 */

 // ============================
 // Project types and interfaces
 // ============================
import { Agent, AgentResult, AgentTask } from './types';

 // ============================
 // Utilities
 // ============================
import { callEdgeFunction } from '@/utils/edgeFunctionHandler';

 // ============================
 // Messaging services
 // ============================
import { AgentMessagingService } from './messaging/AgentMessagingService';

 // ============================
 // CrewAI communication types
 // ============================
import { MessageType, MessagePriority } from './crewai/types/communication';

 // ============================
 // Error handling
 // ============================
import { ErrorHandlingService } from './error/services/ErrorHandlingService';
import { ErrorCategory, ErrorSeverity } from './error/types';

 // ============================
 // Validation services
 // ============================
import { ValidationService } from './rules/services/ValidationService';
import { ValidationResultsProcessor } from './rules/services/ValidationResultsProcessor';

export class RulesInterpreterAgent implements Agent {
  id: string;
  role: string;
  goal: string;
  backstory: string;
  verbose: boolean;
  allowDelegation: boolean;
  private messagingService: AgentMessagingService;
  private validationService: ValidationService;
  private resultsProcessor: ValidationResultsProcessor;

  /**
   * Creates a new RulesInterpreterAgent instance.
   */
  constructor() {
    this.id = 'rules_interpreter_1';
    this.role = 'Rules Interpreter';
    this.goal = 'Ensure accurate interpretation and application of D&D 5E rules';
    this.backstory = 'An expert in D&D 5E rules with comprehensive knowledge of game mechanics';
    this.verbose = true;
    this.allowDelegation = true;
    this.messagingService = AgentMessagingService.getInstance();
    this.validationService = new ValidationService();
    this.resultsProcessor = new ValidationResultsProcessor();
  }

  /**
   * Executes a rules interpretation task, validates rules, processes results, and communicates with other agents.
   * 
   * @param {AgentTask} task - The task to execute
   * @returns {Promise<AgentResult>} The result of the task execution
   */
  async executeTask(task: AgentTask): Promise<AgentResult> {
    const errorHandler = ErrorHandlingService.getInstance();

    try {
      console.log(`Rules Interpreter executing task: ${task.description}`);

      const ruleValidations = task.context?.ruleType ? 
        await this.validationService.validateRules(task.context) : null;

      const processedResults = await this.resultsProcessor.processResults(ruleValidations);

      await errorHandler.handleOperation(
        async () => this.messagingService.sendMessage(
          this.id,
          'dm_agent_1',
          MessageType.TASK,
          {
            taskDescription: task.description,
            validationResults: processedResults
          },
          MessagePriority.HIGH
        ),
        {
          category: ErrorCategory.AGENT,
          context: 'RulesInterpreterAgent.executeTask.sendMessage',
          severity: ErrorSeverity.MEDIUM
        }
      );

      const data = await errorHandler.handleOperation(
        async () => callEdgeFunction('rules-interpreter-execute', {
          task,
          agentContext: {
            role: this.role,
            goal: this.goal,
            backstory: this.backstory,
            validationResults: processedResults
          }
        }),
        {
          category: ErrorCategory.NETWORK,
          context: 'RulesInterpreterAgent.executeTask.edgeFunction',
          severity: ErrorSeverity.HIGH,
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000
          }
        }
      );

      if (!data) throw new Error('Failed to execute task');

      return {
        success: true,
        message: 'Rules interpretation completed successfully',
        data: {
          ...data,
          validationResults: processedResults
        }
      };
    } catch (error) {
      console.error('Error executing Rules Interpreter task:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute task'
      };
    }
  }
}
