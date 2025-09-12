import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Types from migrated edge functions
interface AgentContext {
  campaignContext?: CampaignContext;
  campaignDetails?: CampaignContext;
  characterContext?: CharacterContext;
  characterDetails?: CharacterContext;
  memories?: Memory[];
  gameState?: GameState;
  combatContext?: CombatContext;
}

interface CombatContext {
  detection?: {
    isCombat: boolean;
    combatType: string;
    confidence: number;
    shouldStartCombat: boolean;
    shouldEndCombat: boolean;
    enemies?: Array<{
      name: string;
      type: string;
      estimatedCR: string;
      description: string;
      suggestedHP: number;
      suggestedAC: number;
    }>;
    combatActions?: Array<{
      actor: string;
      action: string;
      target?: string;
      weapon?: string;
      rollNeeded: boolean;
      rollType: string;
    }>;
  };
  encounter?: {
    status: string;
    currentRound: number;
    phase: string;
    location?: string;
    terrain?: string;
    visibility?: string;
    participants?: Array<{
      name: string;
      participantType: string;
      initiative: number;
      currentHitPoints: number;
      maxHitPoints: number;
      temporaryHitPoints: number;
      armorClass: number;
      conditions?: Array<{ name: string }>;
      deathSaves?: {
        successes: number;
        failures: number;
      };
    }>;
  };
}

interface CampaignContext {
  name: string;
  genre: string;
  tone?: string;
  difficulty_level?: string;
  description?: string;
  setting_details?: {
    era?: string;
    location?: string;
    atmosphere?: string;
  };
  world_id?: string;
  thematic_elements?: {
    keyLocations?: string[];
  };
}

interface CharacterContext {
  name: string;
  race: string;
  class: string;
  level: number;
  background?: string;
  description?: string;
  alignment?: string;
}

interface Memory {
  id?: string;
  session_id?: string;
  type: string;
  content: string;
  importance?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  category?: string;
}

interface GameState {
  location: {
    name: string;
    description: string;
    atmosphere: string;
    timeOfDay: string;
  };
  activeNPCs: Array<{
    id: string;
    name: string;
    description: string;
    personality: string;
    currentStatus: string;
    lastInteraction?: string;
  }>;
  playerStatus: {
    currentHealth: number;
    maxHealth: number;
    conditions: string[];
    inventory: string[];
    activeEffects: string[];
  };
  sceneStatus: {
    currentAction: string;
    availableActions: string[];
    environmentalEffects: string[];
    threatLevel: 'none' | 'low' | 'medium' | 'high';
  };
  combat?: {
    isInCombat: boolean;
    activeEncounter?: {
      currentRound: number;
      phase: string;
      roundsElapsed: number;
      currentTurnParticipantId?: string;
      location?: string;
      visibility?: string;
      terrain?: string;
      environmentalEffects?: string[];
      participants: Array<{
        id: string;
        name: string;
        initiative: number;
        currentHitPoints: number;
        maxHitPoints: number;
        temporaryHitPoints: number;
        conditions: Array<{ name: string }>;
        deathSaves?: {
          successes: number;
          failures: number;
        };
      }>;
    };
  };
}

interface NarrationSegment {
  type: 'narration' | 'dialogue' | 'action' | 'thought';
  text: string;
  character?: string;
  voice_category?: string;
}

interface StructuredDMResponse {
  text: string;
  narration_segments: NarrationSegment[];
}

interface VoiceContext {
  available_categories: string[];
  character_mappings: Record<string, string>;
}

interface DMResponse {
  environment: {
    description: string;
    atmosphere: string;
    sensoryDetails: string[];
  };
  characters: {
    activeNPCs: string[];
    reactions: string[];
    dialogue: string;
  };
  opportunities: {
    immediate: string[];
    nearby: string[];
    questHooks: string[];
  };
  mechanics: {
    availableActions: string[];
    relevantRules: string[];
    suggestions: string[];
  };
}

interface ChatMessage {
  text: string;
  sender: string;
  context?: {
    emotion?: string;
    intent?: string;
  };
}

export default function aiRouter(db: Pool) {
  const router = Router();
  router.use(requireAuth);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  // Original AI respond endpoint
  router.post('/respond', async (req: Request, res: Response) => {
    const { provider, messages, systemPrompt } = req.body as {
      provider?: 'openai' | 'anthropic';
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      systemPrompt?: string;
    };

    try {
      if (provider === 'anthropic') {
        const response = await anthropic.messages.create({
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20240620',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
        });
        const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
        return res.json({ response: content });
      }

      // default to openai
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          ...messages,
        ],
        temperature: 0.9,
      });
      const text = completion.choices[0]?.message?.content || '';
      return res.json({ response: text });
    } catch (e) {
      console.error('AI error', e);
      return res.status(500).json({ error: 'AI request failed' });
    }
  });

  // Migrated from dm-agent-execute edge function
  router.post('/dm-agent-execute', async (req: Request, res: Response) => {
    try {
      const { task, agentContext, voiceContext, isFirstMessage = false, combatContext } = req.body;
      const { campaignDetails, characterDetails, memories = [] } = agentContext;

      console.log('Processing DM Agent task:', {
        taskType: task.description,
        campaign: campaignDetails?.name,
        character: characterDetails?.name,
        memoryCount: memories?.length,
        isFirstMessage: isFirstMessage,
        hasCombatContext: !!combatContext
      });

      // Sort memories by importance and recency
      const relevantMemories = memories
        .sort((a: Memory, b: Memory) => {
          const importanceDiff = (b.importance || 0) - (a.importance || 0);
          if (importanceDiff !== 0) return importanceDiff;
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        })
        .slice(0, 5);

      console.log('Using relevant memories:', relevantMemories.map((m: Memory) => ({
        content: m.content,
        importance: m.importance,
        type: m.type
      })));

      // Build prompt with memory, voice context, and combat context
      const prompt = buildDMPrompt({
        agentContext,
        memories: relevantMemories,
        combatContext: combatContext
      }, voiceContext, isFirstMessage);

      // Call Google Gemini with the enhanced prompt
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY not found in environment variables.');
      }
      
      console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...');
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
          {
            role: 'model',
            parts: [{ text: "Understood. I will generate a narrative response based on the provided context and task." }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 0.9,
          maxOutputTokens: 2048,
        },
      });

      const result = await chat.sendMessage(task.description);
      const aiResponse = await result.response;
      const rawResponse = aiResponse.text();

      if (!rawResponse) {
        throw new Error(`Gemini API error: No text in response`);
      }

      // Parse structured response if voice context provided
      let narrativeText = rawResponse;
      let narrationSegments: NarrationSegment[] | undefined;
      
      if (voiceContext) {
        try {
          const structuredResponse: StructuredDMResponse = JSON.parse(rawResponse);
          narrativeText = structuredResponse.text;
          narrationSegments = structuredResponse.narration_segments;
          console.log('Successfully parsed structured response with', narrationSegments?.length, 'segments');
        } catch (parseError) {
          console.warn('Failed to parse structured response, falling back to plain text:', parseError);
        }
      }

      // Generate environment and interactions
      const environment = generateEnvironment(campaignDetails, characterDetails);
      const interactions = generateInteractions(campaignDetails.world_id, characterDetails);

      // Build narrative response
      const narrativeResponse: DMResponse = {
        environment: {
          description: environment.description,
          atmosphere: environment.atmosphere,
          sensoryDetails: environment.sensoryDetails
        },
        characters: {
          activeNPCs: interactions.activeNPCs,
          reactions: interactions.reactions,
          dialogue: narrativeText
        },
        opportunities: {
          immediate: generateImmediateActions(campaignDetails, characterDetails),
          nearby: getKeyLocations(campaignDetails),
          questHooks: generateQuestHooks(memories, characterDetails)
        },
        mechanics: {
          availableActions: getAvailableActions(characterDetails),
          relevantRules: [],
          suggestions: generateActionSuggestions(campaignDetails, characterDetails)
        }
      };

      // Prepare response with narration segments if available
      const responseData: any = {
        response: narrativeText,
        context: agentContext,
        raw: narrativeResponse
      };

      // Add narration segments if they were parsed successfully
      if (narrationSegments) {
        responseData.narrationSegments = narrationSegments;
      }

      return res.json(responseData);
    } catch (error) {
      console.error('Error in DM agent execution:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Migrated from chat-ai edge function
  router.post('/chat-ai', async (req: Request, res: Response) => {
    try {
      console.log('Processing chat request...');
      
      const { messages, sessionId } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        console.error('Invalid messages format:', messages);
        throw new Error('Messages array is required');
      }

      if (!sessionId) {
        console.error('Missing sessionId');
        throw new Error('Session ID is required');
      }
      
      console.log('Request data:', { sessionId, messageCount: messages.length });
      
      // Get latest message context
      const latestMessage = messages[messages.length - 1];
      const context = latestMessage?.context || {};
      
      console.log('Fetching relevant memories...');
      
      // Fetch and score relevant memories
      const memories = await fetchRelevantMemories(db, sessionId, context);
      const scoredMemories = memories
        .map((memory: Memory) => ({
          memory,
          relevanceScore: calculateMemoryRelevance(memory, context)
        }))
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, 3);
      
      console.log(`Found ${scoredMemories.length} relevant memories`);
      
      // Format memory context
      const memoryContext = formatMemoryContext(scoredMemories);
      
      console.log('Generating AI response...');
      
      // Generate AI response
      const text = await generateAIResponse(messages, memoryContext);
      console.log('Generated AI response:', text);

      // Update memory importance based on AI response
      await updateMemoryImportance(db, memories, text);

      const response = {
        text,
        sender: 'dm',
        context: {
          emotion: 'neutral',
          intent: 'response',
        }
      };

      return res.json(response);
    } catch (error) {
      console.error('Error in chat-ai function:', error);
      return res.status(500).json({ 
        error: (error as Error).message,
        details: (error as Error).stack
      });
    }
  });

  // Migrated from text-to-speech edge function
  router.post('/text-to-speech', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      console.log('Received text input:', text);

      const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
      if (!ELEVEN_LABS_API_KEY) {
        throw new Error('Missing ElevenLabs API key');
      }

      // Using George voice and multilingual v2 model
      const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
      console.log('Making request to ElevenLabs API...');
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVEN_LABS_API_KEY,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('ElevenLabs API error:', error);
        throw new Error('Failed to convert text to speech');
      }

      const audioData = await response.arrayBuffer();
      console.log('Received audio response. Size:', audioData.byteLength, 'bytes');

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.byteLength.toString(),
      });
      
      return res.send(Buffer.from(audioData));
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Migrated from generate-embedding edge function
  router.post('/generate-embedding', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        throw new Error('Text is required');
      }

      // Clean and truncate text
      const cleanedText = text.substring(0, 1000).replace(/\n/g, ' ').trim();
      console.log('Processing text for embedding:', cleanedText);

      // Get OpenAI API key from environment
      const openAiKey = process.env.OPENAI_API_KEY;
      if (!openAiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Call OpenAI embeddings API
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiKey}`,
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
        throw new Error('Failed to generate embedding');
      }

      const data = await response.json();
      console.log('OpenAI API response:', JSON.stringify(data));

      // Extract embedding array from response
      const embedding = data.data[0].embedding;
      
      // Validate embedding format
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding format received');
      }

      // Format embedding for Supabase vector storage
      const vectorString = `[${embedding.join(',')}]`;
      console.log('Final vector string format:', vectorString);

      return res.json({ embedding: vectorString });
    } catch (error) {
      console.error('Error generating embedding:', error);
      return res.status(500).json({ 
        error: (error as Error).message,
        stack: (error as Error).stack 
      });
    }
  });

  // Migrated from generate-campaign-description edge function
  router.post('/generate-campaign-description', async (req: Request, res: Response) => {
    try {
      const { genre, difficulty, length, tone } = req.body;
      
      console.log('Generating campaign description for:', { genre, difficulty, length, tone });

      // Get Gemini API key
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY environment variable not set');
      }
      
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Generate a compelling campaign description for a ${genre} campaign with ${difficulty} difficulty, ${length} length, and a ${tone} tone. The description should be 2-3 paragraphs long and capture the essence of an exciting D&D adventure.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const description = response.text();

      console.log('Gemini API response generated successfully');

      return res.json({ description });
    } catch (error) {
      console.error('Error generating campaign description:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Migrated from rules-interpreter-execute edge function
  router.post('/rules-interpreter-execute', async (req: Request, res: Response) => {
    try {
      const { task, agentContext } = req.body;
      console.log('Processing rule validation request:', { task, agentContext });

      // Get relevant rule validations from the database
      const { rows: ruleValidations } = await db.query(
        'SELECT * FROM rule_validations WHERE rule_type = $1 AND is_active = true',
        [task.context?.ruleType]
      );

      const result = await validateRules(task, ruleValidations || []);

      return res.json(result);
    } catch (error) {
      console.error('Error in rules-interpreter-execute:', error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Migrated from get-secret edge function
  router.post('/get-secret', async (req: Request, res: Response) => {
    try {
      const { secretName } = req.body;
      
      if (!secretName) {
        throw new Error('Secret name is required');
      }

      // Get the secret value from process.env
      const secret = process.env[secretName];
      
      if (!secret) {
        throw new Error(`Secret ${secretName} not found`);
      }

      return res.json({ 
        secret,
        message: 'Secret retrieved successfully'
      });
    } catch (error) {
      console.error('Error:', (error as Error).message);
      return res.status(400).json({ 
        error: (error as Error).message 
      });
    }
  });

  return router;
}

// Helper functions migrated from edge functions
function buildDMPrompt(context: { agentContext: AgentContext; memories: Memory[]; combatContext?: CombatContext }, voiceContext?: VoiceContext, isFirstMessage = false): string {
  const { agentContext, memories, combatContext } = context;
  const { campaignDetails, characterDetails } = agentContext;

  let prompt = `You are an experienced Dungeon Master running a ${campaignDetails?.genre || 'fantasy'} campaign.\n\n`;

  // Campaign context
  if (campaignDetails) {
    prompt += `**Campaign: ${campaignDetails.name}**\n`;
    if (campaignDetails.description) prompt += `Description: ${campaignDetails.description}\n`;
    if (campaignDetails.setting_details) {
      const settings = campaignDetails.setting_details;
      if (settings.era) prompt += `Era: ${settings.era}\n`;
      if (settings.location) prompt += `Location: ${settings.location}\n`;
      if (settings.atmosphere) prompt += `Atmosphere: ${settings.atmosphere}\n`;
    }
    prompt += '\n';
  }

  // Character context
  if (characterDetails) {
    prompt += `**Player Character: ${characterDetails.name}**\n`;
    prompt += `Class: ${characterDetails.class}, Level: ${characterDetails.level}\n`;
    prompt += `Race: ${characterDetails.race}\n`;
    if (characterDetails.background) prompt += `Background: ${characterDetails.background}\n`;
    if (characterDetails.description) prompt += `Description: ${characterDetails.description}\n`;
    prompt += '\n';
  }

  // Combat context
  if (combatContext?.encounter?.status === 'active') {
    prompt += `**COMBAT ACTIVE**\n`;
    prompt += `Round: ${combatContext.encounter.currentRound}\n`;
    prompt += `Phase: ${combatContext.encounter.phase}\n`;
    if (combatContext.encounter.location) prompt += `Location: ${combatContext.encounter.location}\n`;
    if (combatContext.encounter.participants) {
      prompt += 'Participants:\n';
      combatContext.encounter.participants.forEach(p => {
        prompt += `- ${p.name}: ${p.currentHitPoints}/${p.maxHitPoints} HP, AC ${p.armorClass}\n`;
      });
    }
    prompt += '\n';
  }

  // Memory context
  if (memories.length > 0) {
    prompt += '**Relevant Campaign History:**\n';
    memories.forEach((memory, i) => {
      prompt += `${i + 1}. ${memory.content}\n`;
    });
    prompt += '\n';
  }

  // Voice context for structured response
  if (voiceContext) {
    prompt += '**RESPONSE FORMAT REQUIRED:**\n';
    prompt += 'You must respond with a valid JSON object in this exact format:\n';
    prompt += '{\n';
    prompt += '  "text": "[Complete narrative text for display]",\n';
    prompt += '  "narration_segments": [\n';
    prompt += '    {\n';
    prompt += '      "type": "narration|dialogue|action|thought",\n';
    prompt += '      "text": "[Segment text]",\n';
    prompt += '      "character": "[Character name if dialogue]",\n';
    prompt += '      "voice_category": "[Voice category if applicable]"\n';
    prompt += '    }\n';
    prompt += '  ]\n';
    prompt += '}\n\n';
    prompt += 'Available voice categories: ' + voiceContext.available_categories.join(', ') + '\n\n';
  }

  prompt += '**Your Task:**\n';
  prompt += 'Generate an immersive narrative response that:\n';
  prompt += '- Advances the story based on the player\'s action\n';
  prompt += '- Maintains consistency with campaign history and character\n';
  prompt += '- Describes the scene, environment, and any NPCs present\n';
  prompt += '- Provides clear options for the player\'s next action\n';
  if (combatContext?.encounter?.status === 'active') {
    prompt += '- Manages combat mechanics appropriately\n';
    prompt += '- Describes combat actions and their results clearly\n';
  }

  return prompt;
}

function generateEnvironment(campaignDetails: CampaignContext, characterDetails: CharacterContext) {
  return {
    description: `You find yourself in the ${campaignDetails?.genre || 'fantasy'} world of ${campaignDetails?.name || 'the campaign'}.`,
    atmosphere: campaignDetails?.tone || 'neutral',
    sensoryDetails: [
      'The air carries a sense of adventure.',
      'Your senses are alert to the possibilities ahead.'
    ]
  };
}

function generateInteractions(worldId: string, characterDetails: CharacterContext) {
  return {
    activeNPCs: ['Friendly merchant', 'Curious local'],
    reactions: ['People notice your presence', 'Some offer friendly nods'],
    dialogue: ''
  };
}

function generateImmediateActions(campaign: CampaignContext, character: CharacterContext): string[] {
  const actions = [
    'Explore the immediate area',
    'Talk to nearby locals',
    'Check your equipment'
  ];

  if (character?.class === 'Wizard') {
    actions.push('Study the magical atmosphere');
  }

  if (campaign.genre === 'dark-fantasy') {
    actions.push('Investigate the unsettling shadows');
  }

  return actions;
}

function getKeyLocations(campaign: CampaignContext): string[] {
  return campaign.thematic_elements?.keyLocations || [];
}

function generateQuestHooks(memories: Memory[], character: CharacterContext): string[] {
  return memories
    ?.filter(m => m.type === 'quest' && m.metadata?.status === 'available')
    ?.map(m => m.content)
    ?.filter(Boolean) || [];
}

function getAvailableActions(character: CharacterContext): string[] {
  const baseActions = ['Move', 'Interact', 'Attack'];
  
  if (character?.class === 'Wizard') {
    baseActions.push('Cast Spell');
  }
  
  return baseActions;
}

function generateActionSuggestions(campaign: CampaignContext, character: CharacterContext): string[] {
  const suggestions = [];
  
  if (campaign.genre === 'dark-fantasy') {
    suggestions.push('Remain vigilant');
    suggestions.push('Search for clues about the darkness');
  }

  if (character?.class === 'Wizard') {
    suggestions.push('Analyze magical anomalies');
  }

  return suggestions;
}

// Memory utility functions
async function fetchRelevantMemories(db: Pool, sessionId: string, context: any): Promise<Memory[]> {
  try {
    const result = await db.query(
      'SELECT * FROM memories WHERE session_id = $1 ORDER BY importance DESC, created_at DESC LIMIT 10',
      [sessionId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error fetching memories:', error);
    return [];
  }
}

function calculateMemoryRelevance(memory: Memory, context: any): number {
  let score = memory.importance || 0;
  
  // Boost score based on recency
  const daysSinceCreated = (Date.now() - new Date(memory.created_at || '').getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 10 - daysSinceCreated);
  
  return score;
}

function formatMemoryContext(scoredMemories: Array<{ memory: Memory; relevanceScore: number }>): string {
  if (scoredMemories.length === 0) return '';
  
  let context = 'Relevant memories:\n';
  scoredMemories.forEach(({ memory }, index) => {
    context += `${index + 1}. ${memory.content}\n`;
  });
  
  return context;
}

async function updateMemoryImportance(db: Pool, memories: Memory[], aiResponse: string): Promise<void> {
  // Simple importance update based on mention in AI response
  for (const memory of memories) {
    if (aiResponse.toLowerCase().includes(memory.content.toLowerCase().substring(0, 20))) {
      try {
        await db.query(
          'UPDATE memories SET importance = COALESCE(importance, 0) + 1 WHERE id = $1',
          [memory.id]
        );
      } catch (error) {
        console.error('Error updating memory importance:', error);
      }
    }
  }
}

async function generateAIResponse(messages: ChatMessage[], memoryContext: string): Promise<string> {
  // Simple AI response generation - could be enhanced with more sophisticated logic
  const lastMessage = messages[messages.length - 1];
  return `Thank you for your message: "${lastMessage.text}". I'll continue the adventure based on ${memoryContext ? 'our shared history' : 'this new beginning'}.`;
}

// Rules validation functions migrated from rules-interpreter-execute
interface RuleValidationRequest {
  task: {
    id: string;
    description: string;
    expectedOutput: string;
    context?: {
      ruleType: string;
      category?: string;
      data?: any;
    };
  };
  agentContext: {
    role: string;
    goal: string;
    backstory: string;
    ruleValidations?: any[];
  };
}

interface ValidationResult {
  isValid: boolean;
  validations: any[];
  reasoning: string;
  suggestions: string[];
  errors?: string[];
}

async function validateRules(task: RuleValidationRequest['task'], ruleValidations: any[]): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    validations: ruleValidations,
    reasoning: `Rule interpretation for task: ${task.description}`,
    suggestions: [],
    errors: []
  };

  switch (task.context?.ruleType) {
    case 'character_creation':
      return validateCharacterCreation(task, ruleValidations, result);
    case 'ability_scores':
      return validateAbilityScores(task, ruleValidations, result);
    case 'combat':
      return validateCombatRules(task, ruleValidations, result);
    case 'spellcasting':
      return validateSpellcasting(task, ruleValidations, result);
    default:
      result.suggestions.push('No specific validation type specified');
      return result;
  }
}

function validateCharacterCreation(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  
  // Validate race selection
  if (data?.race) {
    const raceRules = ruleValidations.find(r => 
      r.rule_category === 'race' && r.validation_data.races.includes(data.race)
    );
    
    if (!raceRules) {
      result.isValid = false;
      result.errors?.push(`Invalid race selection: ${data.race}`);
    }
  }

  // Validate class selection
  if (data?.class) {
    const classRules = ruleValidations.find(r => 
      r.rule_category === 'class' && r.validation_data.classes.includes(data.class)
    );
    
    if (!classRules) {
      result.isValid = false;
      result.errors?.push(`Invalid class selection: ${data.class}`);
    }
  }

  // Add suggestions for character optimization
  if (data?.race && data?.class) {
    const optimizationRules = ruleValidations.find(r => 
      r.rule_category === 'optimization' && 
      r.validation_data.combinations[data.race]?.includes(data.class)
    );
    
    if (optimizationRules) {
      result.suggestions.push(
        `${data.race} racial traits complement the ${data.class} class abilities`
      );
    }
  }

  return result;
}

function validateAbilityScores(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  
  if (!data?.abilityScores) {
    result.isValid = false;
    result.errors?.push('No ability scores provided');
    return result;
  }

  // Validate point-buy rules
  if (data.method === 'point-buy') {
    const pointBuyRules = ruleValidations.find(r => r.rule_category === 'point_buy');
    if (pointBuyRules) {
      const totalPoints = calculatePointBuyCost(data.abilityScores);
      if (totalPoints > pointBuyRules.validation_data.maxPoints) {
        result.isValid = false;
        result.errors?.push(`Point-buy total exceeds maximum (${pointBuyRules.validation_data.maxPoints})`);
      }
    }
  }

  // Validate minimum and maximum scores
  Object.entries(data.abilityScores).forEach(([ability, score]) => {
    const numScore = typeof score === 'number' ? score : Number(score);
    if (numScore < 8 || numScore > 15) {
      result.isValid = false;
      result.errors?.push(`${ability} score must be between 8 and 15`);
    }
  });

  return result;
}

function validateCombatRules(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  const action = data?.action;
  const participant = data?.participant;
  const encounter = data?.encounter;
  
  // Enhanced combat validation with real D&D 5e rules
  if (action && participant) {
    // Validate action economy
    if (action.actionType === 'attack' || action.actionType === 'cast_spell' || action.actionType === 'grapple' || action.actionType === 'shove') {
      if (participant.actionTaken) {
        result.isValid = false;
        result.errors?.push(`${participant.name} has already used their action this turn`);
      }
    }
    
    if (action.actionType === 'bonus_action' && participant.bonusActionTaken) {
      result.isValid = false;
      result.errors?.push(`${participant.name} has already used their bonus action this turn`);
    }
    
    if (['reaction', 'opportunity_attack', 'counterspell', 'deflect_missiles'].includes(action.actionType) && participant.reactionTaken) {
      result.isValid = false;
      result.errors?.push(`${participant.name} has already used their reaction this turn`);
    }
    
    // Validate conditions affecting actions
    const incapacitatingConditions = ['stunned', 'paralyzed', 'unconscious', 'petrified'];
    const hasIncapacitatingCondition = participant.conditions?.some((c: any) => 
      incapacitatingConditions.includes(c.name)
    );
    
    if (hasIncapacitatingCondition) {
      result.isValid = false;
      result.errors?.push(`${participant.name} is incapacitated and cannot take actions`);
    }
  }
  
  // Validate encounter state
  if (encounter) {
    if (encounter.phase !== 'active') {
      result.isValid = false;
      result.errors?.push('Combat is not currently active');
    }
    
    // Check if it's the participant's turn
    if (encounter.currentTurnParticipantId !== participant?.id) {
      result.isValid = false;
      result.errors?.push(`It is not ${participant?.name}'s turn`);
    }
  }

  return result;
}

function validateSpellcasting(
  task: RuleValidationRequest['task'],
  ruleValidations: any[],
  result: ValidationResult
): ValidationResult {
  const data = task.context?.data;
  
  if (data?.spell) {
    const spellRules = ruleValidations.find(r => 
      r.rule_category === 'spellcasting' && 
      r.validation_data.spells[data.spell]
    );
    
    if (spellRules) {
      const spellValidation = spellRules.validation_data.spells[data.spell];
      
      // Validate spell slot usage
      if (data.spellLevel < spellValidation.minLevel) {
        result.isValid = false;
        result.errors?.push(`Spell slot level too low for ${data.spell}`);
      }
      
      // Validate components
      spellValidation.components?.forEach((component: string) => {
        if (!data.availableComponents?.includes(component)) {
          result.suggestions.push(`${data.spell} requires ${component}`);
        }
      });
    }
  }

  return result;
}

function calculatePointBuyCost(scores: Record<string, number>): number {
  const costTable: Record<number, number> = {
    8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
  };
  
  return Object.values(scores).reduce((total, score) => total + (costTable[score] || 0), 0);
}