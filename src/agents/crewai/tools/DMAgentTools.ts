import { AgentTool } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { MemoryAdapter } from '../adapters/MemoryAdapter';

export class DMAgentTools {
  private memoryAdapter: MemoryAdapter;

  constructor(memoryAdapter: MemoryAdapter) {
    this.memoryAdapter = memoryAdapter;
  }

  /**
   * Get all available tools for the DM agent
   */
  getTools(): AgentTool[] {
    return [
      this.createCampaignContextTool(),
      this.createMemoryQueryTool()
    ];
  }

  /**
   * Create campaign context fetching tool
   */
  private createCampaignContextTool(): AgentTool {
    return {
      name: 'fetch_campaign_context',
      description: 'Retrieves relevant campaign context and history',
      execute: async (params: any) => {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', params.campaignId)
          .single();
        
        if (error) throw error;
        return data;
      }
    };
  }

  /**
   * Create memory query tool
   */
  private createMemoryQueryTool(): AgentTool {
    return {
      name: 'query_memories',
      description: 'Searches through session memories for relevant information',
      execute: async (params: any) => {
        const memories = await this.memoryAdapter.getRecentMemories(params.limit || 5);
        return memories;
      }
    };
  }
}