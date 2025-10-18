import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ChatMessage } from './types.ts';
import { 
  fetchRelevantMemories, 
  calculateMemoryRelevance, 
  updateMemoryImportance,
  formatMemoryContext 
} from './memory-utils.ts';
import { generateAIResponse } from './ai-handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-release, x-environment',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  try {
    console.log('Processing chat request...', { requestId });
    
    const { messages, sessionId } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages, { requestId });
      throw new Error('Messages array is required');
    }

    if (!sessionId) {
      console.error('Missing sessionId', { requestId });
      throw new Error('Session ID is required');
    }
    
    console.log('Request data:', { sessionId, messageCount: messages.length, requestId });
    
    // Get latest message context
    const latestMessage = messages[messages.length - 1];
    const context = latestMessage?.context || {};
    
    console.log('Fetching relevant memories...', { requestId });
    
    // Fetch and score relevant memories
    const memories = await fetchRelevantMemories(sessionId, context);
    const scoredMemories = memories
      .map(memory => ({
        memory,
        relevanceScore: calculateMemoryRelevance(memory, context)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3); // Keep top 3 most relevant memories
    
    console.log(`Found ${scoredMemories.length} relevant memories`, { requestId });
    
    // Format memory context
    const memoryContext = formatMemoryContext(scoredMemories);
    
    console.log('Generating AI response...', { requestId });
    
    // Generate AI response
    const text = await generateAIResponse(messages, memoryContext);
    console.log('Generated AI response:', text, { requestId });

    // Update memory importance based on AI response
    await updateMemoryImportance(memories, text);

    const response = {
      text,
      sender: 'dm',
      context: {
        emotion: 'neutral',
        intent: 'response',
      },
      requestId,
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-request-id': requestId,
        } 
      },
    );
  } catch (error: any) {
    console.error('Error in chat-ai function:', error, { requestId });
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        requestId,
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-request-id': requestId,
        }
      },
    );
  }
});
