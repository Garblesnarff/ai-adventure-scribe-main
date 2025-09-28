import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://cnalyhtalikwsopogula.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWx5aHRhbGlrd3NvcG9ndWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYyMzc2MDEsImV4cCI6MjA0MTgxMzYwMX0.GaBwZWM0dKP_0hHy8Dzw75u15eXVG3vi8RmD7mv7PkQ";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYWx5aHRhbGlrd3NvcG9ndWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjIzNzYwMSwiZXhwIjoyMDQxODEzNjAxfQ.Utoxa0leKeVKnPPqgxzsmQcNSPvSWqOzNqMNNcDMPwY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ||
  "pFRa8nkfmyY/V4HQPv8DDavb9d1t6BhLK3CKxHAPFhzLEcxUa/v2FqKdJJdaaLLyNyEgl/Wx4D3rPrQx5MSMlg==";

export async function verifySupabaseToken(token: string): Promise<{ userId: string; email?: string } | null> {
  try {
    console.log('🔍 Verifying Supabase token...');
    console.log('🔍 Token length:', token.length);
    console.log('🔍 JWT_SECRET being used:', JWT_SECRET.substring(0, 20) + '...');

    // Let's also decode without verification to see the token structure
    const decodedWithoutVerification = jwt.decode(token, { complete: true }) as any;
    console.log('🔍 Token header (without verification):', decodedWithoutVerification?.header);
    console.log('🔍 Token issuer (without verification):', decodedWithoutVerification?.payload?.iss);
    console.log('🔍 Token audience (without verification):', decodedWithoutVerification?.payload?.aud);

    // Verify the token with the secret
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    console.log('🔍 Token verified successfully!');
    console.log('🔍 Token payload sub:', decoded.sub);
    console.log('🔍 Token payload iss:', decoded.iss);

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

    console.log('Token verification failed: not a Supabase token, iss:', decoded.iss);
    return null;
  } catch (error) {
    console.error('Token verification failed:', error instanceof Error ? error.message : String(error));

    // If verification fails, let's see if we can decode it without verification
    try {
      const decodedWithoutVerification = jwt.decode(token, { complete: true }) as any;
      console.log('🔍 Failed token header:', decodedWithoutVerification?.header);
      console.log('🔍 Failed token payload iss:', decodedWithoutVerification?.payload?.iss);
      console.log('🔍 Failed token payload aud:', decodedWithoutVerification?.payload?.aud);
    } catch (decodeError) {
      console.log('🔍 Could not even decode token structure');
    }

    return null;
  }
}
