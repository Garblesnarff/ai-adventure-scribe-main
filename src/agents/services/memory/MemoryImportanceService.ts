import { calculateImportance } from '@/utils/memory/importance';
import { isSemanticMemoriesEnabled } from '@/config/featureFlags';

import { MemoryRepository } from './MemoryRepository';

export class MemoryImportanceService {
  constructor(private repository: MemoryRepository) {}

  public async evaluate(content: string, type: string, category: string) {
    const importance = calculateImportance({ content, type, category });
    if (!isSemanticMemoriesEnabled()) {
      return { importance, embedding: null };
    }
    const embedding = await this.repository.invokeEmbedding(content);
    return { importance, embedding };
  }

  public async embedQuery(content: string): Promise<string | null> {
    if (!isSemanticMemoriesEnabled()) {
      return null;
    }
    return this.repository.invokeEmbedding(content);
  }
}
