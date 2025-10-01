/**
 * Result Message Service for CrewAI
 * 
 * This file defines the ResultMessageService class, responsible for handling
 * messages that convey the results of tasks executed by CrewAI agents.
 * It processes these results, updates task statuses, stores results, and notifies
 * relevant agents. It extends BaseMessageService for common functionalities.
 * 
 * Main Class:
 * - ResultMessageService: Handles task result messages.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - BaseMessageService (./base-message-service.ts)
 * - ResultMessagePayload type from '../types/messages'.
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';
import { calculateImportance } from '@/utils/memory/importance';

// Base Service
import { BaseMessageService } from './base-message-service'; // Assuming kebab-case

// CrewAI Types
import { ResultMessagePayload } from '../types/messages';


export class ResultMessageService extends BaseMessageService {
  private memoryCache: Map<string, ResultMessagePayload>;
  private readonly MAX_RETRIES = 3;

  constructor() {
    super();
    this.memoryCache = new Map();
  }

  public async handleResultMessage(payload: ResultMessagePayload): Promise<void> {
    try {
      console.log('[ResultMessageService] Processing result message:', payload);
      let retryCount = 0;

      while (retryCount < this.MAX_RETRIES) {
        try {
          await this.processResult(payload);
          break;
        } catch (error) {
          retryCount++;
          console.error(`[ResultMessageService] Attempt ${retryCount} failed:`, error);
          if (retryCount === this.MAX_RETRIES) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error) {
      console.error('[ResultMessageService] Error handling result message:', error);
      await this.handleFailedResult(payload, error);
      throw error;
    }
  }

  private async processResult(payload: ResultMessagePayload): Promise<void> {
    // Update task status in database
    const { error: updateError } = await supabase
      .from('task_queue')
      .update({
        status: payload.success ? 'completed' : 'failed',
        result: JSON.stringify(payload.data),
        error: payload.error,
        completed_at: new Date().toISOString()
      })
      .eq('id', payload.taskId);

    if (updateError) throw updateError;

    // Store in memory cache
    this.storeInMemoryCache(payload);

    // Store successful results in persistent memory
    if (payload.success && payload.data) {
      await this.storeResultInMemory(payload);
    }

    // Notify relevant agents
    await this.notifyAgents(payload);
  }

  private async handleFailedResult(payload: ResultMessagePayload, error: any): Promise<void> {
    console.error('[ResultMessageService] Failed to process result:', error);
    
    // Store failed result in memory for potential recovery
    this.storeInMemoryCache({
      ...payload,
      error: error.message,
      success: false
    });

    // Log failure in database
    await this.storeFailedMessage('result', payload, error);
  }

  private storeInMemoryCache(payload: ResultMessagePayload): void {
    this.memoryCache.set(payload.taskId, payload);
    
    // Basic cache management - remove old entries if cache gets too large
    if (this.memoryCache.size > 1000) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }
  }

  private async storeResultInMemory(payload: ResultMessagePayload): Promise<void> {
    try {
      const importance = calculateImportance({
        content: JSON.stringify(payload.data),
        type: 'task_result',
        error: payload.error,
        priority: payload.data?.priority,
      });

      const { error } = await supabase
        .from('memories')
        .insert({
          type: 'task_result',
          content: JSON.stringify(payload.data),
          importance: importance,
          metadata: {
            taskId: payload.taskId,
            executionTime: payload.executionTime,
            timestamp: new Date().toISOString()
          }
        });

      if (error) throw error;
    } catch (error) {
      console.error('[ResultMessageService] Error storing result in memory:', error);
    }
  }

  private async notifyAgents(payload: ResultMessagePayload): Promise<void> {
    if (payload.sender) {
      await this.notifyAgent(payload.sender, {
        type: 'RESULT_PROCESSED',
        content: {
          taskId: payload.taskId,
          success: payload.success,
          timestamp: new Date().toISOString()
        }
      });
    }
  }

  // Public method for retrieving cached results
  public getCachedResult(taskId: string): ResultMessagePayload | undefined {
    return this.memoryCache.get(taskId);
  }

  // Public method for clearing old cache entries
  public clearOldCacheEntries(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [taskId, payload] of this.memoryCache.entries()) {
      const timestamp = new Date(payload.timestamp).getTime();
      if (now - timestamp > maxAgeMs) {
        this.memoryCache.delete(taskId);
      }
    }
  }
}