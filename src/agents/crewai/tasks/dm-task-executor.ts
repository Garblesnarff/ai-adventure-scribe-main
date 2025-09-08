/**
 * DM Task Executor for CrewAI
 * 
 * This file defines the DMTaskExecutor class, responsible for executing tasks
 * assigned to the Dungeon Master agent within the CrewAI framework. It handles
 * task validation, context building (including memory retrieval), execution
 * with retries, and result processing.
 * 
 * Main Class:
 * - DMTaskExecutor: Executes DM-specific tasks.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - MemoryAdapter (`../adapters/memory-adapter.ts`)
 * - CrewAI task types (`../types/tasks`)
 * - General Memory type (`@/components/game/memory/types`)
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project-specific Types
import { Memory } from '@/components/game/memory/types';

// CrewAI Adapters (assuming kebab-case filenames)
import { MemoryAdapter } from '../adapters/memory-adapter';

// CrewAI Types
import { CrewAITask, TaskStatus, TaskResult } from '../types/tasks';


export class DMTaskExecutor {
  private memoryAdapter: MemoryAdapter;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // ms

  constructor(memoryAdapter: MemoryAdapter) {
    this.memoryAdapter = memoryAdapter;
  }

  /**
   * Execute a task with memory integration and validation
   */
  async executeTask(task: CrewAITask): Promise<TaskResult> {
    console.log('CrewAI DM Agent executing task:', task);
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
      console.error('Error executing CrewAI DM agent task:', error);
      await this.updateTaskStatus(task.id, TaskStatus.FAILED);
      return this.createErrorResult(error, startTime);
    }
  }

  /**
   * Validate task and its dependencies
   */
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

  /**
   * Build comprehensive task context including memories
   */
  private async buildTaskContext(task: CrewAITask): Promise<{
    memories: Memory[];
    taskContext: Record<string, any>;
  }> {
    const memories = await this.memoryAdapter.getRecentMemories();
    const taskContext = {
      priority: task.crewAIContext?.priority || 'MEDIUM',
      dependencies: task.crewAIContext?.dependencies || [],
      assignedAgent: task.crewAIContext?.assignedAgent
    };

    return { memories, taskContext };
  }

  /**
   * Execute task with retry mechanism
   */
  private async executeWithRetries(
    task: CrewAITask, 
    context: { memories: Memory[]; taskContext: Record<string, any> }
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.executeAIFunction(task, context);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        if (attempt === this.MAX_RETRIES) break;
        
        console.log(`Retry attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
      }
    }
    
    throw lastError || new Error('Task execution failed after retries');
  }

  /**
   * Execute AI function through Edge Function with enhanced context
   */
  private async executeAIFunction(
    task: CrewAITask,
    context: { memories: Memory[]; taskContext: Record<string, any> }
  ): Promise<any> {
    const { data, error } = await supabase.functions.invoke('dm-agent-execute', {
      body: {
        task,
        memories: context.memories,
        agentContext: {
          role: 'Game Master',
          goal: 'Guide players through an engaging fantasy RPG campaign with advanced AI capabilities',
          backstory: 'An experienced GM enhanced with CrewAI capabilities for dynamic storytelling',
          taskContext: context.taskContext
        }
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Update task status in database
   */
  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const { error } = await supabase
      .from('task_queue')
      .update({ status })
      .eq('id', taskId);

    if (error) throw error;
  }

  /**
   * Store task result in memory with importance scoring
   */
  private async storeTaskResult(result: any): Promise<void> {
    const importance = this.calculateResultImportance(result);
    
    await this.memoryAdapter.storeMemory({
      content: JSON.stringify(result),
      type: 'general',
      importance
    });
  }

  /**
   * Calculate importance score for task result
   */
  private calculateResultImportance(result: any): number {
    let importance = 3; // Base importance

    // Increase importance for errors or high-priority tasks
    if (result.error) importance += 2;
    if (result.priority === 'HIGH') importance += 2;

    // Cap importance at 10
    return Math.min(10, importance);
  }

  /**
   * Create success result object
   */
  private createSuccessResult(result: any, startTime: number): TaskResult {
    return {
      success: true,
      data: result,
      metadata: {
        executionTime: Date.now() - startTime,
        agentId: 'dm_agent',
        resourcesUsed: ['memory', 'ai_model']
      }
    };
  }

  /**
   * Create error result object
   */
  private createErrorResult(error: unknown, startTime: number): TaskResult {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Task execution failed'),
      metadata: {
        executionTime: Date.now() - startTime,
        agentId: 'dm_agent'
      }
    };
  }
}