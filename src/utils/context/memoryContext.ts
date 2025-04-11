import { supabase } from '@/integrations/supabase/client';
import { Memory, MemoryContext } from '@/types/memory';
import { isValidMemoryType } from '@/components/game/memory/types';

/**
 * Interface for memory filtering options
 */
interface MemoryFilterOptions {
  timeframe?: 'recent' | 'all';
  importance?: number;
  limit?: number;
  includeLocations?: boolean;
  includeNPCs?: boolean;
}

/**
 * Fetches and formats memory context with enhanced filtering and sorting
 */
export const buildMemoryContext = async (
  sessionId: string,
  options: MemoryFilterOptions = {}
): Promise<MemoryContext | null> => {
  try {
    console.log('[Context] Fetching memories for session:', sessionId);

    const [memoriesResult, locationResult, npcResult] = await Promise.all([
      fetchMemories(sessionId, options),
      fetchLocationDetails(sessionId),
      fetchActiveNPCs(sessionId)
    ]);

    if (!memoriesResult.data) {
      throw new Error('Failed to fetch memories');
    }

    // Initialize context categories
    const context: MemoryContext = {
      recent: [],
      locations: [],
      characters: [],
      plot: [],
      currentLocation: locationResult.data?.[0] ? {
        name: locationResult.data[0].name,
        description: locationResult.data[0].description,
        type: locationResult.data[0].location_type
      } : undefined,
      activeNPCs: npcResult.data?.map(npc => ({
        name: npc.name,
        type: npc.class || npc.race,
        status: 'active'
      })) || []
    };

    // Process and categorize memories
    memoriesResult.data.forEach(memory => {
      const validatedType = isValidMemoryType(memory.type) ? memory.type : 'general';
      
      const memoryObj: Memory = {
        id: memory.id,
        type: validatedType,
        content: memory.content,
        importance: calculateImportance(memory),
        created_at: memory.created_at || new Date().toISOString(),
        updated_at: memory.updated_at || new Date().toISOString(),
        session_id: memory.session_id,
        metadata: memory.metadata || {},
        embedding: memory.embedding,
      };

      // Categorize memory based on validated type
      switch (validatedType) {
        case 'event':
          context.recent.push(memoryObj);
          break;
        case 'location':
          context.locations.push(memoryObj);
          break;
        case 'character':
          context.characters.push(memoryObj);
          break;
        case 'plot':
          context.plot.push(memoryObj);
          break;
      }
    });

    return context;
  } catch (error) {
    console.error('[Context] Error building memory context:', error);
    return null;
  }
};

const fetchMemories = async (sessionId: string, options: MemoryFilterOptions) => {
  let query = supabase
    .from('memories')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false });

  if (options.timeframe === 'recent') {
    const recentTime = new Date();
    recentTime.setHours(recentTime.getHours() - 1);
    query = query.gte('created_at', recentTime.toISOString());
  }

  if (options.importance) {
    query = query.gte('importance', options.importance);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query;
};

/**
 * Fetches current location details for a session
 */
const fetchLocationDetails = async (sessionId: string) => {
  return supabase
    .from('locations')
    .select(`
      *,
      world:worlds(name, climate_type)
    `)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1);
};

/**
 * Fetches active NPCs in the current scene
 */
const fetchActiveNPCs = async (sessionId: string) => {
  return supabase
    .from('npcs')
    .select(`
      *,
      current_location:locations(name)
    `)
    .eq('session_id', sessionId)
    .eq('status', 'active');
};

/**
 * Calculates memory importance based on various factors
 */
const calculateImportance = (memory: any): number => {
  let importance = memory.importance || 0;
  
  // Factor in metadata significance if available
  if (typeof memory.metadata === 'object' && memory.metadata !== null) {
    const metadata = memory.metadata as Record<string, any>;
    if (typeof metadata.significance === 'number') {
      importance += metadata.significance;
    }
  }

  // Factor in recency
  const ageInHours = (Date.now() - new Date(memory.created_at).getTime()) / (1000 * 60 * 60);
  if (ageInHours < 1) importance += 3;
  else if (ageInHours < 24) importance += 2;
  else if (ageInHours < 72) importance += 1;

  // Cap importance at 10
  return Math.min(10, importance);
};
