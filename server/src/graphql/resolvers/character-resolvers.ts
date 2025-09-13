import { GraphQLError } from 'graphql';
import { 
  QueryResolvers, 
  MutationResolvers, 
  SubscriptionResolvers,
  Character,
  CharacterInput,
  GraphQLContext
} from '../types';
import { pubSub } from '../subscriptions';

/**
 * Character Query Resolvers
 */
export const characterQueryResolvers: Partial<QueryResolvers> = {
  /**
   * Get a character by ID
   */
  getCharacter: async (_, args, context: GraphQLContext): Promise<Character | null> => {
    try {
      const { id } = args;

      const { data, error } = await context.supabase
        .from('characters')
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
      console.error('Error getting character:', error);
      throw new GraphQLError('Failed to get character', {
        extensions: { 
          code: 'CHARACTER_FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Get characters for a user
   */
  getCharacters: async (_, args, context: GraphQLContext): Promise<Character[]> => {
    try {
      const { userId } = args;

      const { data, error } = await context.supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting characters:', error);
      throw new GraphQLError('Failed to get characters', {
        extensions: { 
          code: 'CHARACTER_FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Character Mutation Resolvers
 */
export const characterMutationResolvers: Partial<MutationResolvers> = {
  /**
   * Create a new character
   */
  createCharacter: async (_, args, context: GraphQLContext): Promise<Character> => {
    try {
      const { input } = args;
      const userId = context.user?.id;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const characterData = {
        ...input,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await context.supabase
        .from('characters')
        .insert(characterData)
        .select()
        .single();

      if (error) throw error;

      console.log(`Created character: ${data.name} (Level ${data.level} ${data.class})`);
      return data;
    } catch (error) {
      console.error('Error creating character:', error);
      throw new GraphQLError('Failed to create character', {
        extensions: { 
          code: 'CHARACTER_CREATE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Update a character
   */
  updateCharacter: async (_, args, context: GraphQLContext): Promise<Character> => {
    try {
      const { id, input } = args;
      const userId = context.user?.id;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const updateData = {
        ...input,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await context.supabase
        .from('characters')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId) // Ensure user owns the character
        .select()
        .single();

      if (error) throw error;

      // Publish character updated event
      pubSub.publish(`CHARACTER_UPDATED_${id}`, data);

      console.log(`Updated character: ${id}`);
      return data;
    } catch (error) {
      console.error('Error updating character:', error);
      throw new GraphQLError('Failed to update character', {
        extensions: { 
          code: 'CHARACTER_UPDATE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Delete a character
   */
  deleteCharacter: async (_, args, context: GraphQLContext): Promise<boolean> => {
    try {
      const { id } = args;
      const userId = context.user?.id;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const { error } = await context.supabase
        .from('characters')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ensure user owns the character

      if (error) throw error;

      console.log(`Deleted character: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting character:', error);
      throw new GraphQLError('Failed to delete character', {
        extensions: { 
          code: 'CHARACTER_DELETE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Character Subscription Resolvers
 */
export const characterSubscriptionResolvers: Partial<SubscriptionResolvers> = {
  /**
   * Subscribe to character updates
   */
  characterUpdated: {
    subscribe: async (_, args, context: GraphQLContext) => {
      const { characterId } = args;
      return pubSub.asyncIterator([`CHARACTER_UPDATED_${characterId}`]);
    },
    resolve: (payload: any) => payload
  }
};