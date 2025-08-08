/**
 * Response Coordinator Service
 * 
 * This file defines the ResponseCoordinator class, responsible for orchestrating
 * the generation of AI Dungeon Master responses. It coordinates various services
 * including intent detection, campaign context providing, conversation state management,
 * and the core DM response generation. It also handles calling the
 * `dm-agent-execute` Edge Function.
 * 
 * Main Class:
 * - ResponseCoordinator: Orchestrates the DM response generation flow.
 * 
 * Key Dependencies:
 * - DMResponseGenerator (`../dm-response-generator.ts`)
 * - ConversationStateManager (`../conversation/conversation-state-manager.ts`)
 * - PlayerIntentDetector (`../intent/player-intent-detector.ts`)
 * - CampaignContextProvider (`../campaign/campaign-context-provider.ts`)
 * - ErrorHandlingService (`../../error/services/error-handling-service.ts`)
 * - callEdgeFunction utility (`@/utils/edge-function-handler.ts`)
 * - Various Agent and Error types.
 * 
 * @author AI Dungeon Master Team
 */

// Project Services (assuming kebab-case filenames)
import { CampaignContextProvider } from '../campaign/campaign-context-provider';
import { ConversationStateManager } from '../conversation/conversation-state-manager';
import { DMResponseGenerator } from '../dm-response-generator';
import { ErrorHandlingService } from '../../error/services/error-handling-service';
import { PlayerIntentDetector } from '../intent/player-intent-detector';

// Project Utilities (assuming kebab-case filenames)
import { callEdgeFunction } from '@/utils/edge-function-handler';

// Project Types
import { AgentResult, AgentTask } from '../../types';
import { ErrorCategory, ErrorSeverity } from '../../error/types';


export class ResponseCoordinator {
  private responseGenerator: DMResponseGenerator | null = null;
  private conversationManager: ConversationStateManager;
  private intentDetector: PlayerIntentDetector;
  private campaignProvider: CampaignContextProvider;
  private errorHandler: ErrorHandlingService;

  constructor() {
    this.conversationManager = new ConversationStateManager();
    this.intentDetector = new PlayerIntentDetector();
    this.campaignProvider = new CampaignContextProvider();
    this.errorHandler = ErrorHandlingService.getInstance();
  }

  public async initialize(campaignId: string, sessionId: string): Promise<void> {
    this.responseGenerator = new DMResponseGenerator(campaignId, sessionId);
    await this.responseGenerator.initialize();
  }

  public async generateResponse(task: AgentTask): Promise<AgentResult> {
    try {
      if (!this.responseGenerator) {
        throw new Error('Response generator not initialized');
      }

      const campaignDetails = task.context?.campaignId ? 
        await this.campaignProvider.fetchCampaignDetails(task.context.campaignId) : null;

      const playerIntent = this.intentDetector.detectIntent(task.description);
      console.log('Detected player intent:', playerIntent);

      const narrativeResponse = await this.responseGenerator.generateResponse(
        task.description,
        {
          playerIntent,
          conversationState: this.conversationManager.getState(),
          campaignContext: campaignDetails
        }
      );

      if (narrativeResponse) {
        this.conversationManager.updateState(task.description, narrativeResponse);
      }

      const data = await this.callDMAgentExecute(task, campaignDetails, narrativeResponse);

      if (!data) throw new Error('Failed to execute task');

      return {
        success: true,
        message: 'Task executed successfully',
        data: {
          ...data,
          narrativeResponse
        }
      };
    } catch (error) {
      console.error('Error generating response:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to execute task'
      };
    }
  }

  private async callDMAgentExecute(task: AgentTask, campaignDetails: any, narrativeResponse: any) {
    return await this.errorHandler.handleOperation(
      async () => {
        console.log('Calling dm-agent-execute with payload:', {
          task,
          agentContext: {
            campaignDetails,
            narrativeResponse,
            conversationState: this.conversationManager.getState()
          }
        });
        
        return await callEdgeFunction('dm-agent-execute', {
          task,
          agentContext: {
            campaignDetails,
            narrativeResponse,
            conversationState: this.conversationManager.getState()
          }
        });
      },
      {
        category: ErrorCategory.NETWORK,
        context: 'ResponseCoordinator.callDMAgentExecute',
        severity: ErrorSeverity.HIGH,
        retryConfig: {
          maxRetries: 3,
          initialDelay: 1000
        }
      }
    );
  }
}