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
        
        const prompt = `Create an engaging D&D 5e campaign description that hooks players immediately and sets up an epic adventure.

**Campaign Parameters:**
- Genre: ${params.genre}
- Difficulty: ${params.difficulty}
- Expected Length: ${params.length}
- Tone: ${params.tone}

**Requirements:**
1. **Hook**: Start with a compelling central mystery, threat, or opportunity that demands heroes
2. **Stakes**: Make it clear what happens if the heroes don't act (people die, world ends, etc.)
3. **Unique Elements**: Include distinctive locations, NPCs, or plot devices that make this campaign memorable
4. **Player Agency**: Hint at meaningful choices and multiple approaches to challenges
5. **World Integration**: Suggest how character backgrounds might connect to the plot
6. **Adventure Potential**: Indicate specific types of encounters (exploration, political intrigue, combat, puzzles)

**Tone Guidelines:**
- ${params.tone === 'dark' ? 'Emphasize moral dilemmas, harsh consequences, and atmospheric dread. Heroes face difficult choices with no clear "right" answer.' : ''}
- ${params.tone === 'heroic' ? 'Focus on noble quests, clear good vs evil, and inspiring moments. Heroes are destined for greatness and legendary deeds.' : ''}
- ${params.tone === 'comedic' ? 'Include absurd situations, witty NPCs, and opportunities for humor. Serious threats exist but approached with levity.' : ''}
- ${params.tone === 'mysterious' ? 'Layer in secrets, hidden agendas, and puzzles to solve. Nothing is quite what it seems on the surface.' : ''}
- ${params.tone === 'gritty' ? 'Realistic consequences, resource management, and survival elements. Combat is dangerous and magic is rare.' : ''}

**Structure:**
- **Paragraph 1**: The central hook and immediate threat/opportunity
- **Paragraph 2**: The unique world elements, key NPCs, and what makes this adventure special
- **Paragraph 3**: What players can expect - types of challenges, character integration, and why this matters

Create a campaign description that makes players say "I want to play in this world right now!"`;  
        
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
          
          // Build enhanced context for DM interactions
          let contextPrompt = `You are a skilled D&D 5e Dungeon Master who creates immersive, mechanically-sound adventures. You balance compelling narrative with proper game mechanics, always giving players meaningful choices with clear consequences.`;
          
          if (params.context.campaignDetails) {
            contextPrompt += `\n\nCAMPAIGN: "${params.context.campaignDetails.name}" - ${params.context.campaignDetails.description}`;
          }
          
          if (params.context.characterDetails) {
            const char = params.context.characterDetails;
            contextPrompt += `\n\nPLAYER CHARACTER: ${char.name}, a level ${char.level} ${char.race} ${char.class}`;
            if (char.background) {
              contextPrompt += ` (${char.background} background)`;
            }
            contextPrompt += `.`;
          }
          
          // Add relevant memories to context
          if (relevantMemories.length > 0) {
            contextPrompt += `\n\nIMPORTANT STORY MEMORIES:\n`;
            relevantMemories.forEach((memory, index) => {
              contextPrompt += `${index + 1}. [${memory.type.toUpperCase()}] ${memory.content}\n`;
            });
            contextPrompt += `\nReference these memories naturally to maintain story continuity.`;
          }
          
          contextPrompt += `\n\nDM RESPONSE GUIDELINES:
**Core Principles:**
- Respond to the player's action with clear consequences and vivid descriptions
- Use D&D 5e mechanics when appropriate (ask for ability checks, saving throws, attacks)
- Always provide 2-3 meaningful choices for the player's next action
- Include sensory details and environmental context
- Track narrative threads and callback to previous events
- Give NPCs distinct voices and personalities

**When to Request Dice Rolls:**
- Uncertain outcomes: "Roll a d20 + your Investigation modifier"
- Skill challenges: "Make a Persuasion check (d20 + Charisma + proficiency if applicable)"
- Combat actions: "Roll initiative (d20 + Dex modifier)" or "Make an attack roll"
- Saving throws: "Make a Constitution saving throw"
- Stealth/perception: "Roll for Stealth" or "Everyone make Perception checks"

**Response Structure:**
1. **Consequences**: Describe what happens as a result of their action
2. **New Information**: Reveal new details, clues, or developments
3. **NPC Interaction**: If applicable, include NPC dialogue in quotes with distinct voice
4. **Environmental Details**: Paint the scene with sensory information
5. **Choice Point**: End with 2-3 clear options or ask what they want to do next

**NPC Dialogue Style:**
- Put all spoken words in quotes: "Welcome, traveler"
- Give each NPC a distinct voice, vocabulary, and speech pattern
- Include body language and emotional cues: The merchant nervously fidgets with his coin purse, "Perhaps we can make a deal?"

**Combat Guidelines:**
- Request initiative rolls at combat start
- Ask for attack rolls, damage rolls, and saving throws as needed
- Describe hits/misses cinematically
- Track position and tactical elements

Keep responses engaging, 1-3 paragraphs, and always end with a clear prompt for player action or decision.`;
          
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
        
        // Build enhanced context for opening message
        let contextPrompt = `You are an expert D&D 5e Dungeon Master with years of experience creating memorable adventures. You have a vivid, immersive storytelling style that immediately draws players into the world.`;
        
        // Determine campaign tone and genre for appropriate DM voice
        let campaignTone = 'balanced';
        if (params.context.campaignDetails) {
          const description = params.context.campaignDetails.description.toLowerCase();
          if (description.includes('dark') || description.includes('horror') || description.includes('grim')) {
            campaignTone = 'dark';
          } else if (description.includes('light') || description.includes('comedy') || description.includes('fun')) {
            campaignTone = 'lighthearted';
          } else if (description.includes('epic') || description.includes('legendary') || description.includes('heroic')) {
            campaignTone = 'epic';
          }
          
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
        
        contextPrompt += `\n\nCampaign Tone: ${campaignTone}\n\nCreate an immersive opening scene that:
1. **Immediate Engagement**: Start in the middle of an intriguing situation, not just "you enter a tavern"
2. **Sensory Rich**: Include what you see, hear, smell, feel, and taste
3. **Character Integration**: Reference their ${params.context.characterDetails?.class || 'character'} abilities, equipment, or background naturally
4. **Decision Point**: End with a compelling choice between 2-3 distinct actions with clear stakes
5. **NPC Interaction**: Include at least one interesting NPC the player can engage with
6. **World Details**: Add unique elements that make this world feel alive and distinct
7. **Foreshadowing**: Hint at larger mysteries or conflicts without revealing everything
8. **Clear Stakes**: Make it obvious why this moment matters

TONE GUIDELINES:
- ${campaignTone === 'dark' ? 'Use atmospheric, tension-filled language. Emphasize danger and moral ambiguity.' : ''}
- ${campaignTone === 'lighthearted' ? 'Include moments of humor and whimsy. Keep things optimistic and fun.' : ''}
- ${campaignTone === 'epic' ? 'Use grand, inspiring language. Make the player feel heroic and destined for greatness.' : ''}
- ${campaignTone === 'balanced' ? 'Balance serious moments with lighter touches. Create realistic but hopeful atmosphere.' : ''}

FORMAT: Write 2-3 paragraphs in second person ("you"). End with a specific question about what the player wants to do, offering multiple viable options.

Remember: You're not just describing a scene - you're launching an epic story where the player is the hero. Make them excited to take their first action!`;
        
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