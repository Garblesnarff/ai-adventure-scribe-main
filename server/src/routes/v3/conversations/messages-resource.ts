/**
 * Conversation Messages REST Resource
 * 
 * Handles conversation messages as a nested REST resource with full CRUD operations
 */

import { Pool } from 'pg';
import { Request, Response, NextFunction } from 'express';
import { BaseRestResource, PaginationOptions, FilterOptions, SortOptions, FieldSelectionOptions } from '../../../lib/rest/base-resource';
import { ValidationError, NotFoundError } from '../../../lib/rest/rest-errors';
import { schemaValidator } from '../../../lib/validation/schema-validator';

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

export class ConversationMessagesResource extends BaseRestResource {
  constructor(db: Pool) {
    super(db, {
      resourceName: 'conversation_messages',
      resourcePath: '/api/v3/conversations/:conversationId/messages',
      idField: 'id',
      allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      cacheTTL: 60, // Shorter cache for messages
      supportsPagination: true,
      supportsFiltering: true,
      supportsSorting: true,
      supportsFieldSelection: true
    });

    this.registerSchemas();
  }

  /**
   * Override to handle conversation ID parameter
   */
  public async handleCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Validate conversation exists
    const conversationId = req.params.conversationId;
    if (!conversationId) {
      return next(new ValidationError('Conversation ID is required'));
    }

    const conversationExists = await this.checkConversationExists(conversationId);
    if (!conversationExists) {
      return next(new NotFoundError('Conversation not found'));
    }

    // Inject conversation ID into filters
    req.query.conversation_id = conversationId;
    
    super.handleCollection(req, res, next);
  }

  /**
   * Override to handle conversation ID parameter for creation
   */
  public async handleCreate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const conversationId = req.params.conversationId;
    if (!conversationId) {
      return next(new ValidationError('Conversation ID is required'));
    }

    const conversationExists = await this.checkConversationExists(conversationId);
    if (!conversationExists) {
      return next(new NotFoundError('Conversation not found'));
    }

    // Inject conversation ID into request body
    req.body.conversation_id = conversationId;
    
    super.handleCreate(req, res, next);
  }

  /**
   * Override to handle nested resource parameters
   */
  public async handleResource(req: Request, res: Response, next: NextFunction): Promise<void> {
    const conversationId = req.params.conversationId;
    const messageId = req.params.messageId;
    
    if (!conversationId || !messageId) {
      return next(new ValidationError('Both conversation ID and message ID are required'));
    }

    // Set the resource ID for the base handler
    req.params.id = messageId;
    
    super.handleResource(req, res, next);
  }

  /**
   * Override update methods to handle nested parameters
   */
  public async handleUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.params.id = req.params.messageId;
    req.body.conversation_id = req.params.conversationId;
    super.handleUpdate(req, res, next);
  }

  public async handlePartialUpdate(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.params.id = req.params.messageId;
    req.body.conversation_id = req.params.conversationId;
    super.handlePartialUpdate(req, res, next);
  }

  public async handleDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    req.params.id = req.params.messageId;
    super.handleDelete(req, res, next);
  }

  /**
   * Get messages collection for a conversation
   */
  protected async getCollection(
    pagination?: PaginationOptions,
    filters?: FilterOptions,
    sort?: SortOptions[],
    fieldSelection?: FieldSelectionOptions
  ): Promise<ConversationMessage[]> {
    let query = `
      SELECT 
        id,
        conversation_id,
        sender_id,
        sender_type,
        content,
        message_type,
        metadata,
        created_at,
        updated_at
      FROM conversation_messages 
      WHERE conversation_id = $1
    `;

    const queryParams: any[] = [filters?.conversation_id];
    let paramIndex = 2;

    // Apply filters
    if (filters) {
      if (filters.sender_id) {
        query += ` AND sender_id = $${paramIndex++}`;
        queryParams.push(filters.sender_id);
      }

      if (filters.sender_type) {
        query += ` AND sender_type = $${paramIndex++}`;
        queryParams.push(filters.sender_type);
      }

      if (filters.message_type) {
        query += ` AND message_type = $${paramIndex++}`;
        queryParams.push(filters.message_type);
      }

      if (filters.search) {
        query += ` AND content ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.search}%`);
      }

      if (filters.created_after) {
        query += ` AND created_at > $${paramIndex++}`;
        queryParams.push(filters.created_after);
      }

      if (filters.created_before) {
        query += ` AND created_at < $${paramIndex++}`;
        queryParams.push(filters.created_before);
      }

      if (filters.has_audio === 'true') {
        query += ` AND metadata->>'audio_url' IS NOT NULL`;
      }

      if (filters.has_dice_rolls === 'true') {
        query += ` AND metadata->'dice_rolls' IS NOT NULL`;
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
      query += ' ORDER BY created_at ASC'; // Messages chronological order
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
    return result.rows.map(row => this.mapDbRowToMessage(row));
  }

  /**
   * Get total count for pagination
   */
  protected async getTotalCount(filters?: FilterOptions): Promise<number> {
    let query = 'SELECT COUNT(*) FROM conversation_messages WHERE conversation_id = $1';
    const queryParams: any[] = [filters?.conversation_id];
    let paramIndex = 2;

    // Apply same filters as getCollection (simplified)
    if (filters) {
      if (filters.sender_id) {
        query += ` AND sender_id = $${paramIndex++}`;
        queryParams.push(filters.sender_id);
      }

      if (filters.sender_type) {
        query += ` AND sender_type = $${paramIndex++}`;
        queryParams.push(filters.sender_type);
      }

      if (filters.message_type) {
        query += ` AND message_type = $${paramIndex++}`;
        queryParams.push(filters.message_type);
      }

      if (filters.search) {
        query += ` AND content ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.search}%`);
      }
    }

    const result = await this.db.query(query, queryParams);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get individual message
   */
  protected async getResource(id: string, fieldSelection?: FieldSelectionOptions): Promise<ConversationMessage | null> {
    const query = `
      SELECT 
        id,
        conversation_id,
        sender_id,
        sender_type,
        content,
        message_type,
        metadata,
        created_at,
        updated_at
      FROM conversation_messages 
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbRowToMessage(result.rows[0]);
  }

  /**
   * Create new message
   */
  protected async createResource(data: any): Promise<ConversationMessage> {
    const message = {
      id: data.id || this.generateId(),
      conversation_id: data.conversation_id,
      sender_id: data.sender_id,
      sender_type: data.sender_type || 'user',
      content: data.content,
      message_type: data.message_type || 'text',
      metadata: {
        dice_rolls: data.dice_rolls,
        audio_url: data.audio_url,
        context: data.context || {},
        references: data.references || [],
        ...data.metadata
      }
    };

    const query = `
      INSERT INTO conversation_messages (
        id, conversation_id, sender_id, sender_type, content, message_type, metadata, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      ) RETURNING *
    `;

    const result = await this.db.query(query, [
      message.id,
      message.conversation_id,
      message.sender_id,
      message.sender_type,
      message.content,
      message.message_type,
      JSON.stringify(message.metadata)
    ]);

    return this.mapDbRowToMessage(result.rows[0]);
  }

  /**
   * Update entire message (PUT)
   */
  protected async updateResource(id: string, data: any): Promise<ConversationMessage> {
    const query = `
      UPDATE conversation_messages 
      SET 
        sender_id = $2,
        sender_type = $3,
        content = $4,
        message_type = $5,
        metadata = $6,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      data.sender_id,
      data.sender_type,
      data.content,
      data.message_type,
      JSON.stringify(data.metadata || {})
    ]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Message not found');
    }

    return this.mapDbRowToMessage(result.rows[0]);
  }

  /**
   * Partially update message (PATCH)
   */
  protected async patchResource(id: string, data: any): Promise<ConversationMessage> {
    const updateFields: string[] = [];
    const queryParams: any[] = [id];
    let paramIndex = 2;

    if (data.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      queryParams.push(data.content);
    }

    if (data.message_type !== undefined) {
      updateFields.push(`message_type = $${paramIndex++}`);
      queryParams.push(data.message_type);
    }

    if (data.metadata !== undefined) {
      updateFields.push(`metadata = metadata || $${paramIndex++}`);
      queryParams.push(JSON.stringify(data.metadata));
    }

    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      throw new ValidationError('No fields to update provided');
    }

    const query = `
      UPDATE conversation_messages 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, queryParams);

    if (result.rows.length === 0) {
      throw new NotFoundError('Message not found');
    }

    return this.mapDbRowToMessage(result.rows[0]);
  }

  /**
   * Delete message
   */
  protected async deleteResource(id: string): Promise<void> {
    const result = await this.db.query('DELETE FROM conversation_messages WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      throw new NotFoundError('Message not found');
    }
  }

  /**
   * Validate data for creating messages
   */
  protected async validateCreateData(data: any): Promise<void> {
    schemaValidator.validateOrThrow('message-create', data);

    // Validate conversation exists
    if (!await this.checkConversationExists(data.conversation_id)) {
      throw new ValidationError('Referenced conversation does not exist');
    }
  }

  /**
   * Validate data for updating messages
   */
  protected async validateUpdateData(data: any): Promise<void> {
    schemaValidator.validateOrThrow('message-update', data);
  }

  /**
   * Validate data for patching messages
   */
  protected async validatePatchData(data: any): Promise<void> {
    schemaValidator.validateOrThrow('message-patch', data);
  }

  // Helper methods
  private mapDbRowToMessage(row: any): ConversationMessage {
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      sender_type: row.sender_type,
      content: row.content,
      message_type: row.message_type,
      metadata: row.metadata || {},
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'created': 'created_at',
      'updated': 'updated_at',
      'sender': 'sender_id',
      'type': 'message_type'
    };

    return fieldMap[field] || field;
  }

  private generateId(): string {
    return 'msg_' + Math.random().toString(36).substr(2, 9);
  }

  private async checkConversationExists(conversationId: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM conversations WHERE id = $1', [conversationId]);
    return result.rows.length > 0;
  }

  private registerSchemas(): void {
    // Register JSON schemas for validation
    schemaValidator.registerSchema('message-create', {
      type: 'object',
      required: ['sender_id', 'content'],
      properties: {
        sender_id: { type: 'string', minLength: 1 },
        sender_type: { 
          type: 'string', 
          enum: ['user', 'character', 'dm', 'system'] 
        },
        content: { type: 'string', minLength: 1, maxLength: 10000 },
        message_type: { 
          type: 'string', 
          enum: ['text', 'action', 'roll', 'system', 'narration'] 
        },
        dice_rolls: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'result'],
            properties: {
              type: { type: 'string' },
              result: { type: 'number' },
              modifier: { type: 'number' }
            }
          }
        },
        audio_url: { type: 'string', format: 'uri' },
        context: { type: 'object' },
        references: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'id', 'name'],
            properties: {
              type: { 
                type: 'string',
                enum: ['character', 'spell', 'item', 'location']
              },
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      },
      additionalProperties: false
    });

    schemaValidator.registerSchema('message-update', {
      type: 'object',
      required: ['sender_id', 'sender_type', 'content', 'message_type'],
      properties: {
        sender_id: { type: 'string', minLength: 1 },
        sender_type: { 
          type: 'string', 
          enum: ['user', 'character', 'dm', 'system'] 
        },
        content: { type: 'string', minLength: 1, maxLength: 10000 },
        message_type: { 
          type: 'string', 
          enum: ['text', 'action', 'roll', 'system', 'narration'] 
        },
        metadata: {
          type: 'object',
          properties: {
            dice_rolls: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'result'],
                properties: {
                  type: { type: 'string' },
                  result: { type: 'number' },
                  modifier: { type: 'number' }
                }
              }
            },
            audio_url: { type: 'string', format: 'uri' },
            context: { type: 'object' },
            references: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'id', 'name'],
                properties: {
                  type: { 
                    type: 'string',
                    enum: ['character', 'spell', 'item', 'location']
                  },
                  id: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      },
      additionalProperties: false
    });

    schemaValidator.registerSchema('message-patch', {
      type: 'object',
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 10000 },
        message_type: { 
          type: 'string', 
          enum: ['text', 'action', 'roll', 'system', 'narration'] 
        },
        metadata: {
          type: 'object',
          properties: {
            dice_rolls: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'result'],
                properties: {
                  type: { type: 'string' },
                  result: { type: 'number' },
                  modifier: { type: 'number' }
                }
              }
            },
            audio_url: { type: 'string', format: 'uri' },
            context: { type: 'object' },
            references: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'id', 'name'],
                properties: {
                  type: { 
                    type: 'string',
                    enum: ['character', 'spell', 'item', 'location']
                  },
                  id: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      },
      additionalProperties: false,
      minProperties: 1
    });
  }
}