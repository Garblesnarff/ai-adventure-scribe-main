import { getGeminiApiManager } from '@/services/gemini-api-manager-singleton';
import type { GeminiApiManager } from '@/services/gemini-api-manager';
import { GEMINI_TEXT_MODEL } from '@/config/ai';

import type {
  Memory as UIMemory,
  MemoryType as UIMemoryType,
} from '@/components/game/memory/types';
import type { EnhancedMemory, MemoryQueryOptions } from '@/types/memory';

import { MemoryImportanceService } from './MemoryImportanceService';
import { MemoryRepository } from './MemoryRepository';
import { SceneStateTracker } from './SceneStateTracker';

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

const repository = new MemoryRepository();
const importanceService = new MemoryImportanceService(repository);

export class MemoryService {
  // ===== Static utilities (shared) =====
  private static getGeminiManager(): GeminiApiManager {
    return getGeminiApiManager();
  }

  static async generateEmbedding(content: string): Promise<string | null> {
    return importanceService.embedQuery(content);
  }

  static async saveMemories(
    memories: Array<Omit<Memory, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<void> {
    if (!memories?.length) return;
    const toInsert = await Promise.all(
      memories.map(async (m) => {
        const rawImportance = (m as unknown as Record<string, unknown>).importance;
        const type = (m as unknown as Record<string, unknown>).type ?? 'general';
        const category = (m as unknown as Record<string, unknown>).category ?? 'general';
        const evaluated = await importanceService.evaluate(
          m.content,
          String(type),
          String(category),
        );
        const importance = typeof rawImportance === 'number' ? rawImportance : evaluated.importance;
        return {
          ...m,
          importance: Math.max(1, Math.min(5, importance)),
          embedding: evaluated.embedding,
        };
      }),
    );
    await repository.insertMemories(toInsert as Array<Record<string, any>>);
  }

  static async getRelevantMemories(
    sessionId: string,
    query: string,
    limit = 10,
  ): Promise<Memory[]> {
    const queryEmbedding = await importanceService.embedQuery(query);
    if (queryEmbedding) {
      const matches = await repository.matchMemories(sessionId, queryEmbedding, limit, 0.7);
      if (matches.length) return matches as Memory[];
    }
    return repository.loadTopMemories(sessionId, limit);
  }

  static async getFictionReadyMemories(
    sessionId: string,
    minNarrativeWeight = 6,
  ): Promise<Memory[]> {
    return repository.loadFictionReadyMemories(sessionId, minNarrativeWeight);
  }

  static async reinforceMemory(memoryId: string, boost = 1): Promise<void> {
    const original = await repository.fetchMemoryById(memoryId);
    if (!original) return;

    const importance = Math.min((original.importance || 1) + boost, 5);
    const narrativeWeight = Math.min((original.narrative_weight || 0) + boost, 10);
    await repository.updateMemoryScores(memoryId, {
      importance,
      narrative_weight: narrativeWeight,
    });
  }

  static async extractMemories(
    context: MemoryContext,
    userMessage: string,
    aiResponse: string,
  ): Promise<MemoryExtractionResult> {
    try {
      const geminiManager = MemoryService.getGeminiManager();
      return await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
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
    return repository.loadRecentMemories(sessionId);
  }

  // ===== Instance API (session-scoped) =====
  private sessionId: string;
  private sceneTracker: SceneStateTracker;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.sceneTracker = new SceneStateTracker();
  }

  async storeMemory(
    content: string,
    type: EnhancedMemory['type'],
    category: EnhancedMemory['category'],
    context: Partial<EnhancedMemory['context']> = {},
  ): Promise<void> {
    const { importance, embedding } = await importanceService.evaluate(content, type, category);
    const metadata = {
      category,
      context: JSON.stringify({ ...context, sceneState: this.sceneTracker.snapshot() }),
      timestamp: new Date().toISOString(),
    };
    await repository.insertMemories([
      {
        session_id: this.sessionId,
        type,
        content,
        importance,
        metadata,
        embedding,
      },
    ]);

    this.sceneTracker.updateFromMemory({
      type,
      content,
      context,
      category,
      importance,
      metadata,
    } as Partial<EnhancedMemory>);
  }

  async retrieveMemories(options: MemoryQueryOptions = {}): Promise<EnhancedMemory[]> {
    if (options.query && options.semanticSearch) {
      return this.semanticSearch(options.query, options);
    }
    const data = await repository.fetchMemories(this.sessionId, options);
    return Promise.all(data.map((item) => repository.transformDatabaseMemory(item)));
  }

  private async semanticSearch(
    query: string,
    options: MemoryQueryOptions,
  ): Promise<EnhancedMemory[]> {
    const queryEmbedding = await importanceService.embedQuery(query);
    if (!queryEmbedding) {
      return this.retrieveMemories({ ...options, semanticSearch: false });
    }
    const data = await repository.matchMemories(
      this.sessionId,
      queryEmbedding,
      options.limit || 10,
      0.7,
    );
    return Promise.all(data.map((item: any) => repository.transformDatabaseMemory(item)));
  }
}
