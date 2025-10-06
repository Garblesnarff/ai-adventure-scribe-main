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
      joinRoom(sessionId, ws);

      ws.send(JSON.stringify({ type: 'welcome', sessionId }));

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'chat') {
            const payload = {
              type: 'chat',
              userId: user.userId,
              text: msg.text,
              ts: Date.now(),
            };
            for (const client of rooms.get(sessionId) || []) {
              if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(payload));
            }
          }
        } catch {}
      });

      ws.on('close', () => {
        leaveRoom(sessionId, ws);
      });
    } catch {
      ws.close(4000, 'Unauthorized');
    }
  });
}

