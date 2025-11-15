import logger from '@/lib/logger';

import type { AgentResult, AgentTask } from '../../types';
import { CachedCampaignContextProvider } from '../campaign/CachedCampaignContextProvider';
import { ConversationStateStore } from '../conversation/ConversationStateStore';
import type { ConversationState } from '../conversation/ConversationStateManager';
import { ResponseCoordinator } from './ResponseCoordinator';

interface PipelineDependencies {
  responseCoordinator: ResponseCoordinator;
  campaignProvider?: CachedCampaignContextProvider;
  conversationStore?: ConversationStateStore;
}

interface PipelineExecutionResult {
  result: AgentResult;
  conversation?: ConversationState;
  campaignDetails?: any;
}

export class ResponsePipeline {
  private responseCoordinator: ResponseCoordinator;
  private campaignProvider: CachedCampaignContextProvider;
  private conversationStore: ConversationStateStore;

  constructor({
    responseCoordinator,
    campaignProvider = new CachedCampaignContextProvider(),
    conversationStore = new ConversationStateStore(),
  }: PipelineDependencies) {
    this.responseCoordinator = responseCoordinator;
    this.campaignProvider = campaignProvider;
    this.conversationStore = conversationStore;
  }

  public async execute(task: AgentTask): Promise<PipelineExecutionResult> {
    const campaignId = task.context?.campaignId as string | undefined;
    const sessionId = task.context?.sessionId as string | undefined;

    const [conversationState, campaignDetails] = await Promise.all([
      sessionId ? this.conversationStore.load(sessionId) : Promise.resolve(null),
      campaignId ? this.campaignProvider.fetchCampaignDetails(campaignId) : Promise.resolve(null),
    ]);

    if (!campaignId || !sessionId) {
      logger.error('[ResponsePipeline] Missing campaign or session context for task execution', {
        taskId: task.id,
        campaignId,
        sessionId,
      });
      return {
        result: {
          success: false,
          message: 'Missing campaign or session context for response generation',
        },
        conversation: conversationState ?? undefined,
        campaignDetails,
      };
    }

    if (conversationState) {
      this.responseCoordinator.hydrateConversation(conversationState);
    }

    if (campaignId && sessionId) {
      await this.responseCoordinator.initialize(campaignId, sessionId);
    }

    const result = await this.responseCoordinator.generateResponse(task, {
      campaignDetails,
      sessionId,
      campaignId,
    });

    const updatedConversation = this.responseCoordinator.getConversationSnapshot();

    if (sessionId && updatedConversation) {
      try {
        await this.conversationStore.save(sessionId, updatedConversation);
      } catch (error) {
        logger.warn('[ResponsePipeline] Failed to persist conversation snapshot', {
          sessionId,
          error,
        });
      }
    }

    return {
      result,
      conversation: updatedConversation,
      campaignDetails,
    };
  }
}
