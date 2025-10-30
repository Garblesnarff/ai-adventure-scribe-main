import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

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

    // Initialize Gemini client
    const apiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable not set');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `<task>
  <instruction>Generate a compelling campaign description for a D&D adventure</instruction>
</task>

<parameters>
  <genre>${genre}</genre>
  <difficulty>${difficulty}</difficulty>
  <length>${length}</length>
  <tone>${tone}</tone>
</parameters>

<requirements>
  <requirement>The description should be 2-3 paragraphs long</requirement>
  <requirement>Capture the essence of an exciting D&D adventure</requirement>
  <requirement>Match the specified genre, difficulty, length, and tone</requirement>
</requirements>`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const description = response.text();

    console.log('Gemini API response generated successfully');

    return new Response(
      JSON.stringify({ description }), 
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