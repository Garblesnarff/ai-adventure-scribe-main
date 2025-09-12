import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AIService } from '@/services/ai-service';

/**
 * Check if we should use local API services instead of edge functions
 */
function shouldUseLocalAPI(): boolean {
  // Always use local API in this unified migration approach
  // Check if local API server is available
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return true; // Always prefer local API over edge functions
}

/**
 * Get the base API URL for local server calls
 */
function getLocalAPIUrl(): string {
  return import.meta.env.VITE_API_URL || 'http://localhost:4000';
}

/**
 * Call the local Express API instead of Supabase edge functions
 */
async function callLocalAPI(functionName: string, payload: any): Promise<any> {
  const baseUrl = getLocalAPIUrl();
  const endpoint = `/v1/ai/${functionName}`;
  
  console.log(`[LocalAPI] Calling ${baseUrl}${endpoint}`);
  
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

export async function callEdgeFunction<T = any>(
  functionName: string,
  payload?: any
): Promise<T | null> {
  // Check if we should use local API services
  if (shouldUseLocalAPI()) {
    console.log(`[EdgeFunction] Using local API for ${functionName}`);
    
    try {
      return await callLocalAPI(functionName, payload) as T;
    } catch (localError) {
      console.error(`[EdgeFunction] Local API failed for ${functionName}:`, localError);
      // Fall through to try edge function as fallback
    }
  }

  // Fallback to original edge function logic
  try {
    console.log(`[EdgeFunction] Calling Supabase edge function ${functionName}:`, payload);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      console.error(`[EdgeFunction] ${functionName} error:`, error);
      
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
      throw error;
    }

    console.log(`[EdgeFunction] ${functionName} response:`, data);
    return data;
  } catch (error) {
    console.error(`[EdgeFunction] Failed to call ${functionName}:`, error);
    toast({
      title: "Error",
      description: "Failed to connect to server. Please try again.",
      variant: "destructive",
    });
    return null;
  }
}