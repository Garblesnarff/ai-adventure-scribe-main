import DataLoader from 'dataloader';
import { Memory, Campaign, Character } from '../types';

/**
 * Memory DataLoader for batch loading memories
 */
export const createMemoryLoader = (supabase: any) => {
  return new DataLoader<string, Memory | null>(
    async (ids: readonly string[]) => {
      try {
        console.log(`Batch loading ${ids.length} memories`);

        const { data, error } = await supabase
          .from('episodic_memories')
          .select('*')
          .in('id', Array.from(ids));

        if (error) {
          console.error('Error batch loading memories:', error);
          throw error;
        }

        // Create a map for quick lookup
        const memoryMap = new Map<string, Memory>();
        data.forEach((memory: Memory) => {
          memoryMap.set(memory.id, memory);
        });

        // Return memories in the same order as requested ids, null if not found
        return ids.map(id => memoryMap.get(id) || null);
      } catch (error) {
        console.error('Memory DataLoader error:', error);
        throw error;
      }
    },
    {
      // Cache results for the duration of the request
      cacheKeyFn: (id) => id,
      batchScheduleFn: (callback) => setTimeout(callback, 1), // Batch within 1ms
    }
  );
};

/**
 * Campaign DataLoader for batch loading campaigns
 */
export const createCampaignLoader = (supabase: any) => {
  return new DataLoader<string, Campaign | null>(
    async (ids: readonly string[]) => {
      try {
        console.log(`Batch loading ${ids.length} campaigns`);

        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .in('id', Array.from(ids));

        if (error) {
          console.error('Error batch loading campaigns:', error);
          throw error;
        }

        // Create a map for quick lookup
        const campaignMap = new Map<string, Campaign>();
        data.forEach((campaign: Campaign) => {
          campaignMap.set(campaign.id, campaign);
        });

        // Return campaigns in the same order as requested ids, null if not found
        return ids.map(id => campaignMap.get(id) || null);
      } catch (error) {
        console.error('Campaign DataLoader error:', error);
        throw error;
      }
    },
    {
      cacheKeyFn: (id) => id,
      batchScheduleFn: (callback) => setTimeout(callback, 1),
    }
  );
};

/**
 * Character DataLoader for batch loading characters
 */
export const createCharacterLoader = (supabase: any) => {
  return new DataLoader<string, Character | null>(
    async (ids: readonly string[]) => {
      try {
        console.log(`Batch loading ${ids.length} characters`);

        const { data, error } = await supabase
          .from('characters')
          .select('*')
          .in('id', Array.from(ids));

        if (error) {
          console.error('Error batch loading characters:', error);
          throw error;
        }

        // Create a map for quick lookup
        const characterMap = new Map<string, Character>();
        data.forEach((character: Character) => {
          characterMap.set(character.id, character);
        });

        // Return characters in the same order as requested ids, null if not found
        return ids.map(id => characterMap.get(id) || null);
      } catch (error) {
        console.error('Character DataLoader error:', error);
        throw error;
      }
    },
    {
      cacheKeyFn: (id) => id,
      batchScheduleFn: (callback) => setTimeout(callback, 1),
    }
  );
};

/**
 * Session Memory DataLoader for batch loading memories by session
 */
export const createSessionMemoryLoader = (supabase: any) => {
  return new DataLoader<string, Memory[]>(
    async (sessionIds: readonly string[]) => {
      try {
        console.log(`Batch loading memories for ${sessionIds.length} sessions`);

        const { data, error } = await supabase
          .from('episodic_memories')
          .select('*')
          .in('session_id', Array.from(sessionIds))
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error batch loading session memories:', error);
          throw error;
        }

        // Group memories by session_id
        const memoryGroups = new Map<string, Memory[]>();
        sessionIds.forEach(sessionId => {
          memoryGroups.set(sessionId, []);
        });

        data.forEach((memory: Memory) => {
          const sessionMemories = memoryGroups.get(memory.session_id);
          if (sessionMemories) {
            sessionMemories.push(memory);
          }
        });

        // Return memory arrays in the same order as requested session ids
        return sessionIds.map(sessionId => memoryGroups.get(sessionId) || []);
      } catch (error) {
        console.error('Session Memory DataLoader error:', error);
        throw error;
      }
    },
    {
      cacheKeyFn: (sessionId) => sessionId,
      batchScheduleFn: (callback) => setTimeout(callback, 1),
    }
  );
};

/**
 * User Campaign DataLoader for batch loading campaigns by user
 */
export const createUserCampaignLoader = (supabase: any) => {
  return new DataLoader<string, Campaign[]>(
    async (userIds: readonly string[]) => {
      try {
        console.log(`Batch loading campaigns for ${userIds.length} users`);

        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .in('user_id', Array.from(userIds))
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error batch loading user campaigns:', error);
          throw error;
        }

        // Group campaigns by user_id
        const campaignGroups = new Map<string, Campaign[]>();
        userIds.forEach(userId => {
          campaignGroups.set(userId, []);
        });

        data.forEach((campaign: Campaign) => {
          const userCampaigns = campaignGroups.get(campaign.user_id);
          if (userCampaigns) {
            userCampaigns.push(campaign);
          }
        });

        // Return campaign arrays in the same order as requested user ids
        return userIds.map(userId => campaignGroups.get(userId) || []);
      } catch (error) {
        console.error('User Campaign DataLoader error:', error);
        throw error;
      }
    },
    {
      cacheKeyFn: (userId) => userId,
      batchScheduleFn: (callback) => setTimeout(callback, 1),
    }
  );
};

/**
 * User Character DataLoader for batch loading characters by user
 */
export const createUserCharacterLoader = (supabase: any) => {
  return new DataLoader<string, Character[]>(
    async (userIds: readonly string[]) => {
      try {
        console.log(`Batch loading characters for ${userIds.length} users`);

        const { data, error } = await supabase
          .from('characters')
          .select('*')
          .in('user_id', Array.from(userIds))
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error batch loading user characters:', error);
          throw error;
        }

        // Group characters by user_id
        const characterGroups = new Map<string, Character[]>();
        userIds.forEach(userId => {
          characterGroups.set(userId, []);
        });

        data.forEach((character: Character) => {
          const userCharacters = characterGroups.get(character.user_id);
          if (userCharacters) {
            userCharacters.push(character);
          }
        });

        // Return character arrays in the same order as requested user ids
        return userIds.map(userId => characterGroups.get(userId) || []);
      } catch (error) {
        console.error('User Character DataLoader error:', error);
        throw error;
      }
    },
    {
      cacheKeyFn: (userId) => userId,
      batchScheduleFn: (callback) => setTimeout(callback, 1),
    }
  );
};

/**
 * Factory function to create all data loaders
 */
export const createDataLoaders = (supabase: any) => {
  return {
    memoryLoader: createMemoryLoader(supabase),
    campaignLoader: createCampaignLoader(supabase),
    characterLoader: createCharacterLoader(supabase),
    sessionMemoryLoader: createSessionMemoryLoader(supabase),
    userCampaignLoader: createUserCampaignLoader(supabase),
    userCharacterLoader: createUserCharacterLoader(supabase),
  };
};

export type DataLoaders = ReturnType<typeof createDataLoaders>;