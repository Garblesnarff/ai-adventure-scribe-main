/**
 * DM Agent Tools for CrewAI
 * 
 * This file defines the DMAgentTools class, which provides a collection of tools
 * that the Dungeon Master agent can use within the CrewAI framework. These tools
 * enable the agent to fetch campaign context, query memories, and perform other
 * DM-specific actions.
 * 
 * Main Class:
 * - DMAgentTools: Provides a suite of tools for the DM agent.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - MemoryAdapter (`../adapters/memory-adapter.ts`)
 * - AgentTool type (likely from `../types/index.ts` or `../types/base.ts`)
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// CrewAI Adapters (assuming kebab-case filenames)
import { MemoryAdapter } from '../adapters/memory-adapter';

// CrewAI Types
import { AgentTool } from '../types'; // Assuming AgentTool is re-exported from ../types/index.ts or directly available


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