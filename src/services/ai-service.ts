import { supabase } from '@/integrations/supabase/client';

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
  /**
   * Generate a campaign description using AI
   */
  static async generateCampaignDescription(params: {
    genre: string;
    difficulty: string;
    length: string;
    tone: string;
  }): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-description', {
        body: params,
      });

      if (error) {
        console.error('Error generating campaign description:', error);
        throw new Error('Failed to generate campaign description');
      }

      return data.description;
    } catch (error) {
      console.error('AI Service error:', error);
      throw new Error('Failed to generate campaign description');
    }
  }

  /**
   * Simplified chat with AI DM for MVP
   * Uses a single AI call instead of complex agent system
   */
  static async chatWithDM(params: {
    message: string;
    context: GameContext;
    conversationHistory?: ChatMessage[];
  }): Promise<string> {
    try {
      // Prepare context for AI
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
        console.error('Error chatting with DM:', error);
        throw new Error('Failed to get response from DM');
      }

      return data.response;
    } catch (error) {
      console.error('AI Service chat error:', error);
      throw new Error('Failed to chat with DM');
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
}