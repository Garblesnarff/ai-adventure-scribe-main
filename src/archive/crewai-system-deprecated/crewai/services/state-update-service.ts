/**
 * State Update Service for CrewAI
 * 
 * This file defines the StateUpdateService class, responsible for handling
 * messages that signify state changes in CrewAI agents. It updates the
 * agent's state in the database and broadcasts these changes to other
 * interested agents. It extends BaseMessageService.
 * 
 * Main Class:
 * - StateUpdateService: Manages agent state updates and broadcasts.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - BaseMessageService (./base-message-service.ts)
 * - CrewAI message and communication types.
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Base Service
import { BaseMessageService } from './base-message-service'; // Assuming kebab-case

// CrewAI Types
import { MessageType } from '../types/communication';
import { StateUpdateMessagePayload } from '../types/messages';


export class StateUpdateService extends BaseMessageService {
  public async handleStateUpdate(payload: StateUpdateMessagePayload): Promise<void> {
    try {
      console.log('[StateUpdateService] Processing state update:', payload);

      const { error } = await supabase
        .from('agent_states')
        .update({
          status: payload.stateChanges.status,
          configuration: JSON.stringify(payload.stateChanges),
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.agentId);

      if (error) throw error;

      await this.broadcastStateChange(payload);

    } catch (error) {
      console.error('[StateUpdateService] Error handling state update:', error);
      await this.storeFailedMessage('state_update', payload, error);
      throw error;
    }
  }

  private async broadcastStateChange(payload: StateUpdateMessagePayload): Promise<void> {
    const { data: interestedAgents } = await supabase
      .from('agent_states')
      .select('id')
      .neq('id', payload.agentId);

    if (interestedAgents) {
      for (const agent of interestedAgents) {
        await this.notifyAgent(agent.id, {
          type: MessageType.STATE_UPDATE,
          content: payload
        });
      }
    }
  }
}