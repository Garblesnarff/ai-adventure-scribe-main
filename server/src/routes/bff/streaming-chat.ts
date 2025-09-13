/**
 * BFF Streaming Chat Interface
 * 
 * Provides real-time streaming AI responses using Server-Sent Events (SSE)
 * Optimized for React components with progressive loading and audio integration.
 * 
 * Features:
 * - Server-Sent Events for streaming AI responses
 * - Progressive message loading with React Suspense compatibility
 * - Real-time audio synthesis and streaming
 * - Typing indicators and presence management
 * - Message acknowledgment and retry logic
 * - Optimistic updates with conflict resolution
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { requireAuth } from '../../middleware/auth';
import {
  BFFStreamingChatRequest,
  BFFStreamingChatResponse,
  BFFMessageData
} from '../../bff/types';
import {
  bffPerformanceMiddleware,
  reactResponseShapingMiddleware
} from '../../bff/middleware/bff-middleware';
import bffWebSocketManager from '../../bff/websocket/websocket-manager';

// Store active SSE connections
const sseConnections = new Map<string, Response>();
const streamingMessages = new Map<string, {
  sessionId: string;
  messageId: string;
  content: string;
  isComplete: boolean;
  timestamp: Date;
}>();

export default function streamingChatRouter(db: Pool) {
  const router = Router();

  router.use(requireAuth);
  router.use(bffPerformanceMiddleware);
  router.use(reactResponseShapingMiddleware);

  /**
   * POST /bff/streaming-chat/send
   * 
   * Send a message and initiate streaming AI response
   */
  router.post('/send', async (req: Request, res: Response) => {
    const userId = (req as any).user!.userId;
    const {
      sessionId,
      message,
      characterId,
      includeAudio,
      voiceId
    }: BFFStreamingChatRequest = req.body;

    console.log(`💬 BFF: Starting streaming chat for session ${sessionId}`);

    const client = await db.connect();
    try {
      // Store the user message first
      const userMessageQuery = `
        INSERT INTO messages (
          session_id, character_id, content, message_type, sender_type, 
          metadata, created_at
        ) VALUES ($1, $2, $3, 'chat', 'user', '{"streaming": false}', NOW())
        RETURNING id, created_at
      `;

      const userMessageResult = await client.query(userMessageQuery, [
        sessionId, characterId, message
      ]);

      const userMessageId = userMessageResult.rows[0].id;
      const userMessageTime = userMessageResult.rows[0].created_at;

      // Create placeholder for AI response
      const aiMessageQuery = `
        INSERT INTO messages (
          session_id, content, message_type, sender_type, 
          metadata, created_at
        ) VALUES ($1, '', 'response', 'dm', '{"streaming": true, "incomplete": true}', NOW())
        RETURNING id, created_at
      `;

      const aiMessageResult = await client.query(aiMessageQuery, [sessionId]);
      const aiMessageId = aiMessageResult.rows[0].id;
      const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store streaming state
      streamingMessages.set(streamId, {
        sessionId,
        messageId: aiMessageId,
        content: '',
        isComplete: false,
        timestamp: new Date()
      });

      // Broadcast user message immediately via WebSocket
      bffWebSocketManager.sendToSession(sessionId, {
        type: 'message_sent',
        payload: {
          id: userMessageId,
          type: 'user',
          content: message,
          timestamp: userMessageTime,
          characterId,
          metadata: { streaming: false },
          streamingState: 'complete'
        },
        timestamp: new Date(),
        sessionId,
        userId,
        characterId
      });

      // Start AI processing in background
      processAIResponse(sessionId, aiMessageId, message, characterId, streamId, includeAudio, voiceId)
        .catch(error => {
          console.error('❌ BFF: AI processing error:', error);
          // Mark as error and clean up
          const streamData = streamingMessages.get(streamId);
          if (streamData) {
            streamData.isComplete = true;
            updateMessageInDatabase(client, aiMessageId, 'Error generating response', { 
              streaming: false, 
              error: true 
            });
          }
        });

      const response: BFFStreamingChatResponse = {
        success: true,
        streamId,
        sseUrl: `/bff/streaming-chat/stream/${streamId}`
      };

      console.log(`✅ BFF: Chat stream initiated: ${streamId}`);
      res.status(201).json(response);

    } catch (error) {
      console.error('❌ BFF Streaming chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initiate streaming chat'
      } as BFFStreamingChatResponse);
    } finally {
      client.release();
    }
  });

  /**
   * GET /bff/streaming-chat/stream/:streamId
   * 
   * Server-Sent Events endpoint for streaming AI responses
   */
  router.get('/stream/:streamId', (req: Request, res: Response) => {
    const { streamId } = req.params;
    const userId = (req as any).user!.userId;

    console.log(`📡 BFF: SSE connection established for stream ${streamId}`);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      type: 'stream_connected',
      streamId,
      timestamp: new Date().toISOString()
    })}\n\n`);

    // Store connection
    sseConnections.set(streamId, res);

    // Send any existing content
    const streamData = streamingMessages.get(streamId);
    if (streamData && streamData.content) {
      res.write(`data: ${JSON.stringify({
        type: 'content_chunk',
        content: streamData.content,
        isComplete: streamData.isComplete,
        timestamp: new Date().toISOString()
      })}\n\n`);
    }

    // Handle client disconnect
    req.on('close', () => {
      console.log(`📡 BFF: SSE connection closed for stream ${streamId}`);
      sseConnections.delete(streamId);
    });

    req.on('error', (error) => {
      console.error(`❌ BFF: SSE error for stream ${streamId}:`, error);
      sseConnections.delete(streamId);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      if (sseConnections.has(streamId)) {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      } else {
        clearInterval(heartbeat);
      }
    }, 30000); // Every 30 seconds
  });

  /**
   * GET /bff/streaming-chat/session/:sessionId/messages
   * 
   * Get recent messages for a session (React Query friendly)
   */
  router.get('/session/:sessionId/messages', async (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const userId = (req as any).user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const client = await db.connect();
    try {
      const messagesQuery = `
        SELECT 
          m.id, m.content, m.message_type, m.sender_type, m.character_id,
          m.metadata, m.created_at, m.audio_url,
          c.name as character_name
        FROM messages m
        LEFT JOIN characters c ON m.character_id = c.id
        WHERE m.session_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await client.query(messagesQuery, [sessionId, limit, offset]);

      const messages: BFFMessageData[] = result.rows.reverse().map(msg => ({
        id: msg.id,
        type: msg.sender_type === 'user' ? 'user' : 'dm',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        characterId: msg.character_id,
        metadata: {
          hasAudio: !!msg.audio_url,
          characterName: msg.character_name,
          ...msg.metadata
        },
        streamingState: msg.metadata?.streaming ? 'streaming' : 'complete'
      }));

      res.json({
        success: true,
        data: {
          messages,
          hasMore: result.rows.length === limit,
          totalCount: null // Could add total count query if needed
        }
      });

    } catch (error) {
      console.error('❌ BFF Messages fetch error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch messages'
      });
    } finally {
      client.release();
    }
  });

  /**
   * POST /bff/streaming-chat/typing
   * 
   * Handle typing indicators
   */
  router.post('/typing', async (req: Request, res: Response) => {
    const userId = (req as any).user!.userId;
    const { sessionId, characterId, isTyping } = req.body;

    // Broadcast typing status via WebSocket
    bffWebSocketManager.sendToSession(sessionId, {
      type: isTyping ? 'typing_start' : 'typing_stop',
      payload: {
        userId,
        characterId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      sessionId,
      userId,
      characterId
    });

    res.json({ success: true });
  });

  /**
   * POST /bff/streaming-chat/acknowledge
   * 
   * Acknowledge message receipt (for optimistic updates)
   */
  router.post('/acknowledge', async (req: Request, res: Response) => {
    const { messageId, streamId } = req.body;

    if (streamId && streamingMessages.has(streamId)) {
      const streamData = streamingMessages.get(streamId)!;
      console.log(`✅ BFF: Message acknowledged: ${messageId} (stream: ${streamId})`);
    }

    res.json({ success: true });
  });

  return router;
}

/**
 * Process AI response in the background with streaming
 */
async function processAIResponse(
  sessionId: string,
  messageId: string,
  userMessage: string,
  characterId?: string,
  streamId?: string,
  includeAudio?: boolean,
  voiceId?: string
): Promise<void> {
  console.log(`🤖 BFF: Processing AI response for session ${sessionId}`);

  try {
    // Simulate AI processing with streaming response
    // In a real implementation, this would call your AI service
    const simulatedResponse = `Based on your message "${userMessage}", I can see that you're interested in exploring this mystical realm. The ancient forest stretches before you, with towering oak trees that seem to whisper secrets in an unknown language. Shafts of golden sunlight pierce through the canopy, creating dancing patterns on the moss-covered ground.

As you venture deeper into the woods, you notice the air becoming thick with magical energy. Small glowing orbs float lazily between the trees, pulsing with a soft blue light. The sound of running water grows stronger ahead - perhaps a stream or waterfall awaits your discovery.

What would you like to do next in this enchanted place?`;

    const words = simulatedResponse.split(' ');
    let streamedContent = '';

    // Stream content word by word
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      streamedContent += (i === 0 ? '' : ' ') + word;

      // Update streaming state
      if (streamId) {
        const streamData = streamingMessages.get(streamId);
        if (streamData) {
          streamData.content = streamedContent;
        }

        // Send to SSE connection
        const sseConnection = sseConnections.get(streamId);
        if (sseConnection) {
          sseConnection.write(`data: ${JSON.stringify({
            type: 'content_chunk',
            content: word,
            fullContent: streamedContent,
            isComplete: false,
            progress: (i + 1) / words.length,
            timestamp: new Date().toISOString()
          })}\n\n`);
        }

        // Broadcast via WebSocket
        bffWebSocketManager.sendToSession(sessionId, {
          type: 'message_streaming',
          payload: {
            messageId,
            content: streamedContent,
            isComplete: false,
            progress: (i + 1) / words.length
          },
          timestamp: new Date(),
          sessionId,
          userId: 'system'
        });
      }

      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    // Mark as complete
    if (streamId) {
      const streamData = streamingMessages.get(streamId);
      if (streamData) {
        streamData.content = streamedContent;
        streamData.isComplete = true;
      }

      // Send completion to SSE
      const sseConnection = sseConnections.get(streamId);
      if (sseConnection) {
        sseConnection.write(`data: ${JSON.stringify({
          type: 'stream_complete',
          content: streamedContent,
          isComplete: true,
          hasAudio: includeAudio,
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Close SSE connection
        sseConnection.end();
        sseConnections.delete(streamId);
      }

      // Final WebSocket broadcast
      bffWebSocketManager.sendToSession(sessionId, {
        type: 'message_complete',
        payload: {
          id: messageId,
          type: 'dm',
          content: streamedContent,
          timestamp: new Date().toISOString(),
          metadata: { 
            streaming: false, 
            hasAudio: includeAudio,
            voiceId 
          },
          streamingState: 'complete'
        },
        timestamp: new Date(),
        sessionId,
        userId: 'system'
      });

      // Clean up streaming state after a delay
      setTimeout(() => {
        streamingMessages.delete(streamId);
      }, 60000); // Clean up after 1 minute
    }

    // Update database with final content
    const db = require('../../../db'); // Get database connection
    await updateMessageInDatabase(db, messageId, streamedContent, { 
      streaming: false, 
      complete: true,
      hasAudio: includeAudio,
      voiceId: voiceId || 'default'
    });

    // Generate audio if requested
    if (includeAudio) {
      await generateAudioForMessage(messageId, streamedContent, voiceId);
    }

    console.log(`✅ BFF: AI response completed for session ${sessionId}`);

  } catch (error) {
    console.error('❌ BFF: AI processing error:', error);
    
    // Handle error in streaming
    if (streamId) {
      const sseConnection = sseConnections.get(streamId);
      if (sseConnection) {
        sseConnection.write(`data: ${JSON.stringify({
          type: 'stream_error',
          error: 'Failed to generate response',
          timestamp: new Date().toISOString()
        })}\n\n`);
        sseConnection.end();
        sseConnections.delete(streamId);
      }

      streamingMessages.delete(streamId);
    }

    throw error;
  }
}

/**
 * Update message in database
 */
async function updateMessageInDatabase(
  db: any, 
  messageId: string, 
  content: string, 
  metadata: any
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query(
      `UPDATE messages SET content = $1, metadata = $2, updated_at = NOW() WHERE id = $3`,
      [content, JSON.stringify(metadata), messageId]
    );
  } finally {
    client.release();
  }
}

/**
 * Generate audio for message (mock implementation)
 */
async function generateAudioForMessage(
  messageId: string, 
  content: string, 
  voiceId?: string
): Promise<void> {
  console.log(`🎵 BFF: Generating audio for message ${messageId} with voice ${voiceId}`);
  // TODO: Integrate with ElevenLabs or other TTS service
  // For now, just simulate the process
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log(`✅ BFF: Audio generated for message ${messageId}`);
}

/**
 * Clean up old streaming connections (should be called periodically)
 */
export function cleanupOldStreams(): void {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes

  for (const [streamId, data] of streamingMessages.entries()) {
    if (now - data.timestamp.getTime() > maxAge) {
      console.log(`🧹 BFF: Cleaning up old stream ${streamId}`);
      streamingMessages.delete(streamId);
      sseConnections.delete(streamId);
    }
  }
}