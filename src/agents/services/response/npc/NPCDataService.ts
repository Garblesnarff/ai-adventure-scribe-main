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