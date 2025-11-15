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
// Project Imports
// ============================

// Agent Core & Types
import { Agent, AgentResult, AgentTask } from './types';
import { ErrorCategory, ErrorSeverity } from './error/types';
import { MessagePriority, MessageType } from './messaging/types';

// Services
import { AgentMessagingService } from './messaging/agent-messaging-service';
import { ErrorHandlingService } from './error/services/error-handling-service'; // Assuming kebab-case
import { ValidationResultsProcessor } from './rules/services/ValidationResultsProcessor';
import { ValidationService } from './rules/services/ValidationService';
import { validateEncounterSpec } from './rules/validators/encounter-validator';
import { EncounterSpec, MonsterDef } from '@/types/encounters';

// Utilities
import { callEdgeFunction } from '@/utils/edgeFunctionHandler';
import { logger } from '../lib/logger';

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
    this.goal = 'Ensure accurate interpretation and application of fantasy RPG rules';
    this.backstory =
      'An expert in fantasy tabletop RPG rules with comprehensive knowledge of game mechanics';
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
      logger.info(`Rules Interpreter executing task: ${task.description}`);

      const ruleValidations = task.context?.ruleType
        ? await this.validationService.validateRules(task.context)
        : null;

      // EncounterSpec validation path (internal use)
      let encounterValidation: any = null;
      if (task.context?.encounterSpec) {
        const spec = task.context.encounterSpec as EncounterSpec;
        // If monsters aren't provided in context, load via SRD loader
        let monsters: MonsterDef[] = task.context.monsters ?? [];
        if (!monsters.length) {
          try {
            const { loadMonsters } = await import('@/services/encounters/srd-loader');
            monsters = loadMonsters();
          } catch (e) {
            logger.warn('Failed to load SRD monsters in RulesInterpreterAgent; using empty list');
          }
        }
        const party = task.context?.party;
        encounterValidation = validateEncounterSpec(spec, monsters, party);
      }

      const processedResults = await this.resultsProcessor.processResults(ruleValidations);

      await errorHandler.handleOperation(
        async () =>
          this.messagingService.sendMessage(
            this.id,
            'dm_agent_1',
            MessageType.TASK,
            {
              taskDescription: task.description,
              validationResults: processedResults,
              encounterValidation,
            },
            MessagePriority.HIGH,
          ),
        {
          category: ErrorCategory.AGENT,
          context: 'RulesInterpreterAgent.executeTask.sendMessage',
          severity: ErrorSeverity.MEDIUM,
        },
      );

      const data = await errorHandler.handleOperation(
        async () =>
          callEdgeFunction('rules-interpreter-execute', {
            task,
            agentContext: {
              role: this.role,
              goal: this.goal,
              backstory: this.backstory,
              validationResults: processedResults,
            },
          }),
        {
          category: ErrorCategory.NETWORK,
          context: 'RulesInterpreterAgent.executeTask.edgeFunction',
          severity: ErrorSeverity.HIGH,
          retryConfig: {
            maxRetries: 3,
            initialDelay: 1000,
          },
        },
      );

      if (!data) throw new Error('Failed to execute task');

      return {
        success: true,
        message: 'Rules interpretation completed successfully',
        data: {
          ...data,
          validationResults: processedResults,
          encounterValidation,
        },
      };
    } catch (error) {
      logger.error('Error executing Rules Interpreter task:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute task',
      };
    }
  }
}
