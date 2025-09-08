/**
 * Rules Task Executor for CrewAI
 * 
 * This file defines the RulesTaskExecutor class, responsible for executing tasks
 * assigned to the Rules Interpreter agent within the CrewAI framework. It handles
 * task validation, context building, execution with retries (calling the 
 * `rules-interpreter-execute` Edge Function), and result processing.
 * 
 * Main Class:
 * - RulesTaskExecutor: Executes rule interpretation tasks.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - MemoryAdapter (`../adapters/memory-adapter.ts`)
 * - CrewAI task types (`../types/tasks`)
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// CrewAI Adapters (assuming kebab-case filenames)
import { MemoryAdapter } from '../adapters/memory-adapter';

// CrewAI Types
import { CrewAITask, TaskStatus, TaskResult } from '../types/tasks';


export class RulesTaskExecutor {
  private memoryAdapter: MemoryAdapter;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(memoryAdapter: MemoryAdapter) {
    this.memoryAdapter = memoryAdapter;
  }

  async executeTask(task: CrewAITask): Promise<TaskResult> {
    console.log('CrewAI Rules Interpreter executing task:', task);
    const startTime = Date.now();
    
    try {
      await this.validateTask(task);
      await this.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS);
      
      const context = await this.buildTaskContext(task);
      const result = await this.executeWithRetries(task, context);
      
      await this.storeTaskResult(result);
      await this.updateTaskStatus(task.id, TaskStatus.COMPLETED);
      
      return this.createSuccessResult(result, startTime);
    } catch (error) {
      console.error('Error executing CrewAI Rules Interpreter task:', error);
      await this.updateTaskStatus(task.id, TaskStatus.FAILED);
      return this.createErrorResult(error, startTime);
    }
  }

  private async validateTask(task: CrewAITask): Promise<void> {
    if (!task.id || !task.description) {
      throw new Error('Invalid task: missing required fields');
    }

    if (task.crewAIContext?.dependencies?.length) {
      const { data: dependentTasks } = await supabase
        .from('task_queue')
        .select('id, status')
        .in('id', task.crewAIContext.dependencies);

      const incompleteTasks = dependentTasks?.filter(t => 
        t.status !== TaskStatus.COMPLETED
      );

      if (incompleteTasks?.length) {
        throw new Error('Dependencies not met: some required tasks are incomplete');
      }
    }
  }

  private async buildTaskContext(task: CrewAITask): Promise<any> {
    const memories = await this.memoryAdapter.getRecentMemories();
    const taskContext = {
      priority: task.crewAIContext?.priority || 'MEDIUM',
      dependencies: task.crewAIContext?.dependencies || [],
      assignedAgent: task.crewAIContext?.assignedAgent
    };

    return { memories, taskContext };
  }

  private async executeWithRetries(task: CrewAITask, context: any): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.executeRuleValidation(task, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt === this.MAX_RETRIES) break;
        
        console.log(`Retry attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
    
    throw lastError || new Error('Task execution failed after retries');
  }

  private async executeRuleValidation(task: CrewAITask, context: any): Promise<any> {
    const { data, error } = await supabase.functions.invoke('rules-interpreter-execute', {
      body: {
        task,
        memories: context.memories,
        agentContext: {
          role: 'Rules Interpreter',
          goal: 'Ensure accurate interpretation of fantasy RPG rules',
          taskContext: context.taskContext
        }
      }
    });

    if (error) throw error;
    return data;
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const { error } = await supabase
      .from('task_queue')
      .update({ status })
      .eq('id', taskId);

    if (error) throw error;
  }

  private async storeTaskResult(result: any): Promise<void> {
    const importance = this.calculateResultImportance(result);
    
    await this.memoryAdapter.storeMemory({
      content: JSON.stringify(result),
      type: 'general',
      importance
    });
  }

  private calculateResultImportance(result: any): number {
    let importance = 3;
    if (result.error) importance += 2;
    if (result.priority === 'HIGH') importance += 2;
    return Math.min(10, importance);
  }

  private createSuccessResult(result: any, startTime: number): TaskResult {
    return {
      success: true,
      data: result,
      metadata: {
        executionTime: Date.now() - startTime,
        agentId: 'rules_interpreter',
        resourcesUsed: ['memory', 'ai_model']
      }
    };
  }

  private createErrorResult(error: unknown, startTime: number): TaskResult {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Task execution failed'),
      metadata: {
        executionTime: Date.now() - startTime,
        agentId: 'rules_interpreter'
      }
    };
  }
}