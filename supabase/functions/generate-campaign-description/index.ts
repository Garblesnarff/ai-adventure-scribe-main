import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Cerebras from 'npm:@cerebras/cerebras_cloud_sdk';

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
    const { genre, difficulty, length, tone } = await req.json();
    
    console.log('Generating campaign description for:', { genre, difficulty, length, tone });

    // Initialize Cerebras client
    const client = new Cerebras({
      apiKey: Deno.env.get('CEREBRAS_API_KEY'),
    });

    // Create chat completion using SDK
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b',
      messages: [
        {
          role: 'system',
          content: 'You are a creative D&D campaign description writer. Create engaging and thematic campaign descriptions.'
        },
        {
          role: 'user',
          content: `Generate a compelling campaign description for a ${genre} campaign with ${difficulty} difficulty, ${length} length, and a ${tone} tone. The description should be 2-3 paragraphs long.`
        }
      ]
    });

    console.log('Cerebras API response:', completion);

    return new Response(
      JSON.stringify({ 
        description: completion.choices[0].message.content 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error generating campaign description:', error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});