/**
 * Memory Manager
 * 
 * This file defines the MemoryManager class, primarily responsible for loading
 * recent memories for a given game session from the Supabase database.
 * 
 * Main Class:
 * - MemoryManager: Loads recent memories.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - Memory types from `@/components/game/memory/types`.
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Types
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