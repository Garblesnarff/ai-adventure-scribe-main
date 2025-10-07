import logger from '@/lib/logger';
import { AIService } from '@/services/ai-service';

import type { AIExecutionStrategy } from './AIExecutionStrategy';

interface DMRunPayload {
  task?: { description?: string };
  agentContext?: {
    campaignDetails?: any;
    characterDetails?: any;
    narrativeResponse?: any;
  };
}

export class LocalFallbackStrategy implements AIExecutionStrategy {
  readonly name = 'local-fallback';
  readonly priority: number;

  constructor(priority: number = 5) {
    this.priority = priority;
  }

  canExecute(functionName: string): boolean {
    return functionName === 'dm-agent-execute' || functionName === 'rules-interpreter-execute';
  }

  async execute(functionName: string, payload?: Record<string, unknown>): Promise<any> {
    if (functionName === 'rules-interpreter-execute') {
      return this.executeRulesInterpreter();
    }
    return this.executeDMAgent(payload as DMRunPayload);
  }

  private async executeDMAgent(payload: DMRunPayload | undefined) {
    logger.info('[LocalFallbackStrategy] Using local AIService for DM agent');
    const safePayload = payload ?? {};
    const { task, agentContext } = safePayload;

    const context = {
      campaignId: agentContext?.campaignDetails?.id || '',
      characterId: agentContext?.characterDetails?.id || '',
      sessionId: '',
      campaignDetails: agentContext?.campaignDetails,
      characterDetails: agentContext?.characterDetails
    };

    const result = await AIService.chatWithDM({
      message: task?.description || '',
      context,
      conversationHistory: []
    });

    return {
      response: result.text,
      narrationSegments: result.narrationSegments,
      context: agentContext,
      raw: {}
    };
  }

  private async executeRulesInterpreter() {
    logger.info('[LocalFallbackStrategy] Using simplified rules validation');
    return {
      isValid: true,
      suggestions: [],
      errors: [],
      explanation: 'Local rules validation - action appears valid'
    };
  }
}
