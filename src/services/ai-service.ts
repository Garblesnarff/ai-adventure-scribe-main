import { supabase } from '@/integrations/supabase/client';
import { GeminiApiManager } from './gemini-api-manager';
import { MemoryManager, MemoryContext } from './memory-manager';
import { WorldBuilderService } from './world-builders/world-builder-service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface GameContext {
  campaignId: string;
  characterId: string;
  sessionId?: string;
  campaignDetails?: any;
  characterDetails?: any;
}

export class AIService {
  private static geminiManager: GeminiApiManager | null = null;

  /**
   * Initialize the Gemini API manager (lazy loading)
   */
  private static getGeminiManager(): GeminiApiManager {
    if (!this.geminiManager) {
      try {
        this.geminiManager = new GeminiApiManager();
      } catch (error) {
        console.warn('Failed to initialize Gemini API manager:', error);
        throw error;
      }
    }
    return this.geminiManager;
  }
  /**
   * Generate a campaign description using AI with fallback
   */
  static async generateCampaignDescription(params: {
    genre: string;
    difficulty: string;
    length: string;
    tone: string;
  }): Promise<string> {
    // Skip Edge Function - use local Gemini API directly
    console.log('Using local Gemini API for campaign description...');
    
    try {
      // Use local Gemini API
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        
        const prompt = `Generate a compelling campaign description for a ${params.genre} campaign with ${params.difficulty} difficulty, ${params.length} length, and a ${params.tone} tone. The description should be 2-3 paragraphs long and capture the essence of an exciting D&D adventure.`;
        
        const response = await model.generateContent(prompt);
        const result = await response.response;
        return result.text();
      });
      
      console.log('Successfully generated campaign description using local Gemini API');
      return result;
      
    } catch (geminiError) {
      console.error('Local Gemini API failed:', geminiError);
      throw new Error('Failed to generate campaign description - AI service unavailable');
    }
  }

  /**
   * Simplified chat with AI DM for MVP with fallback and streaming support
   * Uses a single AI call instead of complex agent system
   */
  static async chatWithDM(params: {
    message: string;
    context: GameContext;
    conversationHistory?: ChatMessage[];
    onStream?: (chunk: string) => void;
  }): Promise<string> {
    // Skip Edge Function - use local Gemini API directly
    console.log('Using local Gemini API for chat...');
    
    try {
      // Retrieve relevant memories to enhance context
      let relevantMemories: any[] = [];
      if (params.context.sessionId) {
        try {
          relevantMemories = await MemoryManager.getRelevantMemories(
            params.context.sessionId,
            params.message,
            8 // Get top 8 relevant memories
          );
          console.log(`📚 Retrieved ${relevantMemories.length} relevant memories`);
        } catch (memoryError) {
          console.warn('Failed to retrieve memories:', memoryError);
        }
      }
      
      // Use local Gemini API
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
          
          // Build context for DM
          let contextPrompt = `You are an expert Dungeon Master running a D&D 5e campaign. `;
          
          if (params.context.campaignDetails) {
            contextPrompt += `Campaign: "${params.context.campaignDetails.name}" - ${params.context.campaignDetails.description}. `;
          }
          
          if (params.context.characterDetails) {
            contextPrompt += `Player Character: ${params.context.characterDetails.name}, a level ${params.context.characterDetails.level} ${params.context.characterDetails.race} ${params.context.characterDetails.class}. `;
          }
          
          // Add relevant memories to context
          if (relevantMemories.length > 0) {
            contextPrompt += `\n\nIMPORTANT MEMORIES from this adventure:\n`;
            relevantMemories.forEach((memory, index) => {
              contextPrompt += `${index + 1}. [${memory.type.toUpperCase()}] ${memory.content}\n`;
            });
            contextPrompt += `\nUse these memories to maintain consistency and continuity.\n`;
          }
          
          contextPrompt += `Respond as the DM in an engaging, immersive way. Keep responses 1-3 paragraphs.`;
          
          // Build conversation history
          const messages = [
            { role: 'user', parts: [{ text: contextPrompt }] },
            { role: 'model', parts: [{ text: 'Understood! I\'m ready to be your Dungeon Master.' }] }
          ];
          
          // Add conversation history
          if (params.conversationHistory) {
            params.conversationHistory.forEach(msg => {
              messages.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
              });
            });
          }
          
          const chat = model.startChat({
            history: messages,
            generationConfig: {
              temperature: 0.9,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
          });
          
          // Use streaming if callback provided
          if (params.onStream) {
            const response = await chat.sendMessageStream(params.message);
            let fullResponse = '';
            
            for await (const chunk of response.stream) {
              const chunkText = chunk.text();
              fullResponse += chunkText;
              params.onStream(chunkText);
            }
            
            return fullResponse;
          } else {
            const response = await chat.sendMessage(params.message);
            const result = await response.response;
            return result.text();
          }
        });
        
        console.log('Successfully generated DM response using local Gemini API');
        
        // Extract memories from this conversation exchange
        if (params.context.sessionId) {
          try {
            const memoryContext: MemoryContext = {
              sessionId: params.context.sessionId,
              campaignId: params.context.campaignId,
              characterId: params.context.characterId,
              currentMessage: params.message,
              recentMessages: params.conversationHistory?.slice(-5).map(msg => msg.content) || [],
            };
            
            const extractionResult = await MemoryManager.extractMemories(
              memoryContext,
              params.message,
              result
            );
            
            if (extractionResult.memories.length > 0) {
              await MemoryManager.saveMemories(extractionResult.memories);
              console.log(`🧠 Extracted and saved ${extractionResult.memories.length} memories`);
            }
          } catch (memoryError) {
            console.warn('Memory extraction failed (non-fatal):', memoryError);
          }
          
          // Expand world based on player action and AI response
          try {
            const worldExpansion = await WorldBuilderService.respondToPlayerAction(
              params.context.campaignId,
              params.context.sessionId!,
              params.context.characterId,
              params.message,
              result
            );
            
            if (worldExpansion && worldExpansion.locations.length + worldExpansion.npcs.length + worldExpansion.quests.length > 0) {
              console.log(`🌍 World expanded: +${worldExpansion.locations.length} locations, +${worldExpansion.npcs.length} NPCs, +${worldExpansion.quests.length} quests`);
            }
          } catch (worldError) {
            console.warn('World building failed (non-fatal):', worldError);
          }
        }
        
        return result;
        
    } catch (geminiError) {
      console.error('Local Gemini API failed:', geminiError);
      throw new Error('Failed to get DM response - AI service unavailable');
    }
  }

  /**
   * Save a chat message to the database
   */
  static async saveChatMessage(params: {
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    speakerId?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('dialogue_history')
        .insert({
          session_id: params.sessionId,
          speaker_type: params.role,
          speaker_id: params.speakerId,
          message: params.content,
        });

      if (error) {
        console.error('Error saving chat message:', error);
        throw new Error('Failed to save chat message');
      }
    } catch (error) {
      console.error('Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a session
   */
  static async getConversationHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('dialogue_history')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error getting conversation history:', error);
        throw new Error('Failed to get conversation history');
      }

      return data.map(msg => ({
        id: msg.id,
        role: msg.speaker_type as 'user' | 'assistant',
        content: msg.message,
        timestamp: new Date(msg.created_at),
      }));
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  /**
   * Generate an opening message for a new campaign session
   * Creates an engaging introduction based on campaign and character context
   */
  static async generateOpeningMessage(params: {
    context: GameContext;
  }): Promise<string> {
    console.log('Generating opening message for new session...');
    
    try {
      // Use local Gemini API
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        
        // Build context for opening message
        let contextPrompt = `You are an expert Dungeon Master starting a new D&D 5e adventure. Create an engaging opening scene that introduces the player to their adventure.`;
        
        if (params.context.campaignDetails) {
          contextPrompt += `\n\nCAMPAIGN CONTEXT:\nTitle: "${params.context.campaignDetails.name}"\nDescription: ${params.context.campaignDetails.description}`;
        }
        
        if (params.context.characterDetails) {
          const char = params.context.characterDetails;
          contextPrompt += `\n\nPLAYER CHARACTER:\nName: ${char.name}\nRace: ${char.race}\nClass: ${char.class}\nLevel: ${char.level}`;
          if (char.background) {
            contextPrompt += `\nBackground: ${char.background}`;
          }
          if (char.description) {
            contextPrompt += `\nDescription: ${char.description}`;
          }
        }
        
        contextPrompt += `\n\nCreate an opening scene that:
1. Sets the mood and atmosphere of the campaign
2. Introduces the character's starting situation
3. Provides clear context for where they are and why
4. Includes sensory details (what they see, hear, feel)
5. Ends with a clear prompt for the player to take action
6. Is 2-3 paragraphs long
7. Speaks directly to the player using "you" perspective

Make it immersive, engaging, and true to the campaign's tone. Don't wait for the player to ask - dive right into the adventure!`;
        
        const response = await model.generateContent(contextPrompt);
        const result = await response.response;
        return result.text();
      });
      
      console.log('Successfully generated opening message');
      return result;
      
    } catch (error) {
      console.error('Failed to generate opening message:', error);
      // Fallback generic opening
      return `Welcome to your adventure! You find yourself at the beginning of an epic journey. Your character stands ready to face whatever challenges lie ahead. What would you like to do?`;
    }
  }

  /**
   * Get Gemini API manager statistics (for debugging)
   */
  static getApiStats(): any {
    try {
      const manager = this.getGeminiManager();
      return {
        currentKey: manager.getCurrentKeyInfo(),
        allKeyStats: manager.getStats(),
        rateLimits: manager.getRateLimitStats(),
      };
    } catch (error) {
      return { error: 'Gemini API manager not available' };
    }
  }
}