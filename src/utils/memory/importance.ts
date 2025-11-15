import type { Memory } from '@/types/memory';

/**
 * Interface for the factors that contribute to a memory's importance.
 * This allows for a more flexible and extensible importance calculation.
 */
export interface ImportanceFactors {
  content: string;
  type: string;
  ageInHours?: number;
  category?: string;
  metadata?: Record<string, unknown>;
  error?: unknown;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Calculates a comprehensive importance score for a memory based on a variety of factors.
 * This function consolidates logic from multiple parts of the application into a single, canonical source.
 * @param factors - An object containing the factors to consider for the importance calculation.
 * @returns A normalized importance score between 1 and 10.
 */
export const calculateImportance = (factors: ImportanceFactors): number => {
  let score = 0;

  // Base score by type
  switch (factors.type) {
    case 'plot':
    case 'action':
      score += 3;
      break;
    case 'character':
    case 'location':
    case 'dialogue':
    case 'scene_state':
      score += 2;
      break;
    case 'event':
    case 'description':
      score += 1;
      break;
    case 'task_result':
      score += 5; // Default for task results
      break;
    default:
      score += 0;
  }

  // Bonus for category
  if (factors.category) {
    switch (factors.category) {
      case 'player_action':
        score += 2;
        break;
      case 'npc':
      case 'location':
        score += 1;
        break;
    }
  }

  // Content-based factors
  if (factors.content) {
    if (factors.content.length > 200) score += 1;
    if (factors.content.length > 500) score += 1;
    if (factors.content.includes('quest') || factors.content.includes('mission')) score += 1;
    if (factors.content.includes('danger') || factors.content.includes('threat')) score += 1;
    const namedEntities = factors.content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    score += Math.min(2, namedEntities.length);
  }

  // Recency factor
  if (factors.ageInHours !== undefined) {
    if (factors.ageInHours < 1) score += 3;
    else if (factors.ageInHours < 24) score += 2;
    else if (factors.ageInHours < 72) score += 1;
  }

  // Metadata-based factors
  if (
    factors.metadata &&
    typeof (factors.metadata as Record<string, unknown>).significance === 'number'
  ) {
    score += (factors.metadata as Record<string, number>).significance;
  }

  // Task-specific factors
  if (factors.error) {
    score += 2;
  }
  if (factors.priority === 'high') {
    score += 2;
  }

  // Cap final score to be between 1 and 10
  return Math.min(10, Math.max(1, score));
};

/**
 * Sorts memories by importance and then by recency as a tie-breaker.
 * @param memories - Array of memories to sort.
 * @returns A new array of memories sorted by importance and recency.
 */
export const sortMemoriesByImportance = (memories: Memory[]): Memory[] => {
  return [...memories].sort((a, b) => {
    // Primary sort by importance
    const importanceDiff = (b.importance || 0) - (a.importance || 0);
    if (importanceDiff !== 0) {
      return importanceDiff;
    }
    // Secondary sort by recency (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};
