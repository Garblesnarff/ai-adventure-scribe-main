import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export async function callEdgeFunction<T = any>(
  functionName: string,
  payload?: any
): Promise<T | null> {
  try {
    console.log(`[EdgeFunction] Calling ${functionName}:`, payload);
    
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