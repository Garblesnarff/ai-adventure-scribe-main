/**
 * Memory Retrieval Node
 *
 * Retrieves relevant memories from the session to provide context
 * for the DM's response generation.
 *
 * @module agents/langgraph/nodes/memory-retrieval
 */

import { EnhancedMemoryManager } from '../../services/memory/EnhancedMemoryManager';
import type { DMState, WorldInfo } from '../state';
import type { EnhancedMemory } from '@/types/memory';
import logger from '@/lib/logger';

/**
 * Transform EnhancedMemory to WorldInfo memory format
 */
function transformMemory(memory: EnhancedMemory): { content: string; type: string; timestamp: Date } {
  return {
    content: memory.content,
    type: memory.type,
    timestamp: new Date(memory.timestamp),
  };
}

/**
 * Retrieve memories for context
 *
 * Fetches both recent memories and semantically relevant memories
 * based on the player's input to provide rich context for the DM.
 *
 * @param state - Current graph state
 * @returns Updated state with memories added to worldContext
 */
export async function retrieveMemories(state: DMState): Promise<Partial<DMState>> {
  try {
    const { worldContext, playerInput } = state;

    if (!worldContext) {
      logger.warn('No world context available for memory retrieval');
      return {
        metadata: {
          ...state.metadata,
          stepCount: (state.metadata?.stepCount || 0) + 1,
        },
      };
    }

    if (!worldContext.sessionId) {
      logger.warn('No session ID available for memory retrieval');
      return {
        metadata: {
          ...state.metadata,
          stepCount: (state.metadata?.stepCount || 0) + 1,
        },
      };
    }

    logger.info(`Retrieving memories for session: ${worldContext.sessionId}`);

    // Use existing production-tested memory manager
    const memoryManager = new EnhancedMemoryManager(worldContext.sessionId);

    // Retrieve recent memories (last 10)
    const recentMemories = await memoryManager.retrieveMemories({
      timeframe: 'recent',
      limit: 10,
    });

    logger.info(`Retrieved ${recentMemories.length} recent memories`);

    // Retrieve semantically relevant memories if we have player input (top 5)
    let relevantMemories: EnhancedMemory[] = [];
    if (playerInput) {
      relevantMemories = await memoryManager.retrieveMemories({
        query: playerInput,
        semanticSearch: true,
        limit: 5,
      });

      logger.info(`Retrieved ${relevantMemories.length} semantically relevant memories`);
    }

    // Combine and deduplicate memories by ID
    const allMemories = [...recentMemories, ...relevantMemories];
    const uniqueMemories = Array.from(
      new Map(allMemories.map(mem => [mem.id, mem])).values()
    );

    // Transform to WorldInfo memory format
    const transformedMemories = uniqueMemories.map(transformMemory);

    logger.info(`Total unique memories retrieved: ${transformedMemories.length}`);

    // Update world context with memories
    const updatedWorldContext: WorldInfo = {
      ...worldContext,
      recentMemories: transformedMemories,
    };

    return {
      worldContext: updatedWorldContext,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  } catch (error) {
    logger.error('Memory retrieval failed:', error);

    // Don't fail the entire pipeline - continue with empty memories
    return {
      error: `Memory retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: {
        ...state.metadata,
        stepCount: (state.metadata?.stepCount || 0) + 1,
      },
    };
  }
}
