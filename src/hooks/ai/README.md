# AI Interaction Hooks & Utilities

## Purpose

This directory contains custom React hooks and utility functions specifically designed to manage interactions with AI services, format AI requests, and process AI responses. These are distinct from the core agent logic in `src/agents/` but facilitate the frontend's communication with those agents or AI backends.

## Structure and Important Files

- **`ai-utils.ts`**: This file likely contains utility functions related to AI interactions. This could include:
    - Formatting data for AI prompts.
    - Parsing or transforming AI responses.
    - Helper functions for specific AI tasks (e.g., summarizing text, extracting keywords) if not handled by a dedicated backend agent.
    - Constants related to AI models or parameters.

*(Other hooks or utilities might be added here, for example, `useSpecificAIModel.ts` if there were direct frontend interactions with different models for specialized tasks, though most core AI logic is expected to be backend via Supabase functions).*

## How Components Interact

- Hooks from this directory (if any were present, e.g., `useChatCompletion.ts` if a direct OpenAI call was made from frontend) would be used by UI components (e.g., in `src/components/game/`) to send requests to AI services and receive responses.
- Utility functions in `ai-utils.ts` would be imported and used by other hooks (like `use-ai-response.ts` or `use-agent-system.ts` from the parent `src/hooks/` directory) or components that need to prepare data for or process data from AI.
- For instance, `use-ai-response.ts` might use functions from `ai-utils.ts` to structure the context being sent to the `dm-agent-execute` function.

## Usage Example

```typescript
// Conceptual example of using a utility function:
// Assuming ai-utils.ts has a function like formatContextForAI

import { formatContextForAI } from '@/hooks/ai/ai-utils';
import { useCharacter } from '@/contexts/CharacterContext';
import { useCampaign } from '@/contexts/CampaignContext';

const MyComponent = () => {
  const { character } = useCharacter().state;
  const { campaign } = useCampaign().state;

  const prepareAIContext = () => {
    const rawContext = { character, campaign, currentScene: "A dark forest" };
    // const formatted = formatContextForAI(rawContext); // This function would be in ai-utils.ts
    // sendToAI(formatted);
  };

  // ...
};
```

## Notes

- This directory helps keep AI-specific frontend logic organized.
- The primary interaction with AI is expected to be through more general hooks like `use-ai-response.ts`, which in turn call Supabase Edge Functions where the core AI agent logic resides. These utilities support that process.
- See the main `/src/hooks/README.md` for an overview of all custom hooks.
