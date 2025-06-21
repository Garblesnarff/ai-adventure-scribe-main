import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// import { ChatMessage } from './types.ts'; // Assuming this is defined
import { 
  fetchRelevantMemories, 
  calculateMemoryRelevance, 
  updateMemoryImportance,
  formatMemoryContext 
} from './memory-utils.ts'; // Assuming these exist and are correctly typed
import { generateAIResponse } from './ai-handler.ts'; // Assuming this exists

// Shared CORS headers (consider moving to a shared file if not already)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // IMPORTANT: Restrict this in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Function to get Supabase client initialized with user's auth context
function getSupabaseClientWithAuth(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization")!;
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!, // Use ANON_KEY for client-side context
    { global: { headers: { Authorization: authHeader } } }
  );
}

// Admin client for operations requiring elevated privileges if needed
// const supabaseAdmin = createClient(
//   Deno.env.get("SUPABASE_URL")!,
//   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
// );


serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = getSupabaseClientWithAuth(req);

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error fetching user or no user in session:', userError?.message);
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  try {
    // 1. Check User's Subscription and Usage Limits
    const { data: subDetails, error: subError } = await supabase
      .rpc('get_user_subscription_details', { p_user_id: userId });

    if (subError || !subDetails || subDetails.length === 0) {
      console.error(`Error fetching subscription for user ${userId}:`, subError?.message || 'No active subscription found.');
      // Fallback to a default or deny service. For now, assume free tier details if not found or error.
      // This could be refined to explicitly check if a user should have a free tier by default.
      // If the DB trigger `assign_free_tier_to_new_user` is working, users should always have a record.
      // If not, we might assume a default limit here or deny service.
      // For simplicity, let's assume a very restrictive default if no sub found (e.g. 0 messages)
      // Or, rely on the DB function to return free tier if it exists.
      // If subDetails is empty array, it means no active/trialing subscription.
      if (!subDetails || subDetails.length === 0) {
           return new Response(JSON.stringify({ error: "No active subscription found. Please subscribe to send messages." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }
    }
    
    // Assuming get_user_subscription_details returns an array, take the first element.
    const userSub = subDetails[0];

    if (userSub.status !== 'active' && userSub.status !== 'trialing') {
        return new Response(JSON.stringify({ error: `Your subscription is not active (status: ${userSub.status}). Please update your subscription.` }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (userSub.message_limit !== null) { // NULL means unlimited
      const { data: usage, error: usageError } = await supabase
        .from('usage_tracking')
        .select('message_count')
        .eq('user_id', userId)
        .eq('date', new Date().toISOString().split('T')[0]) // Today's date
        .maybeSingle();

      if (usageError) {
        console.error(`Error fetching usage for user ${userId}:`, usageError.message);
        return new Response(JSON.stringify({ error: "Could not verify usage limits." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentMessageCount = usage?.message_count || 0;
      if (currentMessageCount >= userSub.message_limit) {
        return new Response(JSON.stringify({ error: `Daily message limit of ${userSub.message_limit} reached for your tier (${userSub.tier_name}). Please upgrade or wait until tomorrow.` }), {
          status: 429, // Too Many Requests
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Process the chat message (original logic)
    const { messages, sessionId } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages format:', messages);
      return new Response(JSON.stringify({ error: "Messages array is required and must not be empty." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sessionId) {
      console.error('Missing sessionId');
      return new Response(JSON.stringify({ error: "Session ID is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // 3. Increment Message Count (AFTER successful processing, or before if preferred)
    // Calling increment_user_message_count which handles INSERT or UPDATE.
    // It's better to increment *after* successful validation but *before* calling the AI
    // to ensure the count is updated even if AI call fails, but user's intent to send was valid.
    const { data: updatedCount, error: incrementError } = await supabase
      .rpc('increment_user_message_count', { p_user_id: userId });

    if (incrementError) {
      console.error(`Error incrementing message count for user ${userId}:`, incrementError.message);
      // Decide if this is fatal. If count not incremented, user might exceed limits.
      // For now, proceed but log error. Could also return 500.
    } else {
      console.log(`User ${userId} message count updated to: ${updatedCount}`);
    }
    
    console.log(`Processing chat request for user ${userId}, session ${sessionId}...`);
    const latestMessage = messages[messages.length - 1];
    const context = latestMessage?.context || {}; // Define context based on your ChatMessage type
    
    const memories = await fetchRelevantMemories(sessionId, context); // Ensure context is passed correctly
    const scoredMemories = memories
      .map(memory => ({
        memory,
        relevanceScore: calculateMemoryRelevance(memory, context) // Ensure context is passed
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
    
    const memoryContext = formatMemoryContext(scoredMemories);
    const text = await generateAIResponse(messages, memoryContext); // Ensure generateAIResponse is correctly defined and imported
    
    await updateMemoryImportance(memories, text); // Ensure updateMemoryImportance is correctly defined

    const responsePayload = {
      text,
      sender: 'dm',
      context: { // Define according to your ChatMessage context structure
        emotion: 'neutral', // Example
        intent: 'response', // Example
      }
    };

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`Error in chat-ai function for user ${userId || 'unknown'}:`, error);
    return new Response(
      JSON.stringify({ error: error.message, details: error.stack }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});