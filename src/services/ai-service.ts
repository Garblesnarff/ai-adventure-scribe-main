import { supabase } from '@/integrations/supabase/client';
import { GeminiApiManager } from './gemini-api-manager';

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
    try {
      // Try Supabase Edge Function first
      const { data, error } = await supabase.functions.invoke('generate-campaign-description', {
        body: params,
      });

      if (error) {
        console.warn('Edge Function failed, trying local Gemini API:', error);
        throw new Error('Edge Function failed');
      }

      return data.description;
      
    } catch (edgeFunctionError) {
      console.log('Falling back to local Gemini API for campaign description...');
      
      try {
        // Fallback to local Gemini API
        const geminiManager = this.getGeminiManager();
        
        const result = await geminiManager.executeWithRotation(async (genAI) => {
          const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
          
          const prompt = `Generate a compelling campaign description for a ${params.genre} campaign with ${params.difficulty} difficulty, ${params.length} length, and a ${params.tone} tone. The description should be 2-3 paragraphs long and capture the essence of an exciting D&D adventure.`;
          
          const response = await model.generateContent(prompt);
          const result = await response.response;
          return result.text();
        });
        
        console.log('Successfully generated campaign description using local Gemini API');
        return result;
        
      } catch (geminiError) {
        console.error('Both Edge Function and local Gemini API failed:', geminiError);
        throw new Error('Failed to generate campaign description - all AI services unavailable');
      }
    }
  }

  /**
   * Simplified chat with AI DM for MVP with fallback
   * Uses a single AI call instead of complex agent system
   */
  static async chatWithDM(params: {
    message: string;
    context: GameContext;
    conversationHistory?: ChatMessage[];
  }): Promise<string> {
    try {
      // Try Supabase Edge Function first
      const aiContext = {
        message: params.message,
        campaignId: params.context.campaignId,
        characterId: params.context.characterId,
        sessionId: params.context.sessionId,
        conversationHistory: params.conversationHistory || [],
        campaignDetails: params.context.campaignDetails,
        characterDetails: params.context.characterDetails,
      };

      const { data, error } = await supabase.functions.invoke('chat-ai', {
        body: aiContext,
      });

      if (error) {
        console.warn('Edge Function failed, trying local Gemini API:', error);
        throw new Error('Edge Function failed');
      }

      return data.response;
      
    } catch (edgeFunctionError) {
      console.log('Falling back to local Gemini API for chat...');
      
      try {
        // Fallback to local Gemini API
        const geminiManager = this.getGeminiManager();
        
        const result = await geminiManager.executeWithRotation(async (genAI) => {
          const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
          
          // Build context for DM
          let contextPrompt = `You are an expert Dungeon Master running a D&D 5e campaign. `;
          
          if (params.context.campaignDetails) {
            contextPrompt += `Campaign: "${params.context.campaignDetails.name}" - ${params.context.campaignDetails.description}. `;
          }
          
          if (params.context.characterDetails) {
            contextPrompt += `Player Character: ${params.context.characterDetails.name}, a level ${params.context.characterDetails.level} ${params.context.characterDetails.race} ${params.context.characterDetails.class}. `;
          }
          
          contextPrompt += `Respond as the DM in an engaging, immersive way. Keep responses 1-3 paragraphs.`;
          
          // Build conversation history
          const messages = [
            { role: 'user', parts: contextPrompt },
            { role: 'model', parts: 'Understood! I\'m ready to be your Dungeon Master.' }
          ];
          
          // Add conversation history
          if (params.conversationHistory) {
            params.conversationHistory.forEach(msg => {
              messages.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: msg.content
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
          
          const response = await chat.sendMessage(params.message);
          const result = await response.response;
          return result.text();
        });
        
        console.log('Successfully generated DM response using local Gemini API');
        return result;
        
      } catch (geminiError) {
        console.error('Both Edge Function and local Gemini API failed:', geminiError);
        throw new Error('Failed to get DM response - all AI services unavailable');
      }
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
   * Get Gemini API manager statistics (for debugging)
   */
  static getApiStats(): any {
    try {
      const manager = this.getGeminiManager();
      return {
        currentKey: manager.getCurrentKeyInfo(),
        allKeyStats: manager.getStats(),
      };
    } catch (error) {
      return { error: 'Gemini API manager not available' };
    }
  }
}