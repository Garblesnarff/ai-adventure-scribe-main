import { supabase } from '@/integrations/supabase/client';
import { Memory, isValidMemoryType } from '@/components/game/memory/types';

export class MemoryManager {
  async loadRecentMemories(sessionId: string): Promise<Memory[]> {
    const { data: memories, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    
    return (memories || []).map(memory => ({
      id: memory.id,
      type: isValidMemoryType(memory.type) ? memory.type : 'general',
      content: memory.content,
      importance: memory.importance || 0,
      embedding: memory.embedding,
      metadata: memory.metadata || {},
      created_at: memory.created_at,
      session_id: memory.session_id,
      updated_at: memory.updated_at
    }));
  }
}