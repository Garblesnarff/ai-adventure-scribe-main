import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import { GraphQLError } from 'graphql';
import { 
  MutationResolvers, 
  SubscriptionResolvers,
  ChatMessageInput, 
  ChatResponse,
  AgentContextInput,
  TaskInput,
  VoiceContextInput,
  CombatContextInput,
  DMResponse,
  GraphQLContext
} from '../types';
import { pubSub } from '../subscriptions';

// Constants
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Utility functions
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new GraphQLError('Gemini API key not configured', {
      extensions: { code: 'CONFIGURATION_ERROR' }
    });
  }
  return new GoogleGenerativeAI(apiKey);
};

const fetchRelevantMemories = async (sessionId: string, context: any, supabase: any) => {
  try {
    const { data, error } = await supabase
      .from('episodic_memories')
      .select('*')
      .eq('session_id', sessionId)
      .order('importance', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Failed to fetch memories:', error);
    return [];
  }
};

const calculateMemoryRelevance = (memory: any, context: any): number => {
  // Simple relevance scoring based on memory importance and type
  let score = memory.importance || 0;
  
  if (context && memory.metadata) {
    // Boost score for matching context
    if (memory.metadata.character === context.character) score += 2;
    if (memory.metadata.location === context.location) score += 1;
    if (memory.type === context.expectedType) score += 1;
  }
  
  return Math.min(score, 10); // Cap at 10
};

const updateMemoryImportance = async (memories: any[], aiResponse: string, supabase: any) => {
  // Simple implementation - could be enhanced with more sophisticated analysis
  const updates = memories.map(memory => ({
    id: memory.id,
    importance: Math.min(memory.importance + 1, 10) // Boost importance slightly
  }));

  if (updates.length > 0) {
    await Promise.allSettled(updates.map(update => 
      supabase
        .from('episodic_memories')
        .update({ importance: update.importance })
        .eq('id', update.id)
    ));
  }
};

const formatMemoryContext = (scoredMemories: any[]): string => {
  if (scoredMemories.length === 0) return '';

  return `\n\nRELEVANT MEMORIES:\n${scoredMemories
    .map((item, index) => `${index + 1}. [${item.memory.type.toUpperCase()}] ${item.memory.content}`)
    .join('\n')}\n`;
};

/**
 * AI Mutation Resolvers
 */
export const aiMutationResolvers: Partial<MutationResolvers> = {
  /**
   * Generate chat response (similar to chat-ai edge function)
   */
  generateChatResponse: async (_, args, context: GraphQLContext) => {
    try {
      const { messages, sessionId, context: requestContext } = args;

      if (!messages || messages.length === 0) {
        throw new GraphQLError('Messages array is required', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      console.log('Processing chat request...', { sessionId, messageCount: messages.length });

      // Get latest message context
      const latestMessage = messages[messages.length - 1];
      const messageContext = latestMessage?.context || {};

      // Fetch and score relevant memories
      const memories = await fetchRelevantMemories(sessionId, messageContext, context.supabase);
      const scoredMemories = memories
        .map(memory => ({
          memory,
          relevanceScore: calculateMemoryRelevance(memory, messageContext)
        }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);

      console.log(`Found ${scoredMemories.length} relevant memories`);

      // Format memory context
      const memoryContext = formatMemoryContext(scoredMemories);

      // Generate AI response using Gemini
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `You are a skilled D&D 5e Dungeon Master. Respond to the player's message considering the conversation history and relevant memories.

${memoryContext}

Recent conversation:
${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Provide an engaging, immersive response that maintains continuity with the established story.`;

      const result = await model.generateContent(prompt);
      const aiResponse = result.response;
      const text = aiResponse.text();

      console.log('Generated AI response');

      // Update memory importance
      await updateMemoryImportance(memories, text, context.supabase);

      const response: ChatResponse = {
        text,
        sender: 'dm',
        context: {
          emotion: 'neutral',
          intent: 'response',
        },
        metadata: {
          memoryCount: scoredMemories.length,
          generatedAt: new Date().toISOString()
        }
      };

      return response;
    } catch (error) {
      console.error('Error in generateChatResponse:', error);
      throw new GraphQLError('Failed to generate chat response', {
        extensions: { 
          code: 'AI_SERVICE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Execute DM Agent (similar to dm-agent-execute edge function)
   */
  executeDMAgent: async (_, args, context: GraphQLContext) => {
    try {
      const { task, agentContext, voiceContext, isFirstMessage = false, combatContext } = args;
      const { campaignDetails, characterDetails, memories = [] } = agentContext;

      console.log('Processing DM Agent task:', {
        taskType: task.description,
        campaign: campaignDetails?.name,
        character: characterDetails?.name,
        memoryCount: memories?.length,
        isFirstMessage,
        hasCombatContext: !!combatContext
      });

      // Sort memories by importance and recency
      const relevantMemories = memories
        .sort((a: any, b: any) => {
          const importanceDiff = (b.importance || 0) - (a.importance || 0);
          if (importanceDiff !== 0) return importanceDiff;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 5);

      // Build comprehensive prompt
      let prompt = `You are a skilled D&D 5e Dungeon Master who creates immersive, mechanically-sound adventures.

CAMPAIGN: "${campaignDetails?.name}" - ${campaignDetails?.description}
CHARACTER: ${characterDetails?.name}, a level ${characterDetails?.level} ${characterDetails?.race} ${characterDetails?.class}`;

      // Add memory context
      if (relevantMemories.length > 0) {
        prompt += `\n\nRELEVANT MEMORIES:\n`;
        relevantMemories.forEach((memory: any, index: number) => {
          prompt += `${index + 1}. [${memory.type?.toUpperCase()}] ${memory.content}\n`;
        });
      }

      // Add combat context if provided
      if (combatContext?.inCombat) {
        prompt += `\n\nCOMBAT CONTEXT:
In Combat: ${combatContext.inCombat}
Turn: ${combatContext.turn || 'Unknown'}
Round: ${combatContext.round || 'Unknown'}
Current Turn: ${combatContext.currentTurn || 'Unknown'}`;
      }

      // Add voice context requirements
      if (voiceContext) {
        prompt += `\n\n**VOICE-OPTIMIZED RESPONSE FORMAT**
Return JSON containing both display text AND narration segments for multi-voice synthesis.

JSON FORMAT:
{
  "text": "Your full response with proper quoted dialogue",
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
      "character": "character name",
      "voice_category": "hero_male|hero_female|villain_male|villain_female|merchant|guard|elder|creature"
    }
  ]
}`;
      }

      prompt += `\n\nTask: ${task.description}

Provide an engaging response that advances the story while maintaining D&D 5e mechanics.`;

      // Generate AI response
      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const result = await model.generateContent(prompt);
      const aiResponse = result.response;
      const rawResponse = aiResponse.text();

      if (!rawResponse) {
        throw new GraphQLError('No response generated from AI service');
      }

      // Parse structured response if voice context provided
      let narrativeText = rawResponse;
      let narrationSegments: any[] | undefined;

      if (voiceContext) {
        try {
          // Clean and parse JSON response
          let cleanedResponse = rawResponse.trim()
            .replace(/^```(?:json)?\s*/, '')
            .replace(/\s*```$/, '');

          const jsonStart = cleanedResponse.indexOf('{');
          const jsonEnd = cleanedResponse.lastIndexOf('}');

          if (jsonStart !== -1 && jsonEnd !== -1) {
            cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
          }

          const structuredResponse = JSON.parse(cleanedResponse);
          narrativeText = structuredResponse.text;
          narrationSegments = structuredResponse.narration_segments;

          console.log('Successfully parsed structured response with', narrationSegments?.length, 'segments');
        } catch (parseError) {
          console.warn('Failed to parse structured response:', parseError);
          // Keep narrativeText as rawResponse
        }
      }

      const response: DMResponse = {
        response: narrativeText,
        context: agentContext,
        raw: {
          environment: {
            description: 'Generated environment description',
            atmosphere: 'Dynamic atmosphere',
            sensoryDetails: []
          },
          characters: {
            activeNPCs: [],
            reactions: [],
            dialogue: narrativeText
          }
        },
        narrationSegments: narrationSegments
      };

      return response;
    } catch (error) {
      console.error('Error in executeDMAgent:', error);
      throw new GraphQLError('Failed to execute DM agent', {
        extensions: { 
          code: 'AI_SERVICE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Execute Rules Interpreter Agent
   */
  executeRulesInterpreter: async (_, args, context: GraphQLContext) => {
    try {
      const { task, agentContext } = args;

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      const prompt = `You are a D&D 5e rules expert and interpreter. Analyze the following request and provide accurate rule interpretations, mechanics, and suggestions.

CAMPAIGN: ${agentContext.campaignDetails?.name}
CHARACTER: ${agentContext.characterDetails?.name} (${agentContext.characterDetails?.class})

Request: ${task.description}

Provide a detailed response covering:
1. Relevant D&D 5e rules
2. Mechanical interpretations
3. Suggestions for implementation
4. Any edge cases or clarifications needed

Return your response as a JSON object with structured information.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Try to parse as JSON, fallback to text response
      try {
        return JSON.parse(text);
      } catch {
        return {
          text,
          rulesInterpreted: true,
          generatedAt: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error in executeRulesInterpreter:', error);
      throw new GraphQLError('Failed to execute rules interpreter', {
        extensions: { 
          code: 'AI_SERVICE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Generate speech (similar to text-to-speech edge function)
   */
  generateSpeech: async (_, args) => {
    try {
      const { text, voiceId = 'JBFqnCBsd6RMkjVDRZzb', voiceSettings } = args;

      const apiKey = process.env.ELEVEN_LABS_API_KEY;
      if (!apiKey) {
        throw new GraphQLError('ElevenLabs API key not configured', {
          extensions: { code: 'CONFIGURATION_ERROR' }
        });
      }

      console.log('Generating speech for text:', text.substring(0, 100) + '...');

      const requestBody = {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: voiceSettings?.stability || 0.5,
          similarity_boost: voiceSettings?.similarity_boost || 0.5,
        },
      };

      const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('ElevenLabs API error:', error);
        throw new GraphQLError('Failed to generate speech');
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      console.log(`Generated audio response. Size: ${audioBuffer.byteLength} bytes`);

      return {
        audioData: audioBase64,
        format: 'audio/mpeg',
        duration: undefined, // Could be calculated if needed
        audioUrl: undefined // Could generate a temporary URL if needed
      };
    } catch (error) {
      console.error('Error in generateSpeech:', error);
      throw new GraphQLError('Failed to generate speech', {
        extensions: { 
          code: 'SPEECH_SERVICE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Generate embedding (similar to generate-embedding edge function)
   */
  generateEmbedding: async (_, args) => {
    try {
      const { text } = args;

      if (!text) {
        throw new GraphQLError('Text is required', {
          extensions: { code: 'BAD_USER_INPUT' }
        });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new GraphQLError('OpenAI API key not configured', {
          extensions: { code: 'CONFIGURATION_ERROR' }
        });
      }

      // Clean and truncate text
      const cleanedText = text.substring(0, 1000).replace(/\n/g, ' ').trim();
      console.log('Processing text for embedding:', cleanedText.substring(0, 100) + '...');

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: cleanedText,
          model: 'text-embedding-ada-002',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI API error:', error);
        throw new GraphQLError('Failed to generate embedding');
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new GraphQLError('Invalid embedding format received');
      }

      // Format embedding for Supabase vector storage
      const vectorString = `[${embedding.join(',')}]`;

      return {
        embedding: vectorString,
        text: cleanedText
      };
    } catch (error) {
      console.error('Error in generateEmbedding:', error);
      throw new GraphQLError('Failed to generate embedding', {
        extensions: { 
          code: 'EMBEDDING_SERVICE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * AI Subscription Resolvers
 */
export const aiSubscriptionResolvers: Partial<SubscriptionResolvers> = {
  /**
   * Stream chat response for real-time interactions
   */
  streamChatResponse: {
    subscribe: async (_, args, context: GraphQLContext) => {
      const { sessionId } = args;
      return pubSub.asyncIterator([`CHAT_RESPONSE_${sessionId}`]);
    },
    resolve: (payload: any) => payload
  },

  /**
   * Stream DM response for real-time narration
   */
  streamDMResponse: {
    subscribe: async (_, args, context: GraphQLContext) => {
      const sessionId = args.agentContext.campaignDetails?.id || 'default';
      return pubSub.asyncIterator([`DM_RESPONSE_${sessionId}`]);
    },
    resolve: (payload: any) => payload
  }
};