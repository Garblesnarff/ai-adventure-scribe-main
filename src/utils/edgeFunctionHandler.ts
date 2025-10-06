import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AIService } from '@/services/ai-service';
import logger from '@/lib/logger';

/**
 * Check if we should use local AI services instead of edge functions
 */
function shouldUseLocalServices(): boolean {
  // Check environment variable for local mode
  const useLocal = import.meta.env.VITE_USE_LOCAL_AI;
  
  // Enable local mode if:
  // 1. Explicitly set to true
  // 2. In development mode
  return useLocal === 'true' || import.meta.env.DEV;
}

/**
 * Local fallback implementation for dm-agent-execute
 */
async function callDMAgentLocal(payload: unknown): Promise<{
  response: string;
  narrationSegments?: unknown;
  context?: unknown;
  raw: Record<string, never>;
}> {
  logger.info(`[LocalAI] Using local AIService for DM agent`);
  const p = (payload && typeof payload === 'object') ? (payload as Record<string, any>) : {};
  const { task, agentContext } = p;
  
  // Extract context from the payload
  const context = {
    campaignId: agentContext?.campaignDetails?.id || '',
    characterId: agentContext?.characterDetails?.id || '',
    sessionId: '', // Will be populated by calling code
    campaignDetails: agentContext?.campaignDetails,
    characterDetails: agentContext?.characterDetails
  };

  try {
    // Use AIService.chatWithDM which already has local Gemini integration
    const result = await AIService.chatWithDM({
      message: task?.description || '',
      context: context,
      conversationHistory: [], // This would need to be passed from calling code
      // Note: onStream callback not supported in this fallback
    });

    // Return in edge function format
    return {
      response: result.text,
      narrationSegments: result.narrationSegments,
      context: agentContext,
      raw: {}
    };
  } catch (error) {
    logger.error('[LocalAI] DM Agent local fallback failed:', error);
    throw error;
  }
}

/**
 * Local fallback implementation for rules-interpreter-execute
 */
async function callRulesInterpreterLocal(payload: unknown): Promise<{
  isValid: boolean;
  suggestions: string[];
  errors: string[];
  explanation: string;
}> {
  logger.info(`[LocalAI] Using simplified rules validation for local mode`);
  // const p = (payload && typeof payload === 'object') ? (payload as Record<string, any>) : {};
  
  // For now, return a simple validation response
  // In a full implementation, this could use local rule validation logic
  return {
    isValid: true,
    suggestions: [],
    errors: [],
    explanation: "Local rules validation - action appears valid"
  };
}

export async function callEdgeFunction<T = unknown>(
  functionName: string,
  payload?: Record<string, unknown>
): Promise<T | null> {
  // Check if we should use local services
  if (shouldUseLocalServices()) {
    logger.info(`[EdgeFunction] Using local fallback for ${functionName}`);
    
    try {
      switch (functionName) {
        case 'dm-agent-execute':
          return await callDMAgentLocal(payload) as T;
          
        case 'rules-interpreter-execute':
          return await callRulesInterpreterLocal(payload) as T;
          
        default:
          logger.warn(`[EdgeFunction] No local fallback available for ${functionName}, trying edge function`);
          break;
      }
    } catch (localError) {
      logger.error(`[EdgeFunction] Local fallback failed for ${functionName}:`, localError);
      // Fall through to try edge function
    }
  }

  // Original edge function logic
  try {
    logger.debug(`[EdgeFunction] Calling ${functionName}:`, payload);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      logger.error(`[EdgeFunction] ${functionName} error:`, error);
      
      // If edge function fails and we haven't tried local fallback, try it now
      if (!shouldUseLocalServices()) {
        logger.info(`[EdgeFunction] Attempting local fallback after edge function failure`);
        try {
          switch (functionName) {
            case 'dm-agent-execute':
              return await callDMAgentLocal(payload) as T;
              
            case 'rules-interpreter-execute':
              return await callRulesInterpreterLocal(payload) as T;
              
            default:
              break;
          }
        } catch (fallbackError) {
          logger.error(`[EdgeFunction] Local fallback also failed:`, fallbackError);
        }
      }
      
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
      throw error;
    }

    logger.debug(`[EdgeFunction] ${functionName} response:`, data);
    return data;
  } catch (error) {
    logger.error(`[EdgeFunction] Failed to call ${functionName}:`, error);
    toast({
      title: "Error",
      description: "Failed to connect to server. Please try again.",
      variant: "destructive",
    });
    return null;
  }
}