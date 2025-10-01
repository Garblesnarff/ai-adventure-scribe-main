import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Memory, MessageContext } from './types.ts';
import { selectRelevantMemories } from '@/utils/memory/selection.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetches relevant memories by retrieving all memories for a session
 * and then using the canonical selection function to score and rank them.
 */
export async function fetchRelevantMemories(
  sessionId: string,
  context: MessageContext | null,
  queryEmbedding?: number[]
): Promise<Memory[]> {
  try {
    const { data: memories, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error fetching memories:', error);
      throw error;
    }

    if (!memories) {
      return [];
    }

    // Use the canonical memory selection logic
    return selectRelevantMemories(memories, context, queryEmbedding);
  } catch (error) {
    console.error('Error in fetchRelevantMemories:', error);
    return [];
  }
}

/**
 * Updates memory importance based on AI response and usage
 */
export async function updateMemoryImportance(memories: Memory[], aiResponse: string): Promise<void> {
  try {
    for (const memory of memories) {
      // Increase importance if the memory was referenced in the response
      if (aiResponse.toLowerCase().includes(memory.content.toLowerCase())) {
        const newImportance = Math.min((memory.importance || 0) + 1, 10);

        const { error } = await supabase
          .from('memories')
          .update({ importance: newImportance })
          .eq('id', memory.id);

        if (error) throw error;
      }
    }
  } catch (error) {
    console.error('Error updating memory importance:', error);
  }
}

/**
 * Formats selected memories into a context string for the AI.
 * This version is simplified as relevance score is now an internal detail of the selection process.
 */
export function formatMemoryContext(memories: Memory[]): string {
    if (!memories || memories.length === 0) return '';

    const formattedMemories = memories
      .map(m => `[${m.type.toUpperCase()}] (Importance: ${m.importance}) ${m.content}`)
      .join('\n');

    return `\nRelevant context from previous interactions (${memories.length} most relevant memories):\n${formattedMemories}\n`;
}