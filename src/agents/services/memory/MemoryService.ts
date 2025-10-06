import { supabase } from '@/integrations/supabase/client';
import { calculateImportance } from '@/utils/memory/importance';
import { getGeminiApiManager } from '@/services/gemini-api-manager-singleton';
import type { GeminiApiManager } from '@/services/gemini-api-manager';

import type { Memory as UIMemory, MemoryType as UIMemoryType } from '@/components/game/memory/types';
import type { EnhancedMemory, MemoryQueryOptions } from '@/types/memory';

export type Memory = UIMemory;
export type MemoryType = UIMemoryType;

export interface MemoryExtractionResult {
  memories: Array<Omit<Memory, 'id' | 'created_at' | 'updated_at'>>;
}

export interface MemoryContext {
  sessionId: string;
  campaignId: string;
  characterId: string;
  currentLocation?: string;
  activeNPCs?: string[];
  activeQuests?: string[];
  currentMessage: string;
  recentMessages: string[];
}

export class MemoryService {
  // ===== Static utilities (shared) =====
  private static getGeminiManager(): GeminiApiManager {
    return getGeminiApiManager();
  }

  static async generateEmbedding(content: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-embedding', {
        body: { text: content }
      });
      if (error) return null;
      return data.embedding;
    } catch {
      return null;
    }
  }

  static async saveMemories(memories: Array<Omit<Memory, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    if (!memories?.length) return;
    const toInsert = await Promise.all(
      memories.map(async (m) => {
        const rawImportance = (m as unknown as Record<string, unknown>).importance;
        const importance = typeof rawImportance === 'number' ? rawImportance : 1;
        return {
          ...m,
          importance: Math.max(1, Math.min(5, importance)),
          embedding: await MemoryService.generateEmbedding(m.content),
        };
      })
    );
    const { error } = await supabase.from('memories').insert(toInsert);
    if (error) throw error;
  }

  static async getRelevantMemories(sessionId: string, query: string, limit = 10): Promise<Memory[]> {
    const queryEmbedding = await MemoryService.generateEmbedding(query);
    if (queryEmbedding) {
      const { data, error } = await supabase.rpc('match_memories', {
        query_embedding: queryEmbedding,
        session_id: sessionId,
        match_threshold: 0.7,
        match_count: limit,
      });
      if (!error && data?.length) return data as Memory[];
    }
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as Memory[];
  }

  static async getFictionReadyMemories(sessionId: string, minNarrativeWeight = 6): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .gte('narrative_weight', minNarrativeWeight)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as Memory[];
  }

  static async reinforceMemory(memoryId: string, boost = 1): Promise<void> {
    const { data: memory, error: fetchError } = await supabase
      .from('memories')
      .select('importance, narrative_weight')
      .eq('id', memoryId)
      .single();
    if (fetchError || !memory) return;
    const { error } = await supabase
      .from('memories')
      .update({
        importance: Math.min((memory.importance || 1) + boost, 5),
        narrative_weight: Math.min((memory.narrative_weight || 0) + boost, 10),
      })
      .eq('id', memoryId);
    if (error) throw error;
  }

  static async extractMemories(context: MemoryContext, userMessage: string, aiResponse: string): Promise<MemoryExtractionResult> {
    try {
      const geminiManager = MemoryService.getGeminiManager();
      return await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const extractionPrompt = `You are a memory extraction system for a D&D campaign. Extract important memories from this conversation exchange.

CONTEXT:
- Session: ${context.sessionId}
- Location: ${context.currentLocation || 'Unknown'}
- Active NPCs: ${context.activeNPCs?.join(', ') || 'None'}
- Active Quests: ${context.activeQuests?.join(', ') || 'None'}

CONVERSATION:
Player: ${userMessage}
DM: ${aiResponse}

Extract 1-4 key memories in this JSON format:
{
  "memories": [
    {
      "session_id": "${context.sessionId}",
      "type": "npc|location|quest|item|event|story_beat|character_moment|world_detail|dialogue_gem|atmosphere|plot_point|foreshadowing",
      "category": "brief category",
      "content": "concise memory description",
      "importance": 1-5,
      "emotional_tone": "peaceful|mysterious|foreboding|intense|triumphant|humorous|melancholy|neutral",
      "metadata": {}
    }
  ]
}`;
        const response = await model.generateContent(extractionPrompt);
        const text = await response.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return { memories: [] };
        try {
          return JSON.parse(jsonMatch[0]) as MemoryExtractionResult;
        } catch {
          return { memories: [] };
        }
      });
    } catch {
      return { memories: [] };
    }
  }

  static async loadRecentMemories(sessionId: string): Promise<Memory[]> {
    const { data: memories, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return (memories || []) as Memory[];
  }

  // ===== Instance API (session-scoped) =====
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
    const embedding = await MemoryService.generateEmbedding(content);
    const metadata = {
      category,
      context: JSON.stringify({ ...context, sceneState: this.currentState }),
      timestamp: new Date().toISOString(),
    };
    const { error } = await supabase.from('memories').insert({
      session_id: this.sessionId,
      type,
      content,
      importance,
      metadata,
      embedding,
    });
    if (error) throw error;
    await this.updateSceneState({ type, content, context, category, importance, metadata } as Partial<EnhancedMemory>);
  }

  async retrieveMemories(options: MemoryQueryOptions = {}): Promise<EnhancedMemory[]> {
    if (options.query && options.semanticSearch) {
      return this.semanticSearch(options.query, options);
    }
    let query = supabase
      .from('memories')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: false });
    if (options.category) query = query.eq('metadata->category', options.category);
    if (options.timeframe === 'recent') {
      const recentTime = new Date();
      recentTime.setMinutes(recentTime.getMinutes() - 30);
      query = query.gte('created_at', recentTime.toISOString());
    }
    if (options.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(this.transformDatabaseMemory);
  }

  private async updateSceneState(memory: Partial<EnhancedMemory>): Promise<void> {
    if (!this.currentState) {
      this.currentState = {
        currentLocation: '',
        activeNPCs: [],
        environmentDetails: { atmosphere: '', timeOfDay: '', sensoryDetails: [] },
        playerState: { lastAction: '' },
      };
    }
    switch (memory.type) {
      case 'action':
        this.currentState.playerState.lastAction = memory.content || '';
        break;
      case 'scene_state':
        if (memory.context?.location) this.currentState.currentLocation = memory.context.location;
        if (memory.context?.npcs) this.updateActiveNPCs(memory.context.npcs);
        break;
    }
  }

  private updateActiveNPCs(npcs: string[]): void {
    for (const npc of npcs) {
      if (!this.currentState?.activeNPCs.find((n) => n.name === npc)) {
        this.currentState?.activeNPCs.push({ id: npc.toLowerCase().replace(/\s+/g, '_'), name: npc, status: 'present' });
      }
    }
    if (this.currentState) {
      this.currentState.activeNPCs = this.currentState.activeNPCs.map((npc) => ({
        ...npc,
        status: npcs.includes(npc.name) ? 'present' : 'departed',
      }));
    }
  }

  private async semanticSearch(query: string, options: MemoryQueryOptions): Promise<EnhancedMemory[]> {
    const queryEmbedding = await MemoryService.generateEmbedding(query);
    if (!queryEmbedding) {
      return this.retrieveMemories({ ...options, semanticSearch: false });
    }
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: queryEmbedding,
      session_id: this.sessionId,
      match_threshold: 0.7,
      match_count: options.limit || 10,
    });
    if (error) throw error;
    return (data || []).map(this.transformDatabaseMemory);
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
      metadata: dbMemory.metadata || {},
    };
  }
}
