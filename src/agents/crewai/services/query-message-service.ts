/**
 * Query Message Service for CrewAI
 * 
 * This file defines the QueryMessageService class, responsible for handling
 * query-type messages within the CrewAI agent framework. It processes incoming queries,
 * routes them using QueryRouterService, and sends responses back.
 * It extends BaseMessageService for common functionalities.
 * 
 * Main Class:
 * - QueryMessageService: Handles query messages.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - BaseMessageService (./base-message-service.ts)
 * - QueryRouterService (./query-router-service.ts)
 * - Various CrewAI message and query types.
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// Base Service
import { BaseMessageService } from './base-message-service'; // Assuming kebab-case

// CrewAI Services (assuming kebab-case filenames)
import { QueryRouterService } from './query-router-service';

// CrewAI Types
import { MessageType } from '../types/communication';
import { QueryMessagePayload } from '../types/messages';
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