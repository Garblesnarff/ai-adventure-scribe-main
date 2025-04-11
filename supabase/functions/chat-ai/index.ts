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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing chat request...');
    
    const { messages, sessionId } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages format:', messages);
      throw new Error('Messages array is required');
    }

    if (!sessionId) {
      console.error('Missing sessionId');
      throw new Error('Session ID is required');
    }
    
    console.log('Request data:', { sessionId, messageCount: messages.length });
    
    // Get latest message context
    const latestMessage = messages[messages.length - 1];
    const context = latestMessage?.context || {};
    
    console.log('Fetching relevant memories...');
    
    // Fetch and score relevant memories
    const memories = await fetchRelevantMemories(sessionId, context);
    const scoredMemories = memories
      .map(memory => ({
        memory,
        relevanceScore: calculateMemoryRelevance(memory, context)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3); // Keep top 3 most relevant memories
    
    console.log(`Found ${scoredMemories.length} relevant memories`);
    
    // Format memory context
    const memoryContext = formatMemoryContext(scoredMemories);
    
    console.log('Generating AI response...');
    
    // Generate AI response
    const text = await generateAIResponse(messages, memoryContext);
    console.log('Generated AI response:', text);

    // Update memory importance based on AI response
    await updateMemoryImportance(memories, text);

    const response = {
      text,
      sender: 'dm',
      context: {
        emotion: 'neutral',
        intent: 'response',
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      },
    );
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    
    // Return a more detailed error response
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      },
    );
  }
});