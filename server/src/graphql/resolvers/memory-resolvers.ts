import { GraphQLError } from 'graphql';
import { 
  QueryResolvers, 
  MutationResolvers, 
  SubscriptionResolvers,
  Memory,
  MemoryInput,
  MemorySearchInput,
  MemorySearchResult,
  GraphQLContext
} from '../types';
import { pubSub } from '../subscriptions';

/**
 * Memory Query Resolvers
 */
export const memoryQueryResolvers: Partial<QueryResolvers> = {
  /**
   * Search memories using vector similarity or text search
   */
  searchMemories: async (_, args, context: GraphQLContext): Promise<MemorySearchResult> => {
    try {
      const { input } = args;
      const { query, sessionId, limit = 10, threshold = 0.7 } = input;

      console.log(`Searching memories for session ${sessionId} with query: "${query}"`);

      // If we have a query, generate embedding for semantic search
      let searchResults;
      if (query && query.trim()) {
        // First, try to generate embedding for the query
        try {
          const { data: embeddingData, error: embeddingError } = await context.supabase.functions.invoke('generate-embedding', {
            body: { text: query }
          });

          if (embeddingError) {
            console.warn('Embedding generation failed, falling back to text search:', embeddingError);
            // Fallback to text search
            const { data, error } = await context.supabase
              .from('episodic_memories')
              .select('*')
              .eq('session_id', sessionId)
              .textSearch('content', query)
              .order('importance', { ascending: false })
              .limit(limit);

            if (error) throw error;
            searchResults = data || [];
          } else {
            // Use vector similarity search
            const embedding = embeddingData.embedding;
            const { data, error } = await context.supabase
              .rpc('match_memories', {
                session_id: sessionId,
                query_embedding: embedding,
                match_threshold: threshold,
                match_count: limit
              });

            if (error) throw error;
            searchResults = data || [];
          }
        } catch (embeddingError) {
          console.warn('Vector search failed, using text search:', embeddingError);
          // Final fallback to basic text search
          const { data, error } = await context.supabase
            .from('episodic_memories')
            .select('*')
            .eq('session_id', sessionId)
            .ilike('content', `%${query}%`)
            .order('importance', { ascending: false })
            .limit(limit);

          if (error) throw error;
          searchResults = data || [];
        }
      } else {
        // No query, return recent memories
        const { data, error } = await context.supabase
          .from('episodic_memories')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;
        searchResults = data || [];
      }

      // Calculate relevance scores (simplified for now)
      const relevanceScores = searchResults.map((_, index) => 
        Math.max(0.1, 1.0 - (index * 0.1))
      );

      return {
        memories: searchResults,
        totalCount: searchResults.length,
        relevanceScores
      };
    } catch (error) {
      console.error('Error searching memories:', error);
      throw new GraphQLError('Failed to search memories', {
        extensions: { 
          code: 'MEMORY_SEARCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Get a specific memory by ID
   */
  getMemory: async (_, args, context: GraphQLContext): Promise<Memory | null> => {
    try {
      const { id } = args;

      const { data, error } = await context.supabase
        .from('episodic_memories')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting memory:', error);
      throw new GraphQLError('Failed to get memory', {
        extensions: { 
          code: 'MEMORY_FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Get memories for a session with pagination
   */
  getMemories: async (_, args, context: GraphQLContext): Promise<Memory[]> => {
    try {
      const { sessionId, limit = 20, offset = 0 } = args;

      const { data, error } = await context.supabase
        .from('episodic_memories')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting memories:', error);
      throw new GraphQLError('Failed to get memories', {
        extensions: { 
          code: 'MEMORY_FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Memory Mutation Resolvers
 */
export const memoryMutationResolvers: Partial<MutationResolvers> = {
  /**
   * Create a new memory
   */
  createMemory: async (_, args, context: GraphQLContext): Promise<Memory> => {
    try {
      const { input, sessionId } = args;
      const { content, type, importance, metadata } = input;

      // Generate embedding for the memory content
      let embedding = null;
      try {
        const { data: embeddingData } = await context.supabase.functions.invoke('generate-embedding', {
          body: { text: content }
        });
        embedding = embeddingData?.embedding;
      } catch (embeddingError) {
        console.warn('Failed to generate embedding for memory:', embeddingError);
      }

      // Clamp importance between 1 and 10
      const clampedImportance = Math.max(1, Math.min(10, importance));

      const memoryData = {
        session_id: sessionId,
        content,
        type,
        importance: clampedImportance,
        metadata: metadata || {},
        embedding,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await context.supabase
        .from('episodic_memories')
        .insert(memoryData)
        .select()
        .single();

      if (error) throw error;

      // Publish memory created event
      pubSub.publish(`MEMORY_UPDATED_${sessionId}`, data);

      console.log(`Created memory: ${data.id} (importance: ${clampedImportance})`);
      return data;
    } catch (error) {
      console.error('Error creating memory:', error);
      throw new GraphQLError('Failed to create memory', {
        extensions: { 
          code: 'MEMORY_CREATE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Update memory importance
   */
  updateMemoryImportance: async (_, args, context: GraphQLContext): Promise<Memory> => {
    try {
      const { memoryId, importance } = args;

      // Clamp importance between 1 and 10
      const clampedImportance = Math.max(1, Math.min(10, importance));

      const { data, error } = await context.supabase
        .from('episodic_memories')
        .update({ 
          importance: clampedImportance,
          updated_at: new Date().toISOString()
        })
        .eq('id', memoryId)
        .select()
        .single();

      if (error) throw error;

      // Publish memory updated event
      if (data.session_id) {
        pubSub.publish(`MEMORY_UPDATED_${data.session_id}`, data);
      }

      console.log(`Updated memory ${memoryId} importance to ${clampedImportance}`);
      return data;
    } catch (error) {
      console.error('Error updating memory importance:', error);
      throw new GraphQLError('Failed to update memory importance', {
        extensions: { 
          code: 'MEMORY_UPDATE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Memory Subscription Resolvers
 */
export const memorySubscriptionResolvers: Partial<SubscriptionResolvers> = {
  /**
   * Subscribe to memory updates for a session
   */
  memoryUpdated: {
    subscribe: async (_, args, context: GraphQLContext) => {
      const { sessionId } = args;
      return pubSub.asyncIterator([`MEMORY_UPDATED_${sessionId}`]);
    },
    resolve: (payload: any) => payload
  }
};