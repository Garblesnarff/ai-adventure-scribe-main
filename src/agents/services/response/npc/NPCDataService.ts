/**
 * NPC Data Service
 *
 * This file defines the NPCDataService class, responsible for fetching
 * Non-Player Character (NPC) data from the Supabase database. It provides
 * methods to get specific NPC details or a list of available NPCs within a world.
 *
 * Main Class:
 * - NPCDataService: Fetches NPC data.
 *
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 *
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

export class NPCDataService {
  async fetchNPCData(worldId: string, npcName: string) {
    const { data: npcData } = await supabase
      .from('npcs')
      .select('*')
      .eq('world_id', worldId)
      .eq('name', npcName)
      .single();

    return npcData;
  }

  async fetchAvailableNPCs(worldId: string) {
    const { data: npcs } = await supabase
      .from('npcs')
      .select('name, personality, race')
      .eq('world_id', worldId)
      .limit(3);

    return npcs;
  }
}
