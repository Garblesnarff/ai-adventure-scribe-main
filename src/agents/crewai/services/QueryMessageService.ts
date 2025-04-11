import { supabase } from '@/integrations/supabase/client';
import { BaseMessageService } from './BaseMessageService';
import { QueryMessagePayload } from '../types/messages';
import { MessageType } from '../types/communication';
import { QueryRouterService } from './QueryRouterService';
import { QueryType, QueryParameters } from '../types/query';

export class QueryMessageService extends BaseMessageService {
  private queryRouter: QueryRouterService;

  constructor() {
    super();
    this.queryRouter = QueryRouterService.getInstance();
  }

  public async handleQueryMessage(payload: QueryMessagePayload): Promise<void> {
    try {
      console.log('[QueryMessageService] Processing query message:', payload);

      const communicationData = {
        sender_id: payload.sender,
        receiver_id: payload.receiver,
        message_type: MessageType.QUERY,
        content: JSON.stringify(payload)
      };

      const { error } = await supabase
        .from('agent_communications')
        .insert(communicationData);

      if (error) throw error;

      const response = await this.routeQuery(payload);
      await this.sendResponse(payload.sender, response);

    } catch (error) {
      console.error('[QueryMessageService] Error handling query message:', error);
      await this.storeFailedMessage('query', payload, error);
      throw error;
    }
  }

  private async routeQuery(payload: QueryMessagePayload): Promise<any> {
    const queryParams: QueryParameters = {
      queryId: payload.queryId,
      ...payload.parameters,
      timeout: payload.timeout
    };

    return this.queryRouter.routeQuery(payload.queryType as QueryType, queryParams);
  }

  private async sendResponse(agentId: string, response: any): Promise<void> {
    await this.notifyAgent(agentId, {
      type: MessageType.RESPONSE,
      content: response
    });
  }
}