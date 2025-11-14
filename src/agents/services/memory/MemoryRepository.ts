import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { isSemanticMemoriesEnabled } from '@/config/featureFlags';

import type { EnhancedMemory, MemoryQueryOptions } from '@/types/memory';
import type { Memory } from '@/components/game/memory/types';

let hasLoggedSemanticDisabled = false;

export class MemoryRepository {
  async insertMemories(records: Array<Record<string, any>>): Promise<void> {
    if (!records.length) return;
    const { error } = await supabase.from('memories').insert(records);
    if (error) throw error;
  }

  async loadRecentMemories(sessionId: string, limit: number = 5): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []) as Memory[];
  }

  async loadTopMemories(sessionId: string, limit: number): Promise<Memory[]> {
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

  async loadFictionReadyMemories(sessionId: string, minNarrativeWeight: number): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .gte('narrative_weight', minNarrativeWeight)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as Memory[];
  }

  async fetchMemories(sessionId: string, options: MemoryQueryOptions = {}): Promise<any[]> {
    let query = supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
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
    if (error) throw error;
    return data || [];
  }

  async matchMemories(sessionId: string, embedding: string, limit: number, threshold: number) {
    if (!isSemanticMemoriesEnabled()) {
      if (!hasLoggedSemanticDisabled) {
        logger.debug('[MemoryRepository] Semantic memories disabled; skipping semantic match.');
        hasLoggedSemanticDisabled = true;
      }
      return [];
    }
    const { data, error } = await supabase.rpc('match_memories', {
      query_embedding: embedding,
      session_id: sessionId,
      match_threshold: threshold,
      match_count: limit,
    });
    if (error) {
      const code = (error as { code?: string }).code;
      const status = (error as { status?: number }).status;
      const message = (error as { message?: string }).message?.toLowerCase() || '';
      if (
        code === 'PGRST202' ||
        code === 'PGRST204' ||
        code === 'PGRST205' ||
        code === 'PGRST301' ||
        code === 'PGRST116' ||
        code === '42883' ||
        code === '42P01' ||
        status === 404 ||
        (message.includes('match_memories') && message.includes('not') && message.includes('exist'))
      ) {
        // Function missing or table not in cache yet; treat as no results.
        return [];
      }
      throw error;
    }
    return data || [];
  }

  async updateMemoryScores(
    memoryId: string,
    updates: { importance?: number; narrative_weight?: number },
  ): Promise<void> {
    const { error } = await supabase.from('memories').update(updates).eq('id', memoryId);
    if (error) throw error;
  }

  async insertCommunication(payload: any): Promise<void> {
    const { error } = await supabase.from('agent_communications').insert(payload);
    if (error) throw error;
  }

  async fetchMemoryById(
    memoryId: string,
  ): Promise<{ importance?: number; narrative_weight?: number } | null> {
    const { data, error } = await supabase
      .from('memories')
      .select('importance, narrative_weight')
      .eq('id', memoryId)
      .single();
    if (error) return null;
    return data as { importance?: number; narrative_weight?: number } | null;
  }

  async invokeEmbedding(text: string): Promise<string | null> {
    if (!isSemanticMemoriesEnabled()) {
      if (!hasLoggedSemanticDisabled) {
        logger.debug(
          '[MemoryRepository] Semantic memories disabled; skipping embedding generation.',
        );
        hasLoggedSemanticDisabled = true;
      }
      return null;
    }
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text },
    });
    if (error) return null;
    return (data as any).embedding ?? null;
  }

  async transformDatabaseMemory(dbMemory: any): Promise<EnhancedMemory> {
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
