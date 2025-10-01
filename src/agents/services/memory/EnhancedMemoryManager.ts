/**
 * Enhanced Memory Manager
 * 
 * This file defines the EnhancedMemoryManager class, responsible for managing
 * a more sophisticated memory system for agents. It handles storing memories
 * with calculated importance, retrieving memories based on various options
 * (category, timeframe, limit), and maintaining a basic scene state derived
 * from memories.
 * 
 * Main Class:
 * - EnhancedMemoryManager: Manages storage, retrieval, and context-aware processing of memories.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - CrewAI memory types (`@/agents/crewai/types/memory`)
 * - Json type from Supabase (`@/integrations/supabase/types`)
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';
import { calculateImportance } from '@/utils/memory/importance';

// Project Types
import { EnhancedMemory, MemoryQueryOptions } from '@/types/memory';
import { Json } from '@/integrations/supabase/types';


export class EnhancedMemoryManager {
  private sessionId: string;
  private currentState: EnhancedMemory['context']['sceneState'] | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  async storeMemory(
    content: string,
    type: EnhancedMemory['type'],
    category: EnhancedMemory['category'],
    context: Partial<EnhancedMemory['context']> = {}
  ): Promise<void> {
    const importance = calculateImportance({ content, type, category });

    // Generate embedding for semantic search
    const embedding = await this.generateEmbedding(content);

    // Serialize the context and metadata for Supabase storage
    const metadata = {
      category,
      context: JSON.stringify({
        ...context,
        sceneState: this.currentState
      }),
      timestamp: new Date().toISOString()
    };

    console.log('[Memory] Storing new memory:', { type, category, importance });

    const { error } = await supabase
      .from('memories')
      .insert({
        session_id: this.sessionId,
        type,
        content,
        importance,
        metadata,
        embedding
      });

    if (error) {
      console.error('[Memory] Error storing memory:', error);
      throw error;
    }

    await this.updateSceneState({
      type,
      content,
      context,
      category,
      importance,
      metadata,
    } as Partial<EnhancedMemory>);
  }

  async retrieveMemories(options: MemoryQueryOptions = {}): Promise<EnhancedMemory[]> {
    console.log('[Memory] Retrieving memories with options:', options);

    // If semantic search is requested, use embedding similarity
    if (options.query && options.semanticSearch) {
      return this.semanticSearch(options.query, options);
    }

    let query = supabase
      .from('memories')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: false });

    if (options.category) {
      query = query.eq('metadata->category', options.category);
    }

    if (options.timeframe === 'recent') {
      const recentTime = new Date();
      recentTime.setMinutes(recentTime.getMinutes() - 30);
      query = query.gte('created_at', recentTime.toISOString());
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Memory] Error retrieving memories:', error);
      throw error;
    }

    return data.map(this.transformDatabaseMemory);
  }

  private async updateSceneState(memory: Partial<EnhancedMemory>): Promise<void> {
    if (!this.currentState) {
      this.currentState = {
        currentLocation: '',
        activeNPCs: [],
        environmentDetails: {
          atmosphere: '',
          timeOfDay: '',
          sensoryDetails: []
        },
        playerState: {
          lastAction: ''
        }
      };
    }

    // Update state based on memory type
    switch (memory.type) {
      case 'action':
        this.currentState.playerState.lastAction = memory.content || '';
        break;
      case 'scene_state':
        if (memory.context?.location) {
          this.currentState.currentLocation = memory.context.location;
        }
        if (memory.context?.npcs) {
          this.updateActiveNPCs(memory.context.npcs);
        }
        break;
    }

    console.log('[Memory] Updated scene state:', this.currentState);
  }

  private updateActiveNPCs(npcs: string[]): void {
    // Add new NPCs
    for (const npc of npcs) {
      if (!this.currentState?.activeNPCs.find(n => n.name === npc)) {
        this.currentState?.activeNPCs.push({
          id: npc.toLowerCase().replace(/\s+/g, '_'),
          name: npc,
          status: 'present'
        });
      }
    }

    // Mark absent NPCs as departed
    if (this.currentState) {
      this.currentState.activeNPCs = this.currentState.activeNPCs.map(npc => ({
        ...npc,
        status: npcs.includes(npc.name) ? 'present' : 'departed'
      }));
    }
  }

  /**
   * Generate embedding for content using OpenAI API
   */
  private async generateEmbedding(content: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { text: content }
      });

      if (error) {
        console.error('[Memory] Error generating embedding:', error);
        return null;
      }

      return data.embedding;
    } catch (error) {
      console.error('[Memory] Failed to generate embedding:', error);
      return null;
    }
  }

  /**
   * Perform semantic search using embedding similarity
   */
  private async semanticSearch(
    query: string,
    options: MemoryQueryOptions
  ): Promise<EnhancedMemory[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      if (!queryEmbedding) {
        console.warn('[Memory] Failed to generate query embedding, falling back to regular search');
        return this.retrieveMemories({ ...options, semanticSearch: false });
      }

      // Use Supabase vector similarity search
      let rpcQuery = supabase
        .rpc('match_memories', {
          query_embedding: queryEmbedding,
          session_id: this.sessionId,
          match_threshold: 0.7,
          match_count: options.limit || 10
        });

      const { data, error } = await rpcQuery;

      if (error) {
        console.error('[Memory] Error in semantic search:', error);
        throw error;
      }

      return data.map(this.transformDatabaseMemory);
    } catch (error) {
      console.error('[Memory] Semantic search failed:', error);
      // Fallback to regular search
      return this.retrieveMemories({ ...options, semanticSearch: false });
    }
  }

  private transformDatabaseMemory(dbMemory: any): EnhancedMemory {
    const metadata = dbMemory.metadata || {};
    const context = metadata.context ? JSON.parse(metadata.context) : {};

    return {
      id: dbMemory.id,
      type: dbMemory.type,
      content: dbMemory.content,
      timestamp: dbMemory.created_at,
      importance: dbMemory.importance || 0,
      category: metadata.category || 'general',
      context,
      metadata: dbMemory.metadata || {}
    };
  }
}