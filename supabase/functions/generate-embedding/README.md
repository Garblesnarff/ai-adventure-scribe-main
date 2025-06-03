# Generate Embedding Edge Function

## Purpose

This Supabase Edge Function is responsible for generating vector embeddings for given text content. Vector embeddings are numerical representations of text that capture semantic meaning, allowing for tasks like similarity searches. This function is crucial for the game's memory system, as it converts dialogue, actions, and observations into vectors that can be efficiently searched and retrieved.

## Structure and Important Files

- **`index.ts`**: The main Deno server entry point. It receives text content as input, calls an embedding model (likely via an LLM provider's API that offers embedding models, or a dedicated embedding service), and returns the generated vector.
- **(Potentially) `embeddingClient.ts` or similar**: If the interaction with the embedding model provider is complex, it might be encapsulated in a separate client module.

## How Components Interact

1.  This function is typically called by other backend processes or Edge Functions whenever new text content needs to be vectorized. For example:
    - The `useMemoryCreation.ts` hook (or a service it calls) on the client-side might invoke this function after content segmentation and classification to get embeddings before saving memories to the database.
    - Alternatively, a database trigger on the `memories` table could call this function when a new memory with raw text is inserted.
2.  `index.ts` receives the text content.
3.  It makes an API call to an embedding model endpoint (e.g., Google Gemini APIs can provide embedding models, or a service like OpenAI's embeddings API, or a self-hosted sentence transformer). The relevant API key is retrieved securely.
4.  The embedding model processes the text and returns a vector (an array of numbers).
5.  `index.ts` returns this vector to the caller.
6.  The caller then stores this embedding alongside the original text content in the `memories` table (or other relevant tables).

## Usage Example (Server-side or other function's invocation)

```typescript
// Conceptual server-side example (e.g., from another Supabase function or a hook that calls it):
import { supabase } from '@/integrations/supabase/client'; // Or server-side Supabase client

async function getEmbeddingForText(textToEmbed: string): Promise<number[] | null> {
  const { data, error } = await supabase.functions.invoke('generate-embedding', {
    body: { text: textToEmbed }
  });

  if (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
  // data would ideally be { embedding: [0.1, 0.2, ...] }
  return data.embedding || null;
}

// // Example usage when creating a memory:
// const memoryContent = "The old willow tree whispered secrets of the ancient ones.";
// const embeddingVector = await getEmbeddingForText(memoryContent);
// if (embeddingVector) {
//   // Save memoryContent and embeddingVector to the database
// }
```

## Notes

- The choice of embedding model can significantly impact the quality of semantic search and memory retrieval.
- This function is a key part of the "Memory, Encoding, Storage, Retrieval" loop.
- Ensure the dimensionality of the generated embeddings is consistent with what the vector database (e.g., pgvector in Supabase) expects.
- API key management for the embedding service is critical.
- See the main `/supabase/functions/README.md` for the overall Edge Functions architecture.
