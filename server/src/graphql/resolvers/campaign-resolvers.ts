import { GraphQLError } from 'graphql';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  QueryResolvers, 
  MutationResolvers, 
  SubscriptionResolvers,
  Campaign,
  CampaignInput,
  CampaignDescription,
  GraphQLContext
} from '../types';
import { pubSub } from '../subscriptions';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new GraphQLError('Gemini API key not configured', {
      extensions: { code: 'CONFIGURATION_ERROR' }
    });
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Campaign Query Resolvers
 */
export const campaignQueryResolvers: Partial<QueryResolvers> = {
  /**
   * Get a campaign by ID
   */
  getCampaign: async (_, args, context: GraphQLContext): Promise<Campaign | null> => {
    try {
      const { id } = args;

      const { data, error } = await context.supabase
        .from('campaigns')
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
      console.error('Error getting campaign:', error);
      throw new GraphQLError('Failed to get campaign', {
        extensions: { 
          code: 'CAMPAIGN_FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Get campaigns for a user
   */
  getCampaigns: async (_, args, context: GraphQLContext): Promise<Campaign[]> => {
    try {
      const { userId } = args;

      const { data, error } = await context.supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting campaigns:', error);
      throw new GraphQLError('Failed to get campaigns', {
        extensions: { 
          code: 'CAMPAIGN_FETCH_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Campaign Mutation Resolvers
 */
export const campaignMutationResolvers: Partial<MutationResolvers> = {
  /**
   * Create a new campaign
   */
  createCampaign: async (_, args, context: GraphQLContext): Promise<Campaign> => {
    try {
      const { input } = args;
      const userId = context.user?.id;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const campaignData = {
        ...input,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await context.supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single();

      if (error) throw error;

      console.log(`Created campaign: ${data.name} (ID: ${data.id})`);
      return data;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw new GraphQLError('Failed to create campaign', {
        extensions: { 
          code: 'CAMPAIGN_CREATE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Update a campaign
   */
  updateCampaign: async (_, args, context: GraphQLContext): Promise<Campaign> => {
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
        .from('campaigns')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId) // Ensure user owns the campaign
        .select()
        .single();

      if (error) throw error;

      // Publish campaign updated event
      pubSub.publish(`CAMPAIGN_UPDATED_${id}`, data);

      console.log(`Updated campaign: ${id}`);
      return data;
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw new GraphQLError('Failed to update campaign', {
        extensions: { 
          code: 'CAMPAIGN_UPDATE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Delete a campaign
   */
  deleteCampaign: async (_, args, context: GraphQLContext): Promise<boolean> => {
    try {
      const { id } = args;
      const userId = context.user?.id;

      if (!userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' }
        });
      }

      const { error } = await context.supabase
        .from('campaigns')
        .delete()
        .eq('id', id)
        .eq('user_id', userId); // Ensure user owns the campaign

      if (error) throw error;

      console.log(`Deleted campaign: ${id}`);
      return true;
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw new GraphQLError('Failed to delete campaign', {
        extensions: { 
          code: 'CAMPAIGN_DELETE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  /**
   * Generate campaign description using AI
   */
  generateCampaignDescription: async (_, args, context: GraphQLContext): Promise<CampaignDescription> => {
    try {
      const { name, genre, context: campaignContext } = args;

      console.log(`Generating campaign description for: ${name} (${genre})`);

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      // Build comprehensive prompt based on the existing AI service
      const prompt = `Create an engaging D&D 5e campaign description that hooks players immediately and sets up an epic adventure.

**Campaign Parameters:**
- Name: ${name}
- Genre: ${genre}
- Context: ${campaignContext ? JSON.stringify(campaignContext) : 'Standard fantasy setting'}

**Requirements:**
1. **Hook**: Start with a compelling central mystery, threat, or opportunity that demands heroes
2. **Stakes**: Make it clear what happens if the heroes don't act (people die, world ends, etc.)
3. **Unique Elements**: Include distinctive locations, NPCs, or plot devices that make this campaign memorable
4. **Player Agency**: Hint at meaningful choices and multiple approaches to challenges
5. **World Integration**: Suggest how character backgrounds might connect to the plot
6. **Adventure Potential**: Indicate specific types of encounters (exploration, political intrigue, combat, puzzles)

**Genre Guidelines:**
${genre === 'dark-fantasy' ? '- Emphasize moral dilemmas, harsh consequences, and atmospheric dread. Heroes face difficult choices with no clear "right" answer.' : ''}
${genre === 'high-fantasy' ? '- Focus on noble quests, clear good vs evil, and inspiring moments. Heroes are destined for greatness and legendary deeds.' : ''}
${genre === 'urban-fantasy' ? '- Blend modern and magical elements. Hidden supernatural world existing alongside mundane reality.' : ''}
${genre === 'steampunk' ? '- Victorian-era technology meets magic. Airships, automatons, and industrial revolution themes.' : ''}
${genre === 'post-apocalyptic' ? '- Survival in a broken world. Resource scarcity, faction conflicts, and hope amid despair.' : ''}

**Structure:**
- **Paragraph 1**: The central hook and immediate threat/opportunity
- **Paragraph 2**: The unique world elements, key NPCs, and what makes this adventure special
- **Paragraph 3**: What players can expect - types of challenges, character integration, and why this matters

Create a campaign description that makes players say "I want to play in this world right now!"`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const description = response.text();

      console.log('Successfully generated campaign description');

      return {
        description,
        campaign: undefined // Could optionally return a full campaign object
      };
    } catch (error) {
      console.error('Error generating campaign description:', error);
      throw new GraphQLError('Failed to generate campaign description', {
        extensions: { 
          code: 'AI_SERVICE_ERROR',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Campaign Subscription Resolvers
 */
export const campaignSubscriptionResolvers: Partial<SubscriptionResolvers> = {
  /**
   * Subscribe to campaign updates
   */
  campaignUpdated: {
    subscribe: async (_, args, context: GraphQLContext) => {
      const { campaignId } = args;
      return pubSub.asyncIterator([`CAMPAIGN_UPDATED_${campaignId}`]);
    },
    resolve: (payload: any) => payload
  }
};