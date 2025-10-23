import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { CharacterInteractionGenerator } from "./generators/CharacterInteractionGenerator.ts";
import { EnvironmentGenerator } from "./generators/EnvironmentGenerator.ts";
import { buildPrompt } from "./promptBuilder.ts";
import { DMResponse, StructuredDMResponse, VoiceContext, NarrationSegment } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-release, x-environment',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  try {
    const { task, agentContext, voiceContext, isFirstMessage = false, combatContext } = await req.json();
    const { campaignDetails, characterDetails, memories = [] } = agentContext;

    console.log('Processing DM Agent task:', {
      requestId,
      taskType: task.description,
      campaign: campaignDetails?.name,
      character: characterDetails?.name,
      memoryCount: memories?.length,
      isFirstMessage: isFirstMessage,
      hasCombatContext: !!combatContext
    });

    // Sort memories by importance and recency
    const relevantMemories = memories
      .sort((a, b) => {
        const importanceDiff = (b.importance || 0) - (a.importance || 0);
        if (importanceDiff !== 0) return importanceDiff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5); // Get top 5 most relevant memories

    console.log('Using relevant memories:', relevantMemories.map(m => ({
      content: m.content,
      importance: m.importance,
      type: m.type,
      requestId,
    })));

    const environmentGen = new EnvironmentGenerator();
    const interactionGen = new CharacterInteractionGenerator();

    // Build prompt with memory, voice context, and combat context
    const prompt = buildPrompt({
      agentContext,
      memories: relevantMemories,
      combatContext: combatContext
    }, voiceContext, isFirstMessage);

    // Call Google Gemini with the enhanced prompt
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GOOGLE_GEMINI_API_KEY') || '';
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables. Please set GEMINI_API_KEY in Supabase secrets.');
    }
    
    console.log('Using Gemini API key:', geminiApiKey.substring(0, 10) + '...', { requestId });
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

    const chat = model.startChat({
      history: [
        {
          role: 'user', // User role for the initial system prompt
          parts: [prompt],
        },
        {
          role: 'model', // Model role for an example of expected output structure or tone (optional)
          parts: ["Understood. I will generate a narrative response based on the provided context and task."]
        }
      ],
      generationConfig: {
        temperature: 0.7, // Adjusted for narrative generation
        topK: 1,
        topP: 0.9, // Adjusted for narrative generation
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
        console.log('Successfully parsed structured response with', narrationSegments?.length, 'segments', { requestId });
      } catch (parseError) {
        console.warn('Failed to parse structured response, falling back to plain text:', parseError, { requestId });
        // Keep narrativeText as rawResponse for backward compatibility
      }
    }

    // Generate environment and interactions using the AI response
    const environment = environmentGen.generateEnvironment(campaignDetails, characterDetails);
    const interactions = interactionGen.generateInteractions(
      campaignDetails.world_id,
      characterDetails
    );

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
        dialogue: narrativeText // Use the AI-generated narrative
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
      raw: narrativeResponse,
      requestId,
    };

    // Add narration segments if they were parsed successfully
    if (narrationSegments) {
      responseData.narrationSegments = narrationSegments;
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
      }
    );
  } catch (error: any) {
    console.error('Error in DM agent execution:', error, { requestId });
    return new Response(
      JSON.stringify({ error: error.message, requestId }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
      }
    );
  }
});

function formatNarrativeResponse(response: DMResponse, character: any): string {
  const { environment, characters, opportunities } = response;
  
  const narrative = [
    // Scene description with environment and sensory details
    environment.description,
    ...environment.sensoryDetails,

    // Character interactions and NPC reactions
    '',
    characters.dialogue,
    ...characters.reactions,

    // Available opportunities and actions
    '\nBefore you:',
    ...opportunities.immediate.map(action => `- ${action}`),

    // Nearby locations of interest
    '\nNearby:',
    ...opportunities.nearby.map(location => `- ${location}`),

    // Quest hooks if any
    opportunities.questHooks.length > 0 ? '\nRumors speak of:' : '',
    ...opportunities.questHooks.map(quest => `- ${quest}`),

    // Closing prompt based on character class
    '',
    getClassSpecificPrompt(character.class)
  ].filter(Boolean).join('\n');

  return narrative;
}

function getClassSpecificPrompt(characterClass: string): string {
  const prompts: Record<string, string> = {
    'Wizard': 'What would you like to do, esteemed wielder of the arcane?',
    'Fighter': 'What is your next move, brave warrior?',
    'Rogue': 'How do you wish to proceed, master of shadows?',
    'Cleric': 'What path calls to you, blessed one?'
  };
  
  return prompts[characterClass] || 'What would you like to do?';
}

// Helper functions for generating actions, locations, and quest hooks
function generateImmediateActions(campaign: any, character: any): string[] {
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

function getKeyLocations(campaign: any): string[] {
  return campaign.thematic_elements?.keyLocations || [];
}

function generateQuestHooks(memories: any[], character: any): string[] {
  return memories
    ?.filter(m => m.type === 'quest' && m.metadata?.status === 'available')
    ?.map(m => m.content)
    ?.filter(Boolean) || [];
}

function getAvailableActions(character: any): string[] {
  const baseActions = ['Move', 'Interact', 'Attack'];
  
  if (character?.class === 'Wizard') {
    baseActions.push('Cast Spell');
  }
  
  return baseActions;
}

function generateActionSuggestions(campaign: any, character: any): string[] {
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
