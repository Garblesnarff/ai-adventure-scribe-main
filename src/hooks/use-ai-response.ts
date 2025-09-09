// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Project Hooks
import { useToast } from '@/hooks/use-toast';

// Project Utilities
import { selectRelevantMemories } from '@/utils/memorySelection';

// Project Services
import { voiceConsistencyService } from '@/services/voice-consistency-service';

// Project Types
import { Memory, isValidMemoryType, isValidMemorySubcategory } from '@/components/game/memory/types';
import { ChatMessage } from '@/types/game';

// Voice narration types
export interface NarrationSegment {
  type: 'narration' | 'dialogue' | 'action' | 'thought' | 'dm' | 'character';
  text: string;
  character?: string;
  voice_category?: string;
}

export interface StructuredAIResponse {
  response: string;
  narration_segments?: NarrationSegment[];
}

export interface EnhancedChatMessage extends ChatMessage {
  narrationSegments?: NarrationSegment[];
}


/**
 * useAIResponse Hook
 * 
 * Handles AI response generation with memory context window.
 * Formats tasks, fetches game context, and calls the DM Agent.
 * 
 * Dependencies:
 * - Supabase client (src/integrations/supabase/client.ts)
 * - Toast hook (src/hooks/use-toast.ts)
 * - Memory selection utils (src/utils/memorySelection.ts)
 * - ChatMessage and Memory types (src/types/game.ts, src/components/game/memory/types.ts)
 * 
 * @author AI Dungeon Master Team
 */
export const useAIResponse = () => {
  const { toast } = useToast();

  /**
   * Formats chat messages into a task object for the DM Agent.
   * 
   * @param {ChatMessage[]} messages - The full message history
   * @param {ChatMessage} latestMessage - The latest player message
   * @returns {object} The formatted task object
   */
  const formatDMTask = (messages: ChatMessage[], latestMessage: ChatMessage) => {
    return {
      id: `task_${Date.now()}`,
      description: `Respond to player message: ${latestMessage.text}`,
      expectedOutput: 'D&D appropriate response with game context',
      context: {
        messageHistory: messages,
        playerIntent: latestMessage.context?.intent || 'query',
        playerEmotion: latestMessage.context?.emotion || 'neutral'
      }
    };
  };

  /**
   * Fetches campaign and character details for the DM Agent context.
   * 
   * @param {string} sessionId - The session ID
   * @returns {Promise<{campaign: any, character: any} | null>} The game context or null if failed
   */
  const fetchGameContext = async (sessionId: string): Promise<{campaign: any, character: any} | null> => {
    try {
      console.log('Fetching game session details for:', sessionId);
      
      // Get game session with campaign and character details using JOIN
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select(`
          *,
          campaigns:campaign_id (*),
          characters:character_id (*)
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return null;
      }

      if (!sessionData?.campaign_id || !sessionData?.character_id) {
        console.error('No campaign or character IDs found in session');
        return null;
      }

      return {
        campaign: sessionData.campaigns,
        character: sessionData.characters
      };
    } catch (error) {
      console.error('Error in fetchGameContext:', error);
      return null;
    }
  };

  /**
   * Calls the DM Agent to generate a response based on chat history and game context.
   * Now handles structured responses with narration segments for voice synthesis.
   * 
   * @param {ChatMessage[]} messages - The full message history
   * @param {string} sessionId - The session ID
   * @returns {Promise<EnhancedChatMessage>} The generated AI response with optional narration segments
   * @throws {Error} If the DM Agent call fails
   */
  const getAIResponse = async (messages: ChatMessage[], sessionId: string): Promise<EnhancedChatMessage> => {
    try {
      console.log('Getting AI response for session:', sessionId);

      // Get latest message context
      const latestMessage = messages[messages.length - 1];
      
      // Detect if this is the first player message in the session
      const isFirstMessage = messages.filter(m => m.sender === 'player').length <= 1;
      
      // Fetch campaign and character context
      const gameContext = await fetchGameContext(sessionId);
      
      if (!gameContext) {
        throw new Error('Failed to fetch game context');
      }

      // Get voice context for consistent character voices
      const voiceContext = await voiceConsistencyService.getSessionVoiceContext(sessionId);

      // Fetch and select relevant memories
      const { data: memoriesData } = await supabase
        .from('memories')
        .select('*')
        .eq('session_id', sessionId);

      // Validate and transform memories
      const memories: Memory[] = (memoriesData || [])
        .filter(memory => memory.created_at && memory.updated_at) // Filter out incomplete records
        .map((memory): Memory => {
          if (!isValidMemoryType(memory.type)) {
            console.warn(`[Memory] Invalid memory type detected: ${memory.type}, defaulting to 'general'`);
            memory.type = 'general';
          }
          
          // Handle subcategory validation and conversion
          let subcategory: Memory['subcategory'] = undefined;
          if (memory.subcategory && isValidMemorySubcategory(memory.subcategory)) {
            subcategory = memory.subcategory;
          }
          
          return {
            id: memory.id,
            type: isValidMemoryType(memory.type) ? memory.type : 'general',
            subcategory,
            content: memory.content,
            importance: memory.importance ?? 1, // Default importance if null
            embedding: memory.embedding,
            metadata: memory.metadata,
            created_at: memory.created_at!, // We filtered for non-null above
            session_id: memory.session_id,
            updated_at: memory.updated_at!, // We filtered for non-null above
            context_id: memory.context_id || undefined,
            related_memories: memory.related_memories || undefined,
            tags: memory.tags || undefined
          };
        });

      const selectedMemories = selectRelevantMemories(memories, latestMessage.context);

      console.log('Calling DM Agent with context:', {
        gameContext,
        selectedMemories: selectedMemories.length,
        knownCharacters: Object.keys(voiceContext.knownCharacters).length,
        isFirstMessage: isFirstMessage
      });

      // Call DM Agent through edge function
      const { data, error } = await supabase.functions.invoke('dm-agent-execute', {
        body: {
          task: formatDMTask(messages, latestMessage),
          agentContext: {
            role: 'Dungeon Master',
            goal: 'Guide players through an engaging D&D campaign',
            backstory: 'An experienced DM with vast knowledge of D&D rules',
            campaignDetails: gameContext.campaign,
            characterDetails: gameContext.character,
            memories: selectedMemories
          },
          voiceContext: {
            available_categories: voiceContext.availableVoiceCategories,
            character_mappings: voiceContext.knownCharacters
          },
          isFirstMessage: isFirstMessage
        }
      });

      if (error) {
        console.error('DM Agent error:', error);
        throw error;
      }

      // Handle response format - Edge Function now returns text and narrationSegments directly
      let responseText: string;
      let narrationSegments: NarrationSegment[] | undefined;

      // Check if Edge Function returned narration segments (new structured format)
      if (data.narrationSegments && Array.isArray(data.narrationSegments) && data.narrationSegments.length > 0) {
        responseText = data.response;
        narrationSegments = data.narrationSegments;
        console.log('🎭 Received structured response with', narrationSegments.length, 'narration segments');
        
        // Process voice assignments for the segments
        try {
          await voiceConsistencyService.processVoiceAssignments(sessionId, narrationSegments);
          console.log('✅ Processed voice assignments successfully');
        } catch (voiceError) {
          console.warn('Warning: Failed to process voice assignments:', voiceError);
          // Don't fail the entire response for voice processing errors
        }
      } else if (typeof data.response === 'string') {
        // Legacy response format - just text
        responseText = data.response;
        console.log('📝 Received legacy text response');
      } else {
        // Fallback for unexpected response format
        responseText = String(data.response || data || 'I apologize, but I encountered an issue generating a response.');
        console.warn('⚠️ Unexpected response format, using fallback');
      }

      // Format the response as an EnhancedChatMessage
      return {
        text: responseText,
        sender: 'dm',
        context: {
          emotion: 'neutral',
          intent: 'response',
        },
        narrationSegments: narrationSegments
      };
    } catch (error) {
      console.error('Error in getAIResponse:', error);
      throw error;
    }
  };

  return { getAIResponse };
};
