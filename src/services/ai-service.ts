import { supabase } from '@/integrations/supabase/client';
import { GeminiApiManager } from './gemini-api-manager';
import { MemoryManager, MemoryContext } from './memory-manager';
import { WorldBuilderService } from './world-builders/world-builder-service';
import { voiceConsistencyService } from './voice-consistency-service';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  narrationSegments?: Array<{
    type: 'dm' | 'character' | 'transition';
    text: string;
    character?: string;
    voice_category?: string;
  }>;
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
   * Now includes voice segmentation for multi-voice narration
   */
  static async chatWithDM(params: {
    message: string;
    context: GameContext;
    conversationHistory?: ChatMessage[];
    onStream?: (chunk: string) => void;
  }): Promise<{ text: string; narrationSegments?: any[] }> {
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

      // Get voice context for multi-voice narration
      let voiceContext = null;
      if (params.context.sessionId) {
        try {
          voiceContext = await voiceConsistencyService.getSessionVoiceContext(params.context.sessionId);
          console.log(`🎭 Retrieved voice context for ${Object.keys(voiceContext.knownCharacters).length} known characters`);
        } catch (voiceError) {
          console.warn('Failed to retrieve voice context:', voiceError);
        }
      }
      
      // Use local Gemini API
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
          
          // Build enhanced context for DM interactions with voice segmentation
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

          // Add voice context for multi-voice narration
          if (voiceContext) {
            // Known characters and their assigned voices
            if (Object.keys(voiceContext.knownCharacters).length > 0) {
              contextPrompt += `\n\nKNOWN CHARACTERS (maintain voice consistency):`;
              Object.entries(voiceContext.knownCharacters).forEach(([character, info]: [string, any]) => {
                contextPrompt += `\n- "${character}": ${info.voiceCategory} voice (appeared ${info.appearances} times)`;
              });
            }

            contextPrompt += `\n\n**CRITICAL: VOICE-OPTIMIZED RESPONSE FORMAT**
You MUST respond with JSON containing both display text AND pre-segmented narration for multi-voice synthesis.

**IMPORTANT: Return ONLY pure JSON - no markdown, no code blocks, no extra text!**

**SIMPLIFIED SEGMENTATION RULES:**
1. **Fewer, Better Segments**: Create 2-5 segments maximum per response
2. **One Speaker Per Segment**: Each segment = one speaker (DM or specific character)
3. **Complete Thoughts**: Each segment should be a complete thought or dialogue turn
4. **Speaker Turns**: Split only when the speaker changes (DM -> Character or Character A -> Character B)

**JSON FORMAT:**
{
  "text": "Your full response with proper quoted dialogue for display",
  "narration_segments": [
    {
      "type": "dm",
      "text": "Complete scene description and DM narration",
      "character": null,
      "voice_category": null
    },
    {
      "type": "character",
      "text": "Complete character dialogue without quotes",
      "character": "simple character name",
      "voice_category": "hero_male|villain_female|merchant|guard|elder|creature|etc"
    }
  ]
}

**VOICE CATEGORIES:** hero_male, hero_female, villain_male, villain_female, merchant, guard, innkeeper, elder, child, creature, goblin, monster

**SEGMENTATION EXAMPLE:**
Player: "I enter the tavern"

Response:
{
  "text": "You push open the heavy wooden door and step into the warm, smoky interior of the Prancing Pony. The tavern keeper, a burly man with graying hair, looks up from wiping down mugs. 'Welcome, traveler! What can I get you tonight? We\\'ve got hot stew, cold ale, and warm beds if you need rest.'",
  "narration_segments": [
    {
      "type": "dm",
      "text": "You push open the heavy wooden door and step into the warm, smoky interior of the Prancing Pony. The tavern keeper, a burly man with graying hair, looks up from wiping down mugs.",
      "character": null,
      "voice_category": null
    },
    {
      "type": "character",
      "text": "Welcome, traveler! What can I get you tonight? We've got hot stew, cold ale, and warm beds if you need rest.",
      "character": "tavern keeper",
      "voice_category": "merchant"
    }
  ]
}`;

          }
          
          contextPrompt += `\n\nDM RESPONSE GUIDELINES:
**Core Principles:**
- Respond to the player's action with clear consequences and vivid descriptions
- Use D&D 5e mechanics when appropriate (ask for ability checks, saving throws, attacks)
- Always provide 2-3 meaningful choices for the player's next action
- Include sensory details and environmental context
- Track narrative threads and callback to previous events
- Give NPCs distinct voices and personalities

**CRITICAL: NPC DIALOGUE REQUIREMENTS**
- ALL significant NPC interactions MUST use direct quoted speech
- Examples: "What brings you to these dark woods?" or "I've been expecting you, adventurer."
- NEVER describe speech indirectly (e.g., "He greets you warmly" or "She asks about your quest")
- Every meaningful NPC response should contain actual spoken words in quotes
- This applies to shopkeepers, guards, villagers, enemies, allies - ALL speaking NPCs

**When to Request Dice Rolls:**
- Uncertain outcomes: "Roll a d20 + your Investigation modifier"
- Skill challenges: "Make a Persuasion check (d20 + Charisma + proficiency if applicable)"
- Combat actions: "Roll initiative (d20 + Dex modifier)" or "Make an attack roll"
- Saving throws: "Make a Constitution saving throw"
- Stealth/perception: "Roll for Stealth" or "Everyone make Perception checks"

**Response Structure:**
1. **Consequences**: Describe what happens as a result of their action
2. **New Information**: Reveal new details, clues, or developments
3. **NPC Interaction**: Include direct quoted dialogue for ALL speaking NPCs
4. **Environmental Details**: Paint the scene with sensory information
5. **Choice Point**: End with 2-3 clear options or ask what they want to do next

**Enhanced NPC Dialogue Standards:**
- Direct quotes for ALL spoken words: "Welcome, traveler. What news from the capital?"
- Give each NPC a unique voice, vocabulary, and speech pattern
- Include body language and emotional cues: The merchant nervously fidgets with his coin purse before saying, "Perhaps we can strike a bargain?"
- Match dialogue to character: A gruff dwarf might say "Bah! What's a human doing in these tunnels?" while an elegant elf says "How... unexpected to encounter your kind here."
- Use dialogue to reveal personality, motivations, and plot information

**DIALOGUE EXAMPLES:**
✅ CORRECT: The tavern keeper looks up from cleaning glasses. "Rough night out there, eh? What can I get you?"
❌ INCORRECT: The tavern keeper greets you and asks what you want to drink.

✅ CORRECT: The guard steps forward, hand on sword hilt. "State your business, stranger. The city's been on edge lately."
❌ INCORRECT: The guard approaches and questions your presence suspiciously.

**Combat Guidelines:**
- Request initiative rolls at combat start
- Ask for attack rolls, damage rolls, and saving throws as needed
- Describe hits/misses cinematically
- Track position and tactical elements
- Include battle cries and taunts in direct quotes

Keep responses engaging, 1-3 paragraphs, and always end with a clear prompt for player action or decision.

${voiceContext ? '**REMEMBER: Always respond in the JSON format with narration_segments for voice synthesis!**' : ''}`;
          
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
              maxOutputTokens: 2048, // Increased from 1024 to prevent truncation
            },
          });
          
          // Use streaming if callback provided (note: streaming won't work with JSON parsing)
          if (params.onStream && !voiceContext) {
            const response = await chat.sendMessageStream(params.message);
            let fullResponse = '';
            
            for await (const chunk of response.stream) {
              const chunkText = chunk.text();
              fullResponse += chunkText;
              params.onStream(chunkText);
            }
            
            return { text: fullResponse };
          } else {
            const response = await chat.sendMessage(params.message);
            const result = await response.response;
            const rawResponse = result.text();

            // Try to parse structured response if voice context is available
            if (voiceContext) {
              try {
                // Clean the response by removing markdown code blocks first
                let cleanedResponse = rawResponse.trim();
                
                // Remove markdown code blocks (```json ... ```)
                cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
                
                // Parse the cleaned JSON
                const structuredResponse = JSON.parse(cleanedResponse);
                console.log('🎭 Successfully parsed structured voice response');
                
                // 🔍 DEBUG: Log the raw AI response structure
                console.log('📥 RAW AI RESPONSE:', JSON.stringify(structuredResponse, null, 2));
                
                if (structuredResponse.narration_segments) {
                  console.log('📊 AI SEGMENTS ANALYSIS:');
                  structuredResponse.narration_segments.forEach((segment: any, idx: number) => {
                    console.log(`  Segment ${idx + 1}:`, {
                      type: segment.type,
                      character: segment.character,
                      voice_category: segment.voice_category,
                      text_length: segment.text?.length || 0,
                      text_preview: segment.text?.substring(0, 50) + '...'
                    });
                  });
                }
                
                return structuredResponse;
              } catch (parseError) {
                console.warn('Failed to parse structured response, attempting to extract text:', parseError);
                
                // Try to extract text from malformed JSON
                try {
                  // Look for text field in the response even if JSON is malformed
                  const textMatch = rawResponse.match(/"text"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/);
                  if (textMatch) {
                    const extractedText = textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                    console.log('🔧 Extracted text from malformed JSON');
                    return { text: extractedText };
                  }
                } catch (extractError) {
                  console.warn('Could not extract text from malformed JSON:', extractError);
                }
                
                // Final fallback - return raw response with minimal cleaning
                // Only remove obvious JSON structure markers if they exist
                let cleanText = rawResponse;
                if (cleanText.trim().startsWith('{') && cleanText.includes('"text"')) {
                  // Try to find where the actual text content starts and ends
                  const startMatch = cleanText.match(/"text"\s*:\s*"/);
                  if (startMatch) {
                    const startIndex = startMatch.index! + startMatch[0].length;
                    let textContent = cleanText.substring(startIndex);
                    
                    // Find the end of the text content (look for quote followed by comma or closing brace)
                    const endMatch = textContent.match(/"\s*[,}]/);
                    if (endMatch) {
                      textContent = textContent.substring(0, endMatch.index);
                    } else {
                      // If no clear end found, look for the last quote
                      const lastQuoteIndex = textContent.lastIndexOf('"');
                      if (lastQuoteIndex > 0) {
                        textContent = textContent.substring(0, lastQuoteIndex);
                      }
                    }
                    
                    // Unescape the content
                    cleanText = textContent.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                  }
                }
                return { text: cleanText || rawResponse };
              }
            }
            
            return { text: rawResponse };
          }
        });
        
        console.log('Successfully generated DM response using local Gemini API');

        // Process voice assignments if we have structured data
        if (result.narration_segments && params.context.sessionId && voiceContext) {
          try {
            // Normalize segment types for compatibility
            const normalizedSegments = result.narration_segments.map((segment: any) => ({
              ...segment,
              type: segment.type === 'dm' ? 'narration' : segment.type === 'character' ? 'dialogue' : segment.type
            }));
            
            await voiceConsistencyService.processVoiceAssignments(
              params.context.sessionId,
              normalizedSegments
            );
            console.log('🎪 Processed voice assignments for character consistency');
          } catch (voiceError) {
            console.warn('Voice assignment processing failed (non-fatal):', voiceError);
          }
        }
        
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
              result.text
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
              result.text
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
        timestamp: msg.created_at ? new Date(msg.created_at) : new Date(),
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
5. **NPC Interaction**: Include at least one interesting NPC with direct quoted dialogue
6. **World Details**: Add unique elements that make this world feel alive and distinct
7. **Foreshadowing**: Hint at larger mysteries or conflicts without revealing everything
8. **Clear Stakes**: Make it obvious why this moment matters

**CRITICAL: NPC Dialogue Requirements**
- ALL NPC interactions MUST use direct quoted speech
- Examples: "Stranger, you look like you've seen trouble," or "Help me! The bandits took everything!"
- NEVER describe speech indirectly (e.g., "A merchant greets you" or "Someone calls for help")
- Every speaking NPC should have actual quoted words that reveal personality and plot

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