/**
 * Query Router Service for CrewAI
 * 
 * This file defines the QueryRouterService class, responsible for routing
 * queries within the CrewAI agent framework to their appropriate handlers.
 * It manages a query cache, handles query timeouts, and logs query executions.
 * This service is a singleton.
 * 
 * Main Class:
 * - QueryRouterService: Routes queries and manages their lifecycle.
 * 
 * Key Dependencies:
 * - Supabase client (`@/integrations/supabase/client`)
 * - CrewAI query types (`../types/query`)
 * 
 * @author AI Dungeon Master Team
 */

// External/SDK Imports
import { supabase } from '@/integrations/supabase/client';

// CrewAI Types
import { QueryType, QueryStatus, QueryParameters, QueryResponse } from '../types/query';


export class QueryRouterService {
  private static instance: QueryRouterService;
  private queryCache: Map<string, QueryResponse>;
  private timeouts: Map<string, NodeJS.Timeout>;

  private constructor() {
    this.queryCache = new Map();
    this.timeouts = new Map();
  }

  public static getInstance(): QueryRouterService {
    if (!QueryRouterService.instance) {
      QueryRouterService.instance = new QueryRouterService();
    }
    return QueryRouterService.instance;
  }

  /**
   * Routes a query to the appropriate handler
   */
  public async routeQuery(type: QueryType, params: QueryParameters): Promise<QueryResponse> {
    try {
      console.log(`[QueryRouter] Routing query of type: ${type}`);
      
      // Set initial query status
      const initialResponse: QueryResponse = {
        queryId: params.queryId,
        status: QueryStatus.PENDING,
        timestamp: new Date()
      };

      // Cache the initial response
      this.queryCache.set(params.queryId, initialResponse);

      // Set timeout if specified
      if (params.timeout) {
        this.setQueryTimeout(params.queryId, params.timeout);
      }

      // Route to appropriate handler
      const response = await this.handleQuery(type, params);
      
      // Update cache with response
      this.queryCache.set(params.queryId, response);

      // Log query in database
      await this.logQuery(type, params, response);

      return response;
    } catch (error) {
      console.error('[QueryRouter] Error routing query:', error);
      return {
        queryId: params.queryId,
        status: QueryStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date()
      };
    }
  }

  /**
   * Handles the query based on its type
   */
  private async handleQuery(type: QueryType, params: QueryParameters): Promise<QueryResponse> {
    switch (type) {
      case QueryType.TASK_STATUS:
        return this.handleTaskStatusQuery(params);
      case QueryType.AGENT_STATUS:
        return this.handleAgentStatusQuery(params);
      case QueryType.MEMORY_RETRIEVAL:
        return this.handleMemoryRetrievalQuery(params);
      default:
        throw new Error(`Unsupported query type: ${type}`);
    }
  }

  /**
   * Sets a timeout for query execution
   */
  private setQueryTimeout(queryId: string, timeout: number): void {
    const timeoutId = setTimeout(() => {
      const response: QueryResponse = {
        queryId,
        status: QueryStatus.FAILED,
        error: 'Query timeout exceeded',
        timestamp: new Date()
      };
      this.queryCache.set(queryId, response);
      this.timeouts.delete(queryId);
    }, timeout);

    this.timeouts.set(queryId, timeoutId);
  }

  /**
   * Logs query execution in database
   */
  private async logQuery(type: QueryType, params: QueryParameters, response: QueryResponse): Promise<void> {
    try {
      const { error } = await supabase
        .from('agent_communications')
        .insert({
          message_type: 'QUERY',
          content: JSON.stringify({
            type,
            params,
            response
          })
        });

      if (error) throw error;
    } catch (error) {
      console.error('[QueryRouter] Error logging query:', error);
    }
  }

  /**
   * Handles task status queries
   */
  private async handleTaskStatusQuery(params: QueryParameters): Promise<QueryResponse> {
    // Basic implementation for MVP
    const { data, error } = await supabase
      .from('task_queue')
      .select('*')
      .eq('id', (params as any).taskId)
      .single();

    if (error) throw error;

    return {
      queryId: params.queryId,
      status: QueryStatus.COMPLETED,
      data,
      timestamp: new Date()
    };
  }

  /**
   * Handles agent status queries
   */
  private async handleAgentStatusQuery(params: QueryParameters): Promise<QueryResponse> {
    // Basic implementation for MVP
    const { data, error } = await supabase
      .from('agent_states')
      .select('*')
      .eq('id', (params as any).agentId)
      .single();

    if (error) throw error;

    return {
      queryId: params.queryId,
      status: QueryStatus.COMPLETED,
      data,
      timestamp: new Date()
    };
  }

  /**
   * Handles memory retrieval queries
   */
  private async handleMemoryRetrievalQuery(params: QueryParameters): Promise<QueryResponse> {
    // Basic implementation for MVP
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('session_id', (params as any).sessionId)
      .limit((params as any).limit || 10);

    if (error) throw error;

    return {
      queryId: params.queryId,
      status: QueryStatus.COMPLETED,
      data,
      timestamp: new Date()
    };
  }

  /**
   * Cleans up query resources
   */
  public cleanupQuery(queryId: string): void {
    const timeout = this.timeouts.get(queryId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(queryId);
    }
    this.queryCache.delete(queryId);
  }
}
