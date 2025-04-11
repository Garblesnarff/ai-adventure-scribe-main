import { AgentContext, GameState } from './types.ts';

function formatMemories(memories: any[]) {
  // Sort memories by importance and recency
  return memories
    .sort((a, b) => {
      const importanceDiff = (b.importance || 0) - (a.importance || 0);
      if (importanceDiff !== 0) return importanceDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .map(m => `- ${m.content} (Type: ${m.type}, Importance: ${m.importance})`)
    .join('\n');
}

function formatGameState(state: GameState) {
  return `
CURRENT SCENE STATE:
Location: ${state.location?.name || 'Unknown'}
Time of Day: ${state.location?.timeOfDay || 'Unknown'}
Atmosphere: ${state.location?.atmosphere || 'Neutral'}

Active NPCs:
${state.activeNPCs?.map(npc => `- ${npc.name}: ${npc.currentStatus}`).join('\n') || 'None'}

Scene Status:
- Current Action: ${state.sceneStatus?.currentAction || 'None'}
- Threat Level: ${state.sceneStatus?.threatLevel || 'none'}
${state.sceneStatus?.environmentalEffects?.length ? `- Environmental Effects: ${state.sceneStatus.environmentalEffects.join(', ')}` : ''}
`;
}

export function buildPrompt(context: AgentContext): string {
  const { campaignContext, characterContext, memories, gameState } = context;
  
  // Format recent memories for context
  const recentMemories = formatMemories(memories);

  return `
You are an expert Dungeon Master running a ${campaignContext.genre} campaign called "${campaignContext.name}". 
Your responses should be dynamic, engaging, and maintain perfect narrative consistency.

CAMPAIGN CONTEXT:
Era: ${campaignContext.setting_details?.era || 'Standard Fantasy'}
Location: ${campaignContext.setting_details?.location || 'Unknown'}
Atmosphere: ${campaignContext.setting_details?.atmosphere || campaignContext.genre}
${campaignContext.description ? `\nCAMPAIGN DESCRIPTION:\n${campaignContext.description}` : ''}

CHARACTER DETAILS:
You are guiding ${characterContext.name}, a level ${characterContext.level} ${characterContext.race} ${characterContext.class}.
Background: ${characterContext.background}
Alignment: ${characterContext.alignment}
${characterContext.description ? `Description: ${characterContext.description}` : ''}

${gameState ? formatGameState(gameState) : ''}

RECENT MEMORIES AND EVENTS:
${recentMemories}

RESPONSE GUIDELINES:
1. Maintain Scene Consistency:
   - Keep track of current location, NPCs, and time of day
   - Only reference events that actually happened in memories
   - Maintain NPC personalities and relationships
   - Progress the scene naturally based on player actions

2. Response Structure:
   - Scene Description: Current location and atmosphere
   - NPC Interactions: Active characters and their reactions
   - Available Actions: Clear choices based on the situation
   - Environmental Details: Sensory information and effects

3. Memory Integration:
   - Reference relevant past interactions
   - Show consequences of previous choices
   - Maintain continuity with established events
   - Use actual memories, never invent false ones

Remember to:
- Keep the ${campaignContext.tone || 'balanced'} tone consistent
- Maintain the established atmosphere
- Progress time naturally
- Keep NPCs consistent in personality and behavior
- Only reference events from actual memories
- Provide clear, contextual choices`;
}