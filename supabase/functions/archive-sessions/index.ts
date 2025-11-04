import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArchiveRequest {
  retentionDays?: number;
  dryRun?: boolean;
  adminKey?: string;
}

interface ArchiveResult {
  success: boolean;
  dry_run: boolean;
  sessions_archived?: number;
  sessions_to_archive?: number;
  dialogue_archived?: number;
  dialogue_to_archive?: number;
  memories_archived?: number;
  memories_to_archive?: number;
  voice_mappings_archived?: number;
  voice_mappings_to_archive?: number;
  combat_encounters_archived?: number;
  combat_encounters_to_archive?: number;
  cutoff_date?: string;
  message: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    console.log('Processing archive request...', { requestId });

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError, { requestId });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User authenticated:', user.id, { requestId });

    // Parse request body
    const body: ArchiveRequest = req.method === 'POST' ? await req.json() : {};
    const retentionDays = body.retentionDays ?? 90;
    const dryRun = body.dryRun ?? false;

    console.log('Archive parameters:', { retentionDays, dryRun, requestId });

    // Validate retention days
    if (retentionDays < 30) {
      throw new Error('Retention period must be at least 30 days for safety');
    }

    // Call the database function to archive sessions
    const { data, error } = await supabase.rpc('archive_old_sessions', {
      retention_days: retentionDays,
      dry_run: dryRun,
    });

    if (error) {
      console.error('Archive function error:', error, { requestId });
      throw error;
    }

    const result = data as ArchiveResult;
    console.log('Archive result:', result, { requestId });

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Archive error:', error, { requestId });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to archive sessions',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
