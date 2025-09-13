/**
 * BFF Game Session Route
 * 
 * Provides a comprehensive game session endpoint optimized for React components.
 * Aggregates data from multiple sources and provides real-time updates via WebSocket.
 * 
 * Features:
 * - Complete game session state for React components
 * - Real-time message streaming with WebSocket integration
 * - Combat status and character readiness
 * - Memory context and session history
 * - Audio and voice synthesis integration
 * - Optimized for React Query and Suspense patterns
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';
import { 
  BFFGameSessionData, 
  BFFGameSessionRequest, 
  BFFGameSessionResponse,
  BFFMessageData,
  BFFCombatStatus,
  BFFAudioSettings,
  BFFNPCData
} from '../../bff/types';
import { 
  bffCachingMiddleware, 
  bffPerformanceMiddleware, 
  reactResponseShapingMiddleware,
  requestCoalescingMiddleware 
} from '../../bff/middleware/bff-middleware';
import bffWebSocketManager from '../../bff/websocket/websocket-manager';

export default function gameSessionRouter(db: Pool) {
  const router = Router();

  // Apply BFF middleware
  router.use(requireAuth);
  router.use(bffPerformanceMiddleware);
  router.use(requestCoalescingMiddleware);
  router.use(reactResponseShapingMiddleware);

  /**
   * GET /bff/game-session/:sessionId
   * 
   * Returns complete game session data optimized for React components
   */
  router.get('/:sessionId', 
    bffCachingMiddleware({ 
      ttl: 60, // 1 minute cache
      key: 'game-session',
      strategy: 'memory',
      invalidationTriggers: ['session_update', 'message_sent', 'combat_update']
    }),
    async (req: Request, res: Response) => {
      const { sessionId } = req.params;
      const userId = (req as any).user!.userId;
      const includeRealtimeUpdates = req.query.realtime === 'true';

      console.log(`🎮 BFF: Getting game session ${sessionId} for user ${userId}`);

      const client = await db.connect();
      try {
        // Get session data with related information
        const sessionQuery = `
          SELECT 
            s.*,
            c.name as campaign_name,
            c.description as campaign_description,
            c.genre,
            c.setting_details,
            ch.name as character_name,
            ch.level as character_level,
            ch.class as character_class,
            ch.race as character_race
          FROM game_sessions s
          LEFT JOIN campaigns c ON s.campaign_id = c.id
          LEFT JOIN characters ch ON s.character_id = ch.id
          WHERE s.id = $1 AND (s.user_id = $2 OR c.user_id = $2)
        `;
        
        const sessionResult = await client.query(sessionQuery, [sessionId, userId]);
        
        if (sessionResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Game session not found'
          } as BFFGameSessionResponse);
        }

        const session = sessionResult.rows[0];

        // Get recent messages (last 50)
        const messagesQuery = `
          SELECT 
            id,
            content,
            message_type,
            sender_type,
            character_id,
            metadata,
            created_at,
            audio_url
          FROM messages 
          WHERE session_id = $1 
          ORDER BY created_at DESC 
          LIMIT 50
        `;
        
        const messagesResult = await client.query(messagesQuery, [sessionId]);
        
        // Transform messages for React components
        const recentMessages: BFFMessageData[] = messagesResult.rows.reverse().map(msg => ({
          id: msg.id,
          type: msg.sender_type === 'user' ? 'user' : 'dm',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          characterId: msg.character_id,
          metadata: {
            hasAudio: !!msg.audio_url,
            ...msg.metadata
          },
          streamingState: 'complete'
        }));

        // Get NPCs for current session/campaign
        const npcsQuery = `
          SELECT DISTINCT
            jsonb_array_elements(metadata->'npcs') as npc_data
          FROM messages 
          WHERE session_id = $1 AND metadata ? 'npcs'
          LIMIT 10
        `;
        
        const npcsResult = await client.query(npcsQuery, [sessionId]);
        const npcs: BFFNPCData[] = npcsResult.rows.map(row => {
          const npcData = row.npc_data;
          return {
            id: npcData.id || `npc_${Math.random().toString(36).substr(2, 9)}`,
            name: npcData.name || 'Unknown NPC',
            description: npcData.description || '',
            role: npcData.role || 'character',
            isInCombat: npcData.isInCombat || false,
            relationship: npcData.relationship || 'neutral',
            lastInteraction: new Date()
          };
        });

        // Get combat status
        const combatQuery = `
          SELECT * FROM combat_encounters 
          WHERE session_id = $1 AND status = 'active'
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        const combatResult = await client.query(combatQuery, [sessionId]);
        
        let combatStatus: BFFCombatStatus = {
          isActive: false,
          currentTurn: 0,
          turnOrder: [],
          initiative: {},
          combatants: [],
          roundNumber: 0,
          phase: 'ended'
        };

        if (combatResult.rows.length > 0) {
          const combat = combatResult.rows[0];
          combatStatus = {
            isActive: combat.status === 'active',
            currentTurn: combat.current_turn || 0,
            turnOrder: combat.turn_order || [],
            initiative: combat.initiative_order || {},
            combatants: combat.combatants || [],
            roundNumber: combat.round_number || 1,
            phase: combat.status === 'active' ? 'active' : 'ended'
          };
        }

        // Default audio settings
        const audioSettings: BFFAudioSettings = {
          voiceEnabled: true,
          backgroundMusicEnabled: true,
          volume: 0.8,
          voiceId: 'default',
          musicVolume: 0.3,
          soundEffectsVolume: 0.6
        };

        // Build the complete session data
        const gameSessionData: BFFGameSessionData = {
          id: sessionId,
          campaignId: session.campaign_id,
          characterId: session.character_id,
          turnCount: session.turn_count || 0,
          currentScene: {
            description: session.current_scene_description || 'Your adventure begins...',
            location: session.current_location || 'Unknown Location',
            npcs,
            environment: session.environment_description || 'A mysterious place',
            mood: session.mood || 'neutral'
          },
          recentMessages,
          sessionState: session.status || 'active',
          realTimeUpdates: includeRealtimeUpdates,
          combatStatus,
          audioSettings
        };

        const response: BFFGameSessionResponse = {
          success: true,
          data: gameSessionData,
          websocketUrl: includeRealtimeUpdates ? `/bff/ws` : undefined
        };

        // If real-time updates requested, ensure WebSocket session is ready
        if (includeRealtimeUpdates) {
          console.log(`🔌 BFF: Real-time updates enabled for session ${sessionId}`);
        }

        console.log(`✅ BFF: Game session data loaded for ${sessionId}`);
        res.json(response);

      } catch (error) {
        console.error('❌ BFF Game session error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to load game session data'
        } as BFFGameSessionResponse);
      } finally {
        client.release();
      }
    }
  );

  /**
   * POST /bff/game-session
   * 
   * Create or join a game session with optimized data loading
   */
  router.post('/', async (req: Request, res: Response) => {
    const userId = (req as any).user!.userId;
    const { campaignId, characterId, includeRealtimeUpdates }: BFFGameSessionRequest = req.body;

    console.log(`🎮 BFF: Creating/joining game session - Campaign: ${campaignId}, Character: ${characterId}`);

    const client = await db.connect();
    try {
      // Check if an active session already exists
      const existingSessionQuery = `
        SELECT id FROM game_sessions 
        WHERE campaign_id = $1 AND character_id = $2 AND status = 'active'
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const existingResult = await client.query(existingSessionQuery, [campaignId, characterId]);
      
      let sessionId: string;
      
      if (existingResult.rows.length > 0) {
        // Use existing session
        sessionId = existingResult.rows[0].id;
        console.log(`♻️ BFF: Using existing session ${sessionId}`);
      } else {
        // Create new session
        const createSessionQuery = `
          INSERT INTO game_sessions (
            campaign_id, 
            character_id, 
            user_id, 
            status,
            turn_count,
            current_scene_description,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, 'active', 0, 'Your adventure begins in this mystical realm...', NOW(), NOW())
          RETURNING id
        `;
        
        const createResult = await client.query(createSessionQuery, [campaignId, characterId, userId]);
        sessionId = createResult.rows[0].id;
        
        console.log(`🆕 BFF: Created new session ${sessionId}`);

        // Send initial welcome message
        const welcomeMessageQuery = `
          INSERT INTO messages (
            session_id,
            content,
            message_type,
            sender_type,
            metadata,
            created_at
          ) VALUES (
            $1,
            'Welcome to your infinite adventure! The realm awaits your exploration. What would you like to do?',
            'narration',
            'dm',
            '{"isWelcome": true, "type": "session_start"}',
            NOW()
          )
        `;
        
        await client.query(welcomeMessageQuery, [sessionId]);
      }

      // Now get the complete session data using the existing GET endpoint logic
      const sessionQuery = `
        SELECT 
          s.*,
          c.name as campaign_name,
          c.description as campaign_description,
          c.genre,
          c.setting_details,
          ch.name as character_name,
          ch.level as character_level,
          ch.class as character_class,
          ch.race as character_race
        FROM game_sessions s
        LEFT JOIN campaigns c ON s.campaign_id = c.id
        LEFT JOIN characters ch ON s.character_id = ch.id
        WHERE s.id = $1
      `;
      
      const sessionResult = await client.query(sessionQuery, [sessionId]);
      const session = sessionResult.rows[0];

      // Get recent messages
      const messagesQuery = `
        SELECT 
          id, content, message_type, sender_type, character_id, metadata, created_at, audio_url
        FROM messages 
        WHERE session_id = $1 
        ORDER BY created_at DESC 
        LIMIT 20
      `;
      
      const messagesResult = await client.query(messagesQuery, [sessionId]);
      
      const recentMessages: BFFMessageData[] = messagesResult.rows.reverse().map(msg => ({
        id: msg.id,
        type: msg.sender_type === 'user' ? 'user' : 'dm',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        characterId: msg.character_id,
        metadata: {
          hasAudio: !!msg.audio_url,
          ...msg.metadata
        },
        streamingState: 'complete'
      }));

      const gameSessionData: BFFGameSessionData = {
        id: sessionId,
        campaignId: session.campaign_id,
        characterId: session.character_id,
        turnCount: session.turn_count || 0,
        currentScene: {
          description: session.current_scene_description || 'Your adventure begins...',
          location: session.current_location || 'Starting Location',
          npcs: [],
          environment: session.environment_description || 'A place of infinite possibilities',
          mood: session.mood || 'anticipatory'
        },
        recentMessages,
        sessionState: 'active',
        realTimeUpdates: includeRealtimeUpdates || false,
        combatStatus: {
          isActive: false,
          currentTurn: 0,
          turnOrder: [],
          initiative: {},
          combatants: [],
          roundNumber: 0,
          phase: 'ended'
        },
        audioSettings: {
          voiceEnabled: true,
          backgroundMusicEnabled: true,
          volume: 0.8,
          voiceId: 'default',
          musicVolume: 0.3,
          soundEffectsVolume: 0.6
        }
      };

      const response: BFFGameSessionResponse = {
        success: true,
        data: gameSessionData,
        websocketUrl: includeRealtimeUpdates ? `/bff/ws` : undefined
      };

      console.log(`✅ BFF: Game session ready ${sessionId}`);
      res.status(201).json(response);

    } catch (error) {
      console.error('❌ BFF Game session creation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create game session'
      } as BFFGameSessionResponse);
    } finally {
      client.release();
    }
  });

  /**
   * PUT /bff/game-session/:sessionId
   * 
   * Update game session state with real-time broadcasting
   */
  router.put('/:sessionId', async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = (req as any).user!.userId;
    const updates = req.body;

    console.log(`🔄 BFF: Updating game session ${sessionId}`);

    const client = await db.connect();
    try {
      // Build update query dynamically
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (updates.turnCount !== undefined) {
        updateFields.push(`turn_count = $${paramCount++}`);
        values.push(updates.turnCount);
      }

      if (updates.currentScene) {
        if (updates.currentScene.description) {
          updateFields.push(`current_scene_description = $${paramCount++}`);
          values.push(updates.currentScene.description);
        }
        if (updates.currentScene.location) {
          updateFields.push(`current_location = $${paramCount++}`);
          values.push(updates.currentScene.location);
        }
      }

      if (updates.sessionState) {
        updateFields.push(`status = $${paramCount++}`);
        values.push(updates.sessionState);
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        values.push(sessionId);

        const updateQuery = `
          UPDATE game_sessions 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
          RETURNING *
        `;

        const result = await client.query(updateQuery, values);
        
        if (result.rows.length > 0) {
          // Broadcast update via WebSocket
          bffWebSocketManager.sendToSession(sessionId, {
            type: 'session_update',
            payload: {
              sessionId,
              updates,
              timestamp: new Date().toISOString()
            },
            timestamp: new Date(),
            sessionId,
            userId
          });

          console.log(`✅ BFF: Session ${sessionId} updated and broadcasted`);
          res.json({ success: true, data: result.rows[0] });
        } else {
          res.status(404).json({ success: false, error: 'Session not found' });
        }
      } else {
        res.status(400).json({ success: false, error: 'No valid update fields provided' });
      }

    } catch (error) {
      console.error('❌ BFF Game session update error:', error);
      res.status(500).json({ success: false, error: 'Failed to update game session' });
    } finally {
      client.release();
    }
  });

  /**
   * GET /bff/game-session/:sessionId/stats
   * 
   * Get WebSocket session statistics
   */
  router.get('/:sessionId/stats', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const stats = bffWebSocketManager.getSessionStats(sessionId);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Session not found in WebSocket manager'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  });

  return router;
}