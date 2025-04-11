/**
 * Calculates importance score for a memory based on various factors
 * @param content - Memory content
 * @param age - Age of memory in hours
 * @param type - Type of memory
 * @returns Importance score between 1-10
 */
export const calculateImportance = (
  content: string,
  age: number,
  type: string
): number => {
  let score = 0;

  // Base score by type
  switch (type) {
    case 'plot':
      score += 3;
      break;
    case 'character':
      score += 2;
      break;
    case 'location':
      score += 2;
      break;
    case 'event':
      score += 1;
      break;
    default:
      score += 0;
  }

  // Content length factor
  if (content.length > 200) score += 1;
  if (content.length > 500) score += 1;

  // Recency factor
  if (age < 1) score += 3;
  else if (age < 24) score += 2;
  else if (age < 72) score += 1;

  // Named entity bonus
  const namedEntities = content.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  score += Math.min(2, namedEntities.length);

  // Cap final score
  return Math.min(10, Math.max(1, score));
};

/**
 * Sorts memories by importance and recency
 * @param memories - Array of memories to sort
 * @returns Sorted array of memories
 */
export const sortMemoriesByImportance = (memories: any[]): any[] => {
  return [...memories].sort((a, b) => {
    // Primary sort by importance
    const importanceDiff = (b.importance || 0) - (a.importance || 0);
    if (importanceDiff !== 0) return importanceDiff;

    // Secondary sort by recency
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};