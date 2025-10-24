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
import { Character, Condition, AbilityScores } from '@/types/character';
import { ErrorCategory, ErrorSeverity } from './error/types';
import { MessagePriority, MessageType } from './messaging/types';

// Services
import { AgentMessagingService } from './messaging/agent-messaging-service';
import { ErrorHandlingService } from './error/services/error-handling-service';
import { ValidationResultsProcessor } from './rules/services/ValidationResultsProcessor';
import { ValidationService } from './rules/services/ValidationService';
import { validateEncounterSpec } from './rules/validators/encounter-validator';
import { EncounterSpec, MonsterDef } from '@/types/encounters';

// Utilities
import { callEdgeFunction } from '@/utils/edgeFunctionHandler';

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
   * Applies damage to a character, accounting for temporary hit points.
   * @param character The character to apply damage to.
   * @param damageAmount The amount of damage to apply.
   * @returns The updated character object.
   */
  public applyDamage(character: Character, damageAmount: number): Character {
    const updatedCharacter = { ...character };
    let remainingDamage = damageAmount;

    if (updatedCharacter.hitPoints.temporary > 0) {
      if (remainingDamage >= updatedCharacter.hitPoints.temporary) {
        remainingDamage -= updatedCharacter.hitPoints.temporary;
        updatedCharacter.hitPoints.temporary = 0;
      } else {
        updatedCharacter.hitPoints.temporary -= remainingDamage;
        remainingDamage = 0;
      }
    }

    if (remainingDamage > 0) {
      updatedCharacter.hitPoints.current = Math.max(0, updatedCharacter.hitPoints.current - remainingDamage);
    }

    if (updatedCharacter.hitPoints.current === 0) {
      if (!updatedCharacter.activeConditions.includes('Unconscious')) {
        updatedCharacter.activeConditions.push('Unconscious');
      }
    }

    if (damageAmount > 0 && updatedCharacter.activeConcentration) {
      const dc = Math.max(10, Math.floor(damageAmount / 2));
      const save = this.handleSavingThrow(updatedCharacter, 'constitution', dc);
      if (!save.success) {
        updatedCharacter.activeConcentration = null;
      }
    }

    return updatedCharacter;
  }

  /**
   * Handles a saving throw for a character.
   * @param character The character making the saving throw.
   * @param ability The ability score to use for the save.
   * @param dc The Difficulty Class of the save.
   * @returns An object indicating if the save was successful.
   */
  public handleSavingThrow(character: Character, ability: keyof AbilityScores, dc: number): { success: boolean; roll: number; total: number } {
    const abilityScore = character.abilityScores[ability];
    const proficiencyBonus = this.getProficiencyBonus(character.level);
    const modifier = abilityScore.modifier;
    const isProficient = character.savingThrowProficiencies.includes(ability);
    const totalModifier = modifier + (isProficient ? proficiencyBonus : 0);
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + totalModifier;
    const success = total >= dc;

    return { success, roll, total };
  }

  /**
   * Calculates the proficiency bonus for a character based on their level.
   * @param level The character's level.
   * @returns The proficiency bonus.
   */
  private getProficiencyBonus(level: number): number {
    if (level <= 4) return 2;
    if (level <= 8) return 3;
    if (level <= 12) return 4;
    if (level <= 16) return 5;
    return 6;
  }

  /**
   * Applies healing to a character.
   * @param character The character to apply healing to.
   * @param healingAmount The amount of healing to apply.
   * @returns The updated character object.
   */
  public applyHealing(character: Character, healingAmount: number): Character {
    const updatedCharacter = { ...character };
    updatedCharacter.hitPoints.current = Math.min(updatedCharacter.hitPoints.maximum, updatedCharacter.hitPoints.current + healingAmount);
    return updatedCharacter;
  }

  /**
   * Handles a death saving throw for a character.
   * @param character The character making the death saving throw.
   * @returns The updated character object.
   */
  public handleDeathSavingThrow(character: Character): Character {
    const updatedCharacter = { ...character };
    const roll = Math.floor(Math.random() * 20) + 1;

    if (roll === 20) {
      updatedCharacter.deathSaves.successes += 2;
    } else if (roll >= 10) {
      updatedCharacter.deathSaves.successes += 1;
    } else if (roll === 1) {
      updatedCharacter.deathSaves.failures += 2;
    } else {
      updatedCharacter.deathSaves.failures += 1;
    }

    if (updatedCharacter.deathSaves.successes >= 3) {
      updatedCharacter.activeConditions = updatedCharacter.activeConditions.filter(c => c !== 'Unconscious');
      updatedCharacter.hitPoints.current = 1; // Character becomes stable
    }

    if (updatedCharacter.deathSaves.failures >= 3) {
      updatedCharacter.isDead = true;
    }

    return updatedCharacter;
  }

  /**
   * Applies a condition to a character.
   * @param character The character to apply the condition to.
   * @param condition The condition to apply.
   * @returns The updated character object.
   */
  public applyCondition(character: Character, condition: Condition): Character {
    const updatedCharacter = { ...character };
    if (!updatedCharacter.activeConditions.includes(condition)) {
      updatedCharacter.activeConditions.push(condition);
    }
    return updatedCharacter;
  }

  /**
   * Removes a condition from a character.
   * @param character The character to remove the condition from.
   * @param condition The condition to remove.
   * @returns The updated character object.
   */
  public removeCondition(character: Character, condition: Condition): Character {
    const updatedCharacter = { ...character };
    updatedCharacter.activeConditions = updatedCharacter.activeConditions.filter(c => c !== condition);
    return updatedCharacter;
  }

  /**
   * Creates a new RulesInterpreterAgent instance.
   */
  constructor() {
    this.id = 'rules_interpreter_1';
    this.role = 'Rules Interpreter';
    this.goal = 'Ensure accurate interpretation and application of fantasy RPG rules';
    this.backstory = 'An expert in fantasy tabletop RPG rules with comprehensive knowledge of game mechanics';
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

      // Handle damage and healing tasks directly
      if (task.context?.action === 'apply_damage' && task.context?.character && task.context?.amount) {
        const updatedCharacter = this.applyDamage(task.context.character, task.context.amount);
        return { success: true, message: 'Damage applied successfully', data: { character: updatedCharacter } };
      }

      if (task.context?.action === 'apply_healing' && task.context?.character && task.context?.amount) {
        const updatedCharacter = this.applyHealing(task.context.character, task.context.amount);
        return { success: true, message: 'Healing applied successfully', data: { character: updatedCharacter } };
      }

      if (task.context?.action === 'make_death_save' && task.context?.character) {
        const updatedCharacter = this.handleDeathSavingThrow(task.context.character);
        return { success: true, message: 'Death save handled successfully', data: { character: updatedCharacter } };
      }

      if (task.context?.action === 'make_saving_throw' && task.context?.character && task.context?.ability && task.context?.dc) {
        const result = this.handleSavingThrow(task.context.character, task.context.ability, task.context.dc);
        return { success: true, message: 'Saving throw handled successfully', data: result };
      }

      if (task.context?.action === 'apply_condition' && task.context?.character && task.context?.condition) {
        const updatedCharacter = this.applyCondition(task.context.character, task.context.condition);
        return { success: true, message: 'Condition applied successfully', data: { character: updatedCharacter } };
      }

      if (task.context?.action === 'remove_condition' && task.context?.character && task.context?.condition) {
        const updatedCharacter = this.removeCondition(task.context.character, task.context.condition);
        return { success: true, message: 'Condition removed successfully', data: { character: updatedCharacter } };
      }

      const ruleValidations = task.context?.ruleType ?
        await this.validationService.validateRules(task.context) : null;

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
            console.warn('Failed to load SRD monsters in RulesInterpreterAgent; using empty list');
          }
        }
        const party = task.context?.party;
        encounterValidation = validateEncounterSpec(spec, monsters, party);
      }

      const processedResults = await this.resultsProcessor.processResults(ruleValidations);

      await errorHandler.handleOperation(
        async () => this.messagingService.sendMessage(
          this.id,
          'dm_agent_1',
          MessageType.TASK,
          {
            taskDescription: task.description,
          validationResults: processedResults,
          encounterValidation
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
          validationResults: processedResults,
          encounterValidation
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
