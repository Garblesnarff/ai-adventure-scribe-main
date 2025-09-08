import { supabase } from '@/integrations/supabase/client';
import { GeminiApiManager } from './gemini-api-manager';

export interface Memory {
  id: string;
  session_id: string;
  type: MemoryType;
  category?: string;
  content: string;
  importance: number;
  emotional_tone?: string;
  metadata?: any;
  embedding?: string;
  created_at: string;
  updated_at: string;
}

export type MemoryType = 
  | 'general' | 'npc' | 'location' | 'quest' | 'item' | 'event'
  | 'story_beat' | 'character_moment' | 'world_detail' | 'dialogue_gem'
  | 'atmosphere' | 'plot_point' | 'foreshadowing';

export interface MemoryExtractionResult {
  memories: Omit<Memory, 'id' | 'created_at' | 'updated_at'>[];
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

export class MemoryManager {
  private static geminiManager: GeminiApiManager | null = null;

  private static getGeminiManager(): GeminiApiManager {
    if (!this.geminiManager) {
      this.geminiManager = new GeminiApiManager();
    }
    return this.geminiManager;
  }

  /**
   * Extract memories from a conversation exchange
   */
  static async extractMemories(
    context: MemoryContext,
    userMessage: string,
    aiResponse: string
  ): Promise<MemoryExtractionResult> {
    try {
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        
        const extractionPrompt = `
You are a memory extraction system for a D&D campaign. Extract important memories from this conversation exchange.

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
}

GUIDELINES:
- Only extract truly important/memorable moments
- Focus on: character names, key decisions, plot developments, emotional moments, world details
- Skip mundane interactions unless they reveal character
- PRESERVE important direct dialogue in quotes - examples: 'dialogue_gem' type for memorable NPC quotes
- For dialogue memories, include the speaker and context: "Guard Captain: 'The king has been murdered!'"
- Prioritize memorable quotes that reveal character personality or advance plot
- Set prose_quality=true for exceptionally well-written passages
- Set higher narrative_weight for story-critical moments
- Use specific categories (NPC names, location names, quest names)
- Keep content concise but descriptive`;

        const response = await model.generateContent(extractionPrompt);
        const text = await response.response.text();
        
        try {
          // Extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.warn('No JSON found in memory extraction response');
            return { memories: [] };
          }
          
          const extracted = JSON.parse(jsonMatch[0]);
          return extracted as MemoryExtractionResult;
        } catch (parseError) {
          console.error('Failed to parse memory extraction JSON:', parseError);
          return { memories: [] };
        }
      });

      return result;
    } catch (error) {
      console.error('Memory extraction failed:', error);
      return { memories: [] };
    }
  }

  /**
   * Save memories to the database
   */
  static async saveMemories(memories: Omit<Memory, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
    if (memories.length === 0) return;

    try {
      const { error } = await supabase
        .from('memories')
        .insert(memories.map(memory => ({
          ...memory,
          importance: Math.max(1, Math.min(5, memory.importance || 1)), // Ensure importance is between 1-5
          embedding: null, // TODO: Generate embeddings
        })));

      if (error) {
        console.error('Error saving memories:', error);
        throw new Error('Failed to save memories');
      }

      console.log(`✅ Saved ${memories.length} memories`);
    } catch (error) {
      console.error('Error saving memories:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant memories for context
   */
  static async getRelevantMemories(
    sessionId: string,
    query: string,
    limit: number = 10
  ): Promise<Memory[]> {
    try {
      // For now, simple retrieval by importance and recency
      // TODO: Implement semantic search with embeddings
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', sessionId)
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching memories:', error);
        throw error;
      }

      return data as Memory[];
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return [];
    }
  }

  /**
   * Get memories by story arc
   */
  static async getMemoriesByStoryArc(
    sessionId: string,
    storyArc: string
  ): Promise<Memory[]> {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', sessionId)
        .eq('story_arc', storyArc)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Memory[];
    } catch (error) {
      console.error('Error fetching story arc memories:', error);
      return [];
    }
  }

  /**
   * Get fiction-ready memories for story generation
   */
  static async getFictionReadyMemories(
    sessionId: string,
    minNarrativeWeight: number = 6
  ): Promise<Memory[]> {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', sessionId)
        .gte('narrative_weight', minNarrativeWeight)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Memory[];
    } catch (error) {
      console.error('Error fetching fiction-ready memories:', error);
      return [];
    }
  }

  /**
   * Update memory importance based on usage
   */
  static async reinforceMemory(memoryId: string, boost: number = 1): Promise<void> {
    try {
      // Get current memory
      const { data: memory, error: fetchError } = await supabase
        .from('memories')
        .select('importance, narrative_weight')
        .eq('id', memoryId)
        .single();

      if (fetchError || !memory) {
        console.error('Error fetching memory for reinforcement:', fetchError);
        return;
      }

      // Boost importance and narrative weight
      const newImportance = Math.min((memory.importance || 1) + boost, 5);
      const newNarrativeWeight = Math.min((memory.narrative_weight || 0) + boost, 10);

      const { error: updateError } = await supabase
        .from('memories')
        .update({ 
          importance: newImportance,
          narrative_weight: newNarrativeWeight 
        })
        .eq('id', memoryId);

      if (updateError) {
        console.error('Error reinforcing memory:', updateError);
      }
    } catch (error) {
      console.error('Error reinforcing memory:', error);
    }
  }
}