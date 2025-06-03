/**
 * Memory Adapter for CrewAI Integration
 * 
 * This file defines the MemoryAdapter class, which serves as a bridge between
 * the CrewAI agent memory requirements and the application's specific memory storage
 * implementation (Supabase database). It handles fetching, storing, and validating memories.
 * 
 * Main Class:
 * - MemoryAdapter: Provides methods to interact with the memory storage for a given session.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - Memory-related types from `@/components/game/memory/types`
 * - JSON type from `@/integrations/supabase/types`
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project-specific Types
import { Json } from '@/integrations/supabase/types';
import { Memory, MemoryType, MemorySubcategory, isValidMemoryType, isValidMemorySubcategory } from '@/components/game/memory/types';


export class MemoryAdapter {
  private shortTerm: Memory[] = [];
  private longTerm: Memory[] = [];
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Retrieves all memories for the current session
   */
  async getAllMemories(): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(this.validateAndConvertMemory.bind(this)) || [];
  }

  /**
   * Retrieves recent memories
   */
  async getRecentMemories(limit: number = 5): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.map(this.validateAndConvertMemory.bind(this)) || [];
  }

  /**
   * Stores a new memory
   */
  async storeMemory(memory: Partial<Memory>): Promise<void> {
    if (!memory.content) {
      throw new Error('Memory content is required');
    }

    const memoryData = {
      content: memory.content,
      type: this.validateMemoryType(memory.type),
      subcategory: this.validateMemorySubcategory(memory.subcategory),
      session_id: this.sessionId,
      importance: memory.importance || 0,
      embedding: this.formatEmbedding(memory.embedding),
      metadata: memory.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      context_id: memory.context_id,
      related_memories: memory.related_memories || [],
      tags: memory.tags || []
    };

    const { error } = await supabase
      .from('memories')
      .insert([memoryData]);

    if (error) throw error;

    const newMemory = this.validateAndConvertMemory({
      ...memoryData,
      id: '', // Will be replaced by actual ID from database
    });

    this.updateMemoryCache(newMemory);
  }

  /**
   * Validates and formats the embedding data
   */
  private formatEmbedding(embedding?: number[] | string | null): string {
    if (!embedding) return '';
    if (Array.isArray(embedding)) {
      return JSON.stringify(embedding);
    }
    return embedding;
  }

  /**
   * Validates memory type
   */
  private validateMemoryType(type?: MemoryType): MemoryType {
    if (type && isValidMemoryType(type)) {
      return type;
    }
    console.warn(`Invalid memory type: ${type}, defaulting to 'general'`);
    return 'general';
  }

  /**
   * Validates memory subcategory
   */
  private validateMemorySubcategory(subcategory?: MemorySubcategory): MemorySubcategory {
    if (subcategory && isValidMemorySubcategory(subcategory)) {
      return subcategory;
    }
    console.warn(`Invalid memory subcategory: ${subcategory}, defaulting to 'general'`);
    return 'general';
  }

  /**
   * Updates the memory cache
   */
  private updateMemoryCache(newMemory: Memory): void {
    if (this.shortTerm.length >= 10) {
      const oldestMemory = this.shortTerm.pop();
      if (oldestMemory) {
        this.longTerm.push(oldestMemory);
      }
    }
    this.shortTerm.unshift(newMemory);
  }

  /**
   * Validates and converts a database record to a Memory object
   */
  private validateAndConvertMemory(record: any): Memory {
    const validatedType = this.validateMemoryType(record.type as MemoryType);
    const validatedSubcategory = this.validateMemorySubcategory(record.subcategory as MemorySubcategory);
    
    let parsedEmbedding: number[] | null = null;
    if (record.embedding) {
      try {
        parsedEmbedding = JSON.parse(record.embedding);
      } catch {
        console.warn('Failed to parse embedding, using null');
      }
    }

    return {
      id: record.id || '',
      content: record.content || '',
      type: validatedType,
      subcategory: validatedSubcategory,
      session_id: record.session_id || this.sessionId,
      importance: record.importance || 0,
      embedding: parsedEmbedding,
      metadata: record.metadata || {},
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
      context_id: record.context_id || null,
      related_memories: record.related_memories || [],
      tags: record.tags || []
    };
  }
}