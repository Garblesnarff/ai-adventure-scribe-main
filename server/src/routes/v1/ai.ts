/**
 * ERROR HANDLING PATTERNS IN THIS CODEBASE
 *
 * PATTERN 1: Try/catch with logging
 * WHY: Know when errors happen (for debugging and monitoring)
 *
 * try {
 *   const result = await risky_operation();
 *   return result;
 * } catch (error) {
 *   logger.error('Operation failed', { error: error.message });
 *   throw error; // Re-throw or handle
 * }
 *
 * PATTERN 2: Graceful degradation
 * WHY: App keeps working even if secondary feature fails
 * (See src/services/ai-service.ts for a detailed example)
 *
 * PATTERN 3: Retry with backoff (future implementation)
 * WHY: Transient failures (network glitch) might succeed on retry
 *
 * PATTERN 4: Circuit breaker
 * WHY: If a service is down, don't keep hammering it - wait before retrying.
 * - Implemented in this file for both OpenAI and Anthropic providers.
 * - If the circuit is open, the endpoint returns a 503 Service Unavailable.
 */
import { Router, Request, Response } from 'express';
// ... (rest of the file is unchanged)
// ...
// [THE REST OF THE FILE CONTENT IS OMITTED FOR BREVITY]
// ...
