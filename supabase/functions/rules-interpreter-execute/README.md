# Rules Interpreter Execute Edge Function

## Purpose

This Supabase Edge Function is designed to interpret and enforce game rules. It likely takes a specific game situation, a player's intended action, or a query about rules as input. It then processes this against a defined ruleset (which could be hardcoded, configurable, or even understood by an LLM) and returns a judgment, validation, or explanation.

## Structure and Important Files

- **`index.ts`**: The main Deno server entry point for this Edge Function. It handles incoming HTTP requests, which would contain the context of the rule query or action to be validated.
- **(Potentially) `rulesEngine.ts` or similar**: A module containing the core logic for rule evaluation. This could be:
    - A programmatic rules engine with predefined D&D rules.
    - Logic to consult a knowledge base or a specialized part of the game's database where rules are stored.
    - Logic to format a prompt for an LLM (like Google Gemini) to interpret the rule in the given context.
- **(Potentially) `promptBuilder.ts`**: If an LLM is used for rule interpretation, this would construct the prompt, providing the LLM with the game context, the player's action, and the specific rule or area of rules to consider.
- **(Potentially) `types.ts`**: Defines TypeScript types for the inputs (e.g., game state, action details, rule query) and outputs (e.g., validation result, rule explanation, consequences).

## How Components Interact

1.  This function could be invoked by:
    - The `dm-agent-execute` function when it needs to verify if a player's complex action is permissible under game rules before generating the narrative.
    - The frontend client directly, if there's a UI feature for players to ask about rules or check action validity.
    - An automated game logic service.
2.  The payload to the function would include the current game context (e.g., character stats, location, situation) and the specific action or rule query.
3.  `index.ts` receives the request.
4.  It passes the information to its internal rules engine or LLM interaction module.
    - If using an LLM, a prompt is built to ask the LLM to act as a "Rules Lawyer" or "Game Master Assistant" to interpret the rule.
5.  The rules engine/LLM processes the information and determines the outcome (e.g., action is valid/invalid, explanation of a rule).
6.  `index.ts` formats this outcome and returns it to the caller.

## Usage Example (Client-side or other function's invocation)

```typescript
// Conceptual example:
import { supabase } from '@/integrations/supabase/client'; // Or server-side client

interface RuleCheckPayload {
  action: string; // e.g., "Cast Fireball"
  characterContext: any; // Character stats, abilities, etc.
  gameStateContext: any; // Current game scene, combat state, etc.
  ruleQuery?: string; // e.g., "Can I use two bonus actions?"
}

async function checkRule(payload: RuleCheckPayload) {
  const { data, error } = await supabase.functions.invoke('rules-interpreter-execute', {
    body: payload
  });

  if (error) {
    console.error("Error interpreting rule:", error);
    return { valid: false, message: "Error checking rule." };
  }
  // data might be { valid: true, message: "Action is permissible.", consequences: [] }
  // or { ruleExplanation: "A character can only take one bonus action per turn." }
  return data;
}

// // Example usage:
// const result = await checkRule({
//   action: "Attempt to pickpocket the guard",
//   characterContext: { dexterity: 16, proficiency_in_sleight_of_hand: true },
//   gameStateContext: { guard_is_alert: false }
// });
// console.log(result.message);
```

## Notes

- This function is crucial for maintaining game fairness and consistency according to the D&D ruleset (or the game's specific rules).
- The complexity of this function can vary greatly depending on whether it uses a programmatic engine or relies on LLM interpretation for rules.
- If using an LLM, careful prompt engineering is needed to ensure accurate and unbiased rule interpretations.
- See the main `/supabase/functions/README.md` for the overall Edge Functions architecture. Also, see `/src/agents/rules/` for client-side rule-related logic.
