/**
 * ERROR HANDLING PATTERNS IN THIS CODEBASE
 *
 * PATTERN 1: Try/catch with logging
 * WHY: To ensure that errors are never silent and can be diagnosed from server logs.
 *
 * try {
 *   const result = await risky_operation();
 *   return result;
 * } catch (error) {
 *   logger.error('Operation failed', {
 *     error: error.message,
 *     context: { userId, characterId },
 *   });
 *   throw error; // Re-throw to be handled by the caller.
 * }
 *
 * PATTERN 2: Graceful degradation
 * WHY: To allow the primary function to succeed even if a secondary, non-critical feature fails.
 *
 * try {
 *   // Critical operation: get AI response
 *   const aiResponse = await getAiResponse();
 *
 *   // Non-critical operation: extract memories
 *   try {
 *     await MemoryManager.extractMemories(aiResponse);
 *   } catch (memoryError) {
 *     logger.warn('Memory extraction failed (non-fatal)', memoryError);
 *     // The function continues without re-throwing the error.
 *   }
 *
 *   return aiResponse;
 * } catch (criticalError) {
 *   // Handle the failure of the main operation.
 * }
 *
 * PATTERN 3: In-flight request deduplication
 * WHY: To prevent a user from accidentally (e.g., by double-clicking) or intentionally sending the same expensive AI request multiple times in quick succession.
 * - A map of recent requests is maintained with a short TTL (e.g., 2 seconds).
 * - If an identical request comes in while the first is still being processed, the promise for the original request is returned instead of starting a new one.
 *
 * PATTERN 4: Circuit breaker (in API routes)
 * WHY: If a downstream service (like an AI provider) is consistently failing, this pattern prevents the application from repeatedly hammering the failing service.
 * - After a certain number of failures, the "circuit opens," and for a period of time, all subsequent requests to that service will fail immediately with a 503 Service Unavailable error.
 * - This allows the downstream service time to recover and prevents the application from wasting resources on requests that are likely to fail.
 */
import { supabase } from '@/integrations/supabase/client';
import { getGeminiApiManager } from './gemini-api-manager-singleton';
// ... (rest of the file is unchanged)
// ...
// [THE REST OF THE FILE CONTENT IS OMITTED FOR BREVITY]
// ...
