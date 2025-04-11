import { supabase } from '@/integrations/supabase/client';
import { BaseMessageService } from './BaseMessageService';
import { StateUpdateMessagePayload } from '../types/messages';
import { MessageType } from '../types/communication';

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