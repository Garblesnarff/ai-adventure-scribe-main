# DM Agent Execute Edge Function

## Purpose

This is the core Supabase Edge Function for the AI Dungeon Master. It processes player actions, incorporates game context (campaign details, character information, memories), interacts with the primary Large Language Model (Google Gemini), and generates the main narrative, game state updates, and NPC responses for the D&D game.

## Structure and Important Files

- **`index.ts`**: The main Deno server entry point for this Edge Function. It handles incoming HTTP requests, orchestrates the various steps, and returns the AI DM's response.
- **`promptBuilder.ts`**: Constructs the detailed prompt to be sent to the LLM. It takes various pieces of context (campaign, character, memories, current task) and formats them into a structured prompt designed to elicit a high-quality narrative response from the LLM.
- **`types.ts`**: Defines TypeScript types and interfaces for the inputs (e.g., `AgentTask`, `AgentContext`) and outputs (e.g., `DMResponse`, structured narrative) of this function.
- **`generators/`**: (If present, or logic integrated within `index.ts`) May contain specialized modules for generating specific parts of the response *after* the LLM call, or for preparing data.
    - **`CharacterInteractionGenerator.ts`**: Could be responsible for detailing NPC actions, dialogue, or reactions based on the LLM's core narrative.
    - **`EnvironmentGenerator.ts`**: Could detail environmental descriptions or changes.
- **`contextBuilder.ts`**: (If present) Might be responsible for aggregating and structuring the various pieces of context (campaign, character, memories, game state) before they are passed to the `promptBuilder.ts`.
- **`dm-agent-execute.test.ts`**: Contains integration tests for this function, focusing on mocking the LLM call and verifying the input/output structure.

## How Components Interact

1.  The frontend client (via `useAIResponse` hook) invokes this Edge Function with a payload containing the current `task` (e.g., player's action) and `agentContext` (campaign details, character details, recent memories).
2.  `index.ts` receives the request.
3.  It may use `contextBuilder.ts` to further refine or gather more context if needed.
4.  Relevant memories are sorted and selected.
5.  `promptBuilder.ts` constructs a comprehensive prompt using all available context and the player's current task/action.
6.  `index.ts` makes an API call to Google Gemini using the constructed prompt. The API key for Gemini is retrieved securely (e.g., from Deno environment variables).
7.  The narrative text from Gemini's response is received.
8.  Additional generators (e.g., in `generators/`) might be used to structure this text or add further details (like specific NPC reactions or environmental cues if not fully detailed by the LLM).
9.  `index.ts` formats the final structured response (`DMResponse`) and sends it back to the client.

## Usage Example (Client-side invocation)

```typescript
// From useAIResponse.ts or similar:
import { supabase } from '@/integrations/supabase/client';

async function executeDMAgentTask(task: AgentTask, agentContext: AgentContext) {
  const { data, error } = await supabase.functions.invoke('dm-agent-execute', {
    body: { task, agentContext }
  });

  if (error) {
    console.error("Error calling dm-agent-execute:", error);
    throw error;
  }
  // data would contain { response: narrativeText, context: agentContext, raw: DMResponse }
  return data;
}
```

## Notes

- This function is central to the gameplay experience. Its performance and the quality of its prompts directly impact the quality of the AI DM.
- Prompt engineering in `promptBuilder.ts` is critical.
- Secure management of the LLM API key is essential.
- Error handling should be robust to manage LLM API failures or unexpected responses.
- See the main `/supabase/functions/README.md` for the overall Edge Functions architecture.
