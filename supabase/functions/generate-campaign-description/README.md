# Generate Campaign Description Edge Function

## Purpose

This Supabase Edge Function uses a Large Language Model (LLM), likely Google Gemini, to automatically generate a compelling and creative description for a new D&D campaign based on user-provided inputs such as campaign name, genre, key themes, or other initial parameters.

## Structure and Important Files

- **`index.ts`**: The main Deno server entry point for this Edge Function. It handles incoming HTTP requests, which include the basic campaign parameters provided by the user during the campaign creation process. It then calls the LLM and returns the generated description.
- **(Potentially) `promptBuilder.ts` or similar**: A helper module to construct a specific prompt for the LLM, guiding it to generate a suitable campaign description based on the input parameters.
- **(Potentially) `types.ts`**: Defines TypeScript types for the expected input (e.g., campaign name, genre, keywords) and output (the generated description string).

## How Components Interact

1.  The frontend client (likely from the campaign creation wizard, e.g., `src/components/campaign-creation/campaign-wizard.tsx`) invokes this Edge Function when the user requests an auto-generated description.
2.  The payload sent to the function includes key campaign parameters entered by the user.
3.  `index.ts` receives these parameters.
4.  It (or a `promptBuilder.ts`) constructs a prompt for the LLM, instructing it to act as a creative writer and generate a campaign description. The prompt includes the user-provided parameters as context.
5.  An API call is made to the LLM (e.g., Google Gemini). The API key is retrieved securely.
6.  The LLM generates a campaign description based on the prompt.
7.  `index.ts` receives this description and returns it to the client.
8.  The client-side campaign creation form can then display this generated description, allowing the user to accept or edit it.

## Usage Example (Client-side invocation)

```typescript
// Conceptual example from the campaign creation UI:
import { supabase } from '@/integrations/supabase/client';

async function generateDescription(campaignName: string, genre: string, themes: string[]) {
  const { data, error } = await supabase.functions.invoke('generate-campaign-description', {
    body: { name: campaignName, genre, keywords: themes } // Example payload
  });

  if (error) {
    console.error("Error generating campaign description:", error);
    return "Failed to generate description.";
  }
  // data would ideally be { description: "Generated text..." }
  return data.description || "No description generated.";
}
```

## Notes

- This function enhances the campaign creation process by providing users with AI-assisted content generation.
- The quality of the generated description heavily depends on the prompt engineering used and the capabilities of the LLM.
- Consider adding controls for users to influence the style or length of the generated description.
- See the main `/supabase/functions/README.md` for the overall Edge Functions architecture.
