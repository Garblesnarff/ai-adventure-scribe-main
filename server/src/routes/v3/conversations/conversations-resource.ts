/**
 * Conversations REST Resource
 * 
 * Handles chat and DM interactions with full REST compliance, HATEOAS,
 * and comprehensive conversation management capabilities.
 */

import { Pool } from 'pg';
import { BaseRestResource, PaginationOptions, FilterOptions, SortOptions, FieldSelectionOptions } from '../../../lib/rest/base-resource';
import { ValidationError, NotFoundError, ConflictError } from '../../../lib/rest/rest-errors';
import { schemaValidator } from '../../../lib/validation/schema-validator';

export interface Conversation {
  id: string;
  title: string;
  campaign_id?: string;
  type: 'dm_chat' | 'player_chat' | 'narrative' | 'combat';
  status: 'active' | 'paused' | 'completed' | 'archived';
  participants: string[]; // User/character IDs
  metadata: {
    total_messages?: number;
    last_message_at?: Date;
    created_by?: string;
    tags?: string[];
    context?: Record<string, any>;
  };
  created_at: Date;
  updated_at: Date;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'user' | 'character' | 'dm' | 'system';
  content: string;
  message_type: 'text' | 'action' | 'roll' | 'system' | 'narration';
  metadata: {
    dice_rolls?: Array<{
      type: string;
      result: number;
      modifier?: number;
    }>;
    audio_url?: string;
    context?: Record<string, any>;
    references?: Array<{
      type: 'character' | 'spell' | 'item' | 'location';
      id: string;
      name: string;
    }>;
  };
  created_at: Date;
  updated_at: Date;
}

export class ConversationsResource extends BaseRestResource {
  constructor(db: Pool) {
    super(db, {
      resourceName: 'conversations',
      resourcePath: '/api/v3/conversations',
      idField: 'id',
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      cacheTTL: 300,
      supportsPagination: true,
      supportsFiltering: true,
      supportsSorting: true,
      supportsFieldSelection: true
    });

    this.registerSchemas();
  }

  /**
   * Get conversations collection with filtering and pagination
   */
  protected async getCollection(
    pagination?: PaginationOptions,
    filters?: FilterOptions,
    sort?: SortOptions[],
    fieldSelection?: FieldSelectionOptions
  ): Promise<Conversation[]> {
    let query = `
      SELECT 
        c.*,
        COALESCE(
          json_build_object(
            'total_messages', msg_stats.total_messages,
            'last_message_at', msg_stats.last_message_at,
            'created_by', c.metadata->>'created_by',
            'tags', c.metadata->'tags',
            'context', c.metadata->'context'
          ),
          '{}'::json
        ) as metadata
      FROM conversations c
      LEFT JOIN (
        SELECT 
          conversation_id,
          COUNT(*) as total_messages,
          MAX(created_at) as last_message_at
        FROM conversation_messages 
        GROUP BY conversation_id
      ) msg_stats ON c.id = msg_stats.conversation_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters) {
      if (filters.campaign_id) {
        query += ` AND c.campaign_id = $${paramIndex++}`;
        queryParams.push(filters.campaign_id);
      }

      if (filters.type) {
        query += ` AND c.type = $${paramIndex++}`;
        queryParams.push(filters.type);
      }

      if (filters.status) {
        query += ` AND c.status = $${paramIndex++}`;
        queryParams.push(filters.status);
      }

      if (filters.participant_id) {
        query += ` AND $${paramIndex++} = ANY(c.participants)`;
        queryParams.push(filters.participant_id);
      }

      if (filters.search) {
        query += ` AND (c.title ILIKE $${paramIndex++} OR c.metadata->>'context' ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`, `%${filters.search}%`);
        paramIndex += 2;
      }

      if (filters.created_after) {
        query += ` AND c.created_at > $${paramIndex++}`;
        queryParams.push(filters.created_after);
      }

      if (filters.created_before) {
        query += ` AND c.created_at < $${paramIndex++}`;
        queryParams.push(filters.created_before);
      }

      if (filters.has_messages) {
        query += ` AND msg_stats.total_messages ${filters.has_messages === 'true' ? '> 0' : 'IS NULL'}`;
      }
    }

    // Apply sorting
    if (sort && sort.length > 0) {
      const sortClauses = sort.map(s => {
        const column = this.mapSortField(s.field);
        return `${column} ${s.direction.toUpperCase()}`;
      });
      query += ` ORDER BY ${sortClauses.join(', ')}`;
    } else {
      query += ' ORDER BY c.updated_at DESC';
    }

    // Apply pagination
    if (pagination) {
      if (pagination.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(pagination.limit);
      }

      if (pagination.offset) {
        query += ` OFFSET $${paramIndex++}`;
        queryParams.push(pagination.offset);
      }
    }

    const result = await this.db.query(query, queryParams);
    return result.rows.map(row => this.mapDbRowToConversation(row));
  }

  /**
   * Get total count for pagination
   */
  protected async getTotalCount(filters?: FilterOptions): Promise<number> {
    let query = 'SELECT COUNT(*) FROM conversations c WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Apply same filters as getCollection
    if (filters) {
      if (filters.campaign_id) {
        query += ` AND c.campaign_id = $${paramIndex++}`;
        queryParams.push(filters.campaign_id);
      }

      if (filters.type) {
        query += ` AND c.type = $${paramIndex++}`;
        queryParams.push(filters.type);
      }

      if (filters.status) {
        query += ` AND c.status = $${paramIndex++}`;
        queryParams.push(filters.status);
      }

      if (filters.participant_id) {
        query += ` AND $${paramIndex++} = ANY(c.participants)`;
        queryParams.push(filters.participant_id);
      }

      if (filters.search) {
        query += ` AND (c.title ILIKE $${paramIndex++} OR c.metadata->>'context' ILIKE $${paramIndex})`;
        queryParams.push(`%${filters.search}%`, `%${filters.search}%`);
        paramIndex += 2;
      }

      if (filters.created_after) {
        query += ` AND c.created_at > $${paramIndex++}`;
        queryParams.push(filters.created_after);
      }

      if (filters.created_before) {
        query += ` AND c.created_at < $${paramIndex++}`;
        queryParams.push(filters.created_before);
      }
    }

    const result = await this.db.query(query, queryParams);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get individual conversation
   */
  protected async getResource(id: string, fieldSelection?: FieldSelectionOptions): Promise<Conversation | null> {
    const query = `
      SELECT 
        c.*,
        COALESCE(
          json_build_object(
            'total_messages', msg_stats.total_messages,
            'last_message_at', msg_stats.last_message_at,
            'created_by', c.metadata->>'created_by',
            'tags', c.metadata->'tags',
            'context', c.metadata->'context'
          ),
          '{}'::json
        ) as metadata
      FROM conversations c
      LEFT JOIN (
        SELECT 
          conversation_id,
          COUNT(*) as total_messages,
          MAX(created_at) as last_message_at
        FROM conversation_messages 
        GROUP BY conversation_id
      ) msg_stats ON c.id = msg_stats.conversation_id
      WHERE c.id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbRowToConversation(result.rows[0]);
  }

  /**
   * Create new conversation
   */
  protected async createResource(data: any): Promise<Conversation> {
    const conversation = {
      id: data.id || this.generateId(),
      title: data.title,
      campaign_id: data.campaign_id,
      type: data.type || 'dm_chat',
      status: data.status || 'active',
      participants: data.participants || [],
      metadata: {
        created_by: data.created_by,
        tags: data.tags || [],
        context: data.context || {},
        ...data.metadata
      }
    };

    const query = `
      INSERT INTO conversations (
        id, title, campaign_id, type, status, participants, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `;

    const result = await this.db.query(query, [
      conversation.id,
      conversation.title,
      conversation.campaign_id,
      conversation.type,
      conversation.status,
      conversation.participants,
      JSON.stringify(conversation.metadata)
    ]);

    return this.mapDbRowToConversation(result.rows[0]);
  }

  /**
   * Update entire conversation (PUT)
   */
  protected async updateResource(id: string, data: any): Promise<Conversation> {
    const query = `
      UPDATE conversations 
      SET 
        title = $2,
        campaign_id = $3,
        type = $4,
        status = $5,
        participants = $6,
        metadata = $7,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      data.title,
      data.campaign_id,
      data.type,
      data.status,
      data.participants,
      JSON.stringify(data.metadata || {})
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Conversation not found');
    }

    return this.mapDbRowToConversation(result.rows[0]);
  }

  /**
   * Partially update conversation (PATCH)
   */
  protected async patchResource(id: string, data: any): Promise<Conversation> {
    // Build dynamic update query
    const updateFields: string[] = [];
    const queryParams: any[] = [id];
    let paramIndex = 2;

    if (data.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      queryParams.push(data.title);
    }

    if (data.campaign_id !== undefined) {
      updateFields.push(`campaign_id = $${paramIndex++}`);
      queryParams.push(data.campaign_id);
    }

    if (data.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      queryParams.push(data.type);
    }

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      queryParams.push(data.status);
    }

    if (data.participants !== undefined) {
      updateFields.push(`participants = $${paramIndex++}`);
      queryParams.push(data.participants);
    }

    if (data.metadata !== undefined) {
      updateFields.push(`metadata = metadata || $${paramIndex++}`);
      queryParams.push(JSON.stringify(data.metadata));
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) { // Only updated_at
      throw new ValidationError('No fields to update provided');
    }

    const query = `
      UPDATE conversations 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, queryParams);

    if (result.rows.length === 0) {
      throw new NotFoundError('Conversation not found');
    }

    return this.mapDbRowToConversation(result.rows[0]);
  }

  /**
   * Delete conversation
   */
  protected async deleteResource(id: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Delete messages first
      await client.query('DELETE FROM conversation_messages WHERE conversation_id = $1', [id]);

      // Delete conversation
      const result = await client.query('DELETE FROM conversations WHERE id = $1', [id]);

      if (result.rowCount === 0) {
        throw new NotFoundError('Conversation not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate data for creating conversations
   */
  protected async validateCreateData(data: any): Promise<void> {
    schemaValidator.validateOrThrow('conversation-create', data);

    // Additional business logic validation
    if (data.campaign_id) {
      const campaignExists = await this.checkCampaignExists(data.campaign_id);
      if (!campaignExists) {
        throw new ValidationError('Referenced campaign does not exist');
      }
    }

    if (data.participants && data.participants.length > 0) {
      const participantsExist = await this.checkParticipantsExist(data.participants);
      if (!participantsExist) {
        throw new ValidationError('One or more referenced participants do not exist');
      }
    }
  }

  /**
   * Validate data for updating conversations
   */
  protected async validateUpdateData(data: any): Promise<void> {
    schemaValidator.validateOrThrow('conversation-update', data);
    await this.validateCreateData(data); // Same validation rules
  }

  /**
   * Validate data for patching conversations
   */
  protected async validatePatchData(data: any): Promise<void> {
    schemaValidator.validateOrThrow('conversation-patch', data);

    // Validate references if provided
    if (data.campaign_id) {
      const campaignExists = await this.checkCampaignExists(data.campaign_id);
      if (!campaignExists) {
        throw new ValidationError('Referenced campaign does not exist');
      }
    }

    if (data.participants) {
      const participantsExist = await this.checkParticipantsExist(data.participants);
      if (!participantsExist) {
        throw new ValidationError('One or more referenced participants do not exist');
      }
    }
  }

  // Helper methods
  private mapDbRowToConversation(row: any): Conversation {
    return {
      id: row.id,
      title: row.title,
      campaign_id: row.campaign_id,
      type: row.type,
      status: row.status,
      participants: row.participants,
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'created': 'c.created_at',
      'updated': 'c.updated_at',
      'title': 'c.title',
      'type': 'c.type',
      'status': 'c.status',
      'message_count': 'msg_stats.total_messages'
    };

    return fieldMap[field] || `c.${field}`;
  }

  private generateId(): string {
    return 'conv_' + Math.random().toString(36).substr(2, 9);
  }

  private async checkCampaignExists(campaignId: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM campaigns WHERE id = $1', [campaignId]);
    return result.rows.length > 0;
  }

  private async checkParticipantsExist(participantIds: string[]): Promise<boolean> {
    // This would check against users/characters tables
    // Simplified for now
    return true;
  }

  private registerSchemas(): void {
    // Register JSON schemas for validation
    schemaValidator.registerSchema('conversation-create', {
      type: 'object',
      required: ['title', 'type'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        campaign_id: { type: 'string', format: 'uuid' },
        type: { 
          type: 'string', 
          enum: ['dm_chat', 'player_chat', 'narrative', 'combat'] 
        },
        status: { 
          type: 'string', 
          enum: ['active', 'paused', 'completed', 'archived'] 
        },
        participants: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true
        },
        metadata: {
          type: 'object',
          properties: {
            created_by: { type: 'string' },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            context: { type: 'object' }
          }
        }
      },
      additionalProperties: false
    });

    schemaValidator.registerSchema('conversation-update', {
      type: 'object',
      required: ['title', 'type', 'status'],
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        campaign_id: { type: 'string', format: 'uuid' },
        type: { 
          type: 'string', 
          enum: ['dm_chat', 'player_chat', 'narrative', 'combat'] 
        },
        status: { 
          type: 'string', 
          enum: ['active', 'paused', 'completed', 'archived'] 
        },
        participants: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true
        },
        metadata: {
          type: 'object',
          properties: {
            created_by: { type: 'string' },
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            context: { type: 'object' }
          }
        }
      },
      additionalProperties: false
    });

    schemaValidator.registerSchema('conversation-patch', {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        campaign_id: { type: 'string', format: 'uuid' },
        type: { 
          type: 'string', 
          enum: ['dm_chat', 'player_chat', 'narrative', 'combat'] 
        },
        status: { 
          type: 'string', 
          enum: ['active', 'paused', 'completed', 'archived'] 
        },
        participants: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true
        },
        metadata: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' }
            },
            context: { type: 'object' }
          }
        }
      },
      additionalProperties: false,
      minProperties: 1
    });
  }
}