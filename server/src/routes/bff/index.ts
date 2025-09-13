/**
 * BFF (Backend-for-Frontend) Main Router
 * 
 * Aggregates all BFF endpoints optimized for React components.
 * Provides a unified API surface that eliminates impedance mismatch
 * between generic backend APIs and frontend component requirements.
 * 
 * Features:
 * - Game session management with real-time updates
 * - Character dashboard with comprehensive stats
 * - Campaign overview with generated content
 * - Streaming chat interface with SSE
 * - Memory context for sessions
 * - Audio player integration
 * - Rules assistant for D&D validation
 * - WebSocket-based real-time features
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';
import {
  bffCorsMiddleware,
  bffErrorHandlingMiddleware,
  bffPerformanceMiddleware,
  requestBatchingMiddleware,
  getBFFMetrics
} from '../../bff/middleware/bff-middleware';
import bffWebSocketManager from '../../bff/websocket/websocket-manager';
import gameSessionRouter from './game-session';
import characterDashboardRouter from './character-dashboard';
import streamingChatRouter from './streaming-chat';
import { cleanupOldStreams } from './streaming-chat';

// Import additional BFF routes that we'll implement
// import campaignOverviewRouter from './campaign-overview';
// import memoryContextRouter from './memory-context';
// import audioPlayerRouter from './audio-player';
// import rulesAssistantRouter from './rules-assistant';

export default function bffRouter(db: Pool) {
  const router = Router();

  // Apply global BFF middleware
  router.use(bffCorsMiddleware);
  router.use(bffPerformanceMiddleware);
  router.use(requestBatchingMiddleware);

  /**
   * BFF Health Check and Information
   */
  router.get('/health', (req: Request, res: Response) => {
    const metrics = getBFFMetrics();
    const wsStats = bffWebSocketManager.getOverallStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'real_time_sessions',
        'streaming_chat',
        'character_dashboard',
        'websocket_support',
        'sse_streaming',
        'request_coalescing',
        'response_caching',
        'error_boundaries'
      ],
      metrics: {
        ...metrics,
        websocket: wsStats
      },
      endpoints: {
        game_session: '/bff/game-session',
        character_dashboard: '/bff/character-dashboard',
        streaming_chat: '/bff/streaming-chat',
        websocket: '/bff/ws',
        batch: '/bff/batch'
      }
    });
  });

  /**
   * BFF Metrics Endpoint (for monitoring)
   */
  router.get('/metrics', requireAuth, (req: Request, res: Response) => {
    const metrics = getBFFMetrics();
    const wsStats = bffWebSocketManager.getOverallStats();

    res.json({
      success: true,
      data: {
        performance: metrics,
        websocket: wsStats,
        timestamp: new Date().toISOString()
      }
    });
  });

  /**
   * BFF Prefetch Endpoint
   * 
   * Allows React components to prefetch data they'll likely need
   */
  router.post('/prefetch', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user!.userId;
    const { resources } = req.body;

    console.log(`🚀 BFF: Prefetch request for user ${userId}:`, resources);

    const prefetchPromises: Promise<any>[] = [];
    const results: any = {};

    try {
      // Handle different resource types
      for (const resource of resources) {
        switch (resource.type) {
          case 'character_dashboard':
            prefetchPromises.push(
              prefetchCharacterDashboard(db, resource.characterId, userId)
                .then(data => { results[`character_${resource.characterId}`] = data; })
            );
            break;
          
          case 'game_session':
            prefetchPromises.push(
              prefetchGameSession(db, resource.sessionId, userId)
                .then(data => { results[`session_${resource.sessionId}`] = data; })
            );
            break;
          
          case 'recent_messages':
            prefetchPromises.push(
              prefetchRecentMessages(db, resource.sessionId, userId)
                .then(data => { results[`messages_${resource.sessionId}`] = data; })
            );
            break;
          
          default:
            console.warn(`🤷 BFF: Unknown prefetch resource type: ${resource.type}`);
        }
      }

      // Wait for all prefetch operations
      await Promise.allSettled(prefetchPromises);

      res.json({
        success: true,
        data: results,
        cached: true, // Indicate these results are cached
        _bff: {
          prefetched: true,
          resourceCount: resources.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ BFF Prefetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Prefetch operation failed'
      });
    }
  });

  /**
   * BFF Aggregated Dashboard
   * 
   * Returns all data needed for the main game dashboard
   */
  router.get('/dashboard/:campaignId/:characterId', requireAuth, async (req: Request, res: Response) => {
    const { campaignId, characterId } = req.params;
    const userId = (req as any).user!.userId;

    console.log(`📊 BFF: Loading aggregated dashboard for campaign ${campaignId}, character ${characterId}`);

    try {
      // Fetch all dashboard data in parallel
      const [
        characterData,
        sessionData,
        recentMessages
      ] = await Promise.allSettled([
        prefetchCharacterDashboard(db, characterId, userId),
        prefetchActiveGameSession(db, campaignId, characterId, userId),
        prefetchRecentMessages(db, null, userId, campaignId)
      ]);

      const dashboard = {
        character: characterData.status === 'fulfilled' ? characterData.value : null,
        session: sessionData.status === 'fulfilled' ? sessionData.value : null,
        messages: recentMessages.status === 'fulfilled' ? recentMessages.value : [],
        loadedAt: new Date().toISOString(),
        errors: {
          character: characterData.status === 'rejected' ? characterData.reason.message : null,
          session: sessionData.status === 'rejected' ? sessionData.reason.message : null,
          messages: recentMessages.status === 'rejected' ? recentMessages.reason.message : null
        }
      };

      res.json({
        success: true,
        data: dashboard,
        _bff: {
          aggregated: true,
          components: ['character', 'session', 'messages'],
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ BFF Dashboard aggregation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load dashboard data'
      });
    }
  });

  // Mount BFF sub-routers
  router.use('/game-session', gameSessionRouter(db));
  router.use('/character-dashboard', characterDashboardRouter(db));
  router.use('/streaming-chat', streamingChatRouter(db));
  
  // TODO: Mount additional routers when implemented
  // router.use('/campaign-overview', campaignOverviewRouter(db));
  // router.use('/memory-context', memoryContextRouter(db));
  // router.use('/audio-player', audioPlayerRouter(db));
  // router.use('/rules-assistant', rulesAssistantRouter(db));

  // Apply error handling middleware last
  router.use(bffErrorHandlingMiddleware);

  return router;
}

/**
 * Prefetch helper functions
 */
async function prefetchCharacterDashboard(db: Pool, characterId: string, userId: string) {
  const client = await db.connect();
  try {
    const query = `
      SELECT 
        c.*, cs.strength, cs.dexterity, cs.constitution,
        cs.intelligence, cs.wisdom, cs.charisma,
        cs.hit_points_current, cs.hit_points_max, cs.armor_class
      FROM characters c
      LEFT JOIN character_stats cs ON c.id = cs.character_id
      WHERE c.id = $1 AND c.user_id = $2
    `;
    const result = await client.query(query, [characterId, userId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function prefetchGameSession(db: Pool, sessionId: string, userId: string) {
  const client = await db.connect();
  try {
    const query = `
      SELECT s.*, c.name as campaign_name
      FROM game_sessions s
      LEFT JOIN campaigns c ON s.campaign_id = c.id
      WHERE s.id = $1 AND (s.user_id = $2 OR c.user_id = $2)
    `;
    const result = await client.query(query, [sessionId, userId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function prefetchActiveGameSession(db: Pool, campaignId: string, characterId: string, userId: string) {
  const client = await db.connect();
  try {
    const query = `
      SELECT s.*, c.name as campaign_name
      FROM game_sessions s
      LEFT JOIN campaigns c ON s.campaign_id = c.id
      WHERE s.campaign_id = $1 AND s.character_id = $2 AND s.status = 'active'
      AND (s.user_id = $3 OR c.user_id = $3)
      ORDER BY s.updated_at DESC
      LIMIT 1
    `;
    const result = await client.query(query, [campaignId, characterId, userId]);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function prefetchRecentMessages(db: Pool, sessionId: string | null, userId: string, campaignId?: string) {
  const client = await db.connect();
  try {
    let query: string;
    let params: any[];

    if (sessionId) {
      query = `
        SELECT m.*, c.name as character_name
        FROM messages m
        LEFT JOIN characters c ON m.character_id = c.id
        WHERE m.session_id = $1
        ORDER BY m.created_at DESC
        LIMIT 20
      `;
      params = [sessionId];
    } else if (campaignId) {
      query = `
        SELECT m.*, c.name as character_name, s.campaign_id
        FROM messages m
        LEFT JOIN characters c ON m.character_id = c.id
        LEFT JOIN game_sessions s ON m.session_id = s.id
        WHERE s.campaign_id = $1
        ORDER BY m.created_at DESC
        LIMIT 20
      `;
      params = [campaignId];
    } else {
      return [];
    }

    const result = await client.query(query, params);
    return result.rows.reverse(); // Reverse to get chronological order
  } finally {
    client.release();
  }
}

/**
 * Initialize BFF cleanup tasks
 */
export function initializeBFFCleanup() {
  // Clean up old streaming connections every 5 minutes
  setInterval(() => {
    cleanupOldStreams();
  }, 5 * 60 * 1000);

  console.log('🧹 BFF cleanup tasks initialized');
}

/**
 * Shutdown BFF services
 */
export function shutdownBFF() {
  bffWebSocketManager.shutdown();
  console.log('🛑 BFF services shut down');
}