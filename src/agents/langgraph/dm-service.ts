/**
 * DM Service - LangGraph Integration
 *
 * Provides a high-level service layer for interacting with the DM agent graph.
 * Replaces custom AgentMessagingService with LangGraph state management.
 *
 * Features:
 * - Session-based conversations (thread_id = session_id)
 * - Automatic state persistence via SupabaseCheckpointer
 * - Message history management
 * - Streaming support for real-time responses
 * - Error handling and retry logic
 *
 * @module langgraph
 */

import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { SupabaseCheckpointer } from './persistence/supabase-checkpointer';
import { LangGraphMessageAdapter, GameMessage } from './adapters/message-adapter';
import { logger } from '@/lib/logger';
import { dmGraph, streamDMGraph } from './dm-graph';
import type { DMState, WorldInfo } from './state';

/**
 * World context for DM responses
 */
export interface WorldContext {
  campaignId: string;
  characterId: string;
  sessionId: string;
  campaignDetails?: any;
  characterDetails?: any;
  recentEvents?: string[];
}

/**
 * DM response with metadata
 */
export interface DMResponse {
  response: string;
  requiresDiceRoll?: boolean;
  suggestedActions?: string[];
  worldStateChanges?: any;
  emotionalTone?: string;
}

/**
 * Configuration for DM graph invocation
 */
export interface DMInvokeConfig {
  sessionId: string;
  message: string;
  context: WorldContext;
  conversationHistory?: GameMessage[];
  onStream?: (chunk: string) => void;
}

/**
 * DM Service for managing agent interactions via LangGraph
 *
 * This service wraps LangGraph graph execution and provides a clean API
 * for components to interact with the DM agent without dealing with
 * low-level graph details.
 */
export class DMService {
  private checkpointer: SupabaseCheckpointer;
  private graph: typeof dmGraph;

  constructor() {
    this.checkpointer = new SupabaseCheckpointer();
    this.graph = dmGraph;
  }

  /**
   * Send a message to the DM agent and get a response
   *
   * This is the main entry point for agent interactions.
   * It handles:
   * 1. Loading previous conversation state
   * 2. Appending new message to history
   * 3. Invoking the graph
   * 4. Persisting updated state
   * 5. Returning formatted response
   *
   * @param config - Configuration for the message
   * @returns DM response with metadata
   */
  async sendMessage(config: DMInvokeConfig): Promise<DMResponse> {
    const { sessionId, message, context, onStream } = config;
    const threadId = `session-${sessionId}`;

    try {
      logger.info('[DMService] Sending message:', {
        sessionId,
        messageLength: message.length,
      });

      // Load previous checkpoint to get conversation history
      const checkpoint = await this.checkpointer.get({
        configurable: { thread_id: threadId },
      });

      // Build message history
      const previousMessages: BaseMessage[] = checkpoint?.channel_values?.messages || [];

      // Add new user message
      const userMessage = new HumanMessage({
        content: message,
        additional_kwargs: {
          timestamp: new Date().toISOString(),
          characterId: context.characterId,
        },
      });

      // For now, return a placeholder response until graph is implemented
      // This will be replaced in Work Unit 6.4 with actual graph invocation
      const response = await this.invokeGraph({
        messages: [...previousMessages, userMessage],
        worldContext: context,
        threadId,
        onStream,
      });

      logger.info('[DMService] Message processed successfully:', {
        sessionId,
        responseLength: response.response.length,
      });

      return response;
    } catch (error) {
      logger.error('[DMService] Error sending message:', error);
      throw new Error(
        `Failed to send message to DM: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get conversation history for a session
   *
   * Retrieves all messages from the checkpoint state and converts
   * them to GameMessage format for display.
   *
   * @param sessionId - The session ID
   * @returns Array of game messages
   */
  async getConversationHistory(sessionId: string): Promise<GameMessage[]> {
    const threadId = `session-${sessionId}`;

    try {
      const checkpoint = await this.checkpointer.get({
        configurable: { thread_id: threadId },
      });

      if (!checkpoint?.channel_values?.messages) {
        logger.info('[DMService] No conversation history found:', { sessionId });
        return [];
      }

      const messages = checkpoint.channel_values.messages as BaseMessage[];
      return LangGraphMessageAdapter.toGameMessages(messages);
    } catch (error) {
      logger.error('[DMService] Error loading conversation history:', error);
      return [];
    }
  }

  /**
   * Clear conversation history for a session
   *
   * Deletes all checkpoints for a thread, effectively starting fresh.
   *
   * @param sessionId - The session ID
   */
  async clearHistory(sessionId: string): Promise<void> {
    const threadId = `session-${sessionId}`;

    try {
      await this.checkpointer.deleteThread(threadId);
      logger.info('[DMService] Conversation history cleared:', { sessionId });
    } catch (error) {
      logger.error('[DMService] Error clearing conversation history:', error);
      throw error;
    }
  }

  /**
   * Get checkpoint history for debugging/time-travel
   *
   * Returns all checkpoints for a session, allowing inspection
   * of conversation state at different points in time.
   *
   * @param sessionId - The session ID
   * @param limit - Maximum number of checkpoints to return
   * @returns Array of checkpoints with metadata
   */
  async getCheckpointHistory(sessionId: string, limit = 10) {
    const threadId = `session-${sessionId}`;

    try {
      return await this.checkpointer.list({ configurable: { thread_id: threadId } }, limit);
    } catch (error) {
      logger.error('[DMService] Error loading checkpoint history:', error);
      return [];
    }
  }

  /**
   * Invoke the DM graph with actual LangGraph execution
   *
   * Executes the DM agent graph with the provided context and messages.
   * Supports both streaming and non-streaming modes.
   *
   * @private
   */
  private async invokeGraph(params: {
    messages: BaseMessage[];
    worldContext: WorldContext;
    threadId: string;
    onStream?: (chunk: string) => void;
  }): Promise<DMResponse> {
    const { messages, worldContext, threadId, onStream } = params;

    try {
      // Extract player input from the last message
      const lastMessage = messages[messages.length - 1];
      const playerInput = lastMessage?.content?.toString() || '';

      // Convert WorldContext to WorldInfo format
      const worldInfo: WorldInfo = {
        campaignId: worldContext.campaignId,
        sessionId: worldContext.sessionId,
        characterIds: [worldContext.characterId],
        location: worldContext.campaignDetails?.location,
        recentMemories: worldContext.recentEvents?.map((event) => ({
          content: event,
          type: 'event',
          timestamp: new Date(),
        })),
      };

      // If streaming is requested, use streaming graph invocation
      if (onStream) {
        return await this.invokeGraphWithStreaming(playerInput, worldInfo, threadId, onStream);
      }

      // Non-streaming: invoke graph normally
      logger.info('[DMService] Invoking DM graph:', {
        threadId,
        playerInput: playerInput.substring(0, 50),
      });

      const result = await this.graph.invoke(
        {
          messages,
          playerInput,
          playerIntent: null,
          rulesValidation: null,
          worldContext: worldInfo,
          response: null,
          requiresDiceRoll: null,
          error: null,
          metadata: {
            timestamp: new Date(),
            stepCount: 0,
          },
        },
        {
          configurable: { thread_id: threadId },
          recursionLimit: 25,
        },
      );

      // Map DMState to DMResponse
      return this.mapStateToResponse(result as DMState);
    } catch (error) {
      logger.error('[DMService] Graph invocation failed:', error);
      throw new Error(
        `Graph execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Invoke graph with streaming support
   *
   * Streams the graph execution and calls the onStream callback
   * with each chunk of the response.
   *
   * @private
   */
  private async invokeGraphWithStreaming(
    playerInput: string,
    worldInfo: WorldInfo,
    threadId: string,
    onStream: (chunk: string) => void,
  ): Promise<DMResponse> {
    logger.info('[DMService] Invoking DM graph with streaming:', {
      threadId,
      playerInput: playerInput.substring(0, 50),
    });

    let finalState: DMState | null = null;

    // Stream the graph execution
    const stream = streamDMGraph(playerInput, worldInfo, threadId);

    for await (const chunk of stream) {
      // Each chunk contains the updated state from a node execution
      const state = chunk as Partial<DMState>;

      // If there's a response being generated, stream it
      if (state.response?.description) {
        // Stream the description incrementally
        onStream(state.response.description);
      }

      // Keep track of the final state
      if (state.response || state.error) {
        finalState = state as DMState;
      }
    }

    // Return the final state as DMResponse
    if (!finalState) {
      throw new Error('Graph streaming completed without final state');
    }

    return this.mapStateToResponse(finalState);
  }

  /**
   * Map DMState to DMResponse format
   *
   * Converts the internal LangGraph state to the public API response format.
   *
   * @private
   */
  private mapStateToResponse(state: DMState): DMResponse {
    // Handle error state
    if (state.error) {
      return {
        response: `I encountered an issue: ${state.error}`,
        requiresDiceRoll: false,
        suggestedActions: ['Try again', 'Rephrase your action'],
        emotionalTone: 'apologetic',
      };
    }

    // Handle missing response
    if (!state.response) {
      return {
        response: 'I need more information to continue. What would you like to do?',
        requiresDiceRoll: false,
        suggestedActions: ['Describe your action', 'Ask a question'],
        emotionalTone: 'neutral',
      };
    }

    // Map the narrative response
    return {
      response: state.response.description,
      requiresDiceRoll: state.requiresDiceRoll !== null,
      suggestedActions: state.response.availableActions || [],
      worldStateChanges: state.response.consequences
        ? { consequences: state.response.consequences }
        : undefined,
      emotionalTone: state.response.atmosphere || 'neutral',
    };
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.checkpointer !== null;
  }

  /**
   * Get service status for debugging
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      graphAvailable: this.graph !== null,
      checkpointerType: 'supabase',
    };
  }
}

/**
 * Singleton instance for easy access
 */
let dmServiceInstance: DMService | null = null;

export function getDMService(): DMService {
  if (!dmServiceInstance) {
    dmServiceInstance = new DMService();
  }
  return dmServiceInstance;
}
