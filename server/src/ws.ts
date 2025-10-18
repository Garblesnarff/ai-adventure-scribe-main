import { WebSocketServer, WebSocket } from 'ws';
import url from 'url';
import { verifySupabaseToken } from './lib/supabase.js';

type RoomId = string;

const rooms = new Map<RoomId, Set<WebSocket>>();

function joinRoom(roomId: RoomId, ws: WebSocket) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId)!.add(ws);
}

function leaveRoom(roomId: RoomId, ws: WebSocket) {
  const set = rooms.get(roomId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) rooms.delete(roomId);
}

export function registerWebsocketHandlers(wss: WebSocketServer) {
  wss.on('connection', async (ws, req) => {
    try {
      const parsed = url.parse(req.url || '', true);
      const token = parsed.query.token as string | undefined;
      const sessionId = (parsed.query.sessionId as string | undefined) || 'lobby';
      // Request/connection ID from header or query
      const headerRid = (req.headers['x-request-id'] as string | undefined) || (req.headers['X-Request-Id'] as any);
      const queryRid = (parsed.query.requestId as string | undefined) || (parsed.query.rid as string | undefined);
      const requestId = (headerRid && String(headerRid)) || (queryRid && String(queryRid)) || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      if (!token) {
        ws.close(4001, 'Missing token');
        return;
      }
      // Verify Supabase JWT
      // Note: if you need to support legacy tokens, extend this with a fallback
      // to custom verification.
      // For unified DB, we accept Supabase tokens only.
      const user = await verifySupabaseToken(token);
      if (!user) {
        ws.close(4000, 'Unauthorized');
        return;
      }
      (ws as any).user = user;
      (ws as any).roomId = sessionId;
      (ws as any).requestId = requestId;
      joinRoom(sessionId, ws);

      // Log connection
      console.log(JSON.stringify({ level: 'info', msg: 'ws.connection', requestId, sessionId, userId: user.userId }));

      ws.send(JSON.stringify({ type: 'welcome', sessionId, requestId }));

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'chat') {
            const payload = {
              type: 'chat',
              userId: user.userId,
              text: msg.text,
              ts: Date.now(),
              requestId,
            };
            for (const client of rooms.get(sessionId) || []) {
              if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(payload));
            }
            console.log(JSON.stringify({ level: 'info', msg: 'ws.chat', requestId, sessionId, userId: user.userId }));
          }
        } catch (e: any) {
          console.error(JSON.stringify({ level: 'error', msg: 'ws.message_error', requestId, error: { message: e?.message, stack: e?.stack } }));
        }
      });

      ws.on('close', () => {
        leaveRoom(sessionId, ws);
        console.log(JSON.stringify({ level: 'info', msg: 'ws.close', requestId, sessionId, userId: user.userId }));
      });
    } catch (e: any) {
      const requestId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      console.error(JSON.stringify({ level: 'error', msg: 'ws.connection_error', requestId, error: { message: e?.message, stack: e?.stack } }));
      ws.close(4000, 'Unauthorized');
    }
  });
}

