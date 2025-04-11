import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Memory, MemoryContext, MessageContext } from './types.ts';
import { MEMORY_WINDOW_SIZE, selectRelevantMemories } from './memory-selection.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Fetches relevant memories using vector similarity search and context window
 */
export async function fetchRelevantMemories(
  sessionId: string, 
  context: any,
  queryEmbedding?: number[]
): Promise<Memory[]> {
  try {
    const { data: memories, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('importance', { ascending: false });

    if (error) {
      console.error('Error fetching memories:', error);
      throw error;
    }
    
    // Apply memory window selection
    let scoredMemories = memories.map(memory => ({
      memory,
      score: calculateMemoryScore(memory, context, queryEmbedding)
    }));
    
    // Sort by score and return top memories within window
    scoredMemories.sort((a, b) => b.score - a.score);
    return scoredMemories.slice(0, MEMORY_WINDOW_SIZE).map(m => m.memory);
  } catch (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
}

/**
 * Calculates memory relevance score based on context, importance, and semantic similarity
 */
export function calculateMemoryRelevance(
  memory: Memory, 
  context: any,
  queryEmbedding?: number[]
): number {
  let score = memory.importance || 0;
  
  // Context matching boost
  if (context.location && memory.content.toLowerCase().includes(context.location.toLowerCase())) {
    score += 2;
  }
  if (context.emotion && memory.content.toLowerCase().includes(context.emotion.toLowerCase())) {
    score += 1;
  }
  
  // Semantic similarity if embeddings are available
  if (queryEmbedding && memory.embedding) {
    try {
      const embeddingArray = typeof memory.embedding === 'string' 
        ? JSON.parse(memory.embedding) 
        : memory.embedding;
      const similarity = cosineSimilarity(queryEmbedding, embeddingArray);
      score += similarity * 3; // Weight semantic similarity highly
    } catch (error) {
      console.error('Error calculating semantic similarity:', error);
    }
  }
  
  // Time decay factor - memories become less relevant over time
  const createdAt = new Date(memory.created_at).getTime();
  const now = Date.now();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
  const timeFactor = Math.exp(-hoursSinceCreation / 24); // Decay over 24 hours
  
  return score * timeFactor;
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
 * Formats selected memories into a context string for the AI
 * Now includes metadata about memory selection
 */
export function formatMemoryContext(memories: MemoryContext[]): string {
  if (!memories.length) return '';
  
  const formattedMemories = memories
    .map(m => `[${m.memory.type.toUpperCase()}] (Relevance: ${m.relevanceScore.toFixed(2)}, Importance: ${m.memory.importance}) ${m.memory.content}`)
    .join('\n');
    
  return `\nRelevant context from previous interactions (${memories.length} most relevant memories):\n${formattedMemories}\n`;
}

/**
 * Calculate memory score for selection
 */
function calculateMemoryScore(
  memory: Memory, 
  context: any,
  queryEmbedding?: number[]
): number {
  // Recency score
  const createdAt = new Date(memory.created_at).getTime();
  const now = Date.now();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
  const recencyScore = Math.exp(-hoursSinceCreation / 24);

  // Importance and relevance from existing function
  const baseScore = calculateMemoryRelevance(memory, context, queryEmbedding);
  
  // Combine scores (weighted average)
  return (recencyScore * 0.4) + (baseScore * 0.6);
}
