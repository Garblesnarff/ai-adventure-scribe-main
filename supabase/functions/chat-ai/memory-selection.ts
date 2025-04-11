import { Memory, MessageContext } from './types.ts';

/**
 * Constants for memory selection configuration
 */
export const MEMORY_WINDOW_SIZE = 10;
export const RECENCY_WEIGHT = 0.4;
export const IMPORTANCE_WEIGHT = 0.3;
export const RELEVANCE_WEIGHT = 0.3;

/**
 * Calculate a composite score for memory selection
 * Combines recency, importance, and relevance to current context
 */
export const calculateMemoryScore = (
  memory: Memory,
  currentContext: MessageContext | null,
  queryEmbedding?: number[] | null
): number => {
  // Recency score (inverse time decay)
  const createdAt = new Date(memory.created_at).getTime();
  const now = Date.now();
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
  const recencyScore = Math.exp(-hoursSinceCreation / 24); // Decay over 24 hours

  // Importance score (normalized)
  const importanceScore = (memory.importance || 0) / 10;

  // Relevance score based on context matching
  let relevanceScore = 0;
  if (currentContext && currentContext.location && 
      memory.content.toLowerCase().includes(currentContext.location.toLowerCase())) {
    relevanceScore += 0.5;
  }
  if (queryEmbedding && memory.embedding) {
    try {
      const embeddingArray = Array.isArray(memory.embedding) 
        ? memory.embedding 
        : JSON.parse(memory.embedding);
      relevanceScore += cosineSimilarity(queryEmbedding, embeddingArray) * 0.5;
    } catch (error) {
      console.error('Error calculating embedding similarity:', error);
    }
  }

  // Calculate weighted composite score
  return (
    recencyScore * RECENCY_WEIGHT +
    importanceScore * IMPORTANCE_WEIGHT +
    relevanceScore * RELEVANCE_WEIGHT
  );
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Select the most relevant memories for the current context
 */
export const selectRelevantMemories = (
  memories: Memory[],
  currentContext: MessageContext | null = null,
  queryEmbedding?: number[] | null,
  windowSize: number = MEMORY_WINDOW_SIZE
): Memory[] => {
  // Score and sort memories
  const scoredMemories = memories.map(memory => ({
    memory,
    score: calculateMemoryScore(memory, currentContext, queryEmbedding)
  }));

  // Sort by score and take top N
  return scoredMemories
    .sort((a, b) => b.score - a.score)
    .slice(0, windowSize)
    .map(({ memory }) => memory);
};