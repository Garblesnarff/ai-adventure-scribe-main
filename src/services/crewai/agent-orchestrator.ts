import { z } from 'zod';

import { CrewAIClient, type CrewAIResponse } from './crewai-client';
import { StateAdapter } from './state-adapter';
import { logger } from '../../lib/logger';

import type { ChatMessage, GameContext } from '@/services/ai-service';
import type { SessionStatePayload } from '@/types/session-state';

export interface OrchestratorParams {
  message: string;
  context: GameContext;
  conversationHistory?: ChatMessage[];
  sessionState?: SessionStatePayload | null;
}

export class AgentOrchestrator {
  static async generateResponse(params: OrchestratorParams): Promise<CrewAIResponse> {
    const { message, context, conversationHistory = [], sessionState } = params;
    if (!context.sessionId) throw new Error('sessionId is required for CrewAI');

    const payload = StateAdapter.buildRespondPayload({
      message,
      context,
      conversationHistory,
      sessionState: sessionState || null,
    });

    // Delegate to CrewAI service via HTTP bridge
    const raw = await CrewAIClient.respond(context.sessionId!, payload);

    // Validate/normalize shape to protect UI
    const rollRequestSchema = z.object({
      type: z.enum(['check', 'save', 'attack', 'damage', 'initiative']),
      formula: z.string().optional(),
      purpose: z.string().optional(),
      dc: z.number().int().optional(),
      ac: z.number().int().optional(),
      advantage: z.boolean().optional(),
      disadvantage: z.boolean().optional(),
    });

    const narrationSegmentSchema = z.object({
      type: z.enum(['dm', 'character', 'transition']),
      text: z.string(),
      character: z.string().nullish(),
      voice_category: z.string().nullish(),
    });

    const responseSchema = z.object({
      text: z.string().default(''),
      narration_segments: z.array(narrationSegmentSchema).optional().default([]),
      roll_requests: z.array(rollRequestSchema).optional().default([]),
    });

    const parsed = responseSchema.safeParse(raw);
    if (!parsed.success) {
      logger.warn(
        'CrewAI response validation failed; using safe defaults:',
        parsed.error?.errors?.[0],
      );
      return { text: String((raw as any)?.text || ''), narration_segments: [], roll_requests: [] };
    }
    return parsed.data as CrewAIResponse;
  }
}

export const agentOrchestrator = AgentOrchestrator;
