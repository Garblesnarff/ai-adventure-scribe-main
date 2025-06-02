# Get Secret Edge Function

## Purpose

This Supabase Edge Function is a utility designed to securely retrieve sensitive secrets (such as API keys for LLMs, database passwords for external services, etc.) from environment variables configured within the Supabase project. It acts as a centralized and secure way for other Edge Functions to access the credentials they need without hardcoding them or exposing them directly in client-side code.

## Structure and Important Files

- **`index.ts`**: The main Deno server entry point. It typically expects a `secretName` (the name of the environment variable to retrieve) in the request body. It then uses `Deno.env.get(secretName)` to fetch the value and returns it.

## How Components Interact

1.  Other Supabase Edge Functions (e.g., `dm-agent-execute`, `generate-embedding`, `chat-ai`, `text-to-speech`) that require API keys or other secrets invoke this `get-secret` function during their initialization or before making an external API call.
2.  The calling function sends a payload usually containing `{ "secretName": "MY_API_KEY_NAME" }`.
3.  `index.ts` in `get-secret` receives the request.
4.  It retrieves the value of the requested environment variable using `Deno.env.get()`.
5.  It returns the secret value (or an error if not found) to the calling function.
6.  The calling function then uses this retrieved secret in its subsequent operations (e.g., setting the Authorization header for an API call).

## Usage Example (Invoked by another Edge Function)

```typescript
// Conceptual example from within another Supabase Edge Function (e.g., dm-agent-execute/index.ts):

// This import might be different in Deno, possibly a direct fetch or a shared client
// import { supabaseAdmin } from '../_shared/supabaseAdminClient'; 

async function getApiKey(secretName: string): Promise<string | null> {
  // In a real Deno environment, this might be a direct call or using an admin client
  // For simplicity, showing conceptual Supabase client usage:
  const { data, error } = await supabase.functions.invoke('get-secret', {
     body: { secretName }
  });

  if (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    return null;
  }
  return data?.secret; // Assuming the function returns { secret: "value" }
}

// Later in the function:
// const geminiApiKey = await getApiKey('GEMINI_API_KEY');
// if (geminiApiKey) {
//   // Use the key
// } else {
//   // Handle missing key
// }

// More commonly, within a Deno function, you might access Deno.env directly IF the calling function
// itself has access. This 'get-secret' function is more for centralizing access patterns or if
// you want to abstract away the Deno.env.get for some reason, or add logging/auditing around secret access.
// However, the primary use case for `get-secret` is if the client needs to tell a function what secret to use,
// which is less common than functions directly accessing their own necessary env vars.

// A more typical pattern for a function needing a secret is:
// const apiKey = Deno.env.get("MY_SPECIFIC_API_KEY");
// if (!apiKey) throw new Error("API Key not found!");
// This `get-secret` function might be more useful if a *client* needs to specify *which* configured
// secret a generic function should use, or for some indirection.
```

**Simplified Direct Usage (More Common for Edge Functions):**

Most Supabase Edge Functions will directly access their required secrets via `Deno.env.get("SECRET_NAME")` if those secrets are set in the Supabase project's environment variables for that function.

The `get-secret` function, as described, could be useful if:
- You want to abstract the `Deno.env.get` call for testing or logging.
- You have a scenario where the *name* of the secret to be used is dynamic and passed in the request.

However, the previous implementation of `dm-agent-execute` showed it calling `Deno.env.get('GEMINI_API_KEY')` directly. If this pattern is followed, `get-secret` might be less frequently used by other *functions* and more as a utility if ever needed by the client to ask the backend to retrieve a *specific, named* secret on its behalf (which should be done with caution).

## Notes

- Secrets should be configured in the Supabase project settings under "Environment Variables".
- This function helps avoid hardcoding sensitive information.
- Ensure that access to this function is appropriately secured if it can return arbitrary secrets based on name. Usually, Edge Functions have their own scope for environment variables.
- See the main `/supabase/functions/README.md` for the overall Edge Functions architecture.
