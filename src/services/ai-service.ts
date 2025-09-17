import { supabase } from '@/integrations/supabase/client';
import { GeminiApiManager } from './gemini-api-manager';
import { MemoryManager, MemoryContext } from './memory-manager';
import { WorldBuilderService } from './world-builders/world-builder-service';
import { voiceConsistencyService } from './voice-consistency-service';
import { detectCombatFromText } from '@/utils/combatDetection';

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
   * Format combat detection context for the prompt
   */
  private static formatCombatContext(combatDetection: any): string {
    if (!combatDetection.isCombat) return '';

    let combatText = `\n\nCOMBAT CONTEXT DETECTED:
Combat Type: ${combatDetection.combatType}
Confidence: ${Math.round(combatDetection.confidence * 100)}%
Should Start Combat: ${combatDetection.shouldStartCombat ? 'YES' : 'NO'}
Should End Combat: ${combatDetection.shouldEndCombat ? 'YES' : 'NO'}`;

    // Add detected enemies
    if (combatDetection.enemies && combatDetection.enemies.length > 0) {
      combatText += `\n\nDETECTED ENEMIES:`;
      combatDetection.enemies.forEach((enemy: any) => {
        combatText += `\n- ${enemy.name} (${enemy.type}, CR ${enemy.estimatedCR})
  HP: ${enemy.suggestedHP}, AC: ${enemy.suggestedAC}
  Description: ${enemy.description}`;
      });
    }

    // Add detected combat actions
    if (combatDetection.combatActions && combatDetection.combatActions.length > 0) {
      combatText += `\n\nDETECTED COMBAT ACTIONS:`;
      combatDetection.combatActions.forEach((action: any) => {
        combatText += `\n- ${action.actor} performs ${action.action}${action.target ? ` against ${action.target}` : ''}${action.weapon ? ` with ${action.weapon}` : ''}
  Roll Type: ${action.rollType}, Needs Roll: ${action.rollNeeded ? 'YES' : 'NO'}`;
      });
    }

    combatText += `\n\n**COMBAT RESPONSE REQUIREMENTS:**
When combat is detected, you MUST:
1. Generate appropriate dice rolls for actions (attack rolls, damage rolls, saving throws)
2. Apply combat results immediately (reduce HP, apply conditions, etc.)
3. Describe combat actions cinematically but maintain mechanical accuracy
4. Show dice results: "The orc swings (rolls 16, hits AC 13) for 8 slashing damage"
5. Make tactical decisions for NPCs based on their intelligence and experience
6. Consider environmental factors and positioning
7. Narrate the consequences of each action dramatically`;

    return combatText;
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
      // TEMPORARILY DISABLED for option button testing
      let voiceContext = null;
      // if (params.context.sessionId) {
      //   try {
      //     voiceContext = await voiceConsistencyService.getSessionVoiceContext(params.context.sessionId);
      //     console.log(`🎭 Retrieved voice context for ${Object.keys(voiceContext.knownCharacters).length} known characters`);
      //   } catch (voiceError) {
      //     console.warn('Failed to retrieve voice context:', voiceError);
      //   }
      // }

      // Detect combat from player message
      const combatDetection = detectCombatFromText(params.message);
      console.log(`⚔️ Combat detection: ${combatDetection.isCombat ? 'YES' : 'NO'} (confidence: ${Math.round(combatDetection.confidence * 100)}%)`);
      
      if (combatDetection.isCombat) {
        console.log(`🎯 Combat details:`, {
          type: combatDetection.combatType,
          shouldStart: combatDetection.shouldStartCombat,
          shouldEnd: combatDetection.shouldEndCombat,
          enemies: combatDetection.enemies?.length || 0,
          actions: combatDetection.combatActions?.length || 0
        });
      }
      
      // Use local Gemini API
      const geminiManager = this.getGeminiManager();
      
      const result = await geminiManager.executeWithRotation(async (genAI) => {
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
          
          // Build enhanced context for DM interactions with voice segmentation
          let contextPrompt = `You are a skilled D&D 5e Dungeon Master who creates immersive, mechanically-sound adventures. You balance compelling narrative with proper game mechanics, always giving players meaningful choices with clear consequences.

**CRITICAL: ALWAYS REQUEST DICE ROLLS FROM PLAYERS**
You MUST request dice rolls from players for uncertain outcomes. This maintains player agency and engagement.

**MANDATORY DICE ROLL REQUESTS:**
- Combat actions: Request attack rolls, damage rolls (using character's specific weapon dice), saving throws
- Skill checks: Ask for Investigation, Perception, Persuasion, etc. rolls
- Random events: Player rolls for random outcomes when they're the cause
- Use CHARACTER'S ACTUAL MODIFIERS in your requests
- Format: "Please roll [dice with actual modifier] for [purpose] (target DC [number])"

**REQUEST EXAMPLES (using character's actual stats):**
✅ "The orc attacks you! Please roll an attack roll with your weapon"
✅ "Please make a Perception check" (system will auto-calculate WIS modifier + proficiency)
✅ "Roll initiative!" (system will auto-calculate DEX modifier)
✅ "Make a Dexterity saving throw (DC 15) to avoid the fireball"
✅ "Roll for a Stealth check to sneak past the guard"

**PREFERRED SIMPLE REQUESTS (system calculates modifiers automatically):**
✅ "Make an attack roll"
✅ "Roll initiative"
✅ "Make a Dexterity saving throw"
✅ "Make a Perception check"
✅ "Roll for Stealth"

**FOR NPCs AND ENVIRONMENT:**
✅ "The orc attacks (rolling behind screen... hits AC 13) dealing 6 slashing damage"
✅ "A mysterious sound echoes from the shadows (rolled for random encounter)"

**NEVER SAY:**
❌ "You rolled 16 and succeeded" (Player hasn't rolled yet!)
❌ "Rolling 1d20+3 = 14 for your Perception" (Player should roll!)
❌ "The result is 18" (without player action)`;
          
          if (params.context.campaignDetails) {
            contextPrompt += `\n\nCAMPAIGN: "${params.context.campaignDetails.name}" - ${params.context.campaignDetails.description}`;
          }
          
          if (params.context.characterDetails) {
            const char = params.context.characterDetails;
            contextPrompt += `\n\nPLAYER CHARACTER: ${char.name}, a level ${char.level} ${char.race || 'Unknown Race'} ${char.class || 'Unknown Class'}`;
            if (char.background) {
              contextPrompt += ` (${char.background} background)`;
            }

            // Add character stats for roll calculations
            if (char.character_stats && char.character_stats.length > 0) {
              const stats = char.character_stats[0];
              contextPrompt += `\nAbility Scores: STR ${stats.strength}(${Math.floor((stats.strength - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.strength - 10) / 2)}), DEX ${stats.dexterity}(${Math.floor((stats.dexterity - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.dexterity - 10) / 2)}), CON ${stats.constitution}(${Math.floor((stats.constitution - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.constitution - 10) / 2)}), INT ${stats.intelligence}(${Math.floor((stats.intelligence - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.intelligence - 10) / 2)}), WIS ${stats.wisdom}(${Math.floor((stats.wisdom - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.wisdom - 10) / 2)}), CHA ${stats.charisma}(${Math.floor((stats.charisma - 10) / 2) >= 0 ? '+' : ''}${Math.floor((stats.charisma - 10) / 2)})`;

              // Calculate and include proficiency bonus
              const profBonus = char.level >= 17 ? 6 : char.level >= 13 ? 5 : char.level >= 9 ? 4 : char.level >= 5 ? 3 : 2;
              contextPrompt += `\nProficiency Bonus: +${profBonus}`;
            }

            // Add default equipment for class-based damage rolls
            const classEquipment = this.getClassEquipment(char.class?.name || char.class || 'Fighter');
            contextPrompt += `\nEQUIPMENT: ${classEquipment.weapons.join(', ')} | ${classEquipment.armor}`;
            contextPrompt += `\n**CRITICAL: USE EXACT WEAPON DICE from equipment list above for damage roll requests!**`;

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

          // Detect if this is a campaign opening (first message)
          const isFirstMessage = (!params.conversationHistory || params.conversationHistory.length === 0) && (!params.message || params.message.trim() === '');
          
          if (isFirstMessage) {
            contextPrompt += `\n\n**CAMPAIGN OPENING - FIRST MESSAGE REQUIREMENTS**:
This is the campaign's opening scene. Create an engaging D&D adventure start that hooks the player immediately.

**OPENING STRUCTURE:**
1. **Scene Setting**: Establish location, atmosphere, and immediate situation using rich sensory details
2. **Character Integration**: Connect the character's background and skills to the opening scenario  
3. **Active NPC**: Include at least one speaking NPC with quoted dialogue and clear personality
4. **Immediate Hook**: Present a compelling problem, opportunity, or mystery requiring action
5. **Clear Choices**: End with 2-3 specific action options with different approaches and consequences

**D&D MECHANICS REQUIREMENTS:**
- If uncertain outcomes occur, specify needed dice rolls: "Make a Perception check (d20 + Wisdom modifier)"
- Reference character abilities that might be relevant: "Your training might help here"
- Include environmental details that suggest skill applications or tactical options
- Set up potential ability checks, combat, or social interactions

**ESSENTIAL ELEMENTS:**
- Use appropriate atmosphere and tone throughout
- Make the character feel central to unfolding events  
- Create both immediate and long-term stakes
- Include sensory details (sights, sounds, smells, textures)
- Show why this character is the right person for this adventure
- End with a clear "What do you do?" moment

**NPC DIALOGUE REQUIREMENTS:**
- ALL speech must be in quotes: "Welcome, traveler. I've been expecting you."
- Give NPCs distinct voices and personalities based on their role and background
- Include body language and emotional context with dialogue
- Use dialogue to advance plot and provide hooks

Keep opening substantial (3-4 paragraphs) but focused on immediate engagement and player choice.`;
          }

          // Add combat context if detected
          contextPrompt += this.formatCombatContext(combatDetection);
          
          // Add specific dice roll requirements for combat
          if (combatDetection.isCombat) {
            contextPrompt += `\n\n**IMMEDIATE DICE ROLL REQUIREMENTS:**
Based on the detected combat scenario, you MUST include these dice rolls in your response:
- Initiative rolls for any new combat participants  
- Attack rolls for any offensive actions
- Damage rolls following successful attacks
- Saving throws for any effects or spells
- Any ability checks mentioned by the player

**CRITICAL**: Include actual dice roll results in your "dice_rolls" array AND display them in the narrative text.`;
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
  "text": "Your full response with proper quoted dialogue and dice roll results for display",
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
  ],
  "roll_requests": [
    {
      "type": "check|save|attack|damage|initiative",
      "formula": "1d20+5",
      "purpose": "Arcana check to understand the magical mechanism",
      "dc": 15,
      "advantage": false,
      "disadvantage": false
    }
  ]
}

**ROLL REQUEST REQUIREMENTS:**
- ALWAYS include "roll_requests" array when requesting dice rolls from players
- Request format: type, formula, purpose, DC/AC, advantage/disadvantage
- Include roll_requests for: player combat actions, skill checks, saving throws, initiative
- Each roll_request must have: type, formula, purpose, and target (DC/AC) if applicable
- Show roll requests in the "text" field: "Please roll 1d20+5 for your Arcana check (DC 15)"

**STRUCTURED ROLL REQUEST FORMAT:**
{
  "type": "check|save|attack|damage|initiative",
  "formula": "1d20+5",
  "purpose": "Arcana check to understand the magical mechanism",
  "dc": 15,
  "advantage": false,
  "disadvantage": false
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

**CORE DM RESPONSE PRINCIPLES:**
Respond to player actions with clear consequences and vivid descriptions using D&D 5e mechanics when appropriate.

**COMBAT GUIDELINES:**
- **REQUEST INITIATIVE FROM PLAYERS**: "Roll initiative! (1d20+dex modifier)"
- **REQUEST PLAYER ATTACK ROLLS**: "Make an attack roll with your [weapon] (1d20+attack bonus)"
- **REQUEST SAVING THROWS**: "Make a [ability] saving throw (1d20+modifier, DC [number])"
- **REQUEST DAMAGE ROLLS**: "Roll damage for your [weapon/spell] ([exact dice from character equipment])" - USE SPECIFIC WEAPON DICE (1d8 for longsword, 1d6 for shortsword, etc.)
- **NPC ACTIONS**: Handle behind screen: "The orc attacks (rolled behind screen, hits AC 14)"
- Apply D&D 5e rules: advantage/disadvantage, resistance, spell components, concentration
- Describe hits/misses cinematically with mechanical accuracy
- Track position, conditions, and tactical elements  
- Include battle cries and combat dialogue in direct quotes
- Consider environmental factors (cover, difficult terrain, lighting)
- NPCs should use tactics appropriate to their intelligence and experience

**INTERACTIVE COMBAT REQUIREMENTS:**
- ALWAYS request rolls from players before resolving their actions
- Show clear DC or AC targets for player rolls
- Wait for player response before continuing combat narrative
- Handle NPC actions/rolls behind the screen (show results only)

**MECHANICS VISIBILITY:**
- Always show dice rolls and their results when they occur
- Display HP changes, condition effects, and resource costs
- Track narrative threads and callback to previous events
- Maintain scene consistency with actual memories only

**CHOICE STRUCTURE:**
- Always provide 2-3 meaningful choices for the player's next action
- Include potential skill checks or rolls required for each option
- Show risk/reward for different approaches
- End with clear "What do you do?" prompts

**CRITICAL: ACTION OPTIONS FORMATTING**
When providing choices to the player, you MUST format them as lettered options with bold action names:

Format: A. **Action Name**, brief description of what this choice involves

Examples:
- A. **Approach cautiously**, moving carefully to avoid detection while gathering information
- B. **Charge forward boldly**, relying on speed and surprise to overcome obstacles
- C. **Attempt to negotiate**, using your diplomatic skills to find a peaceful solution

This formatting is REQUIRED for the options to appear as clickable buttons in the game interface. Always include 2-3 options formatted this way at the end of your responses unless the situation clearly calls for a single specific action (like combat resolution).

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
                
                // Try to find JSON content if the response has extra text
                const jsonStart = cleanedResponse.indexOf('{');
                const jsonEnd = cleanedResponse.lastIndexOf('}');
                
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                  cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
                }
                
                // Additional cleanup for common JSON formatting issues
                cleanedResponse = cleanedResponse
                  .replace(/,\s*}/g, '}')  // Remove trailing commas before }
                  .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
                  .replace(/}\s*{/g, '},{') // Fix missing commas between objects
                  .replace(/"\s*:\s*"([^"]*?)"\s*([,}])/g, '":"$1"$2'); // Fix spacing issues
                
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
        
        // Add combat detection data to the result
        const enhancedResult = {
          ...result,
          combatDetection: {
            isCombat: combatDetection.isCombat,
            confidence: combatDetection.confidence,
            combatType: combatDetection.combatType,
            shouldStartCombat: combatDetection.shouldStartCombat,
            shouldEndCombat: combatDetection.shouldEndCombat,
            enemies: combatDetection.enemies || [],
            combatActions: combatDetection.combatActions || []
          }
        };
        
        return enhancedResult;
        
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

**CRITICAL: ACTION OPTIONS FORMATTING**
When providing choices to the player, you MUST format them as lettered options with bold action names:

Format: A. **Action Name**, brief description of what this choice involves

Examples:
- A. **Approach cautiously**, moving carefully to avoid detection while gathering information
- B. **Charge forward boldly**, relying on speed and surprise to overcome obstacles
- C. **Attempt to negotiate**, using your diplomatic skills to find a peaceful solution

This formatting is REQUIRED for the options to appear as clickable buttons in the game interface. Always include 2-3 options formatted this way at the end of your response.

TONE GUIDELINES:
- ${campaignTone === 'dark' ? 'Use atmospheric, tension-filled language. Emphasize danger and moral ambiguity.' : ''}
- ${campaignTone === 'lighthearted' ? 'Include moments of humor and whimsy. Keep things optimistic and fun.' : ''}
- ${campaignTone === 'epic' ? 'Use grand, inspiring language. Make the player feel heroic and destined for greatness.' : ''}
- ${campaignTone === 'balanced' ? 'Balance serious moments with lighter touches. Create realistic but hopeful atmosphere.' : ''}

FORMAT: Write 2-3 paragraphs in second person ("you"). End with a specific question about what the player wants to do, offering multiple viable options formatted as described above.

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
   * Get default equipment for a character class
   * Used to provide the AI with weapon damage dice information
   */
  private static getClassEquipment(className: string): { weapons: string[]; armor: string } {
    const classLower = className.toLowerCase();

    switch (classLower) {
      case 'fighter':
        return {
          weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Handaxe (1d6)', 'Light Crossbow (1d8)'],
          armor: 'Chain mail (AC 16)'
        };

      case 'rogue':
        return {
          weapons: ['Shortsword (1d6)', 'Dagger (1d4)', 'Shortbow (1d6)', 'Rapier (1d8)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'ranger':
        return {
          weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Longbow (1d8)', 'Handaxe (1d6)'],
          armor: 'Studded leather (AC 12)'
        };

      case 'barbarian':
        return {
          weapons: ['Greataxe (1d12)', 'Handaxe (1d6)', 'Javelin (1d6)'],
          armor: 'Unarmored (AC 10 + Dex + Con)'
        };

      case 'wizard':
        return {
          weapons: ['Dagger (1d4)', 'Dart (1d4)', 'Light Crossbow (1d8)', 'Quarterstaff (1d6)'],
          armor: 'No armor (AC 10)'
        };

      case 'sorcerer':
        return {
          weapons: ['Dagger (1d4)', 'Dart (1d4)', 'Light Crossbow (1d8)', 'Quarterstaff (1d6)'],
          armor: 'No armor (AC 10)'
        };

      case 'warlock':
        return {
          weapons: ['Dagger (1d4)', 'Light Crossbow (1d8)', 'Scimitar (1d6)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'cleric':
        return {
          weapons: ['Mace (1d6)', 'Warhammer (1d8)', 'Light Crossbow (1d8)', 'Shield'],
          armor: 'Scale mail (AC 14)'
        };

      case 'druid':
        return {
          weapons: ['Scimitar (1d6)', 'Shield', 'Dart (1d4)', 'Javelin (1d6)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'paladin':
        return {
          weapons: ['Longsword (1d8)', 'Javelin (1d6)', 'Shield'],
          armor: 'Chain mail (AC 16)'
        };

      case 'bard':
        return {
          weapons: ['Rapier (1d8)', 'Shortsword (1d6)', 'Dagger (1d4)', 'Hand Crossbow (1d6)'],
          armor: 'Leather armor (AC 11)'
        };

      case 'monk':
        return {
          weapons: ['Shortsword (1d6)', 'Dart (1d4)', 'Unarmed Strike (1d4)'],
          armor: 'Unarmored (AC 10 + Dex + Wis)'
        };

      default:
        return {
          weapons: ['Longsword (1d8)', 'Shortsword (1d6)', 'Dagger (1d4)'],
          armor: 'Leather armor (AC 11)'
        };
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