import { createClient } from '@supabase/supabase-js';
import * as jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cnalyhtalikwsopogula.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWx5aHRhbGlrd3NvcG9ndWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYyMzc2MDEsImV4cCI6MjA0MTgxMzYwMX0.GaBwZWM0dKP_0hHy8Dzw75u15eXVG3vi8RmD7mv7PkQ";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWx5aHRhbGlrd3NvcG9ndWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjIzNzYwMSwiZXhwIjoyMDQxODEzNjAxfQ.Utoxa0leKeVKnPPqgxzsmQcNSPvSWqOzNqMNNcDMPwY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ||
  "pFRa8nkfmyY/V4HQPv8DDavb9d1t6BhLK3CKxHAPFhzLEcxUa/v2FqKdJJdaaLLyNyEgl/Wx4D3rPrQx5MSMlg==";

export async function verifySupabaseToken(token: string): Promise<{ userId: string; email?: string } | null> {
  try {
    // Verify the token with the secret
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded || !decoded.sub) {
      console.log('Token verification failed: missing sub claim');
      return null;
    }

    // Additional validation for Supabase token structure
    if (decoded.iss && decoded.iss.includes('supabase')) {
      console.log('Successfully verified Supabase token for user:', decoded.sub);
      return {
        userId: decoded.sub,
        email: decoded.email
      };
    }

    console.log('Token verification failed: not a Supabase token');
    return null;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
}
