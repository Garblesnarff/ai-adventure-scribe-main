import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cnalyhtalikwsopogula.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWx5aHRhbGlrd3NvcG9ndWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYyMzc2MDEsImV4cCI6MjA0MTgxMzYwMX0.GaBwZWM0dKP_0hHy8Dzw75u15eXVG3vi8RmD7mv7PkQ";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWx5aHRhbGlrd3NvcG9ndWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjIzNzYwMSwiZXhwIjoyMDQxODEzNjAxfQ.Utoxa0leKeVKnPPqgxzsmQcNSPvSWqOzNqMNNcDMPwY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function verifySupabaseToken(token: string): Promise<{ userId: string; email?: string } | null> {
  try {
    // Try to decode the JWT token
    const decoded = jwt.decode(token) as any;

    if (!decoded || !decoded.sub) {
      return null;
    }

    // Check if it's a Supabase token by looking for expected fields
    if (decoded.iss && decoded.iss.includes('supabase') && decoded.sub) {
      return {
        userId: decoded.sub,
        email: decoded.email
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}
