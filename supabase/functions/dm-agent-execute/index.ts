import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { CharacterInteractionGenerator } from "./generators/CharacterInteractionGenerator.ts";
import { EnvironmentGenerator } from "./generators/EnvironmentGenerator.ts";
import { buildPrompt } from "./promptBuilder.ts";
import { DMResponse } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { task, agentContext } = await req.json();
    const { campaignDetails, characterDetails, memories = [] } = agentContext;

    console.log('Processing DM Agent task:', {
      taskType: task.description,
      campaign: campaignDetails?.name,
      character: characterDetails?.name,
      memoryCount: memories?.length
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
      type: m.type
    })));

    const environmentGen = new EnvironmentGenerator();
    const interactionGen = new CharacterInteractionGenerator();

    // Build prompt with memory context
    const prompt = buildPrompt({
      campaignContext: campaignDetails,
      characterContext: characterDetails,
      memories: relevantMemories
    });

    // Call Google Gemini with the enhanced prompt
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: [
        {
          role: 'user', // User role for the initial system prompt
          parts: prompt,
        },
        {
          role: 'model', // Model role for an example of expected output structure or tone (optional)
          parts: "Understood. I will generate a narrative response based on the provided context and task."
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
    const narrativeText = aiResponse.text();

    if (!narrativeText) {
      throw new Error(`Gemini API error: No text in response`);
    }

    // Generate environment and interactions using the AI response
    const environment = environmentGen.generateEnvironment(campaignDetails, characterDetails);
    const interactions = await interactionGen.generateInteractions(
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

    return new Response(
      JSON.stringify({
        response: narrativeText,
        context: agentContext,
        raw: narrativeResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in DM agent execution:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
